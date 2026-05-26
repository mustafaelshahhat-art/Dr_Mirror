# Data Model: WhatsApp Outbox Reliability Refactor

**Phase**: 1 | **Branch**: `021-whatsapp-outbox-refactor`

No new DB columns or migrations. All entity changes are either in-process (exception types, cache objects) or in the JSON payload field.

---

## Changed: `MessagePayload` record (WhatsAppOutboxHelper.cs)

**Location**: `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppOutboxHelper.cs`

**Change**: Add `PayloadVersion = 1` field to the serialized JSON payload (FR-017). The property is nullable in deserialization so existing records with no version field continue to work.

```csharp
// BEFORE
public sealed record MessagePayload(
    string EventType,
    Guid EntityId,
    Guid BuyerUserId,
    string EntityReference,
    string Status,
    decimal? TotalAmount,
    string? ReturnReason,
    string? RecipientName,
    string? RecipientPhone,
    string MessageBody);

// AFTER
public sealed record MessagePayload(
    string EventType,
    Guid EntityId,
    Guid BuyerUserId,
    string EntityReference,
    string Status,
    decimal? TotalAmount,
    string? ReturnReason,
    string? RecipientName,
    string? RecipientPhone,
    string MessageBody,
    int? PayloadVersion = 1);   // informational; null for pre-existing records
```

**DB impact**: Zero. Serialized into the existing `Payload nvarchar(max)` column.

---

## New: `WhatsAppPermanentFailureException` (C# backend)

**Location**: `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppPermanentFailureException.cs`

Thrown by `WhatsAppServiceClient.SendAsync()` when the sidecar returns `retryable: false`. Caught by `WhatsAppOutboxProcessor` to immediately mark the message Failed regardless of remaining attempts.

```csharp
public sealed class WhatsAppPermanentFailureException(string reason) : Exception(reason)
{
    public string Reason { get; } = reason;
}
```

---

## New: `WhatsAppTransientFailureException` (C# backend)

**Location**: `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppTransientFailureException.cs`

Thrown by:
- `WhatsAppServiceClient.SendAsync()` when `retryable: true` (or body unparseable)
- `WhatsAppMessageDispatcher.DispatchAsync()` on per-message send timeout (replaces `MarkFailed`)

Caught by `WhatsAppOutboxProcessor` to re-queue with exponential backoff.

```csharp
public sealed class WhatsAppTransientFailureException(string reason) : Exception(reason)
{
    public string Reason { get; } = reason;
}
```

---

## New: `SidecarHealthResult` + `IWhatsAppHealthCache` + `WhatsAppHealthCache` (C# backend)

**Location**: `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppHealthCache.cs`

```csharp
public sealed record SidecarHealthResult(
    bool IsHealthy,
    DateTimeOffset LastCheckedAt,
    string? ErrorMessage);

public interface IWhatsAppHealthCache
{
    SidecarHealthResult? Latest { get; }
    void Update(SidecarHealthResult result);
}

public sealed class WhatsAppHealthCache : IWhatsAppHealthCache
{
    private volatile SidecarHealthResult? _latest;
    public SidecarHealthResult? Latest => _latest;
    public void Update(SidecarHealthResult result) => _latest = result;
}
```

**DI registration**: Singleton. `WhatsAppSidecarMonitor` injects it to write. `GetWhatsAppStatusEndpoint` injects it to read.

---

## Changed: `WhatsAppSidecarMonitor` (C# backend)

**Location**: `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppSidecarMonitor.cs`

**Changes**:
- Inject `IWhatsAppHealthCache healthCache` in constructor
- After each `client.HealthAsync()` call, write result to `healthCache.Update(new SidecarHealthResult(healthy, DateTimeOffset.UtcNow, errorMessage))`
- Error message captured from the exception when health check throws

---

## Changed: `WhatsAppServiceClient.SendAsync()` (C# backend)

**Location**: `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppServiceClient.cs`

**New private DTO for parsing sidecar error body**:
```csharp
private sealed record SidecarErrorDto(bool Success, string? Error, bool Retryable);
```

**SendAsync behavior after the change**:
1. Send HTTP POST to `/send-message`.
2. If `response.IsSuccessStatusCode` → return (success).
3. Attempt `ReadFromJsonAsync<SidecarErrorDto>()` (best-effort).
4. If `Retryable == false` → throw `WhatsAppPermanentFailureException(errorDto.Error ?? "permanent_failure")`.
5. Otherwise → throw `WhatsAppTransientFailureException(errorDto?.Error ?? "transient_failure")`.

Remove the existing `HttpStatusCode.ServiceUnavailable` special case and `EnsureSuccessStatusCode()` call.

---

## Changed: `WhatsAppOutboxProcessor` catch blocks (C# backend)

**Location**: `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppOutboxProcessor.cs`

Replace the single `catch (Exception ex)` block with three ordered catches:

```csharp
catch (WhatsAppPermanentFailureException ex)
{
    // FR-002, FR-005: mark Failed immediately, no further retries
    msg.Status = WhatsAppOutboxStatus.Failed;
    msg.FailureReason = ex.Reason;
    msg.LockedAt = null;
    msg.LockedBy = null;
    _logger.LogError(ex, "WhatsAppOutbox: permanent failure {EventType} (id={Id}): {Reason}", ...);
}
catch (WhatsAppTransientFailureException ex)
{
    // FR-003, FR-006, FR-006a, FR-007
    msg.LockedAt = null;
    msg.LockedBy = null;
    msg.FailureReason = ex.Reason;

    // FR-006a: circuit-open does not consume a MaxAttempts slot
    var effectiveAttempts = ex.Reason == "circuit_open"
        ? Math.Max(0, msg.Attempts - 1)
        : msg.Attempts;

    if (effectiveAttempts >= maxAttempts)
    {
        msg.Status = WhatsAppOutboxStatus.Failed;
        if (ex.Reason == "circuit_open") msg.Attempts = effectiveAttempts; // correct the counter
        _logger.LogError(...);
    }
    else
    {
        msg.Status = WhatsAppOutboxStatus.Pending;
        if (ex.Reason == "circuit_open") msg.Attempts = effectiveAttempts;
        var rawSeconds = Math.Min(Math.Pow(4, effectiveAttempts) * 30, options.MaxBackoff.TotalSeconds);
        msg.NextRetryAt = DateTimeOffset.UtcNow.Add(TimeSpan.FromSeconds(rawSeconds));
        _logger.LogWarning(...);
    }
}
catch (Exception ex)
{
    // FR-008: unclassified — preserve existing behavior
    msg.FailureReason = "sidecar_error";
    msg.LockedAt = null;
    msg.LockedBy = null;
    if (msg.Attempts >= maxAttempts)
    {
        msg.Status = WhatsAppOutboxStatus.Failed;
        _logger.LogError(...);
    }
    else
    {
        msg.Status = WhatsAppOutboxStatus.Pending;
        var rawSeconds = Math.Min(Math.Pow(4, msg.Attempts) * 30, options.MaxBackoff.TotalSeconds);
        msg.NextRetryAt = DateTimeOffset.UtcNow.Add(TimeSpan.FromSeconds(rawSeconds));
        _logger.LogWarning(...);
    }
}
```

---

## Changed: `WhatsAppMessageDispatcher` timeout handling

**Location**: `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppMessageDispatcher.cs`

```csharp
// BEFORE (marks Failed — violates FR-004)
catch (OperationCanceledException) when (!ct.IsCancellationRequested)
{
    MarkFailed(message, "sidecar_timeout");
    _logger.LogWarning(...);
    return;
}

// AFTER (rethrows as transient — processor handles it)
catch (OperationCanceledException) when (!ct.IsCancellationRequested)
{
    throw new WhatsAppTransientFailureException("sidecar_timeout");
}
```

---

## Changed: `RetryWhatsAppAttemptEndpoint.CreateChild` — idempotency key (FR-016)

**Location**: `backend/src/DrMirror.Api/Features/Admin/WhatsApp/RetryWhatsAppAttempt/RetryWhatsAppAttemptEndpoint.cs`

```csharp
// BEFORE
internal static WhatsAppOutboxMessage CreateChild(WhatsAppOutboxMessage original, DateTimeOffset now) => new()
{
    Id = Guid.NewGuid(),
    IdempotencyKey = $"retry:{original.Id}:{now.UtcTicks}",
    ...
};

// AFTER — child ID generated first, used in both Id and IdempotencyKey
internal static WhatsAppOutboxMessage CreateChild(WhatsAppOutboxMessage original, DateTimeOffset now)
{
    var childId = Guid.NewGuid();
    return new WhatsAppOutboxMessage
    {
        Id = childId,
        IdempotencyKey = $"{original.IdempotencyKey}:retry:{childId:N}",
        ...
    };
}
```

---

## New: `CircuitBreaker` (Node.js sidecar)

**Location**: `whatsapp-service/src/services/circuitBreaker.js`

```javascript
export class CircuitBreaker {
  #threshold;
  #cooldownMs;
  #consecutiveFailures = 0;
  #openUntil = null;

  constructor(threshold = 3, cooldownMs = 60_000) {
    this.#threshold = threshold;
    this.#cooldownMs = cooldownMs;
  }

  isOpen() {
    if (this.#openUntil === null) return false;
    if (Date.now() >= this.#openUntil) {
      this.#openUntil = null; // cooldown elapsed
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.#consecutiveFailures = 0;
    this.#openUntil = null;
  }

  // Only call for non-rate-limit, non-validation failures
  recordFailure() {
    this.#consecutiveFailures++;
    if (this.#consecutiveFailures >= this.#threshold) {
      this.#openUntil = Date.now() + this.#cooldownMs;
    }
  }
}
```

Instantiated once in `server.js` and passed to `registerSendRoutes()`.

---

## Changed: Sidecar `/send-message` route (Node.js)

**Location**: `whatsapp-service/src/routes/send.js`

```javascript
// New respondWithError with structured body (FR-009 – FR-012)
function respondWithError(res, err) {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const retryable = statusCode !== 400; // 400 = validation → not retryable; everything else is
  res.status(statusCode).json({
    success: false,
    error: err instanceof Error ? err.message : 'send_failed',
    retryable,
  });
}

// New /send-message handler with circuit breaker (FR-013 – FR-015)
app.post('/send-message', auth, async (req, res) => {
  if (circuitBreaker.isOpen()) {
    return res.status(503).json({ success: false, error: 'circuit_open', retryable: true });
  }
  try {
    const { phone, message } = req.body ?? {};
    await client.sendMessage(phone, message);
    circuitBreaker.recordSuccess();
    res.json({ success: true });
  } catch (err) {
    const statusCode = err?.statusCode ?? 500;
    if (statusCode !== 400 && statusCode !== 429) {
      circuitBreaker.recordFailure(); // FR-013: rate-limit and validation don't count
    }
    respondWithError(res, err);
  }
});
```

---

## State Transition Summary

| Scenario | Before | After |
|----------|--------|-------|
| Sidecar returns 400 (retryable: false) | Exception → Pending/Failed based on attempts | `WhatsAppPermanentFailureException` → **Failed immediately** |
| Sidecar returns 503 (retryable: true) | `InvalidOperationException` → Pending/Failed based on attempts | `WhatsAppTransientFailureException` → Pending + backoff |
| Send timeout | `MarkFailed("sidecar_timeout")` → **Failed** | `WhatsAppTransientFailureException("sidecar_timeout")` → Pending + backoff |
| Circuit open (sidecar rejects) | N/A (not implemented) | `WhatsAppTransientFailureException("circuit_open")` → Pending + backoff, **attempts NOT counted** |
| Unparseable sidecar response | `EnsureSuccessStatusCode()` → generic exception | `WhatsAppTransientFailureException` → Pending + backoff |
| Max retries exhausted via transient | Pending → Failed | Pending → Failed (unchanged) |

---

## Entities Not Changed

- `WhatsAppOutboxMessage` entity class — no new properties (PayloadVersion is in JSON Payload only)
- `CustomerNotificationPreferences` — unchanged
- EF Core configuration — unchanged
- DB migrations — none added or modified
