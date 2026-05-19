# Quickstart: HeroUI v3 Full Migration

**Feature**: HeroUI v3 Full Migration
**Branch**: `003-heroui-migration`
**Date**: 2026-05-19 (revised)

**Anatomy reference**: every batch's implementation wording is bound by [`data-model.md` § HeroUI v3 Component Anatomy (Appendix)](data-model.md#heroui-v3-component-anatomy-appendix). Every Approved Composition Component listed in [`data-model.md` § Approved Composition Components](data-model.md#approved-composition-components) must satisfy the FR-018 contract. Every exception MUST satisfy [`contracts/exceptions-register.md`](contracts/exceptions-register.md) acceptance criteria 1–5 (rejected-primitive trail required).

## Prerequisites

- Node.js (see `frontend/.nvmrc`)
- Frontend dependencies installed: `npm --prefix frontend install`
- Working tree clean on `003-heroui-migration` branch
- Baseline metrics captured (see "Baseline" below)

## Baseline (capture once, before Batch 1)

Record the following on the parent commit (the tip of `master`/`main` at the time the migration branches off). Store in `progress.txt` or the first batch PR description.

```powershell
# Build size baseline
npm --prefix frontend run build
# Note: gzip size of main bundle + largest async chunks

# Test runtime + count baseline
npm --prefix frontend test
# Note: total runtime, number of tests passing

# i18n key counts baseline
npm --prefix frontend run i18n:check
```

## Per-Batch Migration Recipe

Each of the 10 batches (US1–US10 from `spec.md`) follows the same recipe.

### Step 1 — Read the batch scope

Open `plan.md` "Project Structure" section. Identify the files marked **MODIFIED** (or **DELETED**) for the current batch's user story. Read each file before editing.

### Step 2 — Apply the mapping

Use `data-model.md` "Element → HeroUI v3 Export Mapping" table. For each source pattern found in the file:

1. Add or extend the `import { … } from '@heroui/react'` line at the top.
2. Replace the raw element / hand-styled wrapper with the HeroUI primitive per the mapping row.
3. Preserve every existing prop / event handler / aria attribute / data attribute / className that is not pure styling.
4. Convert pure styling classNames to HeroUI variant + color + size props where possible (e.g., `bg-primary text-primary-foreground` → `variant="primary"`).
5. If a HeroUI compound primitive needs labels not currently in `locales/`, add both `ar` and `en` keys per `data-model.md` "New i18n Keys" section.

### Step 3 — Preserve forms

For form-input migrations (US5), wrap every HeroUI form primitive in `react-hook-form`'s `Controller`:

```tsx
<Controller
  name="email"
  control={control}
  render={({ field, fieldState }) => (
    <TextField isRequired isInvalid={!!fieldState.error}>
      <Label>{t('auth.email')}</Label>
      <Input type="email" {...field} />
      {fieldState.error?.message ? (
        <FieldError>{fieldState.error.message}</FieldError>
      ) : null}
    </TextField>
  )}
/>
```

The Zod schema and `useForm({ resolver: zodResolver(schema) })` call MUST remain unchanged.

### Step 4 — Run the four CLI gates

```powershell
# Type-check + bundle (zero errors; bundle size ±5% of baseline)
npm --prefix frontend run build

# Vitest suite (zero regressions; tests not weakened or deleted)
npm --prefix frontend test

# i18n parity (must pass; mismatches block the batch). PR description MUST list every new key with ar/en translations
npm --prefix frontend run i18n:check

# Lint (no new warnings)
npm --prefix frontend run lint
```

If any gate fails, fix and re-run before opening the PR. Do **not** weaken or skip existing tests (exception: when a public component contract changes — e.g., `LinkButton` deletion in US4, `PaginationBar` deletion in US8, `EmptyState` shim refactor in US10, RAC migration in Phase 12b).

### Step 5 — Run the per-batch grep gate (raw primitives + extended drift gates)

After the batch, the corresponding raw-primitive grep MUST return only the documented-exception files (and only on the exception lines). The full audit catalogue is `contracts/exceptions-register.md` § Audit Procedure and `tasks.md` T165. Example greps per batch:

```powershell
# US2 (Tables) — raw <table> sweep
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<table " -SimpleMatch
# Expected: zero matches

# US2 (Tables) — banned-v2 named exports for Table parts
Select-String -Path "frontend/src/**/*.tsx" -Pattern "\b(TableHeader|TableColumn|TableBody|TableRow|TableCell)\b"
# Expected: zero matches in modified files (only dot-notation Table.* parts)

# US4 (Buttons) — raw <button> sweep (BEFORE Phase 12b: filter the four RAC files; AFTER Phase 12b: zero anywhere)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<button " -SimpleMatch |
  Where-Object { $_.Path -notmatch "CategoryChips|SizePicker|ColorPicker|FilterPanel" }
# Expected: zero matches

# US4 (Links) — LinkButton must be deleted
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "LinkButton" -SimpleMatch
# Expected: zero matches

# US5 (Inputs) — banned Textarea lowercase
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "\bTextarea\b" -CaseSensitive
# Expected: zero matches (v3 export is TextArea, capital A)

# US6 (Separators) — banned Divider name
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "\bDivider\b"
# Expected: zero matches in implementation

# US9 (Alerts) — banned Alert.Icon (v3 uses Alert.Indicator)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "Alert\.Icon" -SimpleMatch
# Expected: zero matches

# US10 (Final sweep) — banned <Card isPressable> (v3 has no isPressable)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "isPressable" -SimpleMatch
# Expected: zero matches

# US10 (Final sweep) — banned <Spinner label="…"> (v3 has no label prop)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<Spinner[^>]*label=" -SimpleMatch
# Expected: zero matches

# Cross-cutting — direct framer-motion imports forbidden in app code
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "from ['\"]framer-motion['\"]"
# Expected: zero matches

# Cross-cutting — raw <a href="/…"> for in-app navigation forbidden
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<a href=`\"/" -SimpleMatch
# Expected: zero matches (use HeroUI Link or Button as={Link})

# Cross-cutting — banned v2 names (EmptyState removed — see targeted check below)
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "\b(CardBody|CardHeader|CardFooter|TableHeader|TableColumn|TableBody|TableRow|TableCell|Divider|Navbar|BreadcrumbsItem|LinkButton|PaginationBar)\b"
# Expected: zero matches in implementation (only "do-not-use" callouts in docs)

# Cross-cutting — EmptyState must NOT be imported from @heroui/react (v3 has no such export)
# Local imports from shared/components/EmptyState are allowed (Approved Composition Component).
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "import\s+\{[^}]*\bEmptyState\b[^}]*\}\s+from\s+['\`"]@heroui/react['\`"]"
# Expected: zero matches
```

Record every grep result in the PR description.

### Step 6 — SC-009 Visual Verification Matrix (per modified surface)

For every modified surface in the batch, capture the following matrix and record it in the PR description:

| Surface | en LTR | ar RTL | light | dark | 375px | 768px | 1280px | keyboard | focus ring | Escape close | loading | disabled | error | empty | overflow | mirror parity |
|---------|:------:|:------:|:-----:|:----:|:-----:|:-----:|:------:|:--------:|:----------:|:------------:|:-------:|:--------:|:-----:|:-----:|:--------:|:-------------:|
| `frontend/src/…/PageA.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ / N/A | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `frontend/src/…/PageB.tsx` | ✅ | ✅ | … | | | | | | | | | | | | | |

**Cell legend**: ✅ PASS, ⚠️ minor (note in PR), ❌ FAIL (block batch), N/A (not applicable). "Escape close" is N/A for surfaces with no dismissible overlay; "empty" is N/A for surfaces without an empty state; "loading/disabled/error" are N/A for surfaces without those states. Mirror parity = "layout symmetry between LTR and RTL is correct (no broken spacing, no inverted icons that should remain directional, no horizontal overflow at any breakpoint)."

The screenshot tool captures the artefacts (per `docs/screenshots/README.md`) but the matrix table itself is the binding gate per SC-009.

### Step 7 — Open the PR

PR title: `feat(ui): US<N> — <user story title> (HeroUI v3 migration)` (or `feat(ui): Phase 12b — RAC sunset to ToggleButtonGroup` for the Exception 1 migration).

PR description MUST include:
- Which user story (US1–US10) or phase (12b) the batch implements
- Files changed (use the file list from `plan.md` "Project Structure")
- The full grep gate output from Step 5 (all expected-zero gates)
- Bundle size delta vs. baseline (target: ±5%)
- Vitest runtime delta vs. baseline (target: ±10%)
- Any new i18n keys introduced (with ar + en translations) under a fenced "New i18n keys" heading; "None" if no keys were added
- The SC-009 Visual Verification Matrix per modified surface (table from Step 6)
- Constitution Principles touched (always VIII; usually II and VI; sometimes IV for payment-proof flows)
- Anatomy citations: which `data-model.md` Anatomy A.x sections the batch implements

## Verification Checklist (run on every batch)

1. `npm --prefix frontend run build` — passes, bundle size ±5% of baseline
2. `npm --prefix frontend test` — passes, runtime ±10% of baseline
3. `npm --prefix frontend run i18n:check` — passes; new keys listed in PR description
4. `npm --prefix frontend run lint` — no new warnings
5. Per-batch grep gate from Step 5 — no unexpected matches across all listed greps
6. **SC-009 Visual Verification Matrix** — every modified surface has a recorded matrix row in the PR description
7. Manual: load every touched page in dev (`npm run dev`), toggle theme, toggle direction, resize to mobile/tablet/desktop. Visual sanity check.
8. Manual: tab through every interactive element on touched pages — focus rings visible, keyboard reach intact
9. Manual: Escape closes any dismissible surface (Modal, Drawer, AlertDialog, Popover) on touched pages
10. Manual: any ad-hoc transient notification surfaces audited and routed through the imperative `toast()` API where applicable (per US9)

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Importing `CardBody` / `CardHeader` / `CardFooter` from `@heroui/react` | TypeScript error: no such export | Use the v3 dot-notation compound: `Card.Header` / `Card.Title` / `Card.Description` / `Card.Content` / `Card.Footer`. **`CardBody` does NOT exist** — use `Card.Content`. See `data-model.md` Anatomy A.1. |
| Importing `TableHeader` / `TableColumn` / `TableBody` / `TableRow` / `TableCell` as named exports | TypeScript error: no such export | Use the v3 dot-notation compound: `Table.ScrollContainer` / `Table.Header` / `Table.Column` / `Table.Body` / `Table.Row` / `Table.Cell` (per Anatomy A.2). |
| Importing `Textarea` (lowercase a) from `@heroui/react` | TypeScript error: no such export | v3 export is `TextArea` (capital A). See Anatomy A.16. |
| Importing `Divider` from `@heroui/react` | TypeScript error: no such export | Import `Separator` instead — HeroUI v3 renamed `Divider` to `Separator`. See Anatomy A.21. |
| Importing `Navbar` from `@heroui/react` | TypeScript error: no such export | Compose the header from `Surface` (or `Toolbar`) + `Button` + `Button as={Link}` + `Drawer` + `Link` + `Separator`. v3 has no `Navbar` primitive; the storefront `Header.tsx` is an Approved Composition Component (see `data-model.md` § Approved Composition Components and US7 in `tasks.md`). |
| Importing `EmptyState` from `@heroui/react` | TypeScript error: no such export | v3 ships **no** `EmptyState` primitive. The `EmptyState.tsx` shim is an Approved Composition Component composing HeroUI `Card` + `Card.Content` + Lucide icon + `Typography` + optional `Button`. See `data-model.md` § Approved Composition Components. |
| Using `<Card isPressable>` or `<Card isPressable as={Link}>` | TypeScript error: prop does not exist; or silently-ignored prop | v3 `Card` exposes **no** `isPressable` prop. Use the v3-canonical navigable card pattern (composition with `<Button as={Link}>` or `<Card.* as={Link}>` if polymorphic). Verify against Anatomy A.1 before importing. |
| Using `<Spinner label="…">` | TypeScript error: prop does not exist; or silently-ignored prop | v3 `Spinner` exposes **no** `label` prop. Provide screen-reader text via a sibling `<span className="sr-only">{t('common.spinner.srLabel')}</span>` or by placing the Spinner inside a labelled region. See Anatomy A.20. |
| Wrapping `<Skeleton>` around a `<div>` | Skeleton renders nothing or wrong shape | v3 `Skeleton` is **self-closing**; shape via `className` (e.g., `<Skeleton className="h-4 w-32 rounded-lg" animationType="shimmer" />`). See Anatomy A.20. |
| Using `<Alert.Icon>` for the alert icon slot | TypeScript error: no such part; or silently-ignored | v3 alert anatomy uses `<Alert.Indicator>` (icon slot), `<Alert.Content>`, `<Alert.Title>`, `<Alert.Description>`. See Anatomy A.3. |
| Using `<Chip>` for an anchored numeric counter (e.g., cart-count) | Visually wrong (no anchor); RTL anchor positioning broken | Use HeroUI `<Badge>` + `<Badge.Anchor>` + `<Badge.Label>` for anchored counters. `Chip` is for standalone status pills. See Anatomy A.13 vs. A.12 and FR-005a / FR-005b. |
| Using `<Modal>` for a confirm/destroy/irreversible-action dialog | Wrong semantic role; missing AlertDialog status | Use HeroUI `<AlertDialog>` per Anatomy A.6 for confirm / destroy / approve / reject / transition flows. `<Modal>` stays for generic editing / multi-step modals. See FR-010c. |
| Wrapping a button cluster in `<div class="flex gap-2">` | No ARIA toolbar semantics; keyboard navigation drift | Use HeroUI `<Toolbar aria-label="…">` per Anatomy A.21 for grouped action bars (admin row actions, proof-review action sets, filter Apply/Clear bars, batch-action clusters). See FR-010a. |
| Hand-styling a heading as `<h1 class="text-2xl font-semibold">` | Theme-token bypass; no `Typography` cascade | Use HeroUI `<Typography>` per Anatomy A.24 with the appropriate `Type` / `Modifier` classes; or `<Card.Title>` / `<Card.Description>` inside a `Card`. See FR-010b. |
| Wrapping an address/contact/shipping/payment block in `<div class="space-y-4">` | Loses semantic grouping; no `<legend>` association | Use HeroUI `<Fieldset>` + `<Fieldset.Legend>` + `<Fieldset.Group>` per Anatomy A.18. See FR-010e. |
| Hand-styling a search-icon prefix or password-reveal toggle inside `<Input>` | Inconsistent affordance chrome; multiple ad-hoc patterns | Use HeroUI `<InputGroup>` + `<InputGroup.Prefix>` / `<InputGroup.Suffix>` per Anatomy A.18. See FR-010f. |
| Touching a `role="radio"` segment button (`CategoryChips` / `SizePicker` / `ColorPicker` / `FilterPanel`) before Phase 12b | Inconsistent migration state | The four files migrate to `ToggleButtonGroup` + `ToggleButton` in **Phase 12b** (the previous Exception 1 was removed because v3 ships `ToggleButtonGroup`). Until Phase 12b lands, the raw JSX stays untouched. After Phase 12b, the four files use the v3 primitive. See research §9 and `tasks.md` Phase 12b. |
| Replacing `Snippet.tsx` with a non-existent `@heroui/react` export | Build error | `Snippet` is documented Exception 2 (HeroUI v3 has no `snippet` export); keep the wrapper, which composes HeroUI `Button` + `Tooltip` + Lucide icons. |
| Native file input "migrated" to a non-existent HeroUI primitive | Build error | Documented Exception 3 — keep the hidden `<input type="file">` triggered by a HeroUI `Button` per `contracts/exceptions-register.md` Exception 3. |
| `useState` for form field value after HeroUI swap | Form submission breaks or duplicate state | Wrap in `Controller`; remove the local `useState`. See `research.md` §4. |
| Using HeroUI `<Form>` primitive for validation/submission | Competing form contracts; submission breaks | Project policy: keep raw `<form onSubmit={handleSubmit(…)}>` from react-hook-form. HeroUI `Form` is **not** used. Fields **inside** the `<form>` MUST be HeroUI primitives. See `research.md` §10. |
| `<Button onClick={…}>` | Click handler doesn't fire on keyboard activation in some flows | Use `onPress` (React Aria event) — `onClick` is supported but `onPress` is the canonical event. |
| `<Button className="ml-2">` | RTL layout breaks | Use `className="ms-2"` — logical CSS only (FR-013). |
| Adding a new user-facing string in `en/*.json` but not `ar/*.json` | `npm run i18n:check` fails | Always add to both locale files; list every new key in PR description with both translations (`data-model.md` § New i18n Key Policy). |
| Trying to `Controller` a `<Switch>` with `value` | `Switch` uses `isSelected` / `onChange` | `render={({ field }) => <Switch isSelected={field.value} onChange={field.onChange}>…</Switch>}` per Anatomy A.15. |
| Importing `framer-motion` directly in app code | Animation drift; theme bypass | Direct `framer-motion` imports in app code are forbidden (FR-020 / SC-010). Use HeroUI primitive motion or `Custom Animations` slots; CSS transitions / keyframes that extend HeroUI motion tokens are also acceptable. |
| Using emoji as a UI icon | Inconsistent across platforms; theme bypass | Lucide icons only. The per-batch grep gate flags emoji glyphs in `.tsx` files. |
| Using raw `<a href="/…">` for in-app navigation | Misses HeroUI Link styling and React Aria semantics | Use HeroUI `<Link as={RouterLink}>` (per Anatomy A.23) or `<Button as={Link}>` (per Anatomy A.14). |
| Defining a parallel Tailwind `theme.extend` block | Bypasses HeroUI tokens; theme drift | New tokens MUST extend HeroUI's CSS-variable layer in `frontend/src/styles/globals.css` (FR-019). No parallel theme system. |

## Key Files

| File | Role |
|------|------|
| `frontend/package.json` | Confirms `@heroui/react@^3.0.4` is installed |
| `node_modules/@heroui/react/package.json` | Authoritative list of v3 exports (consulted by `research.md` §1) |
| `frontend/src/app/providers.tsx` | Provider chain — audited (read-only) by Phase 2 task T007 (research §11) |
| `frontend/src/styles/globals.css` | OKLCH palette + HeroUI v3 token aliases — the **only** place new theme tokens are defined (per FR-019) |
| `frontend/src/shared/components/PaginationControls.tsx` | Reference impl: thin HeroUI `Pagination` shim per Anatomy A.4 |
| `frontend/src/shared/components/Field.tsx` + `SelectField.tsx` | Reference impl: HeroUI form wrappers (`TextField`/`Select` compounds) via `Controller` per Anatomy A.16 / A.19 |
| `frontend/src/features/auth/components/AuthCard.tsx` | Reference impl: HeroUI `Card` compound (feature 002) per Anatomy A.1 |
| `frontend/src/features/checkout/components/PaymentMethodPicker.tsx` | Reference impl: HeroUI `RadioGroup` + `Radio` + `Radio.Control` + `Radio.Indicator` + `Radio.Content` per Anatomy A.15 |
| [`specs/003-heroui-migration/data-model.md`](data-model.md) | **Authoritative anatomy contract** — consult before every edit |
| [`specs/003-heroui-migration/data-model.md#heroui-v3-component-anatomy-appendix`](data-model.md#heroui-v3-component-anatomy-appendix) | The Anatomy Appendix (A.1–A.25) — the binding reference for every task |
| [`specs/003-heroui-migration/data-model.md#approved-composition-components`](data-model.md#approved-composition-components) | The Approved Composition Components contract (FR-018) |
| [`specs/003-heroui-migration/data-model.md#deleted-files`](data-model.md#deleted-files) | The canonical Deleted Files list (`LinkButton.tsx`, `PaginationBar.tsx`) |
| [`specs/003-heroui-migration/data-model.md#theme-source-of-truth`](data-model.md#theme-source-of-truth) | Theme source-of-truth rule (FR-019) |
| [`specs/003-heroui-migration/data-model.md#animation-source-of-truth`](data-model.md#animation-source-of-truth) | Animation source-of-truth rule (FR-020) |
| [`specs/003-heroui-migration/data-model.md#task-acceptance-gate`](data-model.md#task-acceptance-gate) | The 7-point acceptance gate every task must satisfy |
| [`specs/003-heroui-migration/contracts/exceptions-register.md`](contracts/exceptions-register.md) | Accepted exceptions (Exceptions 2 + 3) plus the audit procedure — consult before touching any exception file |
| [`specs/003-heroui-migration/research.md`](research.md) | Verified v3 anatomy + Exception 1 sunset evaluation (§9) + Form/RHF decision (§10) + Provider audit (§11) + Shim audit (§12) |
| [`specs/003-heroui-migration/spec.md`](spec.md) | Functional Requirements (FR-001–FR-020) + Success Criteria (SC-001–SC-011) |
| [`specs/003-heroui-migration/tasks.md`](tasks.md) | Per-batch tasks; consult for exact file paths and Anatomy citations |
| `DESIGN.md` | Visual system rules; updated in Phase 13 / T169 to reflect the v3 patterns |
| `AGENTS.md` | Day-to-day project conventions, including HeroUI-only rule |
| `.specify/memory/constitution.md` | Principle VIII (UI System & Visual Discipline) — the binding rule |

## Anchors (data-model.md and exceptions-register.md)

For quick navigation:

- `data-model.md#heroui-v3-component-anatomy-appendix` — binding anatomy contract.
- `data-model.md#approved-composition-components` — wrapper contract (FR-018).
- `data-model.md#deleted-files` — list of files this migration deletes.
- `data-model.md#theme-source-of-truth` — FR-019 rule.
- `data-model.md#animation-source-of-truth` — FR-020 rule.
- `data-model.md#new-i18n-key-policy` — i18n addition rule.
- `data-model.md#task-acceptance-gate` — 7-point per-task gate.
- `data-model.md#exception-model-summary` — exception model.
- `contracts/exceptions-register.md#acceptance-criteria-for-an-exception` — 5-point exception criteria (rejected-primitive trail required).
- `contracts/exceptions-register.md#approved-composition-components` — the composition-wrapper contract restated alongside the exceptions.
- `contracts/exceptions-register.md#sunset-re-evaluation-cadence` — every-minor-version re-check rule.

## When You Are Done

After the final batch (US10 + Phase 12b) lands:

1. The exceptions audit in `contracts/exceptions-register.md` "Audit Procedure" MUST pass (every grep returns its expected result).
2. Run the full test suite once more from a clean install: `npm --prefix frontend ci && npm --prefix frontend test && npm --prefix frontend run build && npm --prefix frontend run i18n:check && npm --prefix frontend run lint`.
3. Capture final bundle size and Vitest runtime — confirm they are within tolerance of the baseline (±5% bundle, ±10% runtime).
4. Update `DESIGN.md` (per `tasks.md` T169) with the canonical v3 patterns: `Card` dot-notation; `Table.ScrollContainer`; `Badge` vs. `Chip`; `AlertDialog` vs. `Modal`; `Toolbar`; `Typography`; `ToggleButtonGroup`; `EmptyState` as composition wrapper; composed-from-primitives `Header`.
5. Confirm `AGENTS.md` "Key Conventions" still names HeroUI v3 as the sole UI library, Lucide as the sole icon set, and react-hook-form + Zod as the form contract.
6. Append the migration-completion entry to `progress.txt` (per T171): final deltas, exceptions registered (2), exception removed (1), files deleted (2), Approved Composition Components touched.
7. Close the feature branch via the standard release process.
