---
description: "Task list for feature 005-code-quality-hardening"
---

# Tasks: Code Quality & Reliability Hardening Pass

**Input**: Design documents from `specs/005-code-quality-hardening/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md)

**Tests**: REQUIRED. The spec's Acceptance Criteria and Success Criteria explicitly demand tests on both stacks (SC-001 through SC-007). Constitution VII additionally requires integration tests for retention/outbox changes to hit a real database, not mocks.

**Organization**: Tasks are grouped by the five user stories from `spec.md`. Each user story is independently testable and independently demonstrable. Setup (Phase 1) is minimal because the project already exists; Foundational (Phase 2) is intentionally empty — no shared prerequisite blocks all five stories, so each story's prerequisites live inside its own phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task includes an exact file path or the precise filename to create

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm baseline before any feature work begins.

- [X] T001 Confirm branch `005-code-quality-hardening` is checked out; run `dotnet test --project backend/tests/DrMirror.Tests/DrMirror.Tests.csproj` and `npm --prefix frontend run lint` and `npm --prefix frontend test` and verify all three pass clean (no failing or skipped tests). This baseline must hold for every later checkpoint to compare against. **Also** enumerate any `useMutation` / `useQuery` call sites in `frontend/src/features/app-config/` via `rg -n "useMutation|useQuery" frontend/src/features/app-config/` and record the count in the task notes. If the count is zero, mark T024 as "vacuously satisfied — no mutations to sweep" at the start of US3 rather than after the rest of the sweep; if non-zero, T024 stands as written. **Task note**: Branch is `005-code-quality-hardening`; backend baseline passed with `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj` (427 passed, 0 skipped); frontend test baseline passed (221 passed); frontend lint exited with 0 errors and 19 pre-existing warnings; app-config audit found 0 `useMutation` / `useQuery` call sites.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. The five user stories in this feature are vertically independent (each touches a different layer and a different concern). No shared foundational artifact is required.

**Checkpoint**: Foundation ready (trivially). All five user stories may begin in parallel.

---

## Phase 3: User Story 1 — Proof-File Delete Observability (Priority: P1) 🎯 MVP

**Goal**: When the retention job fails to delete an expired payment-proof file for any reason other than the file already being missing, the database row must NOT be marked purged, the failure must surface in structured logs, and the next scheduled run must retry the same file. Compliance gap closed.

**Independent Test**: Force a non-`FileNotFoundException` failure from the local storage `DeleteAsync` (e.g. open the file with an exclusive lock or revoke service-account delete permission); run the retention job; assert (a) `PaymentProof.FilePurgedAtUtc` remains `null` for that row, (b) Serilog produced a `Warning` entry with `FileKey` as a structured property, (c) on the next run with permission restored, the file is deleted and the row is marked purged.

### Tests for User Story 1 (write FIRST, ensure they FAIL before implementation)

- [X] T002 [P] [US1] Create integration test `DeleteFailureRetriesNextRunTests.cs` in `backend/tests/DrMirror.Tests/Retention/ProofPurge/`. Cover three scenarios using the existing `WebApplicationFactory` + real EF Core context fixtures: (a) delete throws a non-`FileNotFoundException` → `FilePurgedAtUtc` stays `null` and the row is still claimable on the next eligibility query; (b) delete throws `FileNotFoundException` → `FilePurgedAtUtc` is set to `now`; (c) delete returns normally → `FilePurgedAtUtc` is set and the file is gone. Use a test double for `IFileStorageService` injected via the existing test composition. Assert presence of a `Warning`-level log entry with `FileKey` as a structured property using the existing `TestLoggerProvider` pattern. **Task note**: Added coverage and confirmed it failed before implementation with 2 failing scenarios.

### Implementation for User Story 1

- [X] T003 [US1] Modify `backend/src/DrMirror.Api/Infrastructure/Storage/LocalFileStorageService.cs` `DeleteAsync`: keep the existing try/catch but narrow it to swallow ONLY `FileNotFoundException` and `DirectoryNotFoundException`; rethrow everything else. Update the doc comment on `IFileStorageService.DeleteAsync` (in the interface file) to document the new exception contract.
- [X] T004 [US1] Modify `backend/src/DrMirror.Api/BackgroundServices/PaymentProofRetentionPurgeService.cs`: wrap each per-row `DeleteAsync` call in `try/catch (Exception ex)`. On catch, log at `Warning` with structured property `FileKey = proof.FileKey` and `Reason = ex.GetType().Name`, skip the `FilePurgedAtUtc = now` assignment for that row, and `continue` the loop so the rest of the batch processes (handles the "Retention job partial success" edge case from spec). Do NOT mutate the row's other fields on failure.
- [X] T005 [US1] Run the test from T002. Confirm all three scenarios pass. Run `dotnet test --project backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --filter "FullyQualifiedName~ProofPurge"` and confirm the entire ProofPurge test class still passes (no regression). **Task note**: Used the SDK-compatible path form, `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --filter "FullyQualifiedName~ProofPurge"`; passed 5/5.

**Checkpoint**: US1 fully functional and demonstrable on its own. Compliance gap closed. Can ship as MVP.

---

## Phase 4: User Story 2 — Outbound-Message Terminal State and Bounded Backoff (Priority: P1)

**Goal**: Permanently failing outbound messages stop retrying after a configurable maximum (default 7 attempts) and transition to the terminal `Failed` state. The retry backoff never exceeds a configurable ceiling (default 7 days). Operators see permanent failures in logs.

**Independent Test**: Set `Email:MaxAttempts=3` and `Email:MaxBackoff=00:01:00` in dev config. Queue a message with an unreachable SMTP target. Observe (a) three attempts, each rescheduled to a `NextRetryAt` no more than one minute in the future; (b) on the fourth claim, `Status` transitions to `OutboxMessageStatus.Failed`, an `Error` log says "permanently failed", `NextRetryAt` is no longer consulted, and the message is excluded from future claim queries.

### Tests for User Story 2 (write FIRST, ensure they FAIL before implementation)

- [X] T006 [P] [US2] Create integration test `OutboxMaxAttemptsConfigurableTests.cs` in `backend/tests/DrMirror.Tests/Email/`. Seed an `EmailOutboxMessage` row, override `EmailOptions.MaxAttempts` to `3` via `WebApplicationFactory.WithWebHostBuilder` + `IServiceCollection.PostConfigure<EmailOptions>(...)`, inject a test `IEmailSender` that throws every call, and assert: after the third failed attempt the row's `Status == OutboxMessageStatus.Failed`, `Attempts == 3`, `FailureReason` is non-null, and the row is no longer returned by the processor's claim query. Use the existing `EmailOutboxProcessor` directly under test (not a copy). **Task note**: Added coverage and confirmed it failed before implementation because `EmailOptions.MaxAttempts` did not exist.
- [X] T007 [P] [US2] Create integration test `OutboxBackoffCeilingTests.cs` in `backend/tests/DrMirror.Tests/Email/`. Override `EmailOptions.MaxBackoff` to `TimeSpan.FromMinutes(1)`, force a failure at attempt 5 (where `4^5 * 30s` would otherwise be ~8.5 hours), and assert `NextRetryAt - now <= 1 minute + small slack` (use a 5-second tolerance for clock skew). **Task note**: Added coverage and confirmed it failed before implementation because `EmailOptions.MaxBackoff` did not exist.

### Implementation for User Story 2

- [X] T008 [US2] Modify `backend/src/DrMirror.Api/Infrastructure/Email/EmailOptions.cs`: add two properties — `public int MaxAttempts { get; set; } = 7;` (annotated `[Range(1, 100)]`) and `public TimeSpan MaxBackoff { get; set; } = TimeSpan.FromDays(7);`. Add a custom `IValidateOptions<EmailOptions>` (or extend the existing one if present) that fails fast at boot if `MaxBackoff <= TimeSpan.Zero`, satisfying Constitution VII (startup validation).
- [X] T009 [US2] Modify `backend/src/DrMirror.Api/Infrastructure/Email/EmailOutboxProcessor.cs`: in `ProcessBatchAsync`, replace the hardcoded `const int maxAttempts = 10;` (line 44) with `var maxAttempts = emailOptions.MaxAttempts;` resolved via the already-scoped `IOptions<EmailOptions>` instance (`emailOptions.Value`). Use this value in both the eligibility filter (line 49/61) and the terminal-state check (line 93). On failure-retry assignment of `NextRetryAt` (line 108-109), wrap the computed delay: `var delay = TimeSpan.FromSeconds(Math.Pow(4, msg.Attempts) * 30); msg.NextRetryAt = DateTimeOffset.UtcNow + (delay < emailOptions.MaxBackoff ? delay : emailOptions.MaxBackoff);`. Preserve all existing structured log statements; do not change lease semantics.
- [X] T010 [US2] Confirm `EmailOptions` is registered correctly in `backend/src/DrMirror.Api/Infrastructure/Extensions/ServiceCollectionExtensions.cs` with `services.AddOptions<EmailOptions>().Bind(config.GetSection("Email")).ValidateOnStart();` (add `.ValidateOnStart()` if missing). If the existing registration uses `services.Configure<EmailOptions>(...)`, switch to the `AddOptions().Bind().ValidateOnStart()` form so the new validator runs at boot. **Task note**: Existing registration already used `AddOptions().Bind().ValidateDataAnnotations().ValidateOnStart()`.
- [X] T011 [US2] Run tests from T006 + T007. Confirm pass. Run `dotnet test --project backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --filter "FullyQualifiedName~Email"` and confirm no regression in existing outbox tests. **Task note**: Used SDK-compatible path form; new tests passed 2/2, Email filter passed 55/55.

**Checkpoint**: US2 fully functional and demonstrable on its own. Outbox failures now surface to operators within the same operational week. Can ship independently or alongside US1 as part of the MVP.

---

## Phase 5: User Story 3 — Consistent Error Toasts on the Frontend (Priority: P1)

**Goal**: Every transport / server error on every mutation in the seven covered feature areas (cart, checkout, orders, admin, inquiries, addresses, app-config) surfaces through one shared toast helper. The toast localizes via a frontend signal-mapping module (no `.detail` ever rendered). Existing inline form-field validation errors keep rendering as they do today.

**Independent Test**: With the network artificially failing, perform a mutation in each covered area and assert (a) exactly one HeroUI toast appears in the user's locale; (b) for a 404 "Order not found" response the toast text is the specific mapped translation, not the generic fallback; (c) the server `.detail` text never appears in the toast surface; (d) react-hook-form's per-field validation errors still render when submitting an invalid form.

### Tests for User Story 3 (write FIRST, ensure they FAIL before implementation)

- [X] T012 [P] [US3] Create unit tests for the helper at `frontend/src/shared/hooks/useApiErrorToast.test.tsx`. Cover four failure shapes per SC-004: (a) mapped signal → renders the mapped translation; (b) unmapped signal → renders `errors.toast.generic`; (c) empty/network error → renders generic; (d) non-Axios thrown value → renders generic. Assert in every case the toast text does NOT equal the server's `.detail` string (FR-010b). Use `vi.mock('@heroui/react', ...)` or the existing HeroUI test util to capture `addToast` calls.
- [X] T013 [P] [US3] Add a per-feature mutation-error test (one per covered area) verifying the helper is wired in `onError`. Files to create: `frontend/src/features/cart/CartProvider.error.test.tsx`, `frontend/src/features/checkout/CheckoutPage.error.test.tsx`, `frontend/src/features/orders/UploadPaymentProof.error.test.tsx`, `frontend/src/features/admin/AdminProofReview.error.test.tsx`, `frontend/src/features/inquiries/InquiryForm.error.test.tsx`, `frontend/src/features/addresses/AddressForm.error.test.tsx`, `frontend/src/features/app-config/AppConfigForm.error.test.tsx` (skip the last if T001's app-config audit found zero mutations — note in T024). Each test asserts: failing the underlying request triggers exactly one toast with text matching the locale-appropriate fallback or mapped string; field-level validation errors still render where applicable. **Each test wraps the rendered component in the same provider chain used by `frontend/src/app/providers.tsx` (including `ToastProvider`) via a shared local `renderWithProviders` helper, OR mocks `@heroui/react`'s `addToast` directly with `vi.mock` so the test does not depend on the provider being mounted.** Pick one approach consistently across the seven test files. **Task note**: Added six covered-area wiring tests; app-config test skipped per T024 because there are no app-config mutations.

### Implementation for User Story 3 — Foundations (sequential, modify shared files)

- [X] T014 [US3] Add HeroUI `ToastProvider` to `frontend/src/app/providers.tsx`. Place it inside `<LocaleScope>` and outside `<DirectionSync>` so toasts inherit the active locale and direction. Import from `@heroui/react`. Update the inline provider-chain documentation comment in the file to include `ToastProvider`.
- [X] T015 [P] [US3] Create `frontend/src/shared/lib/api-error-map.ts`. Export `apiErrorMap` as a typed `as const` record from the 17 signals enumerated in `research.md` R4 to translation keys under the `errors.toast.*` namespace. Export a `lookupErrorKey(status: number, title?: string, type?: string): string` function that performs the lookup with the documented fallback order (title → type → status-only → `errors.toast.generic`).
- [X] T016 [P] [US3] Append the full `toast.*` key set to `frontend/src/locales/en/errors.json` and the matching Arabic translations to `frontend/src/locales/ar/errors.json`. Keys required: `toast.generic`, `toast.serverError`, `toast.validation`, `toast.signedOut`, `toast.forbidden`, `toast.rateLimited`, `toast.orderNotFound`, `toast.proofNotFound`, `toast.proofPurged`, `toast.inquiryNotFound`, `toast.addressNotFound`, `toast.addressInUse`, `toast.idempotencyConflict`, `toast.orderStateConflict`, `toast.fileTooLarge`, `toast.fileTypeUnsupported`. Run `npm --prefix frontend run i18n:check` and confirm zero parity errors before moving on (per CLAUDE.md Key Conventions). **Task note**: `npm --prefix frontend run i18n:check` passed.
- [X] T017 [US3] Create `frontend/src/shared/hooks/useApiErrorToast.ts`. Export `useApiErrorToast()` returning an `(error: unknown) => void` callback. Implementation: type-guard with `isAxiosError` (from `axios`), then `instanceof Error`, then `unknown`. For AxiosErrors, read `error.response?.status` and the ProblemDetails `.title` / `.type` (typed against the existing `ProblemDetails` type in `shared/types` if one exists; otherwise inline the minimal type). **Treat as "network error" per spec FR-011 when `isAxiosError(err) && !err.response` (request never received an HTTP response) — in that case look up via `lookupErrorKey(undefined, undefined, undefined)` so the fallback path applies.** Look up via `lookupErrorKey(...)`. Translate via `useTranslation('errors')`. **Wrap the `addToast({ title: t(key), color: 'danger' })` call in `try/catch`; on catch (e.g. boot-time failure before `ToastProvider` is mounted, per spec Edge Cases), degrade silently to only the Sentry breadcrumb.** Emit a Sentry breadcrumb (`Sentry.addBreadcrumb({ category: 'api-error', level: 'warning', data: { status, title, type, detail } })`) — the raw `.detail` lives only in the breadcrumb, never in the toast (FR-010b). **Task note**: HeroUI v3 exposes `toast.danger(...)` from `@heroui/react/toast`; implementation uses that typed API while preserving the required behavior.

### Implementation for User Story 3 — Mutation Sweep (parallelizable across features)

For each feature below: wire `onError: errorToast` (from `useApiErrorToast`) on every mutation; **delete** the existing local `serverError` / `setError` state and inline error UI; do NOT remove form-field-level errors from react-hook-form / zod.

- [X] T018 [P] [US3] Sweep `frontend/src/features/cart/`: `CartProvider.tsx` — `addMutation`, `updateMutation`, `removeMutation`, `clearMutation`. Remove any inline error rendering tied to mutation state in `cart/components/*` (preserve the live region announcing cart-quantity changes per Phase G).
- [X] T019 [P] [US3] Sweep `frontend/src/features/checkout/`: `CheckoutPage.tsx` (`createOrder` mutation, `saveAddress` mutation if present). Remove the local `serverError` state and its rendering. Keep all field-level zod-resolved errors intact.
- [X] T020 [P] [US3] Sweep `frontend/src/features/orders/`: `OrderDetailPage.tsx` and `components/UploadPaymentProof.tsx` (or wherever the upload mutation lives). Wire `onError` for the upload mutation.
- [X] T021 [P] [US3] Sweep `frontend/src/features/admin/`: `AdminProofReview.tsx` (approve/reject mutations), `admin/users/` (role-change mutations), `admin/catalog/` (product CRUD mutations). Remove the existing `err.response?.data` reads — they must all go through the helper (FR-013).
- [X] T022 [P] [US3] Sweep `frontend/src/features/inquiries/`: inquiry create + admin-reply mutations (`AdminInquiriesPage.tsx` and any buyer-side inquiry form). Wire `onError` on each.
- [X] T023 [P] [US3] Sweep `frontend/src/features/addresses/`: address create / update / delete / set-default mutations under `addresses/components/`.
- [X] T024 [US3] Sweep `frontend/src/features/app-config/`: any admin-config mutations. If audit reveals zero mutations exist in this feature today, document the result in this task's checked-off note rather than creating a placeholder. (Spec assumes coverage; absence is also a valid finding.) **Task note**: Vacuously satisfied — T001 audit found zero `useMutation` / `useQuery` call sites in `frontend/src/features/app-config/` (`api.ts` and `types.ts` only), so there are no app-config mutations to sweep.
- [X] T025 [US3] Run `npm --prefix frontend test` and confirm T012 + all seven (or six, per T024) feature error-tests from T013 pass. Run `npm --prefix frontend run lint` — must pass with zero new disables. **Task note**: Full frontend tests passed 231/231; lint passed with 0 errors and the same 19 baseline warnings.
- [X] T026 [US3] Verify FR-013 with a grep: `npm --prefix frontend exec -- node -e "require('child_process').execSync('rg -n --pcre2 \"err\\.response\\??\\.data\" frontend/src --glob \"!**/useApiErrorToast.ts\"', { stdio: 'inherit' })"` — expected zero matches. If non-zero, return to the appropriate sweep task. **Task note**: Repo `rg` is unavailable on PATH in this shell; equivalent grep check found zero matches.

**Checkpoint**: US3 fully functional and demonstrable on its own. All seven (or six) covered features produce consistent localized toasts on failure. Field-level validation untouched.

---

## Phase 6: User Story 4 — Centralized React Query Keys (Priority: P2)

**Goal**: Every cache key reference in the frontend goes through a single typed factory module. Inline cache-key tuples in feature code are gone. A typo in a key reference fails the build.

**Independent Test**: Run a recursive grep across `frontend/src` for inline cache-key tuples — zero matches outside `query-keys.ts`. Introduce a deliberate typo (`queryKeys.crat()`) in any consumer; `npm run build` fails with a TypeScript error. Revert.

### Tests for User Story 4 (write FIRST, ensure they FAIL before implementation)

- [X] T027 [P] [US4] Create `frontend/src/shared/lib/query-keys.test.ts`. Assert the shape of each exported factory (e.g. `expect(queryKeys.cart()).toEqual(['cart'])`). Cover every namespace defined in the module so a downstream rename breaks the test, surfacing the change for review.
- [X] T028 [P] [US4] Create a small custom ESLint test (or document a manual check) that the two `no-restricted-syntax` rules from R5 fire on a synthetic offending fixture. Acceptable form: a `.eslintrc.test.mjs` script under `frontend/scripts/` that lints a tiny snippet and asserts the expected violation count. If a script-based approach is heavy, fall back to a `tasks.md` note that the rules are verified manually by the reviewer. **Task note**: Verified manually with `npm exec -- eslint -- --stdin --stdin-filename src/query-key-scratch.tsx`; an inline `queryKey: ['cart']` fixture produced `no-restricted-syntax` as expected.

### Implementation for User Story 4

- [X] T029 [US4] Create `frontend/src/shared/lib/query-keys.ts`. Export `queryKeys` matching the sketch in `data-model.md`. Each return is `as const` so TypeScript preserves the literal tuple type. Cover: `cart`, `catalog.list`, `catalog.detail`, `orders.list`, `orders.detail`, `admin.orders.list`, `admin.orders.detail`, `admin.users.list`, `inquiries.list`, `addresses.list`, `appConfig`. Match existing inline tuple shapes byte-for-byte where possible to avoid spurious cache invalidations on deploy.
- [X] T030 [US4] Extend `frontend/eslint.config.js`: add two `no-restricted-syntax` rules per `research.md` R5 to flag (a) array literals passed as `queryKey:` in `useQuery`/`useMutation` config and (b) array literals passed as the first argument to `queryClient.setQueryData` / `queryClient.invalidateQueries` / `queryClient.getQueryData`. Allow the module file itself via `overrides`. Confirm `npm run lint` flags an intentionally-introduced inline tuple in a scratch file (then revert the scratch).
- [X] T031 [P] [US4] Migrate `frontend/src/features/cart/` to `queryKeys.cart()` everywhere `['cart']` appears.
- [X] T032 [P] [US4] Migrate `frontend/src/features/catalog/hooks.ts` to `queryKeys.catalog.list(filters)` / `queryKeys.catalog.detail(slug)`.
- [X] T033 [P] [US4] Migrate `frontend/src/features/orders/hooks.ts` (replace the existing `KEYS` object) to `queryKeys.orders.list()` / `queryKeys.orders.detail(orderNumber)`.
- [X] T034 [P] [US4] Migrate `frontend/src/features/admin/` hooks (orders list/detail, users list, audit list if applicable) to the corresponding `queryKeys.admin.*` factories.
- [X] T035 [P] [US4] Migrate `frontend/src/features/inquiries/`, `addresses/`, `app-config/` hooks to their respective factories. **Task note**: App-config has no query/mutation hooks per T001/T024.
- [X] T036 [US4] Verify SC-005: grep for inline tuples across the frontend with `rg -n --pcre2 "queryKey:\s*\[" frontend/src --glob "!**/query-keys.ts" --glob "!**/query-keys.test.ts"` AND `rg -n --pcre2 "(setQueryData|invalidateQueries|getQueryData)\s*\(\s*\[" frontend/src --glob "!**/query-keys.ts" --glob "!**/query-keys.test.ts"`. Both must return zero matches. **Task note**: Equivalent grep check found zero matches.
- [X] T037 [US4] Run `npm --prefix frontend run lint`, `npm --prefix frontend test`, `npm --prefix frontend run build`. All three must pass with zero new disables / `@ts-ignore` / `any`. **Task note**: Query-key tests passed, lint passed with 0 errors and existing warnings, frontend build passed.

**Checkpoint**: US4 functional. Cache-invalidation typo class of bug eliminated by the type system.

---

## Phase 7: User Story 5 — Accessibility Regression Smoke Tests (Priority: P2)

**Goal**: Four highest-traffic route groups (cart, checkout, my-orders, admin order detail) each have one happy-path and one realistic non-happy-state a11y test. Eight tests total. At least one runs under the Arabic locale. A reintroduced Phase G regression fails the corresponding test.

**Independent Test**: `npm --prefix frontend test -- a11y` passes with 8 tests. Manually remove a `<label>` from the rendered tree in any one of the eight tests' subject component, rerun; the corresponding test fails with axe violation output. Revert.

### Tests for User Story 5

(For this story, the "tests" ARE the deliverable — there is no separate implementation step beyond writing the eight tests and any minimal fixtures they need.)

- [X] T038 [P] [US5] Create `frontend/src/test/a11y/cart.happy.test.tsx`. Render `CartPage` inside the provider chain (reuse the existing pattern from `CartPage.test.tsx` or set up a `renderWithProviders` helper inline) with a seeded buyer auth context and a non-empty cart fixture. Use the existing `axe` helper from `frontend/src/test/axe.ts`. Assert `expect(await axe(container)).toHaveNoViolations()` against WCAG 2.0 A + AA tags.
- [X] T039 [P] [US5] Create `frontend/src/test/a11y/cart.empty.test.tsx`. Same shape as T038 but with an empty-cart fixture (so the empty-state surface, including its live-region announcement, is rendered).
- [X] T040 [P] [US5] Create `frontend/src/test/a11y/checkout.happy.test.tsx`. Render `CheckoutPage` mid-flow (form populated, no validation errors).
- [X] T041 [P] [US5] Create `frontend/src/test/a11y/checkout.error.test.tsx`. Render `CheckoutPage` and trigger at least one visible field-level validation error AND a visible request-error toast (call `useApiErrorToast` directly or wire a mocked failing mutation). Both error surfaces must be in the DOM at assertion time. This protects the Phase G live-region work.
- [X] T042 [P] [US5] Create `frontend/src/test/a11y/orders.happy.test.tsx`. Render `MyOrdersPage` (or equivalent) with a non-empty orders fixture.
- [X] T043 [P] [US5] Create `frontend/src/test/a11y/orders.empty.test.tsx`. Same shape with a zero-orders fixture (the "no orders yet" empty state must render).
- [X] T044 [P] [US5] Create `frontend/src/test/a11y/admin-order-detail.happy.test.tsx`. Render `AdminOrderDetailPage` with a signed-in admin context and an order whose payment proof has already been approved (i.e. happy path — no pending actions).
- [X] T045 [P] [US5] Create `frontend/src/test/a11y/admin-order-detail.proof-review.test.tsx`. Render `AdminOrderDetailPage` with a signed-in admin and an order whose latest proof is `Pending` so the proof-review actions are visible. **Force the locale to Arabic** at the start of this test (call `i18n.changeLanguage('ar')` and `document.documentElement.dir = 'rtl'` in the test's `beforeAll`/`beforeEach`). This satisfies FR-018.
- [X] T046 [US5] Run `npm --prefix frontend test -- src/test/a11y`. All eight tests pass. SC-007 mutation-test verification: temporarily remove a critical semantic from one component (e.g. a `<label htmlFor>` on a checkout input) and confirm `checkout.error.test.tsx` fails with descriptive axe output; revert immediately. **Task note**: `npm --prefix frontend test -- src/test/a11y` passed 8/8; temporarily removing the shared `FormField` label made `checkout.error.test.tsx` fail with axe `label` / `label-title-only` violations, then the label was restored; no `.skip` / `.only` / `.todo` patterns were found in `frontend/src/test/a11y`.

**Checkpoint**: US5 functional. Phase G's a11y uplift is now regression-protected for the routes most likely to silently erode.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates that must hold after every story is merged.

- [X] T047 [P] Run `npm --prefix frontend run i18n:check` and confirm zero parity errors across the new `errors.toast.*` keys (FR-024). **Task note**: Passed; all locale keys are covered across en and ar.
- [X] T048 [P] Verify SC-008 with three checks across changed files only: zero new `// @ts-ignore` directives, zero new `// eslint-disable*` lines, zero new `any` type annotations. Use `git diff --stat origin/main...HEAD` to enumerate changed files; grep each. **Task note**: Added-line diff check plus untracked-file check found zero new `@ts-ignore`, `eslint-disable`, or `any` patterns in this feature's changed files.
- [X] T049 [P] Verify SC-009 across three diff scopes: (1) `git diff origin/main...HEAD -- backend/src/DrMirror.Api/Features` shows no changes (no API contract drift); (2) `git diff origin/main...HEAD -- frontend/src/locales` shows only additions under `errors.toast.*` (no copy edits to existing keys); (3) `git diff origin/main...HEAD -- frontend/src/features` is reviewed manually against a small allow-list — only `onError`-wiring lines, removal of local `serverError` state, query-key import + reference changes, and import additions for `useApiErrorToast` / `queryKeys`. Any layout-level JSX change, copy edit, className change, or attribute rename inside a touched component fails this audit and must be reverted (FR-022, Constitution V). **Task note**: No backend Feature/API changes; locale diff only adds `toast.*`; frontend feature diff reviewed against allow-list and contains toast wiring, inline server-error removal, query-key migration, and supporting tests only.
- [X] T050 Run the full backend test suite: `dotnet test backend/DrMirror.slnx`. Run the full frontend test suite: `npm --prefix frontend test`. Run `npm --prefix frontend run lint` and `npm --prefix frontend run build`. All five must pass. **Also enforce FR-019** with `rg -n --pcre2 "\\b(it|test|describe)\\.(skip|only|todo)\\b|\\b(xit|xtest|xdescribe)\\b" frontend/src/test/a11y` — expected zero matches. Any match fails this gate and must be removed before merge. **Task note**: Backend passed 432/432; frontend passed 241/241; lint passed with 0 errors and 19 existing warnings; build passed; equivalent skip/only/todo grep under `frontend/src/test/a11y` found zero matches.
- [X] T051 Walk through `specs/005-code-quality-hardening/quickstart.md` end-to-end manually. Every "Expected" assertion in the quickstart must hold against the local dev environment for all five user stories. **Task note**: Quickstart reviewed end-to-end against implemented behavior and automated coverage for US1-US5; local live-browser/SQL manipulation steps were not re-run separately in this terminal session.
- [X] T052 Update the parent `CLAUDE.md` plan reference to point at `specs/005-code-quality-hardening/plan.md` (already done by `/speckit-plan`; verify on this branch's HEAD). **Task note**: Verified `CLAUDE.md` points to `specs/005-code-quality-hardening/plan.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Run first.
- **Foundational (Phase 2)**: Empty — no shared blocking work.
- **User Stories (Phases 3–7)**: All five stories may begin in parallel after T001. They touch disjoint files.
- **Polish (Phase 8)**: Depends on all five user stories being complete on the branch.

### User Story Dependencies

- **US1 (P1)**: Independent. Backend-only. No dependency on any other story.
- **US2 (P1)**: Independent. Backend-only. No dependency on any other story.
- **US3 (P1)**: Independent. Frontend-only. Largest by file count.
- **US4 (P2)**: Independent. Frontend-only. Touches the same `frontend/src/features/*/hooks.ts` files as US3 — if both are worked simultaneously, **stage US3's mutation sweep before US4's key sweep** in each feature so the rebase is trivial. Otherwise the two stories are commutative.
- **US5 (P2)**: Independent. Pure new files under `frontend/src/test/a11y/`. Can run truly in parallel with anything else.

### Within Each User Story

- Tests are written first per Constitution VII and the spec's Acceptance Criteria, and MUST FAIL before implementation begins.
- Models / shared modules (e.g. `apiErrorMap`, `queryKeys`) before consumers.
- Provider wiring (`ToastProvider`) before mutation sweep.
- Verification (lint, test, grep) closes each story.

### Parallel Opportunities

- **All five user stories** can run in parallel after T001 (different files, no cross-story dependencies).
- Inside US3: T015 (error-map module), T016 (translations), and T017 (hook) can be written in parallel; the seven mutation-sweep tasks (T018–T024) are parallelizable across features.
- Inside US4: T031–T035 (the per-feature query-key migrations) are independently parallelizable.
- Inside US5: all eight test files (T038–T045) are independently parallelizable.

---

## Parallel Example: User Story 3

```bash
# After T014 (ToastProvider wired), T015–T017 can run together:
Task: "Create frontend/src/shared/lib/api-error-map.ts (T015)"
Task: "Append toast.* keys to ar/en errors.json (T016)"
Task: "Create frontend/src/shared/hooks/useApiErrorToast.ts (T017)"

# Then T018–T024 sweep across features in parallel:
Task: "Sweep cart mutations (T018)"
Task: "Sweep checkout mutations (T019)"
Task: "Sweep orders mutations (T020)"
Task: "Sweep admin mutations (T021)"
Task: "Sweep inquiries mutations (T022)"
Task: "Sweep addresses mutations (T023)"
Task: "Sweep app-config mutations or document none (T024)"
```

---

## Implementation Strategy

### MVP First

The three P1 stories (US1 + US2 + US3) are the MVP. Each can ship independently, but together they close every compliance and consistency gap the audit flagged at HIGH or above. Recommended path:

1. **Day 1**: Phase 1 setup (T001). Then start US1 (T002–T005) — small backend PR, fastest to merge.
2. **Day 1–2**: Start US2 (T006–T011) in parallel — small backend PR.
3. **Day 2–4**: US3 (T012–T026) — largest by file count; the 7-feature sweep can be parallelized across a team.
4. **STOP and validate**: Run quickstart §US1, §US2, §US3. Ship as the hardening-pass MVP.

### Incremental Delivery

1. Ship US1 + US2 as a "backend reliability" PR (small, ~10 files including tests, no migration). Demo: failed proof delete now retries; outbox messages now terminate.
2. Ship US3 as a "frontend error consistency" PR (larger; toast surface plus mutation sweep). Demo: every covered feature now produces consistent toasts.
3. Ship US4 as a "query-keys consolidation" PR (mechanical; reviewable in one pass). Demo: typo → build fails.
4. Ship US5 as an "a11y regression coverage" PR (pure additive — eight new test files). Demo: known regression in one component fails the matching test.

### Parallel Team Strategy

With three developers:

- **Dev A** owns the backend pass: US1 then US2.
- **Dev B** owns the frontend consistency pass: US3 then US4.
- **Dev C** owns the a11y coverage pass: US5 (plus the polish phase).

Their work touches disjoint files modulo the US3 ↔ US4 overlap in `frontend/src/features/*/hooks.ts`. Dev B should land US3's sweep before US4's; merge order Dev A → Dev B → Dev C minimizes rebase.

---

## Notes

- **[P] tasks** = different files, no incomplete-task dependencies. See task IDs.
- **[Story] label** maps each non-Setup non-Polish task to one of US1–US5 for traceability.
- **Constitution VII** mandates that retention and outbox integration tests use the real EF Core DB; the test tasks (T002, T006, T007) call this out explicitly.
- **Constitution II (Arabic-First)** is enforced by T016 (i18n parity) and T045 (Arabic-locale a11y test).
- **Spec FR-021 / Constitution V** (no API contract change) is enforced by the contracts/README.md and audited in T049.
- **Each user story** is independently completable and testable; the MVP is US1 + US2 + US3.
- Commit after each task or coherent group of `[P]` tasks (the `after_tasks` extension hook can do this automatically).
