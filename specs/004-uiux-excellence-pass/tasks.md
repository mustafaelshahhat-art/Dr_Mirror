---

description: "Task list for UI/UX Excellence Pass — Storefront + Admin (feature 004)"
---

# Tasks: UI/UX Excellence Pass — Storefront + Admin

**Input**: Design documents from `/specs/004-uiux-excellence-pass/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included where the brief mandates them (Snippet contract, CartLineRow stepper DOM-change adjustment) — all other tests are existing and MUST remain green at the recorded pre-flight count.

## Organization

The brief mandates **exactly eight commits** (one per phase A–H), in fixed order, each with a green gate before the next phase begins. This tasks file mirrors that:

- **Phase 1 (Setup)** — pre-flight only, no commit.
- **Phase 2 (Foundational)** — brief's Phase A. **Commit #1.**
- **Phases 3–9** — brief's Phases B, C, D, E, F, G, H. **Commits #2–#8.**

Each Phases-3–9 task carries a `[Story]` label indicating which user story it advances:

- **[US1]** Shopper experiences a coherent, polished storefront (P1)
- **[US2]** Admin operator uses confident, professional tooling (P1)
- **[US3]** A11y / motion / theme parity for all users (P2)
- **[US4]** Docs close-out and screenshot checklists (P3)

Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

---

## Phase 1: Setup (Pre-flight)

**Purpose**: Record the binding "do-not-regress" floor before any code change. No commit at the end of this phase.

- [X] T001 Run `cd D:\projects\Dr_Mirror\frontend; npm run build` and record success/failure
- [X] T002 [P] Run `cd D:\projects\Dr_Mirror\frontend; npm run lint` and record exact error+warning counts as the binding lint baseline
- [X] T003 [P] Run `cd D:\projects\Dr_Mirror\frontend; npm run test` and record passing/total test counts as the binding test baseline
- [X] T004 [P] Run `cd D:\projects\Dr_Mirror\frontend; npm run i18n:check` and record success/failure as the binding i18n parity baseline
- [X] T005 Write the four recorded values to a transient note that will go into the Phase A commit body (build / lint counts / test counts / i18n status)

**Checkpoint**: Pre-flight floor recorded. Proceed to Phase 2.

---

## Phase 2: Foundational — brief's Phase A (tokens + utilities + inventory)

**Purpose**: Add the CSS variants, animation utilities, container-query helpers, and document inventory that every later phase depends on. Single commit: `feat(ui): UI/UX pass phase A — token + utility expansion`.

**⚠️ CRITICAL**: No Phase B–H task can begin until this phase commits cleanly.

- [X] T006 Inventory the actual list of files importing `@heroui/react` (expected 51, drift to 52 is OK per research.md Decision 7) and append `## UI/UX Excellence Pass — Inventory` to `D:\projects\Dr_Mirror\docs\REDESIGN_AUDIT.md`. The section MUST list: (a) every file path, (b) the HeroUI components in use today (Breadcrumbs, Button, Checkbox, Description, Drawer, Form, Input, Label, ListBox, Radio, RadioGroup, Select, Spinner, Switch, TextArea, TextField), (c) the components scheduled for adoption with their target call sites (Tabs, Accordion, Tooltip, NumberField, Pagination, Autocomplete, Skeleton, DatePicker, DateRangePicker, Progress, Modal, ScrollShadow, Chip)
- [X] T007 Open `D:\projects\Dr_Mirror\frontend\src\styles\globals.css` and, immediately after the existing `@theme inline` block, add three custom variants — do NOT modify any OKLCH token value above this point:

  ```css
  @custom-variant ar (&:where([dir="rtl"], [dir="rtl"] *));
  @custom-variant en (&:where([dir="ltr"], [dir="ltr"] *));
  @custom-variant dense (&:where(.density-dense, .density-dense *));
  ```

- [X] T008 In `D:\projects\Dr_Mirror\frontend\src\styles\globals.css`, add an `@layer utilities` block defining `.enter-fade`, `.enter-fade-up`, and `.enter-fade-down`. Each MUST: animate only `transform` and `opacity`; use ease-out timing; complete in ≤ 200ms; wrap the initial state in `@starting-style`; and be guarded by `@media (prefers-reduced-motion: no-preference) { … }` so reduced-motion users see no transition
- [X] T009 In `D:\projects\Dr_Mirror\frontend\src\styles\globals.css`, add an `@layer components` block defining `.cq` (`container-type: inline-size`) and `.cq-card` (`container-name: card; container-type: inline-size`)
- [X] T010 In `D:\projects\Dr_Mirror\frontend\src\styles\globals.css`, add `accent-color: var(--brand);` to the existing `:root` selector — do NOT change any other property on `:root`
- [X] T011 Run the per-phase gate for Phase A: `npm run build`, `npm run lint` (must be ≤ baseline from T002), `npm run test` (must equal baseline from T003), `npm run i18n:check`. If any check fails or regresses, STOP and fix before commit
- [X] T012 Run the four PowerShell sweep regexes from `quickstart.md`. All four MUST return zero hits (only documented exception: `frontend/src/shared/components/Header.tsx:31` backdrop-blur). If any sweep hits, STOP and fix before commit
- [X] T013 Commit with subject `feat(ui): UI/UX pass phase A — token + utility expansion`. Body MUST list: files changed (`globals.css`, `docs/REDESIGN_AUDIT.md`), recorded gate results (build/lint/test/i18n), and the path to `docs/screenshots/uiux-pass/phase-A/_capture-checklist.md` created in T014
- [X] T014 [P] [US4] Create `D:\projects\Dr_Mirror\docs\screenshots\uiux-pass\phase-A\_capture-checklist.md` with a four-state matrix table for any page visibly affected (none expected — utilities only; checklist exists for completeness)

**Checkpoint**: Phase A green and committed. Phases B–H can now use the new utilities and variants.

---

## Phase 3: brief's Phase B — Raw HTML → HeroUI (6 sites)

**Purpose**: Replace six raw HTML controls with their HeroUI equivalents. Add one-line non-conversion comments for the documented intentional raw-HTML sites. Single commit: `feat(ui): UI/UX pass phase B — raw HTML → HeroUI conversion`.

- [X] T015 [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\audit\AuditLogPage.tsx` lines 50 and 63, replace the two raw `<select>` elements with HeroUI `Select` configured as `variant="bordered"` and `selectionMode="single"`; preserve the existing options, value, and onChange handlers
- [X] T016 [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\audit\AuditLogPage.tsx` lines 76 and 85, replace the two raw `<input type="date">` elements with HeroUI `DatePicker` configured as `variant="bordered"`; preserve the existing value and onChange handlers
- [X] T017 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\ProductImagesSection.tsx` line 79, replace the raw `<input>` (alt text) with HeroUI `Input`; preserve placeholder, value, and onChange
- [X] T018 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\ProductImagesSection.tsx` line 102, replace the raw `<input type="number">` with HeroUI `NumberField`; carry over min/max/step from the existing attributes
- [X] T019 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\ProductVariantsSection.tsx` line 209, replace the raw `<input type="number">` (stock) with HeroUI `NumberField`; carry over min/max/step
- [X] T020 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\SearchInput.tsx` line 48, replace the raw `<button>` (clear) with HeroUI `Button isIconOnly variant="ghost" size="sm"`; preserve the existing `aria-label`
- [X] T021 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\orders\components\PaymentProofUpload.tsx` line 113, ensure a one-line comment marks the intentional raw `<input type="file">`: `// intentional: HeroUI v3 has no file input — see DESIGN.md`. Add only if not already present
- [X] T022 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\ProductImagesSection.tsx` line 56, ensure a one-line non-conversion comment marks the intentional raw `<input type="file">`. Add only if not already present
- [X] T023 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\ProductVariantsSection.tsx` line 199, ensure a one-line comment marks the intentional raw `<input type="color">`. Add only if not already present
- [X] T024 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\CategoryChips.tsx`, ensure a one-line comment marks the intentional `<button role="radio">` (RAC radiogroup pattern per DESIGN.md §Variant pickers). Add only if not already present
- [X] T025 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\SizePicker.tsx`, ensure the same RAC radiogroup non-conversion comment. Add only if not already present
- [X] T026 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\FilterPanel.tsx` (GenderPill), ensure the same RAC radiogroup non-conversion comment. Add only if not already present
- [X] T027 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\ColorPicker.tsx`, ensure the same RAC radiogroup non-conversion comment. Add only if not already present
- [X] T028 Run the Phase B gate: build + lint (≤ baseline) + test + i18n:check + the two relevant sweeps (logical-CSS sweep, emoji sweep). If any HeroUI component requires a new user-facing i18n key not in `ar.json` and `en.json`, STOP per stop condition. If any sweep hits, fix in this phase
- [X] T029 Commit with subject `feat(ui): UI/UX pass phase B — raw HTML → HeroUI conversion`. Body lists files changed, gate results, and the screenshot-checklist path created in T030
- [X] T030 [P] [US4] Create `D:\projects\Dr_Mirror\docs\screenshots\uiux-pass\phase-B\_capture-checklist.md` with a four-state matrix row per affected page: AuditLogPage, ProductImagesSection (within AdminProductEditPage), ProductVariantsSection (within AdminProductEditPage), and the storefront CatalogPage search input

**Checkpoint**: Phase B green and committed.

---

## Phase 4: brief's Phase C — HeroUI uplift (10 sub-steps, single commit)

**Purpose**: Adopt under-used HeroUI primitives across ten surfaces in lowest-risk-first order. All ten land in one commit so the gate runs once. Single commit: `feat(ui): UI/UX pass phase C — HeroUI component uplift`.

### C.1 — Pagination shim (lowest risk; six consumers)

- [X] T031 [US1] [US2] Open `D:\projects\Dr_Mirror\frontend\src\shared\components\PaginationControls.tsx`. Replace the internals with a wrapper around HeroUI `Pagination`, mapping the existing props per `contracts/PaginationControls.contract.md`: `page` → `page`, `totalPages` → `total`, `onPageChange` → `onChange`, `disabled` → `isDisabled`. Preserve the existing aria-labels (`common.pagination.previous`, `common.pagination.next`, `common.pagination.label`). Public API MUST NOT change
- [X] T032 [US1] Verify consumer `D:\projects\Dr_Mirror\frontend\src\features\orders\OrdersListPage.tsx` renders correctly without code changes
- [X] T033 [US2] Verify consumer `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminUsersPage.tsx` renders correctly without code changes
- [X] T034 [US2] Verify consumer `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminInquiriesPage.tsx` renders correctly without code changes
- [X] T035 [US2] Verify consumer `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminProductsListPage.tsx` (or the admin products list path actually present in the repo) renders correctly without code changes
- [X] T036 [US2] Verify consumer `D:\projects\Dr_Mirror\frontend\src\features\admin\audit\AuditLogPage.tsx` renders correctly without code changes
- [X] T037 [US1] Verify consumer `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\PaginationBar.tsx` (used by `CatalogPage`) renders correctly without code changes

### C.2 — In-house `<Snippet>` wrapper

- [X] T038 [P] [US1] [US2] Create `D:\projects\Dr_Mirror\frontend\src\shared\components\Snippet.tsx` per `contracts/Snippet.contract.md`: composed of HeroUI `Button isIconOnly variant="ghost" size="sm"` + HeroUI `Tooltip` + Lucide `Copy`/`Check`. Props: `value: string`, `children: ReactNode`, `aria-label: string` (defaults to `t('common.copy')` if present), `className?`, `tooltipPlacement?` defaulting to `"top"`. On click: write `value` via `navigator.clipboard.writeText`, swap to `Check` for ~1500ms then revert. Respect `prefers-reduced-motion` (instant swap, no animation). Use logical placements (`"start"`/`"end"`) in RTL
- [X] T039 [P] [US1] [US2] Create `D:\projects\Dr_Mirror\frontend\src\shared\components\Snippet.test.tsx` covering the four behaviors in the contract: click writes to clipboard with `value`; icon swaps to `Check`; `aria-label` is present; tooltip placement uses logical `start`/`end` in `dir="rtl"`. This test ADDS to the baseline — the new baseline for Phases D–H equals Phase C's recorded test count
- [X] T040 [US1] In `D:\projects\Dr_Mirror\frontend\src\features\orders\components\PaymentInstructionsCard.tsx` lines 71–86, replace the hand-rolled span+button+setTimeout with `<Snippet value={…} aria-label={t('payment.copy.handle') /* or existing key */}>{…}</Snippet>`. Preserve the visible content shape
- [X] T041 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\orders\OrderDetailPage.tsx`, add `<Snippet value={order.orderNumber} aria-label={…}>` as a SIDE element next to the existing `<h1>` (NOT replacing the H1). Use an existing i18n key (e.g., `order.copy.number`); if no equivalent key exists, STOP per stop condition
- [X] T042 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminOrderDetailPage.tsx`, add the same Snippet side-element next to the H1, using the same i18n key as the storefront

### C.3 — Tooltips on admin icon-only actions

- [X] T043 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminProductsListPage.tsx`, wrap each `Button isIconOnly` row action with HeroUI `Tooltip content={<the existing aria-label>} placement="top" delay={300} closeDelay={0}`. Keep the `aria-label` on the button for screen readers
- [X] T044 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminUsersPage.tsx`, wrap each `Button isIconOnly` row action with Tooltip per the same pattern as T043
- [X] T045 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminInquiriesPage.tsx`, wrap each `Button isIconOnly` row action with Tooltip per the same pattern
- [X] T046 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\components\AdminProofReview.tsx`, wrap each `Button isIconOnly` action with Tooltip per the same pattern
- [X] T047 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminOrderDetailPage.tsx`, wrap each `Button isIconOnly` action with Tooltip per the same pattern
- [X] T048 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\ProductImagesSection.tsx`, wrap each `Button isIconOnly` action with Tooltip per the same pattern

### C.4 — Tabs (three placements; i18n-gated for ProductDetailPage)

- [X] T049 [US1] Extract the description/care/sizing region of `D:\projects\Dr_Mirror\frontend\src\features\catalog\ProductDetailPage.tsx` into a new component `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\ProductInfoTabs.tsx`. The extraction is unconditional (pure refactor)
- [X] T050 [US1] In `ProductInfoTabs.tsx`, check whether i18n keys `catalog.detail.tabs.description`, `catalog.detail.tabs.care`, `catalog.detail.tabs.sizing` exist in BOTH `ar.json` AND `en.json` (six entries total). If all six exist, render HeroUI `Tabs` with three `Tab` children using those labels. If any are missing, render the three sections stacked (same DOM structure as before extraction) and add a one-line comment noting the deferred tab adoption — and flag the stop-condition outcome in the Phase C commit body
- [X] T051 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminOrderDetailPage.tsx`, group Timeline / Proofs / Line items into HeroUI `Tabs`. Use existing i18n keys; if any required key is missing, STOP per stop condition
- [X] T052 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\AdminProductEditPage.tsx`, group Master / Variants / Images into HeroUI `Tabs`. The page heading MUST remain above the tablist. Use existing i18n keys; if any required key is missing, STOP per stop condition

### C.5 — Accordion in FilterPanel

- [X] T053 [US1] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\FilterPanel.tsx`, convert the left-column groups (Category, Gender, Price, Size, Color) into HeroUI `Accordion` with `selectionMode="multiple"` and `defaultExpandedKeys` equal to the set of groups that currently have active filters. Mobile drawer behavior MUST be unchanged (the Drawer wraps the accordion; the accordion does not replace the Drawer)

### C.6 — NumberField in CartLineRow (test rewrite required)

- [X] T054 [US1] In `D:\projects\Dr_Mirror\frontend\src\features\cart\components\CartLineRow.tsx`, replace the +/Input/+ trio with a single HeroUI `NumberField` exposing native steppers; preserve `min`, `max`, and the existing `aria-label` on the field
- [X] T055 [US1] Update `D:\projects\Dr_Mirror\frontend\src\features\cart\components\CartLineRow.test.tsx` to query the new DOM by accessible label / role rather than by the old plus/minus button text. No test is deleted; assertions move to semantics-equivalent queries
- [X] T056 [US1] Update `D:\projects\Dr_Mirror\frontend\src\features\cart\CartPage.test.tsx` similarly: any test that interacted with the line-row +/- buttons now interacts with the NumberField's accessible controls

### C.7 — Skeleton wraps HeroUI Skeleton

- [X] T057 [US1] [US2] In `D:\projects\Dr_Mirror\frontend\src\shared\components\Skeleton.tsx`, replace the current implementation atom with HeroUI's `Skeleton` primitive. Preserve the named layout primitives currently exported (`CartLineSkeleton`, `OrderRowSkeleton`, etc.) and the `rounded-md` shape rules established by the redesign rollout. Public exports MUST NOT change

### C.8 — Switch shape verification

- [X] T058 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\payment-methods\PaymentMethodRow.tsx`, verify the active toggle uses HeroUI `Switch`; if it does not, convert it. Wrap with Tooltip per the pattern in T043
- [X] T059 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminUsersPage.tsx`, verify the existing enable/disable toggle is HeroUI `Switch` (no conversion expected) and that it is wrapped with a Tooltip per T044

### C.9 — Progress on uploads

- [X] T060 [P] [US1] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\orders\components\PaymentProofUpload.tsx`, add `<Progress isIndeterminate size="sm" />` (or HeroUI equivalent named export) directly below the upload button while the upload mutation is pending. Flip the button itself to `isLoading` with a verb-form label (e.g., `loadingContent={t('admin.action.saving') /* or existing key */}`)
- [X] T061 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\ProductImagesSection.tsx`, apply the same Progress + isLoading pattern as T060 below the upload action

### C.10 — Modals for admin destructive confirmations

- [X] T062 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\components\AdminProofReview.tsx`, convert the reject-proof flow from inline expansion to a HeroUI `Modal` containing the existing reason `TextArea`. Reuse existing reject-reason i18n keys; if any required key is missing, STOP per stop condition
- [X] T063 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminOrderDetailPage.tsx`, convert cancel-from-admin into a HeroUI `Modal`. The storefront `CancelOrderButton` is OUT OF SCOPE for this conversion (keeps its inline-expand pattern)

### Phase C close

- [X] T064 Run the Phase C gate: build + lint (≤ baseline) + test (≥ baseline + Snippet.test.tsx tests from T039) + i18n:check + the three relevant sweeps (logical-CSS, emoji, banned-pattern). If any HeroUI component required a new user-facing i18n key not in catalog (especially Tabs labels, Modal reason keys), STOP and escalate
- [X] T065 Commit with subject `feat(ui): UI/UX pass phase C — HeroUI component uplift`. Body lists files changed, gate results, the Snippet test addition (note new test count baseline), any i18n-gated fallbacks invoked (T050 in particular), and the screenshot-checklist path
- [X] T066 [P] [US4] Create `D:\projects\Dr_Mirror\docs\screenshots\uiux-pass\phase-C\_capture-checklist.md` enumerating: all six pagination consumers, PaymentInstructionsCard, OrderDetailPage, AdminOrderDetailPage, AdminProductsListPage, AdminUsersPage, AdminInquiriesPage, AdminProofReview, ProductDetailPage (showing tabs OR stacked depending on T050 outcome), AdminProductEditPage, FilterPanel, CartLineRow + CartPage, PaymentMethodRow, PaymentProofUpload, ProductImagesSection — each row × four states

**Checkpoint**: Phase C green and committed. New `Snippet.tsx` and `ProductInfoTabs.tsx` exist; test count baseline increased by Snippet tests.

---

## Phase 5: brief's Phase D — Motion uplift

**Purpose**: Apply the three entry-animation utilities from Phase A across banners, hover, tab panels, empty states, toasts, and error shells. Verify reduced-motion compliance. Single commit: `feat(ui): UI/UX pass phase D — motion uplift`.

- [X] T067 [P] [US3] In `D:\projects\Dr_Mirror\frontend\src\shared\components\DowntimeBanner.tsx`, add `enter-fade-down` to the root element. In-only — no exit animation. Verify it does NOT animate `width`/`height`/`top`/`left` (transform + opacity only)
- [X] T068 [P] [US3] In `D:\projects\Dr_Mirror\frontend\src\shared\components\ForbiddenBanner.tsx`, add `enter-fade-down` to the root element. Same constraints as T067 — strip any pre-existing layout-animating classes if present
- [X] T069 [P] [US3] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\ProductCard.tsx`, bind the existing `group-hover:scale-[1.02]` to `motion-safe:` and add `transition-transform duration-200 ease-out` (also under `motion-safe:`). Existing hover scale stays intact
- [X] T070 [P] [US3] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\ProductInfoTabs.tsx` (from T049), if tabs were adopted, apply `data-[selected=true]:enter-fade` to the tab panel slot. If stacked fallback is in effect, skip this task and note it in the commit body
- [X] T071 [P] [US2] [US3] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminOrderDetailPage.tsx`, apply `data-[selected=true]:enter-fade` to the tab panel slot from T051
- [X] T072 [P] [US2] [US3] In `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\AdminProductEditPage.tsx`, apply `data-[selected=true]:enter-fade` to the tab panel slot from T052
- [X] T073 [P] [US1] [US3] Add `enter-fade-up` to the icon and text of the empty state on `D:\projects\Dr_Mirror\frontend\src\features\catalog\CatalogPage.tsx`
- [X] T074 [P] [US1] [US3] Add `enter-fade-up` to the icon and text of the empty state on `D:\projects\Dr_Mirror\frontend\src\features\orders\OrdersListPage.tsx`
- [X] T075 [P] [US1] [US3] Add `enter-fade-up` to the icon and text of the empty state on `D:\projects\Dr_Mirror\frontend\src\features\addresses\AddressBookPage.tsx`
- [X] T076 [P] [US2] [US3] Add `enter-fade-up` to the empty state on `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminHubPage.tsx` recent-orders section
- [X] T077 [P] [US2] [US3] Add `enter-fade-up` to the empty state on `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminInquiriesPage.tsx`
- [X] T078 [P] [US2] [US3] Add `enter-fade-up` to the empty state on `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminUsersPage.tsx`
- [X] T079 [P] [US2] [US3] Add `enter-fade-up` to the empty state on `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\AdminCategoriesPage.tsx`
- [X] T080 [P] [US2] [US3] Add `enter-fade-up` to the empty state on `D:\projects\Dr_Mirror\frontend\src\features\admin\catalog\AdminPaymentMethodsPage.tsx`
- [X] T081 [P] [US2] [US3] Add `enter-fade-up` to the empty state on `D:\projects\Dr_Mirror\frontend\src\features\admin\audit\AuditLogPage.tsx`
- [X] T082 [P] [US3] Apply `enter-fade` to the toast surface used by the app (locate the shared toast component or react-hot-toast wrapper) and to inline error message renderings under shared `Field` / form error patterns
- [X] T083 [P] [US3] Locate the 404 / 403 / 503 error shells in `D:\projects\Dr_Mirror\frontend\src\app\router.tsx` (and dedicated error-shell components if any) and add `enter-fade-up` to the shell root
- [X] T084 [US3] Audit HeroUI `Drawer` and `Modal` adoption sites added in Phase C (PaymentMethodRow drawer if any; admin reject-proof Modal; admin cancel-order Modal). Confirm we did NOT add an outer `enter-fade*` to them — their internal motion is the only motion
- [X] T085 Run the Phase D gate: build + lint + test + i18n:check + manual reduced-motion verification (toggle `prefers-reduced-motion: reduce` in devtools; computed style of `.enter-fade*` elements MUST show transform=`none` and opacity=1 with no transition timing function)
- [X] T086 Commit with subject `feat(ui): UI/UX pass phase D — motion uplift`. Body lists files changed, gate results, reduced-motion verification result, screenshot-checklist path
- [X] T087 [P] [US4] Create `D:\projects\Dr_Mirror\docs\screenshots\uiux-pass\phase-D\_capture-checklist.md` enumerating: DowntimeBanner state, ForbiddenBanner state, ProductCard hover, all empty states from T073–T081, error shells from T083 — each × four states. Note that fade transitions are hard to capture in a still PNG; capture the final settled state

**Checkpoint**: Phase D green and committed.

---

## Phase 6: brief's Phase E — Container queries + responsive uplift

**Purpose**: Wrap five surfaces with `.cq` / `.cq-card` and convert their internal viewport breakpoints to container-query rules using the same pixel values per research.md Decision 3. Single commit: `feat(ui): UI/UX pass phase E — container-query responsive`.

- [X] T088 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\catalog\components\ProductCard.tsx`, wrap the card root in `.cq-card`. Rewrite the metadata row from `md:grid-cols-2` (or equivalent) to `@md:grid-cols-2`; stacked below `@md`
- [X] T089 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\cart\components\CartLineRow.tsx`, wrap the row in `.cq`. Rewrite the layout from viewport-based to `@sm:flex-row` (single-line image+name+qty+price with qty at `text-end`) above `@sm`; stacked below
- [X] T090 [P] [US2] In `D:\projects\Dr_Mirror\frontend\src\features\admin\AdminHubPage.tsx`, wrap the KPI tiles section in `.cq`. Rewrite from `lg:grid-cols-4 md:grid-cols-2` to `@lg:grid-cols-4 @md:grid-cols-2` (four-up / two-up / one-up by container size)
- [X] T091 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\orders\OrderDetailPage.tsx`, wrap the line-items section in `.cq`. Rewrite to `@md:grid-cols-3` (image+desc+price) above `@md`; stacked below
- [X] T092 [P] [US1] In `D:\projects\Dr_Mirror\frontend\src\features\addresses\components\AddressForm.tsx`, wrap the form in `.cq`. Rewrite the name/phone row from `lg:flex-row` to `@lg:flex-row` above `@lg`; stacked below
- [X] T093 Run the Phase E gate: build + lint + test + i18n:check + the four sweeps + manual visual sanity in catalog / cart / order-detail / admin-hub at narrow drawer widths (e.g., open a 320px-wide preview pane). All five surfaces MUST collapse to stacked at narrow widths and match prior layout at standard page widths
- [X] T094 Commit with subject `feat(ui): UI/UX pass phase E — container-query responsive`. Body lists files changed, gate results, screenshot-checklist path
- [X] T095 [P] [US4] Create `D:\projects\Dr_Mirror\docs\screenshots\uiux-pass\phase-E\_capture-checklist.md` enumerating: CatalogPage (ProductCard grid), CartPage, AdminHubPage, OrderDetailPage, AddressBookPage — each × four states, AND additionally each at a narrow drawer width (320px). The drawer-width captures are the new artifact this phase produces

**Checkpoint**: Phase E green and committed.

---

## Phase 7: brief's Phase F — Form excellence

**Purpose**: Move every HeroUI form field to the field's own `isInvalid` + `errorMessage` slots, the field's `description` slot for helper text, and submit buttons to `isLoading` + `loadingContent`. Single commit: `feat(ui): UI/UX pass phase F — form excellence`.

- [X] T096 [P] [US2] Audit every HeroUI `Input` / `Select` / `NumberField` / `DatePicker` call site in `D:\projects\Dr_Mirror\frontend\src\features\admin\**` and convert separate error spans to `isInvalid={…}` + `errorMessage={…}` on the field itself. Convert helper text below fields to the field's `description` prop. Replace any raw `*` required-marker with a styled `<span aria-hidden>` (or equivalent discreet marker)
- [X] T097 [P] [US1] Audit every HeroUI form field call site in `D:\projects\Dr_Mirror\frontend\src\features\checkout\**`, `D:\projects\Dr_Mirror\frontend\src\features\addresses\**`, `D:\projects\Dr_Mirror\frontend\src\features\inquiries\**`, and `D:\projects\Dr_Mirror\frontend\src\features\auth\**` and apply the same conversions as T096
- [X] T098 [P] [US1] [US2] Ensure each form has a single visible error region per field. Top-of-form summary appears ONLY on submit failure. Remove or hide pre-submit summary banners on forms where they currently render
- [X] T099 [P] [US1] [US2] Convert every submit `Button` in the audited forms to `isLoading={mutation.isPending} loadingContent={t('admin.action.saving') /* or feature-specific existing key like checkout.placing */}`. Reuse EXISTING i18n keys; if a verb key is missing for any submit button, STOP per stop condition
- [X] T100 [US1] In `D:\projects\Dr_Mirror\frontend\src\features\checkout\CheckoutPage.tsx`, keep the existing step circles and add a thin, brand-tinted, subtle HeroUI `Progress` (linear, low height) above the step labels. Value reflects current step / total steps. Subtle, not celebratory — no large color block, no animation flash
- [X] T101 Run the Phase F gate: build + lint + test + i18n:check + the four sweeps. If any submit button needed a verb key not in catalog, STOP and escalate
- [X] T102 Commit with subject `feat(ui): UI/UX pass phase F — form excellence`. Body lists files changed, gate results, screenshot-checklist path
- [X] T103 [P] [US4] Create `D:\projects\Dr_Mirror\docs\screenshots\uiux-pass\phase-F\_capture-checklist.md` enumerating every audited form page: CheckoutPage, AddressForm/AddressBookPage, InquiryForm, LoginPage, RegisterPage, AdminProductCreatePage, AdminProductEditPage, AdminCategoriesPage, AdminPaymentMethodsPage, PaymentMethodForm — each in valid + invalid + submitting states × four matrix states

**Checkpoint**: Phase F green and committed.

---

## Phase 8: brief's Phase G — A11y + semantic uplift

**Purpose**: Add `aria-busy`, shared `aria-live` regions, audit every icon-only button for `aria-label`, ensure axe suite stays green. Single commit: `feat(ui): UI/UX pass phase G — a11y semantic uplift`.

- [X] T104 [P] [US3] Add `aria-busy={query.isLoading || mutation.isPending}` to every list / grid / table container in the storefront. Concrete sites include: `CatalogPage` product grid, `OrdersListPage` order list, `AddressBookPage` address list, `CartPage` line list
- [X] T105 [P] [US3] Add `aria-busy={query.isLoading || mutation.isPending}` to every list / grid / table container in admin. Concrete sites include: `AdminUsersPage`, `AdminInquiriesPage`, `AdminProductsListPage`, `AdminCategoriesPage`, `AdminPaymentMethodsPage`, `AuditLogPage`, `AdminHubPage` recent-orders section
- [X] T106 [US3] In `D:\projects\Dr_Mirror\frontend\src\shared\components\Layout.tsx`, add a single shared `aria-live="polite"` region rendered as the LAST child of the storefront shell. Expose a context or simple module function that lets feature code announce changes (cart updates from cart hooks, filter applied from catalog, sort changed from catalog). Wire cart-update announcements from the cart provider/hook
- [X] T107 [US3] In the AdminLayout component (locate it under `D:\projects\Dr_Mirror\frontend\src\features\admin\components\AdminLayout.tsx` or the actual admin shell), add the same single shared `aria-live="polite"` region. Wire any admin-side announcements (filter applied, sort changed) through it
- [X] T108 [US3] Run a project-wide audit (Grep) for `isIconOnly` and verify every match has a non-empty `aria-label` prop on the same button. Add missing labels using existing i18n keys; if any required key is missing, STOP per stop condition
- [X] T109 [US3] Run the existing `axe.test.tsx` suite (locate it under `frontend/src` test folders) and confirm zero new violations. If new violations exist, fix them in this phase (likely contrast or missing label issues from C/D/E/F edits)
- [X] T110 Run the Phase G gate: build + lint + test (including axe suite) + i18n:check + the four sweeps
- [X] T111 Commit with subject `feat(ui): UI/UX pass phase G — a11y semantic uplift`. Body lists files changed, gate results, axe-suite result, screenshot-checklist path
- [X] T112 [P] [US4] Create `D:\projects\Dr_Mirror\docs\screenshots\uiux-pass\phase-G\_capture-checklist.md`. Phase G is semantics, not visuals — the checklist captures a one-shot screenshot of each shell (storefront + admin) in each of the four matrix states with the dev-tools accessibility tree visible (or notes "no visual artifact" for tasks like aria-busy and aria-live)

**Checkpoint**: Phase G green and committed.

---

## Phase 9: brief's Phase H — Polish + micro-craft + close-out

**Purpose**: Final pass: typography rhythm cap, spacing rhythm, focus rings, tabular-nums, skip-link, error-shell copy, README fence, em-dash fix, and the audit close-out doc. Single commit: `chore(ui): UI/UX pass phase H — polish & micro-craft`.

- [X] T113 [P] [US1] [US2] [US3] Per-page typography audit across the storefront and admin: identify any page using more than three font weights and remove the fourth. Concrete check: search for `font-thin` / `font-extralight` / `font-light` / `font-medium` / `font-semibold` / `font-bold` / `font-extrabold` / `font-black` co-occurring on a single page
- [X] T114 [P] [US3] Spacing rhythm: every top-level page section gap MUST be at least `space-y-8`. Card internals MUST use `p-4` mobile / `p-6` desktop. Audit pages and adjust the offenders only
- [X] T115 [P] [US3] Cursor states: verify `cursor-pointer` is applied by HeroUI defaults on interactive surfaces and that non-interactive surfaces use `cursor-default`. Fix any deviation
- [X] T116 [P] [US3] Focus rings: verify the focus ring is visible everywhere and brand-tinted. Grep for `focus:outline-none` without an accompanying `focus-visible:*` ring and either remove the suppression or add a brand-tinted ring back
- [X] T117 [P] [US3] Tabular numerals: verify the cart quantity NumberField, all page-number renderings (pagination), and any count display use `tabular-nums`. Add the class where missing
- [X] T118 [US3] Skip-link verification: manually Tab from a cold page load in each of the four matrix states (dark-rtl, dark-ltr, light-rtl, light-ltr) and confirm the skip-link is the FIRST Tab stop on storefront and admin shells
- [X] T119 [P] [US3] Verify 404 / 403 / 503 shells: the `enter-fade-up` from Phase D is present; the copy passes the "AI-slop test" (no hollow phrasing like "Something went wrong! Please try again." — copy must be specific to the state). Adjust copy via existing i18n keys only
- [X] T120 [US4] In `D:\projects\Dr_Mirror\README.md`, locate the `## Documentation` block and close the unclosed code fence inside it (a trailing ` ``` ` is missing). Verify the fence closes correctly by rendering markdown locally
- [X] T121 [US4] In `D:\projects\Dr_Mirror\frontend\src\features\admin\audit\AuditLogPage.tsx:153`, confirm the existing usage is `ms-1` (logical margin). No code change — document this in the audit close-out (T123). If a regression has reintroduced `ml-1`, fix it here
- [X] T122 [US4] In `D:\projects\Dr_Mirror\frontend\src\features\admin\audit\AuditLogPage.tsx:166`, replace the `&mdash;` (or literal em-dash) placeholder with either: a localized "—" key replacement (preferred if a key exists), an EnDash glyph, or simply a `text-default-400 ·` (middle-dot separator). Removal of the em-dash MUST satisfy the emoji/symbol sweep regex
- [X] T123 [US4] Append `## UI/UX Excellence Pass — Closing` to `D:\projects\Dr_Mirror\docs\REDESIGN_AUDIT.md` summarizing per-phase outcomes (one line per phase listing the commit subject and the gate result) AND listing the DESIGN.md sections that moved from "spec" to "implemented" by this pass (logical CSS, motion utilities, container queries, RAC radiogroup non-conversions, em-dash anti-pattern, etc.)
- [X] T124 Run the Phase H gate: build + lint (≤ pre-flight baseline) + test (≥ pre-flight + Snippet test additions from T039) + i18n:check + ALL FOUR sweep regexes returning zero hits. The em-dash fix from T122 is what tips the emoji/symbol sweep from one hit to zero
- [X] T125 Commit with subject `chore(ui): UI/UX pass phase H — polish & micro-craft`. Body lists files changed, full gate results, the audit close-out path, screenshot-checklist path
- [X] T126 [P] [US4] Create `D:\projects\Dr_Mirror\docs\screenshots\uiux-pass\phase-H\_capture-checklist.md` enumerating: 404 / 403 / 503 shells, the AuditLogPage with the em-dash fix visible, a sampling of pages affected by typography or spacing adjustments — each × four states

**Checkpoint**: Phase H green and committed. Pass complete.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup / pre-flight)** has no dependencies and produces no commit.
- **Phase 2 (brief's Phase A)** depends on Phase 1's recorded baselines. **Blocks Phases 3–9** because every later phase uses the new utilities (`.enter-fade*`, `.cq`, `@custom-variant`, `accent-color`) introduced here.
- **Phase 3 (brief's Phase B)** depends on Phase 2 commit being green.
- **Phase 4 (brief's Phase C)** depends on Phase 3 commit being green. Phase C item 6 (CartLineRow NumberField) intentionally adds Snippet tests in T039 — the test count for Phases D–H is "pre-flight baseline + Snippet test count".
- **Phase 5 (brief's Phase D)** depends on Phase 4. T070 (Tabs panel fade for ProductInfoTabs) is conditional on T050 having adopted tabs (not stacked fallback).
- **Phase 6 (brief's Phase E)** depends on Phase 4 commit being green (uses `.cq` / `.cq-card` from Phase 2). Phase 5 not strictly required, but the canonical order is B→C→D→E.
- **Phase 7 (brief's Phase F)** depends on Phase 4 (HeroUI form-field adoption widened in B+C).
- **Phase 8 (brief's Phase G)** depends on Phases 3–7 (every phase touched surfaces that this phase audits for a11y).
- **Phase 9 (brief's Phase H)** depends on Phase 8 (close-out summarizes prior phases) and is the final commit.

### User story dependencies

The eight phases are the unit of delivery. User stories US1 / US2 / US3 / US4 progress incrementally across them — none of them is a single self-contained phase.

| User story | Earliest visibly delivered | Fully delivered after |
|------------|---------------------------|-----------------------|
| **US1** Shopper storefront polish | Phase 3 (SearchInput clear; one site) | Phase 6 (container queries land for ProductCard, CartLineRow, OrderDetailPage, AddressForm) |
| **US2** Admin operator tooling | Phase 3 (Audit Select/DatePicker) | Phase 7 (admin form excellence completes) |
| **US3** A11y / motion / theme parity | Phase 5 (motion utilities applied) | Phase 8 (axe suite green, aria-busy/aria-live wired) |
| **US4** Docs close-out | Phase 2 (inventory section added) | Phase 9 (closing section appended; README fence closed) |

### Within each phase

- Tasks within a phase MUST all complete before the phase's gate task (`Tnnn Run the Phase X gate`).
- The gate task MUST be green before the commit task.
- The commit task and the screenshot-checklist task can be sequenced in either order, but both happen at phase close.

### Parallel opportunities

- **Phase 1**: T002 / T003 / T004 run in parallel (they are independent `npm` scripts on the same repo; running them concurrently is OK if your shell allows). T001 should complete first because `npm run build` may produce artifacts the other commands reference.
- **Phase 2**: Most globals.css edits (T007, T008, T009, T010) edit the same file and cannot run in parallel — sequence them. T006 (audit doc) is independent and parallelizable. T014 (screenshot checklist) is independent.
- **Phase 3**: T015–T020 are file-disjoint and parallelizable. The non-conversion comment tasks T021–T027 are independent and parallelizable.
- **Phase 4 (Phase C)**: C.1 (pagination), C.2 (Snippet), C.3 (tooltip wrapping), C.5 (Accordion), C.7 (Skeleton), C.9 (Progress), C.10 (Modal) are all file-disjoint and parallelizable across sub-steps. C.4 (Tabs) for ProductDetailPage (T049–T050) is sequential. C.6 (CartLineRow NumberField + tests) is sequential (T054 → T055 → T056). C.8 (Switch shape verification) is parallel.
- **Phase 5**: Empty-state tasks T073–T081 are all file-disjoint and parallelizable. Tab panel fades T070–T072 are parallel.
- **Phase 6**: All five container-query rewrites (T088–T092) are file-disjoint and parallelizable.
- **Phase 7**: T096 and T097 are parallel (admin vs storefront feature folders are disjoint). T098 and T099 cross all forms and should run after T096/T097.
- **Phase 8**: T104 and T105 are parallel. T106 and T107 are parallel.
- **Phase 9**: T113–T117 are all repository-wide audits that touch different files; they can run in parallel by a single operator. T120, T121, T122, T123 are file-disjoint and parallel.

### Parallel example: Phase 5 (Motion) empty-state batch

```bash
# Launch all empty-state fade tasks together — they touch different files:
Task: "T073 — enter-fade-up on CatalogPage empty state"
Task: "T074 — enter-fade-up on OrdersListPage empty state"
Task: "T075 — enter-fade-up on AddressBookPage empty state"
Task: "T076 — enter-fade-up on AdminHubPage recent-orders empty state"
Task: "T077 — enter-fade-up on AdminInquiriesPage empty state"
Task: "T078 — enter-fade-up on AdminUsersPage empty state"
Task: "T079 — enter-fade-up on AdminCategoriesPage empty state"
Task: "T080 — enter-fade-up on AdminPaymentMethodsPage empty state"
Task: "T081 — enter-fade-up on AuditLogPage empty state"
```

---

## Implementation strategy

### Single-track execution (binding)

The brief mandates one commit per phase, in order A→H. There is no "MVP-then-add" mode for this pass: the phases are not independently deployable as MVP slices, they are quality refinements that must compose. Treat the phases as a single track:

1. Phase 1: record baseline.
2. Phase 2: ship Phase A. Verify gate green. Commit. Capture screenshots checklist.
3. Phase 3: ship Phase B on top of A. Gate green. Commit. Checklist.
4. … through Phase 9 (brief's Phase H).

### Stop-condition triggers (HALT and escalate, never silently push past)

- An adopted HeroUI component requires a user-facing i18n key not in both `ar.json` and `en.json`. Concrete hot spots: T050 (ProductInfoTabs labels), T051/T052 (admin tab labels), T062 (modal reject reason key), T099 (submit verb keys).
- A phase requires changing more than one route URL.
- A phase requires backend changes to render correctly.
- A four-state screenshot reveals a regression that cannot be fixed within the phase's file scope.
- Lint regresses above the pre-flight baseline.
- Frontend test count drops below the pre-flight baseline for any reason other than the documented T055/T056 CartLineRow rewrites (those are replacements, not removals).

### Screenshot capture (manual, user-driven)

After each phase commit lands and the gate is green, the per-phase `_capture-checklist.md` is created by the implementing assistant (tasks T014, T030, T066, T087, T095, T103, T112, T126). The user captures the actual PNGs in a follow-up commit named `docs(ui): phase <X> screenshots`. PNGs are not part of the eight-commit cadence.

---

## Notes

- The brief is the binding contract. Where the brief and this tasks file disagree, the brief wins; update tasks to match.
- Existing i18n keys are reused exclusively. Minting copy in this pass is a stop condition.
- The eight commit subjects in `plan.md` are verbatim and immutable.
- `Header.tsx:31` is the ONE documented backdrop-blur exception; every other backdrop-blur is a sweep failure.
- The `Snippet.tsx` test file (T039) is the only intended test-count addition during the pass.
