# Dr_Mirror — Design System

## Color Palette

Brand hue: **273.85** (violet-purple). All OKLCH. Dark-first.

### Semantic Roles
| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--background` | `oklch(97.02% 0.01 273.85)` | `oklch(12% 0.01 273.85)` | Page canvas |
| `--surface` | `oklch(100% 0.005 273.85)` | `oklch(21.03% 0.02 273.85)` | Cards, panels |
| `--surface-secondary` | `oklch(95.24% 0.008 273.85)` | `oklch(25.7% 0.015 273.85)` | Nested panels |
| `--foreground` | `oklch(21.03% 0.01 273.85)` | `oklch(99.11% 0.01 273.85)` | Primary text |
| `--muted` | `oklch(55.17% 0.02 273.85)` | `oklch(70.5% 0.02 273.85)` | Secondary text |
| `--brand` | `oklch(57.74% 0.2091 273.85)` | `oklch(57.74% 0.2091 273.85)` | Primary accent (violet) |
| `--separator` | `oklch(92% 0.01 273.85)` | `oklch(25% 0.01 273.85)` | Dividers |
| `--border` | `oklch(90% 0.01 273.85)` | `oklch(28% 0.01 273.85)` | Component borders |
| `--success` | `oklch(73.29% 0.1974 153.21)` | same | Success states |
| `--danger` | `oklch(65.32% 0.2375 28.14)` | `oklch(59.4% 0.2006 27.03)` | Error/danger |
| `--warning` | `oklch(78.19% 0.1617 74.73)` | `oklch(82.03% 0.1416 78.74)` | Warning states |

### Color Strategy
**Restrained** — tinted neutrals + violet accent ≤10%. The storefront is product-forward; photography is the hero. UI gets out of the way.

---

## Typography

Fonts: **Satoshi** (Latin/English) · **Alexandria** (Arabic). Both self-hosted.

### Scale
| Step | Class | Use |
|------|-------|-----|
| Display | `text-4xl font-bold tracking-tight` | Hero headlines (md+) |
| H1 | `text-2xl font-semibold tracking-tight` sm: `text-3xl` | Page titles |
| H2 | `text-lg font-semibold tracking-tight` | Section headings |
| H3 | `text-sm font-semibold` | Sub-section headings, card titles |
| Body | `text-sm leading-relaxed` | Default body |
| Caption | `text-xs text-muted` | Metadata, labels, timestamps |
| Overline | `text-xs font-medium uppercase tracking-wide text-muted` | Category labels, section kickers |
| Mono/Num | `tabular-nums font-medium` | Prices, counts, order numbers |

### RTL/Arabic
- `html[lang='ar'] body { font-family: var(--font-ar) }` (Alexandria primary)
- All spacing uses logical CSS: `ms-*`, `me-*`, `ps-*`, `pe-*`
- Icon mirroring: `.rtl:rotate-180` on directional chevrons/arrows

---

## Spacing & Layout

### Page Shell
```
Layout: flex-col min-h-svh
Main: max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10
Footer: border-t py-6
```

### Content Rhythm
- Section vertical gap: `space-y-6` (tight) · `space-y-8` (default) · `space-y-10` (spacious)
- Card padding: `p-4` (compact) · `p-6` (default) · `p-8` (generous)
- Grid gap: `gap-4` (dense) · `gap-6` (default) · `gap-8` (spacious)

### Breakpoints (Tailwind v4 defaults)
| Alias | Width | Surface |
|-------|-------|---------|
| `sm` | 640px | Large phone landscape / small tablet |
| `md` | 768px | Tablet — sidebar appears, 2-col grids unlock |
| `lg` | 1024px | Laptop — 3-col grids, sticky sidebar |
| `xl` | 1280px | Desktop — 4-col catalog grid |

---

## Elevation & Borders

**Surface hierarchy** (from ground up):
1. `bg-background` — page canvas (always bottommost)
2. `bg-surface` / `bg-content1` — primary cards/panels (`border border-divider/60`)
3. `bg-surface-secondary` / `bg-content2` — nested panels (`border border-divider/40`)
4. `bg-overlay` — overlays, drawers, modals

Border radius: `--radius: 0.25rem` (tokens) · Components use `rounded-medium` (0.5rem) or `rounded-large` (0.75rem).

Shadow use: minimal. `shadow-sm` on floating cards (summary panel, cart). `shadow-medium` on hover only in light mode.

---

## Components

### Page Header
Pattern: `<header class="space-y-1">` with `<h1>` + `<p class="text-sm text-muted">`.

### KPI / Stat
```html
<div class="stat-card">
  <dt class="stat-label">Label</dt>
  <dd class="stat-value">42</dd>
</div>
```

### Empty State
Icon (size-10 text-muted) + heading (text-base font-medium) + body (text-sm text-muted) + optional CTA.

### Table (admin)
`rounded-large border border-divider/60` wrapper. Column headers: `text-xs font-medium uppercase tracking-wide text-default-400`. Rows: `hover:bg-content2 transition-colors`.

### Navigation (admin sidebar)
Item: `flex items-center gap-2 rounded-medium px-3 py-2 text-sm`.
Active: `bg-primary/10 font-medium text-primary`.
Inactive: `text-default-600 hover:bg-default-100`.

---

## Motion

- Transitions: 160ms ease-out (colors/opacity), 200ms ease-out (transform)
- Entry animations: `.enter-fade-up` (opacity 0→1 + translateY 0.5rem→0)
- Hover scale: `group-hover:scale-[1.02]` on product images only
- Reduced motion: all animations cut to 0.01ms via `prefers-reduced-motion`
- No bounce, no elastic, no spring — ease-out only

---

## Responsive Patterns

### Catalog grid
```
grid-cols-1          (< sm, 320–639px, 1 column)
sm:grid-cols-2       (640–767px, 2 columns)
md:grid-cols-3       (768–1279px, 3 columns)
xl:grid-cols-4       (≥ 1280px, 4 columns)
```

### Two-column page layouts (cart, order detail, checkout)
```
flex-col             (< lg, stacked)
lg:grid lg:grid-cols-[1fr_320px]  (≥ 1024px, main + sidebar)
```

### Admin sidebar
```
hidden md:flex       (< md, drawer only via hamburger)
w-60 md:flex         (≥ 768px, persistent 240px sidebar)
```

---

## Icons

Lucide only. Sizes: `size-3` (micro) · `size-4` (inline) · `size-5` (button) · `size-6` (nav) · `size-10` (empty state). All `aria-hidden` unless they carry meaning.

---

## Accessibility

- Skip links: `sr-only focus:not-sr-only` on both Layout and AdminLayout
- Focus ring: HeroUI default (`focus:ring-2 focus:ring-primary`) 
- `isRequired` on all mandatory form fields
- `aria-busy` on loading regions
- `tabIndex={-1}` on main landmark for programmatic focus
- Keyboard navigation: `role="radiogroup"` + arrow key handlers on filter pills
