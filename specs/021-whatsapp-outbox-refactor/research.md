# Research: WhatsApp Outbox Reliability Refactor

**Phase**: 0 | **Branch**: `021-whatsapp-outbox-refactor` | **Date**: 2026-05-26

All NEEDS CLARIFICATION items from the spec have been resolved via code audit of the existing implementation. No external dependencies were researched — the constraint of no new packages means all solutions use stdlib/existing primitives.

---

## Decision 1: Error Classification Mechanism (FR-001 – FR-008)

**Decision**: Custom C# exception types (`WhatsAppPermanentFailureException`, `WhatsAppTransientFailureException`) thrown by `WhatsAppServiceClient.SendAsync()`, caught by `WhatsAppOutboxProcessor`.

**Rationale**: The processor already has a single `catch (Exception ex)` block per message. Adding typed exception catches before the generic fallback is the minimal, structurally consistent change. Return-value discriminated unions would require refactoring the dispatcher signature and all call sites.

**Alternatives considered**:
- Return a `SendResult` discriminated union from `IWhatsAppSender.SendAsync()` — rejected: requires changing the interface, the client, the dispatcher, and all tests; larger blast radius than adding exception types.
- Set a flag on the message inside the dispatcher before rethrowing — rejected: mixes state mutation with exception propagation; harder to reason about.

**How `WhatsAppServiceClient.SendAsync()` changes**:
- On non-2xx response: deserialize body as `{ success: bool, error: string, retryable: bool }` (best-effort; parse failure → assume transient).
- `retryable: false` → throw `WhatsAppPermanentFailureException(reason)`.
- `retryable: true` or parse failure → throw `WhatsAppTransientFailureException(reason)`.
- Remove the special-cased `HttpStatusCode.ServiceUnavailable` guard and `EnsureSuccessStatusCode()` call — replaced by the above logic.

**How `WhatsAppMessageDispatcher` timeout changes (FR-004)**:
- The current `catch (OperationCanceledException) when (!ct.IsCancellationRequested)` calls `MarkFailed()` — permanent. This violates FR-004.
- Change to: throw `new WhatsAppTransientFailureException("sidecar_timeout")`.
- The processor catches it as transient (Pending + backoff).

**How `WhatsAppOutboxProcessor` catch block changes**:
```
catch (WhatsAppPermanentFailureException ex)  → mark Failed immediately
catch (WhatsAppTransientFailureException ex)  → mark Pending + backoff (with FR-006a exemption)
catch (Exception ex)                          → existing behavior (unchanged)
```

---

## Decision 2: Circuit-Open Attempt Counter Exemption (FR-006a)

**Decision**: After a `WhatsAppTransientFailureException("circuit_open")`, decrement `msg.Attempts` by 1 in the processor before computing backoff.

**Rationale**: Attempts are incremented during the claim phase (`ExecuteUpdateAsync`) before dispatch — unavoidable because the claim and increment are atomic. The only place to correct this is post-dispatch in the catch block. A `FailureReason == "circuit_open"` check is deterministic.

**Alternatives considered**:
- Skip claim increment for circuit-open before dispatch — impossible: the circuit is checked in the sidecar, not locally before claim.
- Add a separate `CircuitOpenAttempts` column — rejected: adds schema complexity for what is a minor bookkeeping correction; FR-027 prohibits new migrations.
- Accept the over-count — rejected: violates FR-006a explicitly.

---

## Decision 3: PayloadVersion Storage (FR-017)

**Decision**: Add `PayloadVersion = 1` to the `MessagePayload` record (serialized into the existing `Payload` JSON column), not as a new entity property or DB column.

**Rationale**: FR-027 prohibits new migrations. FR-017 states PayloadVersion is "informational only and does not alter processing behavior." The `Payload` column already stores a JSON blob; adding a field to the serialized record requires zero schema change. Existing null-version records continue processing unchanged because the field is optional in deserialization.

**Alternatives considered**:
- New nullable `PayloadVersion int?` DB column — rejected: requires a new migration (violates FR-027).
- Application-layer version constant without storage — rejected: FR-017 explicitly requires the field to be "included" and "set at creation time."

---

## Decision 4: Sidecar Circuit Breaker Design (FR-013 – FR-015)

**Decision**: In-sidecar in-memory `CircuitBreaker` class in `whatsapp-service/src/services/circuitBreaker.js`. Singleton instance shared across all requests. Threshold: 3 consecutive non-rate-limit, non-validation failures. Cooldown: 60 seconds. Successful send resets counter.

**Rationale**: The circuit breaker must count actual WhatsApp API send outcomes. Only the sidecar has direct visibility of whether a Baileys `sendMessage()` call succeeded or failed and why. Backend-side circuit breaking would require an additional round-trip and cannot distinguish WhatsApp API failures from sidecar-internal errors.

**Failure classification for circuit counting**:
- HTTP 400 (`statusCode === 400` on thrown error): validation — does NOT count.
- HTTP 429 (`statusCode === 429`): rate-limit — does NOT count (spec: "rate-limit errors do not count toward circuit-breaker failure count").
- All other errors (connection failure, Baileys error, timeout, 500): DO count.

**Circuit-open response**: HTTP 503, `{ success: false, error: "circuit_open", retryable: true }`.

**Alternatives considered**:
- Backend-side circuit breaker (intercept 503 responses) — rejected: cannot distinguish circuit-open from other 503s without structured error body; creates cross-layer state.
- Per-phone circuit breaker — rejected: spec explicitly requires global counter.
- Persistent circuit state (MongoDB) — rejected: spec assumption that in-memory reset on sidecar restart is acceptable; adding persistence would require a new dependency.

---

## Decision 5: Retry Child Idempotency Key Format (FR-016)

**Decision**: Change key format from `retry:{original.Id}:{ticks}` to `{original.IdempotencyKey}:retry:{child.Id:N}`.

**Current code** (`RetryWhatsAppAttemptEndpoint.CreateChild`):
```csharp
IdempotencyKey = $"retry:{original.Id}:{now.UtcTicks}"
```

**New code**:
```csharp
var childId = Guid.NewGuid();
// ... set other fields ...
IdempotencyKey = $"{original.IdempotencyKey}:retry:{childId:N}"
```

The child `Id` is generated first, then used for both the entity primary key and the idempotency key suffix. This is safe because the key is set before `db.SaveChangesAsync()`.

**Rationale**: FR-016 requires the original idempotency key as a prefix. The `:N` format (32 hex chars, no hyphens) is compact and unambiguous. Using the child GUID (vs. ticks) ensures global uniqueness without clock dependency.

**Impact**: Tests asserting the old key format must be updated.

---

## Decision 6: Sidecar Monitor Health Exposure (FR-021, User Story 5)

**Decision**: Introduce `IWhatsAppHealthCache` (singleton) + `WhatsAppHealthCache` implementation. `WhatsAppSidecarMonitor` writes to it after each health check. `GetWhatsAppStatusEndpoint` injects it and reads `Latest` — no live `HealthAsync()` call at status-page load time.

**SidecarHealthResult shape**:
```csharp
public sealed record SidecarHealthResult(
    bool IsHealthy,
    DateTimeOffset LastCheckedAt,
    string? ErrorMessage);
```

**DI wiring**: Register `WhatsAppHealthCache` as `IWhatsAppHealthCache` singleton before `AddHostedService<WhatsAppSidecarMonitor>()`.

**Rationale**: The monitor already runs every 60s and makes the health call. Caching the result avoids a second sidecar call at every status-page load. Using a dedicated cache object (rather than a property on the BackgroundService itself) keeps concerns separated and makes the injection explicit.

**Alternatives considered**:
- Register `WhatsAppSidecarMonitor` as both singleton and hosted service for direct injection — rejected: double-registration is a known footgun with `IHostedService`; the dedicated cache class is cleaner.
- Read cached health from the sidecar `/status` response (already polled by the status endpoint) — rejected: the sidecar `/status` route does not expose an explicit `isHealthy` field derived from the Baileys socket state; and the endpoint should not conflate connection state with health-check result.

---

## Decision 7: Template Static Lookup (FR-018)

**Decision**: Refactor `WhatsAppMessageTemplates` internals to use `static readonly Dictionary<(string, string), string>` keyed by `(eventType, status)` for format strings with `{0}` placeholder. Public method signatures unchanged.

**Example**:
```csharp
private static readonly Dictionary<(string, string), string> _templates = new()
{
    [("OrderStatusChanged", "Confirmed")] = "تم تأكيد طلبك #{0} في Dr. Mirror وهو الآن قيد المعالجة.",
    ...
};
```

**Rationale**: The spec requires "a static lookup structure keyed by event type and status" as a maintainability improvement — centralizes all Arabic strings for easier localization review. The current `switch` expression is already essentially a lookup; the dictionary makes it explicit and extensible without touching calling code.

---

## Decision 8: `/send-template` Deprecation Warning (FR-020)

**Decision**: Add a `logger.warn('DEPRECATED: /send-template is not called by the outbox flow; this route will be removed in a future version')` log line at the top of the `/send-template` route handler (per-call, not startup-only), plus a JSDoc comment in `messages.js` documenting C# backend as source of truth.

**Rationale**: Per-call logging ensures the warning appears if the route is ever accidentally invoked, even after process restarts, without requiring startup-time route analysis. The spec says "emit a deprecation warning in its logs" — per-call satisfies this.

---

## Resolved Clarifications (from spec session 2026-05-26)

| Question | Answer |
|----------|--------|
| Circuit breaker: global or per-destination? | Global — single counter across all sends; trips at 3 regardless of recipient |
| Does circuit-open count against MaxAttempts? | No — circuit-open exempt; only actual WhatsApp API send attempts consume a slot |
| What does the monitor's exposed health result include? | `{ IsHealthy: bool, LastCheckedAt: timestamp, ErrorMessage: string? }` |
