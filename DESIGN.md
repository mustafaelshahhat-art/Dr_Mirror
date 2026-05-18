# Design

> Visual system for Dr_Mirror. Strategic context lives in [PRODUCT.md](PRODUCT.md). This file is the source of truth for tokens, type, components, and motion. Where this file conflicts with `docs/DESIGN_PRINCIPLES.md`, that file remains the gate-keeper for PR review; this file is the canonical reference for variant generation and new work.

## Theme

**Dark-first, both ship.** Dark is the canonical surface — designed first, photographed against, the default on first visit. Light is a full peer (verified in every PR), not a courtesy mode. The user's choice persists in `localStorage('dr-mirror-theme')`; an inline anti-FOUC script in `index.html` applies the class before React mounts so there is no flash on reload.

**Direction is independent of theme.** `dir="rtl"` (Arabic default) and `dir="ltr"` (English) flip on `<html>` from `localStorage('dr-mirror-lang')`. Every screen renders correctly in all four combinations: `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)`.

**Elevation by lightness, not shadow** in dark mode. Surfaces step ~4% lighter each level (`background` → `surface` → `surface-2`); shadows are weak or absent. Light mode permits a single shadow step (`shadow-sm` max) on hero/product cards.

**Stack.** React 19, TypeScript ~6, Vite 8, Tailwind CSS v4, HeroUI v3 (single component system; no mixed libraries), react-router-dom v7, TanStack Query v5, react-hook-form + Zod (all forms), axios, dayjs, next-themes, react-i18next, framer-motion (used sparingly for HeroUI internals only), Lucide icons.

## Color

All colour in **OKLCH** (perceptual uniformity for dark/light parity). Tokens live in `src/styles/globals.css` and are extended by HeroUI's preset. Tinted neutrals only — never raw `#000` or `#fff`.

### Strategy

**Restrained.** One accent (emerald) carries primary actions, current selection, focus rings, and status indicators. Bone (warm off-white) is a *surface*, not an accent — it lives behind product photography. Status colours (success / warning / danger) are semantic, never decorative.

> Restrained is the floor for both surfaces. The storefront can earn **Committed** on a single moment (a drenched hero, a single onboarding screen) but only with explicit intent — never by default.

### Dark mode (canonical)

| Token | Value (OKLCH) | Use |
|---|---|---|
| `--brand` | `oklch(0.65 0.13 165)` | Deep emerald. Buttons, links, focus rings, active nav. One per page. |
| `--brand-hover` | `oklch(0.70 0.13 165)` | Hover state on emerald surfaces |
| `--brand-active` | `oklch(0.60 0.13 165)` | Pressed/active state |
| `--brand-subtle` | `oklch(0.30 0.05 165)` | Brand-tinted backgrounds (badges, callouts) |
| `--background` | `oklch(0.12 0 0)` | Page background |
| `--surface` (HeroUI `content1`) | `oklch(0.16 0 0)` | Cards, primary surfaces (~4% lighter than bg) |
| `--surface-2` (HeroUI `content2`) | `oklch(0.20 0 0)` | Elevated surfaces — popovers, inputs, table headers |
| `--surface-3` (HeroUI `content3`) | `oklch(0.24 0 0)` | Highest elevation — modals over cards |
| `--foreground` | `oklch(0.99 0 0)` | Primary text |
| `--muted` | `oklch(0.70 0 0)` | Secondary text, captions, table-header labels |
| `--muted-2` | `oklch(0.55 0 0)` | Tertiary text, placeholder, helper text |
| `--border` (HeroUI `divider`) | `oklch(1 0 0 / 0.08)` | Translucent white — never solid; typically `border-divider/60` |
| `--bone` | `oklch(0.92 0.01 90)` | Warm off-white surface behind product photography (cool emerald counterpoint) |

### Light mode

| Token | Value (OKLCH) | Use |
|---|---|---|
| `--brand` | `oklch(0.50 0.14 165)` | Slightly darker emerald — AA contrast on light surfaces |
| `--brand-hover` | `oklch(0.55 0.14 165)` | Hover state on emerald surfaces (+0.05 L vs `--brand`) |
| `--brand-active` | `oklch(0.46 0.14 165)` | Pressed/active state (−0.04 L vs `--brand`) |
| `--brand-subtle` | `oklch(0.92 0.04 165)` | Brand-tinted backgrounds (badges, callouts, selected-row washes) |
| `--background` | `oklch(0.99 0 0)` | Page background — warm off-white |
| `--surface` | `oklch(1 0 0)` | Cards |
| `--surface-2` | `oklch(0.97 0 0)` | Elevated surfaces — inputs, table headers |
| `--foreground` | `oklch(0.18 0 0)` | Primary text |
| `--muted` | `oklch(0.45 0 0)` | Secondary text |
| `--muted-2` | `oklch(0.58 0 0)` | Tertiary text |
| `--border` | `oklch(0 0 0 / 0.08)` | Translucent black |
| `--bone` | `oklch(0.94 0.006 245)` | Cooler bone for light backgrounds |

### Status

Use only for semantics — never to decorate.

| Token | Use |
|---|---|
| `success` | Confirmed / Paid / Delivered order states; positive form feedback |
| `warning` | Pending / PendingPaymentReview; non-blocking advisory state |
| `danger` | Cancelled state; destructive actions; validation errors |
| `default` | Neutral chips, draft state, unfiltered counts |

Status badges use low-alpha fills (`bg-success/15 text-success`, etc.) — never full-saturation backgrounds, never as decoration.

### Hard rules

- **One accent hue per page.** Emerald is the only colour that travels. Bone is a surface.
- **No `#000` or `#fff`.** All neutrals tint toward 0 chroma at extremes.
- **No glows, neon, color-shift gradients, or full-page background gradients.** One subtle gradient is permitted per page, only on a hero or empty-state — never below the fold.
- **No glassmorphism as decoration.** The single permitted backdrop-blur is the storefront sticky header (`bg-background/80 backdrop-blur`), and only there.

## Typography

**Self-hosted variable fonts, preloaded, no third-party CDN.**

- **Satoshi** (Latin) — `/public/fonts/Satoshi-Variable.woff2`, weights 300–900, `font-display: swap`.
- **Alexandria** (Arabic) — `/public/fonts/Alexandria-Variable.woff2`, weights 100–900, `font-display: swap`, `unicode-range` restricted to the Arabic block so Latin runs fall through to Satoshi.

Stacks declared in `src/styles/globals.css`:

```css
--font-en: 'Satoshi', 'Alexandria', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-ar: 'Alexandria', 'Satoshi', 'Segoe UI', 'Tahoma', sans-serif;
```

The body applies `--font-en` by default; `html[lang='ar'] body` swaps to `--font-ar`. Mixed-script runs (Arabic prose with English brand names) work without per-element overrides — each stack contains both families.

### Scale

**No custom type scale.** HeroUI / Tailwind defaults stand; the rules below tighten *usage*. Body inherits `font-variant-numeric: tabular-nums` globally so digits align in both prose and tables.

| Role | Class | Use |
|---|---|---|
| Display | `text-3xl md:text-4xl lg:text-5xl` / `font-bold` / `tracking-tight` | Storefront hero only. One per page. |
| H1 (page title) | `text-2xl` / `font-semibold` / `tracking-tight` | One per page, storefront + admin |
| H2 (section) | `text-lg` / `font-semibold` | Sparingly |
| H3 (sub-section) | `text-base` / `font-medium` | |
| Body — storefront | `text-base` / `font-normal` / `leading-relaxed` | Marketing prose, product descriptions, checkout copy |
| Body — admin | `text-sm` / `font-normal` | Dashboards, tables, dense forms |
| Label / micro | `text-xs` / `font-medium` / `uppercase` / `tracking-wide` | Table headers, form labels, badges, section labels in sidebar |

### Weights

Restrict to **400, 500, 600, 700**. **Max 3 distinct weights per page** — typical mixes:

- Storefront: 400 / 600 / 700 (body / nav + product names / hero + price)
- Admin: 400 / 500 / 700 (body / labels + active nav / page title)

### Numerics

- **Western digits everywhere** (`numberingSystem: 'latn'`), Arabic locale included.
- **`tabular-nums` on every numeric column** — prices, totals, table cells, order numbers, KPI tiles, pagination, dashboards.
- Currency formatting is centralized in `src/shared/lib/format.ts` (`1,250.00 ج.م` in `ar`, `EGP 1,250.00` in `en`) — never inline-format prices.
- English brand names or codes inside Arabic prose stay LTR — wrap with `<span dir="ltr">` when isolated.

### Letter spacing & rhythm

- `tracking-tight` on Display + H1 only.
- `tracking-wide` on uppercase micro labels.
- Default elsewhere.
- Headings: `leading-tight`. Body: `leading-relaxed`. Body line length capped 65–75ch on prose surfaces; admin tables run wider.

## Spacing

**Tailwind's 4 px grid is the only scale.** No arbitrary `[Npx]` values without an explicit justification comment.

| Layer | Step | Examples |
|---|---|---|
| Component internals | multiples of 4 px | `gap-1`, `gap-2`, `p-3`, `py-2` |
| Layout gaps | multiples of 8 px | `gap-2`, `gap-4`, `gap-6` |
| Section gaps | multiples of 16 px | `gap-4`, `gap-8`, `space-y-8` |
| Page gutters | `px-4` / `md:px-6` / `lg:px-8` | Same on both shells |
| Card internals (desktop) | `p-6` minimum | `p-4` on mobile |

**Adjacent surfaces always have a gap.** If two surfaces touch, they are one surface — flatten or separate.

## Layout

### Shells

Two distinct shells, sharing tokens, parting on density and chrome.

**Storefront** — `src/shared/components/Layout.tsx`
- Sticky header (`h-14`), single divider, single backdrop-blur, transparent-over-background.
- Centred main: `mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-8`.
- Footer: thin divider, centred copyright, `text-xs text-muted`.
- The header **short-circuits to `null` when `isAdmin === true`** as a defensive guard — admins never see storefront chrome.

**Admin** — `src/features/admin/components/AdminLayout.tsx`
- `AdminHeader` (sticky) + `AdminSidebar` (`w-56` desktop, slide-in drawer on mobile, `Escape` closes, body scroll locks while open).
- Main: full-width, `px-4 md:px-6 lg:px-8 py-6`, **no max-width container** — tables breathe across the viewport.
- Sidebar groups: `operations`, `catalog`, `people`. Section labels in `text-xs uppercase tracking-wide text-default-400`.
- Active nav item: `bg-primary/10 font-medium text-primary` — emerald tint, no left-border accent stripe.

### Containers & cards

- **≤ 2 levels of card nesting.** Three is forbidden — flatten with section dividers or list rows.
- A `Card` is for **distinct content domains** (one product, one order, one form). Never a decoration wrapper.
- Tables and lists never live inside `Card → Card`. Page is `Header → Section → Table`.
- Don't wrap everything in a container — most lists, headers, and forms read better on the page surface directly.
- Empty states are real components: small Lucide icon (`size-6`), one-line heading (`text-base font-semibold`), one-line help (`text-sm text-default-500`), one optional CTA. No blank panels.

### Information density

| Surface | Density | Typical row |
|---|---|---|
| Storefront catalog | Comfortable | `gap-6` between cards, `text-base` |
| Storefront product detail / cart / checkout | Comfortable | `space-y-6`, `text-base` |
| Admin dashboard | Medium | `space-y-6`, KPI grid `gap-px` over divider, `text-sm` |
| Admin tables | Dense | `py-2 px-4` cells (`sm`), `py-3 px-4` (default), `text-sm` rows, borderless |
| Forms | Medium | `gap-4` between fields, labels above inputs, helper below, error replaces helper inline |

**Pagination always visible** when results exceed the viewport. **No infinite scroll in admin.**

## Components

HeroUI v3 is the only library. Use components as-is; restyle via tokens and `className`. Don't reinvent affordances.

### Buttons (HeroUI variants)

- **`variant="primary"`** — primary action. Emerald background, `primary-foreground` text. One per visible region.
- **`variant="secondary"` / `variant="tertiary"`** — lower-emphasis actions inside dense product surfaces.
- **`variant="outline"`** — secondary action. Transparent bg, muted border + matching text.
- **`variant="ghost"`** — tertiary. Text-only with subtle hover tint.
- **`variant="danger"` / `variant="danger-soft"`** — destructive actions only. Never decoration.
- Sizes: `sm` (admin tables, secondary chrome), `md` (default), `lg` (storefront hero CTA only).
- Radius: HeroUI default — no `rounded-full`, no sharp corners, no mixed radii on the same page.
- HeroUI v3 `Button` **does not** accept `as` / polymorphism — use a styled `<Link>` (with HeroUI button classes) for link-shaped buttons.

### Inputs (HeroUI variants)

- **Underlined** — auth, checkout step 1, editorial forms. Bottom-border only, lighter feel.
- **Bordered** — admin forms, dense forms, anywhere boundaries help scanning. Default elsewhere.
- Labels **above** inputs always — never floating in dense admin contexts.
- Helper text below the input; error message replaces helper inline (don’t stack).
- Focus ring uses `--brand`. Never suppress focus visibility.
- All forms use **react-hook-form + Zod**. Never manage form state with `useState`. Validation runs on submit then on change after first error.

### Tables (admin)

- Borderless rows with hover tint (`hover:bg-content2`).
- Headers: `bg-content2`, `text-xs uppercase font-medium tracking-wide text-default-400`, left-aligned (logical `text-start`).
- Numeric columns: `text-end tabular-nums`.
- Cell padding: `py-2 px-4` (`sm` density), `py-3 px-4` (default).
- **Never** zebra-striped. **Never** bordered cells. **Never** sticky columns.
- Table wrapper: `overflow-hidden rounded-large border border-divider/60`.

### Product cards (storefront)

- Image area: `aspect-[4/5] bg-bone`, `object-cover`, `loading="lazy" decoding="async"`.
- Hover: `group-hover:scale-[1.02]` on image only, 200 ms ease-out — never on the whole card.
- Below image: category micro-label (`text-xs uppercase tracking-wide text-default-500`), product name (`text-base font-medium` line-clamped at 2), optional brand (`text-xs text-default-500`), colour-swatch row, price (`text-base font-semibold tabular-nums`).
- Out-of-stock: top-start badge (`bg-foreground/85 text-background uppercase`) — never strikethrough, never grey-out the whole card.
- Border: `border border-divider/60 rounded-large` — single hairline, no shadow in dark mode.
- Focus: `focus-visible:ring-2 focus-visible:ring-primary`.

### Badges

- `text-xs font-medium px-2 py-0.5 rounded-md`
- Status: low-alpha fills (`bg-success/15 text-success`, `bg-warning/15 text-warning`, `bg-danger/15 text-danger`)
- Category / neutral: `bg-content2 text-muted`
- Brand: `bg-brand-subtle text-brand`

### Navigation

- **Storefront header** — `sticky top-0 z-40 h-14`, single divider, `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60`. Brand at start, contact + account + cart + lang + theme at end (logical, RTL-mirrors automatically).
- **Admin sidebar** — `w-56`, list rows separated by `gap-0.5`, section labels in `text-xs uppercase`. Active item: `bg-primary/10 font-medium text-primary`. Lucide icons at `size={16}`.

### Variant pickers (size, colour)

- React Aria `radiogroup` — one selectable role at a time, arrow-key navigation.
- Out-of-stock sizes stay rendered, disabled, with line-through — buyer always sees the full size system.
- Colour swatches show the `ColorHex` value with a 1 px ring at `--border`; selected swatch gets a `--brand` ring at 2 px offset.

### Icons

**Lucide only.** No emoji in UI (`👨‍⚕️` etc. are immediate rejects). Default size `16` in admin, `20` in storefront chrome, `24` in empty-state hero positions.

Directional icons (`ArrowLeft`, `ChevronRight`, `Send`) **mirror in RTL**. Symbolic icons (`Search`, `User`, `Settings`, `Package`) **do not**.

### Loading & empty states

- **Skeleton states** for loading content (lists, grids, tables). Use `animate-pulse` on placeholder shapes that match the final layout — never a spinner in the middle of an empty card.
- **Spinner** (`<Spinner />` from HeroUI) only for inline action feedback (button pending, page-level bootstrap).
- **Empty states** teach the interface — what should be here, how to put something here. Never "Nothing here."
- **Error states** offer retry. `QueryErrorState` is the canonical pattern (`message + retryLabel + onRetry`).

## Motion

**Restraint over choreography.** Animation conveys state — never decoration.

| Trigger | Duration | Easing |
|---|---|---|
| Hover / focus / press | 100 ms | `ease-out` |
| Modal / drawer entry | 200 ms | `ease-out` (in), `ease-in` (out) |
| Sidebar slide | 200 ms | `ease-out` |
| Product image hover scale | 200 ms | `ease-out` |
| Page transitions | **none** by default — fade only if needed, 150 ms max |

**Bans:**
- No bounce, spring, or elastic easing — ever.
- No autoplay carousels, looping animations, parallax, or scroll-jacking.
- No page-load animations. Content appears.
- No animating CSS layout properties (width, height, top, left). Transform and opacity only.
- All motion respects `prefers-reduced-motion: reduce` (globally enforced in `globals.css`); component-level work uses `motion-reduce:transition-none`.

## Imagery

Imagery is the single biggest lever for "premium" vs "generic."

**Product photography:**
- **Hero:** studio-lit, dark seamless backdrop (matches dark mode), single product or small group, dramatic side-lighting.
- **Catalog tiles:** lighter neutral backdrop (`--bone` warm off-white), product centred, even lighting, no models.
- **Detail pages:** 4–6 image gallery — alternating studio + on-body. On-body shots are **clinical environments** (hospital corridors, ORs, clinics) — not lifestyle / fashion-shoot.

**Forbidden:**
- Clip-art medical icons in hero positions.
- Stock "diverse smiling team" photography.
- Gradient blob backgrounds, AI-generated abstract patterns.
- Lifestyle / wellness imagery.

**Encouraged:**
- Real product photos with generous empty space.
- Close-up fabric detail shots.
- Occasional editorial flat-lays.

## RTL & i18n

- **Logical CSS only.** Never `left`, `right`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right` in new code. Use `start`/`end` equivalents: `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`.
- For RTL-specific translate fallbacks (drawers, slide-ins) use Tailwind's `rtl:` variant — `-translate-x-full rtl:translate-x-full`.
- Every screen verified in all four matrix states before merge.
- `npm run i18n:check` enforces key parity between `locales/ar/*.json` and `locales/en/*.json` — CI fails on missing keys.
- Direction and theme are independent — managed at `<html>` (next-themes owns `class`; `DirectionSync` owns `lang` + `dir`).

## Anti-patterns (hard reject)

These fail PR review immediately:

- Generic SaaS hero: gradient blob + tagline + two CTAs + three feature cards.
- More than 2 levels of card nesting.
- Drop shadows as primary elevation in dark mode.
- Glassmorphism panels (`backdrop-blur` on translucent surfaces with borders) outside the single permitted storefront header.
- Glows, neon outlines, color-shift gradients, gradient text (`background-clip: text`).
- More than 1 accent hue per page (e.g. emerald CTAs + blue links — pick one).
- More than 3 font weights per page.
- Mixed border radii on the same page (`rounded-md` cards beside `rounded-2xl` buttons).
- Side-stripe borders (`border-l-4` accent on cards / callouts).
- Decorative `<hr>` between every section — use spacing.
- Arabic text in left-aligned containers.
- "AI assistant" feel: floating orbs, particles, twinkling stars.
- Disabled-looking buttons that are actually enabled.
- Stock emoji icons — Lucide only.
- Infinite scroll in admin — pagination only.
- Tooltips replacing labels on primary actions.
- Hero-metric template: big number, gradient accent, three supporting stats.
- Em dashes (`—`) in UI copy. Commas, colons, semicolons, periods, parentheses.

## Pre-merge checklist

Before any UI PR ships:

- [ ] Renders correctly in **all 4 states**: `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)`.
- [ ] No physical-direction CSS (`left / right / ml-* / mr-* / pl-* / pr-* / text-left / text-right`) in new code.
- [ ] No arbitrary `[Npx]` Tailwind values without justification.
- [ ] ≤ 2 levels of card nesting.
- [ ] ≤ 3 distinct font weights on the page.
- [ ] One accent hue.
- [ ] All numeric columns use `tabular-nums`; prices use `formatCurrency`.
- [ ] `prefers-reduced-motion` respected; no bounce / elastic easing.
- [ ] Lucide icons only; no emoji.
- [ ] HeroUI components (no raw `<button>`, `<input>`, `<select>`, `<dialog>` when a HeroUI peer exists).
- [ ] Empty, loading, and error states implemented.
- [ ] Focus ring visible on every interactive element.
- [ ] `npm run i18n:check` passes; no missing translation keys; no missing `alt` text.
