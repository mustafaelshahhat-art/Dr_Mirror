# Feature Specification: HeroUI v3 Full Migration

**Feature Branch**: `003-heroui-migration`

**Created**: 2025-05-19

**Revised**: 2026-05-19 (HeroUI v3 anatomy alignment pass; Exception 1 removed; Badge / Toolbar / Typography / AlertDialog / Toast / Fieldset / InputGroup / InputOTP added; theme + animation source-of-truth FRs added; visual-verification matrix SC added)

**Status**: Revised

**Input**: User description: "Audit the entire Dr_Mirror frontend codebase and migrate every custom-styled UI element to its HeroUI v3 equivalent. Zero custom UI chrome — every surface, control, and layout primitive that HeroUI v3 offers should be adopted so the full app inherits theme tokens automatically."

**Component naming convention**: This spec references HeroUI v3 export names and dot-notation compound parts (e.g., `Card` + `Card.Header` / `Card.Title` / `Card.Description` / `Card.Content` / `Card.Footer`). The full anatomy contract is captured in `data-model.md` § **HeroUI v3 Component Anatomy (Appendix)**; every requirement and acceptance scenario in this spec is bound by that appendix. Banned v2-era names (`CardBody`, `TableHeader`, `Textarea` lowercase, `Divider`, `Navbar`, `EmptyState`, `Alert.Icon`, `<Card isPressable>`, `<Spinner label>`) are listed in `data-model.md` § Banned v2 Names — they MUST NOT appear in implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Card Surfaces Migration (Priority: P1)

As a developer reviewing the codebase, I see that all hand-styled card containers (`div` with `rounded-*`, `border`, `bg-content1/bg-content2`, `p-*` patterns) are replaced with the HeroUI v3 `Card` compound (`Card`, `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`) so they inherit `--radius`, `--surface`, `--border` tokens.

**Why this priority**: Cards are the most pervasive UI pattern across both storefront and admin surfaces. Migrating them delivers the highest token-coverage gain in a single pass.

**Independent Test**: After migration, changing `--radius` in `globals.css` updates the corner radius of every card surface site-wide without additional CSS overrides.

**Acceptance Scenarios**:

1. **Given** a storefront product listing page, **When** I inspect any product card, **Then** it renders as a `<Card>` (with v3 dot-notation parts where structure is needed) with no manual `rounded-*` or `bg-*` classes on wrapper divs.
2. **Given** an admin detail page (order, user, inquiry), **When** I inspect the info panels, **Then** they use `<Card>` + `<Card.Header>` / `<Card.Content>` instead of raw `<div className="rounded-... border ...">`. The v2-era `CardBody` named export is **not** used (v3 uses `Card.Content`).
3. **Given** a navigable card (e.g., product card linking to detail), **When** I inspect, **Then** it uses the v3-canonical navigable card pattern (composition with `<Button as={Link}>` or `<Card.* as={Link}>`, verified against `data-model.md` Anatomy A.1). The v2-era `<Card isPressable>` syntax is **not** used.

---

### User Story 2 - Table Migration (Priority: P1)

As an admin user viewing lists (products, orders, users, inquiries), I see data rendered via the HeroUI v3 `Table` compound (`Table`, `Table.ScrollContainer`, `Table.Header`, `Table.Column`, `Table.Body`, `Table.Row`, `Table.Cell`, plus `Table.Footer` / `Table.LoadMore` where applicable) instead of raw `<table>` HTML.

**Why this priority**: Admin pages are table-heavy; migrating them unifies sorting/selection UX and ensures the table chrome follows theme tokens.

**Independent Test**: Admin product list renders a HeroUI v3 `Table` compound. Column headers inherit theme text/border colors without manual styling. Responsive horizontal overflow is handled by `Table.ScrollContainer` (no hand-rolled `overflow-x-auto` wrappers).

**Acceptance Scenarios**:

1. **Given** the admin products page, **When** I view the product list, **Then** it renders using the v3 dot-notation compound (`Table.Header` > `Table.Column`; `Table.Body` > `Table.Row` > `Table.Cell`). The v2-era named exports (`TableHeader`, `TableColumn`, `TableBody`, `TableRow`, `TableCell`) are **not** used.
2. **Given** RTL mode, **When** I view any table, **Then** logical alignment is preserved (`text-start` in cells; physical-direction utilities are forbidden).
3. **Given** the admin orders page, **When** filtering/sorting/paginating, **Then** existing functionality is preserved after migration; loading state uses `Skeleton` cells inside `Table.Row`.

---

### User Story 3 - Chips & Badges Migration (Priority: P2)

As a user viewing order status, gender indicators, or category tags, I see HeroUI v3 `Chip` components (with `Chip.Label` where text is wrapped) for **standalone status pills**, and HeroUI v3 `Badge` (`Badge` + `Badge.Anchor` + `Badge.Label`) for **anchored numeric counters / notification dots** (e.g., cart-count indicator on the cart trigger). The two primitives are kept distinct — `Chip` is not used as an anchored counter and `Badge` is not used as a standalone pill.

**Why this priority**: `Chip` and `Badge` solve different problems in v3. Standardizing them ensures consistent sizing, rounding, color mapping, and — for `Badge` — anchor positioning that respects RTL automatically.

**Independent Test**: `OrderStatusBadge` and `GenderChip` render HeroUI `<Chip>` with the correct semantic `color` and `variant`. The cart-trigger count indicator uses `<Badge>` with `Badge.Anchor` wrapping the trigger and `Badge.Label` carrying the count. Changing theme tokens updates both primitives' appearance.

**Acceptance Scenarios**:

1. **Given** an order with status "shipped", **When** I view the status badge, **Then** it is a HeroUI `<Chip color="primary">` (or appropriate semantic color mapping).
2. **Given** a product with gender "female", **When** I view the gender chip, **Then** it is a HeroUI `<Chip>` with the correct semantic variant.
3. **Given** a non-empty cart on any page, **When** I view the cart trigger, **Then** the count indicator is a HeroUI `<Badge>` (`Badge.Anchor` wrapping the trigger, `Badge.Label` showing the count). It is **not** a `<Chip>` and **not** a hand-styled `<span class="rounded-full …">`.

---

### User Story 4 - Buttons, Links & Toolbars (Priority: P2)

As a user interacting with any clickable action, I see HeroUI `<Button>` components (not raw `<button>`) and HeroUI `<Link>` for navigation anchors. Custom `LinkButton` wrappers are replaced with `<Button as={Link}>` from `@heroui/react` + `react-router-dom`. Grouped action bars (admin row actions, proof-review action sets, filter Apply/Clear bars, batch-action clusters) are wrapped in HeroUI `Toolbar` instead of ad-hoc `<div class="flex gap-2">` clusters.

**Why this priority**: Buttons are the primary interactive primitive; `Toolbar` is the v3-idiomatic container for grouped actions. Unified button styling ensures consistent hover/focus/pressed states from HeroUI tokens, and `Toolbar` ensures correct ARIA semantics and keyboard navigation across action clusters.

**Independent Test**: All clickable actions in the app use HeroUI `Button`. Custom `LinkButton.tsx` is **deleted**. Grouped action bars use HeroUI `Toolbar`. The per-batch grep gate for `<button` returns zero matches outside any documented exception.

**Acceptance Scenarios**:

1. **Given** any page with action buttons, **When** I inspect, **Then** they render as HeroUI `<Button>` with appropriate `variant`/`color`/`size` props and prefer `onPress` over `onClick`.
2. **Given** the storefront header "Shop Now" link, **When** I inspect, **Then** it uses `<Button as={Link} to=… variant=…>` from `@heroui/react` + `react-router-dom`. The custom `LinkButton.tsx` shim no longer exists.
3. **Given** image gallery navigation arrows, **When** I inspect, **Then** they use HeroUI `<Button isIconOnly>` with a Lucide icon and an `aria-label`.
4. **Given** any admin row-action cluster, proof-review action set, filter Apply/Clear bar, or batch-action cluster, **When** I inspect, **Then** the container is HeroUI `<Toolbar aria-label="…">` (not a hand-styled `<div class="flex gap-2">`).

---

### User Story 5 - Inputs, Selects, Textareas, Search, Groups (Priority: P2)

As a user filling forms, I see HeroUI v3 `TextField` + `Input` (or `TextArea` — capital A), HeroUI `Select` compound, HeroUI `SearchField`, HeroUI `NumberField`, and — where appropriate — HeroUI `InputGroup` (for prefix/suffix icons or actions) and HeroUI `Fieldset` (for semantically grouped form sections) instead of raw HTML form elements or custom-styled wrappers.

**Why this priority**: Form inputs are the second-most interactive primitive. Unified fields inherit `--field-radius`, focus-ring colors, and label positioning from theme tokens; `InputGroup` consolidates affordances (search icon, password reveal, copy button, clear button, currency adornment) under a single primitive; `Fieldset` provides accessible grouping for multi-field sections.

**Independent Test**: All form fields across auth, checkout, address book, inquiries, and admin use HeroUI form primitives. react-hook-form + Zod integration via `Controller` is preserved (per `research.md` §4). The per-batch grep gate for raw `<input>` (excluding Exception 3 `type="file"`) / `<select>` / `<textarea>` returns zero matches.

**Acceptance Scenarios**:

1. **Given** the login form, **When** I inspect email/password fields, **Then** they are HeroUI `<TextField>` containing `<Label>` + `<Input>` + `<FieldError>`. The password field uses `<InputGroup>` with a reveal-toggle `Suffix`.
2. **Given** the admin catalog search, **When** I inspect the search bar, **Then** it uses HeroUI `<SearchField>` (mandatory, not conditional). Custom `<input type="search">` + clear button patterns no longer exist.
3. **Given** any `<select>` in the app, **When** I inspect, **Then** it uses the HeroUI `Select` compound (`Select.Trigger`, `Select.Value`, `Select.Indicator`, `Select.Popover`, `ListBox`, `ListBox.Item`) via the `SelectField.tsx` shim.
4. **Given** any textarea, **When** I inspect, **Then** it uses HeroUI `<TextArea>` (capital A) inside `<TextField>`. The v2-era `Textarea` lowercase casing is **not** used.
5. **Given** the address-form / contact-form / shipping-form / payment-form sections of any multi-section form, **When** I inspect, **Then** each semantic section is wrapped in HeroUI `<Fieldset>` (`Fieldset.Legend` + `Fieldset.Group` + optional `Fieldset.Actions`). Hand-rolled `<div class="space-y-4">` section wrappers no longer carry the section semantics.

---

### User Story 6 - Separators (Priority: P3)

As a user viewing section separators, I see HeroUI v3 `<Separator>` components instead of raw `<hr>` or manual `border-t`/`border-b` patterns. (HeroUI v3 renamed v2 `Divider` to `Separator`.)

**Why this priority**: Low effort, high visual consistency. Separators inherit border color from theme tokens.

**Independent Test**: No `<hr>` elements or manual border-separator classes remain in the codebase (except in markdown-rendered content).

**Acceptance Scenarios**:

1. **Given** any page with horizontal separators, **When** I inspect, **Then** they are HeroUI `<Separator>` components.
2. **Given** a vertical separator in a toolbar or split layout, **When** I inspect, **Then** it uses `<Separator orientation="vertical">`.
3. **Given** any code, commit message, or PR title in scope of this feature, **When** I search for `Divider`, **Then** I find only "do-not-use" callouts — the v3 export is `Separator`.

---

### User Story 7 - Header Composition (Priority: P3)

As a storefront user viewing the header/navigation, I see a header that is a thin **Approved Composition Component** built from HeroUI v3 primitives only: `Surface` (or `Toolbar`) + `Button` + `Button as={Link}` + HeroUI `Link` + `Drawer` (mobile menu) + `Separator` (bottom edge) + Lucide icons. HeroUI v3 ships **no** `Navbar` primitive; composition over HeroUI primitives is the v3-idiomatic answer (see `research.md` §1).

**Why this priority**: The header is a single high-visibility component. Wrapping it as an Approved Composition Component preserves theme integration, RTL parity, mobile drawer behavior, and accessibility while honoring the rule that no parallel UI primitive is invented.

**Independent Test**: The storefront header renders as a HeroUI primitive composition. Mobile menu opens as a HeroUI `Drawer`. Sticky positioning is a Tailwind utility on the `Surface`'s `className` (no raw `<header>` chrome with hand-applied tokens).

**Acceptance Scenarios**:

1. **Given** the storefront on desktop, **When** I inspect the header, **Then** every visible primitive is a HeroUI v3 import — no raw `<nav>` / `<div>` chrome carrying HeroUI token classes. *(A single bare `<header role="banner">` element used solely as the semantic landmark wrapper around a HeroUI `Surface` is permitted, provided it carries no HeroUI token classes directly; all token inheritance flows through the `Surface` child.)*
2. **Given** the storefront on mobile, **When** I open the menu, **Then** it opens as HeroUI `<Drawer>` (`Drawer.Content`, `Drawer.Body`, with HeroUI `Link` items inside).
3. **Given** Arabic RTL mode, **When** I inspect the header, **Then** the brand sits at the inline-start, navigation links flow inline-end-to-start, and the mobile-menu trigger sits at the inline-end. All spacing uses logical CSS only.

---

### User Story 8 - Pagination (Priority: P3)

As a user navigating paginated lists, I see the HeroUI v3 `Pagination` compound (`Pagination.Content`, `Pagination.Item`, `Pagination.Link`, `Pagination.Previous`, `Pagination.Next`, `Pagination.Ellipsis`, optional `Pagination.Summary`) consumed via the existing `PaginationControls.tsx` shim. The custom `PaginationBar.tsx` shim is **deleted**.

**Why this priority**: Pagination is a contained component with a clear 1:1 HeroUI equivalent. The `PaginationControls.tsx` shim already exists and exposes a stable `(page, totalPages, onPageChange)` props contract.

**Independent Test**: Catalog and admin list pages render HeroUI `Pagination` (via `PaginationControls`). Page-change callbacks are preserved. `PaginationBar.tsx` no longer exists.

**Acceptance Scenarios**:

1. **Given** any list with > 1 page, **When** I view the pagination controls, **Then** they render via the HeroUI `Pagination` compound (consumed through `PaginationControls.tsx`).
2. **Given** RTL mode, **When** I view pagination, **Then** previous/next arrow directions follow `<html dir="rtl">` correctly (HeroUI handles this via React Aria).
3. **Given** a search across `frontend/src/`, **When** I look for `PaginationBar`, **Then** no matches remain.

---

### User Story 9 - Alerts, Banners & Toast Audit (Priority: P3)

As a user encountering error states, informational banners, or transient notifications, I see:

- **Persistent feedback banners** (downtime banner, forbidden banner, query-error banner) rendered via HeroUI v3 `Alert` (`Alert`, `Alert.Indicator`, `Alert.Content`, `Alert.Title`, `Alert.Description`).
- **Transient notifications** (success toasts, error toasts, promise toasts) routed through HeroUI's imperative `toast()` API (`toast.success`, `toast.error`, `toast.promise`) with `Toast.Provider` wired in `app/providers.tsx`.

The v2-era `Alert.Icon` slot is **not** used (v3 uses `Alert.Indicator`). Hand-styled `<div role="alert">` banners no longer exist.

**Why this priority**: Alerts and toasts are standardized feedback patterns that benefit from consistent color/icon/layout tokens and dismiss/queue semantics.

**Independent Test**: Triggering downtime / 403 / query error renders a HeroUI `Alert` with the correct color and dismiss/retry. Triggering a save success or save failure surfaces a HeroUI toast via `toast.success(…)` / `toast.error(…)`. Existing `ForbiddenBanner.test.tsx` and `QueryErrorState.test.tsx` stay green.

**Acceptance Scenarios**:

1. **Given** a downtime/403/query-error condition, **When** the banner displays, **Then** it uses the HeroUI v3 `Alert` anatomy (`Alert.Indicator` + `Alert.Content` + `Alert.Title` + `Alert.Description`) with the correct semantic `color`. `Alert.Icon` is not used.
2. **Given** a successful or failed mutation (login, save, cancel, etc.), **When** transient feedback is needed, **Then** the application calls `toast.success(…)` / `toast.error(…)` / `toast.promise(…)` from `@heroui/react`. Inline ad-hoc transient banners are not introduced.
3. **Given** a search across `frontend/src/`, **When** I look for `Alert.Icon`, **Then** no matches remain (v3 uses `Alert.Indicator`).

---

### User Story 10 - Final Sweep: Typography, AlertDialog, EmptyState, and Remaining Primitives (Priority: P3)

As a developer auditing the final codebase, I confirm all remaining opportunities are captured:

- **`Typography`** for hand-styled headings (`<h1>`/`<h2>`/`<h3>`), subtitles, body text, and prose blocks.
- **`AlertDialog`** for confirm / destroy / irreversible-action dialogs (cancel order, delete payment method, approve/reject proof, transition order status). Generic editing/multi-step modals stay on `Modal`.
- **`EmptyState.tsx`** as an Approved Composition Component (composes `Card` + `Card.Content` + Lucide icon + `Typography` + optional `Button`). HeroUI v3 ships **no** `EmptyState` primitive; the wrapper does **not** import any non-existent `EmptyState` export.
- Sweep audit for `Modal` / `Drawer` / `Tooltip` / `Spinner` / `Skeleton` / `Breadcrumbs` / `Avatar` / `Switch` / `Checkbox` / `Accordion` / `Tabs` / `Popover` gaps.

**Why this priority**: This is the final sweep to achieve zero custom UI chrome and to land the v3 `Typography` / `AlertDialog` distinctions.

**Independent Test**: The extended grep gates (per `tasks.md` T165) all return their expected results: zero raw `<dialog>` / `<table>` / `<hr>`; zero direct `framer-motion` imports; zero emoji in `.tsx`; zero hand-styled `<h1>`/`<h2>`/`<h3>` post-`Typography` migration; only Exception 2 / Exception 3 files for their respective patterns; zero `role="radio"` after Phase 12b.

**Acceptance Scenarios**:

1. **Given** any confirm/destroy/irreversible action (cancel order, delete payment method, approve/reject proof, transition status), **When** I inspect the confirmation dialog, **Then** it uses HeroUI `AlertDialog` (with `AlertDialog.Heading`, `AlertDialog.Body`, `AlertDialog.Footer`). Generic editing modals stay on `Modal`.
2. **Given** any loading state, **When** active, **Then** it uses HeroUI `<Spinner>` (with a sibling `<span className="sr-only">{t('common.spinner.srLabel')}</span>` for SR text — v3 `Spinner` has no `label` prop) or HeroUI `<Skeleton>` (self-closing element, shape via `className`).
3. **Given** any hand-styled heading or paragraph that was previously `<h1 class="text-2xl font-semibold">` / `<p class="text-sm text-muted">`, **When** I inspect, **Then** it uses HeroUI `<Typography>` with the appropriate `Type` / `Modifier` classes.
4. **Given** any empty-state surface (no orders / no products / no inquiries / etc.), **When** I inspect, **Then** it uses the `EmptyState.tsx` Approved Composition Component which composes HeroUI `Card` + `Card.Content` + Lucide icon + HeroUI `Typography` + optional HeroUI `Button`. No `EmptyState` HeroUI export is imported anywhere.

---

### Edge Cases

- What happens when a HeroUI component lacks a needed feature (e.g., file input)? → Document as an accepted exception in `contracts/exceptions-register.md` (Exception 3 covers `<input type="file">`).
- What if HeroUI v3 ships no `Navbar` primitive? → The storefront header is an **Approved Composition Component** that uses HeroUI primitives only (per `research.md` §1).
- What if HeroUI v3 ships no `EmptyState` primitive? → `EmptyState.tsx` is an **Approved Composition Component** of `Card` + `Card.Content` + Lucide icon + `Typography` + optional `Button` (per User Story 10).
- What if HeroUI `Table` doesn't support a custom cell renderer currently used? → Use `Table.Cell` children directly; v3 supports arbitrary children inside `Table.Cell` per Anatomy A.2.
- What if migrating breaks react-hook-form `Controller` integration? → Every HeroUI form primitive is wrapped with `Controller`; the per-batch Vitest gate enforces no regression. See `research.md` §4.
- What about RAC `role="radio"` segment buttons (`CategoryChips`, `SizePicker`, `ColorPicker`, `FilterPanel`)? → The exception that previously permitted them was **removed** in this revision. The four files migrate to HeroUI `ToggleButtonGroup` + `ToggleButton` in **Phase 12b** after a mandatory pre-flight spike (`T-RAC-Eval`). See `research.md` §9 and `contracts/exceptions-register.md`.
- What if a confirm/destroy modal is currently a generic `Modal`? → Migrate to `AlertDialog` (User Story 10, Acceptance Scenario 1).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace all raw `<table>` elements with the HeroUI v3 `Table` compound (`Table`, `Table.ScrollContainer`, `Table.Header`, `Table.Column`, `Table.Body`, `Table.Row`, `Table.Cell`, plus `Table.Footer` / `Table.LoadMore` where applicable) per Anatomy A.2 in admin pages. Banned v2 names (`TableHeader`, `TableColumn`, `TableBody`, `TableRow`, `TableCell` as named exports) MUST NOT appear.
- **FR-002**: System MUST replace all hand-styled card containers (divs with `rounded-*` + `border` + `bg-content*` pattern) with the HeroUI v3 `Card` compound (`Card`, `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`) per Anatomy A.1. Banned v2 names (`CardHeader`/`CardBody`/`CardFooter` as named exports, `<Card isPressable>`) MUST NOT appear.
- **FR-003**: System MUST replace all raw `<button>` elements with HeroUI `Button` (`isIconOnly` for icon-only triggers; `as={Link}` for navigation). The four former Exception 1 files migrate to `ToggleButtonGroup` + `ToggleButton` in Phase 12b. Custom `LinkButton.tsx` MUST be deleted; consumers move to `<Button as={Link}>`.
- **FR-004**: System MUST replace all raw `<input>` (excluding Exception 3 `type="file"`), `<select>`, and `<textarea>` elements with HeroUI v3 form primitives via `TextField` + `Input` / `Select` compound / `TextArea` (capital A). Per-prefix/suffix affordances use `InputGroup`. Numeric fields use `NumberField`. Search inputs use `SearchField` (mandatory, not conditional). Banned v2 name `Textarea` (lowercase a) MUST NOT appear.
- **FR-005a**: System MUST replace all standalone status pill `<span>` elements (`rounded-full bg-* text-*`) with HeroUI `Chip` (and `Chip.Label` where text is wrapped) per Anatomy A.12.
- **FR-005b**: System MUST replace all anchored numeric counters / notification dots (cart-count indicator, unread-count indicators, etc.) with HeroUI `Badge` compound (`Badge` + `Badge.Anchor` + `Badge.Label`) per Anatomy A.13. `Chip` MUST NOT be used for anchored counters.
- **FR-006**: System MUST replace all `<hr>` and manual border-separator patterns with HeroUI `Separator` (renamed from v2 `Divider`) per Anatomy A.21. Banned v2 name `Divider` MUST NOT appear in implementation.
- **FR-007**: System MUST replace the hand-built storefront header with an Approved Composition Component that composes HeroUI primitives only (`Surface` or `Toolbar` + `Button` + `Drawer` + `Link` + `Separator`). HeroUI v3 ships no `Navbar` primitive; the v2 name `Navbar` MUST NOT appear in implementation.
- **FR-008**: System MUST replace custom `PaginationBar.tsx` with `PaginationControls.tsx` (the existing thin shim over the HeroUI `Pagination` compound per Anatomy A.4). `PaginationBar.tsx` MUST be deleted.
- **FR-009**: System MUST replace custom alert/error banner divs with HeroUI `Alert` per Anatomy A.3 (slots: `Alert.Indicator`, `Alert.Content`, `Alert.Title`, `Alert.Description`). Banned v2 name `Alert.Icon` MUST NOT appear.
- **FR-010**: System MUST replace any remaining primitives where HeroUI equivalents exist: `Modal`, `Drawer`, `Popover`, `Tooltip`, `Spinner`, `Skeleton`, `Breadcrumbs`, `Avatar`, `Switch`, `Checkbox`, `Accordion`, `Tabs`. `Spinner` MUST be the v3 leaf element with no `label` prop (SR text via sibling `sr-only` span). `Skeleton` MUST be the v3 self-closing element with shape via `className`.
- **FR-010a**: System MUST adopt HeroUI `Toolbar` for grouped action bars (admin row actions, proof-review action sets, filter Apply/Clear bars, batch-action clusters) per Anatomy A.21.
- **FR-010b**: System MUST adopt HeroUI `Typography` for hand-styled headings, subtitles, body text, and prose blocks per Anatomy A.24.
- **FR-010c**: System MUST split confirm / destroy / irreversible-action dialogs into HeroUI `AlertDialog` (`AlertDialog.Heading`, `AlertDialog.Body`, `AlertDialog.Footer`) per Anatomy A.6. Generic editing/multi-step modals stay on `Modal`.
- **FR-010d**: System MUST audit transient notification surfaces and route them through HeroUI's imperative `toast()` API (`toast.success`, `toast.error`, `toast.promise`) per Anatomy A.20. Persistent banners stay on `Alert`.
- **FR-010e**: System MUST adopt HeroUI `Fieldset` (`Fieldset.Legend`, `Fieldset.Group`, `Fieldset.Actions`) for semantically grouped form sections (address, contact, shipping, payment) per Anatomy A.18.
- **FR-010f**: System MUST adopt HeroUI `InputGroup` (with prefix/suffix slots) for inputs with adornments (search icon, password reveal, copy button, clear button, currency adornment, SKU adornment) per Anatomy A.18.
- **FR-010g**: System reserves HeroUI `InputOTP` for any future OTP / verification flow per Anatomy A.18.
- **FR-011**: System MUST preserve all existing functionality, accessibility attributes, RTL behavior, and i18n (ar/en) support.
- **FR-012**: System MUST maintain react-hook-form + Zod integration on all form components (per `research.md` §4).
- **FR-013**: System MUST use logical CSS only (`ms-*`/`me-*`/`ps-*`/`pe-*`/`text-start`/`text-end`) — no physical direction classes.
- **FR-014**: System MUST NOT introduce any new UI library. HeroUI v3 is the only component library; Lucide is the only icon set; `tailwind-variants` extending HeroUI variants is the only wrapper pattern.
- **FR-015**: System MUST document any pattern where no HeroUI equivalent exists as an accepted exception in `contracts/exceptions-register.md`. Each exception's same-file justification comment MUST name the specific HeroUI v3 primitive(s) considered and the concrete rejection reason (rejected-primitive trail).
- **FR-016**: Build (`npm --prefix frontend run build`), tests (`npm --prefix frontend test`), i18n (`npm --prefix frontend run i18n:check`), and lint (`npm --prefix frontend run lint`) MUST pass after each migration batch with zero type errors and zero new warnings.
- **FR-017**: All interactive controls MUST use the corresponding HeroUI v3 primitive when one exists in `@heroui/react@^3.0.4`. Specifically: button, link, input, select, textarea (`TextArea`), search field, switch, checkbox, radio group, toggle button, slider, color swatch, number field, autocomplete, combobox, popover trigger, tooltip trigger, dropdown, modal/dialog trigger, drawer trigger, pagination, breadcrumb, tab, accordion. Raw HTML controls and non-HeroUI third-party UI primitives are only permitted when registered in `contracts/exceptions-register.md` with a justification that satisfies acceptance criteria 1–5.
- **FR-018**: App-specific composition wrappers (shell, layout, section, feature components) MUST be thin compositions over HeroUI v3 primitives and Lucide icons. They MUST NOT (a) duplicate HeroUI behavior with hand-rolled state machines, (b) define their own theme tokens outside HeroUI's variable layer, (c) accept raw HTML controls as children when HeroUI equivalents exist, (d) introduce non-HeroUI third-party UI primitives. They MAY extend HeroUI's `tailwind-variants` via `tv({ extend: …Variants })`. The canonical list of approved wrappers is `data-model.md` § Approved Composition Components; new shell/layout/section/feature wrappers are automatically permitted provided they satisfy this rule.
- **FR-019**: HeroUI v3 is the **theme source of truth**. All semantic colors, neutrals, radii, shadows, focus rings, surface elevations, motion durations, and font scales MUST be defined as extensions of HeroUI's CSS variables and/or HeroUI `tailwind-variants`. New project brand tokens MUST be added as overrides/extensions of HeroUI's variable layer in `frontend/src/styles/globals.css` only. A Tailwind `theme.extend` block, a parallel CSS-variable layer, or a `tv()` invocation that defines tokens **independently** of HeroUI is forbidden. Per Constitution Principle VIII: one accent per page (emerald only), max 3 distinct font weights per page, max 2 levels of card nesting, no arbitrary Tailwind values without same-line justification.
- **FR-020**: HeroUI v3 is the **animation source of truth**. Animations and transitions MUST come from one of: (a) a HeroUI v3 primitive's built-in motion, (b) a HeroUI primitive's `Custom Animations` slot, (c) CSS `transition` / `@keyframes` that extend HeroUI motion tokens. Direct `framer-motion` imports in application code are forbidden (`framer-motion` is a transitive dependency of HeroUI used internally only). Page-load animations, parallax, scroll-jacking, autoplay carousels, glow/neon, and glassmorphism remain forbidden per Constitution Principle VIII.

### Key Entities

- **HeroUI v3 Primitive**: A React component or compound exported by `@heroui/react@^3.0.4`. Anatomies are enumerated in `data-model.md` § HeroUI v3 Component Anatomy (Appendix).
- **HeroUI v3 Compound Part**: A dot-notation property on a HeroUI primitive (e.g., `Card.Content`, `Table.Header`, `Alert.Indicator`, `Pagination.Previous`). Compound parts are not separately importable named exports in v3.
- **Approved Composition Component**: An app-specific shell / layout / section / feature wrapper that is a thin composition over HeroUI v3 primitives and Lucide icons, satisfying FR-018. Examples: `AuthShell`, `AuthCard`, `Header`, `AdminHeader`, `AdminSidebar`, `ProductCard`, `Field`, `SelectField`, `PaginationControls`, `Snippet`, `EmptyState`, `DowntimeBanner`, `ForbiddenBanner`, `QueryErrorState`, plus any future shell/layout/section/feature wrapper that satisfies FR-018.
- **Custom UI Element**: Any raw HTML element or hand-styled wrapper that duplicates functionality available in HeroUI v3. Forbidden by FR-014 / FR-017 unless registered as an exception.
- **Accepted Exception**: A custom implementation documented as necessary because no HeroUI v3 equivalent exists. Two are registered: `Snippet` wrapper (Exception 2), native `<input type="file">` (Exception 3). The former Exception 1 (RAC `role="radio"`) is removed in this revision (see `research.md` §9).
- **Theme Token**: A CSS custom property (`--radius`, `--field-radius`, `--surface`, `--border`, semantic color tokens, motion-duration tokens, etc.) inherited by HeroUI components from the v3 theme configuration. The single source of truth is `frontend/src/styles/globals.css`'s extensions of HeroUI's variable layer (FR-019).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero raw `<table>`, `<button>` (excluding documented exceptions), `<input>` (excluding Exception 3 `type="file"`), `<select>`, `<textarea>`, `<dialog>`, `<hr>`, `<a href="…">` for in-app navigation, `<nav>` / `<header>` / `<footer>` outside Approved Composition Components, hand-styled `<h1>`/`<h2>`/`<h3>`/`<p>` (after `Typography` migration), and emoji glyphs in the `.tsx` source. Verified by the per-batch grep gates and the final T165 audit.
- **SC-002**: Zero hand-styled card patterns (`div` with `rounded-*` + `border` + `bg-content*`) that could be replaced by HeroUI `Card`.
- **SC-003**: `npm --prefix frontend run build` passes with zero type errors after each batch and after the full migration.
- **SC-004**: All existing Vitest tests pass (`npm --prefix frontend test`) after each batch and after the full migration. Existing tests are NOT weakened or deleted.
- **SC-005**: RTL layout is visually correct — no `ml-*`/`mr-*`/`text-left`/`text-right` introduced.
- **SC-006**: Changing `--radius` in `globals.css` propagates to all `Card`, `Button`, `TextField`, `Input`, `Surface`, and other HeroUI v3 primitives site-wide.
- **SC-007**: i18n check passes (`npm --prefix frontend run i18n:check`) — no missing translation keys; new HeroUI compound-primitive labels (per `data-model.md` New i18n Keys) are present in both `locales/ar/*.json` and `locales/en/*.json`.
- **SC-008**: Accepted exceptions list is documented with same-file justification for each, including the rejected-primitive trail (acceptance criterion 5).
- **SC-009 (Visual Verification Matrix)**: Every migrated surface MUST pass a manual matrix recorded in the PR description for that surface:
  - **Locales**: English (LTR) and Arabic (RTL).
  - **Themes**: light and dark.
  - **Breakpoints**: 375px (mobile), 768px (tablet), 1280px (desktop).
  - **Interaction**: keyboard reachable; visible focus rings on every interactive element; Escape closes any dismissible overlay (Modal, Drawer, Popover, AlertDialog).
  - **States**: idle, loading (Spinner/Skeleton), disabled, validation/error, empty.
  - **Layout integrity**: no horizontal overflow at any breakpoint; no broken spacing or mirrored imbalance between LTR and RTL.

  The PR description includes a per-surface matrix table; failures block the batch.
- **SC-010**: Direct `framer-motion` imports in app code return zero matches (`grep -r "from 'framer-motion'" frontend/src` returns empty). All animations come from HeroUI v3 per FR-020.
- **SC-011**: Approved Composition Components (per `data-model.md` Approved Composition Components) satisfy the FR-018 contract: HeroUI primitives only; no parallel token system; no duplicated HeroUI behavior; same-file Anatomy Appendix citation when composing a HeroUI compound.

## Assumptions

- `@heroui/react@^3.0.4` is installed in `frontend/package.json`. Provider chain in `frontend/src/app/providers.tsx` is verified by Phase 2 (Foundational) verification tasks (per `research.md` §11); drift is recorded in PR descriptions but not fixed in scope of this feature.
- The existing theme token system (`frontend/src/styles/globals.css` with OKLCH palette and HeroUI v3 token aliases) is the source of truth for design tokens. New tokens are added only as extensions of HeroUI's variable layer in `globals.css` (FR-019).
- Some HeroUI primitives do not exist in v3 (`Snippet`, native file input, `EmptyState`, `Navbar`, `Stepper`, `Timeline`). The first two are documented exceptions (Exceptions 2 and 3); the next two (`EmptyState`, `Navbar`) are handled via Approved Composition Components. `Stepper` and `Timeline` are not used in this codebase and require no migration task. If introduced later, they must either use a HeroUI v3 primitive if one exists at that time or be added as Approved Composition Components / registered exceptions with a rejected-primitive trail.
- The migration does not change any backend API contracts, data flows, routes, business logic, or runtime behavior.
- No new pages or features are introduced — this is a pure refactoring/migration effort.
- Existing Vitest tests are the acceptance gate for behavioral regression. Tests are NOT weakened or deleted.
- The previous Exception 1 (RAC `role="radio"` segment buttons) is **removed** in this revision; the four files migrate to HeroUI `ToggleButtonGroup` + `ToggleButton` in Phase 12b after a mandatory pre-flight spike (per `research.md` §9).
- `framer-motion` is a transitive dependency of HeroUI v3 used internally; direct `framer-motion` imports in app code are forbidden (FR-020).
- The visual-verification matrix (SC-009) is captured manually with the external screenshot tool per `docs/screenshots/README.md`. No browser-automation runner is added (repo boundary).
