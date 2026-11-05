# Spec Delta

## Purpose

Defines the observable contract for successful authentication and rejection of credentials that could alter login-query meaning.

The `docs/ENDPOINTS.md` baseline referenced by `RETO.md` was unavailable when this change was drafted. This delta does not intend to change the endpoint contract; it uses Issue #27 and the available login documentation and test as behavioral references.

## ADDED Requirements

### Requirement: Successful login preserves its response contract
The system SHALL continue to authenticate valid credentials through `POST /auth/login` and return the existing successful response fields.

#### Scenario: Valid workshop credentials
- **WHEN** a client submits the valid workshop credentials to `POST /auth/login`
- **THEN** the response has status `200` and includes `token`, `expiresIn`, and `user.username` for the authenticated user

### Requirement: Query-altering credentials are rejected
The system SHALL reject credentials that could alter the meaning of the login query and SHALL NOT issue an authentication token for the rejected request.

#### Scenario: Query-altering username
- **WHEN** a client submits `' OR '1'='1` as the username to `POST /auth/login`
- **THEN** the response has status `401` and contains no `token`

#### Scenario: Query-altering password
- **WHEN** a client submits `' OR '1'='1` as the password to `POST /auth/login`
- **THEN** the response has status `401` and contains no `token`