# Proposal

## Why

Issue [#27](https://github.com/user-bcp-student44/ai-labs/issues/27) identifies that credential values can alter the meaning of the login query, potentially authenticating an unintended user. The login must reject such credentials while preserving the existing successful-login contract.

## What Changes

- **In scope:** Define observable behavior for credential lookup in `auth/`: valid credentials continue to log in, while credentials that alter query semantics are rejected with `401` and no token.
- **Behavior to preserve:** Keep `POST /auth/login` and the successful response fields documented in `.github/HU-01.md` (`token`, `expiresIn`, and `user`), including `user.username` and `token` asserted by the existing auth test.
- **Out of scope:** Changes to `api/` or `web/`, other authentication or token changes, response redesign, and implementation details.
- **Baseline note:** The requested `docs/ENDPOINTS.md` is absent from this workspace, although `RETO.md` points to it. Until that baseline is restored, this proposal uses Issue #27, `.github/HU-01.md`, and the existing auth test as the available behavioral references; no endpoint contract change is intended.

## Capabilities

### New Capabilities
- `auth-login`: Observable login behavior for valid and query-altering credentials, including preservation of the successful response contract.

### Modified Capabilities
- None.

## Impact

- `auth/` login behavior and its tests.
- No changes to other components, endpoint shape, or dependencies are proposed.