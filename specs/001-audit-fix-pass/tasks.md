# Tasks: Audit Fix Pass

**Input**: Design documents from `specs/001-audit-fix-pass/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested. Existing test suites must continue to pass (verification tasks included).

**Organization**: Tasks grouped by user story. F-006 (skip-link) is already resolved — no tasks generated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No setup needed — existing project, all dependencies already installed except `eslint-plugin-jsx-a11y`.

*(No tasks — proceed to Phase 2)*

---

## Phase 2: Foundational

**Purpose**: No foundational work needed — all infrastructure exists. Fixes are isolated to specific files.

*(No tasks — proceed to user stories)*

---

## Phase 3: User Story 1 — Backend Middleware & Services Corrections (Priority: P1) 🎯 MVP

**Goal**: Fix cache-control dead code, outbox retention gap, inaccurate purge logging, and stream disposal leak.

**Independent Test**: `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj` passes. Manual `curl -I` on catalog endpoint shows correct `Cache-Control` header.

### Implementation for User Story 1

- [X] T001 [P] [US1] Fix cache-control middleware to use `Response.OnStarting` in `backend/src/DrMirror.Api/Program.cs` — replace the inline middleware at lines 312–336 so headers are set **before** `await next()` via a `Response.OnStarting` callback. Keep the same path-matching logic: `public, max-age=60, stale-while-revalidate=300` + `Vary: Accept-Language` for `/api/catalog` GET requests; `private, no-store` for orders/cart/addresses/auth/admin/health GET requests. Non-GET requests get no cache headers.

- [X] T002 [P] [US1] Extend outbox retention purge to include `Failed` rows in `backend/src/DrMirror.Api/BackgroundServices/EmailOutboxRetentionService.cs` — change the LINQ query at line 48–49 from filtering only `Status == Sent && DeliveredAt < cutoff` to also include `Status == Failed && (LastAttemptAt == null || LastAttemptAt < cutoff)`. Update the log message to reflect both Sent and Failed rows being purged.

- [X] T003 [P] [US1] Fix purge count logging in `backend/src/DrMirror.Api/BackgroundServices/PaymentProofRetentionPurgeService.cs` — add an `int purgedCount = 0` counter before the foreach loop (line 59). Increment it inside the `try` block after successful delete (after line 66). In the final catch block where `continue` is called (line 81), do NOT increment. Change the log at line 88 from `proofs.Count` to `purgedCount`. Adjust the log message template accordingly (e.g., "Purged {PurgedCount} of {TotalCount} old payment-proof files.").

- [X] T004 [P] [US1] Add `using` declaration to stream in `backend/src/DrMirror.Api/Features/Orders/UploadPaymentProof/UploadPaymentProofEndpoint.cs` — change line 99 from `var fileStream = file.OpenReadStream();` to `using var fileStream = file.OpenReadStream();`. Remove the now-redundant `await fileStream.DisposeAsync();` call on line 107 (the `using` handles all disposal paths). The `PrefixedStream` on line 114 wraps the stream — `using` on the outer variable is harmless since `PrefixedStream` disposes the inner stream, and double-dispose is safe on streams.

- [X] T005 [US1] Verify backend tests pass — run `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj` and confirm all tests pass with zero failures.

**Checkpoint**: All 4 backend findings (F-001, F-002, F-003, F-004) are resolved. Backend builds and tests pass.

---

## Phase 4: User Story 2 — Admin Forms Convention Compliance (Priority: P1)

**Goal**: Refactor 5 admin forms from raw `useState` to react-hook-form + Zod. Add `isRequired` on all mandatory HeroUI fields.

**Independent Test**: `npm --prefix frontend test` and `npm --prefix frontend run build` pass. Submitting each form with empty required fields shows inline Zod error messages.

### Implementation for User Story 2

- [X] T006 [P] [US2] Refactor `AddressForm` to use react-hook-form + Zod in `frontend/src/features/addresses/components/AddressForm.tsx` — create a `z.object` schema for all address fields (label, recipientName, phone with Egyptian regex, governorate, city, streetAddress as required; floor, apartment, landmark, notes as optional; setDefault as boolean). Replace all `useState` calls (lines 36–48) with `useForm({ resolver: zodResolver(schema), defaultValues })`. Replace manual `onChange` handlers with `register()` or `Controller`. Use HeroUI `isRequired` on required fields, `isInvalid={!!errors.fieldName}`, and `errorMessage={errors.fieldName?.message}`. Replace the manual submit handler with `handleSubmit()`. Remove manual `governorateError` state — let Zod handle it.

- [X] T007 [P] [US2] Refactor `CreateCategoryForm` to use react-hook-form + Zod in `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx` — create a Zod schema for `nameAr` (required, max 120), `nameEn` (required, max 120), `displayOrder` (number). Replace `useState` calls on lines 232–234 with `useForm`. Add `isRequired` to the nameAr and nameEn `TextField`/`Input` elements. Use `reset()` on successful submit instead of manual `setState('')` calls.

- [X] T008 [P] [US2] Refactor `EditCategoryRow` to use react-hook-form + Zod in `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx` — use the same schema as `CreateCategoryForm`. Replace `useState` calls on lines 297–299 with `useForm({ defaultValues: { nameAr: category.nameAr, nameEn: category.nameEn, displayOrder: category.displayOrder } })`. Add `isRequired` on mandatory fields.

- [X] T009 [P] [US2] Refactor `ProductMasterForm` to use react-hook-form + Zod in `frontend/src/features/admin/catalog/components/ProductMasterForm.tsx` — create a Zod schema for all product fields (nameAr, nameEn required max 120; descriptionAr, descriptionEn optional max 2000; price positive number; gender enum; material, brand, sku optional; categoryId required UUID). Replace all `useState` calls on lines 28–38 with `useForm({ defaultValues })`. Keep `savedAt` state for the save-confirmation animation (it is UI state, not form state). Add `isRequired` on required fields. Use `handleSubmit()` for the form submission.

- [X] T010 [P] [US2] Refactor variant form in `ProductVariantsSection` to use react-hook-form + Zod in `frontend/src/features/admin/catalog/components/ProductVariantsSection.tsx` — create a Zod schema for variant fields (size required max 20, colorName required max 50, colorNameAr required max 50, colorHex required hex regex, sku optional max 50, stock non-negative integer). Replace `useState` calls on lines 152–157 with `useForm({ defaultValues })`. Add `isRequired` on size, colorName, colorNameAr, colorHex fields.

- [X] T011 [P] [US2] Refactor `PaymentMethodForm` to use react-hook-form + Zod in `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` — create two Zod schemas: `createSchema` (with code, kind, nameAr, nameEn, instructionsAr, instructionsEn, accountNumber, accountHolder, displayOrder) and `editSchema` (without code and kind). Replace all `useState` calls on lines 61–71 with `useForm({ resolver: zodResolver(isCreate ? createSchema : editSchema), defaultValues })`. Add `isRequired` on code (create mode), nameAr, nameEn fields. Use `reset()` on successful create.

- [X] T012 [US2] Verify frontend tests and build — run `npm --prefix frontend test` and `npm --prefix frontend run build` and confirm zero failures. Run `npm --prefix frontend run i18n:check` to confirm i18n parity maintained.

**Checkpoint**: All 5 admin forms use react-hook-form + Zod (F-005 resolved). All mandatory fields have `isRequired` / `aria-required` (F-007 resolved). Frontend builds and tests pass.

---

## Phase 5: User Story 3 — Skip-Link Accessibility (Priority: P2) ✅ ALREADY RESOLVED

**Goal**: Both `Layout.tsx` and `AdminLayout.tsx` already have visually-hidden skip-links.

**Evidence**:
- `frontend/src/shared/components/Layout.tsx` lines 19–24: skip-link targeting `#main-content`
- `frontend/src/features/admin/components/AdminLayout.tsx` lines 16–21: skip-link targeting `#admin-main`
- i18n key `common.a11y.skipToContent` already present

*(No tasks — F-006 resolved before this spec)*

---

## Phase 6: User Story 4 — CI & Lint Hardening (Priority: P3)

**Goal**: Make the CI lint step fail explicitly if the lint script is missing. Add `eslint-plugin-jsx-a11y` for static accessibility linting.

**Independent Test**: `npm --prefix frontend run lint` passes with `jsx-a11y` rules active. Introducing `<img>` without `alt` triggers a lint violation.

### Implementation for User Story 4

- [X] T013 [P] [US4] Harden CI lint step in `.github/workflows/ci.yml` — replace lines 118–124 (the conditional `if npm pkg get scripts.lint` guard) with a direct invocation: `run: npm run lint --prefix frontend`. This ensures a missing lint script causes the step to fail with a non-zero exit code.

- [X] T014 [P] [US4] Install `eslint-plugin-jsx-a11y` and integrate into ESLint config — run `npm --prefix frontend install -D eslint-plugin-jsx-a11y`. Then update `frontend/eslint.config.js`: import `jsxA11y` from `eslint-plugin-jsx-a11y`, add `jsxA11y.flatConfigs.recommended` to the `extends` array in the `**/*.{ts,tsx}` config block (or spread its rules as appropriate for the flat config format).

- [X] T015 [US4] Fix any `jsx-a11y` lint violations — run `npm --prefix frontend run lint` after installing the plugin. If any existing code triggers violations, fix them. Common issues: missing `alt` on images, missing `htmlFor`/`aria-label` on form controls, interactive elements without keyboard handlers. Selectively disable rules that false-positive on HeroUI component wrappers with documented comments.

- [X] T016 [US4] Verify lint and build — run `npm --prefix frontend run lint` (zero errors), `npm --prefix frontend run build` (zero errors), and `npm --prefix frontend test` (all pass).

**Checkpoint**: CI lint step is hardened (F-008 resolved). Static a11y linting is active (F-009 resolved).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-project verification and audit report update

- [X] T017 Run full verification suite — execute all commands from quickstart.md:
  ```
  dotnet build backend/src/DrMirror.Api/DrMirror.Api.csproj
  dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj
  npm --prefix frontend run build
  npm --prefix frontend test
  npm --prefix frontend run i18n:check
  npm --prefix frontend run lint
  ```
  All must pass with zero errors.

- [X] T018 Update `audit-report.md` finding triages — change Triage from "Open" to "Resolved" on all 9 findings (F-001 through F-009). Add a note on F-006 that it was already resolved before this spec.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — existing project
- **Foundational (Phase 2)**: Skipped — infrastructure exists
- **User Story 1 (Phase 3)**: Can start immediately — backend-only fixes
- **User Story 2 (Phase 4)**: Can start immediately — frontend-only fixes, independent of US1
- **User Story 3 (Phase 5)**: Already resolved — no work
- **User Story 4 (Phase 6)**: Can start immediately — cross-cutting, independent of US1/US2
- **Polish (Phase 7)**: Depends on all of US1, US2, US4 being complete

### User Story Dependencies

- **US1 (Backend)**: No dependencies — all 4 backend fixes are in different files, parallelizable
- **US2 (Admin Forms)**: No dependencies on US1 — all 5 form refactors are in different files, parallelizable
- **US4 (CI & Lint)**: T015 depends on T014. T013 is independent. Otherwise no cross-story deps.

### Within Each User Story

- **US1**: T001–T004 are fully parallel (different files). T005 depends on T001–T004.
- **US2**: T006–T011 are fully parallel (different files). T012 depends on T006–T011.
- **US4**: T013 and T014 are parallel. T015 depends on T014. T016 depends on T013–T015.

### Parallel Opportunities

```text
┌─────────────────────────┐  ┌──────────────────────────┐  ┌───────────────────┐
│  US1: Backend (Phase 3) │  │  US2: Forms (Phase 4)    │  │ US4: CI (Phase 6) │
│                         │  │                          │  │                   │
│  T001 ─┐               │  │  T006 ─┐                 │  │  T013 ─┐          │
│  T002 ─┤               │  │  T007 ─┤                 │  │  T014 ─┤          │
│  T003 ─┤→ T005         │  │  T008 ─┤                 │  │        ↓          │
│  T004 ─┘               │  │  T009 ─┤→ T012           │  │  T015             │
│                         │  │  T010 ─┤                 │  │        ↓          │
│                         │  │  T011 ─┘                 │  │  T016             │
└─────────┬───────────────┘  └──────────┬───────────────┘  └────────┬──────────┘
          │                             │                           │
          └─────────────────┬───────────┘───────────────────────────┘
                            ↓
                    T017 (full verification)
                            ↓
                    T018 (audit report update)
```

All three user stories can run in parallel from the start.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001–T004 (all parallel, backend fixes)
2. Run T005 (verify backend)
3. **STOP and VALIDATE**: All backend correctness issues fixed

### Incremental Delivery

1. US1 (backend) → verify → 4 findings resolved
2. US2 (forms) → verify → 2 more findings resolved
3. US4 (CI/lint) → verify → 2 more findings resolved
4. Polish → full verification → all 8 active findings resolved (+ F-006 pre-resolved)

### Parallel Strategy

With concurrent capacity, launch US1 + US2 + US4 simultaneously:
- US1: 4 parallel backend edits → verify
- US2: 6 parallel form refactors → verify
- US4: 2 parallel changes → fix violations → verify
- All converge at T017 for final verification

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- F-006 (skip-link) is already resolved — no tasks generated
- Total active findings: 8 (F-001 through F-005, F-007, F-008, F-009)
- All form refactors preserve existing behavior — same fields, same onSubmit signatures
- No new i18n keys needed (validation error messages come from Zod, not i18n)
- Commit after each task or logical group
