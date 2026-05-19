# Implementation Plan: HeroUI v3 Full Migration

**Branch**: `003-heroui-migration` | **Date**: 2026-05-19 (revised) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-heroui-migration/spec.md`

## Summary

Audit the entire Dr_Mirror frontend (`frontend/src/`) and replace every raw HTML primitive (`<table>`, `<button>`, `<input>`, `<select>`, `<textarea>`, `<hr>`, hand-styled `<h1>`/`<h2>`/`<h3>`/`<p>`) and every hand-styled chrome wrapper (custom card divs, custom `LinkButton`, custom `PaginationBar`, hand-built header, ad-hoc action-bar `<div class="flex gap-2">` clusters, inline transient banners) with the matching HeroUI v3 export from `@heroui/react@^3.0.4`. The migration uses **v3 dot-notation compound anatomy** (`Card.Header`/`Card.Content`/`Card.Footer`; `Table.ScrollContainer`/`Table.Header`/`Table.Column`/`Table.Body`/`Table.Row`/`Table.Cell`; `Alert.Indicator`/`Alert.Content`/`Alert.Title`/`Alert.Description`; etc.) per `data-model.md` § **HeroUI v3 Component Anatomy (Appendix)** — the binding reference for every task. The migration also adopts v3 primitives the original draft ignored: `Badge` (anchored counters), `Toolbar` (grouped action bars), `Typography` (headings / body / prose), `AlertDialog` (confirm / destroy dialogs, distinct from generic `Modal`), `Toast` (transient notifications), `Fieldset` (semantically grouped form sections), `InputGroup` (prefix/suffix affordances), `InputOTP` (reserved for future use), and `Surface` (elevated containers).

The migration is executed in priority-ordered batches (P1 Card surfaces → P1 Tables → P2 Chips & Badges → P2 Buttons, Links & Toolbars → P2 Inputs/Selects/Textareas/Search/Groups → P3 Separators → P3 Header composition → P3 Pagination → P3 Alerts/Banners + Toast audit → P3 Final sweep with Typography/AlertDialog/EmptyState/Spinner/Skeleton/Tooltip/Avatar/Switch/Checkbox/Accordion/Tabs/Popover → P3 Phase 12b: Exception 1 sunset migration to `ToggleButtonGroup` → Polish). Each batch ends at a six-gate verification: build + tests + i18n:check + lint + visual-verification matrix (SC-009: en/ar × light/dark × 375/768/1280 + keyboard/focus/Escape + states + RTL layout integrity) + extended grep gate (raw HTML primitives, `framer-motion` imports, emoji glyphs, `<a href>` for in-app nav, deleted-shim imports). All existing functionality, accessibility, RTL/LTR parity, light/dark parity, and react-hook-form + Zod integration are preserved.

**Documented exceptions (two)**: the custom `Snippet` wrapper (HeroUI v3 ships no `snippet` export — the wrapper already composes HeroUI `Button` + `Tooltip` + Lucide icons), and the native `<input type="file">` controls in image/proof upload flows (HeroUI v3 ships no file-input export, hidden behind a HeroUI `Button` trigger). The former Exception 1 (RAC `role="radio"` segment buttons in `CategoryChips.tsx` / `SizePicker.tsx` / `ColorPicker.tsx` / `FilterPanel.tsx`) is **removed**: HeroUI v3 ships `ToggleButtonGroup` + `ToggleButton` which trips the sunset condition; the four files migrate in **Phase 12b** after a mandatory pre-flight spike (`T-RAC-Eval`) per `research.md` §9.

**Theme + animation source of truth** (FR-019 / FR-020): HeroUI v3 is the only theme-token system and the only animation source. No parallel Tailwind `theme.extend` token system; no direct `framer-motion` imports in app code. New tokens extend HeroUI's CSS-variable layer in `frontend/src/styles/globals.css` only. The per-batch grep gate enforces both rules.

**Approved Composition Components**: App-specific shell / layout / section / feature wrappers (`AuthShell`, `AuthCard`, `Header`, `AdminHeader`, `AdminSidebar`, `ProductCard`, `Field`, `SelectField`, `PaginationControls`, `Snippet`, `EmptyState`, `DowntimeBanner`, `ForbiddenBanner`, `QueryErrorState`, `PageHeader` if introduced, `CheckoutSummary`, `PublicLayout`, `AdminLayout`, `DashboardShell`, and any future feature wrapper) are explicitly permitted as **thin compositions over HeroUI v3 primitives and Lucide icons** per FR-018. See `data-model.md` § Approved Composition Components for the binding contract and constraints.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19.2, Vite 8.0

**Primary Dependencies**: `@heroui/react@^3.0.4` (sole component library), Tailwind CSS v4.3, `react-router-dom@^7.15`, `react-hook-form@^7.75` + `zod@^4.4`, `@tanstack/react-query@^5.100`, `i18next@^26.1` + `react-i18next@^17.0`, `next-themes@^0.4`, `lucide-react@^1.14`, `framer-motion@^12.38` (HeroUI internal animation dep — not used directly).

**Storage**: N/A — this is a pure frontend refactor. No backend, DB, EF Core, or API contract changes.

**Testing**: Vitest 4 + Testing Library + jest-dom (`npm --prefix frontend test`). No browser-automation runner is added (repo boundary). The i18n parity script `npm --prefix frontend run i18n:check` is part of the gate.

**Target Platform**: Evergreen Chrome / Edge / Safari / Firefox on desktop and mobile (per constitution).

**Project Type**: Web application — frontend layer only.

**Performance Goals**: No regression vs. baseline `npm run build` bundle size (±5% gzip tolerance per batch) and no regression vs. baseline Vitest runtime (±10% tolerance). HeroUI primitives already memoize internally; per-batch DOM should be the same or smaller after migration.

**Constraints**: HeroUI v3 only (no Chakra/MUI/Radix/Headless UI); Lucide icons only; logical CSS only (`ms-*`/`me-*`/`ps-*`/`pe-*`/`text-start`/`text-end`); emerald accent only; no arbitrary Tailwind values without same-line justification; both RTL and LTR must render correctly at every breakpoint in both light and dark themes; react-hook-form + Zod stays the form contract (the raw `<form>` element is the only permitted raw HTML primitive in form code — fields inside it MUST be HeroUI primitives, per `research.md` §10); no production behavior change (no new pages, no new endpoints, no copy changes beyond i18n additions required by HeroUI compound primitives). Implementation wording for every task is bound by `data-model.md` § **HeroUI v3 Component Anatomy (Appendix)** — banned v2-era names (`CardBody`/`CardHeader`/`CardFooter`, `TableHeader`/`TableColumn`/`TableBody`/`TableRow`/`TableCell`, `Textarea` lowercase, `Divider`, `Navbar`, `EmptyState`, `Alert.Icon`, `<Card isPressable>`, `<Spinner label>`, `BreadcrumbsItem`, `LinkButton`, `PaginationBar`) MUST NOT appear in implementation. Per FR-019 the theme source is HeroUI v3 only; per FR-020 the animation source is HeroUI v3 only (no direct `framer-motion` imports in app code). Per FR-017 every interactive control uses the corresponding HeroUI v3 primitive when one exists; per FR-018 app-specific wrappers are thin compositions over HeroUI primitives + Lucide only.

**Scale/Scope**: 10 user stories (US1–US10), plus **Phase 12b** (Exception 1 sunset migration: 4 RAC files → `ToggleButtonGroup`), plus **Phase 13** (Polish), covering ~50 `.tsx` files across `features/` and `shared/`. Inventory: 12 raw `<table>` matches in 4 admin list pages; 19 raw `<input>` matches in 12 files (most already inside HeroUI-wrapped `Field`/`SelectField`); 21 raw `<select>` matches in 9 files; 13 raw `<textarea>` matches in 8 files; 1 raw `<hr>` (in `Header.tsx`); 0 `<dialog>` (already migrated); hand-styled headings to be enumerated during Phase 12 (US10 Typography sweep). Documented exceptions: 1 custom `Snippet` wrapper (Exception 2), native `<input type="file">` in 3 upload flows (Exception 3). The former Exception 1 (4 RAC files) is removed; those files migrate in Phase 12b.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Full-Stack Production Reality | ✅ PASS | Frontend-only refactor. No API, DB, auth, payment, or background-job surface is touched. Every changed surface MUST pass the SC-009 visual-verification matrix (en/ar × light/dark × 375/768/1280 + keyboard/focus/Escape + states + RTL integrity) per the per-batch checklist. |
| II. Arabic-First Bilingual & RTL Parity | ✅ PASS | Migration uses HeroUI v3 primitives that consume `<html dir>` via the existing `LocaleScope` `<I18nProvider>` in `app/providers.tsx`. Logical CSS only. Any new compound-primitive labels (`Pagination.Previous` aria-labels, `Alert.Title` strings, `common.spinner.srLabel`, `Toast.CloseButton` aria-label, etc. per `data-model.md` New i18n Keys) MUST be added to both `locales/ar/*.json` and `locales/en/*.json`; PR descriptions MUST list every new key. `npm run i18n:check` is part of the per-batch gate. |
| III. Security, Auth & Access Boundaries | ✅ PASS | No auth, JWT, role, ownership, rate-limit, CORS, or secret surface is touched. Admin/customer route guards remain intact. |
| IV. Egyptian Payment Integrity | ✅ PASS | The payment-method picker (`features/checkout/components/PaymentMethodPicker.tsx`) is already on HeroUI `RadioGroup` + `Radio` (+ `Radio.Control`/`Radio.Indicator`/`Radio.Content`). The `PaymentProofUpload` component keeps its native `<input type="file">` (Exception 3 — no HeroUI equivalent; hidden behind a HeroUI `Button` trigger). COD-vs-proof logic is unchanged. Confirm/destroy proof actions (approve/reject) MUST migrate to `AlertDialog` per FR-010c. |
| V. Structural Integrity: Vertical Slices & Feature Folders | ✅ PASS | Migrations stay inside the file that already owns each pattern. No cross-feature file moves. Shared wrappers (`Field.tsx`, `SelectField.tsx`, `PaginationControls.tsx`, `Snippet.tsx`, `EmptyState.tsx`, banner shims) stay in `shared/components/`. The custom `LinkButton.tsx` is **deleted** after callers move to `<Button as={Link}>`; the custom `features/catalog/components/PaginationBar.tsx` is **deleted** in favor of the existing `PaginationControls` shim. The canonical Deleted Files list is `data-model.md` § Deleted Files. |
| VI. Accessibility, Responsive & Theme Parity | ✅ PASS | HeroUI v3 components ship with React Aria semantics, focus rings, keyboard navigation, and theme tokens by default. Every migrated surface MUST pass SC-009 (visual-verification matrix). The existing Vitest a11y assertions (`vitest-axe`) MUST stay green. |
| VII. Observability, Reliability & Recovery | ✅ N/A | No backend / logging / outbox / migration / health surface is touched. |
| VIII. UI System & Visual Discipline | ✅ PASS | This feature is the literal enforcement of Principle VIII — HeroUI-only, Lucide-only, logical CSS, emerald accent, max-3 weights, max-2 card nesting, no arbitrary Tailwind without justification. FR-019 binds the theme source-of-truth; FR-020 binds the animation source-of-truth; FR-017 binds the interactive-controls coverage; FR-018 binds the composition-wrapper contract. The exceptions register documents the only permitted deviations (Exceptions 2 and 3) and their rationale plus rejected-primitive trail (acceptance criterion 5). |

No violations — Complexity Tracking section is empty (see bottom of file).

## Project Structure

### Documentation (this feature)

```text
specs/003-heroui-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — element → HeroUI export mapping
├── quickstart.md        # Phase 1 output — per-batch migration recipe
├── contracts/
│   └── exceptions-register.md   # Phase 1 output — accepted exceptions contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── app/
│   └── providers.tsx                    # UNCHANGED — HeroUI I18nProvider/RouterProvider/ToastProvider already wired
│
├── features/
│   ├── addresses/
│   │   ├── AddressBookPage.tsx          # MODIFIED — card divs → HeroUI Card; raw <button> → Button
│   │   └── components/
│   │       ├── AddressForm.tsx          # MODIFIED — raw inputs → HeroUI Input/Textarea
│   │       └── GovernorateSelect.tsx    # MODIFIED — raw <select> → HeroUI Select
│   ├── admin/
│   │   ├── AdminOrdersListPage.tsx      # MODIFIED — raw <table> → HeroUI Table
│   │   ├── AdminOrderDetailPage.tsx     # MODIFIED — card chrome → HeroUI Card; existing Modal kept
│   │   ├── AdminUsersPage.tsx           # MODIFIED — raw <table> → HeroUI Table
│   │   ├── AdminInquiriesPage.tsx       # MODIFIED — card chrome → HeroUI Card; raw <button> sweep
│   │   ├── audit/
│   │   │   └── AuditLogPage.tsx         # MODIFIED — raw <table> + raw <select> filters → HeroUI
│   │   ├── catalog/
│   │   │   ├── AdminProductsListPage.tsx        # MODIFIED — raw <table> + skeleton table → HeroUI Table
│   │   │   ├── AdminProductCreatePage.tsx       # MODIFIED — raw <button>/<select> sweep
│   │   │   ├── AdminProductEditPage.tsx         # UNCHANGED structure — Tabs already HeroUI
│   │   │   ├── AdminCategoriesPage.tsx          # MODIFIED — raw <input>/<button> rows → HeroUI Input/Button
│   │   │   ├── AdminPaymentMethodsPage.tsx      # MODIFIED — raw <button> sweep
│   │   │   └── components/
│   │   │       ├── ProductMasterForm.tsx        # MODIFIED — remaining raw <button>/<select> → HeroUI
│   │   │       ├── ProductVariantsSection.tsx   # MODIFIED — raw <button>/<input> sweep
│   │   │       ├── ProductImagesSection.tsx     # MODIFIED — raw <button> kept ONLY for native <input type="file"> trigger (documented exception); rest → HeroUI Button
│   │   │       └── payment-methods/             # MODIFIED — raw <button>/<select>/<input> → HeroUI
│   │   └── components/
│   │       ├── AdminHeader.tsx              # MODIFIED — raw <button> → Button
│   │       ├── AdminSidebar.tsx             # UNCHANGED structure — already on HeroUI Drawer
│   │       ├── AdminProofReview.tsx         # MODIFIED — raw <button> → Button; Modal already HeroUI
│   │       ├── AdminTransitionActions.tsx   # MODIFIED — raw <button> → Button; Modal already HeroUI
│   │       └── StatusFilterDropdown.tsx     # MODIFIED — raw <select> → HeroUI Select
│   ├── auth/
│   │   ├── LoginPage.tsx                    # UNCHANGED (HeroUI already)
│   │   ├── RegisterPage.tsx                 # UNCHANGED (HeroUI already)
│   │   └── components/
│   │       ├── AuthCard.tsx                 # UNCHANGED (HeroUI Card already — feature 002)
│   │       ├── AuthShell.tsx                # UNCHANGED (feature 002)
│   │       └── FormField.tsx                # MODIFIED — raw <input> → HeroUI Input if needed
│   ├── cart/
│   │   ├── CartPage.tsx                     # MODIFIED — raw <button> sweep + card chrome → HeroUI Card
│   │   └── components/
│   │       ├── CartButton.tsx               # MODIFIED — raw <button> → Button; Drawer already HeroUI
│   │       └── CartLineRow.tsx              # MODIFIED — raw <button> → Button (qty controls)
│   ├── catalog/
│   │   ├── CatalogPage.tsx                  # MODIFIED — PaginationBar import replaced by PaginationControls; raw <button> sweep; SearchInput now uses SearchField
│   │   ├── ProductDetailPage.tsx            # MODIFIED — raw <button> gallery arrows → HeroUI Button isIconOnly; cards → HeroUI Card (v3 compound parts); hand-styled headings → Typography
│   │   └── components/
│   │       ├── PaginationBar.tsx            # DELETED — replaced by shared PaginationControls (see Deleted Files in data-model.md)
│   │       ├── ProductCard.tsx              # MODIFIED — card chrome → HeroUI Card compound (Card + Card.Content + Card.Footer per Anatomy A.1); navigable card via verified v3-canonical composition pattern (no `isPressable`); Chip already HeroUI
│   │       ├── FilterPanel.tsx              # MODIFIED — raw <button> regular sweep; role="radio" segment-buttons migrate to ToggleButtonGroup in Phase 12b
│   │       ├── CategoryChips.tsx            # MIGRATED IN PHASE 12b — raw <button role="radio"> → ToggleButtonGroup + ToggleButton with selectionMode="single", isDetached, custom chip-shaped children (research §9)
│   │       ├── SizePicker.tsx               # MIGRATED IN PHASE 12b — size-pill segment buttons → ToggleButtonGroup + ToggleButton (research §9)
│   │       ├── ColorPicker.tsx              # MIGRATED IN PHASE 12b — color-swatch segment buttons → ToggleButtonGroup + ToggleButton with isIconOnly + swatch-circle className (research §9)
│   │       ├── SortSelect.tsx               # MODIFIED — raw <select> → HeroUI Select compound via SelectField shim
│   │       ├── SearchInput.tsx              # MODIFIED — raw <input>/<button> → HeroUI SearchField (mandatory per FR-004)
│   │       ├── ProductImageGallery.tsx      # MODIFIED — raw <button> nav arrows → HeroUI Button isIconOnly with Lucide icon + aria-label
│   │       └── GenderChip.tsx               # AUDIT — already HeroUI Chip; verify Chip.Label is used for the text slot per Anatomy A.12
│   ├── checkout/
│   │   ├── CheckoutPage.tsx                 # MODIFIED — raw <button> sweep; cards → HeroUI Card compound; hand-styled headings → Typography; summary block stays an Approved Composition Component (CheckoutSummary if extracted)
│   │   └── components/
│   │       ├── AddressStep.tsx              # MODIFIED — raw <input> → HeroUI TextField+Input; address-block grouped in HeroUI Fieldset (FR-010e)
│   │       ├── PaymentMethodPicker.tsx      # UNCHANGED — already HeroUI RadioGroup + Radio (Radio.Control + Radio.Indicator + Radio.Content per Anatomy A.15)
│   │       ├── PaymentMethodSection.tsx     # MODIFIED — raw <button> sweep; action cluster wrapped in HeroUI Toolbar where applicable
│   │       └── CheckoutEmptyState.tsx       # MODIFIED — raw <button>/LinkButton → Button as={Link}; uses EmptyState shim (Approved Composition Component)
│   ├── inquiries/
│   │   └── components/
│   │       └── InquiryForm.tsx              # MODIFIED — raw <input>/<textarea>/<button> → HeroUI TextField+Input / TextField+TextArea / Button; sections grouped via Fieldset where appropriate
│   └── orders/
│       ├── OrdersListPage.tsx               # MODIFIED — LinkButton consumers → Button as={Link}; empty-state via EmptyState shim
│       ├── OrderDetailPage.tsx              # MODIFIED — cards → HeroUI Card compound; hand-styled headings → Typography; Snippet wrapper kept (Exception 2)
│       └── components/
│           ├── CancelOrderButton.tsx        # MODIFIED — raw <button>/<textarea> → HeroUI Button / TextField+TextArea; confirmation Modal MIGRATES TO AlertDialog (FR-010c)
│           ├── PaymentInstructionsCard.tsx  # UNCHANGED — already uses Snippet wrapper (Exception 2); verify Card compound on outer wrapper
│           └── PaymentProofUpload.tsx       # MODIFIED — raw <button> trigger sweep; native <input type="file"> KEPT (Exception 3) with HeroUI Button as the visible trigger
│
├── shared/
│   ├── components/
│   │   ├── Header.tsx                       # MODIFIED — hand-built header → Approved Composition Component: HeroUI Surface (or Toolbar) + Button + Button as={Link} + HeroUI Link + Drawer (mobile menu) + Separator + Lucide icons. HeroUI v3 ships no Navbar primitive; composition is the v3-idiomatic answer (research §1).
│   │   ├── LinkButton.tsx                   # DELETED — callers move to `<Button as={Link} to=… variant=…>` (see Deleted Files in data-model.md)
│   │   ├── PaginationControls.tsx           # AUDIT — already a thin shim over HeroUI Pagination compound (Anatomy A.4); verify compound parts (Pagination.Content/Item/Link/Previous/Next/Ellipsis/Summary)
│   │   ├── Snippet.tsx                      # UNCHANGED — Exception 2 (HeroUI v3 has no `snippet` export; composes HeroUI Button + Tooltip + Lucide Copy/Check)
│   │   ├── Field.tsx                        # AUDIT — verify HeroUI TextField + Label + Input/TextArea + FieldError per Anatomy A.16 (research §12)
│   │   ├── SelectField.tsx                  # AUDIT — verify HeroUI Select compound per Anatomy A.19 (research §12)
│   │   ├── SearchInput.tsx                  # MODIFIED — thin wrapper over HeroUI SearchField (Anatomy A.18)
│   │   ├── DowntimeBanner.tsx               # MODIFIED — internals → HeroUI Alert (color="danger") with Alert.Indicator + Alert.Content + Alert.Title + Alert.Description (Anatomy A.3); public props unchanged
│   │   ├── ForbiddenBanner.tsx              # MODIFIED — internals → HeroUI Alert (color="warning") with v3 anatomy; public props unchanged
│   │   ├── QueryErrorState.tsx              # MODIFIED — internals → HeroUI Alert (color="danger") + action Button per Anatomy A.3; public props unchanged
│   │   ├── EmptyState.tsx                   # MODIFIED (Approved Composition Component) — internals compose HeroUI Card + Card.Content + Lucide icon (aria-hidden where decorative) + HeroUI Typography (heading + subtitle) + optional HeroUI Button. **No `EmptyState` HeroUI import** — v3 ships no such primitive. Public props (`{ icon?, title, subtitle?, action? }`) unchanged.
│   │   ├── ErrorBoundary.tsx                # MODIFIED — raw <button> retry → HeroUI Button
│   │   ├── LangSwitcher.tsx                 # MODIFIED — raw <button> → HeroUI Button (or Dropdown if multiple locales appear)
│   │   ├── ThemeToggle.tsx                  # MODIFIED — raw <button> → HeroUI Button isIconOnly with Lucide icon + aria-label
│   │   └── (other shared files)             # Audited; modified only where raw primitives are found. Future shell/layout/feature wrappers (PageHeader, CheckoutSummary, PublicLayout, AdminLayout, DashboardShell) are Approved Composition Components per FR-018 — no doc-only registration required.
│   └── (lib, hooks, types)                  # UNCHANGED
│
└── locales/
    ├── ar/                                  # MODIFIED — add labels needed by HeroUI compound primitives (Pagination, Table empty/loading slots, common.spinner.srLabel, common.toast.dismiss, common.dialog.confirm/cancel) per data-model.md § New i18n Keys
    └── en/                                  # MODIFIED — mirror of ar/
```

**Structure Decision**: Frontend feature-folder structure is preserved. Migration edits stay inside the file that already owns each pattern — no cross-feature relocations. The two custom shim files in `data-model.md` § **Deleted Files** are removed (`features/catalog/components/PaginationBar.tsx`, `shared/components/LinkButton.tsx`); their callers move to existing HeroUI-backed equivalents (`shared/components/PaginationControls.tsx`, `<Button as={Link}>`). The two registered exceptions (Exception 2 `Snippet`, Exception 3 native `<input type="file">`) keep their current implementation with a same-file justification comment that includes the rejected-primitive trail (acceptance criterion 5). The four former Exception 1 files (`CategoryChips`, `SizePicker`, `ColorPicker`, `FilterPanel`) migrate to HeroUI `ToggleButtonGroup` + `ToggleButton` in Phase 12b after the mandatory `T-RAC-Eval` spike (research §9).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No violations. Constitution Check passes on all eight principles. Complexity Tracking is intentionally empty._

The two accepted-exception patterns (custom `Snippet` wrapper, native `<input type="file">`) are **not** constitutional violations — they are the literal Principle VIII clause "No raw `<button>`, `<input>`, ... **when a HeroUI equivalent exists**." Each exception has a documented same-file justification comment that includes the rejected-primitive trail (acceptance criterion 5) and is registered in `contracts/exceptions-register.md`. The former Exception 1 (RAC `role="radio"`) was removed because its sunset condition has been triggered by HeroUI v3 `ToggleButtonGroup` shipping; the four affected files migrate in Phase 12b after the mandatory `T-RAC-Eval` spike.
