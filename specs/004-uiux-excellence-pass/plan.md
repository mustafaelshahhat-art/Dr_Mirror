# Implementation Plan: UI/UX Excellence Pass — Storefront + Admin

**Branch**: `004-uiux-excellence-pass` | **Date**: 2026-05-18 | **Spec**: [./spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-uiux-excellence-pass/spec.md`

## Summary

Lift Dr_Mirror's storefront and admin surface from "complete and correct" to "unmistakably premium" by adopting under-used HeroUI v3 primitives (Tabs, Accordion, Tooltip, NumberField, Pagination, Skeleton, DatePicker, Progress, Modal) and Tailwind v4 features (custom variants, `@starting-style`, `@container`, logical CSS) across the existing 52 files that import the component library. The pass ships in eight gated phases (A–H), one Conventional-Commits commit per phase, with a hard pre-flight floor of 208 frontend + 427 backend tests green and lint at-or-below baseline. No new dependencies, no backend changes, no new translation keys beyond what HeroUI components technically need.

**Technical approach**: every phase touches only the rendered surface — CSS tokens/utilities (Phase A), six raw-HTML call sites (Phase B), ten lowest-risk-first component adoptions (Phase C), motion utilities application (Phase D), container-query rewrites (Phase E), form-pattern uplift (Phase F), a11y semantics (Phase G), and polish/close-out (Phase H). The only new source file is `frontend/src/shared/components/Snippet.tsx`, an in-house copy-to-clipboard wrapper composed from HeroUI primitives + Lucide icons because HeroUI v3 does not ship a Snippet component.

## Technical Context

**Language/Version**: TypeScript 5.x on React 19 (frontend only; backend untouched)

**Primary Dependencies**: HeroUI v3 (`@heroui/react`), Tailwind CSS v4, lucide-react, i18next, React Query. No additions, no version bumps in this pass.

**Storage**: N/A — pass is rendered-surface only. No EF Core migrations, no schema changes, no data flow changes.

**Testing**: Vitest + React Testing Library (frontend, 208 tests); xUnit (backend, 427 tests — must remain green but no backend code touched). `axe.test.tsx` for accessibility regression. `npm run i18n:check` for `ar`/`en` key parity. Four PowerShell sweep regexes for logical-CSS, hardcoded pixel text sizes, emoji/symbol characters, and banned visual patterns.

**Target Platform**: Modern evergreen browsers (Chrome / Edge / Safari / Firefox) on desktop and mobile, in four (theme × direction) states: dark-rtl, dark-ltr, light-rtl, light-ltr.

**Project Type**: Web application (existing `frontend/` + `backend/`). This pass touches `frontend/` only, plus `docs/REDESIGN_AUDIT.md`, plus the per-phase screenshot checklists under `docs/screenshots/uiux-pass/phase-*/`.

**Performance Goals**: Entry animations ≤ 200ms ease-out, transform+opacity only. `prefers-reduced-motion: reduce` pins entries at final state. No regression in Vite build size or test runtime beyond noise.

**Constraints**:
- HeroUI v3 only — no swapping primitives for raw HTML where a HeroUI equivalent exists.
- Tailwind v4 only — no Tailwind v3 plugin shims.
- Lucide icons only.
- Logical CSS only (`ms-*`, `me-*`, `start`/`end`, `inset-inline-*`) — `ml-*` / `mr-*` / `text-left` / `text-right` etc. are banned by the sweep.
- ≤ 3 font weights per page; ≤ 2 levels card nesting; one accent color per page.
- `border-l-4` / `border-r-4` accent stripes forbidden.
- Glassmorphism / backdrop-blur permitted ONLY on storefront `Header.tsx:31`.
- Em-dashes forbidden in user copy (em-dash anti-pattern from DESIGN.md).
- No new translation keys unless an adopted HeroUI component technically requires one (stop condition if so).
- No new npm or NuGet dependencies.
- ≤ 1 route URL change per phase.
- Backend untouched.

**Scale/Scope**: 52 files import `@heroui/react` today (brief estimated 51; the inventory in Phase A records the exact list and reconciles the drift). Eight phases, eight commits, ~30 user-visible surfaces touched across storefront and admin.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Evaluation |
|-----------|------------|
| **I. Full-Stack Production Reality (NON-NEGOTIABLE)** | **PASS with scope note.** This pass is intentionally frontend-only. Principle I's "feature that spans multiple layers" clause does not apply because the *feature* here IS the rendered surface — there is no business-logic, data, auth, or payment change to coordinate with. The brief makes "no backend changes" a hard constraint (FR-037), and any phase that would require backend support is an explicit stop condition. |
| **II. Arabic-First Bilingual & RTL Parity (NON-NEGOTIABLE)** | **PASS — central to the pass.** The four-state matrix (dark/light × rtl/ltr) is the verification model; logical CSS is enforced by a per-phase sweep regex; `i18n:check` is part of every phase gate; new keys (only if technically required by an adopted HeroUI component) must land in both `ar` and `en`, else the phase stops. |
| **III. Security, Auth & Access Boundaries (NON-NEGOTIABLE)** | **PASS — not touched.** No endpoint, no auth flow, no JWT logic, no payment-proof URL behavior is altered. Admin tooling becomes clearer (tooltips, modals) but the *authorization* boundaries are untouched. Modal confirmations strengthen, not weaken, intent for destructive admin actions. |
| **IV. Egyptian Payment Integrity (NON-NEGOTIABLE)** | **PASS — not touched.** No change to COD vs Instapay vs wallet logic, no change to proof file storage/serving, no change to cancellation reason capture. The Phase H em-dash fix at `AuditLogPage.tsx:166` is a presentation tweak in the audit-log row, not a payment-data change. |
| **V. Structural Integrity: Vertical Slices & Feature Folders** | **PASS.** Files are edited in place under their existing `features/<feature>/` folders. The single new file (`shared/components/Snippet.tsx`) goes into the existing shared-components bucket — appropriate because it is a cross-feature primitive. No vertical-slice violations. No API contract changes. |
| **VI. Accessibility, Responsive & Theme Parity** | **PASS — central to the pass.** Phase G is an a11y semantics phase; the axe suite must stay green. Phase E (container queries) tightens responsive parity inside drawers/modals/side-panels. Phase D respects `prefers-reduced-motion`. Theme parity is verified by the four-state matrix on every phase. Focus rings explicitly preserved (FR-027). |
| **VII. Observability, Reliability & Recovery** | **N/A — pass does not touch logging, startup validation, seeding, outbox, migrations, or health endpoints.** Per spec assumption, this pass is rendered-surface only. |

**Result**: All seven principles pass. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/004-uiux-excellence-pass/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # User-facing feature specification
├── research.md          # Phase 0 output — research decisions
├── data-model.md        # Phase 1 output — explicit N/A (no entities)
├── quickstart.md        # Phase 1 output — per-phase ops runbook
├── contracts/           # Phase 1 output — UI primitive contracts
│   ├── Snippet.contract.md
│   └── PaginationControls.contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/                          # router, providers (read-only this pass)
│   ├── features/
│   │   ├── addresses/                # AddressForm (Phase E container query)
│   │   ├── admin/
│   │   │   ├── audit/AuditLogPage.tsx          # Phase B (Select × 2, DatePicker × 2), Phase H (em-dash)
│   │   │   ├── catalog/
│   │   │   │   ├── AdminProductEditPage.tsx    # Phase C (Tabs: Master/Variants/Images)
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProductImagesSection.tsx   # Phase B (Input alt, NumberField order), Phase C (Tooltip, Progress), Phase F (form excellence)
│   │   │   │   │   └── ProductVariantsSection.tsx # Phase B (NumberField stock), Phase F
│   │   │   │   └── components/payment-methods/PaymentMethodRow.tsx  # Phase C (Switch + Tooltip)
│   │   │   ├── components/
│   │   │   │   ├── AdminProofReview.tsx         # Phase C (Tooltip, Modal: reject reason), Phase F
│   │   │   │   └── ...
│   │   │   ├── AdminInquiriesPage.tsx           # Phase C (Tooltip)
│   │   │   ├── AdminProductsListPage.tsx        # Phase C (Tooltip)
│   │   │   ├── AdminUsersPage.tsx               # Phase C (Tooltip, verify Switch)
│   │   │   ├── AdminOrderDetailPage.tsx         # Phase C (Tooltip, Snippet next to H1, Tabs: Timeline/Proofs/Lines, Modal: cancel)
│   │   │   └── AdminHubPage.tsx                 # Phase E (KPI tiles container query)
│   │   ├── cart/
│   │   │   ├── CartPage.tsx                     # tests adjust for NumberField
│   │   │   └── components/CartLineRow.tsx       # Phase C item 6 (NumberField stepper), Phase E (cq layout)
│   │   ├── catalog/
│   │   │   ├── CatalogPage.tsx                  # empty state Phase D, PaginationBar Phase C
│   │   │   ├── ProductDetailPage.tsx            # Phase C (Tabs via ProductInfoTabs — i18n gated)
│   │   │   └── components/
│   │   │       ├── FilterPanel.tsx              # Phase C (Accordion for groups)
│   │   │       ├── ProductCard.tsx              # Phase D (motion-safe), Phase E (cq metadata row)
│   │   │       ├── SearchInput.tsx              # Phase B (Button isIconOnly clear)
│   │   │       └── ProductInfoTabs.tsx          # NEW in Phase C — i18n-gated
│   │   ├── checkout/
│   │   │   └── CheckoutPage.tsx                 # Phase F (ProgressBar step indicator)
│   │   └── orders/
│   │       ├── OrdersListPage.tsx               # empty-state Phase D
│   │       ├── OrderDetailPage.tsx              # Phase C (Snippet near H1), Phase E (line items)
│   │       └── components/
│   │           ├── PaymentInstructionsCard.tsx  # Phase C (adopt Snippet)
│   │           └── PaymentProofUpload.tsx       # Phase C (Progress), Phase F
│   ├── shared/
│   │   └── components/
│   │       ├── DowntimeBanner.tsx               # Phase D (enter-fade-down)
│   │       ├── ForbiddenBanner.tsx              # Phase D (enter-fade-down)
│   │       ├── PaginationControls.tsx           # Phase C (HeroUI Pagination internals)
│   │       ├── Skeleton.tsx                     # Phase C (wrap HeroUI Skeleton)
│   │       ├── Snippet.tsx                      # NEW — Phase C in-house wrapper
│   │       ├── Layout.tsx                       # Phase G (shared aria-live region)
│   │       └── Header.tsx                       # untouched (backdrop-blur exception lives here)
│   ├── styles/
│   │   └── globals.css                          # Phase A (variants, utilities, components, accent-color)
│   ├── locales/                                  # Phase B/C/F additions, ONLY if HeroUI component requires
│   └── test/
└── (frontend tests live alongside their components: *.test.tsx)

docs/
├── REDESIGN_AUDIT.md                            # Phase A appended (Inventory), Phase H appended (Closing)
└── screenshots/uiux-pass/
    ├── phase-A/_capture-checklist.md            # created post-commit, each phase
    ├── phase-B/_capture-checklist.md
    ├── phase-C/_capture-checklist.md
    ├── phase-D/_capture-checklist.md
    ├── phase-E/_capture-checklist.md
    ├── phase-F/_capture-checklist.md
    ├── phase-G/_capture-checklist.md
    └── phase-H/_capture-checklist.md
```

**Screenshot capture is external to this repo.** An external local tool (which
may internally use Playwright) drives capture against the listed surfaces and
states. No Playwright/Puppeteer/Cypress/Selenium dependency, config, runner
script, or lockfile entry is added to this repository. See
[`docs/screenshots/README.md`](../../docs/screenshots/README.md) for the full
rule and workflow.

**Structure Decision**: Web-application layout (frontend + backend already established). This pass operates exclusively in `frontend/src/**` and `docs/**`. No new top-level directories. The single new source file (`shared/components/Snippet.tsx`) lives in the existing shared-components bucket because it is a cross-feature primitive used by both storefront (`PaymentInstructionsCard`, `OrderDetailPage`) and admin (`AdminOrderDetailPage`). The new feature-local file (`features/catalog/components/ProductInfoTabs.tsx`) is co-located under the catalog feature folder it serves.

## Phase Sequencing and Gate Discipline

Every phase ends with the same gate. Order is fixed; each phase depends on the previous one's gate being green.

| Phase | Subject | Files of record | Adds new utilities? | Commit subject |
|-------|---------|-----------------|---------------------|----------------|
| A | Tokens + utilities + inventory | `globals.css`, `REDESIGN_AUDIT.md` | yes (`@custom-variant`, `.enter-fade*`, `.cq`, `.cq-card`, `accent-color`) | `feat(ui): UI/UX pass phase A — token + utility expansion` |
| B | Raw HTML → HeroUI (6 sites) | `AuditLogPage.tsx`, `ProductImagesSection.tsx`, `ProductVariantsSection.tsx`, `SearchInput.tsx` | no | `feat(ui): UI/UX pass phase B — raw HTML → HeroUI conversion` |
| C | HeroUI component uplift (10 sub-steps, 1 commit) | `PaginationControls.tsx`, NEW `Snippet.tsx`, admin pages (Tooltip), `ProductDetailPage.tsx` + NEW `ProductInfoTabs.tsx`, `AdminOrderDetailPage.tsx`, `AdminProductEditPage.tsx`, `FilterPanel.tsx`, `CartLineRow.tsx` (+ cart tests), `Skeleton.tsx`, `PaymentMethodRow.tsx`, `PaymentProofUpload.tsx` + `ProductImagesSection.tsx` (Progress), `AdminProofReview.tsx` (Modal), `PaymentInstructionsCard.tsx` (Snippet), `OrderDetailPage.tsx` (Snippet) | no | `feat(ui): UI/UX pass phase C — HeroUI component uplift` |
| D | Motion uplift | `DowntimeBanner.tsx`, `ForbiddenBanner.tsx`, `ProductCard.tsx`, Tabs panels (from C), every empty state, toast surface, 404/403/503 shells | no | `feat(ui): UI/UX pass phase D — motion uplift` |
| E | Container queries | `ProductCard.tsx`, `CartLineRow.tsx`, `AdminHubPage.tsx`, `OrderDetailPage.tsx`, `AddressForm.tsx` | no | `feat(ui): UI/UX pass phase E — container-query responsive` |
| F | Form excellence | all HeroUI Input/Select/NumberField/DatePicker call sites, `CheckoutPage.tsx` | no | `feat(ui): UI/UX pass phase F — form excellence` |
| G | A11y + semantic uplift | every list/grid/table container; `Layout.tsx` + `AdminLayout.tsx` aria-live; every `Button isIconOnly` site | no | `feat(ui): UI/UX pass phase G — a11y semantic uplift` |
| H | Polish + micro-craft + close-out | per-page typography audit, focus rings, tabular-nums verification; `README.md` code-fence fix; `AuditLogPage.tsx:166` em-dash fix; `REDESIGN_AUDIT.md` closing | no | `chore(ui): UI/UX pass phase H — polish & micro-craft` |

**Per-phase gate** (runs from repo root unless noted, PowerShell):

```powershell
# from frontend/
npm run build
npm run lint        # must not exceed pre-flight baseline (1 err / 60 warn)
npm run test        # must equal pre-flight count (208 / 208)
npm run i18n:check  # ar/en parity

# from repo root — four sweeps; all must return zero hits
Get-ChildItem -Recurse frontend/src -Include *.tsx |
  Select-String -Pattern '\b(ml-\d|mr-\d|pl-\d|pr-\d|left-\d|right-\d)\b|text-left|text-right'
Get-ChildItem -Recurse frontend/src -Include *.tsx |
  Select-String -Pattern 'text-\[\d+px\]'
Get-ChildItem -Recurse frontend/src -Include *.tsx,*.ts |
  Select-String -Pattern '[\p{So}\p{Cs}]'
Get-ChildItem -Recurse frontend/src -Include *.tsx |
  Select-String -Pattern 'border-l-4|border-r-4|backdrop-blur(?!-)|bg-clip-text|drop-shadow-\[|shadow-\[0_0'
```

Allowed backdrop-blur exception: `frontend/src/shared/components/Header.tsx:31` only.

## Stop conditions (escalate before proceeding)

1. A HeroUI component requires a user-facing i18n key not in the catalog.
2. A phase requires changing more than one route URL.
3. A phase requires backend changes to render correctly.
4. A four-state screenshot reveals a regression that cannot be fixed within the phase's file scope.
5. The lint baseline regresses (count goes up vs pre-flight).
6. The frontend test count drops below pre-flight (currently 208) for any reason other than a documented test-replacement in CartLineRow's adjustment.

## Risk register (carried from spec)

| Risk | Mitigation |
|------|------------|
| CartLineRow test churn (Phase C item 6) — DOM changes are non-trivial. | Keep `aria-label` stable; rewrite test queries from button-text to label-based queries. No test deletion. |
| Tabs adoption on ProductDetailPage depends on existing i18n keys. | Stop condition fires if keys are missing; fallback is to extract `<ProductInfoTabs>` and render stacked, ready for tab adoption when copy lands. No visual regression. |
| HeroUI Pagination semantics drift. | Public API of `PaginationControls` stays identical (`page`, `totalPages`, `onPageChange`); adapter shim translates to HeroUI's `page`/`total`/`onChange`. |
| In-house `<Snippet>`. | Composed only from HeroUI primitives + Lucide. Documented as v3-bridging primitive in the audit close-out (not a new design system). |
| `@container` adoption at boundary widths. | Same pixel breakpoint values as today's viewport breakpoints; four-state matrix verifies no regression at standard widths. |

## Out of scope (explicit non-goals)

- New features, new routes, new translation keys beyond what an adopted HeroUI component technically requires.
- Backend changes (no API shape changes, no migrations, no new endpoints).
- Replacing HeroUI; new dependencies; high-contrast or non-rtl/ltr variants.
- Pre-existing lint findings outside files this pass already touches.

## Complexity Tracking

No Constitution Check violations. No entries.
