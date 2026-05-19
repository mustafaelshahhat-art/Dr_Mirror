# Data Model: HeroUI v3 Full Migration

**Feature**: HeroUI v3 Full Migration
**Branch**: `003-heroui-migration`
**Date**: 2026-05-19 (revised)

## Overview

This feature is a pure frontend UI refactor. No new entities, database tables, EF Core migrations, API contracts, or backend logic are introduced. The "data model" here is the **migration contract**: it binds each raw HTML primitive (or hand-styled wrapper) currently in `frontend/src/` to the `@heroui/react@^3.0.4` export (and the v3 compound anatomy) that replaces it.

The document is structured as follows:

- **Element → HeroUI v3 Export Mapping** — source pattern → v3 export → wrapping pattern. Tasks consume this mapping.
- **HeroUI v3 Component Anatomy (Appendix)** — exact compound-part names per primitive, lifted from the official v3 docs. Every task that touches a compound MUST cite this appendix.
- **Accepted Exceptions Summary** — the two registered exceptions (`Snippet` wrapper, native `<input type="file">`). The former Exception 1 (RAC `role="radio"`) was removed in this revision; see `contracts/exceptions-register.md`.
- **Approved Composition Components** — app-specific shell/section/feature wrappers that are permitted as thin compositions over HeroUI primitives.
- **Deleted Files** — the single canonical list of files this migration deletes.
- **Theme Source of Truth** — binding rule for design tokens.
- **Animation Source of Truth** — binding rule for motion/animation.
- **New i18n Key Policy** — rule for adding labels demanded by HeroUI compound primitives.
- **Task Acceptance Gate** — contract every implementation task MUST satisfy before it is considered done.
- **Component Contracts (public props)** — stable public-props contracts for shared wrappers so consumer call sites do not churn per batch.

## Element → HeroUI v3 Export Mapping

The following table is the authoritative migration contract. For each source pattern, the target is the v3 import path (left of the `→`) and the v3 symbol to import from `@heroui/react` (right of the `→`). **Every wrapping pattern uses v3 dot-notation compound parts** — see the **v3 Component Anatomy** appendix below for the exact part names per primitive. The legacy v2 names (`CardBody`, `TableHeader`, `Textarea`, `Divider`, `Navbar`, `EmptyState`, `Alert.Icon`, etc.) are listed under **Banned v2 Names** at the bottom of this section as a do-not-import list.

| Source pattern | v3 import path | v3 symbol | Wrapping pattern (uses dot-notation parts — see Anatomy Appendix) |
|----------------|----------------|-----------|---------------------------------------------------------------------|
| `<div class="rounded-* border bg-content* p-*">…</div>` (info panel) | `@heroui/react` | `Card` | `<Card><Card.Header><Card.Title>…</Card.Title><Card.Description>…</Card.Description></Card.Header><Card.Content>…</Card.Content></Card>` |
| `<div class="rounded-* border bg-content*">` wrapped in `<Link>` (product card) | `@heroui/react` | `Card` (navigable composition — see anatomy notes) | Compose `<Card>` inside a navigable element using the **v3-canonical navigable card pattern** verified against the Anatomy Appendix entry for `Card` (HeroUI v3 `Card` does **not** expose `isPressable` — use the verified composition). Preserve product URL, product-name `aria-label`, keyboard activation, and routing behavior. |
| `<table class="w-full text-sm">` (admin list) | `@heroui/react` | `Table` | `<Table.ScrollContainer><Table aria-label="…"><Table.Header><Table.Column>…</Table.Column>…</Table.Header><Table.Body>{rows.map(r => <Table.Row>…<Table.Cell>…</Table.Cell></Table.Row>)}</Table.Body></Table></Table.ScrollContainer>` |
| `<span class="rounded-full bg-* text-* …">` (standalone status pill) | `@heroui/react` | `Chip` | `<Chip color="primary" variant="flat" size="sm"><Chip.Label>…</Chip.Label></Chip>` |
| Anchored counter / cart-count / unread indicator (numeric badge attached to another element) | `@heroui/react` | `Badge` | `<Badge><Badge.Anchor>{trigger}</Badge.Anchor><Badge.Label>{count}</Badge.Label></Badge>` |
| `<button type="button" class="…">` (action) | `@heroui/react` | `Button` | `<Button variant="primary" onPress={…}>…</Button>` |
| `<button type="button" class="… icon-only …">` (icon-only) | `@heroui/react` | `Button` | `<Button isIconOnly variant="ghost" size="sm" aria-label="…">{icon}</Button>` |
| `<Link to="…" class="…rounded-medium…">` (custom `LinkButton`) | `@heroui/react` + `react-router-dom` | `Button` + react-router `Link` | `<Button as={Link} to="…" variant="primary">…</Button>` |
| `<input type="text" class="…">` (form field) | `@heroui/react` | `TextField` + `Label` + `Input` + `FieldError` | `<TextField isRequired isInvalid={!!error}><Label>…</Label><Input {...field} />{error ? <FieldError>{error}</FieldError> : null}</TextField>` |
| `<input type="text" class="…">` with prefix/suffix icon or affordance (search icon, password toggle, copy button, clear button, currency adornment, SKU adornment) | `@heroui/react` | `InputGroup` + `Input` + `InputGroup.Prefix` / `InputGroup.Suffix` | `<InputGroup><InputGroup.Prefix>{icon}</InputGroup.Prefix><Input {...field} /><InputGroup.Suffix>{action}</InputGroup.Suffix></InputGroup>` (verify exact composition slot names against the Anatomy Appendix entry for `InputGroup`) |
| Semantically grouped form section (e.g., address block, contact block, shipping block, payment block) | `@heroui/react` | `Fieldset` + `Fieldset.Legend` + `Fieldset.Group` + `Fieldset.Actions` | `<Fieldset><Fieldset.Legend>…</Fieldset.Legend><Fieldset.Group>{fields}</Fieldset.Group><Fieldset.Actions>{actions}</Fieldset.Actions></Fieldset>` |
| `<select class="…">` (form field) | `@heroui/react` | `Select` compound | See `shared/components/SelectField.tsx` reference impl; the Anatomy Appendix entry for `Select` enumerates the dot-notation parts |
| `<textarea class="…">` (form field) | `@heroui/react` | `TextArea` (capital A) within `TextField` | `<TextField><Label>…</Label><TextArea {...field} /></TextField>` |
| Storefront search box (`<input type="search">` + clear `<button>`) | `@heroui/react` | `SearchField` | `<SearchField value={q} onChange={setQ} placeholder="…" />` — **mandatory** when a search field is present (not conditional) |
| OTP / verification code input (when a flow needs one) | `@heroui/react` | `InputOTP` + `InputOTP.Group` + `InputOTP.Slot` + `InputOTP.Separator` | Reserved for any future OTP/verification flow; not required today |
| `<hr class="border-divider">` or `<div class="border-t border-divider">` purely-visual separator | `@heroui/react` | `Separator` | `<Separator orientation="horizontal" />` (or `"vertical"`) |
| Storefront `Header.tsx` hand-built bar | _(composition)_ | `Surface` (or `Toolbar`) + `Button` + `Drawer` + `Link` + `Separator` | HeroUI v3 ships no `Navbar` export. The header is a thin composition wrapper that uses only HeroUI v3 primitives and Lucide icons. See **Approved Composition Components** below and research §1. |
| Grouped action bar (admin row actions, admin proof-review action set, filter Apply/Clear bar, admin batch-action cluster) | `@heroui/react` | `Toolbar` + `Button` / `ButtonGroup` | `<Toolbar aria-label="…">{buttons}</Toolbar>` |
| `features/catalog/components/PaginationBar.tsx` custom prev/next pager | shim over `@heroui/react` `Pagination` | `PaginationControls` (from `shared/components/PaginationControls.tsx`) | `<PaginationControls page={page} totalPages={n} onPageChange={…} />` — the shim internally uses `Pagination` compound (`Pagination.Content`, `Pagination.Item`, `Pagination.Link`, `Pagination.Previous`, `Pagination.Next`, `Pagination.Ellipsis`, `Pagination.Summary`) |
| Persistent non-dismissible / non-toast feedback banner (downtime, forbidden, query error) | `@heroui/react` | `Alert` | `<Alert color="danger" variant="flat"><Alert.Indicator>{icon}</Alert.Indicator><Alert.Content><Alert.Title>…</Alert.Title><Alert.Description>…</Alert.Description></Alert.Content></Alert>` |
| Transient notification (success/error toast) | `@heroui/react` | `toast()` function + `Toast.Provider` | Call `toast.success(…)` / `toast.error(…)` / `toast.promise(…)` from the imperative API; `Toast.Provider` is wired once in `app/providers.tsx` |
| Confirm / destroy / irreversible-action dialog (cancel order, delete payment method, approve/reject proof, transition order status) | `@heroui/react` | `AlertDialog` compound | `<AlertDialog>…<AlertDialog.Dialog><AlertDialog.Header><AlertDialog.Heading>…</AlertDialog.Heading></AlertDialog.Header><AlertDialog.Body>…</AlertDialog.Body><AlertDialog.Footer>…</AlertDialog.Footer></AlertDialog.Dialog></AlertDialog>` |
| Generic editing/multi-step modal (admin product edit form, address editor) | `@heroui/react` | `Modal` compound | `<Modal>…<Modal.Dialog><Modal.Header>…</Modal.Header><Modal.Body>…</Modal.Body><Modal.Footer>…</Modal.Footer></Modal.Dialog></Modal>` |
| Side panel / mobile menu / cart drawer | `@heroui/react` | `Drawer` compound | `<Drawer>…<Drawer.Content><Drawer.Dialog><Drawer.Header><Drawer.Heading>…</Drawer.Heading></Drawer.Header><Drawer.Body>…</Drawer.Body><Drawer.Footer>…</Drawer.Footer></Drawer.Dialog></Drawer.Content></Drawer>` |
| Hand-styled empty state (Lucide icon + heading + subtitle + optional action) | _(composition)_ | App-specific `EmptyState` wrapper composed from HeroUI primitives | HeroUI v3 ships **no** `EmptyState` primitive. The `EmptyState.tsx` wrapper composes `Card` + `Card.Content` + Lucide icon (with `aria-hidden` where decorative) + HeroUI `Typography` + optional HeroUI `Button`. See **Approved Composition Components**. |
| Hand-styled spinner (`<div class="animate-spin…">`) | `@heroui/react` | `Spinner` | `<Spinner size="sm" color="current" />` — the v3 `Spinner` exposes `size`, `color`, `className` only. **No `label` prop.** Screen-reader text is supplied externally (sibling `<span className="sr-only">{t('common.loading')}</span>`), or by associating the spinner with a labelled region (e.g., placed inside an element whose `aria-label` carries the loading copy). See the Anatomy Appendix entry for `Spinner`. |
| Hand-rolled skeleton boxes (`<div class="animate-pulse bg-content2 h-… w-…">`) | `@heroui/react` | `Skeleton` | `<Skeleton className="h-4 w-32 rounded-lg" animationType="shimmer" />` — the v3 `Skeleton` is a self-closing element whose shape is set via `className` (height/width/rounding). It is **not** a wrapper around child content. See Anatomy Appendix. |
| `<nav aria-label="breadcrumbs">…</nav>` or hand-styled back-to-list crumb | `@heroui/react` | `Breadcrumbs` + `Breadcrumbs.Item` | `<Breadcrumbs><Breadcrumbs.Item>…</Breadcrumbs.Item>…</Breadcrumbs>` |
| Hand-styled user avatar `<img class="rounded-full">` | `@heroui/react` | `Avatar` + `Avatar.Image` + `Avatar.Fallback` | `<Avatar><Avatar.Image src={…} alt={…} /><Avatar.Fallback>{initials}</Avatar.Fallback></Avatar>` |
| Custom switch-shaped toggle (`<input type="checkbox" role="switch">`) | `@heroui/react` | `Switch` | `<Switch isSelected={…} onChange={…}>{label}</Switch>` |
| Custom boolean `<input type="checkbox">` (within form) | `@heroui/react` | `Checkbox` | `<Checkbox isSelected={…} onChange={…}>{label}</Checkbox>` |
| Custom radio group (chip / size-pill / color-swatch segment buttons, formerly the four RAC `role="radio"` files) | `@heroui/react` | `ToggleButtonGroup` + `ToggleButton` (+ optional `ToggleButtonGroup.Separator`) | `<ToggleButtonGroup selectionMode="single" disallowEmptySelection isDetached={true} size="sm" aria-label="…" selectedKeys={[selectedId]} onSelectionChange={(keys) => onChange([...keys][0])}>{items.map(item => (<ToggleButton key={item.id} id={item.id} aria-label={item.label} className={…}>{renderItem(item)}</ToggleButton>))}</ToggleButtonGroup>` — see research §9 for the Exception 1 removal trail |
| Custom collapsible `<details>` / hand-built accordion | `@heroui/react` | `Accordion` + `Accordion.Item` + `Accordion.Trigger` + `Accordion.Panel` (and `Accordion.Indicator` / `Accordion.Body` per Anatomy Appendix) | `<Accordion><Accordion.Item><Accordion.Trigger>…</Accordion.Trigger><Accordion.Panel>…</Accordion.Panel></Accordion.Item></Accordion>` |
| Custom disclosure (single collapsible section) | `@heroui/react` | `Disclosure` (or `DisclosureGroup` for several) | See Anatomy Appendix |
| Custom tabbed UI | `@heroui/react` | `Tabs` + `Tabs.List` + `Tabs.Tab` + `Tabs.Panel` (+ optional `Tabs.Separator`) | Already in use in `AdminProductEditPage.tsx` |
| Custom floating popover (hover/focus content) | `@heroui/react` | `Popover` + `Popover.Trigger` + `Popover.Content` + `Popover.Dialog` (+ optional `Popover.Arrow`) | Only where a new use case appears |
| Hand-styled headings, paragraphs, prose (e.g., `<h1 class="text-2xl font-semibold">`, `<p class="text-sm text-muted">`, long-form description blocks) | `@heroui/react` | `Typography` (with the `Base`/`Type`/`Modifier` classes; `Prose` for rich text) | Use `Typography` for page titles, section headings, card titles, subtitles, body text, and prose blocks. See Anatomy Appendix. |
| Native `<dialog>` | `@heroui/react` | `Modal` compound | Already migrated in feature 002 / earlier passes |
| Native HTML `<form>` (controlled by react-hook-form `handleSubmit`) | _(deliberate exception, see Note F)_ | Raw `<form>` element with `onSubmit={handleSubmit(…)}` from react-hook-form is the project's form-submission contract | All **fields inside** the `<form>` MUST use HeroUI field primitives (`TextField`/`Input`/`TextArea`/`Select`/`Checkbox`/`Switch`/`RadioGroup`/`NumberField`/`SearchField`/etc.). HeroUI v3 also ships a `Form` primitive; this project does **not** use it because react-hook-form already owns validation/submission via `useForm({ resolver: zodResolver(…) })`. See research §10. |

### Banned v2 Names (do NOT import; not exported by v3)

These names appeared in HeroUI v2 and propagated through the initial spec. They are **not** v3 exports. Tasks, code, and PR descriptions MUST NOT reference them except inside a "do-not-import" note:

- `CardBody`, `CardHeader`, `CardFooter` — v3 uses `Card.Content`, `Card.Header`, `Card.Footer` (dot-notation compound).
- `TableHeader`, `TableColumn`, `TableBody`, `TableRow`, `TableCell` — v3 uses `Table.Header`, `Table.Column`, `Table.Body`, `Table.Row`, `Table.Cell` (dot-notation compound).
- `Textarea` (lowercase a) — v3 export is `TextArea` (capital A).
- `Divider` — v3 export is `Separator`.
- `Navbar` — not exported by v3. Build a thin composition wrapper from `Surface`/`Toolbar` + `Button` + `Drawer` + `Link` + `Separator`.
- `EmptyState` — not exported by v3. Use the `EmptyState.tsx` approved composition wrapper.
- `Alert.Icon` — v3 alert anatomy uses `Alert.Indicator` (icon slot), `Alert.Content`, `Alert.Title`, `Alert.Description`.
- `Card isPressable` — v3 `Card` exposes no `isPressable` prop. Use the verified navigable composition pattern in the Anatomy Appendix.
- `Spinner label="…"` — v3 `Spinner` exposes no `label` prop. Provide SR text via a sibling `<span className="sr-only">{t(…)}</span>` or labelled-region pattern.
- `Skeleton` wrapping `<div>` children — v3 `Skeleton` is self-closing; shape via `className`.
- `BreadcrumbsItem` (without dot) — v3 uses `Breadcrumbs.Item`.
- `LinkButton` — deleted project shim; use `<Button as={Link} to=… variant=…>`.
- `PaginationBar` — deleted project shim; use `PaginationControls` from `shared/components/PaginationControls.tsx`.

## Accepted Exceptions Summary

The canonical exception register is `contracts/exceptions-register.md`. As of this revision **two** exceptions are registered:

1. **`Snippet` wrapper** (Exception 2) — `shared/components/Snippet.tsx`. HeroUI v3 ships no `snippet` export; the wrapper composes `Button` + `Tooltip` + Lucide `Copy`/`Check`.
2. **Native `<input type="file">`** (Exception 3) — hidden behind a HeroUI `Button` trigger. Affected files: `features/orders/components/PaymentProofUpload.tsx`, `features/admin/catalog/components/ProductImagesSection.tsx`, and `features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` (verify during implementation).

The former **Exception 1** (RAC `role="radio"` segment buttons in `CategoryChips.tsx`, `SizePicker.tsx`, `ColorPicker.tsx`, `FilterPanel.tsx`) was **removed** in this revision. The four files migrate to HeroUI `ToggleButtonGroup` + `ToggleButton` with `selectionMode="single"`; see research §9 ("Exception 1 re-evaluation against `ToggleButtonGroup`") for the evaluation trail, and `tasks.md` Phase 12b for the migration sub-phase. The exceptions register documents the removal and the pre-flight evaluation task (T-RAC-Eval) that authorises re-opening the exception only if a concrete blocker emerges during the spike.

## New i18n Keys (only if compound primitives require them)

The migration MUST NOT introduce new user-facing copy beyond what HeroUI compound primitives demand. Examples that may require new keys:

| Likely new key | Reason | ar (placeholder) | en (placeholder) |
|----------------|--------|------------------|------------------|
| `common.alert.dismiss` | HeroUI `Alert` dismiss button needs an aria-label if one is not already passed | إغلاق التنبيه | Dismiss alert |
| `common.table.loading` | HeroUI `Table` empty-on-load slot string | جاري التحميل… | Loading… |
| `common.table.empty` | HeroUI `Table` empty-data slot string | لا توجد بيانات لعرضها | No data to display |
| `common.spinner.srLabel` | Screen-reader label supplied as a **sibling** `<span className="sr-only">…</span>` adjacent to `Spinner` (the v3 `Spinner` has no `label` prop) | جاري التحميل | Loading |
| `common.toast.dismiss` | HeroUI `Toast.CloseButton` aria-label | إغلاق الإشعار | Dismiss notification |
| `common.dialog.confirm`, `common.dialog.cancel` | Generic confirm/cancel labels for `AlertDialog.Footer` buttons (only if a flow does not already have its own copy) | تأكيد / إلغاء | Confirm / Cancel |

## New i18n Key Policy

1. Before adding any new key, check whether an existing key in `locales/ar|en/common.json` already covers it.
2. New keys MUST exist in **both** `locales/ar/*.json` and `locales/en/*.json`. `npm run i18n:check` is part of every per-batch gate.
3. Each batch PR description MUST list every new key it introduces, with its `ar` and `en` translations, in a fenced table titled "New i18n keys". A PR with no new keys writes "None" under that heading.
4. New keys MUST be lowercase, dot-separated, and rooted under the appropriate namespace (`common.*`, `auth.*`, `cart.*`, `checkout.*`, etc.).

## File-Level Migration Plan

For each `.tsx` file in scope, the migration is one of:

- **MODIFIED** — raw primitives in the file are replaced per the mapping above. The complete MODIFIED list is captured in `plan.md` Project Structure.
- **DELETED** — see the canonical **Deleted Files** section below.
- **UNCHANGED** — file already uses HeroUI primitives end-to-end (e.g., `AuthCard`, `AuthShell`, `AdminSidebar`, `Field`, `SelectField`, `PaymentMethodPicker`, `Snippet`).
- **MIGRATED FROM EXCEPTION 1** — `CategoryChips.tsx`, `SizePicker.tsx`, `ColorPicker.tsx`, `FilterPanel.tsx` migrate from raw `<button role="radio">` to HeroUI `ToggleButtonGroup` + `ToggleButton` (see `tasks.md` Phase 12b).

**`TableRowSkeleton` path**: the helper currently lives at `frontend/src/shared/components/TableRowSkeleton.tsx` (verify against the codebase at task time; if it is co-located with a feature, record the discovered path in the PR description for this task). Every task that references it MUST use the recorded path, not a `grep` placeholder.

## State

No new global, context, or local state is introduced. Every existing react-hook-form form schema, `useForm` call, and `react-query` query/mutation remains unchanged.

## Component Contracts (public props — unchanged)

The following shared wrappers retain their **public TypeScript props contract** so no consumer call site needs to change beyond imports. Internal changes are scoped to each wrapper file:

| Wrapper | Public props (unchanged) | Internal change |
|---------|--------------------------|-----------------|
| `shared/components/PaginationControls.tsx` | `page`, `totalPages`, `onPageChange`, `isDisabled?`, `className?` | None — already a thin composition over HeroUI `Pagination` compound |
| `shared/components/Field.tsx` | `label`, `value`, `onChange`, `type?`, `required?`, `maxLength?`, `dir?`, `description?`, `placeholder?`, `errorMessage?` | Audit only — verify internals use HeroUI `TextField` + `Label` + `Input` + `FieldError` per the v3 Anatomy Appendix |
| `shared/components/SelectField.tsx` | `label`, `value`, `onChange`, `options`, `emptyLabel?`, `placeholder?`, `isRequired?`, `hideLabel?`, `className?`, `description?`, `errorMessage?` | Audit only — verify internals use HeroUI `Select` compound per the v3 Anatomy Appendix |
| `shared/components/Snippet.tsx` | `value`, `children`, `aria-label`, `className?`, `tooltipPlacement?`, `text?`, `copiedText?` | None — registered as Exception 2 |
| `shared/components/EmptyState.tsx` | `icon?`, `title`, `subtitle?`, `action?` | Internally a thin composition of HeroUI `Card` + `Card.Content` + Lucide icon + HeroUI `Typography` + optional HeroUI `Button`. **Does NOT import any non-existent `EmptyState` export.** See Approved Composition Components below. |
| `shared/components/DowntimeBanner.tsx` | _(no props — reads `useDowntime` hook)_ | Internally swaps to HeroUI `Alert color="danger"` using v3 anatomy (`Alert.Indicator` + `Alert.Content` + `Alert.Title` + `Alert.Description`). |
| `shared/components/ForbiddenBanner.tsx` | _(no props — subscribes to forbidden store)_ | Internally swaps to HeroUI `Alert color="warning"` using v3 anatomy. |
| `shared/components/QueryErrorState.tsx` | `message`, `retryLabel`, `onRetry` | Internally swaps to HeroUI `Alert color="danger"` with action slot containing a HeroUI `Button`. |

This preserves the **single-import** ergonomic at call sites and isolates the migration risk to the wrapper files themselves.

---

## HeroUI v3 Component Anatomy (Appendix)

This appendix is the **authoritative anatomy contract** for every HeroUI v3 primitive the migration touches. Every task that wraps a compound primitive MUST cite the relevant section here. Anatomy is sourced from the official v3 docs (https://heroui.com/docs/react/components) and verified against the installed `@heroui/react@^3.0.4` package.

Legend: each row of the form `Parent → Parent.Part1, Parent.Part2, …` lists the parent primitive and its dot-notation parts. Props lists name the documented v3 props that the migration relies on; anything else accepts the standard HeroUI variant/state/className surface.

### A.1 `Card`

- Parts: `Card`, `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`.
- `Card` props: `variant: "transparent" | "default" | "secondary" | "tertiary"` (default `"default"`), `className`, `children`.
- `Card.Title` renders as `h3`; `Card.Description` renders as `p`.
- **No `isPressable` prop** in v3. The v2-era `<Card isPressable>` syntax is banned.
- **Navigable card pattern (v3-canonical, verify before use)**: compose a HeroUI `Button` with `variant="ghost"` and `as={Link}` around (or inside) the `Card`, OR place the `Card`'s navigable content inside `Card.Header as={Link}` / `Card.Content as={Link}` if the `Card.*` part accepts polymorphic `as` per its docs. The task that depends on this pattern (`T021`) MUST verify the exact API in the v3 docs before importing.

### A.2 `Table`

- Parts: `Table`, `Table.ScrollContainer`, `Table.Content`, `Table.Header`, `Table.Column`, `Table.Body`, `Table.Row`, `Table.Cell`, `Table.Footer`, `Table.ColumnResizer`, `Table.ResizableContainer`, `Table.LoadMore`, `Table.LoadMoreContent`, `Table.Collection`.
- Required slots: `Table.Header` > one or more `Table.Column`; `Table.Body` > one or more `Table.Row` > one or more `Table.Cell`.
- Use `Table.ScrollContainer` as the outermost wrapper to provide responsive horizontal overflow without hand-rolled `overflow-x-auto` divs.
- Use `Table.LoadMore` / `Table.LoadMoreContent` (and `Skeleton` cells inside `Table.Row`) for the loading state instead of hand-styled `animate-pulse` rows.
- Preserve `aria-label` on `Table`, `aria-busy` on the container during async loads, and responsive column visibility (the v3 columns accept Tailwind classes via `className`).

### A.3 `Alert`

- Parts: `Alert`, `Alert.Indicator`, `Alert.Content`, `Alert.Title`, `Alert.Description`.
- `Alert` props: `color: "default" | "primary" | "success" | "warning" | "danger"`, `variant: "flat" | …`, `isDismissible`, `onDismiss`, plus the standard className/render-prop surface.
- The icon slot is `Alert.Indicator` (the v2 `Alert.Icon` name is banned).

### A.4 `Pagination`

- Parts: `Pagination`, `Pagination.Summary`, `Pagination.Content`, `Pagination.Item`, `Pagination.Link`, `Pagination.Previous`, `Pagination.Next`, `Pagination.PreviousIcon`, `Pagination.NextIcon`, `Pagination.Ellipsis`.
- `PaginationControls.tsx` is the project's thin shim; it owns the dot-notation composition and exposes `(page, totalPages, onPageChange, isDisabled?, className?)` to consumers.

### A.5 `Modal`

- Parts: `Modal`, `Modal.Trigger`, `Modal.Backdrop`, `Modal.Container`, `Modal.Dialog`, `Modal.Header`, `Modal.Body`, `Modal.Footer`, `Modal.CloseTrigger`. The `useOverlayState` hook is the controlled-state helper.
- Use for generic editing / multi-step modals.

### A.6 `AlertDialog`

- Parts: `AlertDialog`, `AlertDialog.Trigger`, `AlertDialog.Backdrop`, `AlertDialog.Container`, `AlertDialog.Dialog`, `AlertDialog.Header`, `AlertDialog.Heading`, `AlertDialog.Body`, `AlertDialog.Footer`, `AlertDialog.Icon`, `AlertDialog.CloseTrigger`. The `useOverlayState` hook is the controlled-state helper.
- Use for confirm / destroy / irreversible actions only.

### A.7 `Drawer`

- Parts: `Drawer`, `Drawer.Trigger`, `Drawer.Backdrop`, `Drawer.Content`, `Drawer.Dialog`, `Drawer.Header`, `Drawer.Heading`, `Drawer.Body`, `Drawer.Footer`, `Drawer.Handle`, `Drawer.CloseTrigger`.

### A.8 `Popover` and `Tooltip`

- `Popover`: `Popover`, `Popover.Trigger`, `Popover.Content`, `Popover.Dialog`, `Popover.Arrow`.
- `Tooltip`: `Tooltip`, `Tooltip.Trigger`, `Tooltip.Content`, `Tooltip.Arrow`.

### A.9 `Tabs`

- Parts: `Tabs`, `Tabs.List`, `Tabs.Tab`, `Tabs.Separator`, `Tabs.Panel`.

### A.10 `Accordion`, `Disclosure`, `DisclosureGroup`

- `Accordion`: `Accordion`, `Accordion.Item`, `Accordion.Trigger`, `Accordion.Panel`, `Accordion.Indicator`, `Accordion.Body`.
- `Disclosure`: `Disclosure`, `DisclosureTrigger`, `DisclosureContent`. `DisclosureGroup` wraps several.

### A.11 `Breadcrumbs`

- Parts: `Breadcrumbs`, `Breadcrumbs.Item`.

### A.12 `Chip`

- Parts: `Chip`, `Chip.Label`.
- `Chip` props: `color` (semantic), `variant: "flat" | …`, `size: "sm" | "md" | "lg"`.

### A.13 `Badge`

- Parts: `Badge`, `Badge.Anchor`, `Badge.Label`.
- Use for anchored numeric/dot counters (cart count, unread count). Distinct from `Chip` (standalone pill).

### A.14 `Button`, `ButtonGroup`, `ToggleButton`, `ToggleButtonGroup`, `CloseButton`

- `Button`: standalone primitive; props include `variant`, `color`, `size`, `isIconOnly`, `isLoading`, `isDisabled`, `as` (polymorphic), `onPress` (React Aria; preferred over `onClick`), plus full className/render-prop surface.
- `ButtonGroup`: `ButtonGroup`, `ButtonGroup.Separator`.
- `ToggleButton`: same shape as `Button` with selected state (`isSelected` / controlled via parent `ToggleButtonGroup`); accepts `id` (required when inside `ToggleButtonGroup`) and `isIconOnly`.
- `ToggleButtonGroup`: `ToggleButtonGroup`, `ToggleButtonGroup.Separator`. Props: `selectionMode: "single" | "multiple"` (default `"single"`), `selectedKeys`, `defaultSelectedKeys`, `onSelectionChange`, `disallowEmptySelection`, `orientation: "horizontal" | "vertical"`, `size`, `isDetached`, `fullWidth`, `isDisabled`. Each `ToggleButton` child needs a unique `id`. Built on React Aria — keyboard, focus, RTL behavior come for free.
- `CloseButton`: standalone icon-only button for dismissible surfaces.

### A.15 `Switch`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Radio`

- `Switch`: standalone; props include `isSelected`, `onChange`, `size`, `isDisabled`, label as children. `Switch.Group`/`Switch.Group Horizontal` are documented compound forms.
- `Checkbox`: standalone; props `isSelected`, `onChange`, `isIndeterminate`, `isInvalid`. `CheckboxGroup` wraps several.
- `RadioGroup` + `Radio` + `Radio.Control` + `Radio.Indicator` + `Radio.Content` — already in use for `PaymentMethodPicker.tsx`.

### A.16 Form fields: `TextField`, `Input`, `TextArea`, `Label`, `FieldError`, `Description`, `ErrorMessage`

- `TextField`: container with `isRequired`, `isInvalid`, `name`, `value`, `onChange`, `validationBehavior`, etc.; composes `Label`, `Input` or `TextArea`, `Description`, `FieldError`.
- `Input`: leaf input; supports `type` (`text`, `email`, `password`, `tel`, `url`, `number`, etc.). Within `TextField`.
- `TextArea` (capital A): leaf textarea; supports `rows`, `cols`, resizing. Within `TextField`.
- `Label`: explicit label element associated by parent `TextField`.
- `FieldError`: error message slot inside `TextField`.
- `Description`: helper-text slot inside `TextField`.
- `ErrorMessage`: standalone error message; use `FieldError` inside `TextField`, `ErrorMessage` outside it.

### A.17 `Form`

- Parts: `Form` (single primitive with `onSubmit`, `validationErrors`, etc.).
- **Project policy**: the project does **not** use HeroUI `Form` directly. The form-submission contract is owned by `react-hook-form` via `<form onSubmit={handleSubmit(…)}>`. The raw `<form>` element is the **only** permitted raw HTML primitive in form code; every **field inside** the `<form>` MUST be a HeroUI primitive. See research §10 for the decision trail.

### A.18 `InputGroup`, `InputOTP`, `Fieldset`, `NumberField`, `SearchField`, `ColorField`, `Slider`, `ColorSlider`, `ColorSwatch`, `ColorSwatchPicker`, `ColorPicker`

- `InputGroup`: compound for prefix/suffix icons or actions inside an input row. Composition parts include `InputGroup.Prefix`, `InputGroup.Suffix` (verify exact names against v3 docs before use).
- `InputOTP`: parts `InputOTP`, `InputOTP.Group`, `InputOTP.Slot`, `InputOTP.Separator`. Reserved for OTP/verification flows.
- `Fieldset`: parts `Fieldset`, `Fieldset.Legend`, `Fieldset.Group`, `Fieldset.Actions`.
- `NumberField`: parts include `NumberField.Group`, `NumberField.Input`, increment/decrement triggers per docs.
- `SearchField`: standalone field with built-in clear button; props include `value`, `onChange`, `placeholder`, plus the standard `TextField`-like surface.
- `ColorField`: hex/HSL field with `ColorField.Group`, `ColorField.Input`, `ColorField.Prefix`, `ColorField.Suffix`.
- `Slider`: parts `Slider`, `Slider.Output`, `Slider.Track`, `Slider.Fill`, `Slider.Thumb`.
- `ColorSlider`, `ColorSwatch`, `ColorSwatchPicker`, `ColorPicker`: v3 color-value pickers. **Note**: these target hex/HSV color values, not product-variant color swatches. The project's product-variant color swatch picker migrates to `ToggleButtonGroup` (with each `ToggleButton` rendering a colored chip), not to `ColorSwatchPicker`.

### A.19 `Select`, `Autocomplete`, `ComboBox`, `ListBox`, `Dropdown`, `TagGroup`

- `Select`: parts `Select`, `Select.Trigger`, `Select.Value`, `Select.Indicator`, `Select.Popover`, plus `ListBox` + `ListBox.Item`.
- `Autocomplete`: parts `Autocomplete`, `Autocomplete.Trigger`, `Autocomplete.Value`, `Autocomplete.Indicator`, `Autocomplete.ClearButton`, `Autocomplete.Popover`, `Autocomplete.Filter`.
- `ComboBox`: parts `ComboBox`, `ComboBox.InputGroup`, `ComboBox.Trigger`, `ComboBox.Popover`.
- `ListBox`: parts `ListBox`, `ListBox.Item`, `ListBox.ItemIndicator`, `ListBox.Section`.
- `Dropdown`: parts `Dropdown`, `Dropdown.Trigger`, `Dropdown.Popover`, `Dropdown.Menu`, `Dropdown.Section`, `Dropdown.Item`, `Dropdown.ItemIndicator`, `Dropdown.SubmenuIndicator`, `Dropdown.SubmenuTrigger`.
- `TagGroup`: parts `TagGroup`, `TagGroup.List`, `Tag`, `Tag.RemoveButton`.

### A.20 Data & feedback: `Skeleton`, `Spinner`, `ProgressBar`, `ProgressCircle`, `Meter`, `Toast`

- `Skeleton`: leaf element with `animationType: "shimmer" | "pulse" | "none"` (default `"shimmer"`) and `className` for shape. **Self-closing.**
- `Spinner`: leaf element with `size: "sm" | "md" | "lg" | "xl"` (default `"md"`), `color: "current" | "accent" | "success" | "warning" | "danger"` (default `"current"`), `className`. **No `label` prop.** SR text comes from a sibling `<span className="sr-only">{t('common.loading')}</span>` or by placing the Spinner inside a labelled region.
- `ProgressBar` / `ProgressCircle` / `Meter`: standard size/color/indeterminate API per docs.
- `Toast`: parts `Toast`, `Toast.Provider`, `Toast.Content`, `Toast.Indicator`, `Toast.Title`, `Toast.Description`, `Toast.ActionButton`, `Toast.CloseButton`, `ToastQueue`, and the imperative `toast` function (`toast.success`, `toast.error`, `toast.promise`, etc.).

### A.21 Layout: `Surface`, `Card`, `Toolbar`, `Separator`, `ScrollShadow`

- `Surface`: leaf element with `variant: "transparent" | "default" | "secondary" | "tertiary"` (default `"default"`), `className`, `children`. Use as the canonical elevated/container surface where `Card` semantics are too narrow.
- `Toolbar`: compound (single primitive with `ToolbarRenderProps`); use for grouped action bars.
- `Separator`: leaf with `orientation: "horizontal" | "vertical"`, `className`.
- `ScrollShadow`: utility wrapper for fade-edge overflow.

### A.22 Media: `Avatar`

- Parts: `Avatar`, `Avatar.Image`, `Avatar.Fallback`.

### A.23 Navigation: `Link`, `Breadcrumbs`, `Pagination`, `Tabs`

- `Link`: parts `Link`, `Link.Icon`. Supports polymorphic `as` (e.g., `as={RouterLink}`).

### A.24 Typography: `Typography`, `Kbd`

- `Typography`: single primitive with `Base`, `Type`, and `Modifier` class hooks; `Prose` mode for rich text.
- `Kbd`: parts `Kbd`, `Kbd.Abbr`, `Kbd.Key`.

### A.25 Pickers: `DatePicker`, `DateRangePicker`, `DateField`, `TimeField`, `Calendar`, `RangeCalendar`

- Standard React Aria-based pickers with documented dot-notation parts (e.g., `DateField.Group`, `DateField.Input`, `DateField.Segment`). Reserved for any future date/time UI; not used today.

---

## Theme Source of Truth

HeroUI v3 is the **only** design-token system in this codebase. The constraints below are binding for any UI work in scope of this feature:

1. All semantic colors, neutrals, radii, shadows, focus rings, surface elevations, motion durations, and font scales MUST be defined as extensions of HeroUI's CSS variables (`--surface`, `--radius`, `--field-radius`, semantic color tokens such as `--accent`, `--success`, `--warning`, `--danger`, etc.) and/or HeroUI's `tailwind-variants` (`tv({ extend: …Variants })`).
2. New project brand tokens MUST be added as **overrides/extensions** of HeroUI's variable layer, in `frontend/src/styles/globals.css` only.
3. A Tailwind `theme.extend` block, a parallel CSS-variable layer, or a `tv()` invocation that defines tokens **independently** of HeroUI is **forbidden**.
4. No arbitrary Tailwind values (`[Npx]`) without a same-line justification comment.
5. Logical CSS only (`ms-*` / `me-*` / `ps-*` / `pe-*` / `text-start` / `text-end`). Physical-direction utilities are forbidden in new code.
6. One accent per page — emerald only (semantic `accent`/`primary` mapped to emerald in `globals.css`). A second hue is forbidden.

## Animation Source of Truth

1. Animations and transitions MUST come from one of: (a) a HeroUI v3 primitive's built-in motion, (b) a HeroUI primitive's `Custom Animations` slot, (c) CSS `transition` / `@keyframes` that extend HeroUI motion tokens (`--motion-duration-*`, `--motion-ease-*`).
2. **Direct `framer-motion` imports in application code are forbidden.** `framer-motion` is a transitive dependency of HeroUI and is used internally by HeroUI; the application MUST NOT import it directly.
3. Page-load animations, parallax, scroll-jacking, autoplay carousels, glow/neon, and glassmorphism remain forbidden per Principle VIII.
4. The per-batch grep gate includes `import .* from ['\"]framer-motion['\"]` (must return zero matches in app code).

---

## Approved Composition Components

The following project-level wrappers are **explicitly permitted** as thin compositions over HeroUI v3 primitives and Lucide icons. They are not exceptions — they are the canonical way to express app-specific shell/layout/section/feature semantics on top of HeroUI. Each wrapper MUST satisfy **all** of:

- (a) Imports its UI children from `@heroui/react` and `lucide-react` only (no other UI library, no raw HTML controls that have a HeroUI equivalent, no custom focus-management or keyboard state machines).
- (b) Does **not** define a parallel design-token system; all tokens come from HeroUI's variable layer.
- (c) Does **not** duplicate a HeroUI primitive's behavior (e.g., does not re-implement `Modal` open/close logic, `Drawer` swipe gestures, `Pagination` step logic, `Tabs` focus management).
- (d) Preserves its **public TypeScript props contract** when feasible (so consumer call sites do not churn).
- (e) If it composes a HeroUI compound primitive, it cites the relevant Anatomy Appendix section in a same-file comment.

| Wrapper | Role | HeroUI primitives composed | Constraint summary |
|---------|------|----------------------------|--------------------|
| `shared/components/PublicLayout.tsx` (if/when introduced) | Storefront shell wrapper | `Surface` (or `Toolbar`) + `Header` composition + page slot + footer composition | Layout-only; no UI primitives reinvented |
| `shared/components/AdminLayout.tsx` (if/when introduced) | Admin shell wrapper | `Drawer` (sidebar) + `AdminHeader` composition + page slot | Layout-only |
| `shared/components/Header.tsx` | Storefront header | `Surface` (or `Toolbar`) + `Button` + `Button as={Link}` + `Drawer` (mobile menu) + `Separator` + Lucide icons | Per Anatomy A.21; sticky positioning via Tailwind utility on the `Surface`'s `className` |
| `features/admin/components/AdminHeader.tsx` | Admin top bar | `Surface` (or `Toolbar`) + `Avatar` (+ `Avatar.Image`/`Avatar.Fallback`) + `Dropdown` (user menu) + `Button` | Per Anatomy A.21 + A.22 |
| `features/admin/components/AdminSidebar.tsx` | Admin side nav | `Drawer` + `Drawer.Body` + HeroUI `Link` (or `Button as={Link}`) + optional `Accordion` for collapsible groups | Per Anatomy A.7 + A.10 |
| `features/auth/components/AuthShell.tsx` | Auth page wrapper | `Surface` + centered `Card` + brand mark | Layout-only |
| `features/auth/components/AuthCard.tsx` | Auth form card | `Card` + `Card.Header` + `Card.Title` + `Card.Description` + `Card.Content` | Per Anatomy A.1 |
| `features/catalog/components/ProductCard.tsx` | Storefront product card | `Card` + `Card.Content` + `Card.Footer` + `Chip` + price text (via `formatCurrency`) + navigable composition pattern | Per Anatomy A.1 |
| `shared/components/Field.tsx` | Generic text/number/email field shim | `TextField` + `Label` + `Input` + `FieldError` (+ optional `Description`) | Per Anatomy A.16 |
| `shared/components/SelectField.tsx` | Generic select field shim | `Select` compound (`Select.Trigger` + `Select.Value` + `Select.Indicator` + `Select.Popover` + `ListBox` + `ListBox.Item`) | Per Anatomy A.19 |
| `shared/components/PaginationControls.tsx` | Pagination shim | `Pagination` compound (`Pagination.Content` + `Pagination.Item` + `Pagination.Link` + `Pagination.Previous` + `Pagination.Next` + `Pagination.Ellipsis` + optional `Pagination.Summary`) | Per Anatomy A.4 |
| `shared/components/Snippet.tsx` | Clipboard-copy primitive | HeroUI `Button` + HeroUI `Tooltip` + Lucide `Copy`/`Check` | Registered as Exception 2 — see `contracts/exceptions-register.md` |
| `shared/components/EmptyState.tsx` | Empty-state surface | `Card` + `Card.Content` + Lucide icon (`aria-hidden` where decorative) + `Typography` (heading) + `Typography` (subtitle) + optional `Button` | **Composition only.** No `EmptyState` import — HeroUI v3 ships no such primitive. |
| `shared/components/DowntimeBanner.tsx` | Downtime banner | `Alert color="danger"` per Anatomy A.3 | |
| `shared/components/ForbiddenBanner.tsx` | Forbidden banner | `Alert color="warning"` per Anatomy A.3 | |
| `shared/components/QueryErrorState.tsx` | Generic query-error banner | `Alert color="danger"` + action `Button` per Anatomy A.3 | |
| `shared/components/PageHeader.tsx` (if/when introduced) | Page title block | `Typography` (title) + `Typography` (subtitle) + optional `Breadcrumbs` + optional `Toolbar` of page-level actions | Per Anatomy A.21 + A.24 + A.11 |
| `features/checkout/components/CheckoutSummary.tsx` (if/when introduced or already present) | Checkout summary card | `Card` + `Card.Content` + line items + `Separator` + totals + `Button` | Per Anatomy A.1 |
| `shared/components/DashboardShell.tsx` (if/when introduced) | Admin dashboard shell | `Surface` + grid composition of `Card` widgets | Per Anatomy A.1 + A.21 |

Any future shell/layout/feature composition component (e.g., a new admin module's section header, a customer-account sidebar) is automatically permitted **provided it satisfies (a)–(e) above**. No additional registration is required; constraints (a)–(e) are the binding contract.

## Deleted Files

The migration deletes **two** project shim files. Their consumers move to existing HeroUI-backed equivalents listed below:

| Deleted file | Replacement | Migration task |
|--------------|-------------|----------------|
| `frontend/src/features/catalog/components/PaginationBar.tsx` | `shared/components/PaginationControls.tsx` (consumes HeroUI `Pagination` compound per Anatomy A.4) | `tasks.md` US8 — T141 (consumer swap) then T142 (delete) |
| `frontend/src/shared/components/LinkButton.tsx` | `<Button as={Link} to=… variant=…>` from `@heroui/react` + `react-router-dom` | `tasks.md` US4 — T048 (delete) then T049–T060 (consumer fix-ups) |

No other source files are deleted in scope of this migration. Any future deletion proposal MUST be added to this table in a doc-only PR before the implementation PR lands.

## Task Acceptance Gate

Every implementation task (any task that adds or modifies UI in `frontend/src/`) MUST satisfy **all** of the following before it is considered done:

1. **HeroUI primitive named.** The task references the specific v3 primitive(s) it uses, with the import path and the matching Anatomy Appendix section (e.g., "per Anatomy A.1" for `Card`).
2. **Mapping row cited.** The task references the row in **Element → HeroUI v3 Export Mapping** that it implements.
3. **Props enumerated.** The task names the v3 props/variants/state attributes set (e.g., `variant="flat"`, `color="danger"`, `size="sm"`, `isDismissible`, `isDisabled`).
4. **i18n keys listed.** The task lists any new i18n keys it introduces (per the New i18n Key Policy above); a task that adds no keys writes "None".
5. **Per-batch gate passes.** The four gates (`npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run i18n:check`, `npm --prefix frontend run lint`) pass cleanly. Bundle size deltas vs. baseline are within ±5%; Vitest runtime within ±10%.
6. **Visual verification matrix passed.** Per-batch manual matrix per `quickstart.md` § Visual Verification Matrix is recorded in the PR.
7. **Grep gate passes.** The per-batch grep returns zero matches for the banned source patterns (or only the documented exception files).

A task that does not satisfy 1–7 is considered incomplete regardless of whether it compiles.

## Exception Model Summary

- **Acceptance criteria for an exception** (see `contracts/exceptions-register.md` for the binding text): (1) no matching v3 export, (2) no closely-equivalent composition of HeroUI primitives is feasible without UX/a11y/visual-system regression, (3) the custom implementation uses HeroUI primitives wherever it can, (4) a same-file justification comment is present, (5) the comment names the specific HeroUI primitive(s) considered and rejected with the rejection reason.
- **Registered exceptions today**: Exception 2 (`Snippet`) and Exception 3 (native `<input type="file">`). See the register for files and acceptance gates.
- **Removed in this revision**: Exception 1 (RAC `role="radio"` segment buttons) — sunset condition triggered by HeroUI v3 `ToggleButtonGroup` shipping. See research §9.
- **Re-evaluation cadence**: every exception's sunset condition is re-checked at every HeroUI v3 minor-version bump. If triggered, the exception is auto-opened for re-evaluation in the next release cycle.
