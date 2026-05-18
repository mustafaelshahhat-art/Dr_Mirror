# Phase 0 Research — May 2026 Audit Hardening Pass

**Branch**: `006-audit-hardening` | **Date**: 2026-05-18

Each section resolves one outstanding implementation decision left open by `/speckit.specify` and `/speckit.clarify`. The spec-level questions were already answered in the `Clarifications` block of `spec.md`; this document covers the lower-level *how* decisions that affect the task list.

---

## R1 — Security-headers middleware implementation

**Decision**: Hand-roll a small ASP.NET Core middleware (`SecurityHeadersMiddleware`) and register it once via `app.UseMiddleware<SecurityHeadersMiddleware>()` immediately after `UseRouting` and before `UseAuthentication`. Configuration is bound from `Security:Headers:*` keys via a `SecurityHeadersOptions` record.

**Rationale**:

- The full `NWebsec` package is a heavyweight dependency for a project that only needs five static response headers. It also pulls in legacy compatibility shims unrelated to this scope.
- ASP.NET Core has no built-in middleware that emits the exact five-header set the spec mandates (HSTS + nosniff + Referrer-Policy + X-Frame-Options + CORP). The closest, `UseHsts()`, only handles one of the five.
- A bespoke middleware is ~40 lines, has zero new dependencies, and is trivial to test by snapshot-asserting `HttpContext.Response.Headers` after `_next(context)`.
- Headers MUST attach **even when the request short-circuits** (rate-limit 429, validation 400, exception 500). The implementation uses `context.Response.OnStarting(...)` so headers are written exactly once just before the response is flushed, regardless of which downstream component produced the status code.

**Alternatives considered**:

- **`NWebsec.AspNetCore.Middleware`** — rejected: large, mostly unused surface, and last meaningful release does not target .NET 10 cleanly.
- **`Microsoft.AspNetCore.HttpsPolicy.HstsMiddleware` + custom for the rest** — rejected: forces two middleware registrations and split configuration for what is conceptually one policy.
- **Header injection at the reverse proxy (MonsterASP / IIS)** — rejected: not in this repo, would drift silently from local dev, and would not cover the streaming `/api/orders/.../proof` path consistently.

**Test approach**: New xUnit class `SecurityHeadersTests` instantiates a `TestServer`, hits four representative endpoints (`/api/health/live`, `/api/catalog/products`, `/api/auth/login` with bad creds → 401, a 429 from the strict rate-limit policy) and asserts each response carries the exact header set.

---

## R2 — Origin-allowlist filter on `/api/auth/refresh`

**Decision**: Add a per-endpoint filter, `RequireTrustedOrigin`, that runs **inside** the refresh slice (`Features/Auth/Refresh/RefreshEndpoint.cs`). The filter pulls the configured allowlist from the same `Cors:AllowedOrigins` source the CORS policy uses (via `IOptions<CorsOptions>` or whatever the existing wiring exposes). Behaviour:

1. If the request has **no `Origin` header** → reject with `403 Forbidden` and a ProblemDetails body. (Browsers always send `Origin` on credentialed POST; absence indicates a tool/proxy stripping headers or a synthetic forgery attempt.)
2. If the `Origin` header is present and exact-matches a value in the allowlist → continue to the existing refresh handler.
3. Otherwise → reject with `403 Forbidden`.

The check runs **before** the existing rate-limit policy decrements the per-IP counter, so a flood of forged refreshes does not consume a legitimate caller's budget.

**Rationale**:

- Reusing the CORS allowlist as the source of truth means there is exactly one place to update trusted origins. This was the explicit reason `clarify` chose Option A.
- An endpoint filter (rather than a global middleware) keeps the new policy visible exactly where the refresh logic lives — a future reader of `RefreshEndpoint.cs` sees the protection in-slice, satisfying Principle V.
- 403 (not 401) is intentional: 401 implies "your credentials were missing/invalid" and would mislead our own SPA debugging; 403 says "your *origin* is not allowed".

**Alternatives considered**:

- **Global CSRF middleware (e.g., ASP.NET Core's antiforgery)** — rejected: requires a CSRF cookie + token round-trip, which is overkill for a single endpoint and would force SPA changes contradicting clarify decision Q1-A.
- **Same-site=Strict on the refresh cookie** — rejected at clarify time (would break the configured cross-origin SPA, see clarify Q1 Option D).

**Test approach**: `RefreshOriginAllowlistTests` covers four cases: (a) configured allowlisted origin → 200, (b) different allowlisted origin → 200, (c) non-allowlisted origin → 403, (d) missing `Origin` header → 403. Each case verifies rotation/sibling-revocation behaviour is *not* invoked on rejection (DB row count unchanged).

---

## R3 — Streaming the payment proof file

**Decision**: Replace the current `GetByteArrayAsync(...)` pattern in `CloudinaryFileStorageService.OpenReadAsync` with `GetStreamAsync(...)` and return the resulting `Stream` directly. The calling endpoint (`DownloadPaymentProofEndpoint`) wraps the stream in `Results.Stream(...)` with the correct `Content-Type`, `Content-Length` (if known), and `Content-Disposition: inline`. No application-side buffer is allocated.

For the local-disk storage adapter (used in dev), no change is needed — `File.OpenRead` already returns a stream.

**Rationale**:

- `HttpClient.GetStreamAsync` returns a `Stream` that yields response bytes as they are read by the consumer; the `HttpContext.Response.Body.WriteAsync` loop inside ASP.NET Core's `Results.Stream` then pushes those bytes downstream in fixed-size chunks (default 64 KB).
- The working-set delta during a 5 MB transfer is bounded by the chunk size + HttpClient's internal connection buffer, both well under 1 MB total — easily within SC-003's budget.
- Auth, ownership, rate-limit, and audit code paths run **before** the stream is opened, so FR-009's "unchanged" semantics are trivially preserved.

**Alternatives considered**:

- **Range-aware streaming** — rejected as out of scope: payment proofs are small (< configured max upload), single-shot downloads. Range support is a different feature.
- **Pre-buffer to a MemoryStream of bounded size** — rejected: still buffers, just with a cap; defeats the purpose.

**Test approach**: `PaymentProofStreamingTests` profiles `GC.GetTotalMemory(forceFullCollection: true)` before/after a 5 MB stream and asserts delta < 1 MB. (Memory profiling in xUnit is approximate but sufficient as a regression guard against re-introducing `MemoryStream`.)

---

## R4 — Cycle-safe Sentry scrubber

**Decision**: Refactor `scrubObject` to accept a `WeakSet<object>` of visited references (default-constructed on the entry call). On entry into each object/array branch, if the value is already in the set, return `"[circular]"`; otherwise add it to the set before recursing. The recursion depth is also clamped at 10 levels as a defence-in-depth against pathologically deep but acyclic graphs.

**Rationale**:

- `WeakSet` is the idiomatic JavaScript way to track visited object identities without preventing GC. It does not work on primitives, but primitives cannot form cycles, so no false negatives.
- A depth clamp protects against the rare non-cyclic but extremely deep graph (e.g., a serialised AST with 100,000 nested nodes). The `"[depth-limit]"` sentinel preserves PII redaction guarantees because any redacted key is replaced *during* the recursion, not after it stops.
- PII pattern matching, Authorization-header stripping, and payment-proof URL redaction are all already implemented and stay unchanged in their respective branches.

**Alternatives considered**:

- **`structuredClone` then operate on the clone** — rejected: `structuredClone` throws on functions / DOM nodes that legitimately appear in Sentry payloads.
- **`JSON.stringify` with a replacer that tracks visited refs** — rejected: serialises to a string, losing the nested-object shape Sentry expects.

**Test approach**: `sentry.cycle.test.ts` (Vitest) constructs an object whose `extra.context.parent` points back to its root, runs the scrubber, asserts (a) no throw, (b) finishes in < 50 ms, (c) PII keys present at any nesting depth come back as `"[redacted]"`.

---

## R5 — Truthful audit for publish/unpublish + idempotent no-op

**Decision**: Replace the current "load → mutate → audit hardcoded string" sequence with:

```text
1. Load product (existing).
2. If product.IsPublished == target → return 200 OK with the current DTO; do NOT write an audit row.
3. Else → set IsPublished = target; write audit row with previous = !target, new = target; SaveChanges.
```

The audit write uses the existing `AdminAuditWriter` and remains inside the same `SaveChangesAsync` transaction as the product mutation.

**Rationale**:

- The current hardcoded `"Unpublished" → "Published"` string is the entire bug — replacing it with a value computed from the loaded entity removes the root cause.
- Returning 200 on the no-op case matches REST idempotency expectations and avoids a `409 Conflict` that would surface to the admin as an error toast for what is, in their mental model, a success.
- Skipping the audit row on a no-op aligns with clarify decision Q3-A: a non-state-change should not pollute the trail.

**Alternatives considered**:

- **Reject no-op with 409** — rejected at clarify time (Q3 Option B).
- **Write an audit row with Published → Published** — rejected at clarify time (Q3 Option C).

**Test approach**: `AdminProductIdempotencyAuditTests` covers six scenarios — publish-from-draft, publish-from-published, unpublish-from-published, unpublish-from-draft, plus the inverse audit-row count check for each — asserting (a) correct status code, (b) correct audit-row count delta, (c) truthful `previousStatus`/`newStatus` strings when a row *is* written.

---

## R6 — `addressSaveOutcome` enum threading

**Decision**: Add a C# enum `AddressSaveOutcome { Saved, SkippedBookFull, NotRequested }` under `Features/Checkout/CreateOrder/`, surface it on `CreateOrderResponse` as `AddressSaveOutcome` (JSON: `"addressSaveOutcome"` with `JsonStringEnumConverter`), and populate it in `CreateOrderEndpoint`:

- `NotRequested` — `request.SaveAsNewAddress == false`.
- `Saved` — save requested and the new address was inserted.
- `SkippedBookFull` — save requested but the book was already at the per-user limit.

Frontend mirrors with a TypeScript union `'saved' | 'skipped_book_full' | 'not_requested'` typed on the existing checkout API client return shape. The SPA shows the existing HeroUI toast pattern only when the value is `'skipped_book_full'`.

**Rationale**:

- `JsonStringEnumConverter` keeps the wire format stable in the face of future enum reordering and matches the existing serialiser convention used elsewhere in the API.
- Snake-case JSON variants (`"saved"`, `"skipped_book_full"`) are produced by setting the `JsonNamingPolicy.SnakeCaseLower` for the converter, matching the spec's exact strings.
- All three values are present in *every* response — there is no nullable / optional field. This makes the SPA branch logic exhaustive and lint-checkable.

**Alternatives considered**:

- **Boolean `addressSaveSkipped`** — rejected at clarify time (Q4 Option C).
- **Response header** — rejected at clarify time (Q4 Option B).

**Test approach**: `AddressSaveOutcomeTests` covers the three states server-side. Frontend Vitest adds one snapshot test for each value to confirm the toast is shown / not shown.

---

## R7 — Anchored auth-endpoint matcher in `api-client.ts`

**Decision**: Replace the current substring check with an explicit set of suffix-anchored paths:

```ts
const AUTH_ENDPOINT_PATHS = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout'] as const;
function isAuthEndpoint(url: string): boolean {
  // Match exact suffix (path may include query string).
  const path = url.split('?')[0];
  return AUTH_ENDPOINT_PATHS.some((p) => path.endsWith(p));
}
```

**Rationale**:

- Suffix-matching against the four canonical paths is unambiguous and survives base-URL changes (e.g., `https://api.dr-mirror.com/api/auth/login` and `/api/auth/login` both match).
- The query string is stripped first so token-bearing URLs do not accidentally match the wrong path.
- A future endpoint such as `/api/auth-debug-ping` no longer matches because none of the four entries are a suffix of it.

**Alternatives considered**:

- **Anchored regex** — rejected: regex with `$` anchor would also work but reads less clearly than the constant array; cost-equivalent.
- **URL parsing into `URL` object** — rejected: the existing axios interceptor receives the path-only URL when the base URL is already configured; adding `new URL(...)` adds complexity for no value here.

**Test approach**: `api-client.auth-match.test.ts` covers eight cases: four matches (exact paths), three non-matches (synthetic `/auth-debug-ping`, `/api/orders/auth-info`, `/api/auth/login-history`), and the empty string.

---

## R8 — Open-redirect tightening in `getSafeNextPath`

**Decision**: Update the function to: (a) `decodeURIComponent` the value once, (b) if a `URIError` is thrown, reject the value, (c) reject if the decoded value starts with `//` or `/\`, (d) reject if the decoded value contains `://` (i.e., looks like an absolute URL), (e) preserve the existing `/login`/`/register` deny list.

**Rationale**:

- Single-decode is sufficient because the SPA only consumes URLs from `window.location.search`, which is automatically decoded once by the browser into `?next=...`. The malicious double-encoded path `%252F%252Fevil.com` would survive that single decode as `%2F%2Fevil.com`, which the SPA then re-decodes once to `//evil.com` — caught by check (c). A unit test pins this.
- Catching `URIError` prevents the SPA from crashing on a malformed `next=` value.

**Alternatives considered**:

- **Recursive decode until idempotent** — rejected: technically safer but enables `%25%2525...` style padding to DoS the loop. A single decode with explicit `//`/`\\`/`://` rejection is sufficient.

**Test approach**: `protected-route.next-redirect.test.ts` covers the canonical attack strings from SC-009 plus the legitimate paths `/account`, `/orders/123`, `/account?ref=foo`.

---

## R9 — CI vulnerability gates

**Decision**: Two new steps in `.github/workflows/ci.yml`:

1. **Backend**, after `dotnet build`:

   ```yaml
   - name: Audit backend dependencies (vulnerabilities)
     run: dotnet list backend/DrMirror.slnx package --vulnerable --include-transitive --format json > backend-vuln.json
       && pwsh -File backend/scripts/check-vulns.ps1 -InputPath backend-vuln.json -Severity high
   ```

2. **Frontend**, after `npm ci`:

   ```yaml
   - name: Audit frontend dependencies (vulnerabilities)
     run: npm --prefix frontend audit --audit-level=high --omit=dev
   ```

Severity threshold (`high` and above) lives as the `-Severity` parameter on the PowerShell helper and as the `--audit-level` flag on the npm step, both reading defaults that can be overridden per-environment.

**Rationale**:

- `dotnet list package --vulnerable` already ships with the .NET SDK and consults the GitHub Advisory Database. JSON output makes the result trivially parseable in PowerShell. The tiny helper script (`check-vulns.ps1`) exits non-zero on any package whose severity is at or above the threshold.
- `npm audit --audit-level=high` is the canonical npm advisory check; the `--omit=dev` flag excludes development-only packages that cannot reach production.

**Alternatives considered**:

- **GitHub's Dependabot Alerts (dashboard-only)** — rejected: catches issues *after* merge. The gate must fail the PR.
- **Snyk / OWASP-Dependency-Check** — rejected: adds an external service dependency and a free-tier limit.

**Test approach**: A controlled PR that adds a known-vulnerable package version on each side (a "canary commit") must fail CI; reverting the change must restore green. Not run in the regular suite — verified manually once during implementation.

---

## R10 — CI startup-secrets validation

**Decision**: Extract the existing prod-secret validation logic from `Program.cs` into a static method `ProdSecretsValidator.Validate(IConfiguration)` that throws an aggregated exception listing every missing key. `Program.cs` calls it as today. A new `backend/scripts/verify-prod-secrets.ps1` script:

1. Reads CI-supplied environment variables (the same names production uses).
2. Builds a minimal `ConfigurationBuilder` from those env vars.
3. Calls `ProdSecretsValidator.Validate(...)` via a tiny console wrapper exe.
4. Exits non-zero if validation fails.

The CI workflow runs the script on release-target builds only (branch `main` push or `workflow_dispatch` with a `release` input flag).

**Rationale**:

- Sharing one validator between runtime startup and CI eliminates drift: a new required secret is added in exactly one place (the validator) and CI catches misconfiguration immediately.
- Running only on release targets avoids friction on developer-feature-branch PRs that may not have all production secrets injected.

**Alternatives considered**:

- **Duplicate the validation list in YAML** — rejected: would drift the moment a new secret is added.
- **A separate "smoke" container that boots the API briefly** — rejected: too slow for CI; the validator-only path is < 1 second.

**Test approach**: One xUnit test that drives `ProdSecretsValidator.Validate` with a missing JWT secret and asserts the thrown exception names that key. The CI wiring itself is verified by a manual test PR.

---

## Open questions deferred to implementation

None. All resolved here; `tasks.md` can proceed directly.
