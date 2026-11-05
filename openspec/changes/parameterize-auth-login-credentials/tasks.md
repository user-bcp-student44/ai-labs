# Tasks

Source of work: Issue #27 (H-AUTH-01), component `auth/`, branch `feature/h-auth`. All test commands run from `auth/`; Git, MCP, and OpenSpec commands run from the repository root. Only `auth/src/test/java/com/bcp/workshop/auth/AuthResourceTest.java` and `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java` are edited.

## 1. Characterization tests on unmodified code

- [x] 1.1 In `AuthResourceTest`, add a test for valid `student` login asserting `200`, non-empty `token`, `expiresIn` = `3600`, `user.username`, `user.displayName`, and `user.role`; verify it passes on the current code (spec: Valid workshop credentials)
- [x] 1.2 Add the same valid-login test for `trainer`; verify it passes on the current code
- [x] 1.3 Add tests for `400`: null/empty body (`Request is null`), missing and blank `username` (`Username is required`), missing and blank `password` (`Password is required`); verify they pass on the current code
- [x] 1.4 Add tests for `401` with a known user and wrong password, and with an unknown user, asserting status `401` and no `token` (do not assert the message text, which echoes the username and is out of scope); verify they pass on the current code
- [x] 1.5 Add a test with a single quote in the credentials that matches no user, asserting `401` (not `500`) and no `token`; verify it passes on the current code
- [x] 1.6 Run `mvn test` from `auth/` and verify the whole suite is green and `git diff` shows only `AuthResourceTest.java` changed (no production code)

## 2. Reproduce the vulnerability with regression tests

- [x] 2.1 Add a test submitting `' OR '1'='1` as the username with an arbitrary password, asserting `401` and no `token` (spec: Query-altering username)
- [x] 2.2 Add a test submitting `' OR '1'='1` as the password with a valid username, asserting `401` and no `token` (spec: Query-altering password)
- [x] 2.3 Run both new tests on the unmodified code and verify the password test (2.2) fails because the response is `200` with a `token`; the username test (2.1) may already pass because SQL `AND` precedence yields no rows with an arbitrary password, so it only guards against regressions; keep this result as evidence and do not commit the suite in this red state

## 3. Parameterize the credential lookup

- [x] 3.1 In `LegacyDatabase.findByCredentials`, bind `username` and `password` as query parameters instead of concatenating them, keeping the same SQL shape, comparison, method signature, `null`-on-no-match result, and the existing `catch` behavior; verify by reading the diff that no other method or file changed
- [x] 3.2 Run the two regression tests from group 2 and verify both now pass with `401` and no `token`
- [x] 3.3 Run the group 1 characterization tests and verify they are still green, including the single-quote case returning `401`

## 4. Final verification

- [x] 4.1 Run `mvn test` from `auth/` and verify the full suite passes (Issue acceptance criterion)
- [x] 4.2 Run `python tools/lab.py test auth` from the repository root and verify it passes; open the JaCoCo report under `auth/target/site/jacoco/` and verify coverage of the modified code in `LegacyDatabase` is 85% or higher
- [x] 4.3 Search `LegacyDatabase.java` for string concatenation building SQL from `username` or `password` and verify none remains (Issue acceptance criterion)
- [x] 4.4 Run `git status` and `git diff --stat` from the root and verify only `LegacyDatabase.java`, `AuthResourceTest.java`, and this change's OpenSpec files changed, with nothing under `api/`, `web/`, `pom.xml`, or `application.properties`
- [x] 4.5 Verify each scenario in `specs/auth-login/spec.md` maps to a passing test (valid login, username injection, password injection) and run `openspec validate --changes parameterize-auth-login-credentials` and verify it passes

## Workflow follow-up

- Reconcile the protected contracts with `docs/ENDPOINTS.md` if it is restored before implementation (design Open Question).
- Human review and real test results precede merge and archive; this is a local workflow on the current branch, with no new branches, tags, or push.
- Archive the change after review requirements are satisfied, then verify the archived result.
