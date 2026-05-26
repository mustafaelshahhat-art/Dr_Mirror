# Feature Specification: WhatsApp Outbox Reliability Refactor

**Feature Branch**: `021-whatsapp-outbox-refactor`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "Refactor the WhatsApp feature across the full stack (C# backend, Node.js sidecar, React frontend) in this project. The feature is a reliable outbox-pattern notification system."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Transient failures retry automatically, permanent failures stop immediately (Priority: P1)

When a WhatsApp message send attempt fails, the system distinguishes between errors that are worth retrying (network timeouts, rate limits, sidecar unavailability) and errors that will never succeed (invalid phone number, malformed payload). Transient failures are re-queued with exponential backoff; permanent failures are marked Failed without further attempts.

**Why this priority**: The core reliability promise of the outbox pattern is that messages eventually deliver. Without this distinction, permanent failures waste retry budget and delay visibility; transient failures that are prematurely marked Failed cause missed notifications.

**Independent Test**: Can be tested end-to-end by simulating a 400 (validation) error and a 503 (sidecar down) error and verifying the outbox status after each — independently delivers the core reliability improvement.

**Acceptance Scenarios**:

1. **Given** a queued message, **When** the sidecar returns a 400 with `retryable: false`, **Then** the message is marked Failed immediately with no further retry attempts.
2. **Given** a queued message, **When** the sidecar returns a 503 with `retryable: true`, **Then** the message remains Pending and is retried after an exponential backoff delay.
3. **Given** a queued message, **When** the sidecar call times out, **Then** the message is treated as a transient failure (Pending + backoff), not permanently failed.
4. **Given** a message that has reached the maximum retry count via transient failures, **When** the next attempt also fails transiently, **Then** the message is marked Failed (max attempts exhausted).
5. **Given** a queued message, **When** the sidecar's response body cannot be parsed, **Then** the error is treated as transient.

---

### User Story 2 - Admin confirms before bulk-retrying all failed messages (Priority: P2)

An admin user viewing the WhatsApp status page can trigger a "Retry All Failed" action. Before the bulk retry fires, the UI presents a confirmation dialog showing the count of failed messages to be retried, preventing accidental mass re-sends.

**Why this priority**: Bulk retry without confirmation can trigger hundreds of duplicate sends if clicked accidentally. The confirmation protects against unintended outbound message spikes.

**Independent Test**: Can be tested by opening the WhatsApp status page with failed messages present, clicking "Retry All Failed", and verifying a confirmation dialog appears with the correct count before any retry is issued.

**Acceptance Scenarios**:

1. **Given** an admin on the WhatsApp status page with N failed messages, **When** they click "Retry All Failed", **Then** a confirmation dialog appears showing "Are you sure you want to retry all N failed messages?" before any action is taken.
2. **Given** the confirmation dialog is open, **When** the admin confirms, **Then** the bulk retry is issued.
3. **Given** the confirmation dialog is open, **When** the admin cancels, **Then** no retry is issued and the page returns to its previous state.

---

### User Story 3 - Sidecar circuit breaker prevents cascade failures (Priority: P2)

When the underlying WhatsApp API experiences repeated consecutive failures, the sidecar automatically stops forwarding requests for a short cooling-off period. This prevents hammering a failing external service and gives it time to recover.

**Why this priority**: Without a circuit breaker, a flapping external API causes every outbox message processed during that window to fail, generating noise and unnecessary load on both sides.

**Independent Test**: Can be tested by simulating 3 consecutive non-rate-limit, non-validation failures and verifying the 4th send attempt is immediately rejected with a circuit-open error for the next 60 seconds.

**Acceptance Scenarios**:

1. **Given** 3 consecutive send failures (not rate-limit or validation errors), **When** a new send is attempted within 60 seconds, **Then** the sidecar rejects it with `{ success: false, error: "circuit_open", retryable: true }` and status 503.
2. **Given** the circuit is open, **When** 60 seconds elapse and a send succeeds, **Then** the circuit resets and subsequent sends proceed normally.
3. **Given** the circuit is open, **When** a retry arrives, **Then** the C# backend treats the 503 as transient and retries with backoff.

---

### User Story 4 - Retry attempts are traceable to their origin (Priority: P3)

When a failed message is retried, the newly created retry attempt carries an idempotency key that is both globally unique and directly traceable to the original message's business key. This enables support teams to correlate retry children with their parent without querying the database.

**Why this priority**: Traceability matters for support investigations ("did this order notification eventually send?") but doesn't block delivery correctness.

**Independent Test**: Can be tested by retrying a failed message and verifying the child's idempotency key contains the original message's idempotency key as a prefix.

**Acceptance Scenarios**:

1. **Given** an original message with idempotency key `order:123:placed`, **When** a retry is triggered, **Then** the child's idempotency key follows the format `order:123:placed:retry:<child-guid>`.
2. **Given** two retries of the same message, **When** both children are created, **Then** both keys are unique and both contain the original key as a prefix.

---

### User Story 5 - Admin dashboard reports sidecar health without extra network calls (Priority: P3)

The WhatsApp status endpoint can include the sidecar's last known health state without making a real-time health check call to the sidecar. The monitor exposes its cached health result so the status endpoint reads it directly.

**Why this priority**: Reduces latency and failure coupling on the status endpoint — the page should not go slow just because the sidecar is unhealthy.

**Independent Test**: Can be tested by disabling the sidecar, waiting for the monitor's health check cycle to detect the failure, then loading the status page and verifying it reports the unhealthy state without making a fresh sidecar call.

**Acceptance Scenarios**:

1. **Given** the sidecar health check has failed, **When** the status endpoint is called, **Then** it reflects the unhealthy state using the monitor's cached result.
2. **Given** the sidecar health check passes after a previous failure, **When** the status endpoint is called, **Then** it reflects the recovered healthy state.

---

### Edge Cases

- What happens when the sidecar returns a non-JSON body on an error response?
  - The error is treated as transient (cannot parse = cannot confirm permanent).
- What happens when `retryable` field is absent from the sidecar error body?
  - The error is treated as transient (defensive default).
- What happens when "Retry All Failed" is clicked while a previous bulk retry is still in progress?
  - The confirmation dialog still appears; subsequent behavior follows existing mutation state handling.
- What happens when the circuit breaker is open and a rate-limit (429) arrives?
  - Rate-limit errors do not count toward circuit-breaker failure count; they are handled independently.
- What happens when `PayloadVersion` is not set on older messages in the database?
  - No behavioral change; the field is informational only and defaults to null for existing records.

---

## Requirements *(mandatory)*

### Functional Requirements

**Error Classification**

- **FR-001**: After a non-success sidecar response, the system MUST deserialize the response body as `{ error: string, retryable: bool }`.
- **FR-002**: If the deserialized `retryable` is `false`, the system MUST raise a permanent failure signal that stops all further retry attempts for that message.
- **FR-003**: If `retryable` is `true`, or the body cannot be parsed, the system MUST raise a transient failure signal that re-queues the message with exponential backoff.
- **FR-004**: A send timeout MUST be treated as a transient failure (Pending + backoff), not a permanent failure.

**Retry Behavior**

- **FR-005**: Upon a permanent failure signal, the message MUST be marked Failed immediately regardless of remaining retry attempts.
- **FR-006**: Upon a transient failure signal, the message MUST remain Pending and be retried with exponential backoff (existing backoff algorithm unchanged).
- **FR-006a**: A circuit-open rejection (503 with `error: "circuit_open"`) MUST NOT increment the attempt counter; only responses from actual WhatsApp API send attempts consume a MaxAttempts slot.
- **FR-007**: When the maximum retry count is exhausted via transient failures, the message MUST be marked Failed.
- **FR-008**: Unclassified exceptions (neither permanent nor transient signal) MUST preserve existing behavior: mark Pending if under max attempts, else Failed.

**Sidecar Error Responses**

- **FR-009**: All error responses from the sidecar's send route MUST return a structured JSON body: `{ success: false, error: "<reason>", retryable: true|false }`.
- **FR-010**: HTTP 400 responses MUST carry `retryable: false`.
- **FR-011**: HTTP 429, 503, and 500 responses MUST carry `retryable: true`.
- **FR-012**: Successful send responses MUST include `success: true`.

**Circuit Breaker**

- **FR-013**: After 3 consecutive non-rate-limit, non-validation send failures (counted globally across all recipients), the sidecar MUST reject new send attempts with HTTP 503 and `{ success: false, error: "circuit_open", retryable: true }`.
- **FR-014**: The circuit MUST remain open for 60 seconds, after which sends are permitted again.
- **FR-015**: A successful send MUST reset the consecutive failure counter.

**Retry Idempotency Key**

- **FR-016**: A retry child's idempotency key MUST follow the format `{original.IdempotencyKey}:retry:{child.Id:N}`.

**Payload Versioning**

- **FR-017**: The `MessagePayload` record MUST include a `PayloadVersion` integer field with value `1` set at creation time. This field is informational only and does not alter processing behavior.

**Template Management**

- **FR-018**: Arabic message template strings in the backend MUST be backed by a static lookup structure keyed by event type and status, without changing the public API.
- **FR-019**: The sidecar template file MUST document that the C# backend is the source of truth for message content.
- **FR-020**: If the `/send-template` sidecar route is not called anywhere in the outbox flow, it MUST emit a deprecation warning in its logs.

**Sidecar Health Exposure**

- **FR-021**: The sidecar monitor MUST expose the result of its most recent health check as a readable property containing: `IsHealthy` (bool), `LastCheckedAt` (timestamp), and `ErrorMessage` (optional string). Callers read this property directly instead of issuing a redundant health check request.

**Frontend Confirmation**

- **FR-022**: The "Retry All Failed" action MUST require explicit confirmation via a dialog showing the count of failed messages before the bulk retry is issued.
- **FR-023**: Cancelling the confirmation dialog MUST result in no retry being issued.

**Type Correctness**

- **FR-024**: The `parentMessageId` field MUST remain in the `WhatsAppAttemptDto` type definition; it MUST NOT be removed.

**Validation**

- **FR-025**: The backend test suite MUST pass after all changes.
- **FR-026**: The frontend build MUST produce no type errors after all changes.
- **FR-027**: No new EF Core migration MUST be added; no existing migrations MUST be modified.

### Key Entities

- **WhatsApp Outbox Message**: A queued notification with status (Pending/Sent/Failed), attempt count, idempotency key, and payload. Carries a new `PayloadVersion` field (informational).
- **Retry Child**: A new outbox message created to retry a failed parent; linked via idempotency key format `{parent.IdempotencyKey}:retry:{child.Id:N}`.
- **Sidecar Error Response**: Structured JSON `{ success: bool, error: string, retryable: bool }` returned by the Node.js sidecar for all send outcomes.
- **Sidecar Health Result**: Snapshot exposed by the monitor — `{ IsHealthy: bool, LastCheckedAt: timestamp, ErrorMessage: string? }`; read by the status endpoint without a live sidecar call.
- **Circuit Breaker State**: Single global in-memory counter of consecutive failures (across all recipients) and a cooldown timestamp; resets on any successful send, opens at threshold 3.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Permanent failures (e.g., invalid recipient) reach Final Failed status within one processing cycle, with zero subsequent retry attempts recorded.
- **SC-002**: Transient failures (timeouts, 503s) are re-queued and eventually delivered once the underlying issue resolves, without manual intervention.
- **SC-003**: After 3 consecutive sidecar send failures, no additional sends reach the external WhatsApp API for the 60-second circuit-open window.
- **SC-004**: A bulk-retry action from the admin dashboard cannot be triggered without the admin explicitly confirming the count of affected messages.
- **SC-005**: The admin status page reflects the sidecar's health state (healthy/unhealthy, last-checked timestamp, and failure reason when applicable) without a real-time round-trip to the sidecar at page load.
- **SC-006**: All three WhatsApp backend test files pass after the refactor.
- **SC-007**: The frontend build completes with zero TypeScript errors after the refactor.
- **SC-008**: Every retry child's idempotency key contains the original message's business key as a prefix, enabling log-based traceability without database queries.

## Clarifications

### Session 2026-05-26

- Q: Should the circuit breaker track failures globally or independently per destination phone number? → A: Global — single counter across all sends; trips after 3 consecutive failures regardless of recipient.
- Q: Does a circuit-open rejection count against the MaxAttempts budget? → A: No — circuit-open responses are exempt; only actual WhatsApp API send attempts consume a retry slot.
- Q: What data should the sidecar monitor's exposed health check result include? → A: `{ IsHealthy: bool, LastCheckedAt: timestamp, ErrorMessage: string? }` — healthy flag, last check time, and optional failure reason.

## Assumptions

- No schema changes are required; all changes are in application logic and configuration.
- The existing exponential backoff algorithm and `MaxAttempts` configuration are unchanged.
- The sidecar circuit breaker is in-memory only; it resets on sidecar process restart (acceptable for the current deployment model).
- The `/send-template` sidecar endpoint is not part of the live outbox flow and is only retained for potential future use.
- `PayloadVersion = 1` on new messages does not trigger any deserialization branching; existing null-version messages continue processing without change.
- The Arabic message templates in the C# backend and sidecar are kept in sync manually; this refactor does not introduce automated sync.
- No new dependencies (packages, libraries) are introduced by this refactor.
