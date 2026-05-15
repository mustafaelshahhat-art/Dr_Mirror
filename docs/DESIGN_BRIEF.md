# Dr_Mirror — DESIGN_BRIEF

> **Purpose.** Paste this at the top of every [claude.ai/design](https://claude.ai/design) conversation when generating UI for Dr_Mirror. It gives the design tool everything it needs to produce on-brand, on-system, in-spec mockups — no other context required.
>
> **Status.** Working document. Extends `DESIGN_PRINCIPLES.md` — does not replace it. Where they conflict, this brief wins for the redesign work; otherwise `DESIGN_PRINCIPLES.md` stands.

---

## 1. Product Context

**Dr_Mirror** is a premium e-commerce storefront for **medical scrubs and uniforms** — scrub tops, scrub pants, lab coats, surgical headwear, medical footwear. The audience is **healthcare professionals in Arabic-speaking markets** (Egypt primary, EGP only). Bilingual: Arabic (primary, RTL) and English (secondary, LTR).

Think **FIGS** (US-based premium scrubs) for product positioning, **Aesop** for typographic restraint, **Linear** for UI rigor, **Hermès online** for editorial product photography. Confident, clinical-clean, editorial — **not** corporate SaaS, **not** fashion-fluffy, **not** generic "shopify minimal."

The site has 18 pages across:
- **Customer storefront:** Catalog, Product Detail, Cart, Checkout (3 steps), Account dashboard, Orders list, Order detail, Address book
- **Auth:** Login, Register
- **Admin panel:** Dashboard, Orders queue, Order detail, Products list, Product create/edit, Categories, Payment methods, Inquiries, Users

---

## 2. Non-Negotiable Constraints

These come from the project constitution. Designs that violate them are unusable.

| Constraint | Rule |
|---|---|
| **Locales** | Arabic-first (RTL), English secondary (LTR). Every screen MUST render correctly in all 4 states: `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)`. |
| **Logical CSS only** | Use `ms-*` / `me-*` / `ps-*` / `pe-*` / `text-start` / `text-end`. Never `left`, `right`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right`. |
| **Directional icons** | Mirror in RTL (arrows, chevrons, back/send). Symbolic icons do not mirror (search, user, gear, cart). |
| **Numerics** | Western digits everywhere (`numberingSystem: 'latn'`). `tabular-nums` on prices, tables, counters, dashboards. |
| **Theme** | Dark-first (canonical), light mode shipped. Elevation by **lightness, not shadow** in dark. |
| **Stack** | Tailwind CSS 4 + HeroUI v3 + React 19. Lucide-react icons only. No glassmorphism, glows, neon, parallax, autoplay, scroll-jacking. |
| **Typography** | Satoshi (Latin) + Alexandria (Arabic), both self-hosted variable WOFF2, already loaded. Max **3 distinct font weights per page**. |
| **Spacing** | Tailwind 4px grid only. Component internals: multiples of 4px. Layout gaps: multiples of 8px. Section gaps: multiples of 16px. Page gutters: `px-4` / `md:px-6` / `lg:px-8`. |
| **Cards** | ≤ 2 levels of nesting. ≤ 1 accent hue per page. Tables/lists never inside Card-inside-Card. |
| **Motion** | All transitions ≤ 200ms. `ease-out` enter, `ease-in` exit. Never bounce/elastic/spring. Respect `prefers-reduced-motion`. Pages do not animate on load. |

---

## 3. Visual Direction — Bold & Premium

The current codebase uses a neutral grayscale with HeroUI's near-white "primary" as accent. The redesign injects brand personality through:

**Tone:** confident, editorial, clinical-clean. Generous whitespace. Strong product photography. Type-driven hierarchy rather than decorative chrome. Color used surgically — one accent, deployed sparingly, with intent.

**Anti-references:** Stock SaaS hero sections (gradient blob + tagline + 2 CTAs + 3 feature cards). "AI assistant" floating orbs. Pastel-pink wellness fashion. Bargain-bin scrubs e-commerce. Healthcare-blue clip-art.

**Pro-references:**
- [FIGS](https://wearfigs.com) — confident product photography, bold sans typography, color blocks, clinical-but-premium
- [Aesop](https://aesop.com) — typographic restraint, editorial layouts, off-white surfaces
- [Linear](https://linear.app) — disciplined spacing, dense without crowding, single accent
- [Vercel Dashboard](https://vercel.com) — confident dark mode, clean tables, generous whitespace
- [Hermès](https://hermes.com) — editorial product detail pages, hero imagery

---

## 4. Color System

All colors in **OKLCH** (perceptual uniformity for light/dark parity).

### Dark mode (canonical)

| Token | Value | Use |
|---|---|---|
| `--brand` | `oklch(0.65 0.13 165)` | **Primary accent — deep emerald.** Buttons, links, focus rings, key product highlights. ONE per page. |
| `--brand-hover` | `oklch(0.70 0.13 165)` | Hover state for brand-colored surfaces |
| `--brand-active` | `oklch(0.60 0.13 165)` | Pressed/active state |
| `--brand-subtle` | `oklch(0.30 0.05 165)` | Brand-tinted backgrounds (badges, callouts) |
| `--background` | `oklch(0.12 0 0)` | Page background |
| `--surface` | `oklch(0.16 0 0)` | Cards, primary surfaces (~4% lighter than bg) |
| `--surface-2` | `oklch(0.20 0 0)` | Elevated surfaces (popovers, inputs) |
| `--surface-3` | `oklch(0.24 0 0)` | Highest elevation (modals over cards) |
| `--foreground` | `oklch(0.99 0 0)` | Primary text |
| `--muted` | `oklch(0.70 0 0)` | Secondary text, captions |
| `--border` | `oklch(1 0 0 / 0.08)` | Translucent white — never solid |
| `--bone` | `oklch(0.92 0.01 90)` | Warm off-white for product surfaces (counterpoint to cool emerald) |

### Light mode

| Token | Value | Use |
|---|---|---|
| `--brand` | `oklch(0.50 0.14 165)` | Slightly darker emerald for AA contrast on light surfaces |
| `--background` | `oklch(0.99 0 0)` | Page background — warm off-white |
| `--surface` | `oklch(1 0 0)` | Cards |
| `--foreground` | `oklch(0.18 0 0)` | Primary text |
| `--muted` | `oklch(0.45 0 0)` | Secondary text |
| `--border` | `oklch(0 0 0 / 0.08)` | Translucent black |

### Status (unchanged from current tokens)

- `--danger`: red, `--success`: green, `--warning`: amber. Status colors are **never** decorative.

**Rule:** one accent hue per page. The emerald is the only color that travels. Bone/ivory is a surface, not an accent.

---

## 5. Typography Scale

Stays within HeroUI's Tailwind defaults — DESIGN_PRINCIPLES bans a custom scale. The brief tightens *usage*, not the scale itself.

| Role | Class | Use |
|---|---|---|
| **Display** | `text-3xl md:text-4xl lg:text-5xl` / `font-bold` / `tracking-tight` | Storefront hero only. **One per page.** Editorial impact. |
| **H1** | `text-2xl` / `font-semibold` / `tracking-tight` | Page title. One per page. |
| **H2** | `text-lg` / `font-semibold` | Section heading. Sparingly. |
| **H3** | `text-base` / `font-medium` | Sub-section. |
| **Body (storefront)** | `text-base` / `font-normal` / `leading-relaxed` | Marketing prose, product descriptions. |
| **Body (admin)** | `text-sm` / `font-normal` | Dashboards, tables. |
| **Label / micro** | `text-xs` / `font-medium` / `uppercase` / `tracking-wide` | Form labels, table headers, badges. |

**Weights:** restrict to `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700). Cap at **3 weights per page** (typical mix: 400 / 500 / 700 OR 400 / 600 / 700).

**Numbers:** always `tabular-nums` on prices, totals, table cells.

**Letter-spacing:** `tracking-tight` on display + H1 only; default elsewhere; `tracking-wide` on uppercase micro labels.

---

## 6. Component Grammar

### Buttons (HeroUI variants)
- **Solid (`color="primary"`):** primary action. Emerald background, dark text. One per visible region.
- **Bordered/ghost:** secondary action. Transparent bg, emerald border + text, or muted border + foreground text.
- **Light/link:** tertiary. Text-only, underline on hover.
- Sizes: `sm` (admin tables), `md` (default), `lg` (CTA hero only).
- Radius: HeroUI default (no rounded-full, no sharp corners).

### Cards
- **Hero / product:** `rounded-2xl` (HeroUI default), 1 level of nesting max.
- **Standard:** `rounded-xl` or HeroUI default.
- Dark mode: elevation by lightness — `bg-surface` over `bg-background`; no `shadow-*` unless light mode.
- Light mode: subtle shadow allowed (`shadow-sm` max).
- Internal padding: `p-6` desktop, `p-4` mobile minimum.

### Inputs (HeroUI variants)
- **Hero forms (auth, checkout step 1):** `variant="underlined"` — bottom-border only, more editorial.
- **Admin forms / dense forms:** `variant="bordered"` — clear field boundaries for scanning.
- Labels above inputs always (never floating in dense admin contexts).
- Helper text below, error replaces helper inline.
- Focus ring uses `--brand` color.

### Tables (admin)
- Borderless rows with hover-tint (`hover:bg-surface-2`).
- Cell padding: `py-2 px-4` for `sm` density; `py-3 px-4` for default.
- Headers: `text-xs uppercase font-medium text-muted tracking-wide`.
- Numeric columns: `text-end tabular-nums` (in LTR; logical equivalents work for RTL automatically).
- Never zebra-striped. Never bordered cells. Pagination always visible.

### Product Card (storefront)
- Image area: 4:5 aspect ratio, `bg-bone` (warm off-white surface) in dark, `bg-surface-2` (cool grey) in light.
- Hover: subtle scale (`scale-[1.02]` on image only, 200ms ease-out).
- Below image: product name (`text-base font-medium`), color swatches row, price (`text-base font-semibold tabular-nums`).
- Out-of-stock: subtle overlay + badge top-end, not a strikethrough.
- No card border. Whitespace separates products.

### Navigation
- **Storefront header:** sticky, ~56px tall, transparent bg with backdrop-blur OR solid `bg-surface` (choose one — no glassmorphism). Logo at start, primary nav center, cart + locale + theme + account at end.
- **Admin sidebar:** 240px wide, list rows with dividers (NOT stacked cards), section labels in `text-xs uppercase text-muted`. Active item: emerald left-border (`ms-` border, RTL-aware) + slight `bg-surface-2` tint.

### Badges (status, category, etc.)
- `text-xs font-medium px-2 py-0.5 rounded-md`
- Status badges: status color at low alpha (`bg-success/15 text-success` etc.)
- Category/neutral badges: `bg-surface-2 text-muted`
- Brand badges: `bg-brand-subtle text-brand`

---

## 7. Motion

- Hover/focus/press: 100ms ease-out.
- Modal/drawer entry: 200ms ease-out.
- Page transitions: **none** by default. If used, 150ms fade only — never slide or scale.
- No autoplay carousels. Hero imagery is static or user-controlled.
- No looping animations. Loaders use HeroUI's `Spinner`.
- Always wrap motion in `@media (prefers-reduced-motion: no-preference)` or use Tailwind's `motion-safe:` prefix.

---

## 8. Imagery Direction

Imagery is the single biggest lever for "premium" vs "generic." Mockups should reflect:

**Product photography:**
- Hero: studio-lit, dark seamless backdrop (matches dark mode), single product or small group, dramatic side-lighting.
- Grid tiles: lighter neutral backdrop (`--bone` warm off-white), product centered, even lighting, no models.
- Detail page: 4–6 image gallery — alternating studio + on-body. On-body shots are clinical-environment (hospital corridors, operating rooms, clinics), NOT lifestyle/fashion-shoot.

**No:** clip-art, stock medical icons in hero, "diverse people smiling at camera" stock photos, gradient blob backgrounds, AI-generated abstract patterns.

**Yes:** real product photos with empty space around them, occasional editorial flat-lays, close-up fabric detail shots.

---

## 9. Anti-Patterns (Hard NO)

These are immediate rejections:

- Generic SaaS hero: gradient blob + tagline + two CTAs + three feature cards
- More than 2 levels of card nesting
- Drop shadows as primary elevation in dark mode
- Glassmorphism panels (`backdrop-blur` on translucent surfaces with borders)
- Glows, neon outlines, color-shift gradients
- More than 1 accent hue per page (e.g., emerald CTAs + blue links — pick one)
- More than 3 font weights per page
- Mixing border radii (`rounded-md` cards beside `rounded-2xl` buttons)
- Decorative `<hr>` rules between every section — use spacing
- Arabic text in left-aligned containers
- "AI assistant" feel: floating orbs, twinkling stars, particle effects
- Disabled-looking buttons that are actually enabled
- Stock emoji icons (👨‍⚕️ etc.) — Lucide only
- Infinite scroll in admin (pagination only)
- Tooltips replacing labels on primary actions

---

## 10. What to Generate

For each screen, claude.ai/design should produce:

1. **An HTML/JSX artifact** using Tailwind 4 + HeroUI v3 component names (`<Button color="primary">`, `<Card>`, `<Input variant="underlined">`, etc.) — not a raw image.
2. **Dark variant first** (canonical), then light variant.
3. **One AR mockup** for at least the catalog and product detail pages, to verify the design language survives RTL (mirror layouts, swap `text-start`/`text-end` correctly).
4. **Realistic content:** use plausible Arabic + English product names (e.g., "Surgical scrub top — slate / سكراب جراحي — رصاصي"), prices in EGP (e.g., "1,250 ج.م"), real-sounding admin data.
5. **All four breakpoints in mind:** mobile (375px), tablet (768px), desktop (1280px), wide (1536px). Use Tailwind responsive prefixes.

**Don't:**
- Don't redesign HeroUI components from scratch — use them as-is, restyle with className/theme tokens.
- Don't invent new icons — only Lucide-react.
- Don't use placeholder lorem ipsum — use realistic medical-apparel content.
- Don't introduce new dependencies (no Framer Motion, no Radix, no custom design system).

---

## 11. Prompt Template for Each Screen

When starting a new claude.ai/design conversation, paste this brief, then add a screen-specific block in this format:

```
# Screen: <name> (route: <path>)
## Audience: <customer | admin | public>
## Purpose: <one sentence>
## Key UI elements:
  - <element 1>
  - <element 2>
  ...
## States to render:
  - dark + LTR (English content)
  - dark + RTL (Arabic content)  [if flagship]
  - light + LTR
## RTL notes: <any specific mirroring concerns>
## Reference: <competitor or pro-reference URL>
```

Per-screen specs live in `DESIGN_SCREEN_SPECS.md` (to be written next).
