# Feature Specification: May 2026 Audit Hardening Pass

**Feature Branch**: `006-audit-hardening`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Security & code-quality hardening pass based on the May 2026 full-project audit findings (26 distinct issues identified across backend, frontend, and CI). Goal: close the gaps surfaced by the audit without changing any user-visible behavior of the storefront or admin dashboard, and without altering existing public API contracts."

## Clarifications

### Session 2026-05-18

- Q: Mechanism for refusing cross-site forged refresh requests (FR-003 / FR-004)? → A: Reject when the request `Origin` header is missing or not in the configured trusted-origin allowlist. Reuse the existing CORS allowlist as the single source of truth. No SPA change required.
- Q: HSTS posture for production HTTPS (FR-002)? → A: Emit `Strict-Transport-Security: max-age=31536000; includeSubDomains` in production. Do **not** include `preload`; the public production domain strategy is not finalized and the preload list is operationally one-way.
- Q: API behavior when an admin publishes an already-published product (or unpublishes an already-unpublished one) (FR-015)? → A: Treat the call as idempotent — return `200 OK` with the current product DTO and write **no** audit row. A no-op is not a state change and must not pollute the audit trail.
- Q: Wire shape for surfacing the address-save outcome at checkout (FR-017 / FR-018)? → A: Add a typed enum field on the existing checkout response: `addressSaveOutcome: "saved" | "skipped_book_full" | "not_requested"`. No new headers, no follow-up endpoint.
- Q: Default severity threshold for the CI vulnerability gates (FR-021 / FR-022 / FR-023)? → A: Fail the build on `high` (and `critical`) advisories on both backend and frontend. Threshold remains configurable per side and may be tightened or relaxed later without spec change.

## User Scenarios & Testing *(mandatory)*

<!--
  These stories are organized so that any single P1 story, shipped alone,
  closes a real audit-grade risk and is independently testable. P2/P3
  stories add depth and operator/developer ergonomics without being
  required for the security baseline to land.
-->

### User Story 1 — Hardened HTTP Surface for Every Response (Priority: P1)

A security auditor or pen-tester running standard header and cross-site-forgery checks against the deployed API receives a clean report on the four baseline header categories and on cross-origin refresh attempts. The platform's existing storefront, admin dashboard, and configured cross-origin SPA flow continue to work without change.

**Why this priority**: This is the single most visible "is this site hardened?" signal external auditors look for. It also closes the cross-site refresh vector, which is the only outstanding session-handling gap surfaced by the audit. Shipping just this story already raises the platform's externally observable security posture to A-grade.

**Independent Test**: Point a public header scanner (e.g., Mozilla Observatory or `securityheaders.com`) at the deployed API and a script that performs a forged cross-origin POST to the refresh endpoint; both must report success of the protection. The buyer/admin SPA flows must continue to log in, refresh, and check out exactly as before.

**Acceptance Scenarios**:

1. **Given** a deployed production API, **When** an external scanner inspects any endpoint response (catalog list, ProblemDetails 404, file stream, rate-limit 429, health check), **Then** every response carries the same baseline set of security headers.
2. **Given** an attacker page hosted on a non-allowlisted origin, **When** that page issues a credentialed POST to the refresh endpoint, **Then** the request is rejected with a 4xx response and no token rotation occurs.
3. **Given** the configured SPA origin, **When** the SPA performs its normal session-bootstrap refresh on page load, **Then** the refresh succeeds and the buyer remains signed in.
4. **Given** a buyer recovering a redirect with a manipulated `?next=` query value, **When** the value decodes to a protocol-relative or absolute URL, **Then** the SPA discards the value and routes to the safe default destination.

---

### User Story 2 — Streaming Payment Proofs Without Buffering (Priority: P1)

An admin reviewing payment proofs and a buyer downloading their own proof receive the file as a normal authenticated stream. The API process never holds the entire file in memory at once, regardless of the proof's size.

**Why this priority**: This closes a real availability risk: the current path buffers the whole file before responding. A handful of slow clients downloading multi-MB proofs at once can pin API memory and degrade every other endpoint. Independent of the security headers story, this story alone makes the production service noticeably more robust under load.

**Independent Test**: Upload a 5 MB proof image. Trigger the authenticated download endpoint while sampling the API process working set. The working-set delta during the download must stay below ~1 MB. Authentication, ownership checks, and rate-limit policy must remain bit-for-bit identical to today.

**Acceptance Scenarios**:

1. **Given** a 5 MB proof file uploaded by a buyer, **When** the same buyer (or an admin) requests the file through the authenticated endpoint, **Then** the file streams to the client and the API's working set grows by less than 1 MB during the transfer.
2. **Given** a request to the proof endpoint without a valid session, **When** the request is evaluated, **Then** the response is 401 exactly as today and no streaming work begins.
3. **Given** a request that exceeds the proof-file rate limit, **When** the limit triggers, **Then** the response is 429 with the same retry-after semantics as before, including the new baseline security headers.

---

### User Story 3 — Resilient Frontend Error Reporting (Priority: P1)

When a runtime error occurs in the SPA and is reported to the error-tracking system, the report is delivered with personally identifiable information redacted, even when the captured event payload contains circular references. The SPA itself never crashes during the redaction step.

**Why this priority**: A crash inside the error reporter is the worst kind of bug — it eats the very signal the team uses to find other bugs. This story also preserves the platform's PII-redaction guarantee (email, phone, address fields, Authorization headers, payment-proof URLs) which is part of the constitutional commitment.

**Independent Test**: In a staging build, dispatch a synthetic captured event whose data graph contains a deliberate cycle plus PII keys. The redaction step must complete in bounded time, the resulting payload must contain `[redacted]` for the PII keys, and the SPA must continue running.

**Acceptance Scenarios**:

1. **Given** a captured event whose `extra`, `contexts`, or breadcrumb data field references itself, **When** the scrubber runs, **Then** it finishes in bounded time without throwing and without infinite recursion.
2. **Given** a captured event containing keys matching the PII patterns (email, phone, address) anywhere in the graph, **When** the event is delivered, **Then** all those keys carry the value `[redacted]`.
3. **Given** a captured event whose request URL points at a payment-proof endpoint, **When** the event is delivered, **Then** the proof identifier is replaced with `[redacted]`.

---

### User Story 4 — Truthful Admin Audit Log (Priority: P2)

When an admin publishes or unpublishes a product, the audit log records the actual prior published state of the product, not a hardcoded transition. Re-publishing an already-published product is either rejected as a no-op or recorded with truthful prior=new values.

**Why this priority**: The audit log is the platform's source of truth for who-did-what under operator review. A misleading audit row erodes trust in the entire trail. This is independently valuable: even without the P1 security stories, fixing the audit makes admin actions investigable.

**Independent Test**: Publish a draft product, then publish it again. Inspect the resulting audit entries. The first entry must record `Unpublished -> Published`; the second entry must either be absent (no-op rejected) or record `Published -> Published` truthfully.

**Acceptance Scenarios**:

1. **Given** a draft product, **When** an admin publishes it, **Then** an audit row is written with prior `Unpublished` and new `Published`.
2. **Given** a published product, **When** an admin publishes it again, **Then** either no audit row is written (idempotent rejection) or the row truthfully records the same state on both sides.
3. **Given** a published product, **When** an admin unpublishes it, **Then** the audit row records prior `Published` and new `Unpublished`.

---

### User Story 5 — Visible Address-Book-Full at Checkout (Priority: P2)

A buyer at checkout who asks "save this address to my address book" while the book is already at the per-user limit completes the order successfully and is told plainly that the address was not saved. The buyer can then manage their address book to make space and retry.

**Why this priority**: The current path silently drops the save, which is debug-hostile and confusing for buyers who expect to find the address later. The order itself completing is the existing successful path; only the secondary save outcome needs to surface.

**Independent Test**: Pre-populate a buyer's address book to the cap. Place an order with "save this address" enabled and a new address. The order must succeed. The SPA must show a localized notice in both Arabic and English explaining that the save did not happen.

**Acceptance Scenarios**:

1. **Given** a buyer whose address book is at the per-user limit, **When** they check out with "save this address" enabled, **Then** the order succeeds and the SPA renders a localized notice that the address was not saved.
2. **Given** a buyer whose address book has room, **When** they check out with "save this address" enabled, **Then** the order succeeds and the address appears in their address book exactly as today.
3. **Given** the localized notice, **When** the SPA is in Arabic mode, **Then** the message renders in Arabic with correct RTL layout; in English mode it renders in English with LTR.

---

### User Story 6 — Reliable 401-Refresh Path Matching (Priority: P2)

Future API endpoints whose paths happen to share a prefix with the auth endpoints do not accidentally bypass the SPA's 401-refresh-and-retry logic. Existing auth endpoint behavior is unchanged.

**Why this priority**: This is a latent foot-gun that has not yet been triggered. Fixing it now is cheap and prevents a future endpoint from causing mysterious "user gets logged out unexpectedly" reports.

**Independent Test**: Add a synthetic test endpoint at `/api/auth-debug-ping` (or similar prefix-sharing path) that returns 401 once. The SPA's interceptor must trigger the refresh-and-retry flow for that path, not skip it.

**Acceptance Scenarios**:

1. **Given** the existing `/api/auth/refresh`, `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` endpoints, **When** any of them returns 401, **Then** the SPA does not attempt a refresh-and-retry and surfaces the failure (existing behavior preserved).
2. **Given** a non-auth endpoint whose path begins with `/auth` characters but is not one of the four listed paths, **When** it returns 401, **Then** the SPA performs a single refresh-and-retry exactly as for any other protected endpoint.

---

### User Story 7 — CI Vulnerability Gate (Priority: P3)

A pull request that introduces a known-vulnerable dependency (backend or frontend, at or above a configurable severity threshold) fails its CI build with a clear, actionable error before review. The team's existing CI gates remain in place.

**Why this priority**: Once landed, this is a permanent shift-left improvement that catches CVE drift before merge. It depends on no other story and is purely additive.

**Independent Test**: Open a pull request that adds a known-vulnerable package version on each side in turn. Each PR must fail CI at the new vulnerability gate with a message naming the offending package and CVE.

**Acceptance Scenarios**:

1. **Given** a pull request adding a known-vulnerable backend package at high severity, **When** CI runs, **Then** the vulnerability gate step fails and names the offending package and severity.
2. **Given** a pull request adding a known-vulnerable frontend package at high severity, **When** CI runs, **Then** the vulnerability gate step fails and names the offending package and severity.
3. **Given** a pull request that adds only safe dependencies, **When** CI runs, **Then** the vulnerability gate passes and the rest of CI proceeds normally.

---

### User Story 8 — Pre-Deploy Secrets Validation in CI (Priority: P3)

A release-targeted build that would ship without a required production secret fails visibly during CI rather than at the API's first runtime request. Operators learn about misconfiguration before users do.

**Why this priority**: This converts a runtime-only failure into a build-time failure. Independent of every other story, it raises operational confidence in deployments.

**Independent Test**: Trigger a release-target build with one required production secret deliberately blanked. CI must fail at the secrets-validation step with a message naming the missing secret. With all required secrets present, the step must pass.

**Acceptance Scenarios**:

1. **Given** a release-target build with all required prod secrets present, **When** CI runs, **Then** the secrets-validation step passes.
2. **Given** a release-target build missing the JWT signing secret (or any other required prod secret), **When** CI runs, **Then** the secrets-validation step fails with a message naming the missing secret.
3. **Given** a non-release build (developer PR against a feature branch), **When** CI runs, **Then** the secrets-validation step is either skipped or runs in a non-blocking advisory mode.

---

### Edge Cases

- A request that triggers a 500 inside an endpoint must still emit the baseline security headers.
- A streaming proof download whose client disconnects mid-stream must release file handles and any leased buffers within bounded time and must not corrupt the next request.
- A captured Sentry event whose graph contains a key that *both* matches a PII pattern *and* points to an object containing a cycle must be redacted and not throw.
- An admin who unpublishes a product that is already unpublished must not produce a false `Published -> Unpublished` audit row.
- A buyer whose address book is exactly at the limit minus one (i.e., one save fits) must save successfully and not see the limit-reached notice.
- A `next=` value of `/account?ref=%2F%2Fevil.com` (where the dangerous part is a query-string fragment, not the path) must remain valid because the path itself is safe.
- A pull request whose only change is updating a vulnerable dependency to the patched version must pass the vulnerability gate.
- A locale switch (Arabic ↔ English) while the address-book-full notice is on screen must re-render the notice in the new locale.

## Requirements *(mandatory)*

### Functional Requirements

#### Theme 1 — API Security Headers and Hardening

- **FR-001**: The API MUST attach the same baseline set of security headers to every response, including 2xx JSON, 3xx redirects (if any), 4xx ProblemDetails, 5xx errors, file-stream responses, health checks, and rate-limit rejections.
- **FR-002**: The baseline set MUST cover, at minimum: a strict-transport-security policy of `max-age=31536000; includeSubDomains` (active only in production HTTPS, no `preload` directive); a no-sniff content-type policy (`X-Content-Type-Options: nosniff`); a referrer policy no looser than `strict-origin-when-cross-origin`; a frame-deny equivalent (either `X-Frame-Options: DENY` or a CSP `frame-ancestors 'none'` directive); and a same-site cross-origin-resource policy (`Cross-Origin-Resource-Policy: same-site`).
- **FR-003**: The refresh-token endpoint MUST reject any request whose `Origin` header is missing or whose `Origin` value is not present in the configured trusted-origin allowlist (the same allowlist used by the existing CORS policy). Same-origin requests, and cross-origin requests from each allowlisted origin, MUST continue to succeed unchanged.
- **FR-004**: The Origin-allowlist enforcement in FR-003 MUST live alongside (not replace) the existing refresh-token rotation, sibling-revocation, and reuse-detection behavior. The existing rate-limit policy on the refresh endpoint MUST also remain in place.
- **FR-005**: The post-auth `next` query parameter resolver MUST percent-decode the input value before validation and MUST reject any decoded value that resolves to a protocol-relative URL (`//host`), an absolute URL, or any path beginning with two or more slashes.
- **FR-006**: The post-auth resolver MUST continue to reject the existing forbidden destinations (`/login`, `/register`).

#### Theme 2 — Operational Robustness

- **FR-007**: The authenticated payment-proof streaming endpoint MUST stream file content from storage to the response without buffering the full payload in API process memory.
- **FR-008**: For a payment-proof file of size up to and including the configured maximum upload size, FR-007 MUST hold regardless of client connection speed.
- **FR-009**: The endpoint MUST preserve its existing authentication, ownership, rate-limit, and audit semantics exactly as today.
- **FR-010**: The frontend error-reporter scrubbing routine MUST handle objects with circular references without throwing, hanging, or blowing the call stack.
- **FR-011**: The scrubbing routine MUST continue to redact, recursively, every object key matching the existing PII pattern (email, phone, address) with the literal value `[redacted]`.
- **FR-012**: The scrubbing routine MUST continue to strip `Authorization` and `authorization` request headers from outgoing reports.
- **FR-013**: The scrubbing routine MUST continue to replace any payment-proof identifier inside `request.url` with `[redacted]`.

#### Theme 3 — Audit Integrity and Admin UX

- **FR-014**: Admin product publish and unpublish actions that **do** change product state MUST record the actual prior state of the product in the audit log, never a hardcoded prior value.
- **FR-015**: Re-publishing an already-published product (or unpublishing an already-unpublished one) MUST be treated as an idempotent operation: the API MUST respond `200 OK` with the current product DTO and MUST NOT write any audit row for that call. The endpoint MUST NOT respond `409 Conflict` or `400 Bad Request` for this case.
- **FR-016**: Existing audit-row metadata (actor, target type, target ID, correlation ID, timestamp) MUST be preserved unchanged for the rows that **are** still written under FR-014.
- **FR-017**: The successful checkout response MUST include an additive typed field `addressSaveOutcome` whose value is one of: `"saved"` (the address was newly added to the address book), `"skipped_book_full"` (the buyer asked to save but their book was at the per-user limit), or `"not_requested"` (the buyer did not request a save). No other transport (HTTP header, follow-up endpoint) is acceptable.
- **FR-018**: The SPA MUST display a localized notice (Arabic and English, RTL/LTR aware) using the existing toast or banner conventions when, and only when, `addressSaveOutcome === "skipped_book_full"`. The `"saved"` and `"not_requested"` values MUST NOT trigger a notice.
- **FR-019**: The order itself MUST continue to succeed under FR-017's conditions, exactly as it does today.
- **FR-020**: The SPA's 401-refresh-and-retry interceptor MUST treat the four auth endpoint paths (`/auth/refresh`, `/auth/login`, `/auth/register`, `/auth/logout`) as exact-suffix matches against the request path, so that other endpoints whose paths happen to contain those substrings do not bypass the retry.

#### Theme 4 — CI Quality Gates

- **FR-021**: The continuous-integration pipeline MUST include a step that scans backend dependencies for known vulnerabilities and fails the build when any dependency at or above the configured severity threshold is found.
- **FR-022**: The continuous-integration pipeline MUST include a step that scans frontend dependencies for known vulnerabilities and fails the build when any dependency at or above the configured severity threshold is found.
- **FR-023**: The severity threshold for FR-021 and FR-022 MUST be configurable per side. The **default** for both sides is `high` (i.e., `high` and `critical` advisories fail the build; `moderate` and below do not). The default MUST be changeable via configuration without a spec change.
- **FR-024**: A release-target CI build MUST verify that the production-secret startup checks would succeed for the artifact, and MUST fail the build with a clear message naming the missing or invalid secret if any check fails.
- **FR-025**: All existing CI gates (build, tests, i18n parity check, lint) MUST continue to run and remain blocking.

#### Cross-Cutting

- **FR-026**: No public API contract (route, request body, response schema, status code) defined in the existing M2 API surface MAY change as a result of this work, except for: (a) the additive `addressSaveOutcome` enum field described in FR-017, and (b) the idempotent-success behavior of admin publish/unpublish on a no-op transition described in FR-015 (which only relaxes existing behavior in the success direction).
- **FR-027**: No storefront or admin UI flow MAY change as a result of this work, except for the additive localized notice described in FR-018.
- **FR-028**: All new user-visible strings introduced by FR-018 MUST exist in both `ar` and `en` locale namespaces and pass the existing i18n parity gate.
- **FR-029**: Every new automated test added for this feature MUST run in the existing test runners (backend xUnit, frontend Vitest) and MUST NOT introduce browser-automation tooling.

### Key Entities

- **Security Header Policy**: The named, reviewable list of HTTP headers and their values applied to every API response. Owned at the platform middleware layer; its definition is the artifact under audit.
- **Refresh Request Origin Decision**: The runtime classification of an incoming refresh-token request as same-origin, allowlisted cross-origin, or rejected. Inputs: request origin, request method, request headers; output: accept | reject.
- **Audit Entry (Product Publish/Unpublish)**: An existing entity whose `previousStatus` and `newStatus` fields gain truthfulness guarantees. No schema change; only a content-correctness invariant.
- **Address-Save Outcome**: A new typed enum field `addressSaveOutcome` on the order-creation response, with values `"saved"`, `"skipped_book_full"`, or `"not_requested"`, indicating whether the optional address save succeeded, was skipped due to the address-book limit, or was not requested.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An external HTTP header scanner (e.g., Mozilla Observatory or `securityheaders.com`) reports "Pass" on each of: HSTS (in production HTTPS), `X-Content-Type-Options`, Referrer-Policy, frame-deny equivalent, and Cross-Origin-Resource-Policy, against the deployed API base URL.
- **SC-002**: A scripted credentialed POST to the refresh endpoint sending an `Origin` header that is not in the trusted-origin allowlist (and a separate test omitting the `Origin` header entirely) is rejected with a 4xx response in 100% of trials, while the SPA from each configured allowlisted origin succeeds in 100% of trials.
- **SC-003**: Streaming a 5 MB proof file through the authenticated endpoint adds no more than 1 MB to the API process working set during the transfer, measured across 10 sequential downloads.
- **SC-004**: A synthetic Sentry event containing a deliberate circular reference is delivered with PII keys redacted and without throwing in the SPA, in 100% of test trials.
- **SC-005**: 100% of admin publish/unpublish audit entries written after this change carry truthful prior-state values, validated by inspecting the audit table for any rows whose `previousStatus` disagrees with the product's pre-action state.
- **SC-006**: A buyer who triggers the address-book-full path during checkout sees a localized notice (Arabic and English) rendered within 500 ms of the order success response, confirmed by manual test in both locales.
- **SC-007**: 100% of pull requests that introduce a high-severity vulnerable dependency on either side fail the CI vulnerability gate, validated by a controlled test PR per side.
- **SC-008**: 100% of release-target pull requests that omit a required production secret fail the CI secrets-validation step rather than at runtime, validated by a controlled test PR.
- **SC-009**: Open-redirect attempts using `next=%2F%2Fevil.com`, `next=%2f%2fevil.com`, and `next=%252F%252Fevil.com` are all rejected by the SPA redirect resolver, in 100% of test cases.
- **SC-010**: Zero user-visible regressions on existing storefront/admin flows (cart, checkout, login, product browse, order detail, admin order transitions, admin product publish/unpublish) after deployment, verified by the existing automated test suites and a manual smoke pass in both locales.
- **SC-011**: The frontend Sentry scrubber completes redaction on a 1,000-node graph with deliberate cycles in under 50 ms on a developer-class machine, with no PII leaks in the resulting payload.
- **SC-012**: 401-refresh-retry behavior is preserved unchanged for the four auth endpoints (verified by existing tests) and is correctly applied to a synthetic non-auth endpoint whose path begins with `/auth-` (verified by a new test).

## Assumptions

- HTTPS terminates at the production reverse proxy or platform edge; the API can therefore emit HSTS unconditionally because non-HTTPS access is impossible at the edge.
- The configured cross-origin SPA origin allowlist remains the single source of truth for "trusted callers" at the API boundary.
- The address-book per-user limit constant is unchanged.
- The existing JWT structure, lifetime, and refresh-token rotation algorithm are unchanged.
- The error-tracking provider's existing API for the SPA-side scrubber callback is unchanged.
- Continuous-integration runs on GitHub Actions; vulnerability advisory data is sourced from the platform's standard advisory feed plus the dependency manager's audit subcommand.
- No new locales beyond `ar` and `en` are added by this work.
- No new database migration is required, except possibly an additive index or column in service of FR-014 truthfulness if the implementation chooses to denormalize the prior state explicitly. (If schema changes prove necessary, they remain additive only.)
- Existing Serilog redaction (`SecretLogEventFilter`) and the existing CORS configuration require no behavioral change.
- The constitutional guarantees on RTL parity, theme parity, accessibility, and keyboard navigation already hold for the existing surfaces affected (checkout flow, admin product list); only the new localized notice (FR-018) needs to satisfy them as new work.
