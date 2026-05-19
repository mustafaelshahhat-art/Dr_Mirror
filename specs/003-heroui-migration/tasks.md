---
description: "Task list for HeroUI v3 Full Migration (revised 2026-05-19)"
---

# Tasks: HeroUI v3 Full Migration

**Input**: Design documents from `specs/003-heroui-migration/` (revised 2026-05-19)

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md` (especially آ§ **HeroUI v3 Component Anatomy (Appendix)**), `contracts/exceptions-register.md`, `quickstart.md`

**Tests**: NOT explicitly requested as new TDD tasks. The acceptance gate is "all existing Vitest tests pass" (SC-004). Per-batch verification commands (`npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run i18n:check`, `npm --prefix frontend run lint`) plus the **SC-009 Visual Verification Matrix** plus the extended grep gates run at every checkpoint. New tests are added only when a public component contract changes (US4 `LinkButton` deletion, US8 `PaginationBar` deletion, US10 `EmptyState` internals refactor, Phase 12b RAC migration).

**Anatomy binding**: Every task that imports a HeroUI compound primitive MUST cite the relevant section of `data-model.md` آ§ **HeroUI v3 Component Anatomy (Appendix)** (e.g., "per Anatomy A.1" for `Card`). The banned v2 names (`CardBody`, `TableHeader`, `Textarea` lowercase, `Divider`, `Navbar`, `EmptyState`, `Alert.Icon`, `<Card isPressable>`, `<Spinner label>`, `BreadcrumbsItem`, `LinkButton`, `PaginationBar`) MUST NOT appear in implementation code.

**Task Acceptance Gate** (per `data-model.md` آ§ Task Acceptance Gate): every implementation task must (1) name the HeroUI primitive(s) used + Anatomy section, (2) cite the mapping row it implements, (3) enumerate props/variants/state attributes set, (4) list new i18n keys (or "None"), (5) pass the four CLI gates, (6) pass the SC-009 visual matrix, (7) pass the per-batch grep gate.

**Organization**: Tasks are grouped by user story (US1â€“US10 from `spec.md`) plus **Phase 12b** (Exception 1 sunset migration to `ToggleButtonGroup`) and **Phase 13** (Polish). Each user story is one batch / one PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different files, parallelizable
- **[Story]**: `[US1]`â€“`[US10]`, `[US12b]` for the RAC sunset phase, blank for Setup/Foundational/Polish
- Every task description includes the exact file path
- Tasks suffixed `-vm` are Visual Verification Matrix (SC-009) checkpoints

## Path Conventions

- Frontend: `frontend/src/`
- Specs: `specs/003-heroui-migration/`; baseline metrics in `progress.txt` at repo root

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Verify working tree is on branch `003-heroui-migration` and clean (`git status`); abort if otherwise
- [X] T002 Run `npm --prefix frontend install` to ensure `@heroui/react@^3.0.4` matches `frontend/package.json`
- [X] T003 [P] Capture build baseline: run `npm --prefix frontend run build` and record main + 3 largest async chunk gzip sizes into `progress.txt`
- [X] T004 [P] Capture test baseline: run `npm --prefix frontend test` and record runtime + test count into `progress.txt`
- [X] T005 [P] Capture i18n baseline: run `npm --prefix frontend run i18n:check` and record exit code + key counts into `progress.txt`
- [X] T006 [P] Capture lint baseline: run `npm --prefix frontend run lint` and record exit code + warning count into `progress.txt`

**Checkpoint**: Baseline numbers in `progress.txt`. Subsequent batches compare against these.

---

## Phase 2: Foundational (Blocking Prerequisites)

**âڑ ï¸ڈ CRITICAL**: No user-story work begins until this phase completes.

### Provider chain + shared-shim verification (research آ§11, آ§12)

- [X] T007 Audit `frontend/src/app/providers.tsx` against HeroUI v3 quick-start: confirm `HeroUIProvider` (root), `I18nProvider` (with `locale={i18n.language}` and `dir={i18n.dir()}` or equivalent), `Toast.Provider` (or queue), `RouterProvider` compatibility with `react-router-dom@^7`, and `next-themes` theme driver. Record drift in PR; do **not** modify (out of scope unless explicitly added later). **Decision gate**: if `Toast.Provider` or `I18nProvider` is missing or misconfigured, create a blocking follow-up task **T007-fix** (scoped to `providers.tsx` correction only) and treat it as a hard dependency of T145 and T147a â€” those tasks MUST NOT begin until T007-fix is resolved.
- [X] T008 [P] Audit `frontend/src/shared/components/Field.tsx` against v3 anatomy (per `data-model.md` Anatomy A.16): confirm internals use HeroUI `TextField` + `Label` + `Input` (or `TextArea`) + optional `Description` + optional `FieldError`. Confirm public props contract (`label`, `value`, `onChange`, `type?`, `required?`, `maxLength?`, `dir?`, `description?`, `placeholder?`, `errorMessage?`). Record "PASS" or drift in PR; do **not** modify if PASS.
- [X] T009 [P] Audit `frontend/src/shared/components/SelectField.tsx` against v3 anatomy (per `data-model.md` Anatomy A.19): confirm internals use HeroUI `Select` + `Select.Trigger` + `Select.Value` + `Select.Indicator` + `Select.Popover` + `ListBox` + `ListBox.Item`. Confirm public props contract. Record "PASS" or drift in PR.
- [X] T010 [P] Confirm `frontend/src/shared/components/PaginationControls.tsx` exports the `PaginationControls` function with public props (`page`, `totalPages`, `onPageChange`, `isDisabled?`, `className?`) per `data-model.md` آ§ Component Contracts. Confirm internals use HeroUI `Pagination` compound per Anatomy A.4.

### Exception-comment audits (rejected-primitive trail â€” acceptance criterion 5)

- [X] T011 [P] Update the same-file justification comment in `frontend/src/shared/components/Snippet.tsx` to satisfy `contracts/exceptions-register.md` acceptance criterion 5 (rejected-primitive trail): name HeroUI `Snippet` as considered-and-rejected (not exported by v3.0.4), and name native `<button>` + `navigator.clipboard.writeText` as considered-and-rejected (would violate FR-003). Cite the register.
- [X] T012 [P] Update the same-file justification comment near the `<input type="file">` in `frontend/src/features/orders/components/PaymentProofUpload.tsx` to satisfy criterion 5: name HeroUI `FileTrigger`/`FileInput` as considered-and-rejected (not exported by v3.0.4) and React Aria `FileTrigger` direct usage as considered-and-rejected (violates FR-014). Cite the register.
- [X] T013 [P] Update the same-file justification comment near the `<input type="file">` in `frontend/src/features/admin/catalog/components/ProductImagesSection.tsx` to satisfy criterion 5 (same rejected-primitive trail as T012). Cite the register.
- [X] T014 [P] Audit `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` for any `<input type="file">`; if present, add a criterion-5 justification comment per T012; else note "no file input here" in the PR.

### Exception 1 removal preparation (Phase 12b prerequisite â€” research آ§9)

- [X] T015 [P] **Remove** the previous Exception 1 RAC justification comments from `frontend/src/features/catalog/components/CategoryChips.tsx`, `SizePicker.tsx`, `ColorPicker.tsx`, and `FilterPanel.tsx` (the `// intentional: raw <button role="radio"> keeps the RAC radiogroup pattern per DESIGN.md.` comments). The four files will be migrated in Phase 12b; comment removal in Foundational signals the exception is no longer accepted. Note: this is a doc-comment change only, not an implementation change â€” the raw `<button role="radio">` JSX stays untouched until Phase 12b lands.

**Checkpoint**: Provider chain audited (drift recorded). `Field`/`SelectField`/`PaginationControls` v3-anatomy compliance confirmed. Exception 2 + Exception 3 same-file justification comments updated to satisfy criterion 5 (rejected-primitive trail). Former Exception 1 justification comments removed in preparation for Phase 12b.

---

## Phase 3: User Story 1 â€” Card Surfaces (Priority: P1) ًںژ¯ MVP

**Goal**: Replace hand-styled card containers (`<div>` with `rounded-*` + `border` + `bg-content*` + `p-*`) with the HeroUI v3 `Card` compound (`Card`, `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`) per `data-model.md` Anatomy A.1, so card surfaces inherit `--radius`, `--surface`, `--border` tokens. **Banned v2 names**: `CardBody`, `CardHeader` / `CardFooter` as named exports, `<Card isPressable>` â€” these MUST NOT appear in implementation.

**Independent Test**: Inspect storefront and admin pages â€” every information panel is a HeroUI `<Card>` with v3 dot-notation parts where structure is needed. Changing `--radius` in `globals.css` updates corner radii site-wide. SC-002 grep returns zero hand-styled card patterns in modified files; the banned-v2-names grep returns zero matches for `\bCardBody\b`/`\bCardHeader\b`/`\bCardFooter\b`/`isPressable` in modified files.

- [X] T016 [P] [US1] Migrate card containers in `frontend/src/features/addresses/AddressBookPage.tsx` to HeroUI `Card` compound (`Card` + `Card.Header` + `Card.Title` + `Card.Description` + `Card.Content` + optional `Card.Footer`) per Anatomy A.1; banned: `CardBody`/`CardHeader`/`CardFooter` named exports.
- [X] T017 [P] [US1] Migrate card containers in `frontend/src/features/admin/AdminOrderDetailPage.tsx` to HeroUI `Card` compound per Anatomy A.1 (existing HeroUI `Modal` stays â€” confirm/destroy actions in this page migrate to `AlertDialog` in US10 per FR-010c).
- [X] T018 [P] [US1] Migrate card containers in `frontend/src/features/admin/AdminInquiriesPage.tsx` to HeroUI `Card` compound per Anatomy A.1.
- [X] T019 [P] [US1] Migrate card containers in `frontend/src/features/cart/CartPage.tsx` to HeroUI `Card` compound (use `Card.Footer` for totals/checkout button) per Anatomy A.1.
- [X] T020 [P] [US1] Migrate card containers in `frontend/src/features/catalog/ProductDetailPage.tsx` to HeroUI `Card` compound per Anatomy A.1.
- [X] T021 [P] [US1] Migrate the product-card wrapper in `frontend/src/features/catalog/components/ProductCard.tsx` to a v3-canonical **navigable card pattern** per Anatomy A.1: compose `<Card>` with the navigable surface either (a) wrapping the `Card` in `<Button as={Link} to={url} variant="ghost">` or (b) placing `Card.Header as={Link}` / `Card.Content as={Link}` if the `Card.*` part accepts polymorphic `as` (verify against the v3 docs before importing â€” `Card` itself has no `isPressable` prop in v3). Preserve product URL, product-name `aria-label`, keyboard activation, and routing behavior. **Forbidden**: `<Card isPressable as={Link}>` (v2 syntax).
- [X] T022 [P] [US1] Migrate card containers in `frontend/src/features/checkout/CheckoutPage.tsx` to HeroUI `Card` compound per Anatomy A.1. (Hand-styled headings inside cards migrate to `Typography` in US10.)
- [X] T023 [P] [US1] Migrate card containers in `frontend/src/features/orders/OrderDetailPage.tsx` to HeroUI `Card` compound per Anatomy A.1 (`Snippet` wrapper stays â€” Exception 2).
- [X] T024 [P] [US1] Migrate the outer card wrapper in `frontend/src/features/orders/components/PaymentInstructionsCard.tsx` to HeroUI `Card` compound per Anatomy A.1.
- [X] T025 [US1] Run US1 grep gates: (a) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "rounded-large border border-divider" -SimpleMatch` returns only empty-state divs (handled in US10); (b) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "\\b(CardBody|CardHeader|CardFooter)\\b"` returns zero matches in modified files; (c) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "isPressable" -SimpleMatch` returns zero matches. Record all three in PR.
- [X] T025a [US1] **SC-006 Token Propagation Check**: In `frontend/src/styles/globals.css`, temporarily change `--radius` by one unit (e.g., `0.5rem` â†’ `0.6rem`); run `npm --prefix frontend run dev`; visually confirm that `Card`, `Button`, `TextField`, `Input`, `Surface`, and all other HeroUI v3 primitives update their corner radii site-wide without additional CSS overrides. Revert the change immediately after verification. Record "PASS" or the list of failing components in PR. Required for SC-006.
- [X] T026 [US1] Run `npm --prefix frontend run build` â€” must pass; record bundle-size delta vs. baseline.
- [X] T027 [US1] Run `npm --prefix frontend test` â€” must pass; record runtime delta.
- [X] T028 [US1] Run `npm --prefix frontend run i18n:check` â€” must pass; list any new keys introduced (or "None") in PR.
- [X] T029 [US1] Run `npm --prefix frontend run lint` â€” no new warnings; record in PR.
- [X] T029-vm [US1] **SC-009 Visual Verification Matrix** for every modified surface in this batch: en LTR أ— ar RTL أ— light أ— dark أ— 375/768/1280px + keyboard reach + visible focus + Escape close (where applicable) + idle/loading/disabled/error states + no horizontal overflow + no mirrored imbalance. Record per-surface result table in PR per `quickstart.md` آ§ Visual Verification Matrix.

**Checkpoint**: All card surfaces inherit theme tokens via v3 dot-notation compound. SC-002 satisfied for in-scope files. Banned v2 card names absent.

---

## Phase 4: User Story 2 â€” Tables (Priority: P1)

**Goal**: Replace every raw `<table>` in admin lists with the HeroUI v3 `Table` compound (`Table`, `Table.ScrollContainer`, `Table.Header`, `Table.Column`, `Table.Body`, `Table.Row`, `Table.Cell`, optionally `Table.Footer` / `Table.LoadMore` / `Table.LoadMoreContent`) per `data-model.md` Anatomy A.2. **Banned v2 names**: `TableHeader`, `TableColumn`, `TableBody`, `TableRow`, `TableCell` as named exports â€” these MUST NOT appear in implementation. Responsive horizontal overflow is handled by `Table.ScrollContainer` (no hand-rolled `overflow-x-auto` wrappers).

**Independent Test**: Visit admin products / orders / users / audit pages â€” every table uses the v3 dot-notation compound, RTL alignment preserved (`text-start`), filter/sort/pagination behavior identical. SC-001 grep for `<table` in `frontend/src/features/admin/` returns zero; banned-v2-names grep returns zero for `\b(TableHeader|TableColumn|TableBody|TableRow|TableCell)\b` named-export usage.

- [X] T030 [P] [US2] Migrate raw `<table>` in `frontend/src/features/admin/AdminOrdersListPage.tsx` to HeroUI `Table` compound per Anatomy A.2: outer `Table.ScrollContainer` > `Table` (with `aria-label`, `aria-busy={query.isFetching}`) > `Table.Header` > `Table.Column` (responsive column visibility via Tailwind classes on each `Table.Column`); body `Table.Body` > `Table.Row` > `Table.Cell`; skeleton-loading uses `Skeleton` cells inside `Table.Row` per T034.
- [X] T031 [P] [US2] Migrate raw `<table>` in `frontend/src/features/admin/AdminUsersPage.tsx` to HeroUI `Table` compound per Anatomy A.2; preserve responsive column visibility (replace `hidden sm:table-cell` with the same Tailwind class on `Table.Column`) and `aria-busy` semantics.
- [X] T032 [P] [US2] Migrate raw `<table>` in `frontend/src/features/admin/catalog/AdminProductsListPage.tsx` to HeroUI `Table` compound per Anatomy A.2; preserve `aria-busy={products.isFetching}`, responsive columns, per-row action menu (each row's action cluster MAY adopt HeroUI `Toolbar` in US4 per FR-010a).
- [X] T033 [P] [US2] Migrate raw `<table>` in `frontend/src/features/admin/audit/AuditLogPage.tsx` to HeroUI `Table` compound per Anatomy A.2; preserve filter-row layout (filters themselves migrate to HeroUI `Select` / `SearchField` in US5).
- [X] T034 [P] [US2] Update `TableRowSkeleton` (path recorded in `data-model.md` File-Level Migration Plan â€” expected at `frontend/src/shared/components/TableRowSkeleton.tsx`; verify and record exact path in PR) to emit HeroUI `Skeleton` self-closing elements (per Anatomy A.20: `<Skeleton className="h-4 w-32 rounded-lg" animationType="shimmer" />`) inside HeroUI `Table.Row` > `Table.Cell` so the skeleton composes cleanly inside `Table.Body`. **Banned**: `<Skeleton><div /></Skeleton>` v2-style wrapping.
- [X] T035 [US2] Run US2 grep gates: (a) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "<table " -SimpleMatch` â†’ zero matches; (b) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "\\b(TableHeader|TableColumn|TableBody|TableRow|TableCell)\\b"` â†’ zero matches in modified files (only dot-notation `Table.*`). Record both in PR.
- [X] T036 [US2] Run `npm --prefix frontend run build` â€” must pass; record bundle-size delta.
- [X] T037 [US2] Run `npm --prefix frontend test` â€” must pass (existing admin list tests cover this); record runtime delta.
- [X] T038 [US2] Run `npm --prefix frontend run i18n:check` and `npm --prefix frontend run lint` â€” both must pass.
- [ ] T038-vm [US2] **SC-009 Visual Verification Matrix** for every modified admin table page in this batch. Record per-surface result table in PR.

**Checkpoint**: Zero raw `<table>` in admin folder. v3 dot-notation compound used throughout. SC-001 partially satisfied.

---

## Phase 5: User Story 3 â€” Chips & Badges (Priority: P2)

**Goal**: Migrate two distinct v3 primitives per `data-model.md` Anatomy A.12 and A.13:
- **`Chip`** (Anatomy A.12) â€” standalone status pills (order status, gender, audit-kind/severity). Use `Chip` + optional `Chip.Label` for the text slot.
- **`Badge`** (Anatomy A.13) â€” anchored numeric counters / notification dots (cart-count indicator on the cart trigger, unread-count indicators). Use `Badge` + `Badge.Anchor` (wraps the trigger) + `Badge.Label` (carries the count).

The two primitives MUST be kept distinct per FR-005a / FR-005b: `Chip` is NOT used as an anchored counter; `Badge` is NOT used as a standalone pill.

**Independent Test**: Order-status indicators across admin/customer order pages, plus gender tags, render HeroUI `<Chip>` with semantic `color`/`variant`. The cart-trigger count indicator (and any unread-count indicators) render HeroUI `<Badge>` with `Badge.Anchor` + `Badge.Label`. Theme token changes propagate to both.

### `Chip` sweep (standalone status pills)

- [X] T039 [P] [US3] Audit `frontend/src/features/admin/AdminOrdersListPage.tsx` for inline status-badge spans; replace with HeroUI `<Chip color={â€¦ per status} variant="flat" size="sm">` per Anatomy A.12; wrap text in `Chip.Label` where applicable. **Done**: migrated centrally via shared `OrderStatusBadge` (now a HeroUI `Chip` + `Chip.Label`, color mapped per status: warning / accent / default / success / danger; variant `soft`, size `sm`). AdminOrdersListPage consumes the shared component.
- [X] T040 [P] [US3] Audit `frontend/src/features/admin/AdminOrderDetailPage.tsx` for inline status-badge spans; replace with HeroUI `<Chip>` per Anatomy A.12. **Done**: covered by `OrderStatusBadge` migration; no inline spans remain.
- [X] T041 [P] [US3] Audit `frontend/src/features/orders/OrderDetailPage.tsx` and `frontend/src/features/orders/OrdersListPage.tsx`; replace status spans with HeroUI `<Chip>` per Anatomy A.12. **Done**: both consume the shared `OrderStatusBadge` (now a `Chip`).
- [X] T042 [P] [US3] Audit `frontend/src/features/admin/AdminInquiriesPage.tsx` for status spans; replace with HeroUI `<Chip>` per Anatomy A.12. **Done**: local `StatusBadge` is now `<Chip color={warning|success|default} variant="soft" size="sm"><Chip.Label/></Chip>`.
- [X] T043 [P] [US3] Audit `frontend/src/features/admin/audit/AuditLogPage.tsx` for action-kind / severity spans; replace with HeroUI `<Chip>` per Anatomy A.12. **Audit result**: no `bg-{tone}/15` styled action-kind or severity spans found â€” `actionType`, `targetEntityType`, and previousâ†’new transition columns render as plain text-default-500/400. No migration in this batch.
- [X] T044 [P] [US3] Verify `frontend/src/features/catalog/components/GenderChip.tsx` already renders HeroUI `<Chip>` and uses `Chip.Label` for the text slot per Anatomy A.12; record audit result in PR. Modify only if not compliant. **Audit result**: was using a hand-styled `<span>` with `bg-{primary|secondary|default}/10` â€” migrated to `<Chip color={accent|default} variant="soft" size="sm"><Chip.Label/></Chip>` per Anatomy A.12.
- [X] T045 [P] [US3] Verify the chip *visual* in `frontend/src/features/catalog/components/CategoryChips.tsx` uses HeroUI `<Chip>` for the rendered chip content. The `<button role="radio">` wrapper itself migrates to `ToggleButton` in **Phase 12b** (not in this batch). Record audit result. **Audit result**: the chip visual is rendered by the `<button role="radio">` wrapper itself (className-based styling). A partial Chip wrapping inside the button would conflict with the imminent Phase 12b `ToggleButton` migration, which replaces both the wrapper and its visual styling in one step. Deferred to Phase 12b.

### `Badge` sweep (anchored counters / notification dots)

- [X] T045a [P] [US3] Audit `frontend/src/features/cart/components/CartButton.tsx` (and the storefront `Header.tsx` cart trigger) for the cart-count indicator. Replace any hand-styled `<span class="rounded-full â€¦">{count}</span>` with HeroUI `<Badge><Badge.Anchor>{trigger}</Badge.Anchor><Badge.Label>{count}</Badge.Label></Badge>` per Anatomy A.13. Preserve count semantics (hidden when zero) and RTL anchor positioning. **Done**: cart trigger now wrapped in `<Badge color="accent" placement={isRtl ? 'top-left' : 'top-right'} size="sm">` with `Badge.Anchor` around the `Button` and `Badge.Label` carrying the count. Hidden when zero (the Badge is only rendered when `cart.totalQuantity > 0`). `Header.tsx` consumes `CartButton`, no separate trigger.
- [X] T045b [P] [US3] Audit `frontend/src/features/admin/AdminInquiriesPage.tsx` and `AdminSidebar.tsx` (and any other admin surface) for unread-count indicators on nav items / list items. Replace with HeroUI `Badge` per Anatomy A.13 where the count is anchored to another element. If the unread-count indicator stands alone (no anchor), keep it as a `Chip`. **Audit result**: no anchored unread-count indicators exist. `AdminSidebar` has no per-nav-item counters; `AdminInquiriesPage` shows per-row standalone status pills (covered by T042's `Chip` migration). No Badge migration required.

### Verification

- [X] T046 [US3] Run US3 grep gates: (a) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "rounded-full[^\"]*bg-(success|warning|danger|primary)" -SimpleMatch` returns zero matches; (b) verify that anchored counters use `<Badge>` (not `<Chip>`) by spot-checking the touched files. Record in PR. **Result**: (a) two pre-Phase-5 matches found, one migrated in this batch (`FilterPanel.tsx` active-filter count â†’ inline `<Chip color="accent" variant="primary" size="sm">`) and one deferred to Phase 11 (`InquiryForm.tsx` decorative success-icon container `rounded-full bg-success/15` â€” not a status pill or counter, will migrate when the success surface moves to HeroUI `Alert`). (b) Spot-check: `CartButton` uses `Badge`; all per-row status indicators use `Chip`.
- [X] T047 [US3] Run `npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run i18n:check`, `npm --prefix frontend run lint` â€” all must pass. **Result**: build âœ“ (no errors); test âœ“ 276/276; i18n:check âœ“ parity OK; lint âœ“ 0 errors, 29 pre-existing warnings (all `i18next/no-literal-string` false-positives on prop literals like `color="accent"` / `placement="top"`).
- [ ] T047-vm [US3] **SC-009 Visual Verification Matrix** for every modified status-pill and anchored-counter surface in this batch. Record per-surface result table in PR; verify RTL anchor positioning of `Badge` against the trigger element on each surface. **Pending external screenshot capture** (per `docs/screenshots/README.md`): surfaces to verify â€” AdminOrdersListPage, AdminOrderDetailPage, OrderDetailPage, OrdersListPage, AdminInquiriesPage, CatalogPage (GenderChip), CartButton (en LTR + ar RTL أ— light + dark أ— 375/768/1280 + idle/loading/empty states). PR description to include per-surface table.

**Checkpoint**: All standalone status indicators are HeroUI `Chip`; all anchored counters are HeroUI `Badge`. FR-005a + FR-005b satisfied.

---

## Phase 6: User Story 4 â€” Buttons, Links & Toolbars (Priority: P2)

**Goal**: Replace every raw `<button>` with HeroUI `<Button>` (except 4 RAC exception files), delete `LinkButton.tsx`, route all link-styled actions through `<Button as={Link}>`.

**Independent Test**: SC-001 grep for `<button` returns matches only inside the 4 RAC exception files. `frontend/src/shared/components/LinkButton.tsx` no longer exists. Link-styled actions still navigate.

### Delete `LinkButton` and migrate consumers

- [X] T048 [US4] Delete `frontend/src/shared/components/LinkButton.tsx` (triggers TS errors fixed in T049â€“T060)
- [X] T049 [P] [US4] Update `frontend/src/shared/components/Header.tsx` `LinkButton` consumers â†’ `<Button as={Link}>` from `@heroui/react` + `react-router-dom`
- [X] T050 [P] [US4] Update `frontend/src/features/cart/CartPage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T051 [P] [US4] Update `frontend/src/features/cart/components/CartButton.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T052 [P] [US4] Update `frontend/src/features/admin/AdminInquiriesPage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T053 [P] [US4] Update `frontend/src/features/admin/AdminOrderDetailPage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T054 [P] [US4] Update `frontend/src/features/admin/catalog/AdminProductsListPage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T055 [P] [US4] Update `frontend/src/features/admin/catalog/AdminProductCreatePage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T056 [P] [US4] Update `frontend/src/features/catalog/ProductDetailPage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T057 [P] [US4] Update `frontend/src/features/checkout/components/CheckoutEmptyState.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T058 [P] [US4] Update `frontend/src/features/orders/OrderDetailPage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T059 [P] [US4] Update `frontend/src/features/orders/OrdersListPage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`
- [X] T060 [P] [US4] Update `frontend/src/shared/pages/NotFoundPage.tsx` `LinkButton` consumers â†’ `<Button as={Link}>`

### Raw `<button>` sweep â€” admin

- [X] T061 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/components/AdminProofReview.tsx` with HeroUI `<Button>` (Modal stays)
- [X] T062 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/components/AdminTransitionActions.tsx` with HeroUI `<Button>` (Modal stays)
- [X] T063 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/components/AdminHeader.tsx` with HeroUI `<Button>`
- [X] T064 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx` row controls with HeroUI `<Button>`
- [X] T065 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/catalog/AdminPaymentMethodsPage.tsx` with HeroUI `<Button>`
- [X] T066 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/catalog/AdminProductCreatePage.tsx` with HeroUI `<Button>`
- [X] T067 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/catalog/components/ProductMasterForm.tsx` with HeroUI `<Button>`
- [X] T068 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/catalog/components/ProductVariantsSection.tsx` with HeroUI `<Button>`
- [X] T069 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/catalog/components/ProductImagesSection.tsx` with HeroUI `<Button>` â€” except the trigger that opens the hidden `<input type="file">` (visible trigger MUST be a HeroUI `<Button>` per Exception 3)
- [X] T070 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` with HeroUI `<Button>`
- [X] T071 [P] [US4] Replace raw `<button>` in `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodRow.tsx` with HeroUI `<Button>`

### Raw `<button>` sweep â€” storefront / shared

- [X] T072 [P] [US4] Replace raw `<button>` in `frontend/src/features/addresses/AddressBookPage.tsx` with HeroUI `<Button>`
- [X] T073 [P] [US4] Replace raw `<button>` in `frontend/src/features/addresses/components/AddressForm.tsx` with HeroUI `<Button>`
- [X] T074 [P] [US4] Replace raw `<button>` in `frontend/src/features/cart/components/CartLineRow.tsx` (qty +/-, remove) with HeroUI `<Button isIconOnly>`
- [X] T075 [P] [US4] Replace raw `<button>` in `frontend/src/features/catalog/CatalogPage.tsx` with HeroUI `<Button>`
- [X] T076 [P] [US4] Replace raw `<button>` in `frontend/src/features/catalog/ProductDetailPage.tsx` (add-to-cart, etc.) with HeroUI `<Button>`
- [X] T077 [P] [US4] Replace non-radio raw `<button>` in `frontend/src/features/catalog/components/FilterPanel.tsx` (clear/apply) with HeroUI `<Button>`. The clear/apply action cluster MUST be wrapped in HeroUI `<Toolbar aria-label=â€¦>` per FR-010a + Anatomy A.21. The `role="radio"` segment buttons remain untouched in this batch; they migrate to `ToggleButtonGroup` in **Phase 12b**.
- [X] T078 [P] [US4] Replace raw `<button>` in `frontend/src/features/catalog/components/ProductImageGallery.tsx` nav arrows with HeroUI `<Button isIconOnly>`
- [X] T079 [P] [US4] Replace raw `<button>` in `frontend/src/features/catalog/components/SearchInput.tsx` clear button with HeroUI `<Button isIconOnly>`
- [X] T080 [P] [US4] Replace raw `<button>` in `frontend/src/features/checkout/CheckoutPage.tsx` step buttons with HeroUI `<Button>`
- [X] T081 [P] [US4] Replace raw `<button>` in `frontend/src/features/checkout/components/PaymentMethodSection.tsx` with HeroUI `<Button>`
- [X] T082 [P] [US4] Replace raw `<button>` in `frontend/src/features/inquiries/components/InquiryForm.tsx` with HeroUI `<Button>`
- [X] T083 [P] [US4] Replace raw `<button>` in `frontend/src/features/orders/components/CancelOrderButton.tsx` with HeroUI `<Button>` (Modal stays)
- [X] T084 [P] [US4] Replace raw `<button>` in `frontend/src/features/orders/components/PaymentProofUpload.tsx` with HeroUI `<Button>` â€” visible trigger for hidden `<input type="file">` MUST be a HeroUI `<Button>` per Exception 3
- [X] T085 [P] [US4] Replace raw `<button>` in `frontend/src/shared/components/Header.tsx` (mobile menu trigger) with HeroUI `<Button>`
- [X] T086 [P] [US4] Replace raw `<button>` in `frontend/src/shared/components/ThemeToggle.tsx` with HeroUI `<Button isIconOnly>`
- [X] T087 [P] [US4] Replace raw `<button>` in `frontend/src/shared/components/LangSwitcher.tsx` with HeroUI `<Button>` (or `<Dropdown>`)
- [X] T088 [P] [US4] Replace raw `<button>` in `frontend/src/shared/components/ErrorBoundary.tsx` retry with HeroUI `<Button>`
- [X] T089 [P] [US4] Replace raw `<button>` in `frontend/src/shared/components/DowntimeBanner.tsx` dismiss with HeroUI `<Button isIconOnly>` (full Alert migration in US9)
- [X] T090 [P] [US4] Replace raw `<button>` in `frontend/src/shared/components/ForbiddenBanner.tsx` dismiss with HeroUI `<Button isIconOnly>` (full Alert migration in US9)
- [X] T091 [P] [US4] Replace raw `<button>` in `frontend/src/shared/components/QueryErrorState.tsx` retry with HeroUI `<Button>` (full Alert migration in US9)
- [X] T092 [P] [US4] Replace raw `<button>` in `frontend/src/shared/components/EmptyState.tsx` action with HeroUI `<Button>`
- [X] T093 [P] [US4] Audit `frontend/src/features/auth/LoginPage.tsx` and `frontend/src/features/auth/RegisterPage.tsx`; replace any raw `<button>` with HeroUI `<Button>`
- [X] T094 [P] [US4] Audit `frontend/src/features/auth/components/FormField.tsx` and `frontend/src/features/auth/components/AuthCard.tsx`; replace any raw `<button>` if found

### Toolbar adoption (grouped action bars per FR-010a)

- [X] T094a [P] [US4] Audit `frontend/src/features/admin/components/AdminProofReview.tsx` action cluster (approve/reject buttons) and wrap in HeroUI `<Toolbar aria-label=â€¦>` per Anatomy A.21. The confirmation modal itself migrates to `AlertDialog` in US10.
- [X] T094b [P] [US4] Audit `frontend/src/features/admin/components/AdminTransitionActions.tsx` action cluster and wrap in HeroUI `<Toolbar>` per Anatomy A.21.
- [X] T094c [P] [US4] Audit `frontend/src/features/admin/catalog/AdminProductsListPage.tsx` per-row action menus (and batch-action cluster if present) and wrap in HeroUI `<Toolbar>` per Anatomy A.21.
- [X] T094d [US4] *(Verification entry for T077 â€” no separate implementation.)* Confirm that T077's `<Toolbar aria-label=â€¦>` wrapping of the Apply/Clear bar in `FilterPanel.tsx` was implemented; record "PASS" or any deviation in PR.

### Verification

- [X] T095 [US4] Run US4 grep gate: `Select-String -Path "frontend/src/**/*.tsx" -Pattern "<button " -SimpleMatch | Where-Object { $_.Path -notmatch "CategoryChips|SizePicker|ColorPicker|FilterPanel" }` â†’ zero matches; record in PR. (After Phase 12b: the `Where-Object` filter is dropped â€” zero matches anywhere.)
- [X] T096 [US4] Run LinkButton verification: `Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "LinkButton" -SimpleMatch` â†’ zero matches; record in PR.
- [X] T096a [US4] Run raw `<a href>` for in-app routing grep: `Select-String -Path "frontend/src/**/*.tsx" -Pattern "<a href=`\"/" -SimpleMatch` â†’ zero matches (use HeroUI `Link` or `Button as={Link}`); record in PR.
- [X] T097 [US4] Run `npm --prefix frontend run build` â€” must pass with zero type errors.
- [X] T098 [US4] Run `npm --prefix frontend test` â€” must pass; record runtime delta.
- [X] T099 [US4] Run `npm --prefix frontend run i18n:check` and `npm --prefix frontend run lint` â€” both must pass.
- [X] T099-vm [US4] **SC-009 Visual Verification Matrix** for every modified surface (including each migrated `LinkButton` consumer and each adopted `Toolbar` cluster). Record per-surface result table in PR.

**Checkpoint**: Zero raw `<button>` outside the four RAC files (which migrate in Phase 12b). `LinkButton.tsx` deleted. Grouped action bars wrapped in HeroUI `Toolbar`. SC-001 satisfied for buttons.

---

## Phase 7: User Story 5 â€” Inputs, Selects, Textareas, Search, Groups (Priority: P2)

**Goal**: Replace raw `<input>` / `<select>` / `<textarea>` with HeroUI v3 form primitives per `data-model.md` Anatomy A.16 / A.18 / A.19, preserving react-hook-form + Zod via `<Controller>` (per `research.md` آ§4). Specifically:

- Text inputs â†’ `TextField` + `Label` + `Input` + optional `Description` + optional `FieldError` (Anatomy A.16).
- Numeric inputs â†’ `NumberField` (Anatomy A.18).
- Search inputs â†’ `SearchField` (Anatomy A.18) â€” mandatory, not conditional.
- Selects â†’ `Select` compound (Anatomy A.19).
- Textareas â†’ `TextArea` (capital A) inside `TextField` (Anatomy A.16). **Banned**: `Textarea` lowercase.
- Prefix/suffix affordances â†’ `InputGroup` + `InputGroup.Prefix` / `InputGroup.Suffix` (Anatomy A.18).
- Semantically grouped sections â†’ `Fieldset` + `Fieldset.Legend` + `Fieldset.Group` + optional `Fieldset.Actions` (Anatomy A.18).

Documented exception: native `<input type="file">` (Exception 3).

**Independent Test**: Forms across auth, checkout, address book, inquiries, admin render HeroUI form components. Existing Vitest form-submission tests stay green. Zod errors surface via `<FieldError>` inside `<TextField>`. Search inputs use `<SearchField>` (mandatory). Address-block / contact-block / shipping-block sections wrapped in `<Fieldset>`. Password fields use `<InputGroup>` with a reveal `Suffix`.

### Raw `<input>` sweep (excluding file inputs per Exception 3)

- [ ] T100 [P] [US5] Replace raw `<input>` in `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx` row editors with HeroUI `<Input>` in `<TextField>`
- [ ] T101 [P] [US5] Replace raw `<input>` in `frontend/src/features/addresses/components/AddressForm.tsx` with HeroUI `<Input>` via `<Controller>`; preserve Zod schema and `useForm` call
- [ ] T102 [P] [US5] Replace raw `<input>` in `frontend/src/features/admin/catalog/components/ProductVariantsSection.tsx` with HeroUI `<Input>`/`<NumberField>` for SKU/stock
- [ ] T103 [P] [US5] Replace non-file raw `<input>` in `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` with HeroUI `<Input>` via `<Controller>`
- [ ] T104 [P] [US5] Replace raw `<input>` in `frontend/src/features/auth/components/FormField.tsx` with HeroUI `<Input>`; preserve external public props
- [ ] T105 [P] [US5] Replace raw `<input>` in `frontend/src/features/catalog/components/FilterPanel.tsx` with HeroUI `<Input>`/`<NumberField>`/`<Slider>` as appropriate
- [ ] T106 [P] [US5] Replace raw `<input>` in `frontend/src/features/catalog/components/SearchInput.tsx` with HeroUI `<SearchField>`; preserve `onCommit` semantics
- [ ] T107 [P] [US5] Replace raw `<input>` in `frontend/src/features/checkout/components/AddressStep.tsx` with HeroUI `<Input>` via `<Controller>`
- [ ] T108 [P] [US5] Replace raw `<input>` in `frontend/src/features/inquiries/components/InquiryForm.tsx` with HeroUI `<Input>` via `<Controller>`
- [ ] T109 [P] [US5] Confirm `frontend/src/shared/components/Field.tsx` `Controller` integration is intact post-US4 button sweep. **No re-audit of anatomy needed** â€” full v3 anatomy compliance was recorded in T008; this task only verifies that US4 edits did not break the form-field public props contract (`label`, `value`, `onChange`, `type?`, `required?`, `maxLength?`, `dir?`, `description?`, `placeholder?`, `errorMessage?`). Record "No regression" or specific breakage found in PR.

### Raw `<select>` sweep

- [ ] T110 [P] [US5] Replace raw `<select>` in `frontend/src/features/admin/audit/AuditLogPage.tsx` filter row with HeroUI `<Select>` (use `SelectField` shim if API matches)
- [ ] T111 [P] [US5] Replace raw `<select>` in `frontend/src/features/admin/catalog/AdminProductsListPage.tsx` filters with HeroUI `<Select>` via `SelectField`
- [ ] T112 [P] [US5] Replace raw `<select>` in `frontend/src/features/admin/catalog/AdminProductCreatePage.tsx` with HeroUI `<Select>` via `<Controller>` + `SelectField`
- [ ] T113 [P] [US5] Replace raw `<select>` in `frontend/src/features/admin/catalog/components/ProductMasterForm.tsx` with HeroUI `<Select>` via `<Controller>` + `SelectField`
- [ ] T114 [P] [US5] Replace raw `<select>` in `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` (kind selector) with HeroUI `<Select>` via `<Controller>`
- [ ] T115 [P] [US5] Replace raw `<select>` in `frontend/src/features/admin/components/StatusFilterDropdown.tsx` with HeroUI `<Select>` (or `<Dropdown>`)
- [ ] T116 [P] [US5] Replace raw `<select>` in `frontend/src/features/catalog/components/SortSelect.tsx` with HeroUI `<Select>` via `SelectField`
- [ ] T117 [P] [US5] Verify `frontend/src/features/addresses/components/GovernorateSelect.tsx` uses HeroUI `<Select>` via `SelectField`; record audit result

### Raw `<textarea>` sweep â€” use `TextArea` (capital A)

- [ ] T118 [P] [US5] Replace raw `<textarea>` in `frontend/src/features/admin/catalog/AdminProductCreatePage.tsx` with HeroUI `<TextArea>` (capital A) inside `<TextField>` via `<Controller>` per Anatomy A.16. **Banned**: `Textarea` lowercase.
- [ ] T119 [P] [US5] Replace raw `<textarea>` in `frontend/src/features/admin/catalog/components/ProductMasterForm.tsx` with HeroUI `<TextArea>` inside `<TextField>` via `<Controller>` per Anatomy A.16.
- [ ] T120 [P] [US5] Replace raw `<textarea>` in `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` instructions ar/en with HeroUI `<TextArea>` inside `<TextField>` via `<Controller>` per Anatomy A.16.
- [ ] T121 [P] [US5] Replace raw `<textarea>` in `frontend/src/features/admin/components/AdminProofReview.tsx` (reject reason) with HeroUI `<TextArea>` inside `<TextField>` per Anatomy A.16.
- [ ] T122 [P] [US5] Replace raw `<textarea>` in `frontend/src/features/admin/components/AdminTransitionActions.tsx` (transition note) with HeroUI `<TextArea>` inside `<TextField>` per Anatomy A.16.
- [ ] T123 [P] [US5] Replace raw `<textarea>` in `frontend/src/features/inquiries/components/InquiryForm.tsx` with HeroUI `<TextArea>` inside `<TextField>` via `<Controller>` per Anatomy A.16.
- [ ] T124 [P] [US5] Replace raw `<textarea>` in `frontend/src/features/orders/components/CancelOrderButton.tsx` (cancellation reason) with HeroUI `<TextArea>` inside `<TextField>` via `<Controller>` per Anatomy A.16.

### `InputGroup` adoption for prefix/suffix affordances (FR-010f, Anatomy A.18)

- [ ] T124a [P] [US5] Audit `frontend/src/features/auth/LoginPage.tsx` and `RegisterPage.tsx` password fields; wrap the password `<Input type="password">` in HeroUI `<InputGroup>` with a reveal-toggle `Suffix` (eye / eye-off Lucide icon) and a HeroUI `<Button isIconOnly>` trigger.
- [ ] T124b [P] [US5] Audit `frontend/src/features/admin/catalog/AdminProductCreatePage.tsx` and `ProductMasterForm.tsx` price / SKU fields; wrap in HeroUI `<InputGroup>` with currency / SKU adornments via `Prefix`/`Suffix` slots per Anatomy A.18 (where the visual indicator already exists).
- [ ] T124c [P] [US5] Audit catalog and admin search inputs (already migrated to `SearchField` in T106/T111) and confirm the built-in clear button is used â€” no separate `InputGroup` needed for those.

### `Fieldset` adoption for semantically grouped form sections (FR-010e, Anatomy A.18)

- [ ] T124d [P] [US5] Wrap address-block fields in `frontend/src/features/addresses/components/AddressForm.tsx` in HeroUI `<Fieldset>` + `<Fieldset.Legend>` (e.g., "Shipping address") + `<Fieldset.Group>` per Anatomy A.18.
- [ ] T124e [P] [US5] Wrap address-step fields in `frontend/src/features/checkout/components/AddressStep.tsx` in HeroUI `<Fieldset>` per Anatomy A.18.
- [ ] T124f [P] [US5] Audit `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` for semantic sub-sections (kind / display / instructions); wrap each in `<Fieldset>` per Anatomy A.18.
- [ ] T124g [P] [US5] Audit `frontend/src/features/inquiries/components/InquiryForm.tsx` for semantic sub-sections (contact info / inquiry body); wrap each in `<Fieldset>` per Anatomy A.18 if the form has multiple semantic sections.

### Verification

- [ ] T125 [US5] Run US5 grep gates: (a) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "<input " -SimpleMatch | Where-Object { $_ -notmatch 'type="file"' }` returns zero matches; (b) `<select ` returns zero; (c) `<textarea ` returns zero; (d) banned-v2-names grep `\bTextarea\b` (case-sensitive) returns zero. Record all four in PR.
- [ ] T126 [US5] Run `npm --prefix frontend test` â€” must pass with all existing form tests green; record runtime delta.
- [ ] T127 [US5] Run `npm --prefix frontend run build` â€” must pass with zero type errors; record bundle-size delta.
- [ ] T128 [US5] Run `npm --prefix frontend run i18n:check` and `npm --prefix frontend run lint` â€” both must pass.
- [ ] T128-vm [US5] **SC-009 Visual Verification Matrix** for every modified form surface in this batch (especially: validation/error states, disabled states, RTL field alignment, label association, focus ring on each interactive element). Record per-surface result table in PR.

**Checkpoint**: Every form input uses HeroUI v3 primitives. react-hook-form + Zod preserved. SC-001 satisfied for inputs/selects/textareas/search. `InputGroup` adopted for adornments. `Fieldset` adopted for grouped sections.

---

## Phase 8: User Story 6 â€” Separators (Priority: P3)

**Goal**: Replace `<hr>` and manual `border-t`/`border-b` separators with HeroUI v3 `<Separator>` per `data-model.md` Anatomy A.21. **Banned v2 name**: `Divider` â€” v3 renamed it to `Separator`. Tasks, code, and PR titles MUST NOT reference `Divider`.

**Independent Test**: Grep for `<hr ` returns zero matches. Banned-v2-name grep for `\bDivider\b` returns zero matches in implementation. Visible-line separators inherit border color from theme.

- [ ] T129 [P] [US6] Replace raw `<hr>` in `frontend/src/shared/components/Header.tsx` with HeroUI `<Separator orientation="horizontal" />` per Anatomy A.21.
- [ ] T130 [P] [US6] Audit `frontend/src/features/cart/components/CartButton.tsx` for `border-t`/`border-b` row separators inside the cart Drawer; replace with HeroUI `<Separator>` per Anatomy A.21 where the line is the sole purpose of the border (do NOT replace borders that also provide background separation or container outlines).
- [ ] T131 [P] [US6] Audit `frontend/src/features/checkout/CheckoutPage.tsx` for `border-t`/`border-b` summary-row separators; replace with HeroUI `<Separator>` per Anatomy A.21.
- [ ] T132 [P] [US6] Audit `frontend/src/features/orders/OrderDetailPage.tsx` and `frontend/src/features/admin/AdminOrderDetailPage.tsx` for line-item separators; replace with HeroUI `<Separator>` per Anatomy A.21.
- [ ] T133 [P] [US6] Audit `frontend/src/features/admin/components/AdminSidebar.tsx` for section separators; replace with HeroUI `<Separator>` per Anatomy A.21.
- [ ] T134 [US6] Run US6 grep gates: (a) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "<hr " -SimpleMatch` â†’ zero matches; (b) `Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "\\bDivider\\b"` â†’ zero matches in implementation. Record both in PR.
- [ ] T135 [US6] Run `npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run i18n:check`, `npm --prefix frontend run lint` â€” all must pass.
- [ ] T135-vm [US6] **SC-009 Visual Verification Matrix** for every modified surface in this batch. Record per-surface result table in PR.

**Checkpoint**: Zero `<hr>`. Visible-line separators use HeroUI `<Separator>`. Banned `Divider` name absent from implementation.

---

## Phase 9: User Story 7 â€” Header Composition (Priority: P3)

**Goal**: Migrate storefront `Header.tsx` to an **Approved Composition Component** built **only** from HeroUI v3 primitives and Lucide icons per FR-007 + FR-018. HeroUI v3 ships **no** `Navbar` primitive (research آ§1). **Banned**: raw `<header>` / `<nav>` chrome carrying tokens; the v2-era `Navbar` name; any non-HeroUI third-party UI primitive.

**Independent Test**: Header renders on `/`, RTL/LTR toggle places brand at inline-start, mobile menu opens as a HeroUI `<Drawer>`, responsive collapse breakpoint unchanged. The grep for `<header ` outside the `Header.tsx` file returns zero (the single `<header>` element inside `Header.tsx` is permitted only as the root semantic landmark; otherwise the wrapper is a HeroUI `Surface` or `Toolbar`).

- [ ] T136 [US7] Refactor `frontend/src/shared/components/Header.tsx` as a thin Approved Composition Component over HeroUI v3 primitives ONLY (per FR-018; per `data-model.md` آ§ Approved Composition Components). Specifically:
  - **Outer wrapper**: HeroUI `<Surface>` (per Anatomy A.21) with `variant="default"` and a `className` carrying sticky positioning utilities (`sticky top-0 z-40`). If the design requires the `<header>` semantic landmark, the `Surface` may be wrapped in a single root `<header role="banner">` element â€” no other raw chrome elements are permitted.
  - **Brand area**: `<Button as={Link} to="/" variant="ghost">` (per Anatomy A.14 + react-router `Link`); brand text uses HeroUI `<Typography>` (per Anatomy A.24); optional Lucide brand-mark icon as a sibling.
  - **Nav links** (desktop): HeroUI `<Link as={RouterLink}>` (per Anatomy A.23) OR `<Button as={Link} variant="ghost" size="sm">` for button-styled nav items.
  - **Mobile-menu trigger**: `<Button isIconOnly variant="ghost" aria-label={t('header.openMenu')}>` with a Lucide hamburger icon.
  - **Mobile menu body**: existing HeroUI `<Drawer>` (per Anatomy A.7); no change to drawer behavior.
  - **Bottom edge**: HeroUI `<Separator orientation="horizontal" />` (already migrated in T129).
  - **Cart-trigger badge**: HeroUI `<Badge>` + `<Badge.Anchor>` (already migrated in T045a).
  - **Forbidden**: hand-styled `<header>` chrome with token classes; any `<div class="bg-content* border-divider">` shell that could be a `Surface` or `Card` instead; raw `<button>` / `<a href>` for nav.
- [ ] T137 [US7] Confirm the `if (isAdmin) return null;` guard is preserved.
- [ ] T138 [US7] Confirm sticky positioning (`sticky top-0 z-40` or equivalent) is moved to the `Surface`'s `className` (NOT applied to a hand-styled wrapper div). Confirm RTL parity via logical CSS only.
- [ ] T139 [US7] Visual gate: load `/` in dev (`npm --prefix frontend run dev`), toggle theme/direction, resize to 375/768/1280px; record screenshots per `docs/screenshots/README.md`. This is the per-batch surface for the **SC-009 Visual Verification Matrix**.
- [ ] T140 [US7] Run `npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run i18n:check`, `npm --prefix frontend run lint` â€” all must pass.
- [ ] T140-vm [US7] **SC-009 Visual Verification Matrix** for the storefront header (en LTR + ar RTL أ— light + dark أ— 375/768/1280 + mobile menu open/closed + sticky scroll behavior + keyboard reach + visible focus + Escape closes Drawer). Record per-state result table in PR.

**Checkpoint**: Header is an Approved Composition Component over HeroUI v3 primitives only. Note in PR that v3 ships no `Navbar` (composition is the v3-idiomatic answer).

---

## Phase 10: User Story 8 â€” Pagination (Priority: P3)

**Goal**: Delete custom `PaginationBar.tsx` and route `CatalogPage` to the existing `PaginationControls` shim (a thin Approved Composition Component over the HeroUI v3 `Pagination` compound per Anatomy A.4: `Pagination.Content` / `Pagination.Item` / `Pagination.Link` / `Pagination.Previous` / `Pagination.Next` / `Pagination.Ellipsis` / optional `Pagination.Summary`). **Banned**: `PaginationBar` name in implementation after deletion.

**Independent Test**: Catalog renders HeroUI `<Pagination>` compound (via `PaginationControls`) when `totalPages > 1`. RTL arrow directions follow `<html dir="rtl">` correctly (HeroUI handles this via React Aria). `PaginationBar.tsx` no longer exists.

- [ ] T141 [US8] Update `frontend/src/features/catalog/CatalogPage.tsx` to import `PaginationControls` from `frontend/src/shared/components/PaginationControls.tsx`; preserve `page` / `totalPages` / `onPageChange` props and the "X results" summary text adjacent to `PaginationControls`. The summary text MAY use HeroUI `Pagination.Summary` if the shim exposes it; otherwise a HeroUI `<Typography>` sibling carrying the count is acceptable.
- [ ] T142 [US8] Delete `frontend/src/features/catalog/components/PaginationBar.tsx` (per `data-model.md` آ§ Deleted Files).
- [ ] T143 [US8] Run US8 grep gate: `Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "PaginationBar" -SimpleMatch` â†’ zero matches; record in PR.
- [ ] T144 [US8] Run `npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run i18n:check`, `npm --prefix frontend run lint` â€” all must pass; if a `CatalogPage` test asserts on `PaginationBar` text, update it to assert on the new `PaginationControls`-emitted DOM (this is one of the few places a test update is permitted, per the public-contract-change rule).
- [ ] T144-vm [US8] **SC-009 Visual Verification Matrix** for the catalog pagination surface (en LTR + ar RTL أ— light + dark أ— 375/768/1280 + first/middle/last page states + disabled state when only one page + RTL arrow direction). Record per-state result table in PR.

**Checkpoint**: `PaginationBar.tsx` deleted. All pagination via HeroUI `Pagination` compound consumed through `PaginationControls`.

---

## Phase 11: User Story 9 â€” Alerts, Banners & Toast Audit (Priority: P3)

**Goal**: Migrate three custom banner components (`DowntimeBanner`, `ForbiddenBanner`, `QueryErrorState`) to HeroUI v3 `<Alert>` per `data-model.md` Anatomy A.3 (`Alert` + `Alert.Indicator` + `Alert.Content` + `Alert.Title` + `Alert.Description`). Public props contracts unchanged so consumers are not touched. Audit notification surfaces and route transient feedback through the imperative `toast()` API per Anatomy A.20 (FR-010d). **Banned**: v2-era `Alert.Icon` slot â€” v3 uses `Alert.Indicator`.

**Independent Test**: Triggering downtime / 403 / query error renders HeroUI `<Alert>` with correct color and dismiss/retry, using v3 anatomy (no `Alert.Icon`). Triggering a save success / save failure surfaces a HeroUI toast via `toast.success(â€¦)` / `toast.error(â€¦)` from `@heroui/react`. Existing `ForbiddenBanner.test.tsx` and `QueryErrorState.test.tsx` stay green.

### Banner internals â†’ HeroUI `Alert` (Anatomy A.3)

- [ ] T145 [P] [US9] Migrate `frontend/src/shared/components/DowntimeBanner.tsx` internals to HeroUI `<Alert color="danger" variant="flat" isDismissible onDismiss={dismiss}>` per Anatomy A.3 with: `<Alert.Indicator>` containing the Lucide `CloudOff` icon; `<Alert.Content>` containing `<Alert.Title>` + `<Alert.Description>`. Preserve `role="alert"` semantics (`Alert` emits this by default). Public props unchanged. **Banned**: `<Alert.Icon>`.
- [ ] T146 [P] [US9] Migrate `frontend/src/shared/components/ForbiddenBanner.tsx` internals to HeroUI `<Alert color="warning" variant="flat" isDismissible onDismiss={() => setForbiddenMessage(null)}>` per Anatomy A.3 with `<Alert.Indicator>` containing the Lucide `AlertTriangle` icon, and `<Alert.Content>` containing `<Alert.Title>` + `<Alert.Description>`. Preserve the `useSyncExternalStore` subscription and "land then dismiss" timing. Public props unchanged.
- [ ] T147 [P] [US9] Migrate `frontend/src/shared/components/QueryErrorState.tsx` internals to HeroUI `<Alert color="danger" variant="flat">` per Anatomy A.3 with `<Alert.Indicator>` containing a Lucide `AlertCircle` (or equivalent) icon, `<Alert.Content>` containing `<Alert.Title>` + `<Alert.Description>`, and the retry `<Button>` placed in `<Alert.Content>` (or as a same-row sibling) with `onPress={onRetry}`. Public props `{ message, retryLabel, onRetry }` unchanged.

### Toast audit (FR-010d, Anatomy A.20)

- [ ] T147a [US9] Audit `frontend/src/` for ad-hoc transient notification surfaces: inline success-message divs, custom snackbar implementations, and `setTimeout`-driven toast-style banners. (`console.log` statements are developer debugging output â€” not user-facing surfaces; do **not** replace them.) For each user-visible transient surface found, replace with the imperative `toast()` API from `@heroui/react` (`toast.success(â€¦)`, `toast.error(â€¦)`, `toast.promise(â€¦)`). Persistent / non-dismissible feedback stays as `Alert`. Record an inventory in the PR description (file path, current pattern, replacement call). If there are no ad-hoc transient surfaces, record "No ad-hoc transient surfaces found."
- [ ] T147b [US9] Confirm `frontend/src/app/providers.tsx` already wires `Toast.Provider` (or equivalent toast queue) per Anatomy A.20. Record "PASS" or drift in PR (provider modifications are out of scope unless the audit T007 reported drift; in that case file a follow-up ticket).

### Verification

- [ ] T148 [US9] Visual gate: load each banner in dev (force a downtime, force a 403, force a query error); confirm both themes أ— both directions; trigger a success and a failure to surface a `toast.success(â€¦)` and a `toast.error(â€¦)` and visually verify both. Record screenshots per `docs/screenshots/README.md`.
- [ ] T149 [US9] Run `npm --prefix frontend test` â€” `ForbiddenBanner.test.tsx` and `QueryErrorState.test.tsx` must pass without modification.
- [ ] T150 [US9] Run `npm --prefix frontend run build`, `npm --prefix frontend run i18n:check`, `npm --prefix frontend run lint` â€” all must pass.
- [ ] T150a [US9] Run banned-v2-name grep `Select-String -Path "frontend/src/**/*.tsx" -Pattern "Alert\\.Icon" -SimpleMatch` â†’ zero matches; record in PR.
- [ ] T150-vm [US9] **SC-009 Visual Verification Matrix** for each banner surface and each toast surface (en LTR + ar RTL أ— light + dark أ— 375/768/1280 + dismissible-toast keyboard navigation + Escape close). Record per-surface result table in PR.

**Checkpoint**: Three banner components are HeroUI v3 `Alert` internally (with v3 anatomy); consumers unchanged. Transient notifications routed through `toast()`. `Toast.Provider` audit recorded.

---

## Phase 12: User Story 10 â€” Final Sweep: Typography, AlertDialog, EmptyState, Remaining Primitives (Priority: P3)

**Goal**: Land four substantive sweeps:

1. **`Typography` adoption** (FR-010b, Anatomy A.24) for hand-styled `<h1>`/`<h2>`/`<h3>`/`<p>` patterns.
2. **`AlertDialog` split** (FR-010c, Anatomy A.6) for confirm / destroy / irreversible-action dialogs (cancel order, delete payment method, approve/reject proof, transition order status). Generic editing/multi-step modals stay on `Modal`.
3. **`EmptyState.tsx` Approved Composition Component refactor** â€” internals compose HeroUI `Card` + `Card.Content` + Lucide icon + `Typography` + optional `Button`. **No `EmptyState` HeroUI import** â€” v3 ships no such primitive (per `data-model.md` آ§ Approved Composition Components).
4. **Remaining primitive sweep** â€” `Spinner` / `Skeleton` / `Tooltip` / `Avatar` / `Switch` / `Checkbox` / `Accordion` / `Breadcrumbs` / `Popover` gaps.

**Banned in this batch**: `<EmptyState>` import (v3 doesn't export it), `<Spinner label="â€¦">` (v3 has no `label` prop), `<Skeleton><div /></Skeleton>` (v3 is self-closing).

**Independent Test**: All grep gates in `contracts/exceptions-register.md` "Audit Procedure" return their expected results (per T165 below). The `EmptyState.tsx` refactor preserves its public props contract (`{ icon?, title, subtitle?, action? }`) so consumers in T152â€“T156 work without further changes.

### `EmptyState` Approved Composition Component refactor (no HeroUI primitive import)

- [ ] T151 [US10] Refactor `frontend/src/shared/components/EmptyState.tsx` internals as a thin Approved Composition Component over HeroUI v3 primitives ONLY (per FR-018; per `data-model.md` آ§ Approved Composition Components). Specifically: outer HeroUI `<Card>` (per Anatomy A.1) + `<Card.Content>` (centered, padded); icon slot rendering the Lucide icon prop with `aria-hidden="true"` when decorative; heading via HeroUI `<Typography>` (per Anatomy A.24) as `Card.Title`-style heading; subtitle via HeroUI `<Typography>` as muted body; optional action via HeroUI `<Button>` (per Anatomy A.14) inside `<Card.Footer>` or as a same-card sibling. Preserve public props `{ icon?, title, subtitle?, action? }` exactly. **Forbidden**: any import of a non-existent `EmptyState` from `@heroui/react`; any non-Lucide icon; any raw HTML control with a HeroUI equivalent. Add a same-file comment citing Anatomy A.1 + A.24 and stating "HeroUI v3 ships no `EmptyState` primitive; this file is the Approved Composition Component."
- [ ] T152 [P] [US10] Replace inline hand-styled empty divs in `frontend/src/features/admin/AdminOrdersListPage.tsx` with the refactored `<EmptyState>` shim (no consumer-side change beyond the shim's public-props contract).
- [ ] T153 [P] [US10] Replace inline hand-styled empty divs in `frontend/src/features/admin/AdminUsersPage.tsx` with the `<EmptyState>` shim.
- [ ] T154 [P] [US10] Replace inline hand-styled empty divs in `frontend/src/features/admin/catalog/AdminProductsListPage.tsx` with the `<EmptyState>` shim.
- [ ] T155 [P] [US10] Replace inline hand-styled empty divs in `frontend/src/features/admin/audit/AuditLogPage.tsx` with the `<EmptyState>` shim.
- [ ] T156 [P] [US10] Replace inline hand-styled empty divs in `frontend/src/features/admin/AdminInquiriesPage.tsx` with the `<EmptyState>` shim.
- [ ] T156a [P] [US10] Replace inline hand-styled empty divs in `frontend/src/features/orders/OrdersListPage.tsx`, `frontend/src/features/cart/CartPage.tsx` (empty cart), and `frontend/src/features/checkout/components/CheckoutEmptyState.tsx` (or its consumer) with the `<EmptyState>` shim.

### `Typography` migration (FR-010b, Anatomy A.24)

- [ ] T156b [P] [US10] **Pre-step (mandatory before editing)**: run `Select-String -Path "frontend/src/**/*.tsx" -Pattern "<h[123][^>]*class" -SimpleMatch` and `Select-String -Path "frontend/src/**/*.tsx" -Pattern '<p[^>]*class="text-sm' -SimpleMatch`; record the full match list (file path + line number) in `progress.txt` â€” this is the bounded scope inventory for this task. Then, for each matched file, replace hand-styled headings (`<h1 class="text-2xl font-semibold">`, `<h2 class="text-lg â€¦">`, `<h3 class="text-base â€¦">`) and hand-styled paragraphs / prose blocks with HeroUI `<Typography>` per Anatomy A.24 using the appropriate `Type` / `Modifier` classes. For Card-internal headings, use `<Card.Title>` / `<Card.Description>` (which already render `h3`/`p` per Anatomy A.1) instead of `<Typography>` directly. **Post-step grep gate**: re-run both patterns against modified files; must return zero matches. Record inventory + gate result in PR.
- [ ] T156c [P] [US10] Audit `frontend/src/features/orders/OrderDetailPage.tsx` and other long-form description surfaces for prose blocks; wrap rich-text blocks in HeroUI `<Typography>` `Prose` mode per Anatomy A.24.

### `AlertDialog` split (FR-010c, Anatomy A.6)

- [ ] T156d [P] [US10] Migrate the cancellation confirmation modal in `frontend/src/features/orders/components/CancelOrderButton.tsx` from `Modal` to HeroUI `<AlertDialog>` per Anatomy A.6 (`AlertDialog` + `AlertDialog.Trigger` + `AlertDialog.Backdrop` + `AlertDialog.Container` + `AlertDialog.Dialog` + `AlertDialog.Header` + `AlertDialog.Heading` + `AlertDialog.Body` + `AlertDialog.Footer` + `AlertDialog.CloseTrigger`). Preserve cancellation-reason `<TextArea>` inside `<AlertDialog.Body>` (already migrated in T124). Confirm/cancel buttons in `<AlertDialog.Footer>`.
- [ ] T156e [P] [US10] Migrate the approve/reject confirmation in `frontend/src/features/admin/components/AdminProofReview.tsx` to HeroUI `<AlertDialog>` per Anatomy A.6. Reject reason `<TextArea>` inside `<AlertDialog.Body>` (already migrated in T121).
- [ ] T156f [P] [US10] Migrate the order-status-transition confirmation in `frontend/src/features/admin/components/AdminTransitionActions.tsx` to HeroUI `<AlertDialog>` per Anatomy A.6. Transition note `<TextArea>` inside `<AlertDialog.Body>` (already migrated in T122).
- [ ] T156g [P] [US10] Audit `frontend/src/features/admin/catalog/AdminPaymentMethodsPage.tsx` for delete-payment-method confirmation; if present, migrate to HeroUI `<AlertDialog>` per Anatomy A.6. If no such confirmation exists, record "No delete confirmation found."
- [ ] T156h [P] [US10] Verify generic editing modals (e.g., admin product edit form, address editor) stay on HeroUI `<Modal>` per Anatomy A.5 â€” they are NOT migrated to `AlertDialog` (which is for confirm/destroy only).

### Remaining primitive sweep

- [ ] T157 [P] [US10] Audit `frontend/src/` for hand-styled `animate-spin` indicators; replace with HeroUI `<Spinner size="sm" color="current" />` per Anatomy A.20. Provide screen-reader text via a sibling `<span className="sr-only">{t('common.spinner.srLabel')}</span>` (the v3 `Spinner` has **no** `label` prop). **Forbidden**: `<Spinner label="â€¦">` (v2 syntax).
- [ ] T158 [P] [US10] Audit `frontend/src/` for hand-styled `animate-pulse` skeleton boxes; replace with HeroUI `<Skeleton className="â€¦" animationType="shimmer" />` (self-closing element with shape via `className`) per Anatomy A.20. Verify no `animate-pulse` blocks remain in non-Table contexts after T034. **Forbidden**: `<Skeleton><div /></Skeleton>` v2-style wrapping.
- [ ] T159 [P] [US10] **Pre-step**: run `Select-String -Path "frontend/src/**/*.tsx" -Pattern " title=" -SimpleMatch` and record all matches in PR. For each match where a `title` attribute is the only focus-accessible label, convert to HeroUI `<Tooltip>` per Anatomy A.8 â€” covering at minimum: (a) cart Drawer header item names, (b) admin row-action icon-only buttons, (c) header icon-only buttons (theme toggle, lang switcher). For remaining `title=` matches not converted, record a rationale in PR (e.g., "native browser tooltip acceptable for decorative attribute"). Icon-only `<Button isIconOnly>` elements MUST carry an `aria-label`, not a `title` attribute.
- [ ] T160 [P] [US10] Audit `frontend/src/` for hand-styled avatar imgs (`<img class="rounded-full">`); replace with HeroUI `<Avatar><Avatar.Image src={â€¦} alt={â€¦} /><Avatar.Fallback>{initials}</Avatar.Fallback></Avatar>` per Anatomy A.22 (admin user list, admin header user-menu trigger).
- [ ] T161 [P] [US10] Audit `frontend/src/` for custom toggle/switch widgets (`<input type="checkbox" role="switch">`); replace with HeroUI `<Switch isSelected onChange>` per Anatomy A.15 via `<Controller>` if in a form, controlled directly otherwise.
- [ ] T162 [P] [US10] Audit `frontend/src/` for raw `<input type="checkbox">` (boolean flags in admin product/payment-method forms); replace with HeroUI `<Checkbox isSelected onChange>` per Anatomy A.15 via `<Controller>`.
- [ ] T163 [P] [US10] Audit `frontend/src/features/admin/components/AdminSidebar.tsx` for custom collapsible / `<details>` patterns; if found: use HeroUI `<Accordion>` (per Anatomy A.10) when multiple collapsible sections share selection state (only one section open at a time), or HeroUI `<DisclosureGroup>` when sections collapse independently of each other. If the sidebar has no collapsible groups, record "No collapsible groups in AdminSidebar."
- [ ] T164 [P] [US10] Run `Select-String -Path "frontend/src/features/admin/**/*.tsx" -Pattern "back.*list|â†گ " -SimpleMatch` to locate hand-styled "back to list" anchors or breadcrumb divs. For each match: if the link communicates positional hierarchy (e.g., "Admin > Products > Edit"), migrate to HeroUI `<Breadcrumbs>` per Anatomy A.11. If the match is a simple back-navigation button with no hierarchy context, keep it as `<Button as={Link}>`. If no matches are found, record "No breadcrumb candidates found" in PR.

### Final acceptance gate

- [ ] T165 [US10] Run the **full extended exception-register + drift audit** per `contracts/exceptions-register.md` "Audit Procedure". Record all results in PR:
  - `<table ` â†’ **zero** matches.
  - `<hr ` â†’ **zero** matches.
  - `<dialog` â†’ **zero** matches.
  - `type="file"` â†’ **only** the Exception 3 files (`PaymentProofUpload.tsx`, `ProductImagesSection.tsx`, and `PaymentMethodForm.tsx` if present).
  - `<button[^>]*role="radio"` â†’ BEFORE Phase 12b: only the 4 RAC files; AFTER Phase 12b: **zero**. *(If T-RAC-Eval fails and Exception 1 is re-opened, update this expectation and `contracts/exceptions-register.md` before recording the audit.)*
  - `<button ` (anywhere) â†’ BEFORE Phase 12b: only the 4 RAC files; AFTER Phase 12b: **zero**. *(If Exception 1 is re-opened, add `| Where-Object { $_.Path -notmatch 'CategoryChips|SizePicker|ColorPicker|FilterPanel' }` to the gate and note in PR.)*
  - `<input ` (excluding `type="file"`) â†’ **zero**.
  - `<select ` â†’ **zero**.
  - `<textarea ` â†’ **zero**.
  - `<a href="/â€¦">` for in-app routing â†’ **zero** (use HeroUI `Link` or `Button as={Link}`).
  - `<nav ` outside Approved Composition Components (`Header.tsx`, `AdminHeader.tsx`, `AdminSidebar.tsx`) â†’ **zero**.
  - `<header ` outside Approved Composition Components (`Header.tsx`, `AdminHeader.tsx`) â†’ **zero**.
  - `<footer ` outside Approved Composition Components (`Footer.tsx`, `PublicLayout.tsx`) â†’ **zero**. *(Prerequisite: verify `Footer.tsx` and `PublicLayout.tsx` exist in `frontend/src/` before relying on this gate; if either file is absent, remove it from the allowlist and note in PR to avoid a falsely-passing gate.)*
  - `from ['"]framer-motion['"]` in app code (`.tsx`, `.ts`) â†’ **zero**.
  - **FR-019 theme source-of-truth** (Constitution Principle VIII): `Select-String -Path "frontend/tailwind.config.*" -Pattern "theme.*extend" -SimpleMatch` â†’ must match **only** pre-existing documented blocks; **zero** new `theme.extend` entries added during migration (compare against baseline in `progress.txt`). Also run `Select-String -Path "frontend/src/styles/globals.css" -Pattern "^\s*--(?!heroui)" -SimpleMatch` â†’ any new CSS custom property not in the HeroUI token namespace must have a same-line justification comment; **zero** unjustified non-HeroUI properties. Record both results in PR.
  - `InputOTP` in `frontend/src/**/*.tsx` â†’ **zero** matches (reserved for future use per FR-010g; MUST NOT be used during this migration).
  - Banned-v2-names grep: `\b(CardBody|CardHeader|CardFooter|TableHeader|TableColumn|TableBody|TableRow|TableCell|Divider|Navbar|BreadcrumbsItem|LinkButton|PaginationBar)\b` and `Alert\.Icon` â†’ **zero**.
  - Targeted EmptyState HeroUI-import ban: `import\s+\{[^}]*\bEmptyState\b[^}]*\}\s+from\s+['"]@heroui/react['"]` â†’ **zero** (v3 does not export `EmptyState`; local imports from `shared/components/EmptyState` are allowed â€” Approved Composition Component).
  - `\bTextarea\b` (case-sensitive) â†’ **zero**.
  - `isPressable` â†’ **zero**.
  - `<Spinner[^>]*label=` â†’ **zero**.
  - Emoji glyphs in `.tsx` files (Unicode emoji ranges) â†’ **zero** (manual visual review).
  - Hand-styled `<h1>`/`<h2>`/`<h3>` with size/weight Tailwind utilities (e.g., `<h1 class="text-2xl font-semibold">`) â†’ **zero** in modified files post-T156b.
- [ ] T166 [US10] Run `npm --prefix frontend run build` â€” must pass; record final cumulative bundle-size delta vs. baseline.
- [ ] T167 [US10] Run `npm --prefix frontend test` â€” must pass; record final cumulative runtime delta.
- [ ] T168 [US10] Run `npm --prefix frontend run i18n:check` and `npm --prefix frontend run lint` â€” both must pass.
- [ ] T168-vm [US10] **SC-009 Visual Verification Matrix** for every modified surface in this batch (especially: every empty-state surface, every confirm/destroy `AlertDialog`, every typography-migrated heading, every Spinner/Skeleton state). Record per-surface result table in PR.

**Checkpoint**: All raw HTML primitives and hand-styled wrappers (except documented exceptions and the four RAC files awaiting Phase 12b) migrated. SC-001 and SC-002 fully satisfied for everything outside Phase 12b's scope.

---

## Phase 12b: Exception 1 Sunset â€” RAC `role="radio"` Segment Buttons â†’ `ToggleButtonGroup` (Priority: P3)

**Goal**: Migrate the four formerly-Exception-1 files (`CategoryChips.tsx`, `SizePicker.tsx`, `ColorPicker.tsx`, `FilterPanel.tsx` segment buttons) from raw `<button role="radio">` (RAC radiogroup pattern) to HeroUI v3 `ToggleButtonGroup` + `ToggleButton` per `data-model.md` Anatomy A.14 and `research.md` آ§9. Exception 1 is **removed** in this revision (sunset condition triggered by HeroUI v3 shipping `ToggleButtonGroup`).

**Independent Test**: All four files use HeroUI `ToggleButtonGroup` with `selectionMode="single"`, `disallowEmptySelection`, custom-rendered `ToggleButton` children matching the existing chip / size-pill / color-swatch visual; keyboard navigation matches the React Aria radiogroup model; RTL/LTR parity preserved; visible focus rings preserved; no visual regression vs. the previous design. Grep for `<button[^>]*role="radio"` returns **zero**. Grep for `<button ` (anywhere) returns **zero**.

### Pre-flight evaluation spike (mandatory)

- [ ] T-RAC-Eval [US12b] Build a minimal prototype demonstrating that HeroUI `ToggleButtonGroup` + `ToggleButton` can reach the existing visual design for each of the four files **without regression** on (a) keyboard navigation (arrow keys, Home, End, Space, Enter), (b) visible focus ring on the focused item, (c) `<html dir>` mirroring (RTL flips selection direction correctly), (d) chip / size-pill / color-swatch shape (border-radius, padding, swatch-circle for `ColorPicker`). Document the spike result in the PR description with screenshots (en LTR + ar RTL أ— light + dark أ— 375/768/1280px). **Decision rule**: if the spike demonstrates feasibility â†’ proceed with T-RAC-Cat through T-RAC-Filter below. If a concrete blocker emerges (e.g., a `.toggle-button` BEM-chrome property cannot be suppressed without forking the variant) â†’ file a doc-only PR amending `contracts/exceptions-register.md` to **re-open** Exception 1 with the specific blocker (rejected-primitive trail per acceptance criterion 5); the four files retain their current raw `<button role="radio">` JSX until the blocker is resolved.

### Per-file migration (only proceed if T-RAC-Eval succeeds)

- [ ] T-RAC-Cat [P] [US12b] Migrate `frontend/src/features/catalog/components/CategoryChips.tsx` from raw `<button role="radio">` to HeroUI `<ToggleButtonGroup selectionMode="single" disallowEmptySelection isDetached={true} size="sm" aria-label={t('catalog.filters.category')} selectedKeys={selectedId ? [selectedId] : []} onSelectionChange={(keys) => onChange([...keys][0] ?? null)}>` per Anatomy A.14 with `<ToggleButton key={item.id} id={item.id} aria-label={item.label} className={â€¦chip className composed via tailwind-variants extending toggleButtonVariantsâ€¦}>{item.label}</ToggleButton>`. Replace the previous RAC justification comment with `// migrated from RAC role="radio" pattern per exceptions-register.md Exception 1 removal (research آ§9).` (delete the comment in the next revision cycle).
- [ ] T-RAC-Size [P] [US12b] Migrate `frontend/src/features/catalog/components/SizePicker.tsx` from raw `<button role="radio">` to HeroUI `<ToggleButtonGroup selectionMode="single" disallowEmptySelection isDetached={true} size="sm" aria-label={t('catalog.filters.size')}>` per Anatomy A.14 with `<ToggleButton id={size} aria-label={size} className={â€¦size-pill classNameâ€¦}>{size}</ToggleButton>`.
- [ ] T-RAC-Color [P] [US12b] Migrate `frontend/src/features/catalog/components/ColorPicker.tsx` from raw `<button role="radio">` to HeroUI `<ToggleButtonGroup selectionMode="single" disallowEmptySelection isDetached={true} size="sm" aria-label={t('catalog.filters.color')}>` per Anatomy A.14 with `<ToggleButton id={color.id} isIconOnly aria-label={color.name} className={â€¦swatch-circle className with bg-style and ring on data-selectedâ€¦}>{/* swatch-only visual; no children text */}</ToggleButton>`.
- [ ] T-RAC-Filter [P] [US12b] Migrate the segment-button helper in `frontend/src/features/catalog/components/FilterPanel.tsx` from raw `<button role="radio">` to HeroUI `<ToggleButtonGroup selectionMode="single" disallowEmptySelection â€¦>` per Anatomy A.14. The non-radio Apply/Clear buttons in this file are already wrapped in HeroUI `Toolbar` per T077 + T094d.
- [ ] T-RAC-Done [US12b] Run Phase-12b grep gates: (a) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "<button[^>]*role=\"radio\"" -SimpleMatch` â†’ **zero** matches; (b) `Select-String -Path "frontend/src/**/*.tsx" -Pattern "<button " -SimpleMatch` â†’ **zero** matches; (c) the post-Phase-12b T165 audit (re-run if needed). Record all in PR.
- [ ] T-RAC-Tests [US12b] Run `npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run i18n:check`, `npm --prefix frontend run lint` â€” all must pass. Existing keyboard / focus / RTL Vitest tests for the four files MUST stay green; if any test asserts on the raw `<button role="radio">` DOM, update it to assert on the HeroUI `ToggleButton` DOM (this is a public-contract change permitted by the test-update rule).
- [ ] T-RAC-vm [US12b] **SC-009 Visual Verification Matrix** for each of the four migrated surfaces (en LTR + ar RTL أ— light + dark أ— 375/768/1280px + idle/hover/focus/selected/disabled states + keyboard navigation: Tab into group, arrow keys to navigate, Space/Enter to select, Tab out). Record per-surface result table in PR.

**Checkpoint**: Exception 1 is permanently retired. The four RAC files use HeroUI `ToggleButtonGroup` + `ToggleButton`. SC-001 fully satisfied (zero raw `<button>` anywhere outside Exception 3's hidden file inputs).

---

## Phase 13: Polish & Cross-Cutting Concerns

- [ ] T169 [P] Update `DESIGN.md` with new canonical patterns: (a) composed-from-primitives header from US7 (`Surface` + `Button as={Link}` + `Drawer` + `Separator`); (b) `<Button as={Link}>` pattern from US4 (replaces deleted `LinkButton`); (c) `<Card>` v3 dot-notation compound from US1 (replaces v2 `CardBody`/`CardHeader`/`CardFooter`); (d) `<Table.ScrollContainer>` v3 dot-notation compound from US2; (e) `<Badge>` vs `<Chip>` distinction from US3; (f) `<AlertDialog>` vs `<Modal>` distinction from US10; (g) `<Toolbar>` for grouped action bars from US4; (h) `<Typography>` for headings/prose from US10; (i) `<ToggleButtonGroup>` replaces the former Exception 1 RAC radiogroup pattern from Phase 12b; (j) `EmptyState` is an Approved Composition Component (no v3 primitive). Link to `specs/003-heroui-migration/data-model.md` آ§ HeroUI v3 Component Anatomy (Appendix) and آ§ Approved Composition Components.
- [ ] T170 [P] Confirm `AGENTS.md` "Key Conventions" still names HeroUI v3 as the sole UI library, Lucide as the sole icon set, and react-hook-form + Zod as the form contract; no edit needed unless drift. Specifically verify the Repo Boundaries section still forbids browser-automation dependencies.
- [ ] T171 [P] Append "Migration completed" entry to `progress.txt`: final bundle-size / test-runtime / lint-warning / i18n-key deltas vs. baseline; exceptions registered (**2** â€” `Snippet` and native `<input type="file">`); exception removed (**1** â€” RAC `role="radio"` migrated to `ToggleButtonGroup` in Phase 12b); files deleted (`LinkButton.tsx`, `PaginationBar.tsx`); approved composition components touched.
- [ ] T172 Run full quickstart validation per `quickstart.md` "When You Are Done": `npm --prefix frontend ci && npm --prefix frontend test && npm --prefix frontend run build && npm --prefix frontend run i18n:check && npm --prefix frontend run lint`; record in `progress.txt`.
- [ ] T173 Manual cross-story regression: navigate storefront (catalog â†’ product detail â†’ cart â†’ checkout â†’ orders) end-to-end in both themes أ— both directions on mobile (375px) / tablet (768px) / desktop (1280px); record screenshots and the SC-009 matrix per touched surface.
- [ ] T174 Manual cross-story regression: navigate admin shell (login â†’ orders â†’ order detail â†’ products list â†’ product edit â†’ users â†’ inquiries â†’ audit) in both themes أ— both directions; record screenshots and the SC-009 matrix per touched surface.
- [ ] T175 Tag a release-candidate commit; prepare merge-back PR description summarizing 10 user stories + Phase 12b (RAC sunset), 2 deletions (`LinkButton.tsx`, `PaginationBar.tsx`), 2 registered exceptions (`Snippet`, native `<input type="file">`), 1 removed exception (RAC `role="radio"` â†’ `ToggleButtonGroup`), cumulative bundle/test deltas, and visual-verification-matrix coverage.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No code dependencies; needs working tree on `003-heroui-migration` branch.
- **Foundational (Phase 2)**: Depends on Setup.
- **User Stories (Phases 3â€“12)**: All depend on Foundational.
  - Recommended sequential order: US1 â†’ US2 â†’ US3 â†’ US4 â†’ US5 â†’ US6 â†’ US7 â†’ US8 â†’ US9 â†’ US10.
  - US1, US2 are P1 and form the MVP (largest token-coverage gain).
  - US3 has soft dependency on US1 (Card surfaces inherit Chip / Badge styling tokens correctly only after Card chrome is in place).
  - US4 has soft dependency on US3 (Chip-shaped buttons resolved before button sweep; no overlap).
  - US5 has soft dependency on US4 (Submit buttons HeroUI before form fields swap).
  - US6, US7, US8, US9, US10 are P3 and reorderable after US1â€“US5 are merged.
- **Phase 12b (RAC sunset)**: Depends on US10 (final-sweep audit must complete first so the surrounding code is stable). Phase 12b's pre-flight spike (T-RAC-Eval) gates the per-file migration tasks.
- **Polish (Phase 13)**: Depends on US1â€“US10 + Phase 12b.

### User Story Dependencies

- US1 (Cards): Standalone.
- US2 (Tables): Standalone â€” admin only.
- US3 (Chips & Badges): Soft dep on US1 (Card surfaces); standalone otherwise.
- US4 (Buttons, Links & Toolbars): Soft dep on US3; deletes `LinkButton.tsx`; adopts `Toolbar` for grouped action bars.
- US5 (Inputs / Selects / Textareas / Search / Groups): Soft dep on US4; adopts `InputGroup` and `Fieldset`.
- US6 (Separators): Standalone.
- US7 (Header composition): Soft dep on US4 + US6 (uses `Button as={Link}` and `Separator`); soft dep on US3 (cart-trigger `Badge`).
- US8 (Pagination): Standalone â€” single-file refactor.
- US9 (Alerts, Banners & Toast Audit): Soft dep on US4 (inner Buttons); standalone otherwise.
- US10 (Final sweep â€” Typography / AlertDialog / EmptyState / remaining primitives): Depends on US1â€“US9.
- Phase 12b (RAC sunset â†’ ToggleButtonGroup): Depends on US10. Pre-flight spike (T-RAC-Eval) gates the four per-file migration tasks.

### Within Each User Story

- File-level migrations marked `[P]` run in parallel â€” different files.
- Verification tasks (build, test, i18n, lint, grep) run last and serially.
- The Visual Verification Matrix task (suffixed `-vm`) runs at the end of every batch checkpoint per SC-009.
- A user story is not complete until its checkpoint passes all gates.

### Parallel Opportunities

- Setup: T003 / T004 / T005 / T006 â€” parallel.
- Foundational: T008 / T009 / T010 / T011 / T012 / T013 / T014 / T015 â€” parallel (different files; T007 is a separate audit and may run alongside).
- US1: T016â€“T024 â€” parallel (different files).
- US2: T030â€“T034 â€” parallel.
- US3: T039â€“T045b â€” parallel (Chip sweep tasks T039â€“T045 + Badge sweep tasks T045aâ€“T045b in two groups; both groups parallel).
- US4: T049â€“T060 (LinkButton consumers), T061â€“T071 (admin button sweep), T072â€“T094 (storefront / shared / auth button sweep), T094aâ€“T094d (Toolbar adoption) â€” all groups parallel; T048 (delete LinkButton) runs first.
- US5: T100â€“T109 (inputs), T110â€“T117 (selects), T118â€“T124 (textareas), T124aâ€“T124c (InputGroup), T124dâ€“T124g (Fieldset) â€” five groups, parallel within and across.
- US6: T129â€“T133 â€” parallel.
- US7: T136 â†’ T137 â†’ T138 sequential (single file).
- US8: T141 â†’ T142 sequential.
- US9: T145â€“T147 (banners) parallel; T147aâ€“T147b (Toast audit) sequential after the banner trio.
- US10: T151 (EmptyState refactor) â†’ T152â€“T156a (consumers, parallel); T156bâ€“T156c (Typography migration) parallel; T156dâ€“T156h (AlertDialog split) parallel; T157â€“T164 (remaining primitives) parallel. The four sub-phases run in parallel after T151 lands.
- Phase 12b: T-RAC-Eval (sequential, gating); then T-RAC-Cat / T-RAC-Size / T-RAC-Color / T-RAC-Filter â€” parallel (different files); then T-RAC-Done / T-RAC-Tests / T-RAC-vm sequential.
- Polish: T169â€“T171 parallel; T172â€“T175 sequential.

---

## Parallel Example: User Story 1 (Cards)

```powershell
# Launch all card-surface migrations together (each touches a different file).
# Every task uses the v3 Card compound (Card.Header / Card.Title / Card.Description / Card.Content / Card.Footer per Anatomy A.1).
# Banned: CardBody / CardHeader / CardFooter named exports; <Card isPressable> v2 syntax.
Task: "Migrate card containers in frontend/src/features/addresses/AddressBookPage.tsx to HeroUI Card compound (Anatomy A.1)"
Task: "Migrate card containers in frontend/src/features/admin/AdminOrderDetailPage.tsx to HeroUI Card compound (Anatomy A.1)"
Task: "Migrate card containers in frontend/src/features/admin/AdminInquiriesPage.tsx to HeroUI Card compound (Anatomy A.1)"
Task: "Migrate card containers in frontend/src/features/cart/CartPage.tsx to HeroUI Card compound (Anatomy A.1)"
Task: "Migrate card containers in frontend/src/features/catalog/ProductDetailPage.tsx to HeroUI Card compound (Anatomy A.1)"
Task: "Migrate ProductCard wrapper in frontend/src/features/catalog/components/ProductCard.tsx using the v3-canonical navigable card pattern (Anatomy A.1) â€” NOT <Card isPressable>"
Task: "Migrate card containers in frontend/src/features/checkout/CheckoutPage.tsx to HeroUI Card compound (Anatomy A.1)"
Task: "Migrate card containers in frontend/src/features/orders/OrderDetailPage.tsx to HeroUI Card compound (Anatomy A.1)"
Task: "Migrate card containers in frontend/src/features/orders/components/PaymentInstructionsCard.tsx to HeroUI Card compound (Anatomy A.1)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1: Setup (baseline metrics)
2. Phase 2: Foundational (exception comments)
3. Phase 3: US1 (Cards) â†’ STOP, validate, merge
4. Phase 4: US2 (Tables) â†’ STOP, validate, merge

This delivers the highest-impact migration in two mergeable batches.

### Incremental Delivery

Setup + Foundational â†’ Foundation ready (no user-visible change). Then add US1 â†’ US2 â†’ â€¦ â†’ US10 in priority order, each merging independently. Polish phase finalizes.

### Parallel Team Strategy

After Foundational lands:
- **Developer A**: US1 (Cards), then US3 (Chips & Badges).
- **Developer B**: US2 (Tables), then US6 (Separators).
- **Developer C**: US4 (Buttons, Links & Toolbars), then US5 (Inputs / Selects / Textareas / Search / Groups).
- **Developer D**: US7 (Header composition), then US8 (Pagination), then US9 (Alerts, Banners & Toast Audit).
- **US10** (Final sweep â€” Typography / AlertDialog / EmptyState / remaining primitives) waits for all others.
- **Phase 12b** (RAC sunset â†’ ToggleButtonGroup) waits for US10. Pre-flight spike (T-RAC-Eval) gates the per-file migrations.

---

## Notes

- `[P]` = different files, no dependencies.
- `[Story]` maps task to user story for traceability.
- `-vm` suffix marks the SC-009 Visual Verification Matrix task at each batch checkpoint.
- Each user story is independently completable, testable, and mergeable.
- Existing Vitest tests are the regression gate â€” do not weaken or delete them. Tests may be updated only when a public component contract changes (e.g., `LinkButton` deletion in US4, `PaginationBar` deletion in US8, `EmptyState` shim refactor in US10, RAC migration in Phase 12b).
- Commit after each task or logical group.
- Stop at any checkpoint to validate the story independently.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
- **HeroUI v3 import naming guardrails** (per `data-model.md` Banned v2 Names):
  - `Separator` (not `Divider`).
  - `Card` compound: `Card.Header` / `Card.Title` / `Card.Description` / `Card.Content` / `Card.Footer` (no `CardBody` / `CardHeader` / `CardFooter` named exports).
  - `Table` compound: `Table.ScrollContainer` / `Table.Header` / `Table.Column` / `Table.Body` / `Table.Row` / `Table.Cell` (no v2 named exports).
  - `TextArea` (capital A; no `Textarea` lowercase).
  - `Alert.Indicator` for the icon slot (no `Alert.Icon`).
  - `Card` has **no** `isPressable` prop; use the v3-canonical navigable card pattern.
  - `Spinner` has **no** `label` prop; use a sibling `<span className="sr-only">` for SR text.
  - `Skeleton` is self-closing with shape via `className` (no `<Skeleton><div /></Skeleton>` wrapping).
  - Composed `Header` pattern (no `Navbar` export); `EmptyState.tsx` is an Approved Composition Component (no `EmptyState` v3 import); `Snippet.tsx` is Exception 2 (no v3 export).
  - `LinkButton` and `PaginationBar` are deleted; consumers move to `<Button as={Link}>` and `PaginationControls` respectively.
- **Distinct primitives**:
  - `Chip` (standalone status pills) vs. `Badge` (anchored counters).
  - `AlertDialog` (confirm / destroy / irreversible) vs. `Modal` (generic editing / multi-step).
  - `Toolbar` (grouped action bars) vs. ad-hoc `<div class="flex gap-2">` (forbidden).
  - `Typography` (theme-driven headings / body / prose) vs. hand-styled `<h1>`/`<h2>`/`<h3>` (forbidden).
- **Forms**: raw `<form>` + react-hook-form `handleSubmit` is the only permitted raw HTML primitive in form code; **fields inside MUST be HeroUI primitives** (per `research.md` آ§10); HeroUI `Form` primitive is **not** used.
- **Animations**: direct `framer-motion` imports in app code are forbidden (FR-020); use HeroUI primitive motion or HeroUI `Custom Animations` slots.
- **Theme tokens**: HeroUI v3 is the source of truth; new tokens extend HeroUI's CSS-variable layer in `globals.css` only (FR-019).
