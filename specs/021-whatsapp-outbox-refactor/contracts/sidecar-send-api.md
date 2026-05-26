# Contract: Sidecar Send API

**Service**: `whatsapp-service` (Node.js)  
**Consumer**: `WhatsAppServiceClient` (C# backend)  
**Auth**: `X-Internal-Api-Key` header + `Authorization: Bearer <key>`

---

## POST /send-message

Send a WhatsApp text message to a phone number.

### Request

```json
{
  "phone": "+201234567890",
  "message": "Arabic message body"
}
```

### Response: Success

**Status**: 200

```json
{ "success": true }
```

### Response: Permanent Failure (FR-010)

**Status**: 400 — validation error (invalid phone, malformed payload)

```json
{
  "success": false,
  "error": "invalid_phone",
  "retryable": false
}
```

`retryable: false` signals to the backend: mark message **Failed immediately**, do not retry.

### Response: Rate Limited (FR-011)

**Status**: 429

```json
{
  "success": false,
  "error": "rate_limited",
  "retryable": true
}
```

### Response: Circuit Open (FR-013)

**Status**: 503 — circuit breaker is tripped (3 consecutive non-rate-limit, non-validation failures)

```json
{
  "success": false,
  "error": "circuit_open",
  "retryable": true
}
```

Circuit remains open for **60 seconds**. Backend must treat this as transient and must **not** count it against MaxAttempts.

### Response: Sidecar Error (FR-011)

**Status**: 500 or 503 (non-circuit-open)

```json
{
  "success": false,
  "error": "send_failed",
  "retryable": true
}
```

### Response: Service Unavailable (FR-011)

**Status**: 503 (sidecar itself unavailable — e.g. not connected to WhatsApp)

```json
{
  "success": false,
  "error": "whatsapp_not_connected",
  "retryable": true
}
```

---

## POST /send-template

**DEPRECATED**: This route is not called by the outbox flow. The C# backend is the source of truth for Arabic message content. This route is retained for potential future use only.

A deprecation warning is logged on every call.

### Request

```json
{
  "phone": "+201234567890",
  "template": "orderConfirmation",
  "data": { "orderNumber": "DR-2026-001" }
}
```

### Response: identical shape to /send-message responses above

---

## Circuit Breaker State Machine

```
CLOSED ──(3 consecutive non-400/non-429 failures)──► OPEN
  ▲                                                    │
  └────────(send succeeds OR 60s cooldown elapses)─────┘
```

- Failure counter is global (all recipients combined).
- Rate-limit (429) and validation (400) errors do NOT increment the failure counter.
- Any successful send resets the counter to 0 and closes the circuit immediately.
- The circuit does not persist across sidecar process restarts.

---

## Backend Error Classification

The backend (`WhatsAppServiceClient`) maps sidecar responses as follows:

| Sidecar Response | `retryable` field | Backend Action |
|-----------------|-------------------|----------------|
| 200 `{ success: true }` | N/A | Mark Sent |
| 400 `{ retryable: false }` | `false` | `WhatsAppPermanentFailureException` → mark Failed immediately |
| 429 `{ retryable: true }` | `true` | `WhatsAppTransientFailureException` → Pending + backoff |
| 503 circuit_open `{ retryable: true }` | `true` | `WhatsAppTransientFailureException("circuit_open")` → Pending + backoff, **attempts not counted** |
| 5xx `{ retryable: true }` | `true` | `WhatsAppTransientFailureException` → Pending + backoff |
| Non-JSON body (parse failure) | N/A (default) | `WhatsAppTransientFailureException` → Pending + backoff |
| Send timeout (backend-side CancellationToken) | N/A | `WhatsAppTransientFailureException("sidecar_timeout")` → Pending + backoff |
