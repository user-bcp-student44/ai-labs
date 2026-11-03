from __future__ import annotations

import pytest

from auth_helpers import TEST_JWT_AUDIENCE, TEST_JWT_ISSUER, TEST_JWT_SECRET


@pytest.fixture(autouse=True)
def configure_test_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WORKSHOP_JWT_SECRET", TEST_JWT_SECRET)
    monkeypatch.setenv("WORKSHOP_JWT_ISSUER", TEST_JWT_ISSUER)
    monkeypatch.setenv("WORKSHOP_JWT_AUDIENCE", TEST_JWT_AUDIENCE)
