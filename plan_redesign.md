# Dr_Mirror Redesign Plan

> **Status:** Planning document only. No source, CSS, config, route, page, component, translation, backend, migration, or package is changed by this file.
> **Methodology:** Open Design (audit + system-thinking + consistency review + polish).
> **Scope:** Design-system improvement of the existing HeroUI v3 webapp without altering product behavior.

---

## 1. Objective

This is a **design-system improvement plan**, not a rewrite, refactor, or implementation. It documents how to audit and polish the Dr_Mirror storefront and admin surfaces toward a premium, commercial, production-grade e-commerce feel — while preserving the current HeroUI v3 + Tailwind 4 + React/Vite architecture, all existing pages, routes, business logic, and Arabic/English behavior.

Execution of any improvement happens in future phases gated by separate approval. Nothing is built or modified by reading this document.

---

## 2. Non-Negotiable Constraints

These constraints apply to every section below and to any future implementation phase derived from this plan:

- **No HeroUI replacement.** HeroUI v3 remains the only UI component library.
- **No new UI library introduced** (no Radix, MUI, Chakra, Mantine, shadcn, etc.).
- **No route changes.** Page inventory is frozen.
- **No new pages, no removed pages.**
- **No business logic changes.** Cart, checkout, order, payment, and payment-proof flows behave identically before and after.
- **No backend/API contract changes.**
- **No authentication or authorization changes.**
- **No admin/customer role behavior changes.**
- **No translation key changes that alter copy semantics** (renames or visual-only polish are explicitly out of scope here).
- **No package install/upgrade/removal.**
- **No implementation in this phase.** This plan does not edit code.

---

## 3. Current System Understanding

### 3.1 Frontend stack (verified)
- React 19 + Vite + TypeScript
- HeroUI **v3.0.4** (`@heroui/react`)
- Tailwind CSS **4.3.0**
- react-router-dom 7.15.0
- react-i18next 26.1.0 + i18next 26.x
- next-themes 0.4.6
- TanStack Query (`@tanstack/react-query`)
- Lucide icons

### 3.2 Provider chain (verified against `frontend/src/app/providers.tsx`)

HeroUI v3 / React Aria routing and locale context are provided by `RouterProvider` and `I18nProvider`. The actual order is:

```
NextThemesProvider                (next-themes — owns html.class for dark/light)
└─ RouterProvider                  (from @heroui/react — wires HeroUI Links to react-router)
   └─ QueryClientProvider          (TanStack Query)
      └─ I18nextProvider           (react-i18next backbone)
         └─ LocaleScope            (wraps HeroUI <I18nProvider locale={...}>)
            └─ DirectionSync       (sets <html lang> + <html dir>, persists to localStorage)
               └─ AuthProvider
                  └─ CartProvider
                     └─ children
```

`DirectionSync` and `LocaleScope` are local helpers defined inside `providers.tsx`. They are the contract for RTL/LTR and locale propagation — any redesign work must respect them and must not duplicate language/direction state elsewhere.

### 3.3 Routing
`frontend/src/app/router.tsx` defines public routes (`/login`, `/register`), customer routes (`/`, `/products/:slug`, `/cart`, `/inquiries`), protected routes (`/checkout`, `/account`, `/account/orders`, `/account/orders/:orderNumber`, `/account/addresses`), and admin routes nested under `AdminLayout` (`/admin`, `/admin/orders`, `/admin/orders/:orderNumber`, `/admin/categories`, `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`, `/admin/payment-methods`, `/admin/inquiries`, `/admin/users`). This inventory is frozen.

### 3.4 Storefront vs. admin separation
- **Storefront** uses `Layout.tsx` / `ShellPage.tsx` for shell composition and a commercial visual register.
- **Admin** uses its own `AdminLayout` / `AdminHeader` / `AdminSidebar` and is intended to feel operational, neutral, and denser than the storefront.

### 3.5 Theming, tokens, fonts
- Tokens live in `frontend/src/styles/globals.css` via Tailwind 4's `@theme inline`.
- Brand palette is OKLCH-based emerald with light/dark variants.
- HeroUI v3 theme tokens (`content1/2/3`, `default-100..700`, `divider`, `primary`) are overridden through the same file.
- Two font stacks: `--font-en` (Satoshi + Alexandria) and `--font-ar` (Alexandria + Satoshi). Locale swap is driven by `html[lang="ar"]` / `html[lang="en"]`.
- `frontend/src/styles/fonts.css` self-hosts Satoshi (Latin) and Alexandria (Arabic, `unicode-range: U+0600-06FF`) variable fonts from `/public/fonts`.
- `tabular-nums` is enabled on `body`.
- `prefers-reduced-motion` is honored at the global level.

### 3.6 Direction and language
- `<html dir>` and `<html lang>` are managed exclusively by `DirectionSync`.
- An anti-FOUC inline script in `index.html` restores both axes on next reload via `localStorage`.
- Theme axis (`html.class`) and direction axis (`html dir`) are **independent**. The redesign must preserve this independence.

---

## 4. Design Source of Truth

Order of authority for any visual decision proposed by this plan or its future execution:

1. **`DESIGN.md`** (repo root) — canonical visual system: tokens, typography, components, motion rules, "no glows / no gradients / no glassmorphism" restraint rules, pre-merge 4-state checklist (dark+RTL, dark+LTR, light+RTL, light+LTR).
2. **`PRODUCT.md`** (repo root) — brand strategy, primary users (Egyptian healthcare professionals shopping in Arabic on mobile), operators (admin triage), anti-references (generic SaaS, AI-assistant aesthetics, bargain-bin medical), six design principles.
3. **`docs/DESIGN_PRINCIPLES.md`** — **referenced by `README.md` but does not exist** on disk. **Gap surfaced here, not filled by this plan.** Until it exists, `DESIGN.md` is the gate-keeper.
4. **HeroUI v3 theme + tokens** as defined in `frontend/src/styles/globals.css`. Any token-level proposal must update this file rather than overriding tokens locally inside a component.

---

## 5. Open Design Methodology Application

Open Design is applied here as a **four-lens review process**, not as a UI library swap or rewrite license.

### 5.1 Audit lens
Survey each surface against design tokens, spacing scale, and the type ramp from `DESIGN.md`. Find off-token values (raw hex, arbitrary `text-[14px]`, ad-hoc shadow stacks).

### 5.2 System-thinking lens
Identify repeated visual patterns. Promote recurring patterns into either an existing HeroUI component prop usage or a documented composition rule. Do **not** create speculative new wrapper components.

### 5.3 Consistency review
Compare admin ↔ storefront, mobile ↔ desktop, RTL ↔ LTR, dark ↔ light. Drift between any pair is a defect.

### 5.4 Polish pass
Sweep micro-inconsistencies: focus rings, hover states, table row density, icon offsets, button radius, label spacing, breadcrumb chevrons.

### 5.5 What Open Design is NOT used for here
- Not used to swap HeroUI for any other library.
- Not used to justify rewrites of working components.
- Not used to fabricate new abstractions for things that have one or two call sites.
- Not used to change copy, business behavior, or routes.

---

## 6. Global Design-System Audit

| Token area | What to inspect | Where in repo | Pass criteria |
|---|---|---|---|
| Spacing | 4-px base grid, no arbitrary `p-[Npx]` values | `globals.css`, all `features/**` files | All spacing uses Tailwind scale steps |
| Type ramp | Heading sizes, weights, line-heights | `DESIGN.md` ramp, all pages | ≤ 4 heading sizes per page, ≤ 3 weights |
| Color tokens (OKLCH) | Light + dark parity, no raw hex outside tokens | `globals.css`, components | Zero raw color literals in TSX |
| Surfaces | `content1/2/3` tier usage | All cards, panels, sections | Nested surfaces step up one tier, never two |
| Borders | `divider` token only | All `border-*` usages | No raw border colors |
| Radius | Tailwind radius scale via HeroUI tokens | Buttons, inputs, cards, chips | No `rounded-full` outside chips/avatars |
| Shadows | DESIGN.md "no glows" rule | All `shadow-*` usages | No glow/colored shadows; restraint preserved |
| Focus states | Visible ring on keyboard focus, AR/EN parity | All interactive components | Ring tone matches accent, never invisible |
| Hover states | Defined per component, never absent | Buttons, links, table rows, chips | Hover transition ≤ 150 ms, respects `prefers-reduced-motion` |
| Responsive | sm/md/lg breakpoints consistent | Layouts, grids | Mobile-first; no desktop-only overflow |
| RTL flips | Logical properties only | Layout, navigation, forms | No `ml-`/`mr-`/`left-`/`right-` literals in NEW code (audit existing) |
| Dark/light parity | 4-state visual check | All pages | Per `DESIGN.md` pre-merge matrix |

---

## 7. Storefront Improvement Plan

Each route subsection follows the same shape: **Likely design risks → Target improvements → Must not change → Acceptance criteria.**

### 7.1 `/` — Catalog (`features/catalog/CatalogPage.tsx`)
- **Risks:** product grid density drift across breakpoints; inconsistent product card padding; price/typography drift; filter chips wrapping awkwardly on mobile; empty-state generic placeholder.
- **Improvements:** unified product card component proportions; consistent image aspect ratio; price uses `tabular-nums`; mobile filter row uses horizontal scroll or sheet, not wrap-collapse; empty state matches §15 pattern.
- **Must not change:** product fetch logic, filter parameter shape, route params, sort/order semantics.
- **Acceptance:** identical product grid count and order; pixel-stable cards across breakpoints; 4-state matrix clean.

### 7.2 `/products/:slug` — Product Detail (`features/catalog/ProductDetailPage.tsx`)
- **Risks:** gallery vs. info column proportions; CTA placement on mobile; price prominence; spec/ingredients layout density.
- **Improvements:** gallery aspect locked; price block uses the canonical price typography pattern; primary CTA is the only filled button in the viewport at any time; sticky mobile CTA respects RTL.
- **Must not change:** "add to cart" / "inquire" behavior; slug routing; structured data.
- **Acceptance:** identical interactive behavior; 4-state matrix clean; CTA always reachable without scroll on mobile.

### 7.3 `/cart` — Cart (`features/cart/CartPage.tsx`)
- **Risks:** cart line item alignment, quantity stepper density, remove-button placement, summary panel disconnected from items visually.
- **Improvements:** line items use a consistent grid; summary uses a `content2` panel; quantity stepper aligned per RTL/LTR; totals use `tabular-nums`.
- **Must not change:** cart merge behavior, quantity validation, totals math, persistence rules.
- **Acceptance:** cart state and edge cases identical (recovered cart, merged cart, server reconciliation).

### 7.4 `/inquiries` — Inquiries (`features/inquiries/InquiriesPage.tsx`)
- **Risks:** form/list page hybrid feels generic; empty state weak.
- **Improvements:** form uses §12 normalization; inquiry list uses card pattern from §14; empty state per §15.
- **Must not change:** inquiry submission flow, validation, success behavior.
- **Acceptance:** submission flow byte-identical; visual register matches storefront tone.

### 7.5 `/checkout` — Checkout (`features/checkout/CheckoutPage.tsx`, `features/checkout/components`)
- **Risks:** step layout density; address picker visual weight; payment method picker radiogroup polish; payment-proof upload feedback; mobile bottom-bar conflict with sticky CTA.
- **Improvements:** step indicator typography normalized; address selector uses card-style radio (preserves existing radiogroup keyboard nav from memory); payment method picker uses consistent chip/card; proof upload has explicit empty/uploading/uploaded/error sub-states (§15).
- **Must not change:** address selection logic, governorate handling, payment method gating, proof upload behavior, order creation, payment rules. Cancellation reason logic, cart merge recovery, and stale-proof guard from earlier hardening are out of scope here.
- **Acceptance:** every flow path identical end-to-end; A11y matches `radiogroup` pattern already validated.

### 7.6 `/account` — Account Shell (`shared/components/ShellPage.tsx` when rendered for `/account`)
- **Risks:** tab/nav drift between account sub-pages; mobile layout for nested account routes.
- **Improvements:** shared shell typography and spacing; nav uses logical positioning so RTL is automatic.
- **Must not change:** route layout, guards, redirect behavior.
- **Acceptance:** uniform shell across `/account/*`.

### 7.7 `/account/orders` — Orders List (`features/orders/OrdersListPage.tsx`)
- **Risks:** mixed status chip styles; date/total typography drift; mobile reading order in RTL.
- **Improvements:** single status chip taxonomy (success/info/warning/danger/default); date column uses tabular numerals; line items collapse cleanly on mobile.
- **Must not change:** order list query, pagination, status mapping.
- **Acceptance:** identical data; clearer scan path.

### 7.8 `/account/orders/:orderNumber` — Order Detail (`features/orders/OrderDetailPage.tsx`)
- **Risks:** information density too low or too high; receipt-like areas missing tabular-nums; action button hierarchy unclear.
- **Improvements:** single primary action per viewport; receipt section uses tabular numerals; address/payment/items panels use a consistent card tier ladder.
- **Must not change:** payment-proof upload/view permissions, cancellation behavior, status transitions.
- **Acceptance:** identical operational behavior; cleaner visual hierarchy.

### 7.9 `/account/addresses` — Address Book (`features/addresses/AddressBookPage.tsx`)
- **Risks:** default-address affordance unclear; edit/delete cells crowded; empty state weak.
- **Improvements:** default badge consistent with §-styling; per-address actions use icon-button pattern (§10); empty state matches §15.
- **Must not change:** default-address constraint behavior (DB default constraint already enforced — see memory), governorate semantics.
- **Acceptance:** CRUD parity; default-address invariant preserved.

### 7.10 Storefront cross-cutting focuses
Catalog layout · product grid · product cards · product detail layout · product image gallery · price display · cart line item · checkout step layout · address selection · payment method picker · order detail · empty states · mobile behavior.

---

## 8. Admin Improvement Plan

Admin should feel **operational, neutral, denser** — closer to Linear/Stripe console than to the commercial storefront. Existing memory items (admin focus rings, Escape behavior, visual hierarchy pass) are the baseline; this plan builds on them, not duplicates them.

### 8.1 `/admin` — Hub (`features/admin/AdminHubPage.tsx`)
- **Risks:** KPI rows feel like marketing tiles; storefront accent leaking into admin.
- **Improvements:** KPI cells use neutral surfaces; accent color reserved for true CTAs only; admin shell has its own (lower) accent saturation.
- **Must not change:** stats query, role gating.

### 8.2 `/admin/orders` and `/admin/orders/:orderNumber` (`features/admin/AdminOrdersListPage.tsx`, `AdminOrderDetailPage.tsx`)
- **Risks:** filter bar drift; payment-proof viewer modal density; status chips inconsistent with storefront taxonomy.
- **Improvements:** filter bar follows §11 admin pattern; proof viewer uses consistent modal chrome; status chip taxonomy unified across storefront + admin but tone differs (admin uses neutral/operational tone).
- **Must not change:** payment proof view permissions, status transition logic, i18n status keys.

### 8.3 `/admin/categories` (`features/admin/catalog/AdminCategoriesPage.tsx`)
- **Risks:** tree/list view density; inline edit affordance unclear.
- **Improvements:** consistent row density; clear hover affordance for inline actions.
- **Must not change:** category hierarchy semantics, slug generation, validation.

### 8.4 `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit` (`AdminProductsListPage.tsx`, `AdminProductCreatePage.tsx`, `AdminProductEditPage.tsx`, `features/admin/catalog/components`)
- **Risks:** create/edit forms heavy; image manager spacing; field grouping inconsistent.
- **Improvements:** group fields into clearly titled sections; consistent submit/cancel pairing; image manager uses §15 loading + empty states.
- **Must not change:** product schema, validation, slug rules, upload behavior, multi-image rules.

### 8.5 `/admin/payment-methods` (`features/admin/catalog/AdminPaymentMethodsPage.tsx`)
- **Risks:** method enable/disable affordance generic; bank/instructions inputs cramped.
- **Improvements:** switch + label pattern unified; instructions use textarea normalization (§12).
- **Must not change:** method gating, payment rule semantics.

### 8.6 `/admin/inquiries` (`features/admin/AdminInquiriesPage.tsx`)
- **Risks:** inbox-like list lacks hierarchy; read/unread state weak.
- **Improvements:** unread weight (subtle), read state muted; row density consistent with §13.
- **Must not change:** inquiry state transitions, notification rules.

### 8.7 `/admin/users` (`features/admin/AdminUsersPage.tsx`)
- **Risks:** role chip styling; "last admin" guard UI hint missing or inconsistent.
- **Improvements:** role chips use neutral admin chip palette; destructive actions visually distinct from neutral ones (§10).
- **Must not change:** last-admin guard semantics, role assignment rules, permission boundaries.

### 8.8 Admin shell, header, sidebar (`features/admin/components/AdminLayout.tsx`, `AdminHeader.tsx`, `AdminSidebar.tsx`)
- **Risks:** any glassmorphism/backdrop-blur leak from storefront should already be removed per memory; verify; sidebar item active-state polish; collapse behavior on tablet.
- **Improvements:** crisp opaque surfaces; clear active-state token; logical positioning for RTL.
- **Must not change:** route → sidebar mapping, role-visible items, collapse persistence.

### 8.9 Admin cross-cutting focuses
Admin shell · header · sidebar · dashboard KPI rows · tables · filters · forms · action buttons · status chips · detail panels · loading states · empty states.

---

## 9. HeroUI Component Usage Plan

Per-component audit. For each: *Audit target → Desired usage → Forbidden patterns → Acceptance criteria.*

### 9.1 `Button`
- **Audit:** variant usage, size scale, `isLoading`, `startContent`/`endContent` for icons.
- **Desired:** primary/secondary/ghost/danger/icon variants only (§10); icons go through `startContent`/`endContent` for RTL safety.
- **Forbidden:** raw `<button>`; ad-hoc `bg-*`/`text-*` overrides on `Button`; `rounded-full` outside icon-only round buttons in narrowly justified places.
- **Acceptance:** one primary per viewport region.

### 9.2 `Input` / `Textarea`
- **Audit:** `label`, `description`, `errorMessage`, `isInvalid`, `isRequired`.
- **Desired:** always use built-in label + helper + error; never compose your own label-element above an Input.
- **Forbidden:** manual `<label>` siblings; `placeholder`-as-label; arbitrary height overrides.
- **Acceptance:** every field uses the same vertical rhythm.

### 9.3 `Select`
- **Audit:** `label`, `selectionMode`, RTL trigger chevron direction.
- **Desired:** native `Select` for closed-list fields, including governorate, status filter, sort.
- **Forbidden:** rolling a custom `<select>`; mixing `Select` with autocomplete pattern unless required.

### 9.4 `Card`
- **Audit:** `shadow`, `radius`, header/body/footer subcomponents.
- **Desired:** consistent radius + surface tier (§14).
- **Forbidden:** card-in-card without tonal differentiation; colored shadow.

### 9.5 `Chip`
- **Audit:** color, variant, size; status taxonomy.
- **Desired:** semantic colors mapped to status (success/info/warning/danger/default).
- **Forbidden:** raw-hex chip; outline + filled mixed in the same context.

### 9.6 `Table`
- **Audit:** density, `removeWrapper`, sticky header, `bottomContent` for pagination.
- **Desired:** consistent admin density (compact); `tabular-nums` on numeric columns; action column logical-aligned.
- **Forbidden:** wrapping a `Table` in a custom card and then double-bordering it.

### 9.7 `Modal` / `Popover` / `Dropdown`
- **Audit:** trigger placement, dismissal (ESC handled — per memory), focus return.
- **Desired:** ESC closes; focus returns to trigger; backdrop opacity consistent with theme.
- **Forbidden:** disabling ESC; backdrop blur (per "no glassmorphism" rule unless documented as exception).

### 9.8 `RadioGroup` / `Checkbox` / `Switch`
- **Audit:** keyboard navigation (validated in memory — `radiogroup` arrow navigation), label structure, RTL layout.
- **Desired:** use HeroUI primitives; preserve keyboard contract.
- **Forbidden:** custom radio cards built from `div`s; bypassing HeroUI Checkbox after the memory-documented migration.

### 9.9 `Skeleton` / `Spinner`
- **Audit:** shape-matched skeletons per surface; spinner only for very short waits.
- **Desired:** skeletons for >500 ms predictable loads; spinner for short or indeterminate.
- **Forbidden:** generic full-page spinner where a shape-matched skeleton applies.

---

## 10. Buttons Plan

### 10.1 Variants
| Variant | Use | Visual |
|---|---|---|
| Primary (solid) | Single most important action in the viewport | Accent fill, theme-token color |
| Secondary (flat/bordered) | Supporting actions | Neutral border or muted fill |
| Ghost (light) | Tertiary / in-table actions | Transparent, hover-fill |
| Danger | Destructive (delete, cancel order) | Red/danger token, only when destructive |
| Icon-only | Compact actions in dense rows | Square or circular per documented exception |
| Link-shaped | Inline navigation | Underline on hover, accent color |

### 10.2 Rules
- **One primary CTA** per visible region where possible.
- **No danger color on primary** unless the action is genuinely destructive.
- **No `rounded-full` overrides** outside chips, avatars, or icon-only round buttons explicitly documented as exceptions.
- **Icon spacing uses logical properties** (`ms-*` / `me-*`) so RTL flips naturally.
- **Loading state** uses `isLoading` — never custom spinners inside the label.
- **Sizes**: `sm` for table actions, `md` for forms, `lg` only for major hero CTAs.

---

## 11. Filters Plan

### 11.1 Storefront filters
- Inline filter row on desktop, horizontal scroll or bottom-sheet on mobile (no awkward wrap-collapse).
- Selected filters reflected as removable chips below the row.
- Reset is a ghost button at end of the row.

### 11.2 Admin filters
- Dense single-row layout above each table.
- Search input + status select + date range + reset.
- Chips for active filters above the table.

### 11.3 Shared rules
- Chevron direction respects RTL.
- Selected chip state has clear contrast in both dark and light.
- Mobile wrap: never two-and-a-half rows that look broken.

---

## 12. Forms Plan

- **Labels** always above the field (top-aligned).
- **Helper text** below; muted; never duplicates the label.
- **Error message** replaces helper text on `isInvalid`; same line height.
- **Vertical rhythm**: consistent gap between fields driven by Tailwind spacing.
- **Submit/Cancel pairing**: Primary at the inline-end (right in LTR, left in RTL), Cancel before it.
- **Disabled + loading**: submit shows `isLoading`; cancel remains enabled.
- **Validation timing**: on blur for field-level; on submit for form-level.
- **Arabic line-height**: Alexandria slightly taller; verified via 4-state matrix.

---

## 13. Tables and Lists Plan

- **Header tone**: muted; weight 500; no all-caps unless documented.
- **Row density**: compact in admin; comfortable in storefront-side history lists.
- **Hover row**: subtle background step (one surface tier up).
- **Action cells**: inline-end aligned; icon-only buttons for repeated actions; full button only for primary row action.
- **Numeric columns**: `tabular-nums`, inline-end aligned.
- **Pagination**: HeroUI `Pagination` in `bottomContent`; consistent across admin tables.
- **Empty rows**: §15 empty state, not a blank table.
- **Mobile**: stacked cards under `md` for admin tables OR horizontal scroll with sticky first column — choose per page; one approach per page, document it.

---

## 14. Cards and Panels Plan

- **Radius**: one scale, sourced from HeroUI token.
- **Border vs. shadow**: border on flat surfaces (`content1`); subtle shadow only on elevated surfaces (modals, popovers).
- **Background tiers**: `content1` (page surface), `content2` (panel), `content3` (nested panel).
- **Padding**: scale, not arbitrary px.
- **Nesting**: avoid card-in-card unless tonal differentiation is explicit (`content2` inside `content1`).
- **Specific patterns**:
  - **Product card**: image + name + price; identical proportions across catalog and recommendations.
  - **Admin panel**: title row + body + optional footer; no shadow.
  - **Order panel**: receipt-like tabular-nums; clear sections.
  - **Checkout panel**: distinct from order panel by tier — checkout uses `content2` over `content1`.

---

## 15. Loading, Empty, and Error States Plan

Shape-matched skeletons replace generic spinners on these surfaces:

- Product detail (gallery + info column skeleton).
- Checkout payment methods (radio-card skeleton row).
- Admin dashboard (KPI row skeleton).
- Admin orders list (table-row skeleton).
- Admin products list (table-row skeleton).
- Admin users list (table-row skeleton).
- Admin inquiries list (row skeleton).
- Admin payment methods (row skeleton).
- Admin order detail (panel skeletons matching real layout).

### 15.1 Empty state structure
- Optional icon (Lucide, muted).
- Headline (short).
- One-line body (muted).
- Single CTA when an action makes sense (e.g., "Add product").

### 15.2 Error state structure
- Short message, plain language.
- One recovery action (Retry / Go back / Contact support).
- No stack traces, no raw error codes in the UI.

---

## 16. Typography Plan

- **Heading hierarchy**: `h1`–`h4` only; one `h1` per route.
- **Weights**: at most 3 weights per page (typically 500 / 600 / 700).
- **Muted text**: standardized on the `default-500` token family.
- **Arabic readability**: Alexandria stack via `--font-ar`; verify line-height in `globals.css`.
- **Numerics**: every price, count, KPI, order number, and date uses `tabular-nums`.
- **Format unification**: `frontend/src/shared/lib/format.ts` is the only source for price/date/order formatting; redesign work re-routes any ad-hoc formatting through it.

---

## 17. RTL/LTR Plan

Audit checklist (apply per page):

- Layout direction — driven exclusively by `<html dir>`; never override at the component level.
- Spacing — logical properties only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`).
- Icons — directional icons (chevrons, arrows) flip; brand icons (logo) do not.
- Dropdowns — alignment respects direction.
- Sidebars — admin sidebar starts at the inline-start.
- Breadcrumbs — separator chevron flips in RTL.
- Filters — chip order reads start-to-end.
- Tables — action column at inline-end.
- Checkout step indicator — step 1 at inline-start in both directions (step direction is a *reading-order* axis, not a *left-right* axis).
- Mobile bottom bar — order mirrors in RTL.

---

## 18. Dark/Light Plan

Audit per page in both modes:

- **Contrast**: text vs. surface at minimum WCAG AA.
- **Surface tiers**: `content1/2/3` distinguishable in both modes.
- **Borders**: `divider` visible without being noisy.
- **Hover/focus**: parity across modes; ring tone never invisible in light.
- **Skeletons**: tone differs per mode (lighter in light, darker in dark) but shape identical.
- **Cards on cards**: tonal step always visible.
- **Tables**: row divider and hover row consistent across modes.
- **Forms**: field background steps up from page; ring uses accent token.

---

## 19. Implementation Phases

Eight phases. **This plan does not execute them.** Each is a future, separately-approved scope.

### Phase 1 — Design-system audit (read-only)
- **Goal:** produce a defect log per route/component against §6.
- **Inspect:** every file in §20.
- **Allowed:** reading, screenshotting, note-taking.
- **Forbidden:** any code edit.
- **Acceptance:** defect log reviewed.

### Phase 2 — Shared tokens + global consistency
- **Goal:** correct token drift only.
- **Inspect:** `globals.css`, `fonts.css`.
- **Allowed:** token edits in `globals.css`; no component edits.
- **Forbidden:** new components, new tokens beyond what audit demands.
- **Acceptance:** all four matrix states render unchanged in shape, improved in token compliance.

### Phase 3 — Shared component normalization
- **Goal:** bring shared shell components to spec.
- **Inspect:** `Layout.tsx`, `ShellPage.tsx`, `ErrorBoundary.tsx`, `NotFoundPage.tsx`, admin layout/header/sidebar.
- **Allowed:** prop and className edits aligned with §9–§14; no behavior changes.
- **Forbidden:** new wrapper components, route changes.
- **Acceptance:** shared shells visually consistent across all routes.

### Phase 4 — Storefront page polish
- **Goal:** apply §7 to each storefront route.
- **Inspect:** all `features/catalog/**`, `features/cart/**`, `features/checkout/**`, `features/orders/**`, `features/addresses/**`, `features/inquiries/**`.
- **Allowed:** layout and component normalization only.
- **Forbidden:** business logic, query shape, route param changes.
- **Acceptance:** 4-state matrix clean; flows behave identically.

### Phase 5 — Admin page polish
- **Goal:** apply §8 to each admin route.
- **Inspect:** all `features/admin/**`.
- **Allowed:** density, chip taxonomy, table polish, form normalization.
- **Forbidden:** permission changes, status semantics, schema shape.
- **Acceptance:** admin distinguishable from storefront; consistent within itself.

### Phase 6 — Loading, empty, error states
- **Goal:** roll out §15 patterns across all listed surfaces.
- **Inspect:** every page in §20.
- **Allowed:** skeleton/empty/error JSX edits.
- **Forbidden:** removing functionality that lived inside a spinner-state.
- **Acceptance:** every listed surface has a shape-matched skeleton.

### Phase 7 — RTL/LTR + dark/light QA
- **Goal:** complete the §17 + §18 audit per route.
- **Allowed:** small, targeted fixes to close defects; no large refactors.
- **Forbidden:** anything outside defect closure.
- **Acceptance:** §22 QA matrix is 100% pass.

### Phase 8 — Final regression pass
- **Goal:** verify nothing regressed.
- **Allowed:** running build, lint, tests, i18n checks.
- **Forbidden:** new feature work.
- **Acceptance:** all CI gates pass; §23 acceptance met.

---

## 20. File-by-File Audit Map

| Path | Surface | Audit focus | Risk |
|---|---|---|---|
| `frontend/src/app/providers.tsx` | Global | Provider order stays exact; do not insert new providers | Breaking direction/locale sync |
| `frontend/src/app/router.tsx` | Global | Route inventory frozen | Adding/removing routes |
| `frontend/src/styles/globals.css` | Tokens | OKLCH palette, HeroUI overrides, `@theme inline` | Token drift |
| `frontend/src/styles/fonts.css` | Tokens | Satoshi + Alexandria `unicode-range` swap | Arabic font fallback |
| `frontend/src/shared/components/Layout.tsx` | Shell | Storefront shell spacing/typography | Storefront feel |
| `frontend/src/shared/components/ShellPage.tsx` | Shell | Account shell density/nav | Account feel |
| `frontend/src/shared/components/ErrorBoundary.tsx` | Error | §15 error pattern | Generic error UX |
| `frontend/src/shared/pages/NotFoundPage.tsx` | Error | §15 empty/error pattern | Bland 404 |
| `frontend/src/shared/lib/format.ts` | Util | Numeric/date/price formatting | Format drift |
| `frontend/src/shared/lib/i18n.ts` | Util | Resource registration; do not alter keys | Translation breakage |
| `frontend/src/features/catalog/CatalogPage.tsx` | Storefront | §7.1 | Grid drift |
| `frontend/src/features/catalog/ProductDetailPage.tsx` | Storefront | §7.2 | Mobile CTA |
| `frontend/src/features/cart/CartPage.tsx` | Storefront | §7.3 | Cart math/UX |
| `frontend/src/features/checkout/CheckoutPage.tsx` | Storefront | §7.5 | Checkout behavior |
| `frontend/src/features/checkout/components/**` | Storefront | §7.5 sub-components | Address/payment/proof |
| `frontend/src/features/orders/OrdersListPage.tsx` | Account | §7.7 | Status chip taxonomy |
| `frontend/src/features/orders/OrderDetailPage.tsx` | Account | §7.8 | Action hierarchy |
| `frontend/src/features/addresses/AddressBookPage.tsx` | Account | §7.9 | Default-address invariant |
| `frontend/src/features/inquiries/InquiriesPage.tsx` | Storefront | §7.4 | Empty state |
| `frontend/src/features/admin/AdminHubPage.tsx` | Admin | §8.1 | KPI tone |
| `frontend/src/features/admin/AdminOrdersListPage.tsx` | Admin | §8.2 | Filter bar |
| `frontend/src/features/admin/AdminOrderDetailPage.tsx` | Admin | §8.2 | Proof viewer |
| `frontend/src/features/admin/AdminUsersPage.tsx` | Admin | §8.7 | Role chips, last-admin |
| `frontend/src/features/admin/AdminInquiriesPage.tsx` | Admin | §8.6 | Inbox hierarchy |
| `frontend/src/features/admin/components/AdminLayout.tsx` | Admin shell | §8.8 | Shell separation |
| `frontend/src/features/admin/components/AdminHeader.tsx` | Admin shell | §8.8 | Header neutrality |
| `frontend/src/features/admin/components/AdminSidebar.tsx` | Admin shell | §8.8 | Active state, RTL |
| `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx` | Admin | §8.3 | Tree density |
| `frontend/src/features/admin/catalog/AdminProductsListPage.tsx` | Admin | §8.4 | Table density |
| `frontend/src/features/admin/catalog/AdminProductCreatePage.tsx` | Admin | §8.4 | Form grouping |
| `frontend/src/features/admin/catalog/AdminProductEditPage.tsx` | Admin | §8.4 | Form grouping |
| `frontend/src/features/admin/catalog/AdminPaymentMethodsPage.tsx` | Admin | §8.5 | Switch + textarea |
| `frontend/src/features/admin/catalog/components/**` | Admin | §8.4 sub-components | Image manager |

---

## 21. Risk Register

| Risk | Mitigation |
|---|---|
| Accidentally changing checkout behavior | Every checkout edit must keep the same query/mutation calls, the same form state shape, the same payment method gating. Phase 4 forbids behavior changes. |
| Accidentally changing admin permissions | Permission props and role gates are out of scope. Only visual props change in Phase 5. |
| Breaking RTL | All edits use logical properties; QA matrix §22 must pass before merge. |
| Breaking dark/light contrast | Pre-merge 4-state matrix from `DESIGN.md` is mandatory. |
| Over-customizing HeroUI | Forbidden patterns in §9 are enforced via review checklist. |
| Admin/storefront visual leakage | §8 requires explicit tone separation; storefront accent saturation is reduced in admin. |
| Generic-template look | `PRODUCT.md` anti-references (generic SaaS, AI-assistant) are an explicit rejection criterion. |
| One-off styles | Audit log from Phase 1 names every off-token value; Phase 2 closes them. |
| Excessive new abstractions | No new wrapper components in Phases 2–6 unless three or more call sites require it AND it's documented. |
| Memory drift (stale assumptions about prior fixes) | Verify `[[project_phase5_design]]` items (radiogroup nav, HeroUI Checkbox, admin focus ring + Escape, visual hierarchy) still hold before re-touching those areas. |

---

## 22. QA Matrix

For each route, verify under all four mode combinations.

| Route | dark+RTL | dark+LTR | light+RTL | light+LTR |
|---|---|---|---|---|
| `/` | ☐ | ☐ | ☐ | ☐ |
| `/products/:slug` | ☐ | ☐ | ☐ | ☐ |
| `/cart` | ☐ | ☐ | ☐ | ☐ |
| `/inquiries` | ☐ | ☐ | ☐ | ☐ |
| `/checkout` | ☐ | ☐ | ☐ | ☐ |
| `/account/orders` | ☐ | ☐ | ☐ | ☐ |
| `/account/orders/:orderNumber` | ☐ | ☐ | ☐ | ☐ |
| `/account/addresses` | ☐ | ☐ | ☐ | ☐ |
| `/admin` | ☐ | ☐ | ☐ | ☐ |
| `/admin/orders` | ☐ | ☐ | ☐ | ☐ |
| `/admin/orders/:orderNumber` | ☐ | ☐ | ☐ | ☐ |
| `/admin/categories` | ☐ | ☐ | ☐ | ☐ |
| `/admin/products` | ☐ | ☐ | ☐ | ☐ |
| `/admin/products/new` | ☐ | ☐ | ☐ | ☐ |
| `/admin/products/:id/edit` | ☐ | ☐ | ☐ | ☐ |
| `/admin/payment-methods` | ☐ | ☐ | ☐ | ☐ |
| `/admin/inquiries` | ☐ | ☐ | ☐ | ☐ |
| `/admin/users` | ☐ | ☐ | ☐ | ☐ |

Per cell, verify: layout intact, focus visible, hover defined, status chip taxonomy correct, numerics tabular, no off-token color, no `rounded-full` outside allowlist, no glassmorphism leak, primary CTA singular.

---

## 23. Final Acceptance Criteria

The future implementation phases are acceptable only if **all** of the following hold:

- HeroUI v3 remains the only UI component library; no replacement, no parallel library.
- Existing pages and routes remain intact; no additions, no removals.
- Existing business behavior remains intact (cart, checkout, order creation, payment rules, payment-proof rules, upload behavior, authentication, authorization, admin role behavior).
- Existing Arabic/English i18n support remains intact; no translation key semantic changes.
- RTL/LTR remains polished; logical properties used throughout edited code; QA matrix §22 passes.
- Dark/light remains polished; 4-state pre-merge matrix from `DESIGN.md` passes.
- Storefront feels premium, clean, commercial, trustworthy, production-grade.
- Admin feels operational, neutral, and clearly separated from the storefront.
- Buttons are consistent (§10); one primary per region; no danger-on-primary leakage.
- Filters are consistent (§11) across storefront and admin.
- Cards and panels are consistent (§14).
- Forms are consistent (§12).
- Tables are consistent (§13).
- Badges/chips are consistent (§9.5, §13).
- Loading/empty/error states are consistent (§15).
- No obvious AI-generated or generic-template look — `PRODUCT.md` anti-references are not approached.
- No forbidden `rounded-full` overrides remain unless explicitly documented as exceptions.
- No admin glassmorphism/backdrop-blur leak remains unless explicitly documented as exceptions.
- Build, lint, tests, and i18n checks pass after the future implementation phase.

---

*End of plan. This file is the only deliverable from this planning task.*
