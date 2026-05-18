---

description: "Task list for May 2026 Audit Hardening Pass"
---

# Tasks: May 2026 Audit Hardening Pass

**Input**: Design documents from `/specs/006-audit-hardening/`

**Prerequisites**: plan.md âœ“, spec.md âœ“, research.md âœ“, data-model.md âœ“, contracts/ âœ“, quickstart.md âœ“

**Tests**: Tests are MANDATORY for this feature. Per the project constitution (Principle III & VII) and the spec's success criteria, every story below has at least one automated test. Integration tests that touch auth or order ownership MUST exercise the real EF Core context per `Constitution آ§Development Workflow`.

**Organization**: Tasks are grouped by user story. Each story is independently testable and independently deliverable as a standalone PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User-story label (US1â€“US8) mapped from spec.md
- File paths are absolute repo-relative

## Path Conventions

Web application layout:

- Backend: `backend/src/DrMirror.Api/`, tests under `backend/tests/DrMirror.Tests/`
- Frontend: `frontend/src/`, tests under `frontend/src/test/` and co-located `*.test.ts`
- CI: `.github/workflows/ci.yml`
- CI helpers: `backend/scripts/`
- Locales: `frontend/src/locales/{ar,en}/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the workspace is clean and on the correct branch before starting.

- [X] T001 Confirm the working tree is on branch `006-audit-hardening` and the existing CI is green by running `dotnet test backend/DrMirror.slnx --configuration Release --nologo` and `npm --prefix frontend test -- --run`. No new dependencies are added in Setup.
- [X] T002 [P] Verify `appsettings.Example.json` exposes a `Security:Headers` section as a placeholder for the new options binding to be added in T010, with documentation comment lines at `backend/src/DrMirror.Api/appsettings.Example.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting plumbing that more than one user story consumes. Keep this phase minimal â€” most stories are genuinely independent.

**âڑ ï¸ڈ CRITICAL**: User stories US1, US4, US5 read from the same `appsettings.json` pipeline; US7 and US8 share a CI workflow file. Complete this phase before parallelising story work.

- [X] T003 Establish the `backend/src/DrMirror.Api/Shared/Http/` folder (new) by creating an empty `SecurityHeadersOptions.cs` and `SecurityHeadersMiddleware.cs` placeholder pair so US1 and US7/US8 work do not race on directory creation. Files: `backend/src/DrMirror.Api/Shared/Http/SecurityHeadersOptions.cs`, `backend/src/DrMirror.Api/Shared/Http/SecurityHeadersMiddleware.cs`.
- [X] T004 [P] Create the `backend/scripts/` folder and a placeholder `README.md` describing the folder's purpose (CI helper scripts) at `backend/scripts/README.md`. US8 will populate it; US7 references it.
- [X] T005 [P] Add the shared xUnit fixture `SecurityHeadersAssertions` (a static helper that asserts the five baseline headers on an `HttpResponseMessage`) at `backend/tests/DrMirror.Tests/Security/SecurityHeadersAssertions.cs`. Consumed by US1 tests and several existing security test suites.

**Checkpoint**: Foundation ready â€” user stories can now proceed in parallel.

---

## Phase 3: User Story 1 â€” Hardened HTTP Surface (Priority: P1) ًںژ¯ MVP

**Goal**: Every API response carries the baseline security-header set; cross-site forged refreshes are rejected via Origin allowlist; the SPA's post-auth `?next=` resolver rejects percent-encoded protocol-relative paths.

**Independent Test**: An external HTTP header scanner reports all five header categories present on the deployed API; a scripted cross-origin POST to `/api/auth/refresh` is rejected with 403 while the SPA from a configured origin succeeds; the SPA discards an `?next=%2F%2Fevil.com` value and routes to the safe default.

### Tests for User Story 1 (write FIRST, expect them to FAIL)

- [X] T006 [P] [US1] Add `SecurityHeadersTests` xUnit class asserting every response (200 from `/api/health/live`, 404 from `/api/does-not-exist`, 401 from `/api/cart` unauthenticated, 429 from rate-limited login) carries the five baseline headers at `backend/tests/DrMirror.Tests/Security/SecurityHeadersTests.cs`.
- [X] T007 [P] [US1] Add `RefreshOriginAllowlistTests` xUnit class with cases: allowlisted origin â†’ 200, second allowlisted origin â†’ 200, non-allowlisted origin â†’ 403, missing `Origin` header â†’ 403, and assert rate-limit budget is not consumed on rejection at `backend/tests/DrMirror.Tests/Security/RefreshOriginAllowlistTests.cs`.
- [X] T008 [P] [US1] Add `protected-route.next-redirect.test.ts` Vitest covering: `next=%2F%2Fevil.com`, `next=%2f%2fevil.com`, `next=%252F%252Fevil.com`, and the legitimate paths `/account`, `/orders/123`, `/account?ref=foo` at `frontend/src/features/auth/__tests__/protected-route.next-redirect.test.ts`.

### Implementation for User Story 1

- [X] T009 [P] [US1] Define `SecurityHeadersOptions` with the defaults from `data-model.md آ§2` (HSTS `max-age=31536000; includeSubDomains`, `preload=false`, `nosniff`, `strict-origin-when-cross-origin`, `DENY`, `same-site`) at `backend/src/DrMirror.Api/Shared/Http/SecurityHeadersOptions.cs` (replaces T003 placeholder).
- [X] T010 [US1] Implement `SecurityHeadersMiddleware` using `HttpContext.Response.OnStarting(...)` so headers attach before the body flushes, including HSTS only on HTTPS production responses at `backend/src/DrMirror.Api/Shared/Http/SecurityHeadersMiddleware.cs` (depends on T009).
- [X] T011 [US1] Wire the middleware into the request pipeline immediately after `UseRouting()` and bind `SecurityHeadersOptions` from configuration `Security:Headers` at `backend/src/DrMirror.Api/Program.cs` (depends on T010).
- [X] T012 [P] [US1] Add `RefreshOriginPolicy` pure-function evaluator returning `RefreshOriginVerdict { Accept, Reject_MissingOrigin, Reject_UnknownOrigin }` at `backend/src/DrMirror.Api/Features/Auth/Refresh/RefreshOriginPolicy.cs`.
- [X] T013 [P] [US1] Add unit tests for `RefreshOriginPolicy.Evaluate` covering exact-match (case-insensitive), missing header, and unknown-origin cases at `backend/tests/DrMirror.Tests/Security/RefreshOriginPolicyTests.cs` (depends on T012).
- [X] T014 [US1] Add an endpoint filter `RequireTrustedOrigin` that reads the configured CORS allowlist via `IOptions<CorsOptions>` (or the existing equivalent) and runs `RefreshOriginPolicy.Evaluate` before the existing rate-limit and rotation logic at `backend/src/DrMirror.Api/Features/Auth/Refresh/RequireTrustedOriginFilter.cs` (depends on T012).
- [X] T015 [US1] Attach `RequireTrustedOrigin` to the refresh endpoint registration and confirm rate-limit and reuse-detection ordering at `backend/src/DrMirror.Api/Features/Auth/Refresh/RefreshEndpoint.cs` (depends on T014).
- [X] T016 [P] [US1] Tighten `getSafeNextPath` to single-decode via `decodeURIComponent`, catch `URIError`, and reject any decoded value starting with `//`, `/\`, or containing `://` at `frontend/src/features/auth/ProtectedRoute.tsx`.

**Checkpoint**: External header scan returns clean; forged refresh is 403; open-redirect tests are green. US1 deliverable.

---

## Phase 4: User Story 2 â€” Streaming Payment Proofs Without Buffering (Priority: P1)

**Goal**: The authenticated proof-download endpoint streams from storage to the response without buffering the full payload in API memory.

**Independent Test**: Working-set delta during a 5 MB proof download stays under 1 MB; auth/ownership/rate-limit/audit semantics unchanged.

### Tests for User Story 2 (write FIRST)

- [X] T017 [P] [US2] Add `PaymentProofStreamingTests` xUnit profiling `GC.GetTotalMemory(forceFullCollection: true)` before/after a 5 MB stream and asserting delta < 1 MB; include negative case (existing 401 on no session) at `backend/tests/DrMirror.Tests/Storage/PaymentProofStreamingTests.cs`.

### Implementation for User Story 2

- [X] T018 [US2] Replace `GetByteArrayAsync(...)` in `CloudinaryFileStorageService.OpenReadAsync` with `GetStreamAsync(...)` and return the raw `Stream` (no `MemoryStream` copy) at `backend/src/DrMirror.Api/Infrastructure/Storage/CloudinaryFileStorageService.cs`.
- [X] T019 [US2] Confirm `DownloadPaymentProofEndpoint` wraps the returned stream in `Results.Stream(...)` with correct `Content-Type` and `Content-Disposition: inline`, and that the SecurityHeadersMiddleware still attaches all five headers via `Response.OnStarting` at `backend/src/DrMirror.Api/Features/Orders/DownloadPaymentProof/DownloadPaymentProofEndpoint.cs` (depends on T018, T011).

**Checkpoint**: 5 MB proof download passes the memory budget; all existing proof-endpoint tests remain green.

---

## Phase 5: User Story 3 â€” Resilient Frontend Error Reporting (Priority: P1)

**Goal**: SPA's Sentry scrubber handles cyclic graphs without crashing while preserving PII redaction.

**Independent Test**: A synthetic event with a circular reference is delivered in <50 ms with PII keys `[redacted]` and no thrown exception.

### Tests for User Story 3 (write FIRST)

- [X] T020 [P] [US3] Add `sentry.cycle.test.ts` Vitest building a cyclic object that also contains `email`, `phone`, `address.line1` keys; assert (a) no throw, (b) completes < 50 ms via `performance.now()`, (c) PII keys replaced with `"[redacted]"`, (d) the cycle anchor replaced with `"[circular]"` at `frontend/src/shared/lib/__tests__/sentry.cycle.test.ts`.

### Implementation for User Story 3

- [X] T021 [US3] Refactor `scrubObject` to thread a `WeakSet<object>` of visited references plus a depth-limit (10) and a `"[circular]"` sentinel, preserving all existing PII patterns and Authorization-header stripping at `frontend/src/shared/lib/sentry.ts`.
- [X] T022 [P] [US3] Export a `__scrubObjectForTests` symbol from the module so the Vitest in T020 can call the function directly without monkey-patching at `frontend/src/shared/lib/sentry.ts` (same file as T021; sequence after).

**Checkpoint**: Sentry test passes; existing redaction tests remain green.

---

## Phase 6: User Story 4 â€” Truthful Admin Audit Log (Priority: P2)

**Goal**: Admin publish/unpublish records the actual prior state; no-op transitions return 200 with no audit row.

**Independent Test**: Publish a draft then publish it again â€” exactly one truthful row exists; both calls return 200.

### Tests for User Story 4 (write FIRST)

- [X] T023 [P] [US4] Add `AdminProductIdempotencyAuditTests` xUnit covering all six scenarios from `contracts/publish-unpublish-idempotency.md` (publish-from-draft, publish-from-published, unpublish-from-published, unpublish-from-draft, 404, 403) plus audit-row count and truthful `previousValue`/`newValue` assertions at `backend/tests/DrMirror.Tests/Admin/AdminProductIdempotencyAuditTests.cs`.

### Implementation for User Story 4

- [X] T024 [US4] Rewrite `Publish` and `Unpublish` handlers to: (a) load the entity, (b) early-return 200 with the current DTO if `IsPublished` already equals the target, (c) otherwise mutate and write an `AdminAuditLogEntry` whose `PreviousValue` is read from the loaded entity (never a hardcoded literal) at `backend/src/DrMirror.Api/Features/Admin/Catalog/Products/AdminProductsEndpoints.cs`.
- [X] T025 [P] [US4] Audit-row write uses the existing `AdminAuditWriter`; verify the same `SaveChangesAsync` transaction encompasses both the product mutation and the audit row (no separate `SaveChanges` call inside the writer) at `backend/src/DrMirror.Api/Features/Admin/Catalog/Products/AdminProductsEndpoints.cs` (same file as T024; sequence after).

**Checkpoint**: All idempotency + truthfulness tests green; existing admin tests remain green.

---

## Phase 7: User Story 5 â€” Visible Address-Book-Full at Checkout (Priority: P2)

**Goal**: Checkout response always carries `addressSaveOutcome`; SPA shows a localized toast only on `"skipped_book_full"`.

**Independent Test**: Place an order with a full address book and "save" enabled â€” order succeeds, response carries `"skipped_book_full"`, SPA shows the localized toast in both `ar` and `en`.

### Tests for User Story 5 (write FIRST)

- [X] T026 [P] [US5] Add `AddressSaveOutcomeTests` xUnit covering the three states (not-requested, saved, skipped-book-full) and asserting `BuyerAddresses` row-count delta in each case at `backend/tests/DrMirror.Tests/Checkout/AddressSaveOutcomeTests.cs`.
- [X] T027 [P] [US5] Add `CheckoutSuccessNotice.test.tsx` Vitest using `@testing-library/react` to assert the toast appears only on `addressSaveOutcome === "skipped_book_full"` and renders with the correct ar/en strings at `frontend/src/features/checkout/components/__tests__/CheckoutSuccessNotice.test.tsx`.

### Implementation for User Story 5

- [X] T028 [P] [US5] Define `AddressSaveOutcome` enum (`NotRequested=0`, `Saved=1`, `SkippedBookFull=2`) with `[JsonConverter(typeof(JsonStringEnumConverter<AddressSaveOutcome>))]` and snake-case naming policy at `backend/src/DrMirror.Api/Features/Checkout/CreateOrder/AddressSaveOutcome.cs`.
- [X] T029 [US5] Append `AddressSaveOutcome` to `CreateOrderResponse` (non-nullable, always populated) at `backend/src/DrMirror.Api/Features/Checkout/CreateOrder/CreateOrderResponse.cs` (depends on T028).
- [X] T030 [US5] In `CreateOrderEndpoint`, populate `addressSaveOutcome` per the three cases: detect "book at cap" before the save attempt and set `SkippedBookFull` instead of silently dropping; preserve the order's success path unchanged at `backend/src/DrMirror.Api/Features/Checkout/CreateOrder/CreateOrderEndpoint.cs` (depends on T029).
- [X] T031 [P] [US5] Add the TypeScript union `type AddressSaveOutcome = 'saved' | 'skipped_book_full' | 'not_requested'` and append the field to the existing `CreateOrderResponse` type at `frontend/src/features/checkout/api.ts`.
- [X] T032 [US5] Add `CheckoutSuccessNotice` component that subscribes to the checkout success result and conditionally fires the HeroUI toast when `addressSaveOutcome === 'skipped_book_full'` using Lucide icon, logical CSS, emerald accent at `frontend/src/features/checkout/components/CheckoutSuccessNotice.tsx` (depends on T031).
- [X] T033 [P] [US5] Add new keys `addressNotSavedTitle` and `addressNotSavedBody` to `frontend/src/locales/ar/checkout.json` (Arabic).
- [X] T034 [P] [US5] Add the matching keys to `frontend/src/locales/en/checkout.json` (English). Run `npm --prefix frontend run i18n:check` to verify parity (depends on T033).
- [X] T035 [US5] Hook `CheckoutSuccessNotice` into the existing checkout success flow (likely the `CheckoutPage` or its parent) without altering any other UI behavior at `frontend/src/features/checkout/CheckoutPage.tsx` (depends on T032).

**Checkpoint**: Checkout works in all three states; toast appears only on `skipped_book_full`; i18n parity passes.

---

## Phase 8: User Story 6 â€” Reliable 401-Refresh Path Matching (Priority: P2)

**Goal**: SPA's 401-refresh-retry interceptor matches `/auth/{refresh,login,register,logout}` by exact-suffix only, never by substring.

**Independent Test**: A synthetic `/api/auth-debug-ping` endpoint returning 401 triggers a refresh-and-retry; the four auth endpoints continue to bypass the retry.

### Tests for User Story 6 (write FIRST)

- [X] T036 [P] [US6] Add `api-client.auth-match.test.ts` Vitest covering: exact-match of the four auth paths returns `true`; synthetic `/api/auth-debug-ping`, `/api/orders/auth-info`, `/api/auth/login-history`, and empty string return `false` at `frontend/src/shared/lib/__tests__/api-client.auth-match.test.ts`.

### Implementation for User Story 6

- [X] T037 [US6] Replace the existing substring-matching `isAuthEndpoint` with an anchored exact-suffix matcher over the constant array `['/auth/refresh','/auth/login','/auth/register','/auth/logout']`; strip the query string before matching; export `__isAuthEndpointForTests` for the Vitest at `frontend/src/shared/lib/api-client.ts`.

**Checkpoint**: Auth-match Vitest passes; existing login/refresh/logout flows remain unchanged.

---

## Phase 9: User Story 7 â€” CI Vulnerability Gate (Priority: P3)

**Goal**: PRs introducing `high`-or-`critical` vulnerable dependencies on either side fail CI.

**Independent Test**: A canary PR adding a known-vulnerable package on each side fails the new step; reverting it turns CI green again.

### Tests for User Story 7

- [X] T038 [P] [US7] Add a unit test for the `check-vulns.ps1` helper that feeds it a fixture JSON containing a high-severity package and asserts non-zero exit; and a fixture with no advisories asserting zero exit at `backend/scripts/check-vulns.Tests.ps1` (Pester or simple PowerShell script â€” invoked by CI but not by `dotnet test`).

### Implementation for User Story 7

- [X] T039 [P] [US7] Add `check-vulns.ps1` PowerShell helper that consumes the JSON output of `dotnet list package --vulnerable --include-transitive --format json`, accepts a `-Severity` parameter (`high` default), and exits non-zero if any matching advisory is present at `backend/scripts/check-vulns.ps1`.
- [X] T040 [US7] Extend `.github/workflows/ci.yml` with two new steps placed in the `backend` and `frontend` jobs respectively: (a) `dotnet list backend/DrMirror.slnx package --vulnerable --include-transitive --format json > backend-vuln.json && pwsh -File backend/scripts/check-vulns.ps1 -InputPath backend-vuln.json -Severity high`, (b) `npm --prefix frontend audit --audit-level=high --omit=dev` at `.github/workflows/ci.yml` (depends on T039).
- [X] T041 [P] [US7] Document the gates and override procedure (per-PR override comment / temporary severity bump) in `docs/DEPLOY.md` under a new `## Dependency Audit Gates` section at `docs/DEPLOY.md`.

**Checkpoint**: CI runs the gates on every PR; documented escape hatch exists for emergency overrides.

---

## Phase 10: User Story 8 â€” Pre-Deploy Secrets Validation in CI (Priority: P3)

**Goal**: A release-target CI build fails when a required prod secret would be missing/invalid.

**Independent Test**: A release-target build with `Jwt:Secret` blanked fails CI with a message naming the missing key; with all secrets present, the step passes.

### Tests for User Story 8

- [X] T042 [P] [US8] Add `ProdSecretsValidatorTests` xUnit covering: missing `Jwt:Secret`, too-short `Jwt:Secret`, missing CORS allowlist, missing connection string; assert the thrown aggregated exception lists every missing key at `backend/tests/DrMirror.Tests/Startup/ProdSecretsValidatorTests.cs`.

### Implementation for User Story 8

- [X] T043 [US8] Extract the existing prod-secret validation logic from `Program.cs` into a static `ProdSecretsValidator.Validate(IConfiguration)` that throws an aggregated exception listing every missing/invalid key; have `Program.cs` call it at startup so behavior is identical to today at `backend/src/DrMirror.Api/Shared/Startup/ProdSecretsValidator.cs` (new file).
- [X] T044 [P] [US8] Add `verify-prod-secrets.ps1` script that builds a minimal `ConfigurationBuilder` from CI-supplied environment variables (using ASP.NET Core's standard `__`-as-colon convention) and invokes `ProdSecretsValidator.Validate(...)` via a tiny console wrapper exe; exit non-zero on validation failure at `backend/scripts/verify-prod-secrets.ps1` (depends on T043).
- [X] T045 [US8] Add the release-target CI step to `.github/workflows/ci.yml` guarded by `if: github.event_name == 'push' && github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && inputs.release == 'true')` invoking `pwsh -File backend/scripts/verify-prod-secrets.ps1` at `.github/workflows/ci.yml` (depends on T044).
- [X] T046 [P] [US8] Document the secrets-validation gate in `docs/DEPLOY.md` listing every key the validator checks, so operators see the full required-secret matrix in one place at `docs/DEPLOY.md`.

**Checkpoint**: All eight user stories independently functional.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, documentation, and the manual smoke pass that ties everything together.

- [X] T047 [P] Update `docs/REDESIGN_AUDIT.md` (or create `docs/AUDIT_HARDENING_2026_05.md`) with a one-paragraph summary of each closed finding and a citation back to `specs/006-audit-hardening/spec.md` at `docs/AUDIT_HARDENING_2026_05.md`.
- [X] T048 [P] Add a regression test that pins the SecurityHeadersMiddleware order â€” asserts headers are still attached on a `Results.Stream` response (the proof endpoint) â€” at `backend/tests/DrMirror.Tests/Security/SecurityHeadersStreamingTests.cs`.
- [X] T049 Run the full local quickstart in `specs/006-audit-hardening/quickstart.md` end-to-end: backend tests, frontend tests, i18n check, frontend build, manual ar/en smoke pass of cart, login, checkout (with and without "save address"), product browse, order detail, admin publish/unpublish.
- [X] T050 Update `AGENTS.md` SPECKIT block (if it still references the previous plan) to point at `specs/006-audit-hardening/plan.md` at `AGENTS.md` (only if drift is detected â€” the `.windsurf/rules/specify-rules.md` reference was already updated in `/speckit.plan`).
- [X] T051 Final code review pass focused on: (a) no new emoji in UI, (b) no second accent hue introduced, (c) no `useState` for form state, (d) no `ml-*`/`mr-*` introduced, (e) no `[Npx]` arbitrary Tailwind values without justification, (f) no browser-automation dependency added. Files: all changed files in the PR diff.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies â€” start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks US1, US7, US8 (which write into shared folders/files).
- **User Stories (Phases 3â€“10)**: All depend on Foundational. After that, US1â€“US8 are **fully parallelisable** across developers.
- **Polish (Phase 11)**: Depends on every user story being merged.

### User Story Dependencies (after Foundational)

```text
US1 (P1, MVP) â”€â”گ
US2 (P1)       â”œâ”€â”€â”€ independent â”€â”€â”€â”گ
US3 (P1)       â”ک                   â”‚
US4 (P2) â”€â”€â”€ independent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
US5 (P2) â”€â”€â”€ independent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
US6 (P2) â”€â”€â”€ independent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
US7 (P3) â”€â”€â”€ independent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
US8 (P3) â”€â”€â”€ shares ci.yml with US7â”ک
```

US7 and US8 both edit `.github/workflows/ci.yml`. Serialise those two PRs (US7 first) or coordinate via a merged CI-changes branch.

### Within Each User Story

- Tests are written first and MUST fail before implementation lands (TDD per project constitution for auth/payments-adjacent work).
- For each story, `[P]`-marked tasks may run in parallel; non-`[P]` tasks within the same story are sequential.
- After every story's checkpoint, run the existing full test suite locally to detect regressions.

### Parallel Opportunities

- All `[P]`-marked tasks in Phase 2 (Foundational) can be parallelised.
- All test-writing tasks (`T006`, `T007`, `T008`, `T017`, `T020`, `T023`, `T026`, `T027`, `T036`, `T038`, `T042`) can be parallelised because they touch distinct files.
- All locale additions (`T033`, `T034`) are file-disjoint and run in parallel.
- US1, US2, US3 (all P1) can be implemented by three different developers simultaneously after Phase 2.

---

## Parallel Example: User Story 1

```bash
# All three test files for US1 can be drafted in parallel:
Task: "T006 SecurityHeadersTests at backend/tests/DrMirror.Tests/Security/SecurityHeadersTests.cs"
Task: "T007 RefreshOriginAllowlistTests at backend/tests/DrMirror.Tests/Security/RefreshOriginAllowlistTests.cs"
Task: "T008 protected-route.next-redirect Vitest at frontend/src/features/auth/__tests__/protected-route.next-redirect.test.ts"

# Then SecurityHeadersOptions and RefreshOriginPolicy in parallel (distinct files):
Task: "T009 SecurityHeadersOptions at backend/src/DrMirror.Api/Shared/Http/SecurityHeadersOptions.cs"
Task: "T012 RefreshOriginPolicy at backend/src/DrMirror.Api/Features/Auth/Refresh/RefreshOriginPolicy.cs"

# Finally serial work that consumes them (T010 â†’ T011, T014 â†’ T015):
Task: "T010 SecurityHeadersMiddleware"
Task: "T011 Wire middleware in Program.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup.
2. Phase 2: Foundational.
3. Phase 3: US1 â€” Hardened HTTP Surface.
4. **STOP and VALIDATE**: External header scanner returns clean; cross-site refresh forging is rejected; open-redirect tests are green.
5. Ship US1 as a standalone PR.

### Incremental Delivery (recommended)

| Wave | Stories | Why grouped |
|---|---|---|
| Wave 1 â€” Security baseline | US1 | Foundational hardening; biggest external-audit signal. |
| Wave 2 â€” Reliability | US2, US3 | Operational robustness; independent of US1. |
| Wave 3 â€” Admin & UX correctness | US4, US5, US6 | Affect admin UX and frontend; serialise behind Wave 2 only if QA bandwidth requires it. |
| Wave 4 â€” CI hardening | US7 then US8 | Both edit `ci.yml`; merge US7 first, then US8. |

### Parallel Team Strategy

With three developers after Phase 2:

- Developer A: US1 (T006â€“T016)
- Developer B: US2 + US3 (T017â€“T022)
- Developer C: US4 + US5 + US6 (T023â€“T037)

Then any developer picks up US7 â†’ US8 as a serial pair.

---

## Notes

- `[P]` tasks operate on different files with no incomplete-task dependencies.
- `[Story]` label maps every implementation task back to a single user story for traceability.
- Every user story has at least one automated test that MUST fail before its implementation lands.
- The constitution forbids browser-automation tooling â€” every frontend test stays inside Vitest + jsdom.
- The constitution requires both `ar` and `en` strings for every new UI string â€” `npm run i18n:check` is on the path for US5.
- Commit after each task or each small parallel group.
- Stop at any "Checkpoint" line to validate the just-delivered story independently before continuing.
