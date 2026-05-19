# Research: HeroUI v3 Full Migration

**Feature**: HeroUI v3 Full Migration
**Branch**: `003-heroui-migration`
**Date**: 2026-05-19 (revised)

## Research Questions

### 1. Which HeroUI v3 exports actually exist for each pattern named in the spec?

**Decision**: Treat the installed `@heroui/react@^3.0.4` `exports` field plus the official v3 docs (https://heroui.com/docs/react/components) as the **joint source of truth**. The spec was originally written against HeroUI v2-era names; many were renamed, removed, or restructured into dot-notation compound parts in v3. The full v3 anatomy is captured in `data-model.md` § **HeroUI v3 Component Anatomy (Appendix)** — every task cites it.

**Confirmed v3 exports relevant to this migration** (verified against the v3 docs and the installed package):

| Spec name (v2)        | v3 export path        | v3 symbol | Status / Anatomy reference |
|-----------------------|-----------------------|-----------|----------------------------|
| `Card` (with `CardHeader`/`CardBody`/`CardFooter` named exports) | `@heroui/react` | `Card` (compound: `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`) | **Renamed anatomy.** v3 uses dot-notation; `CardBody` does not exist (use `Card.Content`). See Anatomy A.1. **No `isPressable` prop.** |
| `Table` (with `TableHeader`/`TableColumn`/`TableBody`/`TableRow`/`TableCell` named exports) | `@heroui/react` | `Table` compound (`Table.Header`, `Table.Column`, `Table.Body`, `Table.Row`, `Table.Cell`, `Table.ScrollContainer`, `Table.Footer`, `Table.LoadMore`, `Table.LoadMoreContent`, `Table.ColumnResizer`, etc.) | **Renamed anatomy.** v3 uses dot-notation. See Anatomy A.2. |
| `Chip`                | `@heroui/react`       | `Chip` + `Chip.Label` | Same name; v3 adds compound `Chip.Label`. See Anatomy A.12. |
| `Badge`               | `@heroui/react`       | `Badge` + `Badge.Anchor` + `Badge.Label` | **New v3 distinction**: `Badge` is for anchored counters (e.g., cart count), distinct from `Chip` (standalone pill). See Anatomy A.13. |
| `Button`              | `@heroui/react`       | `Button` | Same name; v3 prefers `onPress` over `onClick`. See Anatomy A.14. |
| `ButtonGroup` / `CloseButton` | `@heroui/react` | `ButtonGroup` + `ButtonGroup.Separator`; `CloseButton` | New v3 primitives for grouped/icon-close buttons. See Anatomy A.14. |
| `ToggleButton` + `ToggleButtonGroup` | `@heroui/react` | `ToggleButton` + `ToggleButtonGroup` + `ToggleButtonGroup.Separator` | **New v3 primitive used to migrate the four former Exception 1 RAC files.** Selection modes, sizes, orientation, `isDetached`, custom children. See Anatomy A.14 and §9 below. |
| `Input`               | `@heroui/react`       | `Input` (within `TextField`) | Same name; idiomatic wrapping is `TextField` + `Label` + `Input` + `FieldError`. See Anatomy A.16. |
| `Select`              | `@heroui/react`       | `Select` compound (`Select.Trigger`, `Select.Value`, `Select.Indicator`, `Select.Popover`) + `ListBox` + `ListBox.Item` | Compound. See Anatomy A.19. |
| `Textarea` (lowercase a) | `@heroui/react`    | `TextArea` (capital A) | **Renamed casing.** v3 export is `TextArea`. See Anatomy A.16. |
| `SearchField`         | `@heroui/react`       | `SearchField` | New v3 primitive. **Mandatory** for the storefront search box and any admin search input — not conditional. See Anatomy A.18. |
| `InputGroup`          | `@heroui/react`       | `InputGroup` + composition slots (`InputGroup.Prefix`, `InputGroup.Suffix`) | New v3 primitive for prefix/suffix icons & affordances (password toggle, copy button, clear button, currency adornment). See Anatomy A.18. |
| `InputOTP`            | `@heroui/react`       | `InputOTP` + `InputOTP.Group` + `InputOTP.Slot` + `InputOTP.Separator` | New v3 primitive. Reserved for future OTP / verification flows. See Anatomy A.18. |
| `Fieldset`            | `@heroui/react`       | `Fieldset` + `Fieldset.Legend` + `Fieldset.Group` + `Fieldset.Actions` | New v3 primitive for semantically grouped form sections (address block, contact block, etc.). See Anatomy A.18. |
| `NumberField`         | `@heroui/react`       | `NumberField` + composition parts | New v3 primitive. See Anatomy A.18. |
| `Form`                | `@heroui/react`       | `Form` | **Available but not used.** Project deliberately retains raw `<form>` + react-hook-form `handleSubmit`. See §10 below. |
| `Divider`             | `@heroui/react`       | `Separator` | **Renamed.** See Anatomy A.21. |
| `Surface`             | `@heroui/react`       | `Surface` (`variant`, `className`, `children`) | New v3 layout primitive. Use for elevated/container surfaces where `Card` is too narrow. See Anatomy A.21. |
| `Toolbar`             | `@heroui/react`       | `Toolbar` | **New v3 primitive** for grouped action bars (admin row actions, proof-review action set, filter Apply/Clear bar, batch-action clusters). See Anatomy A.21. |
| `Navbar`              | _(not exported)_      | n/a — use composition | **Removed.** v3 has no `Navbar` primitive. The storefront `Header.tsx` is an Approved Composition Component that composes `Surface`/`Toolbar` + `Button` + `Drawer` + `Link` + `Separator`. See §1 "alternatives considered" and `data-model.md` Approved Composition Components. |
| `Pagination`          | `@heroui/react`       | `Pagination` compound (`Pagination.Content`, `Pagination.Item`, `Pagination.Link`, `Pagination.Previous`, `Pagination.Next`, `Pagination.PreviousIcon`, `Pagination.NextIcon`, `Pagination.Ellipsis`, `Pagination.Summary`) | Already wrapped by `shared/components/PaginationControls.tsx`. See Anatomy A.4. |
| `Alert`               | `@heroui/react`       | `Alert` + `Alert.Indicator` + `Alert.Content` + `Alert.Title` + `Alert.Description` | v2-era `Alert.Icon` is **banned**; v3 icon slot is `Alert.Indicator`. See Anatomy A.3. |
| `AlertDialog`         | `@heroui/react`       | `AlertDialog` compound (`AlertDialog.Trigger`, `AlertDialog.Backdrop`, `AlertDialog.Container`, `AlertDialog.Dialog`, `AlertDialog.Header`, `AlertDialog.Heading`, `AlertDialog.Body`, `AlertDialog.Footer`, `AlertDialog.Icon`, `AlertDialog.CloseTrigger`) | **New v3 primitive** for confirm/destroy/irreversible actions, distinct from generic `Modal`. See Anatomy A.6. |
| `Modal`               | `@heroui/react`       | `Modal` compound | Already in use for editing/multi-step modals. See Anatomy A.5. |
| `Drawer`              | `@heroui/react`       | `Drawer` compound | Already in use for cart drawer / mobile menu / admin sidebar. See Anatomy A.7. |
| `Toast`               | `@heroui/react`       | `Toast` compound + imperative `toast()` function (`toast.success`, `toast.error`, `toast.promise`) + `Toast.Provider` + `ToastQueue` | Provider already wired in `app/providers.tsx`. See Anatomy A.20. |
| `Spinner`             | `@heroui/react`       | `Spinner` (props: `size`, `color`, `className`) | **No `label` prop.** SR text comes from a sibling `<span className="sr-only">{t('common.spinner.srLabel')}</span>` or labelled region. See Anatomy A.20. |
| `Skeleton`            | `@heroui/react`       | `Skeleton` (props: `animationType: "shimmer"\|"pulse"\|"none"`, `className`) | **Self-closing element.** Shape via `className` (e.g., `<Skeleton className="h-4 w-32 rounded-lg" />`). NOT a wrapper around children. See Anatomy A.20. |
| `ProgressBar` / `ProgressCircle` / `Meter` | `@heroui/react` | Standard v3 surfaces | See Anatomy A.20. |
| `Breadcrumbs`         | `@heroui/react`       | `Breadcrumbs` + `Breadcrumbs.Item` | Compound. See Anatomy A.11. |
| `Avatar`              | `@heroui/react`       | `Avatar` + `Avatar.Image` + `Avatar.Fallback` | Compound. See Anatomy A.22. |
| `Switch`              | `@heroui/react`       | `Switch` (+ `Switch.Group`) | See Anatomy A.15. |
| `Checkbox` / `CheckboxGroup` | `@heroui/react` | `Checkbox`, `CheckboxGroup` | See Anatomy A.15. |
| `RadioGroup`/`Radio`  | `@heroui/react`       | `RadioGroup` + `Radio` + `Radio.Control` + `Radio.Indicator` + `Radio.Content` | Already in use for `PaymentMethodPicker.tsx`. See Anatomy A.15. |
| `Accordion` / `Disclosure` / `DisclosureGroup` | `@heroui/react` | `Accordion` + `Accordion.Item` + `Accordion.Trigger` + `Accordion.Panel` (+ `Accordion.Indicator`, `Accordion.Body`); `Disclosure` + `DisclosureTrigger` + `DisclosureContent` | See Anatomy A.10. |
| `Tabs`                | `@heroui/react`       | `Tabs` + `Tabs.List` + `Tabs.Tab` + `Tabs.Separator` + `Tabs.Panel` | Already in use in `AdminProductEditPage.tsx`. See Anatomy A.9. |
| `Popover` / `Tooltip` | `@heroui/react`       | `Popover` + `Popover.Trigger` + `Popover.Content` + `Popover.Dialog` + `Popover.Arrow`; `Tooltip` + `Tooltip.Trigger` + `Tooltip.Content` + `Tooltip.Arrow` | See Anatomy A.8. |
| `Typography`          | `@heroui/react`       | `Typography` (with `Base`/`Type`/`Modifier` classes; `Prose` for rich text) | **New v3 primitive.** Replaces hand-styled `<h1>`/`<h2>`/`<h3>`/`<p>` with theme-token-driven typography. See Anatomy A.24. |
| `Kbd`                 | `@heroui/react`       | `Kbd` + `Kbd.Abbr` + `Kbd.Key` | See Anatomy A.24. |
| `Link`                | `@heroui/react`       | `Link` + `Link.Icon` | Supports polymorphic `as={RouterLink}`. See Anatomy A.23. |
| `Autocomplete` / `ComboBox` / `Dropdown` / `TagGroup` / `ListBox` | `@heroui/react` | Standard v3 compounds | See Anatomy A.19. |
| `ScrollShadow`        | `@heroui/react`       | `ScrollShadow` | See Anatomy A.21. |
| `DatePicker` / `DateRangePicker` / `DateField` / `TimeField` / `Calendar` / `RangeCalendar` | `@heroui/react` | Standard v3 picker compounds | Reserved for future use; not part of this migration. See Anatomy A.25. |
| `ColorPicker` / `ColorField` / `ColorSlider` / `ColorSwatch` / `ColorSwatchPicker` | `@heroui/react` | v3 color-value pickers (HSV/RGB) | **Not** a fit for the project's product-variant color swatch picker; the variant picker migrates to `ToggleButtonGroup` (per §9). See Anatomy A.18. |
| `EmptyState`          | _(not exported)_      | n/a — use composition | **Does not exist in v3.** Earlier drafts of this research mistakenly listed it. `EmptyState.tsx` is an Approved Composition Component (`Card` + `Card.Content` + Lucide + `Typography` + optional `Button`). |
| `Snippet`             | _(not exported)_      | n/a — use composition | **Documented exception** (Exception 2) — keep custom `Snippet.tsx` wrapper. |
| `FileInput` / native `<input type="file">` | _(not exported)_ | n/a — use Exception 3 pattern | **Documented exception** (Exception 3) — native input hidden behind a HeroUI `Button` trigger. |

**Rationale**: Tasks must reference v3 names and v3 anatomy, not v2 names. Importing `Divider`, `Navbar`, `CardBody`, `Textarea` (lowercase), `Alert.Icon`, `EmptyState`, `<Card isPressable>`, or `<Spinner label="…">` will produce build failures or silently-ignored props. The Anatomy Appendix in `data-model.md` is the binding reference for every task.

**Alternatives considered**:
- **Bundle `@heroui/v2-compat` shims**: not published; would add a dependency and violate the no-new-dep constraint.
- **Vendor a local `Navbar` wrapper**: hides the fact that v3 has no Navbar primitive; rejected. The header is an Approved Composition Component (composes HeroUI primitives only).
- **Keep listing `EmptyState` as a v3 primitive on the assumption it might ship**: rejected; speculative claims are forbidden in the migration contract. Re-evaluate if HeroUI ships an `EmptyState` primitive in a future v3.x.

---

### 2. What is the documented-exceptions register?

**Decision**: **Two** exception categories are accepted and recorded in `contracts/exceptions-register.md`:

1. **Custom `Snippet` wrapper** (Exception 2) — `shared/components/Snippet.tsx`. HeroUI v3 ships no `snippet` export. The wrapper already composes HeroUI `Button` + `Tooltip` + Lucide icons. No further migration possible until HeroUI ships an equivalent.
2. **Native `<input type="file">`** (Exception 3) — `features/orders/components/PaymentProofUpload.tsx`, `features/admin/catalog/components/ProductImagesSection.tsx`, and `features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` (verify at task time). HeroUI v3 ships no file-input primitive. The native input stays hidden behind a HeroUI `Button` trigger, which is the v3-idiomatic pattern.

**Removed in this revision**: the previous **Exception 1** (RAC `role="radio"` segment buttons in `CategoryChips.tsx` / `SizePicker.tsx` / `ColorPicker.tsx` / `FilterPanel.tsx`) is no longer accepted. The exception's stated sunset condition ("If HeroUI ships a `SegmentedControl` or `ToggleButtonGroup` primitive that supports custom item rendering, re-evaluate this exception") has been triggered: HeroUI v3 ships `ToggleButtonGroup` + `ToggleButton`. The four files migrate to that primitive. See §9 below for the full evaluation trail and the migration path.

**Rationale**: A documented exceptions register prevents (a) future passes from attempting to re-migrate the genuine exceptions and breaking the build, and (b) genuine exceptions from silently drifting past sunset triggers. The acceptance criteria for an exception (per the register) now include a **rejected-primitive trail** clause: the same-file justification comment MUST name the specific HeroUI v3 primitive(s) considered and the concrete rejection reason — a bare "no equivalent" is insufficient.

**Alternatives considered**:
- **Keep Exception 1 with refined justification**: rejected. The v3 `ToggleButtonGroup` ships with `selectionMode="single"`, custom children (including `isIconOnly`+icon), `isDetached`/`fullWidth`/`size` props, and React Aria keyboard/focus/RTL behavior. HeroUI Styling docs explicitly allow `className` overrides on every primitive. The chip/size-pill/color-swatch visual constraints are achievable via the `ToggleButton`'s `className` and `Custom Render Function` surface. A pre-flight evaluation task (T-RAC-Eval, in `tasks.md`) requires the implementer to spike the migration; only if a concrete blocker emerges may the exception be re-opened via a doc-only contract amendment.
- **Install a third-party file-input library**: violates Principle VIII (HeroUI-only) and Principle V (no new deps). Rejected.

---

### 3. Migration ordering — what minimizes merge conflicts and risk?

**Decision**: Execute migration in priority-ordered batches that map 1:1 to the spec's US1–US10, plus **Phase 12b** (RAC sunset migration triggered by §9) and **Phase 13** (Polish). Each batch is self-contained: a single PR with all files for that batch, ending at a green gate (build + test + i18n:check + lint + visual matrix + grep). Recommended order:

| Batch | Spec ref | Scope | Reason for ordering |
|-------|----------|-------|---------------------|
| 1 | US1 — Cards | Replace hand-styled card divs in storefront + admin pages with HeroUI `Card` compound (`Card.Header`/`Card.Title`/`Card.Description`/`Card.Content`/`Card.Footer`) per Anatomy A.1 | Highest token-coverage gain; touches the most files; do it first so later batches inherit Card chrome |
| 2 | US2 — Tables | Replace raw `<table>` admin lists with HeroUI `Table` compound (`Table.ScrollContainer`/`Table.Header`/`Table.Column`/`Table.Body`/`Table.Row`/`Table.Cell`) per Anatomy A.2 | Largest single behavioral migration; isolated to admin |
| 3 | US3 — Chips & Badges | Sweep remaining custom status spans to HeroUI `Chip` (Anatomy A.12); migrate anchored counters (cart count, unread counters) to HeroUI `Badge` (`Badge.Anchor`/`Badge.Label`, Anatomy A.13) | Splits the v2-era "badge" concept into the correct v3 primitives |
| 4 | US4 — Buttons & Links | Delete `LinkButton.tsx`; move all consumers to `<Button as={Link}>`; sweep raw `<button>` to HeroUI `Button` (Anatomy A.14); adopt `Toolbar` (Anatomy A.21) for grouped action bars | Touches the most call sites but each edit is mechanical |
| 5 | US5 — Inputs/Selects/Textareas + groups | Sweep raw form elements to HeroUI `TextField` + `Input` / `Select` / `TextArea` (capital A) / `SearchField` per Anatomy A.16/A.18/A.19; adopt `InputGroup` for prefix/suffix affordances; adopt `Fieldset` for semantically grouped form sections | Must preserve react-hook-form `Controller` integration; gate is form-submission Vitest tests |
| 6 | US6 — Separators | Replace `<hr>` and `border-t`/`border-b` separators with HeroUI `Separator` (Anatomy A.21) | Trivial, low-risk |
| 7 | US7 — Header chrome | Migrate storefront `Header.tsx` to an Approved Composition Component of HeroUI primitives (`Surface`/`Toolbar` + `Button` + `Drawer` + `Link` + `Separator`); v3 ships no `Navbar` export | Single high-visibility component; isolated PR |
| 8 | US8 — Pagination | Delete `features/catalog/components/PaginationBar.tsx`; route `CatalogPage` to `PaginationControls` (HeroUI `Pagination` compound, Anatomy A.4) | Single-file change |
| 9 | US9 — Alerts/Banners | Migrate `DowntimeBanner`, `ForbiddenBanner`, `QueryErrorState` to HeroUI `Alert` (`Alert.Indicator`/`Alert.Content`/`Alert.Title`/`Alert.Description`, Anatomy A.3); audit notification surfaces and route transient feedback through `toast()` (Anatomy A.20) | Three banner files + Toast audit; one PR |
| 10 | US10 — Final sweep | Migrate `EmptyState.tsx` to Approved Composition Component (`Card`+`Typography`+Lucide+`Button` — not a HeroUI primitive); adopt HeroUI `Typography` for hand-styled headings; split confirm/destroy modals to `AlertDialog` (Anatomy A.6); sweep remaining `Spinner`/`Skeleton`/`Breadcrumbs`/`Avatar`/`Switch`/`Checkbox`/`Accordion`/`Tabs`/`Popover`/`Tooltip` gaps | Acceptance gate for SC-001 / SC-002 |
| 12b | Exception 1 sunset | Pre-flight spike (`T-RAC-Eval`) + migrate `CategoryChips.tsx`, `SizePicker.tsx`, `ColorPicker.tsx`, `FilterPanel.tsx` segment buttons to HeroUI `ToggleButtonGroup` + `ToggleButton` per §9 | Triggered by `ToggleButtonGroup` shipping in v3.0.4; sunset condition met |
| 13 | Polish & cross-cutting | DESIGN.md updates, AGENTS.md verification, progress.txt summary, manual cross-story regression, release-candidate tagging | Final acceptance gate |

**Rationale**: Cards first (highest leverage), then tables (largest blast radius but isolated), then mechanical sweeps. Forms (US5) are deliberately placed after the button sweep so HeroUI `Button`-based submit controls are already in place when form internals change. The RAC sunset (Phase 12b) is sequenced after US10's final-sweep audit so the rest of the migration has settled before the segment-button visual refactor lands.

**Alternatives considered**:
- **One mega-PR**: too large to review safely; rejected. Each batch is independently mergeable and revertable.
- **Per-feature batches** (one PR per storefront feature, one per admin feature): increases coordination cost; rejected.

---

### 4. How do we preserve `react-hook-form` + Zod when swapping form elements?

**Decision**: All HeroUI form primitives (`Input`, `Select`, `TextArea`, `SearchField`, `NumberField`, `Checkbox`, `Switch`, `RadioGroup`, `InputOTP`) are wrapped via react-hook-form's `Controller` because they expose controlled `value`/`onChange` APIs through React Aria's `TextField`/`Select`/`NumberField`/etc. containers rather than direct native event delegation. The existing `shared/components/Field.tsx` and `SelectField.tsx` wrappers demonstrate the canonical pattern (`TextField` > `Label` + `Input` + `FieldError`) and are audited in §12.

**Per-batch enforcement**:
1. Each migrated form file MUST keep its existing Zod schema and `useForm({ resolver: zodResolver(schema) })` call unchanged.
2. Native `<input type="text|email|password|tel|url">` → `<Controller render={({ field, fieldState }) => <TextField isRequired isInvalid={!!fieldState.error}><Label>…</Label><Input {...field} />{fieldState.error?.message ? <FieldError>{fieldState.error.message}</FieldError> : null}</TextField>} />`.
3. Native `<input type="number">` → `<Controller render={({ field }) => <NumberField value={field.value} onChange={field.onChange} … />} />`.
4. Native `<input type="search">` → `<Controller render={({ field }) => <SearchField value={field.value} onChange={field.onChange} … />} />`.
5. Native `<select>` → `<Controller render={({ field }) => <Select selectedKeys={field.value ? [field.value] : []} onSelectionChange={(keys) => field.onChange([...keys][0] ?? '')} … />} />`.
6. Native `<textarea>` → `<Controller render={({ field }) => <TextField><Label>…</Label><TextArea {...field} /></TextField>} />` (note: v3 `TextArea` has a capital A).
7. Native `<input type="checkbox">` → `<Controller render={({ field }) => <Checkbox isSelected={field.value} onChange={field.onChange}>{label}</Checkbox>} />`.
8. Native `<input type="radio">` / RAC `role="radio"` segment buttons (Phase 12b) → `<Controller render={({ field }) => <ToggleButtonGroup selectionMode="single" disallowEmptySelection selectedKeys={field.value ? [field.value] : []} onSelectionChange={(keys) => field.onChange([...keys][0])}>…</ToggleButtonGroup>} />` per §9.
9. Native `<input type="checkbox" role="switch">` → `<Controller render={({ field }) => <Switch isSelected={field.value} onChange={field.onChange}>{label}</Switch>} />`.
10. Semantically grouped sections (address block, contact block) wrap their fields in HeroUI `Fieldset` + `Fieldset.Legend` + `Fieldset.Group` (no Controller; Fieldset is layout-only).
11. Existing Vitest tests for form submission must stay green; new tests are added only if the migration changes the field's contract.

**Rationale**: HeroUI v3 form primitives are React Aria–based; their internal state is controlled, and `Controller` is the standard react-hook-form bridge for controlled wrappers. The existing `Field`/`SelectField` wrappers prove the pattern works in production code today.

**Alternatives considered**:
- **`register()` directly with `ref` forwarding**: works for `Input` but not for `Select`/`NumberField`/`Switch` (no native control underneath). `Controller` is uniform and safer.
- **Use HeroUI `Form` primitive for validation/submission**: rejected per §10 — react-hook-form already owns the form-submission contract.

---

### 5. What is the per-batch test/verification strategy?

**Decision**: Each batch PR includes the following verification (and the per-batch gate is "all six pass"):

1. **`npm --prefix frontend run build`** — type-check + bundle. Zero errors. Bundle size ±5% vs. baseline (recorded in the PR description).
2. **`npm --prefix frontend test`** — full Vitest suite. Zero regressions. Forbidden: deleting or weakening existing tests. New tests added only where the migration changes the component's public contract.
3. **`npm --prefix frontend run i18n:check`** — i18n parity. Any new HeroUI compound-primitive labels (e.g., `Pagination.Previous` aria-labels, `Alert.Title` strings, `common.spinner.srLabel`) MUST exist in both `locales/ar/*.json` and `locales/en/*.json`, and the PR description MUST list every new key with both translations.
4. **`npm --prefix frontend run lint`** — zero new warnings.
5. **Visual Verification Matrix** (manual, per modified surface) — see SC-009 in `spec.md` and the matrix template in `quickstart.md` § Visual Verification Matrix. Captures: English LTR, Arabic RTL, light, dark, 375px / 768px / 1280px, keyboard reach, visible focus rings, Escape-close for dismissible overlays, loading / disabled / validation / error states, no horizontal overflow, no broken spacing or mirrored imbalance. The result matrix is recorded in the PR description for every modified surface in the batch.
6. **Per-batch grep gate** (raw-primitive sweep + extended gates) — see `tasks.md` per-batch verification tasks and the extended audit in T165. Specifically:
   - Raw `<button>` (excluding documented exceptions) returns zero.
   - Raw `<a href="…">` for in-app navigation (uses route paths) returns zero.
   - Raw `<input>` / `<select>` / `<textarea>` (excluding Exception 3 `type="file"`) returns zero.
   - Raw `<table>` returns zero.
   - Raw `<dialog>` returns zero.
   - Raw `<hr>` returns zero.
   - Raw `<nav>` / `<header>` / `<footer>` outside the Approved Composition Components returns zero.
   - `import .* from ['\"]framer-motion['\"]` in app code returns zero.
   - Emoji glyphs in `.tsx` files (Unicode emoji ranges) return zero.
   - Hand-styled `<h1>`/`<h2>`/`<h3>`/`<p>` patterns post-`Typography` migration return zero in the touched files.
   - `type="file"` returns only the Exception 3 files.
   - `role="radio"` returns zero after Phase 12b lands (until then, only the four exception files).
   - Any import of a deleted local shim (`LinkButton`, `PaginationBar`) returns zero after its US lands.

**Rationale**: Each gate is automatable except the visual matrix (manual, external screenshot tool per repo boundary). The grep gate extensions catch silent drift (framer-motion direct imports, emoji icons, raw nav primitives) that the original four gates miss.

**Alternatives considered**:
- **Add Playwright/Cypress for visual regression**: forbidden by Repo Boundaries (AGENTS.md + Principle VIII). Rejected.
- **Skip visual matrix until final batch**: defers risk; rejected. The matrix is per-batch.

---

### 6. Are there `npm test` baseline numbers to compare against?

**Decision**: Capture the baseline once at the start of the migration (commit on `main`/`master` before the first batch lands):

- `npm --prefix frontend run build` — record gzip bundle size for the main entry and the largest async chunks.
- `npm --prefix frontend test` — record total runtime and number of tests.

These numbers go into `progress.txt` (lightweight workspace artifact per Long-horizon workflow). Each batch PR description compares against the baseline.

**Rationale**: Per-batch comparison catches surprise regressions (e.g., a Table migration that doubles the bundle). The constitution's "no production behavior change" clause is enforced by build/test/grep gates; performance regressions are detected by the baseline comparison.

---

### 7. Naming clash: the spec mentions "HeroUI `Divider`" but HeroUI v3 only exports `Separator`. How do we phrase this in the data-model?

**Decision**: The data-model lists the v3 export (`Separator`) and bans the v2-era `Divider` name. Tasks must reference `Separator`. Any commit message or PR title using "Divider" must be edited to say "Separator" before merge to avoid documentation drift.

**Rationale**: The spec was originally written against v2 naming; the codebase ships v3. The Anatomy Appendix in `data-model.md` is the single canonical reference; tasks cite it directly.

---

### 8. What about `framer-motion`?

**Decision**: Keep `framer-motion` as a transitive dependency of HeroUI v3 (HeroUI uses it internally for animations). Direct `framer-motion` imports in application code are **forbidden**. The per-batch grep gate includes `import .* from ['\"]framer-motion['\"]` (must return zero matches in app code). The Animation Source of Truth section of `data-model.md` is the binding rule.

**Rationale**: HeroUI controls the animation API surface. Direct `framer-motion` usage drifts the visual system, bypasses HeroUI's motion-reduce defaults, and produces inconsistent timing across primitives.

---

### 9. Exception 1 re-evaluation against `ToggleButtonGroup` (binding decision)

**Context**: The original Exception 1 permitted raw `<button role="radio">` segment buttons in four files (`CategoryChips.tsx`, `SizePicker.tsx`, `ColorPicker.tsx`, `FilterPanel.tsx`) because HeroUI v2's `Radio` primitive imposed a radio-shaped visual that broke the chip/size-pill/color-swatch UX. The exception's sunset condition explicitly named `ToggleButtonGroup` as the trigger: *"If HeroUI ships a `SegmentedControl` or `ToggleButtonGroup` primitive that supports custom item rendering, re-evaluate this exception."*

**Verification (against HeroUI v3 docs + installed `@heroui/react@^3.0.4`)**:

| Capability required by the four files | `ToggleButtonGroup` + `ToggleButton` evidence |
|---------------------------------------|-----------------------------------------------|
| Single-selection radio semantics | `selectionMode="single"` (default) with `disallowEmptySelection` to enforce one-always-selected. |
| Controlled selection state | `selectedKeys: Iterable<Key>` + `onSelectionChange: (keys: Set<Key>) => void`. |
| Custom item rendering (chip text, size pill, color swatch) | `ToggleButton` accepts arbitrary children (icons, text, custom JSX). `isIconOnly` for swatch-only items. Render-prop API documented in `ToggleButton` Custom Render Function section. |
| RTL-safe layout | `orientation: "horizontal" | "vertical"` + React Aria handles `<html dir>` automatically; `isDetached` lets each item render as a gap-separated chip. |
| Keyboard behavior (arrow keys, Home, End, Space, Enter) | Inherited from React Aria `ToggleButtonGroup`; matches the WAI-ARIA radiogroup keyboard model. |
| Focus-visible behavior | HeroUI v3 default focus ring on each `ToggleButton`; can be tuned via `className` per the Styling guide. |
| Chip / pill / swatch visual constraints | The `ToggleButton`'s default chrome (`border-radius`, `padding`, `background`, `data-selected` styling) is overridable via `className` (Styling docs § *Passing Tailwind CSS classes*) and via `tailwind-variants` (`tv({ extend: toggleButtonVariants })`). |
| Sizes (sm / md / lg) | Documented `size: "sm" | "md" | "lg"` propagated by `ToggleButtonGroup` to each child. |
| `isDisabled` | Documented at both group and child level. |

**Decision: Path A — remove Exception 1; migrate the four files.**

The four files migrate to:

```tsx
<ToggleButtonGroup
  selectionMode="single"
  disallowEmptySelection
  isDetached={true /* chip/pill/swatch spacing */}
  size="sm" /* or md/lg per the design */
  aria-label={t('catalog.filters.category')}
  selectedKeys={selectedId ? [selectedId] : []}
  onSelectionChange={(keys) => onChange([...keys][0] ?? null)}
>
  {items.map(item => (
    <ToggleButton
      key={item.id}
      id={item.id}
      aria-label={item.label}
      isIconOnly={false /* true for color-swatch */}
      className={/* chip|pill|swatch class composed via tailwind-variants extending toggleButtonVariants */}
    >
      {renderItem(item)}
    </ToggleButton>
  ))}
</ToggleButtonGroup>
```

The migration is encoded as **Phase 12b — Exception-1 Sunset Migration** in `tasks.md` (tasks `T-RAC-Eval` through `T-RAC-Done`):

- `T-RAC-Eval` (pre-flight spike): build a 30-minute prototype per file demonstrating that `ToggleButtonGroup` reaches the existing design (chip / size-pill / color-swatch shapes) without regression on keyboard navigation, focus ring, or `<html dir>` mirroring. The result MUST be documented in the PR description with screenshots (both themes × both directions × three breakpoints).
- If the spike succeeds (expected): the four files migrate (per-file tasks).
- If the spike reveals a concrete blocker (unexpected): the PR re-opens Exception 1 via a doc-only amendment to `contracts/exceptions-register.md`, citing the specific blocker (e.g., "`.toggle-button` BEM chrome cannot be suppressed to achieve a 32px circular color swatch without forking the variant"), and the four files retain their current pattern. The amended exception MUST satisfy acceptance criterion 5 (rejected-primitive trail).

**Alternatives considered**:
- **Keep Exception 1 silently**: rejected; the sunset trigger is met and silent retention violates the exception register's contract (criterion 5).
- **Migrate without spike**: rejected; a doc-only contract cannot promise that the visual constraints are achievable in practice. The pre-flight evaluation is mandatory before deleting the exception.
- **Migrate only some of the four files**: rejected; partial migration leaves inconsistent patterns. Either all four migrate or all four retain (with a documented blocker).

**Sunset re-check cadence**: every HeroUI v3 minor-version bump (e.g., 3.1.x → 3.2.x), the `T-RAC-Eval` spike is re-run against the new release. If the result changes (e.g., a new primitive ships), the exception is re-opened / re-closed accordingly.

---

### 10. `Form` vs raw `<form>` + react-hook-form (binding decision)

**Context**: HeroUI v3 ships a `Form` primitive (https://heroui.com/docs/react/components/form) with built-in validation/submission/integration with field primitives. The project today uses raw `<form onSubmit={handleSubmit(…)}>` from `react-hook-form` + Zod (`zodResolver`).

**Decision**: **Keep raw `<form>` + react-hook-form `handleSubmit` as the project's form-submission contract. Do NOT migrate to HeroUI `Form`.**

**Justification**:

1. `react-hook-form` is the project's binding form-state contract (per `AGENTS.md` and Constitution Principle VIII). `useState` for form state is forbidden.
2. `react-hook-form`'s `<form onSubmit={handleSubmit(…)}>` already owns submit-side validation via `zodResolver(schema)` and surfaces field-level errors via `formState.errors`.
3. HeroUI `Form` and react-hook-form would compete for ownership of submit-side validation; integrating both adds complexity for no functional gain.
4. **All fields inside** the raw `<form>` MUST be HeroUI v3 primitives (`TextField`/`Input`/`TextArea`/`Select`/`Checkbox`/`Switch`/`RadioGroup`/`NumberField`/`SearchField`/`InputGroup`/`Fieldset`/`InputOTP`/etc.). The raw `<form>` element is the **only** permitted raw HTML primitive in form code.

This decision is encoded in `data-model.md` Anatomy A.17 and in the Element → Export Mapping (Note F).

**Alternatives considered**:
- **Migrate to HeroUI `Form`**: rejected; would force re-authoring every form's submission/validation path with no benefit.
- **Use HeroUI `Form` for forms without complex validation, keep RHF for the rest**: rejected; introduces two parallel form patterns, defeating the spec's consistency goal.

**Re-evaluation trigger**: revisit if `react-hook-form` adoption drops out of the stack or if HeroUI `Form` exposes a documented adapter for react-hook-form.

---

### 11. Verifying provider-chain setup

**Context**: The spec assumes HeroUI v3 is already installed and configured in `frontend/src/app/providers.tsx`. The migration plan must not silently depend on missing provider wiring.

**Decision**: Add a **verification-only** task (no code changes required) at the start of Phase 2 (Foundational): inspect `frontend/src/app/providers.tsx` and confirm it wires the v3 provider chain per HeroUI v3 quick-start. Specifically:

- `HeroUIProvider` (root) — required for v3 theme/variant context.
- `I18nProvider` (or equivalent locale wiring) — passes `locale={i18n.language}` and `dir={i18n.dir()}`.
- `RouterProvider` compatibility — HeroUI v3 components that accept `as={Link}` need the React Aria `RouterProvider` if the app uses non-React-Router navigation; with `react-router-dom@^7`, the standard pattern works.
- `Toast.Provider` (or equivalent toast queue) — required for the imperative `toast()` API.
- Dark/light driver — `next-themes` with `attribute="class"` and `enableSystem` (or equivalent).

The task only **records drift** in the PR; it does **not** modify `providers.tsx` (out of scope for this feature). If drift exists, a follow-up doc-only ticket is created and the implementation continues against the assumption documented in the spec.

**Rationale**: Surfacing drift early is cheap and prevents late-stage failures (e.g., a `Toast.Provider`-less app silently dropping `toast()` calls). Modifying `providers.tsx` is out of scope; an inventory check is in scope.

---

### 12. Verifying shared shim anatomy (`Field.tsx`, `SelectField.tsx`)

**Context**: `plan.md` marks `Field.tsx` and `SelectField.tsx` as UNCHANGED with stable public-props contracts. This must be verified against the v3 Anatomy Appendix before the form-input batches land, because the v3 `TextField`/`Select` compounds differ from the v2-era surface the shims may have been written against.

**Decision**: Add a **verification-only** task at the start of Phase 2 (Foundational): inspect `Field.tsx` and `SelectField.tsx` and confirm they use the v3 compound anatomy (per Anatomy A.16 and A.19). Specifically:

- `Field.tsx`: outer `TextField` + inner `Label` + `Input` (or `TextArea`) + optional `Description` + optional `FieldError`.
- `SelectField.tsx`: outer `Select` + `Select.Trigger` + `Select.Value` + `Select.Indicator` + `Select.Popover` + `ListBox` + `ListBox.Item`.

If the shim already uses the v3 compound, the task records "PASS" in the PR. If it uses v2-era surface, the task does **not** modify the shim in scope of this feature; it raises a follow-up doc-only ticket for a separate batch.

---

## Summary

All research questions are resolved. No NEEDS CLARIFICATION items remain. Key takeaways:

- HeroUI v3 names and anatomy differ widely from the spec's v2-era references; the **Anatomy Appendix** in `data-model.md` is the binding reference for every task.
- **Two** exception categories are accepted (`Snippet` wrapper, native `<input type="file">`). The former Exception 1 (RAC `role="radio"` segment buttons) is **removed**; the four files migrate to `ToggleButtonGroup` + `ToggleButton` in Phase 12b after a mandatory pre-flight spike (`T-RAC-Eval`).
- HeroUI v3 ships several primitives the original plan ignored: `Toolbar`, `Typography`, `Badge`, `AlertDialog`, `Toast`, `Fieldset`, `InputGroup`, `InputOTP`, `Form`, `Surface`. The migration contract now addresses each.
- The project keeps raw `<form>` + react-hook-form `handleSubmit` as its form-submission contract (§10). HeroUI `Form` is not used.
- 10 priority-ordered batches plus Phase 12b (RAC sunset) and Phase 13 (Polish); each batch independently mergeable behind a 4-gate verification + visual matrix + grep gate.
- `react-hook-form` + Zod is preserved via `Controller` on every HeroUI form primitive.
- No browser-automation runner is added (repo boundary).
- Baseline build/test metrics are captured once and compared per batch.
- Provider-chain and shared-shim anatomy verification tasks (§11, §12) are added to Phase 2 (Foundational).
- Direct `framer-motion` imports in app code are forbidden; the per-batch grep gate enforces it (§8).
