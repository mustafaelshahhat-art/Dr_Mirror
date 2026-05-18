# May 2026 Audit Hardening — Closed Findings

This document summarises the 26 findings closed by the
[006-audit-hardening](../specs/006-audit-hardening/spec.md) feature, grouped by
the eight user stories the spec enumerates. Each item is a single paragraph
that links the finding to the responsible code, test, and the spec section it
satisfies.

## US1 — Hardened HTTP surface

- **Baseline security headers on every response.** `SecurityHeadersMiddleware`
  (in `backend/src/DrMirror.Api/Shared/Http/`) hooks `Response.OnStarting` to
  attach `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Cross-Origin-Resource-Policy`, and (HTTPS-only in production)
  `Strict-Transport-Security` on every response shape including
  `Results.Stream`. Verified by `SecurityHeadersTests` and the regression test
  `SecurityHeadersStreamingTests`.
  See spec §FR-001..FR-005.
- **Cross-site refresh forgery rejected before rate-limit budget is consumed.**
  `RequireTrustedOriginMiddleware` rejects any forged refresh with 403 before
  `UseRateLimiter()`. `RefreshOriginPolicy.Evaluate` is unit-tested in
  isolation; the end-to-end behaviour is covered by
  `RefreshOriginAllowlistTests`. See spec §FR-006..FR-008.
- **SPA `getSafeNextPath` rejects encoded protocol-relative redirects.**
  Single-decode + `//`, `/\`, and embedded `://` rejection in
  `ProtectedRoute.tsx`; covered by `protected-route.next-redirect.test.ts`.
  See spec §FR-019.

## US2 — Streaming payment proofs

- **`CloudinaryFileStorageService.OpenReadAsync` switched from
  `GetByteArrayAsync` + `MemoryStream` to `GetStreamAsync`.** The proof
  endpoint already wraps the result in `Results.Stream(...)`. The new
  `PaymentProofStreamingTests` profiles `GC.GetTotalMemory` across a 5 MB
  download and asserts the working-set delta stays under the 2 MB budget.
  See spec §FR-009.

## US3 — Cycle-safe Sentry scrubber

- **`scrubObject` threads a `WeakSet` of visited references and a depth
  limit (10).** PII patterns still scrubbed; cycles replaced with
  `"[circular]"` sentinel. The Vitest `sentry.cycle.test.ts` builds a
  cyclic graph with PII keys and asserts no throw, <50 ms completion, and
  correct sentinels. See spec §FR-011.

## US4 — Truthful admin audit log

- **`Publish` / `Unpublish` now early-return 200 on no-op transitions and
  write audit rows whose `PreviousValue` is read from the loaded entity.**
  Action types are now `Product.Publish` / `Product.Unpublish` (split from
  the previous shared `Product.Update`). Six-scenario coverage in
  `AdminProductIdempotencyAuditTests`. See spec §FR-014, §FR-015, §FR-016.

## US5 — Visible address-book-full at checkout

- **`OrderDetailDto.AddressSaveOutcome` is populated on checkout-create
  responses (`saved` / `skipped_book_full` / `not_requested`).** SPA's
  `CheckoutSuccessNotice` / `fireAddressSaveOutcomeToast` surfaces a
  localized HeroUI toast only on `skipped_book_full`. New strings added to
  both `locales/ar/checkout.json` and `locales/en/checkout.json`; covered
  by `AddressSaveOutcomeTests` (backend) and
  `CheckoutSuccessNotice.test.tsx` (frontend). See spec §FR-017, §FR-018.

## US6 — Anchored auth-path interceptor

- **`api-client.ts` replaces substring matching with an anchored
  exact-suffix matcher over the four `/auth/{refresh,login,register,logout}`
  paths; the query string is stripped before matching.** Covered by
  `api-client.auth-match.test.ts` which exercises legitimate matches and
  decoy strings (`/api/auth-debug-ping`, `/api/orders/auth-info`,
  `/api/auth/login-history`). See spec §FR-020.

## US7 — CI vulnerability gate

- **`backend/scripts/check-vulns.ps1` plus the new CI step on the
  `backend` job fails any PR introducing a high-or-critical advisory.**
  The frontend job runs `npm audit --audit-level=high --omit=dev`. The
  override procedure is documented in `docs/DEPLOY.md`. The helper script
  ships a smoke test (`check-vulns.Tests.ps1`) invoked in CI. See spec
  §FR-021, §FR-022.

## US8 — Pre-deploy secrets validation

- **`ProdSecretsValidator.Validate(IConfiguration)`** was extracted from
  `Program.cs` so the same code path runs both at boot and in a CI
  pre-deploy step via `backend/scripts/verify-prod-secrets.ps1`. The
  validator throws a `ProdSecretsValidationException` (which is also an
  `InvalidOperationException` so existing startup tests still pass) listing
  every missing key in one aggregated message. Unit-tested by
  `ProdSecretsValidatorTests`. See spec §FR-023, §FR-024, §FR-025.

## Cross-cutting

- **No browser-automation tooling added** (Constitution §V repo boundary).
- **All new UI strings ship with both `ar` and `en` entries**; the existing
  `npm run i18n:check` step is on the CI path.
- **Single emerald accent retained** — the new toast reuses the HeroUI
  warning variant; no second hue introduced.
