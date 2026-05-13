# Dr_Mirror — DESIGN_PRINCIPLES

> Read this **before** writing or modifying any UI.
> Short, strict, scannable. Principle beats novelty.

## 0. Quality Bar

Match the *discipline* of: **Linear, Vercel Dashboard, Stripe (Dashboard + Checkout), Notion.**
We borrow their rigor, **not** their layouts. Dr_Mirror has its own identity: **Arabic-first, dark-first, medical-technical, restrained.**

## 1. Principles we steal from the giants

- **Linear:** strict spacing rhythm, restrained palette, keyboardable density, minimal chrome.
- **Vercel Dashboard:** confident dark mode, generous whitespace, clean tables, a single accent color.
- **Stripe:** information clarity, ironclad typography hierarchy, money always tabular.
- **Notion:** content-first surfaces, soft hierarchy, zero decorative noise.

## 2. Spacing rhythm

- Spacing scale is **Tailwind's default 4 px grid**. **Never** use arbitrary `[Npx]` values without justification.
- Component internals: multiples of **4 px** (`space-1`, `space-2`, `space-3`...).
- Layout gaps: multiples of **8 px** (`gap-2`, `gap-4`, `gap-6`).
- Section gaps: multiples of **16 px** (`gap-4`, `gap-8`, `gap-12`).
- Page gutters: `px-4` mobile, `px-6` tablet, `px-8` desktop. No more.
- Containers breathe: minimum `p-6` on desktop card/section internals.
- Adjacent surfaces always have a gap. If they touch, they are one surface.

## 3. Typography hierarchy

Uses Satoshi (en) / Alexandria (ar) per `PROJECT_MAP.md`. **No custom type scale** — HeroUI defaults plus these rules:

- **Display:** `text-3xl` / `font-bold` / `tracking-tight`. **Max one per page.**
- **H1 (page title):** `text-2xl` / `font-semibold`. **One per page.**
- **H2 (section):** `text-lg` / `font-semibold`. Sparingly.
- **H3 (sub-section):** `text-base` / `font-medium`.
- **Body:** `text-sm` (14 px) on dashboards / admin; `text-base` (16 px) on storefront prose.
- **Label / micro-UI:** `text-xs` / `font-medium`. Table headers and form labels only.
- **Numbers in prices, tables, counters:** always `tabular-nums`.
- Headings `leading-tight`; body `leading-relaxed`.
- **Max 3 distinct font weights per page** (typically 400 / 500 / 700).

## 4. RTL rules

- **Never** use `left`, `right`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right` in new code. Use logical equivalents: `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`.
- Directional icons (arrows, chevrons, breadcrumbs, send/back) **mirror** in RTL. Symbolic icons (search, settings, user, gear) **do not**.
- Numbers, code, English brand names stay LTR even inside Arabic prose — wrap with `<span dir="ltr">` when isolated.
- Every screen verified at both `dir="rtl"` and `dir="ltr"` before merge.

## 5. Dark mode (default) and light mode

- **Dark is canonical.** Design first in dark, verify in light. Both ship in V1.
- **Elevation by lightness, not shadow.** Base → card → popover; each step ~4% lighter in dark, ~2% darker in light. Shadows are *weak* in dark mode.
- Borders in dark mode: between `border-white/8` and `border-white/12`. Never solid white/black.
- Contrast: body ≥ AA 4.5:1 against surface; secondary text ≥ 3:1.
- **No glows. No neon. No full-page gradient backgrounds.** One subtle gradient allowed per page, only on a hero / empty-state.
- **One accent color hue per page.** HeroUI's `primary`. Success / warning / danger are status only, never decoration.

## 6. Layout & card philosophy

- **Maximum two levels of card nesting.** Three is forbidden — flatten with section dividers or list rows.
- A `Card` is for **distinct content domains** (one product, one order, one form). Not a decoration wrapper.
- Tables and lists do not live inside cards inside cards. A page is `Header → Section → Table`, never `Header → Card → Card → Table`.
- Sidebars and headers use list rows with dividers, not stacked cards.
- Empty states are real components: 24 px icon, one line of heading, one line of help, one optional CTA. No blank panels.
- Sticky elements: page header may be; nothing else without a specific reason.

## 7. Motion constraints

- Default duration **≤ 150 ms**. Hover/focus/press: 100 ms. Modal/drawer entry: 200 ms (HeroUI defaults).
- Easing: `ease-out` enter, `ease-in` exit. **Never bounce, elastic, or spring.**
- **No autoplay animations.** No looping loaders longer than necessary. No parallax. No scroll-jacking.
- Always honor `prefers-reduced-motion`.
- **Pages do not animate on load.** Content appears.

## 8. Information density

- **Storefront:** comfortable. `text-base`, `gap-6` between product cards, single accent.
- **Dashboards & admin tables:** dense. `text-sm` rows, `py-2` cells, tabular numerics, borders not stripes.
- **Forms:** medium. `gap-4` between fields, labels above inputs, helper text below, error replaces helper inline.
- **Pagination always visible** when results exceed viewport. **No infinite scroll in admin.**

## 9. Anti-patterns (hard NO)

- Generic SaaS hero: gradient blob + tagline + two CTAs + three feature cards. **No.**
- Three or more nested cards.
- Drop shadows as the primary elevation mechanism in dark mode.
- Glows, neon outlines, color-shift gradients, glassmorphism panels.
- Stock emoji icons inside UI (Lucide only).
- More than 3 font weights per page.
- More than one accent hue per page.
- Mixing border radii (e.g., `rounded-md` cards next to `rounded-2xl` buttons). Pick HeroUI defaults and stay there.
- Decorative `<hr>` between every section. Use spacing.
- Arabic text in left-aligned containers, or hard-coded `left/right` properties.
- "AI assistant" hero feel: floating orbs, twinkling stars, glassmorphism.
- Disabled-looking buttons that are actually enabled (low default-state contrast).
- Tooltips replacing labels on primary actions. Tooltips supplement, never replace.

## 10. Pre-merge UI checklist

Before any UI PR is accepted:

- [ ] Renders correctly in **all 4 states**: `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)`.
- [ ] No `left / right / ml-* / mr-* / pl-* / pr-* / text-left / text-right` in new code.
- [ ] No arbitrary `[Npx]` Tailwind values without justification.
- [ ] ≤ 2 levels of card nesting.
- [ ] ≤ 3 distinct font weights on the page.
- [ ] All numeric columns use `tabular-nums`.
- [ ] `prefers-reduced-motion` respected.
- [ ] Lucide icons only; no emoji.
- [ ] No console errors; no missing translation keys; no missing `alt` text.

---

**When in doubt, remove rather than add.** A blank surface, well-spaced, is more *Impeccable* than a busy one.
