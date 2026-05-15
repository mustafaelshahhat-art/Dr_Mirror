# Tasks: Production-Ready E-Commerce Platform

**Input**: Design documents from `specs/002-production-ecommerce-complete/`

**Branch**: `002-production-ecommerce-complete`

**Tech stack**: .NET 10 / ASP.NET Core Minimal APIs · React 19 · HeroUI v3 · Tailwind v4 · xUnit · i18next

**Project type**: Web application — `backend/` + `frontend/`

**Total tasks**: 69 | **Parallelizable**: 31 | **Phases**: 12

> **Note**: This project is at ~M3-complete. Most core flows exist. Tasks focus on bug-fix, RTL audit, UX polish, and gap closure — not greenfield implementation.

---

## Phase 1: Foundational Bug Fixes (Blocks All Test Gates)

**Purpose**: Fix the 2 pre-existing test failures before any other work begins. These block the binary acceptance check.

- [ ] T001 Diagnose `PaymentProofTests.Reject_transitions_PendingPaymentReview_back_to_Pending` — read `backend/tests/DrMirror.Tests/Orders/PaymentProofTests.cs` and `backend/src/DrMirror.Api/Features/Admin/Orders/ReviewPaymentProof/RejectPaymentProofEndpoint.cs` to confirm `ReviewNote` is not set before `SaveChangesAsync`
- [ ] T002 Fix `ReviewNote` persistence: ensure `proof.ReviewNote = request.ReviewNote` is called and saved in `backend/src/DrMirror.Api/Features/Admin/Orders/ReviewPaymentProof/RejectPaymentProofEndpoint.cs`
- [ ] T003 Diagnose `InquiryValidatorTests.Rejects_invalid_email` — read `backend/tests/DrMirror.Tests/Inquiries/InquiryValidatorTests.cs` and the inquiry validator file to confirm FluentValidation mode
- [ ] T004 Fix email validation mode in the Inquiry validator: switch `.EmailAddress()` to `EmailValidationMode.AspNetCoreCompatible` (or add `.Must(e => e.Contains('.'))` after the last `@`) in `backend/src/DrMirror.Api/Features/Inquiries/` validator file
- [ ] T005 Run full backend test suite and confirm all 212 tests pass: `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj`
- [ ] T005a [P] Implement concurrent checkout stock protection — add `RowVersion` / `xmin` optimistic concurrency token to `ProductVariant` in `backend/src/DrMirror.Api/Domain/Entities/ProductVariant.cs` and configure in EF `IEntityTypeConfiguration`; wrap the checkout `SaveChangesAsync` in `ExecutionStrategy.ExecuteAsync` with `DbUpdateConcurrencyException` retry-as-stock-unavailable in `backend/src/DrMirror.Api/Features/Checkout/`; add EF Core migration `AddVariantRowVersion`
- [ ] T005b Write at least one concurrent checkout integration test verifying that two simultaneous checkout attempts against the same single-unit variant result in exactly one success and one `409`/stock-unavailable error — add to `backend/tests/DrMirror.Tests/Checkout/ConcurrentCheckoutTests.cs`
- [ ] T005c [P] Add Coravel email job retry configuration in `backend/src/DrMirror.Api/Infrastructure/Email/Jobs/` — wrap each `IInvocable.Invoke` in try/catch: log attempt failures at `WARN` with recipient, job type, and exception; log final exhaustion at `ERROR` with order/correlation ID; implement exponential backoff (delays: 5 s → 30 s → 2 min between attempts)
- [ ] T005d [P] Verify `backend/src/DrMirror.Api/Infrastructure/Storage/CloudinaryFileStorageService.cs` fails fast with a descriptive `InvalidOperationException` (or startup validation) when `Cloudinary:CloudName`, `Cloudinary:ApiKey`, or `Cloudinary:ApiSecret` are absent and `FileStorage:Provider=cloudinary` is configured

**Checkpoint**: `dotnet test` exits 0 with all tests passed (including new `ConcurrentCheckoutTests`). Email retry logic verified in dev logs. Cloudinary startup validation confirmed.

---

## Phase 2: User Story 1 — Admin Role Routing (P1) ✅ Verify & Harden

**Goal**: Confirm admin routing, separation, and security tests are solid end-to-end.

**Independent Test**: Sign in as admin → lands on `/admin`. Sign in as buyer → lands on `/`. Non-admin hits `/admin` → ForbiddenBanner or redirect. `AdminRoleRoutingTests` passes.

- [ ] T006 [US1] Verify `AdminRoleRoutingTests` still passes after Phase 1 fixes: `dotnet test --filter "FullyQualifiedName~AdminRoleRoutingTests"` in `backend/tests/DrMirror.Tests/`
- [ ] T007 [P] [US1] Audit `frontend/src/features/auth/ProtectedRoute.tsx` — verify `AdminRoute`, `CustomerRoute`, `ProtectedRoute`, `PublicOnlyRoute` all handle `isBootstrapping` spinner correctly (no flash of unauthorized content)
- [ ] T008 [P] [US1] Audit `frontend/src/features/auth/postAuthDestination.ts` — confirm admin always resolves to `/admin`, buyer resolves to `from` or `/`, and no admin URL bleeds into buyer redirect
- [ ] T009 [US1] Audit `frontend/src/shared/components/ForbiddenBanner.tsx` — verify it renders correctly in all 4 states `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)` with no `left`/`right` CSS
- [ ] T010 [US1] Verify `frontend/src/shared/components/Header.tsx` `isAdmin` guard (`if (isAdmin) return null`) is present and prevents storefront header render for admin users

**Checkpoint**: Admin routing separation is verified. All security tests green.

---

## Phase 3: User Story 9 — RTL/LTR Parity Audit (P1) 🔑 Cross-Cutting

**Goal**: Eliminate all directional CSS literals across the entire frontend codebase. Verify all 4 states per page.

**Independent Test**: `grep -r "ml-\|mr-\|pl-\|pr-\|text-left\|text-right\|left-\|right-" frontend/src --include="*.tsx" --include="*.ts"` returns zero results in new/modified code.

- [ ] T011 [US9] Run RTL audit grep across `frontend/src/` for forbidden directional classes: `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right` — document every violation found
- [ ] T012 [US9] Fix all directional violations in `frontend/src/features/checkout/CheckoutPage.tsx` — replace with logical equivalents (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`)
- [ ] T013 [P] [US9] Fix all directional violations in `frontend/src/features/admin/catalog/AdminProductEditPage.tsx`
- [ ] T014 [P] [US9] Fix all directional violations in `frontend/src/features/admin/AdminOrderDetailPage.tsx`
- [ ] T015 [P] [US9] Fix all directional violations in `frontend/src/features/orders/OrderDetailPage.tsx`
- [ ] T016 [P] [US9] Fix all directional violations in `frontend/src/features/catalog/CatalogPage.tsx` and `frontend/src/features/catalog/ProductDetailPage.tsx`
- [ ] T017 [P] [US9] Fix all directional violations in `frontend/src/features/cart/CartPage.tsx` and `frontend/src/features/cart/components/CartLineRow.tsx`
- [ ] T018 [US9] Fix all directional violations in `frontend/src/features/addresses/AddressBookPage.tsx`
- [ ] T019 [P] [US9] Fix all directional violations in `frontend/src/features/admin/AdminOrdersListPage.tsx` and `frontend/src/features/admin/AdminUsersPage.tsx`
- [ ] T020 [P] [US9] Fix all directional violations in `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx`, `AdminProductsListPage.tsx`, `AdminProductCreatePage.tsx`
- [ ] T021 [P] [US9] Fix all directional violations in `frontend/src/features/admin/catalog/AdminPaymentMethodsPage.tsx` and `frontend/src/features/admin/AdminInquiriesPage.tsx`
- [ ] T022 [US9] Fix all directional violations in `frontend/src/features/admin/components/AdminSidebar.tsx` and `frontend/src/features/admin/components/AdminHeader.tsx`
- [ ] T023 [P] [US9] Verify directional icons (chevrons, arrows, back) use `rtl:scale-x-[-1]` or `dir`-aware variants; verify symbolic icons (search, settings, user) do NOT mirror — check `frontend/src/features/admin/components/AdminSidebar.tsx`
- [ ] T024 [US9] Verify `dir` attribute is set on `<html>` correctly when language switches — read `frontend/src/main.tsx` and `frontend/src/App.tsx` (or wherever `i18n.dir()` is applied)

**Checkpoint**: Grep returns zero directional violations. Manually verify 2 pages in all 4 states.

---

## Phase 4: User Story 2 — Catalog Browsing (P1)

**Goal**: Catalog page has correct empty state, filter UX, pagination, and RTL-safe layout.

**Independent Test**: Open catalog with no products matching active filters → empty state component shown. Apply category filter → URL updates, results refresh. Switch to Arabic → all labels render in Arabic with RTL layout.

- [ ] T025 [US2] Audit `frontend/src/features/catalog/CatalogPage.tsx` — verify empty state (no results) renders a real empty-state component (icon + heading + help text) matching `DESIGN_PRINCIPLES.md §6`, not a blank panel
- [ ] T026 [P] [US2] Audit `frontend/src/features/catalog/components/` — confirm `ProductCard` renders `nameAr`/`nameEn` per active locale via `useLocalizedField` and prices via `format.ts`
- [ ] T027 [P] [US2] Verify pagination controls in `frontend/src/features/catalog/CatalogPage.tsx` are always visible when `totalPages > 1` and use logical CSS
- [ ] T028 [US2] Verify all catalog i18n keys exist in `frontend/src/locales/ar/catalog.json` and `frontend/src/locales/en/catalog.json` — add any missing keys (filter labels, sort options, empty state strings, pagination)
- [ ] T029 [US2] Verify `frontend/src/features/catalog/CatalogPage.tsx` renders correctly in all 4 states — check sidebar/filter panel direction, card grid direction, text alignment

**Checkpoint**: Catalog page functional with empty state + all labels localized in both languages.

---

## Phase 5: User Story 3 — Product Detail & Variant Selection (P1)

**Goal**: Product detail page shows correct variant picker, stock state, and add-to-cart behavior in all 4 states.

**Independent Test**: Open a product with multiple color/size variants. Select each combination. Out-of-stock shows disabled + line-through size. Add in-stock item → cart badge increments.

- [ ] T030 [US3] Audit `frontend/src/features/catalog/ProductDetailPage.tsx` — verify color + size pickers are RAC `radiogroup` with correct disabled + line-through for out-of-stock sizes
- [ ] T031 [P] [US3] Verify product gallery in `frontend/src/features/catalog/ProductDetailPage.tsx` renders all images with correct `alt` text using localized product name
- [ ] T032 [P] [US3] Verify `frontend/src/features/catalog/components/` variant picker components use logical CSS only (no `left`/`right`)
- [ ] T033 [US3] Verify product detail i18n keys exist in `frontend/src/locales/ar/catalog.json` and `frontend/src/locales/en/catalog.json` — add missing: out-of-stock label, add-to-cart confirmation, size guide label
- [ ] T034 [US3] Verify `ProductDetailPage.tsx` renders correctly in all 4 states — check gallery layout direction, picker direction, price alignment (`tabular-nums`)

**Checkpoint**: Product detail + variant selection fully verified in all 4 states.

---

## Phase 6: User Story 4 — Cart Flow (P1)

**Goal**: Cart drawer (nested button bug fixed), cart page, guest→server merge all work correctly.

**Independent Test**: Add item as guest → cart badge shows count. Sign in → cart merges. Update quantity → subtotal updates. Remove last item → empty state shown.

- [ ] T035 [US4] Verify `frontend/src/features/cart/components/CartButton.tsx` — confirm controlled `isOpen` state is used (no `Drawer.Trigger` wrapping `Button`), zero nested-button console warnings
- [ ] T036 [P] [US4] Audit `frontend/src/features/cart/CartPage.tsx` — verify empty state component shown when cart is empty, RTL layout, `tabular-nums` on prices
- [ ] T037 [P] [US4] Audit `frontend/src/features/cart/components/CartLineRow.tsx` — verify quantity stepper uses `rounded-s-none`/`rounded-e-none` (already correct), verify in all 4 states
- [ ] T038 [US4] Verify cart i18n keys in `frontend/src/locales/ar/cart.json` and `frontend/src/locales/en/cart.json` — add any missing: empty state title/subtitle, continue shopping, count SR-only label
- [ ] T039 [US4] Verify `CartProvider.tsx` merge logic handles the case where a guest cart variant is already in the server cart (quantity summed, capped at `MAX_QUANTITY_PER_LINE`) — read `frontend/src/features/cart/CartProvider.tsx`

**Checkpoint**: Cart drawer opens without console errors. Guest→server merge verified manually.

---

## Phase 7: User Story 5 — Checkout & Payment Proof (P1)

**Goal**: Checkout form is RTL-safe, all labels localized, proof upload works, order confirmation shown.

**Independent Test**: Complete checkout as authenticated buyer with Instapay → order created → upload proof image → order moves to PendingPaymentReview → confirmation shown.

- [ ] T040 [US5] Deep RTL audit of `frontend/src/features/checkout/CheckoutPage.tsx` — this is the largest and most complex form; replace all `pl-`, `pr-`, `ml-`, `mr-` with logical equivalents; verify step indicators and form layout in RTL
- [ ] T041 [P] [US5] Audit `frontend/src/features/checkout/schemas.ts` — verify zod schema field names and error messages map to localized i18n keys
- [ ] T042 [P] [US5] Verify checkout i18n coverage in `frontend/src/locales/ar/checkout.json` and `frontend/src/locales/en/checkout.json` — add any missing field labels, error messages, step headings, payment method descriptions
- [ ] T043 [US5] Verify `frontend/src/features/orders/OrderDetailPage.tsx` proof upload section — confirm file picker shows correct accept types, max size hint is localized, upload error messages are shown
- [ ] T044 [US5] Verify `CheckoutPage.tsx` renders correctly in all 4 states — pay particular attention to form field label direction, error state alignment, payment method card selection

**Checkpoint**: Checkout completes without console errors in all 4 states. Proof upload confirmed functional.

---

## Phase 8: User Story 6 — Admin Order Management (P2)

**Goal**: Admin hub shows meaningful KPI data. Order list/detail pages polished, RTL-safe, functional in all 4 states.

**Independent Test**: Log in as admin → hub shows order count summary. Navigate to orders → filter by status → open order → approve proof → status updates → buyer email queued.

- [ ] T045 [US6] Rebuild `frontend/src/features/admin/AdminHubPage.tsx` — replace stub with a real KPI dashboard: order counts by status (Pending, PendingPaymentReview, Paid, Preparing, Shipped), recent orders list, quick-action links to Orders/Products/Users — all using `tabular-nums`, logical CSS, and both locale strings
- [ ] T046 [P] [US6] Add admin hub i18n keys in `frontend/src/locales/ar/admin.json` and `frontend/src/locales/en/admin.json` — KPI labels, status names, quick link labels
- [ ] T047 [P] [US6] Audit `frontend/src/features/admin/AdminOrdersListPage.tsx` — verify status badge colors, pagination, filter controls use logical CSS and are localized in both languages
- [ ] T048 [P] [US6] Audit `frontend/src/features/admin/AdminOrderDetailPage.tsx` — verify proof review panel (approve/reject form with review note), order timeline, shipping address block all use logical CSS
- [ ] T049 [US6] Verify admin order pages render correctly in all 4 states — check table column alignment, status badges, action button positioning

**Checkpoint**: Admin hub shows live order KPIs. Proof approve/reject works. All 4 states verified.

---

## Phase 9: User Story 7 — Admin Catalog Management (P2)

**Goal**: Product create/edit/list pages polished, RTL-safe, bilingual content editable and saved correctly.

**Independent Test**: Admin creates a product with Arabic + English names, adds 2 variants, uploads an image → product appears on public storefront in correct language.

- [ ] T050 [US7] Deep audit of `frontend/src/features/admin/catalog/AdminProductEditPage.tsx` (25 KB, largest file) — fix all directional violations, verify bilingual field pairs (`NameAr`/`NameEn`, `DescriptionAr`/`DescriptionEn`) are clearly labeled in the form, verify image management section RTL layout
- [ ] T051 [P] [US7] Audit `frontend/src/features/admin/catalog/AdminProductCreatePage.tsx` — same directional and bilingual field checks as T050
- [ ] T052 [P] [US7] Audit `frontend/src/features/admin/catalog/AdminProductsListPage.tsx` and `AdminCategoriesPage.tsx` — verify table headers, action buttons, pagination use logical CSS
- [ ] T053 [P] [US7] Verify `frontend/src/features/admin/catalog/AdminPaymentMethodsPage.tsx` — form fields for `NameAr`/`NameEn`, `Instructions`, `ReceivingAccount` are all RTL-safe and localized
- [ ] T054 [US7] Verify admin catalog pages render correctly in all 4 states — product form, image grid, variant table

**Checkpoint**: Admin can create/edit products with bilingual content. All 4 states verified.

---

## Phase 10: User Story 8 — Admin Users & Roles (P2)

**Goal**: Users list searchable, role update works, self-demotion blocked, all 4 states verified.

**Independent Test**: Search for a user by name → found. Promote buyer to Admin → roles updated. Attempt to remove own Admin role → error shown.

- [ ] T055 [P] [US8] Audit `frontend/src/features/admin/AdminUsersPage.tsx` — verify search input is RTL-safe, role chips/badges use logical layout, error message for self-demotion is localized
- [ ] T056 [P] [US8] Verify admin users i18n keys in `frontend/src/locales/ar/admin.json` and `frontend/src/locales/en/admin.json` — user table headers, role labels, search placeholder, self-demotion error
- [ ] T057 [US8] Verify `AdminUsersPage.tsx` renders correctly in all 4 states

**Checkpoint**: User role management verified and RTL-safe.

---

## Phase 11: User Story 10 — Dark/Light Theme (P2)

**Goal**: Both themes work consistently across all pages. No hardcoded colors. Theme persisted across reloads.

**Independent Test**: Toggle to light theme → all surfaces, text, borders use light palette. Reload → light theme persists. Toggle back to dark → dark palette restored.

- [ ] T058 [P] [US10] Audit `frontend/src/shared/components/ThemeToggle.tsx` — confirm next-themes `useTheme` is used, button is accessible (aria-label in both languages)
- [ ] T059 [US10] Spot-check 4 pages in light mode: `CatalogPage`, `AdminHubPage`, `CheckoutPage`, `AdminOrderDetailPage` — verify no hardcoded dark-only colors (e.g., hardcoded `#fff` or `text-white` where `text-foreground` should be used)
- [ ] T060 [US10] Verify `frontend/src/shared/components/Header.tsx` and `frontend/src/features/admin/components/AdminSidebar.tsx` render correctly in light mode (borders, backgrounds, active states)

**Checkpoint**: Theme toggle works. Both themes verified on storefront and admin surfaces.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: i18n coverage, account shell rebuild, empty state standardization, test gate, and PROJECT_MAP update.

- [ ] T061 [P] Rebuild `frontend/src/shared/components/ShellPage.tsx` (or create `frontend/src/features/auth/AccountPage.tsx` if router is updated) into a real buyer account dashboard — show: buyer full name, email address, account creation date (from auth context / `/api/auth/me`), quick-link cards to Orders and Addresses, optional recent-orders preview (last 3 orders) and total order count; all using logical CSS, both locale strings (`frontend/src/locales/ar/account.json` + `en/account.json`), all 4 states; no password-management UI
- [ ] T062 [P] Audit all locale namespace files for missing keys: compare keys used in `.tsx` files against `frontend/src/locales/ar/*.json` and `frontend/src/locales/en/*.json` — add all missing keys with correct Arabic translations (do NOT leave English fallback in Arabic file)
- [ ] T063 [P] Verify all `<img>` tags across storefront have non-empty `alt` text using localized product/category names — check `frontend/src/features/catalog/components/` and `frontend/src/features/admin/catalog/`
- [ ] T064 [P] Verify `frontend/src/features/admin/AdminInquiriesPage.tsx` renders correctly in all 4 states — message body direction, email display, mark-read button layout
- [ ] T065 Run the full backend test suite one final time: `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj` — confirm 212 passed, 0 failed
- [ ] T066 Update `PROJECT_MAP.md` `[ORPHANS & PENDING]` section — move resolved items to the appropriate `Resolved at M4` section, update the `Still open` list to reflect remaining M5 items

**Checkpoint**: All 212 backend tests pass. Zero `console.error` output. Zero missing i18n keys. All pages verified in all 4 states.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Bug Fixes)**: No dependencies — start immediately. Blocks the binary acceptance check.
- **Phase 2 (US1 verification)**: Depends on Phase 1 (test suite must be green).
- **Phase 3 (RTL audit)**: Independent of Phase 2 — can start in parallel. **Blocks Phases 4–11** (must be clean before 4-state verification).
- **Phases 4–11 (Story verification)**: Depend on Phase 3 completion. Can run in parallel per story once Phase 3 is done.
- **Phase 12 (Polish)**: Depends on Phases 4–11 completion.

### User Story Dependencies

- **US1 (P1)**: After Phase 1 — independent
- **US9 (P1)**: After Phase 1 — independent, but blocks 4-state verification in all other stories
- **US2–US5 (P1)**: After Phase 3 (RTL audit) — can proceed in parallel
- **US6–US8, US10 (P2)**: After Phase 3 — can proceed in parallel with US2–US5

### Within Each Phase

- T001 → T002 (diagnose then fix)
- T003 → T004 (diagnose then fix)
- T004 → T005 (fix then verify)
- T011 → T012–T022 (audit first, then fix violations in parallel)

### Parallel Opportunities

All `[P]` tasks within a phase can run simultaneously (different files, no shared dependencies):
- T007, T008 (auth audits)
- T012, T013, T014, T015, T016, T017, T019, T020, T021, T023 (RTL fixes — all different files)
- T026, T027, T031, T032, T036, T037, T041, T042, T046, T047, T048, T051, T052, T053, T055, T056, T058, T061, T062, T063, T064 (audits and fixes across phases)

---

## Parallel Execution Examples

### Phase 3 — RTL Audit (once T011 audit list is complete)

```text
In parallel:
  T012 — CheckoutPage.tsx directional fixes
  T013 — AdminProductEditPage.tsx directional fixes
  T014 — AdminOrderDetailPage.tsx directional fixes
  T015 — OrderDetailPage.tsx directional fixes
  T016 — CatalogPage + ProductDetailPage fixes
  T017 — CartPage + CartLineRow fixes
  T019 — AdminOrdersListPage + AdminUsersPage fixes
  T020 — AdminCategoriesPage + AdminProductsListPage + AdminProductCreatePage fixes
  T021 — AdminPaymentMethodsPage + AdminInquiriesPage fixes
```

### Phase 12 — Polish (all independent)

```text
In parallel:
  T061 — AccountShellPage rebuild
  T062 — i18n coverage audit + additions
  T063 — alt text audit
  T064 — AdminInquiriesPage 4-state verify
```

---

## Implementation Strategy

### MVP (Minimum Viable Production-Ready)

1. Complete **Phase 1** (bug fixes) → test suite green
2. Complete **Phase 2** (US1 routing verification) → security confirmed
3. Complete **Phase 3** (RTL audit) → layout correctness baseline
4. **VALIDATE**: Run tests, open app in all 4 states on desktop
5. Proceed with Phases 4–12 by priority order

### Incremental Delivery

1. Phase 1 → Bug-free backend ✅
2. Phase 2 → Security routing confirmed ✅
3. Phase 3 → RTL parity baseline ✅
4. Phases 4–7 → Full customer flow verified (P1 stories) ✅
5. Phases 8–11 → Full admin experience verified (P2 stories) ✅
6. Phase 12 → Polish and PROJECT_MAP updated ✅
7. **Binary acceptance check passes** → production-ready

### Single-Developer Sequence

Recommended order for one developer:
> Phase 1 → Phase 2 → Phase 3 → Phase 7 (Checkout, hardest RTL) → Phase 4 (Catalog) → Phase 5 (Product) → Phase 6 (Cart) → Phase 8 (Admin Orders + Hub) → Phase 9 (Admin Catalog) → Phase 10 (Admin Users) → Phase 11 (Theme) → Phase 12 (Polish)

---

## Notes

- `[P]` tasks touch different files — safe to execute in parallel
- `[USN]` label maps each task to a specific user story for traceability
- The binary acceptance check is: **all 212 tests pass + zero console errors in all 4 states**
- Never use `left`/`right`/`ml-*`/`mr-*`/`pl-*`/`pr-*`/`text-left`/`text-right` — use logical equivalents
- All monetary values go through `frontend/src/shared/lib/format.ts` — never inline
- All i18n strings must exist in both `ar` and `en` namespace files before marking a task done
- Commit after each phase or logical group of tasks
