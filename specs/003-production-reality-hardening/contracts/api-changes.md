# Contract — API Changes

Every change below is **additive or strictly-tightening**. No existing happy-path response shape changes. All error responses follow RFC 7807 ProblemDetails with `traceId` (existing behavior preserved).

## 1. `POST /api/checkout/orders` — Idempotency support

**Change**: Accept new optional header `X-Idempotency-Key: <UUID v4>`.

**Behavior**:
- If the header is present **and** the key exists for the authenticated user → return the existing order (200 OK, same body shape as the original create).
- If the header is present and the key exists for a **different** user → 409 ProblemDetails:
  ```json
  {
    "type": "https://drmirror.com/problems/idempotency-collision",
    "title": "Idempotency key collision",
    "status": 409,
    "detail": "The provided X-Idempotency-Key is already in use by another account.",
    "traceId": "00-..."
  }
  ```
- If the header is absent → request proceeds without idempotency (backwards-compat — see `README.md`).
- Successful first-time use → 201 Created (unchanged from current behavior).

**Concurrency**: Stock decrement uses `ProductVariant.RowVersion` optimistic concurrency with up to 3 retries on conflict. If all retries fail or stock becomes insufficient mid-retry → 409 ProblemDetails with localized "out of stock" message.

## 2. `POST /api/orders/{orderNumber}/proof` — Tighter validation

**Change**: Validation tightened. Happy path unchanged.

**New 413 (Payload Too Large)** when `Content-Length` > 5 MiB:
```json
{
  "type": "https://drmirror.com/problems/payload-too-large",
  "title": "File too large",
  "status": 413,
  "detail": "Payment proof must be 5 MB or smaller.",
  "traceId": "00-..."
}
```

**New 415 (Unsupported Media Type)** when `Content-Type` is not `image/jpeg | image/png | application/pdf`, **or** when the body's magic bytes do not match the declared type:
```json
{
  "type": "https://drmirror.com/problems/unsupported-media-type",
  "title": "Unsupported file type",
  "status": 415,
  "detail": "Payment proof must be a JPEG, PNG, or PDF.",
  "traceId": "00-..."
}
```

**Frontend pre-check**: file picker uses `accept=".jpg,.jpeg,.png,.pdf"` and a size check before submission, with the same localized copy.

## 3. `GET /api/orders/{orderNumber}/proof/{proofId}/file` — Purged-file response

**Change**: Add 410 (Gone) when the proof's `FilePurgedAtUtc IS NOT NULL` (file purged by retention job).

```json
{
  "type": "https://drmirror.com/problems/file-purged",
  "title": "File no longer available",
  "status": 410,
  "detail": "This payment proof was purged 2 years after the order was completed.",
  "traceId": "00-..."
}
```

**Existing behavior preserved**:
- Unauthenticated → 401.
- Authenticated but not owner and not admin → 404 (no existence leak).
- Authenticated owner or admin + file present → 200 with the binary stream.

## 4. `GET /api/health` — Replaced by `live` + `ready`

**Change**: The single `/api/health` is split:

- `GET /api/health/live` → cheap liveness:
  ```json
  { "status": "Healthy" }
  ```
  Always 200 if the process is up. Use for host liveness probes.

- `GET /api/health/ready` → readiness:
  ```json
  {
    "status": "Healthy" | "Degraded" | "Unhealthy",
    "checks": [
      { "name": "sqlserver",    "status": "Healthy", "duration": "00:00:00.0123456" },
      { "name": "filestorage",  "status": "Healthy", "duration": "00:00:00.0567890" },
      { "name": "outbox",       "status": "Healthy", "duration": "00:00:00.0042000" }
    ]
  }
  ```
  Returns 200 when `status = Healthy`, 503 otherwise.

- `GET /api/health` → kept as an alias for `/api/health/ready` for backward compatibility with any existing external monitor.

**Use**: 1-minute synthetic checks (FR-R8) target `/api/health/ready`.

## 5. Auth changes — Disabled-user & refresh-reuse enforcement

**Change**: No new endpoints. Behavior tightened on existing endpoints.

- `Authorization: Bearer <jwt>` on any protected endpoint: validation now compares the JWT's embedded security stamp against the current `User.SecurityStamp`. On mismatch → 401 ProblemDetails. Admins disabling a user (`POST /api/admin/users/{id}/disable`) bump the security stamp, invalidating outstanding tokens for that user.
- `POST /api/auth/refresh`: if the presented refresh token has `RevokedAt IS NOT NULL`, **the entire token family is revoked** and the response is 401 ProblemDetails:
  ```json
  {
    "type": "https://drmirror.com/problems/refresh-token-reuse",
    "title": "Refresh token reuse detected",
    "status": 401,
    "detail": "For your security, please sign in again.",
    "traceId": "00-..."
  }
  ```
- Cross-site cookie attributes (when `Auth__UseCrossSiteCookies=true`): `Secure; HttpOnly; SameSite=None; Path=/`.

## 6. Profile update — Role-escalation prevention

**Change**: `PUT /api/users/me` (or equivalent existing profile endpoint) binds **only** the documented fields (`DisplayName`, `Phone`, `PreferredLocale`). Any `Roles`, `IsDisabled`, `Email`, `EmailConfirmed`, `Id` in the request body is silently dropped. Response echoes only changed fields. No status code change.

## 7. Rate-limit error shape — already 429, now ProblemDetails-shaped

**Change**: Where a 429 currently has a non-ProblemDetails body, normalize to:
```json
{
  "type": "https://drmirror.com/problems/rate-limited",
  "title": "Too many requests",
  "status": 429,
  "detail": "Please wait before trying again.",
  "traceId": "00-..."
}
```
plus `Retry-After: <seconds>` header where the policy provides it. The SPA renders this with a localized toast / inline error.

## 8. CORS — already explicit, no change

Allowlist behavior preserved. Production-startup non-empty check preserved. No `*` origins with credentials.

## 9. Response cache headers

| Endpoint pattern | `Cache-Control` | `Vary` |
|---|---|---|
| `GET /api/catalog/*` | `public, max-age=60, stale-while-revalidate=300` | `Accept-Language` |
| `GET /api/orders/*`, `GET /api/cart/*`, `GET /api/addresses/*`, `GET /api/auth/me` | `private, no-store` | (none) |
| `GET /api/admin/*` | `no-store` | (none) |
| `GET /api/health/*` | `no-store` | (none) |

No business-behavior change. Backwards-compatible at the protocol level.
