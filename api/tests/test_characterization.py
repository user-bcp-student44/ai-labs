import base64
import time
from pathlib import Path

import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from auth_helpers import (
    TEST_JWT_AUDIENCE,
    TEST_JWT_ISSUER,
    TEST_JWT_SECRET,
    headers,
    make_token,
)


def test_legacy_expired_and_wrong_signature_tokens_are_rejected(
    tmp_path: Path,
) -> None:
    legacy_token = base64.b64encode(
        b"student|STUDENT|9999999999|not-a-real-test-secret"
    ).decode()
    expired_token = headers(expires_at=int(time.time()) - 1)
    wrong_signature_token = headers(
        secret="different-isolated-test-signing-key"
    )
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))

    with TestClient(app) as client:
        legacy = client.get(
            "/api/tasks", headers={"Authorization": f"Bearer {legacy_token}"}
        )
        expired = client.get("/api/tasks", headers=expired_token)
        wrong_signature = client.get(
            "/api/tasks", headers=wrong_signature_token
        )

    assert legacy.status_code == 401
    assert expired.status_code == 401
    assert wrong_signature.status_code == 401


@pytest.mark.parametrize(
    ("issuer", "audience"),
    [
        ("unexpected-issuer", TEST_JWT_AUDIENCE),
        (TEST_JWT_ISSUER, "unexpected-audience"),
    ],
)
def test_jwt_rejects_unexpected_issuer_or_audience(
    tmp_path: Path, issuer: str, audience: str
) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get(
            "/api/tasks",
            headers={
                "Authorization": (
                    f"Bearer {make_token(issuer=issuer, audience=audience)}"
                )
            },
        )
    assert response.status_code == 401


def test_jwt_requires_role_claim(tmp_path: Path) -> None:
    token_without_role = jwt.encode(
        {
            "sub": "student",
            "exp": int(time.time()) + 3600,
            "iss": TEST_JWT_ISSUER,
            "aud": TEST_JWT_AUDIENCE,
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))

    with TestClient(app) as client:
        response = client.get(
            "/api/tasks",
            headers={"Authorization": f"Bearer {token_without_role}"},
        )
    assert response.status_code == 401


def test_jwt_rejects_empty_role(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers=headers(role=""))
    assert response.status_code == 401


@pytest.mark.parametrize(
    ("variable", "value"),
    [
        ("WORKSHOP_JWT_SECRET", None),
        ("WORKSHOP_JWT_SECRET", "too-short"),
        ("WORKSHOP_JWT_ISSUER", None),
        ("WORKSHOP_JWT_AUDIENCE", None),
    ],
)
def test_invalid_jwt_configuration_fails_startup(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    variable: str,
    value: str | None,
) -> None:
    if value is None:
        monkeypatch.delenv(variable)
    else:
        monkeypatch.setenv(variable, value)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))

    with pytest.raises(RuntimeError, match="JWT authentication configuration"):
        with TestClient(app):
            pass


def test_sql_injection_is_contained_and_quotes_are_stored(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))

    with TestClient(app, raise_server_exceptions=False) as client:
        tasks = client.get(
            "/api/tasks",
            params={"owner": "' OR '1'='1"},
            headers=headers("trainer", "TRAINER"),
        )
        summary = client.get(
            "/api/summary",
            params={"owner": "' OR '1'='1"},
            headers=headers("trainer", "TRAINER"),
        )
        own_tasks = client.get("/api/tasks", headers=headers())
        own_summary = client.get("/api/summary", headers=headers())
        quoted_title = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "owner's task", "description": "quoted text"},
        )

    assert tasks.status_code == 200
    assert tasks.json() == []
    assert summary.json()["total"] == 0
    assert [task["id"] for task in own_tasks.json()] == sorted(
        task["id"] for task in own_tasks.json()
    )
    assert set(own_tasks.json()[0]) == {
        "id",
        "title",
        "description",
        "status",
        "owner",
        "priority",
        "createdAt",
    }
    assert own_summary.json() == {
        "owner": "student",
        "total": 2,
        "byStatus": {"TODO": 1, "IN_PROGRESS": 1},
        "highPriorityOpen": 1,
    }
    assert quoted_title.status_code == 201
    assert quoted_title.json()["title"] == "owner's task"


def test_owner_access_is_authorized_by_identity_and_role(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))

    with TestClient(app) as client:
        student_tasks = client.get(
            "/api/tasks", params={"owner": "trainer"}, headers=headers()
        )
        student_summary = client.get(
            "/api/summary", params={"owner": "trainer"}, headers=headers()
        )
        student_create = client.post(
            "/api/tasks",
            headers=headers(),
            json={
                "title": "Other owner",
                "description": "characterization",
                "owner": "trainer",
            },
        )
        trainer_headers = headers("trainer", "TRAINER")
        trainer_tasks = client.get(
            "/api/tasks", params={"owner": "student"}, headers=trainer_headers
        )
        trainer_summary = client.get(
            "/api/summary", params={"owner": "student"}, headers=trainer_headers
        )
        student_empty_owner = client.get(
            "/api/tasks", params={"owner": ""}, headers=headers()
        )
        trainer_create = client.post(
            "/api/tasks",
            headers=trainer_headers,
            json={
                "title": "Other owner",
                "description": "characterization",
                "owner": "student",
            },
        )

    assert student_tasks.status_code == 403
    assert student_summary.status_code == 403
    assert student_create.status_code == 403
    assert trainer_tasks.status_code == 200
    assert len(trainer_tasks.json()) == 2
    assert trainer_summary.status_code == 200
    assert trainer_summary.json()["total"] == 2
    assert student_empty_owner.status_code == 200
    assert len(student_empty_owner.json()) == 2
    assert trainer_create.status_code == 403


def test_upload_rejects_traversal_large_and_disallowed_files(
    tmp_path: Path,
) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))

    with TestClient(app) as client:
        traversal = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("../escape.txt", b"outside uploads", "text/plain")},
        )
        oversized = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("large.txt", b"x" * (6 * 1024 * 1024), "text/plain")},
        )
        maximum_size = client.post(
            "/api/requirements",
            headers=headers(),
            files={
                "file": (
                    "maximum.txt",
                    b"x" * (5 * 1024 * 1024),
                    "text/plain",
                )
            },
        )
        disallowed = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("malware.exe", b"content", "application/octet-stream")},
        )
        valid = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("requirements.txt", b"content", "text/plain")},
        )

    assert traversal.status_code == 400
    assert not (tmp_path / "escape.txt").exists()
    assert oversized.status_code == 413
    assert maximum_size.status_code == 201
    assert disallowed.status_code == 400
    assert valid.status_code == 201
    assert set(valid.json()) == {"owner", "fileName", "storedAt", "size"}


def test_backend_health_failure_response_shape(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AUTH_HEALTH_URL", "http://127.0.0.1:1/q/health")
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))

    with TestClient(app) as client:
        response = client.get("/api/backend-health", headers=headers())

    assert response.status_code == 200
    assert response.json()["requestedBy"] == "student"
    assert response.json()["status"] == 0
    assert set(response.json()) == {"requestedBy", "status", "body"}
