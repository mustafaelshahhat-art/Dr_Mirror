# Feature Specification: Code Quality & Reliability Hardening Pass

**Feature Branch**: `005-code-quality-hardening`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Code Quality & Reliability Hardening Pass — A targeted hardening pass that closes a small set of verified correctness, observability, and consistency gaps surfaced by a full-project code review on branch 004-uiux-excellence-pass. Five gaps: silent proof-file delete failures, unbounded email outbox retry with no dead-letter state, inconsistent frontend mutation error handling, scattered React Query keys, and sparse accessibility regression coverage."

## Clarifications

### Session 2026-05-18

- Q: How should the shared error-feedback mechanism present failures to the user? → A: Toast notification for transport / server request errors; preserve existing inline field-level validation errors. The helper fires only when a request itself fails; form-validation feedback continues to render on the offending field.
- Q: How does the toast translate server-provided error messages without changing the public API contract? → A: The frontend maps known error signals (HTTP status combined with ProblemDetails `title` or `type`) to frontend translation keys; the server's `.detail` text is never rendered directly. An unmapped signal falls back to the localized generic message. The mapping lives in a single named module on the frontend, alongside the shared toast mechanism.
- Q: What is the default maximum-attempts threshold before an outbound message transitions to the terminal failed state? → A: Default is 7 attempts (≈ 2-3 days of total retry time under the capped 7-day backoff curve). The threshold remains tunable at runtime via existing configuration so it can be adjusted without a code change or a database migration.
- Q: Which route states must the accessibility smoke tests cover? → A: For each of the four top-level route groups, two states are tested — the happy path and one realistic non-happy state. The four non-happy states are: empty cart, checkout with visible validation or request-error feedback, no-orders state, and admin order detail with proof-review actions visible. Total: eight accessibility smoke tests, at least one of which exercises the Arabic locale.

## User Scenarios & Testing *(mandatory)*

This feature is an internal hardening pass. Its "users" fall into three groups whose journeys differ in priority:

- **Operators** (the team running the system) — need failures to surface, not vanish.
- **End users** (buyers and admins using the storefront/back office) — need consistent feedback when something goes wrong.
- **The engineering team** — needs guardrails so the recent accessibility and consistency work does not silently regress.

### User Story 1 — Operators see real proof-file delete failures (Priority: P1)

When the scheduled retention job tries to delete an expired payment-proof file, the operator must be able to trust that a "purged" status means the file is genuinely gone from disk. If the delete fails for any reason other than the file already being missing, the system must not mark the database row as purged, and the failure must surface clearly enough for an operator reviewing logs to notice it.

**Why this priority**: This is a retention/compliance gap. The current behavior produces records that falsely claim a file is purged when the file may still exist, undermining the 2-year retention guarantee the product promises. It is the only finding in this pass with a direct compliance implication.

**Independent Test**: A buyer's expired proof file is left on disk with no read/write permission for the service account. The retention job runs. The row's purged-timestamp remains unset, a warning-or-higher log entry references the specific file key, and the next scheduled run retries the delete. Reversing the permission causes the next run to succeed and the row to be marked purged. Fully testable with backend integration tests and the existing retention test scaffold; no UI changes required.

**Acceptance Scenarios**:

1. **Given** a payment-proof file exists on disk and is past its retention deadline, **When** the retention job runs and the file delete fails with a non-"file missing" error, **Then** the row's purged-timestamp is not set, the failure is logged at warning level or above with the file key as a structured property, and the retention job's next scheduled run retries the same file.
2. **Given** a payment-proof file has already been removed from disk out-of-band, **When** the retention job runs, **Then** the row's purged-timestamp is set normally and no warning is logged.
3. **Given** a payment-proof file is past its retention deadline and deletable, **When** the retention job runs, **Then** the row's purged-timestamp is set and the file no longer exists on disk.

---

### User Story 2 — Operators see permanently failing emails instead of silent retries (Priority: P1)

When an outbound email cannot be delivered (bad address, persistent provider rejection, etc.), the system must stop retrying it after a bounded number of attempts and mark the message in a terminal failed state. A message that can never succeed must not remain "in flight" indefinitely; an operator scanning system state must be able to tell that a particular message has stopped trying and needs human attention.

**Why this priority**: Today, a permanently broken address quietly stays in flight forever. Operators have no signal that anything is wrong, and the scheduled re-attempt time grows so large that it effectively never fires. Both halves of the gap (unbounded backoff, no terminal state) ship together because fixing only one leaves the same operator-visibility problem.

**Independent Test**: A test message is queued with an invalid recipient. Calls fail every attempt. Verify the time-between-retries never exceeds a hard ceiling, that the message transitions to a terminal failed state after a bounded number of attempts, and that the terminal state is discoverable from existing operator-visible surfaces (logs at minimum). Fully testable from backend tests; no UI changes required.

**Acceptance Scenarios**:

1. **Given** a queued outbound message that fails every send attempt, **When** the processor has attempted the message the configured maximum number of times, **Then** the message transitions to a terminal failed state and is not rescheduled.
2. **Given** a queued outbound message that has failed some attempts but not reached the maximum, **When** the processor schedules its next retry, **Then** the wait until the next attempt never exceeds the configured ceiling (seven days by default).
3. **Given** a message in the terminal failed state, **When** an operator inspects the existing operator-visible log channel, **Then** an `Error`-severity entry identifies the message and the reason for its final failure, findable without database access.

---

### User Story 3 — End users see consistent feedback when a request fails (Priority: P1)

When a buyer or admin performs an action that triggers a server request — adding to cart, placing an order, uploading a proof, approving or rejecting a proof, replying to an inquiry, editing a saved address — and the request fails for any reason (network error, validation error from the server, generic server error, or an unexpected error type), the user must see a single, predictable style of feedback. The message must be readable in their selected language (Arabic or English), must reflect the server's reason when one is provided, and must never silently fail with no indication.

**Why this priority**: This is the only user-visible item in this pass. Today, failure feedback varies by feature: some screens show a server-provided error, some show a generic English message regardless of server detail, some show nothing at all and leave the user confused about whether the action succeeded. Inconsistency at this surface erodes trust and makes support harder.

**Independent Test**: For each affected feature, force three failure shapes — a structured error response with a translated reason, an error response without a body, and a non-network unexpected error — and verify a feedback element appears each time in the user's chosen language. Testable per-feature with the existing test setup; no backend changes required.

**Acceptance Scenarios**:

1. **Given** a buyer or admin performing any covered action, **When** the server returns a structured error response whose HTTP status combined with ProblemDetails `title` or `type` matches a known mapping, **Then** the user sees a frontend-localized translation of that signal as a toast notification in their selected language.
2. **Given** a buyer or admin performing any covered action, **When** the request fails with no response body, with an unexpected error type, or with an error signal not present in the mapping, **Then** the user sees a generic-but-localized fallback message as a toast notification.
3. **Given** any successful mutation across all covered features, **When** the action completes, **Then** no error toast appears (i.e. the helper does not produce false positives).
4. **Given** a mutation triggered from a form with client-side validation errors, **When** the user submits, **Then** the field-level inline validation errors render exactly as they do today and no toast is displayed for those validation errors.
5. **Given** any failure scenario, **When** the toast is composed, **Then** the server-provided ProblemDetails `.detail` text is never rendered directly to the user.

---

### User Story 4 — The team is protected against accidental cache-invalidation bugs (Priority: P2)

When an engineer adds a new screen, mutation, or refresh action, they must be able to reference the keys that identify cached server state from a single named source. A typo or rename must produce a build or test failure rather than silently breaking another feature's freshness.

**Why this priority**: Less urgent than the P1 items because failures are intermittent and recoverable (a page refresh fixes them), but worth doing now because the cleanup is mechanical and protects every future feature from a class of bug that is hard to trace.

**Independent Test**: A grep across the frontend source for inline cache-key tuples (string-array literals used as keys) returns zero matches in feature code, with the new keys module being the only exception. A test that intentionally typos a key fails the build or test rather than silently producing stale data.

**Acceptance Scenarios**:

1. **Given** any feature that reads or invalidates cached server state, **When** the code is reviewed, **Then** every cache key reference goes through the centralized keys module.
2. **Given** an engineer introduces a typo in a cache-key reference, **When** the project builds or tests, **Then** the build or test fails.

---

### User Story 5 — The team is protected against accessibility regressions (Priority: P2)

When an engineer changes any of the highest-traffic screens — cart, checkout, my-orders, admin order detail — a routine test run must fail if a known accessibility regression is reintroduced. The Phase G semantic uplift must not silently erode over time.

**Why this priority**: Less urgent than the P1 items because nothing breaks immediately, but it locks in already-completed work and is cheap to add now.

**Independent Test**: A routine test run includes one accessibility smoke check per top-level route group. Each smoke check loads the route in a representative signed-in state and asserts no WCAG 2.0 A or AA violations. Reintroducing a known regression (e.g. removing a form label) fails the corresponding test.

**Acceptance Scenarios**:

1. **Given** the four highest-traffic route groups (cart, checkout, my-orders, admin order detail), **When** the routine test suite runs, **Then** each route is loaded in a representative state and asserted to have zero WCAG 2.0 A and AA violations.
2. **Given** a known accessibility regression is reintroduced into one of the four routes, **When** the routine test suite runs, **Then** the corresponding smoke test fails with an identifiable message.

---

### Edge Cases

- **Retention job partial success**: A retention run processes a batch where some deletes succeed and some fail. Rows for successful deletes are marked purged; rows for failed deletes are not, and each failure is logged separately. The job does not abort the batch on the first failure.
- **Outbox attempt counter overflow**: A message that is reactivated (e.g. by a future operator tool) must have its attempt counter reset semantics defined, or this scenario must be ruled out for this pass. Default: this pass treats the terminal failed state as final; reactivation is out of scope.
- **Error-toast helper at boot time**: A failure during initial application boot, before the toast system is mounted, must not crash the app. The helper logs the failure to the existing telemetry channel even if no toast can be displayed.
- **Concurrent retention runs**: If two retention runs overlap, two attempts at the same file delete must not double-log or double-write the row. The existing single-run-at-a-time guarantee from the background service is assumed.
- **Accessibility tests under both languages**: At least one of the eight accessibility smoke tests must run under the Arabic locale to catch RTL-only regressions; the others may run in the default locale.
- **Unmapped server error signal**: When the backend returns a structured error whose status / `title` / `type` combination is not in the frontend's mapping module, the toast must show the localized generic fallback. The original signal is still captured in client-side telemetry so the mapping module can be extended later without losing data.

## Requirements *(mandatory)*

### Functional Requirements

**Proof-file delete observability**

- **FR-001**: When the proof-file delete operation fails for any reason other than the file already being absent, the system MUST NOT mark the corresponding database row as purged.
- **FR-002**: Every such failure MUST be recorded in the existing operator-visible log channel at warning severity or higher, with the file key included as a structured property.
- **FR-003**: A row whose previous delete attempt failed MUST be re-attempted on the next scheduled retention run, without requiring manual intervention.
- **FR-004**: When the underlying file is already absent, the row MUST be marked purged normally and no warning MUST be logged.

**Outbound message terminal state and bounded backoff**

- **FR-005**: The time the processor waits before retrying a previously failed outbound message MUST NOT exceed a configurable ceiling, with a default value of seven days.
- **FR-006**: After a configurable maximum number of failed attempts (default: 7), an outbound message MUST transition to a terminal failed state and MUST NOT be rescheduled. The threshold MUST be tunable at runtime via existing configuration mechanisms without requiring a code change or a database migration.
- **FR-007**: A message in the terminal failed state MUST be discoverable through the existing operator-visible log channel — at minimum, a log entry at `Error` severity or higher that identifies the message and its final failure reason. No additional operator surface (admin UI, metric, alert) is in scope for this pass.
- **FR-008**: Messages in the terminal failed state MUST be distinguishable from messages still in retry, both in storage and in operator-visible surfaces.

**Consistent end-user error feedback**

- **FR-009**: Every mutation in the cart, checkout, my-orders, admin, inquiries, addresses, and app-config feature areas MUST route its transport / server error path through a single shared feedback mechanism that renders a toast notification.
- **FR-010**: When the server returns a structured error response whose HTTP status combined with the ProblemDetails `title` or `type` matches an entry in the frontend's error-signal mapping, the shared mechanism MUST render the corresponding frontend translation as a toast in the user's currently selected language (Arabic or English).
- **FR-010a**: The mapping from error signals to translation keys MUST live in a single named module on the frontend, alongside the shared toast mechanism, so that adding or revising a mapping is a one-file change.
- **FR-010b**: The server-provided ProblemDetails `.detail` text MUST NOT be rendered directly to the user under any failure scenario; it MAY be recorded only via the client-side telemetry channel referenced in FR-012.
- **FR-011**: When the request fails with no response body, with a network error (defined as: an AxiosError whose `response` field is absent — i.e. the request never produced an HTTP response), with an unexpected error type (anything not recognized as an AxiosError or `Error`), or with an error signal not present in the mapping, the shared mechanism MUST display a localized generic fallback message as a toast.
- **FR-012**: The shared mechanism MUST also record the failure in the existing client-side telemetry channel using a single consistent shape, regardless of the underlying error type.
- **FR-013**: No mutation in the covered feature areas MAY read fields off an error object without first verifying its type.
- **FR-013a**: Existing client-side, field-level validation feedback (e.g. per-field form errors) MUST continue to render as it does today and MUST NOT be replaced or duplicated by the shared toast mechanism.

**Centralized cache-key references**

- **FR-014**: There MUST be exactly one module in the frontend source that defines all cache keys used to identify server-state collections (the "keys module"). Every read of, write to, or invalidation of cached server state MUST reference a key defined in this module.
- **FR-015**: No feature-level file outside the keys module MAY contain an inline cache-key tuple.
- **FR-016**: A typographical error in a cache-key reference MUST cause a build-time or test-time failure rather than a silent runtime miss.

**Accessibility regression protection**

- **FR-017**: The four top-level route groups (cart, checkout, my-orders, admin order detail) MUST each have at least two automated tests that assert no accessibility violations at the WCAG 2.0 A and AA levels: one for the happy-path loaded state, and one for a realistic non-happy state specific to that route.
- **FR-017a**: The four non-happy states that MUST be covered are:
  - **Cart**: the empty-cart state.
  - **Checkout**: the form rendered with at least one visible field-level validation error and/or a visible request-error toast.
  - **My-orders**: the no-orders state shown to a signed-in buyer with no order history.
  - **Admin order detail**: the detail screen with proof-review actions visible (i.e. an order whose latest proof is pending admin action).
- **FR-018**: At least one of these tests MUST exercise the Arabic locale (RTL) so that direction-specific regressions are caught.
- **FR-019**: The accessibility tests MUST run as part of the routine test command and MUST NOT be skipped or marked optional.

**Cross-cutting**

- **FR-020**: This feature MUST NOT introduce any new top-level project folders on either stack and MUST follow the existing feature-slice layout.
- **FR-021**: This feature MUST NOT change the public HTTP API contract: no new endpoints, no changes to response shapes, no breaking changes to status codes.
- **FR-022**: This feature MUST NOT change any user-visible UI, copy, theme, or layout from the 004 phase A–H work; the only user-visible change is the addition of consistent error feedback where feedback was previously inconsistent or absent.
- **FR-023**: This feature MUST NOT introduce any browser-automation dependency (Playwright, Puppeteer, Cypress, Selenium, etc.), per the repository boundary documented in `CLAUDE.md`.
- **FR-024**: All new user-visible strings MUST be present in both the Arabic and English translation resources.

### Key Entities

- **Payment-proof retention row**: Represents the lifecycle of a single uploaded payment-proof file, including whether and when it has been purged from disk. The "purged" timestamp is what changes meaning under this feature: it must now reflect a successful delete, not merely an attempted one.
- **Outbound message**: Represents a single queued outbound communication (today, email). Gains a terminal failed state distinct from its existing "pending" and "in retry" states, and gains an explicit attempt count and last-failure reason if not already present.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this feature ships, zero rows of the payment-proof retention table can be in the "marked purged" state while their underlying file still exists on disk under normal operation. Verified by a backend integration test that forces a delete failure and asserts the row's state.
- **SC-002**: After this feature ships, no outbound message can remain in a non-terminal state for more than the configured maximum attempts (default 7). Verified by a backend integration test that drives a message to the terminal state and asserts the attempt count, state, and absence of further scheduling.
- **SC-003**: After this feature ships, no outbound message's next-retry time can be more than seven days (configurable) in the future. Verified by a backend unit test of the backoff calculation.
- **SC-004**: 100% of mutations in the seven covered feature areas display a localized toast when the underlying request fails, across four failure shapes: (a) structured error with a mapped signal, (b) structured error with an unmapped signal, (c) empty / network error, (d) non-network unexpected error. Verified by per-feature frontend tests covering each shape at least once across the feature set, plus a test asserting that ProblemDetails `.detail` text never reaches the toast surface.
- **SC-005**: Zero inline cache-key tuples remain in feature code outside the keys module. Verified by a repeatable text search across the frontend source.
- **SC-006**: Zero accesses of error-response fields occur in feature code without a preceding type-guard call. Verified by a repeatable text search across the frontend source.
- **SC-007**: The four highest-traffic route groups each have at least two accessibility tests (happy-path and non-happy state) that fail when a known WCAG 2.0 A or AA regression is reintroduced. Verified by mutation-testing one specific regression per state (e.g. removing a form label from the checkout error state, removing the live-region role from the empty-cart announcement) and confirming the corresponding test fails. At least one of the eight tests runs under the Arabic locale.
- **SC-008**: The routine test commands on both stacks pass on the new branch with zero newly-skipped tests, zero new lint-rule disables, and zero new type-system escape hatches in changed files.
- **SC-009**: The new branch ships zero changes to the public HTTP API contract and zero changes to user-visible UI from the 004 phase A–H state, other than the addition of consistent error feedback where feedback was previously inconsistent or absent.

## Assumptions

- **Operator-visible surface is logs (for this pass).** Both for proof-file delete failures and for outbox terminal-failed messages, the existing structured log channel is treated as sufficient operator-visibility. No admin UI surface, no health-check counter, and no metrics endpoint are added in this feature. If a future feature adds an operator console, it can read from the same data; nothing introduced here blocks that.
- **The error-toast helper sweep covers all mutations in `cart`, `checkout`, `orders`, `admin`, `inquiries`, `addresses`, and `app-config`.** The original prompt listed five feature areas; the sweep is extended to include `addresses` and `app-config` so the rule "every mutation in a covered area uses the helper" remains unambiguous and there is no inconsistency between roughly similar features. Mutations elsewhere may adopt the helper opportunistically but are not required to in this pass.
- **The default maximum-attempts threshold for outbound messages is 7.** Under the existing backoff curve capped at 7 days, this yields roughly 2-3 days of total retry time before terminal failure — long enough to absorb typical provider transient outages, short enough to surface real permanent failures within the same operational week. The threshold remains tunable at runtime via existing configuration so operators can adjust it without a code change or migration.
- **Reactivation of a terminally-failed message is out of scope for this pass.** Once a message is in the terminal failed state, this feature does not provide a way for an operator to retry it. A future operator tool can do so.
- **Existing test infrastructure is sufficient.** The retention test scaffold, the React Testing Library + jsdom setup, the `vitest-axe` dependency, and the existing seeded fixtures for buyers and admins are all already present and continue to be used without modification.
- **Translation work is local to this feature.** New user-visible strings for fallback error messages exist in both Arabic and English, added under the existing locale files; no new locale or namespace is introduced.
- **"Network error" has a single precise definition.** For the purpose of FR-011 and SC-004, a "network error" is an AxiosError whose `response` field is absent (i.e. the request never received an HTTP response — DNS failure, connection refused, timeout, CORS preflight block, browser-offline). This is distinct from "unexpected error type", which covers anything that is not an AxiosError or `Error` instance.
- **The fix does not require a new persistence index or schema change beyond what the terminal-failed message state demands.** Only one migration is expected in this pass, and it adds the terminal state to the outbound-message entity.
