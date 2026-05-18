# Quickstart — Code Quality & Reliability Hardening Pass

How to run the work locally and verify each of the five gaps is closed. Assumes the standard Dr_Mirror dev setup (backend on a configured SQL Server connection, frontend on Vite dev server).

---

## Prerequisites

- .NET 10 SDK installed.
- Node 22 / npm 11 (whatever the repo's `package-lock.json` was generated against).
- `dotnet user-secrets` already initialized for the API project with a SQL Server connection, JWT key, and SMTP settings (the latter can point at a local MailHog or similar — the outbox just needs to be able to fail credibly).

Branch:

```powershell
git switch 005-code-quality-hardening
```

---

## Verifying US 1 — Proof-file delete observability

1. Seed at least one expired `PaymentProof` row past the retention cutoff (e.g. via the dev seeder, or `INSERT` directly into `PaymentProofs` with `UploadedAtUtc` set two years in the past).
2. Set the file at `wwwroot/uploads/payment-proofs/<file>` to read-only or remove the service account's delete permission — anything that causes `File.Delete` to throw a non-`FileNotFoundException`.
3. Run the API: `dotnet run --project backend/src/DrMirror.Api`.
4. Wait for the next retention tick (or trigger via the existing dev-only hook).
5. **Expected**: a Serilog warning with `FileKey` as a structured property appears; the `PaymentProofs` row still has `FilePurgedAtUtc = NULL`; `dotnet test --filter Retention/ProofPurge/DeleteFailureRetriesNextRun*` passes.
6. Restore delete permission. On the next tick, the same row should be marked purged and the file removed.

Automated coverage: `DeleteFailureRetriesNextRunTests.cs`.

---

## Verifying US 2 — Outbox terminal state and bounded backoff

1. In `appsettings.Development.json` (or `dotnet user-secrets`), set `"Email:MaxAttempts": 3` and `"Email:MaxBackoff": "00:01:00"` to make the test fast.
2. Point `Email:Smtp:Host` at a non-existent host (or shut down MailHog) so all sends fail.
3. Enqueue any outbound message via the existing dev path (e.g. trigger a checkout that produces a `PaymentReviewNeeded` email).
4. Watch logs. **Expected**: three warning entries (one per attempt), each with a `NextRetry` that does not exceed the configured 1-minute ceiling. On the fourth attempt the message transitions to `OutboxMessageStatus.Failed` and an `Error`-level log says `permanently failed ... after 3 attempts`. No further claims happen.
5. Inspect the `EmailOutboxMessages` table: `Status = 2`, `Attempts = 3`, `FailureReason` populated.
6. Restore the configured defaults (`7` and `7.00:00:00`).

Automated coverage: `OutboxMaxAttemptsConfigurableTests.cs`, `OutboxBackoffCeilingTests.cs`.

---

## Verifying US 3 — Consistent error toasts on the frontend

1. Run the frontend: `npm install && npm run dev` in `frontend/`.
2. Open the SPA, sign in as a buyer.
3. With DevTools' Network tab, set request blocking for `POST /api/cart` (or any covered mutation).
4. Add an item to the cart. **Expected**: a single HeroUI toast appears (`role="status"` / `aria-live`) with the localized fallback message in the current locale. No inline error appears next to the page. The Sentry breadcrumb panel (if Sentry dev is enabled) shows one entry with the raw error category and the captured status. No console errors.
5. Switch the locale to Arabic (`?lang=ar` or via the language switcher). Repeat. The toast renders in Arabic, RTL.
6. Unblock the request, repeat with a 404-producing path (e.g. `POST /api/orders/UNKNOWN/payment-proof`). **Expected**: the toast text is the specific mapped string (`errors.toast.orderNotFound`), not the generic fallback. Importantly, the server's `.detail` text never appears in the toast surface.

Automated coverage: per-feature tests across the four failure shapes; see SC-004.

---

## Verifying US 4 — Centralized query keys

```powershell
# In frontend/
npm run lint
# Should pass.

# Inline cache-key tuples in feature code should be zero outside the keys module:
rg -n --pcre2 "queryClient\.(setQueryData|invalidateQueries|getQueryData)\s*\(\s*\[" frontend/src --glob "!**/shared/lib/query-keys.ts"
# Expected: no matches.

rg -n --pcre2 "useQuery\s*\(\s*\{\s*queryKey:\s*\[" frontend/src --glob "!**/shared/lib/query-keys.ts"
# Expected: no matches.
```

Verify a typo fails type-checking:

```powershell
# Temporarily change `queryKeys.cart()` to `queryKeys.crat()` in any consumer.
npm run build
# Expected: TS error like "Property 'crat' does not exist on type ..."
# Revert.
```

---

## Verifying US 5 — Accessibility regression smoke tests

```powershell
# In frontend/
npm run test -- a11y
# Expected: 8 tests pass.

# Open one test and remove a critical semantic, e.g. delete the <label> for the
# first input in checkout.error.test.tsx's rendered tree.
npm run test -- a11y/checkout.error
# Expected: that one test fails with axe violation details.
# Revert.

# Verify the Arabic test:
rg -n "dir=\"rtl\"|lang=\"ar\"|i18n.changeLanguage\('ar'\)" frontend/src/test/a11y/
# Expected: at least one match.
```

---

## Cross-cutting verification

```powershell
# Backend tests:
dotnet test backend/DrMirror.slnx

# Frontend tests + lint:
cd frontend
npm run lint
npm run test
```

All three must pass on `005-code-quality-hardening` before opening a PR. Per FR-019 and SC-008, no new test is allowed to ship as `.skip`, and no new ESLint disable / `@ts-ignore` / `any` may be introduced in changed files.

---

## Rollback

This pass introduces no schema changes, no API contract changes, and no behavior change to successful code paths. Rollback is `git revert` of the merge commit — no migration to reverse, no data backfill needed.
