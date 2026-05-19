# UI Contract: Accepted-Exceptions Register

**Feature**: HeroUI v3 Full Migration
**Branch**: `003-heroui-migration`
**Date**: 2026-05-19 (revised — Exception 1 removed; acceptance criterion 5 added; sunset re-evaluation cadence added; Approved Composition Components subsection added)

## Purpose

Constitution Principle VIII forbids raw `<button>`, `<input>`, `<select>`, `<dialog>`, `<table>`, etc., "**when a HeroUI equivalent exists**." This document is the canonical list of patterns where no HeroUI v3 equivalent exists, and therefore the raw / custom implementation is permitted. Anything not listed here MUST be migrated to a HeroUI v3 primitive.

This register is the **contract** that `/speckit.tasks` and `/speckit.implement` consult before emitting a migration task. A future audit that finds a pattern not in this register and not migrated is a constitutional violation.

## Acceptance Criteria for an Exception

A pattern qualifies as a permitted exception **only if all five** hold:

1. **No matching `@heroui/react@^3.0.4` export exists.** Verified by inspecting `node_modules/@heroui/react/package.json` `exports` field and the official v3 docs (https://heroui.com/docs/react/components).
2. **No closely-equivalent composition of HeroUI primitives is feasible** without regressing UX, accessibility, or the visual system. "Closely-equivalent" means a composition that ships React Aria semantics, focus-ring tokens, theme tokens, RTL parity, and keyboard behavior matching the HeroUI baseline — not just "any combination of HeroUI primitives that approximates the appearance."
3. **The custom implementation uses HeroUI primitives wherever it can.** (E.g., the `Snippet` wrapper uses HeroUI `Button` and `Tooltip` internally; the `<input type="file">` exception uses a HeroUI `Button` as the visible trigger.)
4. **A same-file justification comment is present**, referencing this register and citing the rationale.
5. **Rejected-primitive trail.** The same-file justification comment MUST name the **specific HeroUI v3 primitive(s) considered** and the **concrete rejection reason** for each. A bare "no HeroUI equivalent" comment is **insufficient**. Examples of acceptable form:
   - "Considered HeroUI `Snippet` — not exported by v3.0.4 (`exports` field). Considered composing `Button` + `Tooltip` — done internally; this file IS that composition."
   - "Considered HeroUI `FileTrigger` / `FileInput` — not exported by v3.0.4 and React Aria does not abstract the OS file picker. Native `<input type=\"file\">` is the only path; visible trigger is a HeroUI `Button`."

If any of these five fails, the pattern is NOT an exception and MUST be migrated.

## Registered Exceptions

### Exception 1 — *removed in this revision*

**Status**: Removed (sunset condition triggered).

**History**: Previously permitted raw `<button role="radio">` segment buttons in `CategoryChips.tsx`, `SizePicker.tsx`, `ColorPicker.tsx`, and `FilterPanel.tsx` because HeroUI v2's `Radio` primitive imposed a radio-shaped visual that broke the chip / size-pill / color-swatch UX. The exception's stated sunset condition was: *"If HeroUI ships a `SegmentedControl` or `ToggleButtonGroup` primitive that supports custom item rendering, re-evaluate this exception."*

**Trigger**: HeroUI v3.0.4 ships `ToggleButtonGroup` + `ToggleButton` with `selectionMode="single"`, `disallowEmptySelection`, `isDetached`, `fullWidth`, `size`, custom children (including `isIconOnly` + arbitrary JSX), and React-Aria-driven keyboard / focus / RTL behavior. HeroUI Styling docs explicitly allow `className` overrides on every primitive (BEM `.toggle-button` chrome can be overridden via Tailwind classes or `tailwind-variants` extending `toggleButtonVariants`). See `research.md` §9 for the full evaluation trail.

**Resolution**: The four files migrate to HeroUI `ToggleButtonGroup` + `ToggleButton` in `tasks.md` Phase 12b after a mandatory pre-flight spike (`T-RAC-Eval`). Justification comments (the previous `// intentional: raw <button role="radio"> keeps the RAC radiogroup pattern per DESIGN.md.`) MUST be **removed** when the migration lands and replaced with a `// migrated to HeroUI ToggleButtonGroup per exceptions-register.md Exception 1 removal (research §9).` comment for one revision cycle (then deleted).

**Re-opening clause**: If the `T-RAC-Eval` spike reveals a concrete blocker (e.g., a `.toggle-button` BEM-chrome property that cannot be suppressed without forking the variant, breaking a specific 32px circular-swatch shape), the PR MAY re-open Exception 1 via a doc-only amendment to this file. The re-opening amendment MUST satisfy acceptance criterion 5 (rejected-primitive trail with the concrete blocker). Until such an amendment lands, the four files migrate.

---

### Exception 2 — `Snippet` wrapper (clipboard-copy primitive)

**File**: `frontend/src/shared/components/Snippet.tsx`

**Pattern**: A composition of HeroUI `Button` (icon-only, ghost variant) + HeroUI `Tooltip` + Lucide `Copy` / `Check` icons. The wrapper exposes a v2-era `Snippet` ergonomic API on top of v3-native parts.

**Justification**: HeroUI v3.0.4 ships no `snippet` export (verified against `node_modules/@heroui/react/package.json` `exports` field and the official v3 component catalogue). The wrapper itself contains zero non-HeroUI controls — it is a composition file, not a custom UI primitive. It is therefore Principle-VIII-compliant.

**Rejected-primitive trail (criterion 5)**: Considered HeroUI `Snippet` — not exported by v3.0.4 (verified). Considered native `<button>` + `navigator.clipboard.writeText` — rejected because it would re-introduce a raw `<button>` (violates FR-003). The current composition (HeroUI `Button` + HeroUI `Tooltip` + Lucide icons) is the v3-idiomatic answer.

**Acceptance gate**: The file MUST NOT introduce any raw `<button>` or non-Lucide icon. It MUST continue to import `Button` and `Tooltip` from `@heroui/react` and `Copy` / `Check` icons from `lucide-react`. Same-file justification comment MUST cite this register and satisfy criterion 5.

**Sunset condition**: If HeroUI ships a `Snippet` primitive in a future v3.x release, replace this wrapper with the export. The sunset re-check cadence (see Versioning below) re-runs at every HeroUI v3 minor-version bump.

---

### Exception 3 — Native `<input type="file">`

**Files** (consumers):
- `frontend/src/features/orders/components/PaymentProofUpload.tsx`
- `frontend/src/features/admin/catalog/components/ProductImagesSection.tsx`
- `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx` (if it uploads a proof/QR; verify during implementation)

**Pattern**: A hidden `<input type="file" ref={…} class="sr-only">` triggered by a visible HeroUI `<Button>` via `onPress={() => inputRef.current?.click()}`. The button — not the native input — is what the user sees and interacts with.

**Justification**: HeroUI v3.0.4 ships no file-input export (verified against `node_modules/@heroui/react/package.json` and the v3 component catalogue). The native input is required for the OS file picker; React Aria does not abstract it. The HeroUI `Button` trigger wraps the native input, so the only non-HeroUI surface is the (visually hidden) input itself.

**Rejected-primitive trail (criterion 5)**: Considered HeroUI `FileTrigger` / `FileInput` — not exported by v3.0.4 (verified). Considered React Aria `FileTrigger` directly (without `@heroui/react`) — rejected because it would introduce a non-HeroUI third-party UI primitive (violates FR-014). Considered Cloudinary widget direct upload — rejected because it would shift auth and storage concerns into the upload widget (out of scope; violates Principle V structural integrity). The current pattern (hidden `<input type="file">` + HeroUI `Button` trigger) is the v3-idiomatic answer.

**Acceptance gate**: The native `<input type="file">` MUST be visually hidden (`sr-only` or equivalent), MUST be triggered by a HeroUI `Button`, and MUST live inside a `<label>` or have its corresponding label tied via `htmlFor`/`id` for accessibility. The visible `Button` MUST carry the user-facing label and `aria-label`. Same-file justification comment MUST cite this register and satisfy criterion 5.

**Sunset condition**: If HeroUI or React Aria ship a `FileTrigger` / `FileInput` primitive, replace this pattern with the export. Re-checked at every v3 minor-version bump.

---

## Anti-Exception Examples (NOT permitted)

The following patterns have been considered and **rejected** as exceptions. They MUST be migrated:

1. **"This `<button>` already looks fine"** — every raw `<button>` in non-exception files MUST become a HeroUI `Button` regardless of how its current styling looks. The point is token inheritance.
2. **"This `<table>` is small / read-only"** — table-size is irrelevant. All raw `<table>` elements (12 matches across 4 admin files) MUST become HeroUI `Table` (compound: `Table.ScrollContainer` > `Table.Header` > `Table.Column`; `Table.Body` > `Table.Row` > `Table.Cell`).
3. **"This `<select>` is a quick filter"** — all raw `<select>` (21 matches across 9 files) MUST become HeroUI `Select` compound. The existing `shared/components/SelectField.tsx` wrapper is the reference impl.
4. **"This `<hr>` is just visual separation"** — the single `<hr>` in `Header.tsx` MUST become a HeroUI `Separator`. Manual `border-t`/`border-b` separators MUST also become `Separator` (US6).
5. **"The custom `LinkButton` is convenient"** — `shared/components/LinkButton.tsx` MUST be deleted; callers move to `<Button as={Link}>`.
6. **"The custom `PaginationBar` works"** — `features/catalog/components/PaginationBar.tsx` MUST be deleted; consumers use the existing `PaginationControls` shim.
7. **"This card needs `isPressable`"** — v3 `Card` exposes no `isPressable` prop. Use the v3-canonical navigable card pattern from `data-model.md` Anatomy A.1 (composition with `<Button as={Link}>` or `<Card.* as={Link}>` after verification). The v2-era syntax is forbidden.
8. **"This `Spinner` needs a `label` prop"** — v3 `Spinner` has no `label` prop. SR text comes from a sibling `<span className="sr-only">` or a labelled region.
9. **"This `EmptyState` needs a HeroUI primitive"** — v3 ships no `EmptyState` primitive. The `EmptyState.tsx` wrapper is an Approved Composition Component (`Card` + `Card.Content` + Lucide + `Typography` + optional `Button`).
10. **"This `Navbar` would be cleaner with a HeroUI export"** — v3 ships no `Navbar` primitive. The `Header.tsx` wrapper is an Approved Composition Component (`Surface` (or `Toolbar`) + `Button` + `Drawer` + `Link` + `Separator`).
11. **"This `Alert` needs `Alert.Icon`"** — v3 alert anatomy uses `Alert.Indicator` (icon slot), `Alert.Content`, `Alert.Title`, `Alert.Description`. The v2 name `Alert.Icon` is forbidden.
12. **"This `Textarea` is fine in lowercase"** — v3 export is `TextArea` (capital A). Lowercase casing is forbidden.
13. **"This animation needs `framer-motion` directly"** — direct `framer-motion` imports in app code are forbidden (FR-020). Use HeroUI primitive motion or HeroUI's `Custom Animations` slot.

## Approved Composition Components

**Approved Composition Components are NOT exceptions** — they are app-specific shell / layout / section / feature wrappers that are explicitly permitted as **thin compositions over HeroUI v3 primitives and Lucide icons**. They are the canonical way to express app-specific layout / shell semantics on top of HeroUI; they do not duplicate HeroUI behavior, do not define a parallel token system, and do not introduce non-HeroUI UI primitives.

The canonical list, contract, and anatomy citations live in `data-model.md` § **Approved Composition Components**. Examples include:

- `AuthShell`, `AuthCard` — auth shell + card.
- `Header` (storefront), `AdminHeader`, `AdminSidebar`, `PublicLayout`, `AdminLayout`, `DashboardShell` — shell / layout wrappers.
- `ProductCard`, `CheckoutSummary`, `PageHeader` — feature-section wrappers.
- `Field`, `SelectField` — form-field shims.
- `PaginationControls` — pagination shim.
- `Snippet` — clipboard-copy wrapper (also registered as Exception 2 because `Snippet` itself is not exported by v3, but the wrapper is HeroUI-only internally).
- `EmptyState` — empty-state wrapper (composes `Card` + `Card.Content` + Lucide + `Typography` + optional `Button`; **no `EmptyState` HeroUI import** because v3 ships no such primitive).
- `DowntimeBanner`, `ForbiddenBanner`, `QueryErrorState` — banner shims over HeroUI `Alert`.
- Any future shell / layout / section / feature wrapper.

**Binding contract** for every Approved Composition Component (per FR-018):

- (a) Imports its UI children from `@heroui/react` and `lucide-react` only.
- (b) Does not define a parallel design-token system; all tokens come from HeroUI's variable layer.
- (c) Does not duplicate a HeroUI primitive's behavior (open/close, focus management, keyboard handling).
- (d) Preserves its public TypeScript props contract when feasible.
- (e) If composing a HeroUI compound primitive, cites the relevant Anatomy Appendix section in a same-file comment.

An Approved Composition Component does **not** require registration in this exceptions register. It is automatically permitted provided constraints (a)–(e) are satisfied. The migration tasks for new wrappers cite the data-model.md anatomy directly.

## Audit Procedure

After every batch and again as the final acceptance gate (`tasks.md` T165), run the following grep audit from the repo root:

```powershell
# Should return ONLY the 4 RAC files BEFORE Phase 12b lands; ZERO matches AFTER Phase 12b
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<button[^>]*role=`"radio`"" -SimpleMatch

# Should return EMPTY (no raw <table>, <hr>, <dialog>)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<table " -SimpleMatch
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<hr " -SimpleMatch
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<dialog" -SimpleMatch

# Should return ONLY the Exception 3 files
Select-String -Path "frontend/src/**/*.tsx" -Pattern "type=`"file`"" -SimpleMatch

# Should return EMPTY (no raw form elements outside Exception 3)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<input " -SimpleMatch | Where-Object { $_ -notmatch 'type="file"' }
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<select " -SimpleMatch
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<textarea " -SimpleMatch

# Should return EMPTY (no raw <button> outside the four RAC files BEFORE Phase 12b; ZERO after)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<button " -SimpleMatch

# Should return EMPTY (no raw nav chrome outside Approved Composition Components)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<nav " -SimpleMatch | Where-Object { $_.Path -notmatch 'Header.tsx|AdminHeader.tsx|AdminSidebar.tsx' }
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<header " -SimpleMatch | Where-Object { $_.Path -notmatch 'Header.tsx|AdminHeader.tsx' }
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<footer " -SimpleMatch | Where-Object { $_.Path -notmatch 'Footer.tsx|PublicLayout.tsx' }

# Should return EMPTY (no direct framer-motion imports in app code)
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "from ['\"]framer-motion['\"]"

# Should return EMPTY (no banned v2 names in implementation)
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "\b(CardBody|CardHeader|CardFooter|TableHeader|TableColumn|TableBody|TableRow|TableCell|Divider|Navbar|Alert\.Icon|BreadcrumbsItem|LinkButton|PaginationBar)\b"
# (this gate runs across imports and JSX; surfaces banned identifiers anywhere in app code)

# Should return EMPTY (no importing EmptyState from @heroui/react — v3 does not export it)
# NOTE: Local imports from frontend/src/shared/components/EmptyState are ALLOWED (Approved Composition Component).
#       Importing EmptyState from @heroui/react is forbidden because HeroUI v3 does not export an EmptyState primitive.
#       The local EmptyState.tsx wrapper remains governed by the Approved Composition Components contract (data-model.md).
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "import\s+\{[^}]*\bEmptyState\b[^}]*\}\s+from\s+['\`"]@heroui/react['\`"]"
# Expected: zero matches

# Should return EMPTY (no Textarea lowercase in implementation — v3 export is TextArea)
Select-String -Path "frontend/src/**/*.tsx","frontend/src/**/*.ts" -Pattern "\bTextarea\b" -CaseSensitive

# Should return EMPTY (no <Card isPressable in v3)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "isPressable" -SimpleMatch

# Should return EMPTY (no Spinner label= in v3)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<Spinner[^>]*label=" -SimpleMatch

# Should return EMPTY (no <a href=…> for in-app routing; use HeroUI Link or Button as={Link})
# (manual review pass; href values that start with `/` indicate in-app navigation)
Select-String -Path "frontend/src/**/*.tsx" -Pattern "<a href=`"/" -SimpleMatch

# Should return EMPTY (no emoji in .tsx files)
# Use grep with a Unicode emoji range pattern; manual visual review pass during the final batch.
```

If any grep returns unexpected matches, the migration is incomplete and the corresponding batch (or final-sweep batch) MUST be re-opened.

## Versioning

This register is versioned alongside the constitution. **Adding** an exception requires:

1. A PR description that names the exception, the rationale, the rejected-primitive trail (criterion 5), and the sunset condition.
2. Sign-off from the repo maintainer.
3. A matching update to `DESIGN.md` if the change affects the visual system.
4. A matching update to `data-model.md` (if the new exception affects an existing mapping row or composition wrapper).

**Removing** an exception (when the sunset condition is met) requires:

1. A PR description that names the exception, references the sunset trigger (e.g., "HeroUI v3.x.y now ships `<primitive>`"), and links the migration tasks.
2. The migration tasks themselves landing in the same release cycle (or a sequenced follow-up).
3. A matching update to `data-model.md` (Approved Composition Components section if the removal converts a wrapper to a primitive consumer).

## Sunset Re-evaluation Cadence

Every exception's sunset condition is re-checked at **every HeroUI v3 minor-version bump** (e.g., 3.0.x → 3.1.0, 3.1.x → 3.2.0). The re-check is a doc-only pass:

1. Review the HeroUI v3 changelog for the bumped version.
2. For each registered exception, ask: "Has its sunset condition triggered?"
3. If yes: open a doc-only PR that either (a) removes the exception and adds migration tasks, or (b) refines the rejected-primitive trail with a concrete blocker against the new release.
4. If no: record "PASS: re-checked against v3.X.Y; sunset condition not triggered" in the exception's history.

The re-check is the responsibility of the engineer landing the HeroUI v3 minor-version bump in `package.json`. A bump that lands without a doc-only re-check is a process violation.
