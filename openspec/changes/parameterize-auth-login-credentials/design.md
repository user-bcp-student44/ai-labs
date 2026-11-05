# Design

## Context

Motivation and scope: see `proposal.md` (Issue #27, finding H-AUTH-01). Requirements and scenarios: see `specs/auth-login/spec.md`. Component: `auth/` only (Quarkus, SQLite via `sqlite-jdbc`), branch `feature/h-auth`.

Current state, observed in the code:

- `AuthResource.login` validates the request, calls `LegacyDatabase.findByCredentials(username, password)`, and builds the response. A `null` result becomes `401`.
- `LegacyDatabase.findByCredentials` builds its `SELECT` by concatenating `username` and `password` into the SQL text and runs it through a plain `Statement`. Any exception is swallowed (`printStackTrace`) and the method returns `null`.
- The DB URL comes from `AUTH_DB_URL` (default `jdbc:sqlite:./data/workshop.db`) and is a `static final`, so tests cannot redirect it; they run against the users seeded by `LegacyDatabase.initialize()` (`student`, `trainer`).
- The only existing test, `AuthResourceTest`, covers the successful login for `student`. There is no test for `400`/`401` paths or for the response shape beyond `user.username` and `token`.
- The test stack is `quarkus-junit5` + `rest-assured`, with JaCoCo configured; there is no mocking library.

Baseline caveat: `docs/ENDPOINTS.md` (referenced by `RETO.md`) is absent from the workspace. The protected contracts below are derived from the current code, `.github/HU-01.md`, and the existing test. If the document is restored, they must be reconciled with it (see Open Questions).

## Goals / Non-Goals

**Goals:**

- Make credential values incapable of changing the meaning of the lookup query, so the scenarios in `specs/auth-login/spec.md` hold.
- Keep the change confined to the credential lookup in `auth/`, with no observable change for any input that is not query-altering.
- Lock current observable behavior with tests before changing the lookup, and add the injection regression tests required by the Issue.

**Non-Goals:**

- Password hashing or salting, token signing/expiry/claims, secret and CORS externalization, error-detail exposure, the `debug` response field, and the dependency upgrades (other seeded findings; separate Issues).
- Splitting `AuthResource.login` into layers or introducing a repository/service layer (clean-code refactors are separate, reviewable changes).
- Any change to `api/` or `web/`, to the database schema, seed data, or configuration.
- Changing HTTP status codes, messages, or the success payload, including existing behaviors that are undesirable but out of scope (see Risks).

## Protected Contracts

These must be identical before and after the change:

| Input | Observable result |
|---|---|
| Valid credentials (`student` / `Workshop123!`, `trainer` / `Trainer123!`) | `200`; body has `token` (non-empty), `expiresIn` = `3600`, `user.username`, `user.displayName` (HTML-escaped), `user.role`, and the existing `debug` field |
| Null request body | `400`, `message` = `Request is null` |
| Missing or blank `username` | `400`, `message` = `Username is required` |
| Missing or blank `password` | `400`, `message` = `Password is required` |
| Well-formed credentials that match no user | `401`, `message` = `Invalid user <username> or password`, no `token` |
| Credentials containing quote characters that match no user | `401`, no `token` (today an SQL error is swallowed and yields `null`; the observable result must stay `401`, never `500`) |
| `findByCredentials` call shape | Same signature and `null`-on-no-match semantics for its caller |

New behavior (from the spec): `' OR '1'='1` as username or as password yields `401` with no `token`.

## Affected Components

| Component | Change |
|---|---|
| `LegacyDatabase.findByCredentials` | Only production code that changes: the query takes `username` and `password` as bound parameters instead of concatenated text |
| `AuthResourceTest` | Extended with characterization and injection tests |
| `AuthResource`, `LoginRequest`, `UserRecord`, `LegacyTokenUtil` | Unchanged |
| `pom.xml`, `application.properties`, DB schema/seed data | Unchanged |

## Decisions

### D1: Bind `username` and `password` as query parameters

Keep the same SQL shape and the same equality comparison, but pass both values as bound parameters rather than concatenating them into the text. This is what Issue #27 requires and makes credential values data, never SQL syntax.

Alternatives considered:

- **Escape or sanitize quotes before concatenation:** fragile, easy to get wrong across encodings, and it would still leave string-built SQL.
- **Reject inputs containing quotes or SQL keywords (allow/deny list):** changes the contract for legitimate passwords with such characters (they would turn from `401` or `200` into a new error) and gives only partial protection.
- **Introduce an ORM/Panache or a repository layer:** adds a dependency and a structural change far beyond the finding; conflicts with the incremental, reviewable-change rule for `auth/`.

### D2: Preserve the method signature and `null` semantics

`findByCredentials(String, String)` still returns a `UserRecord` or `null`, and `AuthResource` is not touched. Because `null` already maps to `401`, query-altering input, now treated as a literal that matches no user, naturally produces the required `401` with no `token`.

Alternatives considered:

- **Return `Optional<UserRecord>`:** cleaner API but forces changes in `AuthResource`, widening the diff and risk for no behavior benefit.
- **Throw on invalid input:** would alter status codes and messages.

### D3: Leave the existing swallow-and-return-`null` error handling as is

The `catch` that logs and returns `null` stays. It is part of the current observable contract (SQL errors surface as `401`) and its cleanup belongs to the error-handling finding, not this one.

### D4: Verify through the HTTP contract, using the seeded database

Tests go through `POST /auth/login` with `rest-assured` against the seeded users. No mocking library or new test dependency is added, and the DB URL is not made configurable here (it would be an unrelated production change). The Issue's acceptance criterion names `AuthResourceTest` as the home for the injection test, so new tests are added to it.

## Incremental Strategy

Each step is independently reviewable and leaves the build green except where noted.

1. **Characterize (no production change):** add tests that lock the protected contracts on the current code. All must pass before any production edit.
2. **Reproduce (expected red):** add the two injection tests from the spec (username and password). On unmodified code the password test must fail (200 with token), proving the tests detect the vulnerability; the username test may already pass because of SQL `AND` precedence and acts as a regression guard. Record this as evidence; do not leave the suite red in a commit.
3. **Fix:** apply D1 in `LegacyDatabase.findByCredentials` only.
4. **Verify:** run the full `auth` test suite from `auth/` (the component directory); all characterization and injection tests pass, and coverage of the modified code meets the 85% target.
5. **Review scope:** confirm the diff touches only `LegacyDatabase.java` and `AuthResourceTest.java`, plus the evidence/documentation files the repo requires.

## Characterization Tests Required Before Modifying Behavior

To be written and green against the current code (step 1):

- Valid login for `student` and for `trainer`: status, non-empty `token`, `expiresIn` = `3600`, `user.username`, `user.displayName`, `user.role`.
- `400` with `Request is null` for an empty or absent body.
- `400` with `Username is required` for missing and for blank username.
- `400` with `Password is required` for missing and for blank password.
- `401` for a known username with a wrong password, and for an unknown username, with no `token` in the body.
- `401` (not `500`) for credentials containing a single quote that match no user.

Then the new regression tests (step 2, red before the fix):

- `' OR '1'='1` as username with an arbitrary password → `401`, no `token`.
- `' OR '1'='1` as password with a valid username → `401`, no `token`.

## Risks / Trade-offs

- [Baseline `docs/ENDPOINTS.md` is missing, so a protected contract could be incomplete] → Contracts are taken from the code and tests; reconcile when the document is restored and add any missing scenario before implementing.
- [Characterization tests could encode undesirable behavior, e.g. the `401` message echoing the username, `500` bodies exposing exception details, the `debug` field] → Pin only the contracts listed above that are in scope; do not assert behaviors slated for other findings, and do not fix them here, so those Issues can change them deliberately.
- [Tests share one on-disk SQLite file and seed data] → Tests only read seeded users and never write, so they stay order-independent.
- [Binding changes how a stray quote in a legitimate credential is handled internally (SQL error → no row)] → Observable result is unchanged (`401`), and a dedicated characterization test locks it.
- [The fix does not address plaintext password storage or comparison] → Explicitly out of scope; the comparison semantics stay identical so a later hashing change can replace it independently.

## Rollback

The change is a code-only edit in one method plus tests: no schema, data, configuration, API, or dependency change. Rollback is reverting the change's commit. Reverting re-opens the vulnerability from Issue #27, so it should be used only to undo a confirmed regression and followed promptly by a corrected fix. No data migration or coordinated deploy with `web/` or `api/` is needed.

## Open Questions

- When `docs/ENDPOINTS.md` is available, does it document any `/auth/login` behavior not listed under Protected Contracts? This affects only which extra characterization tests are added, not the approach.
