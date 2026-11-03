from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app
from auth_helpers import headers, make_token


def test_lists_seeded_tasks(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers=headers())
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_creates_task_and_summary(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        created = client.post(
            "/api/tasks",
            headers=headers(),
            json={
                "title": "Add tests",
                "description": "Improve coverage",
                "status": "TODO",
                "priority": "HIGH",
            },
        )
        summary = client.get("/api/summary", headers=headers())
    assert created.status_code == 201
    assert created.json()["owner"] == "student"
    assert summary.json()["total"] == 3


def test_uploads_requirement(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={
                "file": (
                    "requirements.txt",
                    b"Login must be accessible",
                    "text/plain",
                )
            },
        )
    assert response.status_code == 201
    assert (upload_dir / "requirements.txt").exists()


def test_rejects_invalid_token(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get(
            "/api/tasks", headers={"Authorization": "Bearer not-a-jwt"}
        )
    assert response.status_code == 401


def test_rejects_missing_or_non_bearer_authorization(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    valid_token = make_token()
    with TestClient(app) as client:
        missing = client.get("/api/tasks")
        wrong_scheme = client.get(
            "/api/tasks", headers={"Authorization": f"Basic {valid_token}"}
        )
    assert missing.status_code == 401
    assert wrong_scheme.status_code == 401
