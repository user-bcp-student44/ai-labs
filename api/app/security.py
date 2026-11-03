from __future__ import annotations

import os

import jwt
from fastapi import Header, HTTPException

JWT_SECRET_ENV = "WORKSHOP_JWT_SECRET"
JWT_ISSUER_ENV = "WORKSHOP_JWT_ISSUER"
JWT_AUDIENCE_ENV = "WORKSHOP_JWT_AUDIENCE"
JWT_ALGORITHM = "HS256"
JWT_MIN_SECRET_BYTES = 32
JWT_REQUIRED_CLAIMS = ("exp", "iss", "aud", "sub", "role")
INVALID_TOKEN_STATUS = 401
INVALID_TOKEN_MESSAGE = "Invalid token"
INVALID_AUTH_CONFIGURATION_MESSAGE = (
    "JWT authentication configuration is missing or invalid"
)


def _configured_jwt_values() -> tuple[str, str, str]:
    secret = os.getenv(JWT_SECRET_ENV)
    issuer = os.getenv(JWT_ISSUER_ENV)
    audience = os.getenv(JWT_AUDIENCE_ENV)
    if (
        not secret
        or len(secret.encode("utf-8")) < JWT_MIN_SECRET_BYTES
        or not issuer
        or not audience
    ):
        raise RuntimeError(INVALID_AUTH_CONFIGURATION_MESSAGE)
    return secret, issuer, audience


def validate_jwt_configuration() -> None:
    _configured_jwt_values()


def verified_identity(authorization: str = Header(default="")) -> dict[str, str]:
    secret, issuer, audience = _configured_jwt_values()

    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        raise HTTPException(
            status_code=INVALID_TOKEN_STATUS, detail=INVALID_TOKEN_MESSAGE
        )

    try:
        claims = jwt.decode(
            token.strip(),
            secret,
            algorithms=[JWT_ALGORITHM],
            issuer=issuer,
            audience=audience,
            options={"require": list(JWT_REQUIRED_CLAIMS)},
        )
    except jwt.InvalidTokenError as error:
        raise HTTPException(
            status_code=INVALID_TOKEN_STATUS, detail=INVALID_TOKEN_MESSAGE
        ) from error

    username = claims.get("sub")
    role = claims.get("role")
    if (
        not isinstance(username, str)
        or not username
        or not isinstance(role, str)
        or not role
    ):
        raise HTTPException(
            status_code=INVALID_TOKEN_STATUS, detail=INVALID_TOKEN_MESSAGE
        )
    return {"username": username, "role": role}
