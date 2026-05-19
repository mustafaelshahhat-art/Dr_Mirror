# Dr_Mirror — Customer Storefront Design Specification

> Complete design reference for every customer-facing page, layout, component,
> state, and interaction. Covers both Arabic (RTL) and English (LTR) surfaces.
> Accent: **purple-violet** (`oklch(57.74% 0.2091 273.85)`). Mode: dark-first.

---

## 1. Design System

### 1.1 Brand Identity

- **Name:** دكتور ميرور / Dr. Mirror
- **Brand mark:** Rounded square with `+` (Plus icon) in solid brand purple — used in header, footer, and auth shell.
- **Tagline:** المواد الطبية للمهنيين — "Premium medical apparel for healthcare professionals."
- **Register:** Confident · Clinical · Calm. No gradients, no glows, no heavy decoration.
- **Accent:** Single hue — purple-violet only. Never introduce a second accent.

### 1.2 Color Tokens

| Role | Light | Dark |
|---|---|---|
| Background | `oklch(97.02% 0.01 273.85)` — near-white with violet tint | `oklch(12% 0.01 273.85)` — near-black |
| Surface (card face) | `oklch(100% 0.005 273.85)` | `oklch(21.03% 0.02 273.85)` |
| Surface-secondary (hover) | `oklch(95.24% 0.008 273.85)` | `oklch(25.7% 0.015 273.85)` |
| Brand accent | `oklch(57.74% 0.2091 273.85)` — purple-violet | Same |
| Brand hover | `oklch(62.74% 0.2091 273.85)` | Same |
| Muted text | `oklch(55.17% 0.02 273.85)` | `oklch(70.5% 0.02 273.85)` |
| Separator | `oklch(92% 0.01 273.85)` | `oklch(25% 0.01 273.85)` |
| Danger | `oklch(65.32% 0.2375 28.14)` — red | |
| Success | `oklch(73.29% 0.1974 153.21)` — green | |
| Warning | `oklch(78.19% 0.1617 74.73)` — amber | |

### 1.3 Typography

| Font | Script | Use |
|---|---|---|
| Satoshi | Latin | Primary for English UI (weights 400 / 500 / 600 / 700) |
| Alexandria | Arabic | Primary for Arabic UI (same weight range) |

- **Scale:** Default HeroUI scale — no custom type sizes except `text-[1.375rem]` for auth card titles.
- **Numbers:** Always `tabular-nums` for prices, counts, dates.
- **Direction:** `dir="rtl"` with logical CSS (`ms-*`, `me-*`, `ps-*`, `pe-*`). Phone numbers always `dir="ltr"`.

### 1.4 Spacing & Layout

- **Content max-width:** 1280px (`max-w-7xl`)
- **Page gutter:** `px-4` (mobile) · `px-6` (md) · `px-8` (lg)
- **Vertical page padding:** `py-8` (mobile) · `py-10` (md)
- **Section gaps:** `space-y-8` between major sections on a page
- **Card inner padding:** `p-4` standard · `p-6` profile/info panels · `p-10` empty states
- **Grid gutter:** `gap-4` for product grids · `gap-3` for form grids · `gap-6` for two-column layouts

### 1.5 Border Radius

| Token | Value | Use |
|---|---|---|
| `rounded-medium` | `0.375rem` | Buttons, chips, badges, form inputs, small cards, avatar |
| `rounded-large` | `0.75rem` | Cards, content surfaces, modals, drawers |
| `rounded-2xl` | `1rem` | EmptyState icon container |
| `rounded-full` | 999px | Color swatches, category pills, count badges |

### 1.6 Shadows

Minimal. Only `shadow-medium` on product card hover (desktop), `shadow-md` on auth card, and `shadow-sm` on the cart summary card. No shadows in dark mode.

### 1.7 Motion

- Enter animations: `enter-fade`, `enter-fade-up`, `enter-fade-down` (CSS `@starting-style` — 160ms ease-out).
- `prefers-reduced-motion`: all animations disabled globally.
- Hover transforms: `scale-[1.03]` on product card images (`motion-safe` only).
- Button/link hover: opacity-based (0.75–0.8) or background tint.

### 1.8 CSS Utility Classes (from `globals.css`)

| Class | Description |
|---|---|
| `.content-surface` | `rounded-large border border-separator/60 bg-surface` — the standard card panel |
| `.page-header` / `.page-title` / `.page-subtitle` | Consistent h1 + subtitle rhythm |
| `.hero-band` / `.hero-band--tinted` | Full-bleed section with brand wash |
| `.back-link` | Small muted ← navigation link |
| `.stat-card` / `.stat-label` / `.stat-value` | KPI display card |
| `.enter-fade-up` / `.enter-fade-down` / `.enter-fade` | CSS entrance animations |

---

## 2. Global Shell

### 2.1 Header (`/shared/components/Header.tsx`)

**Sticky** · z-index 40 · Height 64px · `bg-background/85 backdrop-blur`

```
┌─ Brand mark [+] Dr. Mirror ─────────── Catalog · Contact | Account · Sign Out · [🛒] [AR/EN] [☀/🌙] ─┐
```

**Brand mark:** 28×28px rounded square, solid brand-purple bg, white `Plus` icon (16px).

**Desktop nav (≥ sm):**
- "Browse Catalog" link → `/`
- "Contact" link → `/inquiries`
- Vertical separator
- If authenticated: User's full name (UserIcon + truncated name, max 112px) + "Sign Out" ghost button
- If unauthenticated: "Sign In" primary button → `/login`
- CartButton (badge with count) + LangSwitcher + ThemeToggle

**Mobile (< sm):** Brand + CartButton + Hamburger (Menu icon) only.

**Mobile Drawer (leading edge — right in RTL, left in LTR):**
- Header: brand mark + close trigger
- Nav links: Catalog · Contact · [Account / My Orders if authenticated] · [Sign In if not]
- Separator
- Cart shortcut with item count badge
- Separator
- Language switch row + Theme switch row
- Footer (if authenticated): full-width Sign Out ghost button with LogOut icon

**Cart mini-drawer (trailing edge — right in LTR, left in RTL):**
- Header: "My Cart" + item count subtitle + close button
- Body: compact cart line rows (image 64×64, name, color·size, quantity stepper, line total, remove)
- Empty state: ShoppingBag icon + copy + "Browse Catalog" primary CTA
- Footer: subtotal row + "Continue Shopping" secondary + "View Cart" primary

### 2.2 Auth Shell (`/features/auth/components/AuthShell.tsx`)

Used only for `/login` and `/register` (no main header/footer).

```
┌─ [+] Dr. Mirror ─────────── [Back to Store]  [AR/EN] [☀/🌙] ─┐
│  ┌──────── centered Card ────────┐                             │
│  │ ... form content              │                             │
│  └───────────────────────────────┘                             │
└─ © 2025 Dr. Mirror ────────────────────────────────────────────┘
```

- Header: `bg-background/85 backdrop-blur` · min-height 56px
- Brand: Plus icon in rounded brand square + app name
- "Back to Store" text link (hidden on xs)
- Main: `flex-1 flex items-center justify-center` with `py-10 sm:py-14 md:py-16`
- Footer: minimal copyright bar, `border-t border-separator/40`

### 2.3 Footer (inside `Layout.tsx`)

`border-t border-separator/60 bg-surface-secondary/40`

3-column grid (1 col on xs, 2 on sm, 3 on lg):

**Column 1 — Brand:**
- `[+]` brand mark + "Dr. Mirror" bold text
- Tagline paragraph (muted, xs, max-w-xs)

**Column 2 — Quick Links:**
- Heading: "Quick Links" (uppercase xs tracking-wider muted)
- Links: Browse Catalog · Cart · My Account · Contact

**Column 3 — Support:**
- Heading: "Support"
- Support line paragraph
- "Contact us →" brand-colored link

**Bottom strip (separator then row):**
- Copyright text: "© 2025 Dr. Mirror. All rights reserved."

### 2.4 Downtime Banner

Full-width `Alert status="danger"` above header. `enter-fade-down` animation. CloudOff icon + title + description + dismiss × button. `rounded-none border-0 border-b`.

### 2.5 Forbidden Banner

Full-width `Alert status="warning"` above header. AlertTriangle icon + message + dismiss × button. Same style as downtime.

---

## 3. Page: Catalog (Home) — `/`

**Route:** `/` (public, accessible to guests and authenticated users)
**Layout:** Global shell (Header + Footer)

### 3.1 Hero Band

Full-bleed tinted section (`hero-band hero-band--tinted`):
- Negative margin pulls it past the page gutter so it spans full width
- Brand tint: `bg-brand/5` light · `bg-brand/8` dark
- Bottom separator line: `border-b border-separator/60`

**Left content column:**
- Small badge pill: rounded-full, `bg-brand/15 text-brand`, uppercase, "Dr. Mirror"
- `<h1>` tagline: 3xl→4xl→5xl bold, tracking-tight, max-w-2xl
- Subtitle paragraph: sm→base, muted, max-w-prose

**Right trust strip (2-col grid on xs, 4-col on sm+, floats right on md+):**
4 tiles, each:
- `rounded-large border border-brand/20 bg-brand/5` panel, `px-3 py-2.5`
- Lucide icon (16px, `text-brand`) top
- xs font-medium label below
- Icons: `Package2` (Fabric quality) · `Ruler` (All sizes) · `RefreshCw` (Exchange policy) · `Truck` (Delivery)

### 3.2 Filter Toolbar

`flex flex-col gap-4`:

**Row 1 — Search + Sort:**
- `SearchInput`: full-width text input with `Search` icon prefix (16px) and clear × button suffix when typed. `type="search"`, debounced 350ms commit. Commits immediately on Enter.
- `SortSelect`: `w-44 shrink-0`. Options: Newest · Price: Low to High · Price: High to Low · Name A→Z. Hidden label (sr-only).

**Row 2 — Category Chips:**
Horizontally scrollable pill row. `role="radiogroup"`. Keyboard-navigable (arrow keys).
- "All" pill (unselected by default)
- One pill per active category (Arabic or English name per locale)
- Selected pill: `bg-brand text-white rounded-full px-3.5 py-1.5 text-xs font-semibold`
- Unselected pill: `border border-separator/60 bg-surface text-default-700 hover:border-brand/40 hover:bg-brand/5`
- Trailing fade gradient on overflow edge
- Trailing spacer prevents last chip hiding under gradient

**Row 3 — Advanced Filter Panel (collapsible):**
Toolbar row with "Filters" secondary button (SlidersHorizontal icon + active count badge chip) + "Clear all" ghost button (X icon, danger hover) when filters active.

When expanded, an Accordion panel (`content-surface`):
- **Gender** accordion: `role="radiogroup"`, pills for All · Men · Women · Unisex
- **Size** accordion: debounced text input (e.g. "M", "L", "XL")
- **Color** accordion: debounced text input (e.g. "White", "Navy")
- **Price Range** accordion: two number inputs (Min EGP — Max EGP) with en-dash separator

### 3.3 Product Grid

`grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`

**Loading state:** 12 skeleton cards (same grid). Each: aspect-ratio 4:5 shimmer image, then 3 text lines + price row.

**Empty state:** `EmptyState` component — ShoppingBag icon (or SearchX), title "No products found", subtitle, optional "Clear filters" primary CTA.

**Error state:** `QueryErrorState` — danger Alert with retry button.

### 3.4 Product Card

Entire card is wrapped in a `<Link>` (navigable card pattern). `rounded-large` outer focus ring on keyboard nav.

**Card anatomy (`border border-separator/60 hover:border-brand/40 hover:shadow-medium`):**
1. **Image area** (`aspect-[4/5]`, `overflow-hidden bg-surface-secondary`):
   - `<img>` with `object-cover`, scale 1.03 on hover (`motion-safe`)
   - Fallback: centered `Package` icon if no image
   - "Sold Out" badge: `start-2 top-2`, `bg-foreground/75 text-background`, rounded-full, backdrop-blur
   - Desktop hover CTA overlay: "View details →" pill bottom-end, `bg-brand/90 text-white`, translate-y + opacity on hover
2. **Content** (`p-3 sm:p-4`):
   - Category label (uppercase, tracking-wider, muted, truncate) + GenderChip (right/end)
   - Product name: 2-line clamp, `text-sm sm:text-base font-semibold`
   - Brand name (if set): `text-xs text-default-600` (slightly more visible than muted)
   - Color swatch row (up to 5 swatches, +N overflow label)
   - Price row: bold tabular-nums + size count (right/end, `@md:` container query)
   - Mobile CTA strip (`sm:hidden`): "View details →" with ArrowRight icon, brand color

**GenderChip:** HeroUI `Chip variant="soft"` — `default` (Men) · `accent` (Women) · `success` (Unisex)

**ColorSwatchRow:** Small circular swatches (`size-5`), `ring-1 ring-black/5`, HeroUI Tooltip on hover

### 3.5 Pagination Footer

`flex flex-col items-center gap-3 sm:flex-row sm:justify-between`:
- Results count: `text-xs text-default-500 tabular-nums` — "Showing 24 of 142 products"
- `PaginationControls`: HeroUI Pagination compound — Prev · page window (1 sibling + ellipsis + anchors) · Next

---

## 4. Page: Product Detail — `/products/:slug`

**Route:** `/products/:slug` (public)
**Layout:** Global shell

### 4.1 States

**Loading:** `ProductDetailSkeleton` — left gallery placeholder (4:5 aspect ratio) + right column with shimmer lines for category, title, price, variant pickers, CTA.

**Not found (404):** `enter-fade-up content-surface space-y-4 p-10 text-center` — PackageX icon, "Product not found" h1, subtitle, "Back to Catalog" primary button.

**Error:** `QueryErrorState` alert with retry.

### 4.2 Back Link

`back-link` — `← Back to catalog` (ArrowLeft icon, RTL-flipped with `rtl:rotate-180`)

### 4.3 Main Grid (`grid gap-8 lg:grid-cols-2`)

**Left — Image Gallery (`ProductImageGallery`):**
- Main image: `aspect-[4/5]`, `max-h-[clamp(240px,52svh,480px)]` on mobile, `rounded-large border border-separator/60 bg-bone`
- `fetchPriority="high"` on main image (`loading="eager"`)
- Thumbnail strip (if >1 image): horizontal scrollable row, HeroUI ghost Buttons (16×20px), active = `ring-2 ring-primary`, inactive = `border border-separator/60 hover:ring-1`
- Keyboard: ArrowLeft/Right navigate thumbnails (direction-aware in RTL)

**Right — Product Info Panel (`flex flex-col gap-4`):**
1. **Category breadcrumb:** `text-xs uppercase tracking-wide text-default-500 hover:text-foreground` link → `/?categoryId=...`
2. **Product name `<h1>`:** `text-2xl font-semibold tracking-tight`
3. **Price + Gender row:** `text-2xl font-semibold tabular-nums` + `GenderChip`
4. **Color Picker** (if colors): Label row ("Color" + selected color name), `role="radiogroup"`, 36×36px circular buttons (`role="radio"`) with selected check overlay (luminance-aware: dark check on light colors, light check on dark colors), keyboard navigable
5. **Size Picker** (if sizes): Label row ("Size"), horizontal wrap of size buttons — selected: `bg-brand text-white`, out-of-stock: `opacity-50 line-through cursor-not-allowed`, unselected: `border border-separator/60 bg-surface hover:border-default-400`, keyboard navigable
6. **Spec Grid** (`content-surface grid grid-cols-2 sm:grid-cols-3 p-4 text-sm`): Brand · Material · SKU · Availability (one of: "Select color/size", "X in stock (Size S, Color White)", "Out of stock")
7. **Description:** `whitespace-pre-line text-sm leading-relaxed text-default-700`

### 4.4 Desktop CTAs (`hidden lg:flex flex-col gap-2 pt-2 lg:flex-row`)

- **Add to Cart** (primary, fullWidth): ShoppingBag icon; state transitions — idle: "Add to cart" / adding: spinner / added: ✓ "Added to cart". Disabled if no variant selected or out of stock.
- **Inquire** (outline, fullWidth): MessageSquare icon — toggles inline inquiry form below

### 4.5 Mobile Action Bar (fixed bottom, `lg:hidden`)

`fixed inset-x-0 bottom-0 z-30 bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]`
- Top border appears only when content scrolls behind bar (IntersectionObserver sentinel)
- **Inquire** (outline, fullWidth) + **Add to Cart** (primary, fullWidth) — same states as desktop

### 4.6 Inquiry Form (inline, collapsible)

`content-surface space-y-4 p-4` — appears below CTAs when "Inquire" pressed.
- Heading: "Product inquiry"
- Fields: Full name · Email (dir=ltr) · Phone (optional, dir=ltr) · Subject (pre-filled with product name) · Message (textarea)
- Submit: "Send inquiry" (Send icon) · pending: "Sending…"
- Success: `Alert status="success"` with ✓ icon, "Inquiry sent" title, subtitle, "Send another" ghost button

### 4.7 Cart Hint Footer

Below CTAs: `text-xs text-default-500` — either error message (danger) or "You have N items in your cart" / "Select a color and size to add to cart"

### 4.8 Mobile Spacer

`h-px` sentinel + `height: calc(5rem + env(safe-area-inset-bottom))` invisible spacer pushes content above fixed action bar.

---

## 5. Page: Cart — `/cart`

**Route:** `/cart` (public, guests and authenticated)
**Layout:** Global shell

### 5.1 Back Link

`← Back to catalog`

### 5.2 Page Header

`page-header`: "My Cart" h1 · "N items" subtitle

### 5.3 Error Banners

- Merge error (cart sync failed): `Alert status="danger"` with retry button
- General cart error: `Alert status="danger"`

### 5.4 Loading State

Skeleton grid (`lg:grid-cols-[1fr_320px]`) with 3 `CartLineSkeleton` rows.

### 5.5 Empty State

`EmptyState` — ShoppingBag icon · "Your cart is empty" · "Start browsing" · primary CTA → `/`

### 5.6 Filled State (`grid gap-6 lg:grid-cols-[1fr_320px]`)

**Left — Line Items:**

Each `CartLineRow` (`cq flex flex-col gap-3 rounded-medium border border-separator/60 bg-surface p-3 @sm:flex-row`):
- Product image thumbnail: `h-24 w-20` (page) or `size-16` (compact), `rounded-medium bg-bone`, links to product page
- Product info column:
  - Name link (2-line clamp, hover underline)
  - Line total (right/end, `text-sm font-semibold tabular-nums`)
  - Attribute row: color swatch dot (12px circle with ring) · color name · size · SKU (monospace, uppercase, hidden in compact)
  - "Unavailable" danger text if item no longer in stock
  - Bottom row: quantity stepper (`NumberField variant="secondary" w-28`) + remove trash button (ghost icon, danger on hover)
- Opacity 60% if unavailable

**Clear cart strip:**
- Default: "Clear cart" ghost button
- After click: inline confirm bar (`border border-danger/30 bg-danger/10`) — "Remove all items?" + "Yes, clear" danger + "No" ghost

**Right — Order Summary Card** (sticky on lg, `h-fit lg:sticky lg:top-20`):
```
┌─ ORDER SUMMARY ──────────────────────┐
│ Subtotal                   1,200 EGP │
│ Shipping        Calculated at checkout│
├──────────────────────────────────────┤
│ Estimated Total            1,200 EGP │
└──────────────────────────────────────┘
│      [Proceed to Checkout]           │
```
- Header: "ORDER SUMMARY" (uppercase xs tracking-wider muted), `border-b border-divider/40`
- DL of subtotal + shipping note (xs muted)
- Separator
- Estimated total (xl bold tabular-nums)
- Footer: "Proceed to Checkout" primary link button (full-width) → `/checkout`

---

## 6. Page: Checkout — `/checkout`

**Route:** `/checkout` (protected — anonymous users redirected to `/login`)
**Layout:** Global shell

### 6.1 Auth Gate

If unauthenticated, shows a centered card:
- Title "Sign in to continue"
- Subtitle "You need an account to checkout"
- "Sign in" primary button → `/login` (preserves `/checkout` as return destination)
- "Create account" outline button → `/register`

### 6.2 Empty Cart Guard

If cart is empty (post-order redirect or deep link), shows:
- "Your cart is empty" with ShoppingBag icon
- "Browse catalog" primary CTA

### 6.3 Loading State

`grid gap-6 lg:grid-cols-[1fr_320px]` — 3 `CartLineSkeleton` rows + `CheckoutSummarySkeleton`

### 6.4 Back Link

`← Back to cart` (back-link)

### 6.5 Page Header

"Checkout" h1 · "Fill in your details to place your order" subtitle

### 6.6 Progress Indicator

**Progress Bar** (thin, 4px height, brand color):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Step 1 = 33% · Step 2 = 66% · Step 3 = 100%

**Step Breadcrumb** (`CheckoutSteps`):
```
① Address ───── ② Payment ───── ③ Review
```
- Completed: green circle with ✓
- Active: brand-purple circle with step number
- Future: bordered circle with step number (muted)
- Connecting line: success/40 (completed) or divider/60 (pending)
- Step label: shown on sm+, muted if not reached

### 6.7 Two-column Form Layout (`grid gap-6 lg:grid-cols-[1fr_320px]`)

**Left — Multi-step Form:**

#### Step 1: Address

`Fieldset` with legend "SHIPPING ADDRESS":

If user has saved addresses: RadioGroup of saved address tiles:
- Each tile: `rounded-medium border cursor-pointer p-3`
  - Selected: `border-primary bg-primary/5 ring-1 ring-primary`
  - Unselected: `border-separator bg-surface hover:bg-surface-secondary`
  - Content: label (bold) + optional "Default" badge + phone (ltr) + street + city, governorate
- "Use a new address" dashed tile: `border-dashed`, Plus icon + "Enter a new address" + subtitle

Inline address form (shown when no saved address or "Use new" selected):
| Field | Type | Notes |
|---|---|---|
| Recipient name | text | required, `autoComplete="name"` |
| Phone | tel | required, Egyptian format hint, `dir="ltr"` |
| Governorate | select | 27 Egyptian governorates |
| City | text | required |
| Street address | text | required |
| Floor | text | optional |
| Apartment | text | optional |
| Landmark | text | optional |
| Delivery notes | text | optional, with hint |

Save as new address checkbox → if checked, label input appears (64 char max)

#### Step 2: Payment

`fieldset` with legend "PAYMENT METHOD":

RadioGroup of payment method tiles:
- Each: `border cursor-pointer rounded-medium p-3`
  - Selected: `border-primary bg-primary/5 ring-1 ring-primary`
  - Unselected: `border-separator bg-surface hover:bg-surface-secondary`
  - Icon (Banknote/Smartphone/Wallet/CreditCard) + name + instructions sub-text

Buyer note field: label "Special Instructions (optional)" + description hint

#### Step 3: Review

Two articles + optional note quote:
- **Shipping to:** `content-surface p-3 text-sm` — recipient, phone (ltr), street+apt+floor, city, governorate
- **Paying with:** `content-surface p-3 text-sm` — payment method name
- **Buyer note** (if present): `content-surface p-3 text-sm italic text-default-700`

**Navigation buttons (`flex items-center justify-between gap-2 pt-2`):**
- ← Back (ghost, disabled on step 1)
- Continue → (primary) or Place Order (primary, `isPending` spinner on submit)

**Error alert** (if any form or server error): `Alert status="danger"` above the step content.

**Right — Order Summary** (sticky `CheckoutSummary`):
```
ORDER SUMMARY

Product name × qty           EGP 800
Product name × qty           EGP 400
─────────────────────────────────────
Subtotal                   EGP 1,200
Shipping                 Free or TBD
─────────────────────────────────────
Total                      EGP 1,200
```

---

## 7. Page: Login — `/login`

**Route:** `/login` (public-only — redirects authenticated users)
**Layout:** Auth Shell

### 7.1 Auth Card

`w-full max-w-sm sm:max-w-md border border-separator/60 bg-surface shadow-md rounded-large`

**Header (center-aligned):**
- Title: "Sign in to your account" (`text-[1.375rem] font-semibold tracking-tight`)
- Subtitle: "Welcome back" (muted)

**Body (`Form flex flex-col gap-4`):**
1. Error alert: `Alert status="danger"` — shown for wrong credentials or unknown error
2. **Email** `FormField`: underlined variant (`rounded-none border-0 border-b bg-transparent`), `type="email"`, `autoComplete="email"`, `autoCapitalize="off"`
3. **Password** `FormField`: underlined variant, `type="password"`, `autoComplete="current-password"` — password reveal toggle (Eye/EyeOff icon button in InputGroup suffix)
4. **Forgot password** link: `text-end text-sm text-default-500 hover:underline` (placeholder, no backend yet)
5. **Sign In** button: `variant="primary" fullWidth`, `isPending` state: "Signing in…"

**Footer (separator + center row):**
"Don't have an account? [Create one]" — "Create one" underlines on hover → `/register`

---

## 8. Page: Register — `/register`

**Route:** `/register` (public-only)
**Layout:** Auth Shell

### 8.1 Auth Card

Same card shell as Login.

**Header:**
- Title: "Create your account"
- Subtitle: "Join Dr. Mirror"

**Body (`Form flex flex-col gap-4`):**
1. Error alert: `Alert status="danger"` — shown if email already taken or unknown error
2. **Full Name** `FormField`: underlined, `autoComplete="name"`
3. **Email** `FormField`: underlined, `type="email"`, `autoComplete="email"`
4. **Password** `FormField`: underlined, `type="password"`, `autoComplete="new-password"`, description: "At least 8 characters"
5. **Create Account** button: `variant="primary" fullWidth`, `isPending`: "Creating account…"

**Footer:**
"Already have an account? [Sign in now]" → `/login`

---

## 9. Page: Account Hub — `/account`

**Route:** `/account` (protected)
**Layout:** Global shell

### 9.1 Welcome Header

```
Welcome back, Ahmed
Your personal dashboard
```
`text-2xl font-semibold tracking-tight` + `text-sm text-default-500 max-w-prose`

### 9.2 Profile Info Card

`content-surface p-6`:

`<dl class="grid grid-cols-1 gap-4 sm:grid-cols-3">`:
| Field | Display |
|---|---|
| Full name | User's full name |
| Email | `dir="ltr"` |
| Member since | Formatted date (long format, Latin numerals) |

### 9.3 Quick Links Grid (`grid gap-3 sm:grid-cols-2`)

Each link: `content-surface p-4 transition-colors hover:bg-surface-secondary` with icon + text:

| Link | Icon | To |
|---|---|---|
| My Orders — "Track and manage your orders" | Package (brand bg/10, text-brand) | `/account/orders` |
| Address Book — "Manage your delivery addresses" | MapPin (neutral bg/10) | `/account/addresses` |
| Admin Dashboard *(admins only)* — "Go to admin panel" | LayoutDashboard | `/admin` |

### 9.4 Recent Orders Section

Heading: ShoppingBag icon + "Recent Orders"

**Loading:** 3 compact `OrderRowSkeleton` items

**Has orders:** `content-surface divide-y divide-separator/40 overflow-hidden` list:
Each row: `flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-secondary`:
- Start: order number (sm font-medium)
- End: date (tabular-nums) · status text (tabular-nums)

Final row: "View all orders →" centered link (text-primary)

**No orders:** `content-surface p-8 text-center` — ShoppingBag icon + "You haven't placed any orders yet"

---

## 10. Page: Orders List — `/account/orders`

**Route:** `/account/orders` (protected)
**Layout:** Global shell

### 10.1 Page Header

`page-header`: "My Orders" · "Track and manage all your orders"

### 10.2 Loading State

Skeleton header + 5 `OrderRowSkeleton` list items.

### 10.3 Empty State

`EmptyState` — Package icon · "No orders yet" · "You haven't placed any orders yet" · "Browse catalog" primary CTA → `/`

### 10.4 Orders List

`content-surface overflow-hidden` list, `divide-y divide-separator/40`:

Each order row link (`hover:bg-surface-secondary sm:px-5 px-4 py-3.5`):
- **Left block:** Order number (`text-sm font-semibold`) + date · item count (`text-xs tabular-nums text-muted`)
- **Right block:** `OrderStatusBadge` chip + total amount (`text-sm font-bold tabular-nums`)

### 10.5 Status Badges

`Chip variant="soft"` with semantic colors:
| Status | Color |
|---|---|
| Pending · Pending Payment Review | warning (amber) |
| Confirmed · Paid | accent (brand purple) |
| Preparing · Shipped | default (neutral) |
| Delivered | success (green) |
| Cancelled | danger (red) |

### 10.6 Pagination

`PaginationControls` — page window with ellipsis and first/last anchors.

---

## 11. Page: Order Detail — `/account/orders/:orderNumber`

**Route:** `/account/orders/:orderNumber` (protected)
**Layout:** Global shell

### 11.1 Back Link

`← Back to orders`

### 11.2 Order Header

```
┌─ ORD-2024-001  [📋 copy]
│  3 items · Total: EGP 1,200                [Confirmed] ────────┐
```
- Order number `text-2xl font-semibold tracking-tight` + `Snippet` copy button (Copy → Check icon with 1.5s revert)
- Subtitle: item count + formatted total
- `OrderStatusBadge` floated to end

### 11.3 Two-column Layout (`grid gap-6 lg:grid-cols-[1fr_320px]`)

**Left column (main content):**

#### Payment Instructions Card (non-COD, Pending / PendingPaymentReview only)

`Card border-primary/30 bg-primary/5`:
- Header: Banknote icon + "Payment Instructions"
- Body: instructions text paragraph
- Nested card with: Amount due (EGP formatted, large bold tabular) + account number (monospace, `dir="ltr"`, copy button) + account holder

#### Payment Proof Upload Section (non-COD, Pending / PendingPaymentReview only)

`content-surface space-y-3 p-4`:
- Title: "Upload payment proof"
- Subtitle: "Max Xmb — JPG, PNG, PDF accepted"
- Dropzone label: styled `<label>` with dashed border (`cursor-pointer hover:bg-surface-secondary`) — UploadCloud icon + "Choose file"
- Native `<input type="file" class="sr-only">` (exception: no HeroUI FileTrigger available)
- Image preview: `max-h-56 rounded-medium border object-contain` (if image type)
- Client error: `text-sm text-danger` (role=alert)
- Buttons: "Upload proof" primary + "Clear" ghost (shown when file selected)
- `ProgressBar isIndeterminate` while uploading

#### Payment Proofs List (if any uploads)

"Payment Proofs" section heading:
Each proof `content-surface flex gap-3 p-3`:
- Thumbnail (64×64, rounded-medium): clickable image preview or PDF icon or error/loading state
- Info column:
  - `ProofStatusBadge` + upload timestamp (tabular-nums)
  - "Reviewed by X on [date]" (if reviewed)
  - Reviewer note (if present)

`ProofStatusBadge` colors: Pending=warning · Approved=success · Rejected=danger

#### Order Items Section

"Order Items" heading:
Each item Card:
- Thumbnail: 64×64, links to product page
- Name (2-line clamp, links to product page)
- Attributes: color swatch dot + name · size · qty
- SKU (mono uppercase tracking-wide muted)
- Line total (end-aligned, font-semibold tabular-nums)

#### Shipping Address Card

"Shipping Address" heading:
Card content (`text-sm leading-relaxed`):
- Recipient name (font-medium)
- Phone (`dir="ltr"`)
- Street, apartment (short), floor (short)
- City, Governorate (i18n-translated)
- Landmark (xs muted, if present)
- Delivery notes (xs italic muted, if present)

#### Cancel Order Button

`Button variant="ghost" className="text-danger hover:bg-danger/10"` — only shown if backend reports `allowedNextStatesForBuyer` includes Cancelled.

On press → `AlertDialog` (HeroUI):
- Title: "Cancel order?"
- Body: warning text + optional reason `TextArea` (max 500 chars)
- Footer: "Dismiss" ghost + "Yes, cancel" danger

**Right column — Summary Card** (sticky `lg:top-20`):

```
┌─ ORDER SUMMARY ──────┐
│ Subtotal   EGP 1,000 │
│ Shipping     EGP 200 │ (or "Free")
├──────────────────────┤
│ Total      EGP 1,200 │
├──────────────────────┤
│ PAYMENT METHOD       │
│ Instapay             │
├──────────────────────┤
│ TIMELINE             │
│ ✓ Pending        ... │
│ ✓ Paid           ... │
│ ○ Preparing          │
│ ○ Shipped            │
│ ○ Delivered          │
└──────────────────────┘
```

**Order Timeline** (`OrderTimeline`):
Vertical list (`flex flex-col gap-3`):
Each node:
- Icon: `CheckCircle2` (success green, reached) · `Circle` (default-300, not yet) · `XCircle` (danger red, cancelled)
- Vertical connector line: `success/40` or `bg-divider`
- Text: status label (foreground if reached, muted if not) + timestamp (xs tabular-nums)

---

## 12. Page: Address Book — `/account/addresses`

**Route:** `/account/addresses` (protected)
**Layout:** Global shell

### 12.1 Back Link

`← Back to account`

### 12.2 Page Header + Add CTA

Flex row: `page-header` (left) + "Add address" primary button with Plus icon (right, hidden when form open or no addresses yet)

### 12.3 Loading State

Header skeleton + 2 `AddressCardSkeleton`

### 12.4 Empty State (no addresses)

`content-surface p-10 text-center` — MapPin icon (enter-fade-up) + "No addresses saved yet" (enter-fade-up)

Immediately below: `AddressForm` is shown automatically when list is empty (first address flow)

### 12.5 Address Card (each saved address)

`Card border-separator/60` (default star border: `border-primary/40` if default):
- Content: two-column flex (info left, actions right)

**Info left:**
- Label (sm font-semibold) + "Default" badge (Star icon, brand color, `border-primary/30 bg-primary/10`) if `isDefault`
- Recipient name (sm font-medium)
- Phone (mono xs, `dir="ltr"`)
- Street + apartment short + floor short (sm text-default-700)
- City, Governorate (sm text-default-700)
- Landmark (xs muted) if present
- Notes (xs italic muted) if present

**Actions right** (flex column, 1.5 gap):
- Edit (Pencil icon, ghost icon button)
- Set Default (Star icon, ghost icon button) — only if not already default
- Delete (Trash2 icon, ghost icon button, danger hover)

### 12.6 Address Form (inline, add/edit)

`cq content-surface space-y-4 p-4`:

Three `Fieldset` groups:
1. **Contact:** Label (with "Address nickname" hint) · Recipient name · Phone (`dir="ltr"`, Egyptian format hint)
2. **Location:** Governorate (27 Egyptian options) · City · Street address · Floor · Apartment
3. **Extra:** Landmark · Delivery notes

**Set as default** `Checkbox` — locked (checked + disabled) for first address

Buttons: Submit primary (`isPending`: "Saving…") + Cancel ghost

---

## 13. Page: Inquiries / Contact — `/inquiries`

**Route:** `/inquiries` (public)
**Layout:** Global shell

### 13.1 Page Header

Centered max-w-3xl:
`page-header`: "Contact Us" h1 · "We'd love to hear from you" subtitle

### 13.2 Inquiry Form

`content-surface space-y-4 p-4`:

**Header inside form:**
- "Contact us" or "Inquire about [product name]" (HeroUI Heading level 2)
- "We reply within 24 hours" (Paragraph, muted)

**Fields:**

Two `Fieldset` groups:

**Contact info (2-col grid on sm+):**
| Field | Type | Required |
|---|---|---|
| Full name | text | Yes |
| Email | email, `dir="ltr"` | Yes |
| Phone | tel, `dir="ltr"` | No |
| Subject | text | Yes |

**Message:**
- Textarea (4 rows, max 2000 chars)

**Submit button:** "Send inquiry" with Send icon · pending: "Sending…"

### 13.3 Success State

`Alert status="success"` with ✓ icon:
- Title: "Inquiry sent!"
- Description: "We'll reply to your email within 24 hours."
- "Send another inquiry" ghost button (resets form)

---

## 14. Page: 404 Not Found

**Route:** `*` (catch-all)
**Layout:** Global shell (storefront)

```
            404

      Page not found

We couldn't find what you were looking for.

       [/path/not/found]

       [ Back to catalog ]
```

- `404` glyph: `text-6xl font-bold tabular-nums text-default-200 dark:text-default-500` — typographic anchor, no Lucide icon
- h1: "Page not found" — `text-2xl font-semibold tracking-tight`
- Subtitle paragraph: muted
- Path badge: `rounded-medium bg-content2 px-3 py-1.5 text-xs text-default-500 dir="ltr"` 
- CTA: "Back to catalog" primary button → `/`
- Entire content: `enter-fade-up flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center`

---

## 15. Shared Components

### 15.1 EmptyState

`Card variant="transparent" py-14 sm:py-16`:
- Icon container: 64×64 `enter-fade-up rounded-2xl bg-default-100 dark:bg-default-50/5`
- Icon: 32px, `text-default-400`
- Text container: `enter-fade-up space-y-1.5`
- Title: `HeroUI Heading level={2}`, sm font-semibold
- Subtitle: max-w-xs, sm leading-relaxed text-muted
- Action button (optional): primary, mt-1

### 15.2 QueryErrorState

`Alert status="danger" className="enter-fade-down rounded-large"`:
- AlertCircle icon (16px, mt-0.5 shrink-0)
- Description text (sm)
- Retry ghost button (danger text, self-center)

### 15.3 PaginationControls

HeroUI Pagination compound — Previous · page items (numbers + ellipsis) · Next.
- Page window: 1 sibling on each side + first/last anchors + ellipsis
- Hidden if `totalPages <= 1`
- `tabular-nums` on page numbers
- ChevronLeft/Right icons (RTL-flipped with `rtl:rotate-180`)

### 15.4 Skeleton

`bg-default-200/60 rounded-medium motion-safe:animate-pulse` base.
Purpose-built layouts:
- `CartLineSkeleton` — image + text + stepper row
- `OrderRowSkeleton` — number + meta + badge + amount
- `AddressCardSkeleton` — label + fields
- `ProductDetailSkeleton` — gallery + info column
- `CheckoutSummarySkeleton` — items + separator + totals
- `PaymentMethodTileSkeleton` — radio dot + name + description

### 15.5 Snippet (copy-to-clipboard)

Inline component: children content + ghost icon button (Copy → Check with 1.5s revert) + Tooltip.

### 15.6 LangSwitcher

Toggle between AR and EN. Updates `html[lang]` and `html[dir]`, switches font stack.

### 15.7 ThemeToggle

Cycles Light → Dark → System. Updates `html.dark` / `html.light`.

---

## 16. Responsive Breakpoints

| Breakpoint | Width | Layout change |
|---|---|---|
| xs (default) | < 640px | 1-col grid, mobile header, fixed action bar |
| sm | ≥ 640px | 2-col product grid, desktop header shows |
| md | ≥ 768px | 3-col product grid, hero trust strip inline |
| lg | ≥ 1024px | 4-col product grid, 2-col checkout/order |
| xl | ≥ 1280px | 4-col wide product grid |

---

## 17. RTL (Arabic) Specifics

- All directional classes use logical CSS: `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`
- Arrow icons: `rtl:rotate-180` flips ArrowLeft/Right and ChevronLeft/Right
- Header drawer: RTL = slides from right (leading edge); Cart drawer: RTL = slides from left (trailing edge)
- Category chip scroll gradient: `bg-gradient-to-l` in RTL (trails on left)
- Color/size picker keyboard: ArrowLeft advances in RTL
- Phone numbers always `dir="ltr"` regardless of locale

---

## 18. Accessibility

- Skip-to-content link: absolute, `sr-only` until focused
- `<main id="main-content" tabIndex={-1}>` — focus target after skip link
- `aria-busy="true"` on loading containers
- `aria-label` on all icon-only buttons
- `role="radiogroup"` on color/size/category/payment pickers; keyboard arrow navigation
- `aria-current="step"` on active checkout step
- `aria-expanded` on filter panel toggle
- All form fields: explicit `<Label>` or `aria-label`
- Color swatches: `role="img" aria-label={colorName} tabIndex={0}` for keyboard+SR access
- `LiveRegion` component for dynamic announcements (cart updates, etc.)
- Images: descriptive `alt` text; decorative images: `aria-hidden`
- Focus rings: 2px offset ring on all interactive elements

---

## 19. Loading Strategy

- Route-level lazy loading (React `lazy` + `Suspense`)
- Page fallback: centered `Spinner` on full-screen background
- Session fallback: same spinner while auth bootstraps
- First paint: header/footer are eager; pages load on navigation
- Product gallery main image: `fetchPriority="high" loading="eager"` for LCP
- Below-fold product images: `loading="lazy" decoding="async"`
