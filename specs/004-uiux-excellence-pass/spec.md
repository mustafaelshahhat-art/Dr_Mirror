# Feature Specification: UI/UX Excellence Pass — Storefront + Admin

**Feature Branch**: `004-uiux-excellence-pass`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "UI/UX Excellence Pass — Storefront + Admin. Eight gated phases that lift Dr_Mirror from 'complete and correct' to 'unmistakably premium' by adopting under-used HeroUI v3 primitives and Tailwind v4 features (variants, @starting-style, @container, :has()), with logical CSS, Lucide-only icons, four-state matrix discipline, and zero new dependencies."

## User Scenarios & Testing *(mandatory)*

This pass is a quality-focused uplift of an existing, working application. There are no new business capabilities. The user journeys below describe perceived experience improvements that an end user (shopper) or operator (admin) should be able to notice, and that can each be shipped and validated independently.

### User Story 1 - Shopper experiences a coherent, polished storefront (Priority: P1)

A shopper browses the catalog, opens a product, manages a cart line, and proceeds through checkout. Across that flow the interface feels visually consistent, the controls feel native to the design system, motion is restrained and purposeful, and the layout adapts gracefully to narrow contexts (drawers, modals, side panels) without breaking.

**Why this priority**: The storefront is the primary revenue surface. Inconsistencies here erode trust at the highest-stakes moment (checkout). This story is the single biggest perceived-quality win.

**Independent Test**: Walk the catalog → product detail → cart → checkout flow on storefront in all four (theme × direction) states. Confirm: only one accent per page; no border-stripe accents; cart quantity uses a single stepper control; product card layout reflows correctly inside a narrow container; tabs (description / care / sizing) switch with subtle fade; toasts and inline errors fade in within ~200ms; reduced-motion preference pins entries at their final state.

**Acceptance Scenarios**:

1. **Given** a shopper on the catalog page with a Right-to-Left, dark theme, **When** they scroll the product grid, **Then** every card shows the same hover behavior, motion timing, and typographic rhythm with no horizontal-margin or text-alignment classes leaking direction-specific layout.
2. **Given** a shopper on the cart page, **When** they change a line item's quantity, **Then** they use one quantity control (not a plus/input/minus trio) that respects min and max, exposes the same accessible label as before, and updates the totals without layout shift.
3. **Given** a shopper on the product detail page, **When** they switch between description, care, and sizing sections, **Then** the change happens via tabs with a brief fade transition, or — if the required labels are not yet in the i18n catalog — a clearly grouped, stacked layout that will accept tabs without further visual change.
4. **Given** any storefront page rendered inside a narrow drawer, **When** the container width falls below the layout breakpoint, **Then** card and row layouts collapse to stacked variants instead of overflowing.

---

### User Story 2 - Admin operator uses confident, professional tooling (Priority: P1)

An admin filters audit logs, reviews payment proofs, edits a product, manages users, and confirms a destructive action (reject proof, cancel order). The admin surface uses the same component family as the storefront, every icon-only action is discoverable, destructive confirmations are modal (not inline), and progress is visible during uploads and saves.

**Why this priority**: Admin reliability and clarity directly affect operational cost (training, error rate, time-to-resolution). Icon-only controls without tooltips and inline destructive confirmations are the highest sources of operator confusion today.

**Independent Test**: Filter the audit log by event type and date range; reject a payment proof with a reason; cancel an order from admin; upload a product image. Confirm: filter controls use the same component family as the rest of the app; every icon-only button reveals its label on hover/focus; destructive confirmations open a modal with a reason field; upload buttons show a verb and an indeterminate progress bar while the upload runs.

**Acceptance Scenarios**:

1. **Given** the audit log page, **When** the operator opens the event-type or date filters, **Then** the controls use the same selection and date components as the rest of the admin, with bordered styling and a single visible error region per field on invalid input.
2. **Given** any admin list with icon-only row actions, **When** the operator hovers or focuses an action, **Then** a tooltip appears (≤ 300ms) showing the action's accessible name; the accessible name itself remains for screen readers.
3. **Given** the admin "reject proof" or "cancel order" action, **When** the operator triggers it, **Then** a modal opens containing the reason input (where applicable) and clearly separated confirm/cancel actions; the rest of the page is non-interactive until the operator resolves the modal.
4. **Given** an in-flight upload or save, **When** the operation is pending, **Then** the triggering button shows a verb (e.g., Saving…) and a thin progress bar appears beneath it; the form remains in a single, predictable busy state.

---

### User Story 3 - Anyone using assistive tech, low motion, or alternate themes gets equal treatment (Priority: P2)

A keyboard-only user, a screen-reader user, a user with `prefers-reduced-motion`, and users in any of the four (theme × direction) states encounter the same content and the same affordances. Loading states announce themselves; live changes (cart updates, filters applied, sort changed) are spoken without stealing focus; the skip-link is the first Tab stop.

**Why this priority**: A11y debt is invisible until it isn't. Catching it now, while we are already touching every surface, is materially cheaper than catching it in field reports.

**Independent Test**: Run the existing axe test suite; tab through the storefront and admin shells from a cold page load; toggle `prefers-reduced-motion` and confirm motion utilities pin to their final state; toggle theme and direction and confirm no layout shifts that are direction-dependent.

**Acceptance Scenarios**:

1. **Given** a list, grid, or table is fetching or mutating, **When** the busy state is active, **Then** the container exposes `aria-busy="true"` and the existing skeleton still renders.
2. **Given** the shopper updates the cart, applies a filter, or changes a sort, **When** the action completes, **Then** a single shared polite live region in the shell announces the change without moving keyboard focus.
3. **Given** any icon-only button anywhere in the app, **When** an a11y audit runs, **Then** every such button has an accessible name.
4. **Given** a user with `prefers-reduced-motion: reduce`, **When** any new entry animation would otherwise play, **Then** the final state is shown immediately with no transition.

---

### User Story 4 - Engineering and design close the gap between spec and code (Priority: P3)

The DESIGN.md document already specifies the design system; many of its sections currently describe intent rather than what is shipped. After this pass, the audit document records which sections moved from "spec" to "implemented", and a screenshot-capture checklist exists for each phase so the team can verify the four-state matrix.

**Why this priority**: Documentation hygiene is a multiplier on every future change. Without the close-out, the same audit will be re-run next quarter.

**Independent Test**: Open `docs/REDESIGN_AUDIT.md`. Confirm a closing section enumerates what each phase shipped and which DESIGN.md sections are now implemented. Open `docs/screenshots/uiux-pass/phase-*/`. Confirm a `_capture-checklist.md` enumerates pages × four states with expected filenames.

**Acceptance Scenarios**:

1. **Given** the pass is complete, **When** a reviewer reads `docs/REDESIGN_AUDIT.md`, **Then** they find an "Inventory" section opening the pass and a "Closing" section summarizing per-phase outcomes.
2. **Given** any phase is complete, **When** the user goes to capture screenshots, **Then** they find a checklist file enumerating every touched page in each of the four matrix states with the expected filename.

---

### Edge Cases

- A planned tab labelset (e.g., `catalog.detail.tabs.description`) is missing from the i18n catalog. The work falls back to extracting the component and rendering stacked; tab adoption is held until the labels exist. This is a documented stop condition, not a workaround.
- An admin action's pending verb (e.g., `admin.action.saving`, `checkout.placing`) is missing from the catalog. The phase stops and escalates rather than minting copy ad-hoc.
- A component moves from viewport breakpoints to container-query breakpoints. At standard widths the layout is identical; only narrow containers (drawers, modals, side panels) change. The four-state matrix verifies no regressions at standard widths.
- A screenshot in the four-state matrix surfaces a regression that cannot be fixed within the current phase's file scope. The phase stops and escalates rather than expanding scope silently.
- The lint baseline regresses (current floor: 1 error, 60 warnings). The phase does not ship; the regression is fixed first.
- A pre-existing lint finding lives in a file the phase already touches. It is fixed as part of the phase, since the file is "in scope" anyway.
- The four sweep checks (logical-CSS, hardcoded pixel text sizes, emoji/symbol characters, banned visual patterns) return any hit other than the documented `Header.tsx` backdrop-blur exception. The phase does not ship until the sweeps are clean.

## Requirements *(mandatory)*

### Functional Requirements

**Foundations (Phase A)**

- **FR-001**: The styling foundation MUST expose direction-scoped variants (Arabic / English) and a density-scoped variant usable by any component, declared in the global stylesheet.
- **FR-002**: The styling foundation MUST provide three entry-animation utilities (plain fade, fade-up, fade-down) that animate transform and opacity only, complete in ≤ 200ms, and are wrapped to honor reduced-motion automatically.
- **FR-003**: The styling foundation MUST provide container-query helpers — one generic, one card-scoped — so any component can opt into container-relative layout.
- **FR-004**: The styling foundation MUST set the document accent color from the brand token, without altering any existing color token value.
- **FR-005**: `docs/REDESIGN_AUDIT.md` MUST be appended with an inventory section enumerating the files importing the component library, the components in use today, and the components scheduled for adoption with their target call sites.

**Component family discipline (Phases B + C)**

- **FR-006**: Every interactive control in scope MUST come from the chosen component family. Raw HTML form controls remain only where the chosen family does not yet offer an equivalent (file pickers, native color pickers) or where a documented variant-picker pattern intentionally uses raw role="radio" elements.
- **FR-007**: Where a raw control is intentionally retained, the source MUST carry a one-line comment naming the reason (e.g., "RAC radiogroups", "file picker").
- **FR-008**: A single shared pagination wrapper MUST be the only pagination surface in the app, exposing a stable public API (`page`, `totalPages`, `onPageChange`); all six existing consumers MUST continue to work without call-site changes.
- **FR-009**: The app MUST expose an in-house copy-to-clipboard "snippet" wrapper, composed only from existing component-family primitives and the existing icon library, with an API equivalent in spirit to the component the library does not provide. It is adopted in the payment-instructions card and as a side-element near order-page page titles (never replacing the title).
- **FR-010**: Every icon-only action button in the admin MUST be wrapped by a tooltip whose content equals the button's existing accessible name; the accessible name MUST remain on the button for assistive technology. Tooltip timing MUST be unobtrusive (delay ~300ms, no close-delay).
- **FR-011**: Three pages MUST adopt tabbed organization: product detail (description / care / sizing — gated on i18n key availability), admin order detail (timeline / proofs / line items), and admin product edit (master / variants / images). The admin product edit page heading MUST remain above the tablist.
- **FR-012**: The filter panel column groups (category, gender, price, size, color) MUST become an accordion with multi-select expansion, defaulting to whichever groups already have active filters. The mobile drawer behavior MUST be unchanged.
- **FR-013**: The cart line quantity control MUST be a single stepper input (replacing the plus/input/minus trio), preserving min, max, and the existing accessible label. Cart tests MUST be updated, not deleted, with semantics-equivalent queries.
- **FR-014**: A single shared skeleton wrapper MUST replace ad-hoc loading shapes; named layout primitives (cart line skeleton, order row skeleton, etc.) MUST keep the existing rounded-shape rules.
- **FR-015**: Long-running uploads and saves MUST show two simultaneous signals: the triggering button shows a verb-form loading state, and an indeterminate progress bar appears beneath it.
- **FR-016**: Admin destructive confirmations MUST use a modal (reject-proof with reason input; cancel-order from admin). The storefront's existing inline cancel pattern is unchanged.

**Motion, layout, forms, a11y (Phases D–G)**

- **FR-017**: Banners (downtime, forbidden) MUST animate in with a fade-down once per appearance, never animating layout properties (width/height/inset). Tab panels MUST fade on selection. Empty states (catalog, orders, addresses, admin recent-orders, admin inquiries / users / categories / payment-methods / audit) MUST fade up on icon + text. Toasts and inline errors MUST fade in. 404 / 403 / 503 shells MUST fade up. Modals and drawers MUST NOT receive an outer entry animation in addition to their internal motion.
- **FR-018**: Product card hover MUST be gated on `motion-safe`. The existing hover scale MUST remain.
- **FR-019**: Five surfaces MUST be wrapped as containers and use container-query layout for their internal breakpoints: product card metadata, cart line row, admin hub KPI tiles, order detail line items, address form name/phone row. Their pixel breakpoint values MUST match today's viewport breakpoints to avoid layout drift at standard widths.
- **FR-020**: Every form field from the component family MUST express its invalid state via the field's own invalid + error-message slots (no separate error spans); helper text MUST use the field's description slot. A top-of-form summary appears only on submit failure. Required-field markers MUST be a styled span, not a raw asterisk.
- **FR-021**: Submit buttons MUST use the component family's loading-content pattern with a verb, reusing existing translation keys. Missing verbs are a stop condition; no new copy is minted in this pass.
- **FR-022**: The checkout step indicator MUST keep its existing step circles and add a thin, brand-tinted, subtle progress bar above the step labels.
- **FR-023**: Every list, grid, or table container MUST set `aria-busy` while its query or mutation is pending.
- **FR-024**: Each shell (storefront and admin) MUST host a single shared polite live region used for cart updates, filter applied, and sort changed.
- **FR-025**: Every icon-only button in the app MUST carry an accessible name. The existing axe test suite MUST remain green.

**Polish + close-out (Phase H)**

- **FR-026**: No page may use more than three font weights. Section gaps MUST be at least the standard large rhythm; card internal padding MUST be the standard mobile/desktop pair.
- **FR-027**: Interactive surfaces MUST show a pointer cursor (via component-family defaults); non-interactive surfaces MUST keep the default cursor. Focus rings MUST be visible everywhere and brand-tinted. Numeric inputs (counts, quantities, page numbers) MUST render with tabular numerals.
- **FR-028**: The skip-link MUST be the first focusable element in all four (theme × direction) states.
- **FR-029**: The README MUST close the unclosed code fence inside its Documentation section.
- **FR-030**: The em-dash placeholder at `AuditLogPage.tsx:166` MUST be replaced with a localized character or an inert separator dot, consistent with the design anti-pattern on em-dashes in user copy.
- **FR-031**: `docs/REDESIGN_AUDIT.md` MUST be appended with a closing section enumerating what each phase shipped and which design-document sections are now implemented.

**Process discipline (every phase)**

- **FR-032**: The pre-flight verification (build, lint, test, i18n parity) MUST run once before Phase A and the recorded results become the "do not regress" floor for every later phase.
- **FR-033**: Every phase MUST end with the same gate: build, lint at-or-below baseline, full test suite green, i18n parity, plus the four sweep regexes returning zero hits (the documented backdrop-blur exception aside).
- **FR-034**: Every phase MUST result in exactly one commit using Conventional-Commits style and the stated commit subject. The body MUST list files changed, gate results, and the screenshot-checklist directory created for the user.
- **FR-035**: After every phase commit, the team MUST publish a `docs/screenshots/uiux-pass/phase-X/_capture-checklist.md` enumerating touched pages × four states with expected filenames. Screenshot PNGs are captured by the user and committed as a follow-up.

**Hard constraints (carried forward)**

- **FR-036**: No new package dependencies (frontend or backend) may be added by this pass.
- **FR-037**: No backend changes (API shape, schema, endpoints) may be made by this pass.
- **FR-038**: No more than one route URL may change in any single phase.
- **FR-039**: All copy added by component adoption MUST exist in both English and Arabic in the i18n catalog; missing keys are a stop condition.
- **FR-040**: Glassmorphism (backdrop blur) is permitted only on the storefront sticky header. Border-stripe accents (`border-l-4`, `border-r-4`) are forbidden. No more than one accent color per page. Card nesting MUST NOT exceed two levels.

### Key Entities

This pass introduces no new data entities. It changes only the rendered surface of existing entities (products, carts, orders, payment proofs, audit log entries, users, inquiries, categories, payment methods, addresses).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All eight phases ship as eight Conventional-Commits commits on a single feature branch, each with a green gate (build / lint at-or-below baseline / full test suite / i18n parity).
- **SC-002**: The full test suite remains green at the recorded pre-flight count (currently 208 frontend + 427 backend) for every phase.
- **SC-003**: The lint count never exceeds the recorded pre-flight baseline (currently 1 error, 60 warnings) at any phase boundary.
- **SC-004**: Every phase's four sweep checks (logical-CSS, hardcoded pixel text sizes, emoji/symbol characters, banned visual patterns) return zero hits, with the documented `Header.tsx` backdrop-blur exception.
- **SC-005**: For every phase, a screenshot checklist exists under `docs/screenshots/uiux-pass/phase-*/_capture-checklist.md` enumerating touched pages in all four (theme × direction) states.
- **SC-006**: After Phase G, the existing axe test suite reports zero new violations.
- **SC-007**: After Phase H, the closing section of `docs/REDESIGN_AUDIT.md` enumerates per-phase outcomes and the design-document sections now implemented.
- **SC-008**: A keyboard-only user can reach the skip-link as the first Tab stop in all four (theme × direction) states.
- **SC-009**: A user with `prefers-reduced-motion: reduce` sees all newly-introduced entry utilities pin to their final state with no transition.
- **SC-010**: Zero new package dependencies appear in the lockfiles for either frontend or backend across the pass.

## Assumptions

- The pre-flight floor is whatever the current branch records on first run (the brief states 208 frontend tests, 427 backend tests, 1 lint error, 60 lint warnings; the recorded values at pre-flight time take precedence).
- The component family in use is HeroUI v3; the styling system is Tailwind v4; the icon library is Lucide; CSS is logical-property only.
- The four-state matrix is (theme × direction): dark-rtl, dark-ltr, light-rtl, light-ltr. No high-contrast variant is in scope.
- "Snippet" refers to an in-house wrapper because the component library does not ship one; "NumberField" is the correct family name for what the brief calls "NumberInput".
- Screenshot capture is manual and user-driven; the assistant creates the per-phase checklists, the user captures PNGs and commits them in a follow-up.
- Pre-existing lint findings outside files this pass already touches are out of scope.
- Translation key coverage is verified by `npm run i18n:check`. If a required key for an adopted component is missing, the phase stops and escalates rather than minting new copy.
- The current `AuditLogPage.tsx:153` is already using logical margin (`ms-1`); the Phase H note documents the verification, not a change.
