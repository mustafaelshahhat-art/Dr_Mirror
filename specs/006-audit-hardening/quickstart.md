# Quickstart — Verifying the May 2026 Audit Hardening Pass

**Branch**: `006-audit-hardening` | **Date**: 2026-05-18

This is a developer recipe for **locally** verifying each user story in the spec, before merging. It assumes you have the standard Dr_Mirror dev environment set up (backend running on its usual local port, SPA dev server running, SQL Server reachable via the configured connection string).

---

## 1. Run the existing suites first (no regression)

```powershell
# From repo root
dotnet test backend/DrMirror.slnx --configuration Release --nologo
npm --prefix frontend test -- --run
npm --prefix frontend run i18n:check
```

All three MUST pass before and after every change in this feature.

---

## 2. Verify US1 — Security headers + CSRF + open-redirect

### 2a. Headers on every response

```powershell
# Start the API
dotnet run --project backend/src/DrMirror.Api/DrMirror.Api.csproj
```

In another shell:

```powershell
$expected = @('X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Cross-Origin-Resource-Policy')

# Healthy 200
$r = Invoke-WebRequest http://localhost:5xxx/api/health/live -SkipHttpErrorCheck
$expected | ForEach-Object { if (-not $r.Headers[$_]) { throw "missing header: $_" } }

# Not-found 404
$r = Invoke-WebRequest http://localhost:5xxx/api/does-not-exist -SkipHttpErrorCheck
$expected | ForEach-Object { if (-not $r.Headers[$_]) { throw "missing header on 404: $_" } }

# 401 from a protected endpoint
$r = Invoke-WebRequest http://localhost:5xxx/api/cart -SkipHttpErrorCheck
$expected | ForEach-Object { if (-not $r.Headers[$_]) { throw "missing header on 401: $_" } }
```

In production (HTTPS), `Strict-Transport-Security` MUST also be present and equal `max-age=31536000; includeSubDomains`.

### 2b. Refresh-endpoint Origin allowlist

Replay an attacker-style request (no `Origin` header):

```powershell
curl -i -X POST http://localhost:5xxx/api/auth/refresh
# expect: HTTP/1.1 403 Forbidden, ProblemDetails body "Missing origin"
```

Replay with a bogus `Origin`:

```powershell
curl -i -X POST -H "Origin: https://attacker.example" http://localhost:5xxx/api/auth/refresh
# expect: HTTP/1.1 403 Forbidden, "Untrusted origin"
```

Then verify the SPA still refreshes successfully by hard-reloading the storefront once logged in. The session MUST persist.

### 2c. Open-redirect

Open in your browser:

```text
http://localhost:5173/login?next=%2F%2Fevil.com
http://localhost:5173/login?next=%252F%252Fevil.com
```

After login, the SPA MUST route to the safe default destination, **not** to `evil.com`.

---

## 3. Verify US2 — Streaming proof + Sentry cycle-safety

### 3a. Memory profile on proof download

1. Upload a 5 MB proof to a wallet/Instapay order (use the existing checkout flow).
2. As that buyer, hit `GET /api/orders/{orderId}/payment-proof`.
3. Sample the API process working set in Task Manager during the transfer — the delta MUST stay under ~1 MB.

Alternatively, run the new xUnit test:

```powershell
dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --filter "FullyQualifiedName~PaymentProofStreamingTests" --nologo
```

### 3b. Sentry cycle-safety

In the SPA dev console:

```ts
import { __scrubObjectForTests } from '@/shared/lib/sentry';
const a: any = { email: 'me@example.com' };
a.self = a; // cycle
const out = __scrubObjectForTests({ extra: a });
console.assert(out.extra.email === '[redacted]');
console.assert(out.extra.self === '[circular]');
```

Or run the Vitest:

```powershell
npm --prefix frontend test -- --run sentry.cycle
```

---

## 4. Verify US4 — Truthful audit on publish/unpublish

```powershell
# As an admin:
# 1. Take a draft product P and publish it.
# 2. Then publish it again (idempotent call).

curl -i -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:5xxx/api/admin/products/$P/publish
# expect: 200 OK
curl -i -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:5xxx/api/admin/products/$P/publish
# expect: 200 OK (idempotent, no audit row)

# Inspect the audit log:
curl -H "Authorization: Bearer $ADMIN_TOKEN" "http://localhost:5xxx/api/admin/audit?targetType=Product&targetId=$P"
# expect: exactly ONE row, with PreviousValue="false", NewValue="true"
```

---

## 5. Verify US5 — Address-book-full visible

1. As a buyer, fill your address book to the per-user cap (~10 addresses).
2. Place an order with "save this address" enabled and a new address.

Expected:

- Order succeeds (`201 Created`).
- Response body contains `"addressSaveOutcome": "skipped_book_full"`.
- SPA displays a localized toast in the current locale (test both `ar` and `en`).

```powershell
npm --prefix frontend test -- --run addressSaveOutcome
```

---

## 6. Verify US6 — Exact-match auth path interceptor

In the SPA dev console:

```ts
import { __isAuthEndpointForTests } from '@/shared/lib/api-client';
console.assert(__isAuthEndpointForTests('/api/auth/login') === true);
console.assert(__isAuthEndpointForTests('/api/auth-debug-ping') === false);
console.assert(__isAuthEndpointForTests('/api/orders/123/auth-info') === false);
```

---

## 7. Verify US7 — CI vulnerability gate

This is verified by a one-off controlled PR. Do not run as part of standard local verification:

```powershell
# Locally simulate the gate
dotnet list backend/DrMirror.slnx package --vulnerable --include-transitive --format json | ConvertFrom-Json
npm --prefix frontend audit --audit-level=high --omit=dev
```

If both commands report zero high-or-critical advisories, the gate would pass on a real PR.

---

## 8. Verify US8 — CI secrets validation

```powershell
# Simulate the precheck with a deliberately missing secret
$env:Jwt__Secret = ''
pwsh -File backend/scripts/verify-prod-secrets.ps1
# expect: non-zero exit, message naming Jwt:Secret

$env:Jwt__Secret = (1..64 | ForEach-Object { '0' }) -join ''
# (plus all other required secrets)
pwsh -File backend/scripts/verify-prod-secrets.ps1
# expect: zero exit
```

---

## Final smoke pass

Before merging:

```powershell
dotnet test backend/DrMirror.slnx --configuration Release --nologo
npm --prefix frontend test -- --run
npm --prefix frontend run i18n:check
npm --prefix frontend run build
```

All four MUST pass. Browse the SPA manually in both `ar` and `en` and confirm: cart, login, checkout (with and without "save address"), product browse, order detail, admin product list (publish/unpublish), and the new address-book-full toast all behave as expected.
