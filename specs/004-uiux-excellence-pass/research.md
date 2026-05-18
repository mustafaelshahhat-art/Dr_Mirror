# Phase 0 — Research: UI/UX Excellence Pass

This document resolves the small number of open questions raised by the spec's "stop condition" risks before any implementation begins. The pass itself is highly prescriptive (the user's brief is the binding contract); these decisions cover only the few areas where the brief deliberately defers.

---

## Decision 1 — How to bridge HeroUI v3's missing `Snippet` primitive

**Decision**: Build an in-house `<Snippet>` wrapper at `frontend/src/shared/components/Snippet.tsx`, composed exclusively from HeroUI v3 primitives (`Button isIconOnly`, `Tooltip`) and Lucide icons (`Copy`, `Check`). Public API mirrors HeroUI v2's `Snippet` in spirit: a `value` prop (the string to copy), a child render for the visible content, and a transient "copied" state.

**Rationale**:
- HeroUI v3 does not ship a `Snippet` component (verified by inventorying the actual exports used in the 52 files importing `@heroui/react`).
- The brief mandates zero new dependencies.
- Three adoption sites need it (`PaymentInstructionsCard` replacement of lines 71–86; side-element near H1 in `OrderDetailPage` and `AdminOrderDetailPage`). Inlining the pattern three times costs more than one shared wrapper.

**Alternatives considered**:
- Bring in `@heroui/snippet` from v2 as a standalone package. **Rejected**: violates the no-new-deps constraint and risks v2/v3 style drift.
- Use `navigator.clipboard.writeText` directly inside each call site without a wrapper. **Rejected**: three copies of the same copy/check-icon transition is worse than one.
- Use a third-party clipboard library. **Rejected**: violates no-new-deps; the platform clipboard API is sufficient.

---

## Decision 2 — How to handle missing i18n keys for `ProductInfoTabs`

**Decision**: Extract the description/care/sizing region into a new `<ProductInfoTabs>` component unconditionally. **Conditionally** adopt HeroUI `Tabs` inside it only if `catalog.detail.tabs.description`, `catalog.detail.tabs.care`, and `catalog.detail.tabs.sizing` exist in **both** `ar.json` and `en.json`. If any of the six entries are missing, render the three sections stacked — same DOM shape as today, just relocated — and flag the stop condition in the Phase C commit body so the team knows to land the copy before re-enabling tabs.

**Rationale**:
- The component extraction is a pure refactor — it cannot regress whether the tabs land or not.
- The brief explicitly names this as a stop condition; we encode it as a fallback rather than a hard halt so the rest of Phase C can ship.
- `i18n:check` is the source of truth for parity; we do not mint copy ad-hoc.

**Alternatives considered**:
- Halt all of Phase C if keys are missing. **Rejected**: Phase C has nine other independent sub-steps. Halting them on one missing trio is over-strict.
- Mint placeholder copy. **Rejected**: violates the no-new-keys constraint and the brief explicitly forbids it.
- Skip the extraction entirely. **Rejected**: extracting now means tab adoption later is a one-line change to one file.

---

## Decision 3 — Container-query breakpoint values

**Decision**: Reuse the existing Tailwind viewport breakpoint pixel values when rewriting layout rules as container-query rules. Specifically:

| Surface | Container | Today's viewport rule (approx) | New container-query rule |
|---------|-----------|-------------------------------|---------------------------|
| `ProductCard` metadata | `.cq-card` | `md:grid-cols-2` | `@md:grid-cols-2` |
| `CartLineRow` | `.cq` | `sm:flex-row` | `@sm:flex-row` |
| `AdminHubPage` KPI tiles | `.cq` | `lg:grid-cols-4` / `md:grid-cols-2` | `@lg:grid-cols-4` / `@md:grid-cols-2` |
| `OrderDetailPage` line items | `.cq` | `md:grid-cols-3` | `@md:grid-cols-3` |
| `AddressForm` name/phone | `.cq` | `lg:flex-row` | `@lg:flex-row` |

**Rationale**:
- At standard widths the layout is mathematically identical (the container == the viewport for top-level pages), so the four-state matrix should show no regression.
- At narrow widths (drawers, modals, side panels), the new rules correctly collapse to stacked variants — which is the entire point of the phase.

**Alternatives considered**:
- Pick smaller container thresholds to "look better" in drawers. **Rejected**: introduces a new break point set the team will have to learn and audit; risks regressions at top-level widths.
- Mix viewport and container queries on the same surface. **Rejected**: defeats the purpose; either a surface owns its layout via its container or it does not.

---

## Decision 4 — Modal vs inline confirmation policy

**Decision**: **Admin** destructive confirmations move to HeroUI `Modal`. Specifically: `AdminProofReview` reject-proof (with reason `TextArea`) and `AdminOrderDetailPage` cancel-from-admin. **Storefront** `CancelOrderButton` keeps its existing inline-expand pattern.

**Rationale**:
- Admins typically perform several destructive actions per session and benefit from a clear visual confirmation; modal makes the intent unambiguous and easier to audit.
- Storefront customers cancel rarely, in-context, and the existing inline pattern has already been validated by use; switching them to a modal would be more friction without a corresponding benefit.

**Alternatives considered**:
- Move both to modal. **Rejected**: changes a working storefront flow without a user benefit; out of scope of "premium polish" for the customer side.
- Move neither to modal. **Rejected**: inline reject-proof in admin is the documented confusion source the brief addresses.

---

## Decision 5 — Animation surface model

**Decision**: Three entry utilities only (`.enter-fade`, `.enter-fade-up`, `.enter-fade-down`), each ≤ 200ms ease-out, transforming `opacity` and `transform` only, each wrapped in `@starting-style` so they run automatically on first paint and respect `prefers-reduced-motion` via the surrounding `@media (prefers-reduced-motion: no-preference) { … }` guard.

Banners (`DowntimeBanner`, `ForbiddenBanner`) and 404/403/503 shells get `.enter-fade-down` and `.enter-fade-up` respectively (one-shot, in-only — no exit animation; the components unmount).

HeroUI `Drawer` and `Modal` get **no** outer entry animation; their internal motion is the only motion (double-animating is the failure mode this phase prevents).

**Rationale**:
- Three utilities cover every surface in scope. More than three would mean the next contributor has to think about which one to pick.
- Animating only `transform` and `opacity` keeps the work on the compositor and avoids layout thrash.
- `@starting-style` is Tailwind v4 idiomatic and runs automatically; no JS, no library required.

**Alternatives considered**:
- Use Framer Motion. **Rejected**: violates no-new-deps; CSS-only is sufficient for this scope.
- Per-component bespoke `transition-*` utilities. **Rejected**: spreads timing decisions across the codebase and is hard to audit.

---

## Decision 6 — Lint, test, and i18n baseline capture point

**Decision**: Run the pre-flight (`npm run build`, `npm run lint`, `npm run test`, `npm run i18n:check`) **once** on a clean checkout of branch `004-uiux-excellence-pass` immediately before Phase A begins. The values reported are the floor for every later phase's gate. The brief's stated numbers (208 frontend tests, 1 lint error, 60 lint warnings) are the **expected** values; the recorded values are the **binding** values.

**Rationale**:
- The brief was written against an earlier snapshot; recording the actual current values prevents a phantom regression on phase A.

**Alternatives considered**:
- Trust the brief's numbers verbatim. **Rejected**: small drifts since planning are normal and would force unnecessary halts.

---

## Decision 7 — Inventory file count drift (51 vs 52)

**Decision**: The brief says 51 files import `@heroui/react`; the actual count today is 52. The Phase A "Inventory" section in `docs/REDESIGN_AUDIT.md` records the exact list and notes that the count is 52, not 51. The drift is not a stop condition.

**Rationale**:
- Drift this small (one file) is expected between brief-writing and execution. The inventory's job is to be accurate, not to match an earlier snapshot.

---

## Open questions

None. All stop conditions are encoded as fallbacks (Decision 2) or as recorded baselines (Decision 6); the rest of the pass is mechanical.
