from __future__ import annotations

import time

import jwt

TEST_JWT_SECRET = "isolated-test-signing-key-not-for-production"
TEST_JWT_ISSUER = "ai-labs-api-tests"
TEST_JWT_AUDIENCE = "ai-labs-api"
TEST_JWT_ALGORITHM = "HS256"
JWT_LIFETIME_SECONDS = 3600


def make_token(
    username: str = "student",
    role: str = "STUDENT",
    *,
    secret: str = TEST_JWT_SECRET,
    issuer: str = TEST_JWT_ISSUER,
    audience: str = TEST_JWT_AUDIENCE,
    expires_at: int | None = None,
) -> str:
    claims = {
        "sub": username,
        "role": role,
        "exp": expires_at or int(time.time()) + JWT_LIFETIME_SECONDS,
        "iss": issuer,
        "aud": audience,
    }
    return jwt.encode(claims, secret, algorithm=TEST_JWT_ALGORITHM)


def headers(
    username: str = "student",
    role: str = "STUDENT",
    *,
    secret: str = TEST_JWT_SECRET,
    issuer: str = TEST_JWT_ISSUER,
    audience: str = TEST_JWT_AUDIENCE,
    expires_at: int | None = None,
) -> dict[str, str]:
    token = make_token(
        username,
        role,
        secret=secret,
        issuer=issuer,
        audience=audience,
        expires_at=expires_at,
    )
    return {"Authorization": f"Bearer {token}"}
