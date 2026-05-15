# Dr_Mirror — DESIGN_SCREEN_SPECS

> Per-screen prompts to paste into [claude.ai/design](https://claude.ai/design) **after** `DESIGN_BRIEF.md`. Order matters: generate the three flagship screens first to lock the visual language, then proceed slice by slice.

---

## How to use this file

For each claude.ai/design conversation:

1. Open a fresh conversation at https://claude.ai/design.
2. Paste the full contents of `DESIGN_BRIEF.md` as your first message.
3. Paste **one** screen block from this file as your second message.
4. Iterate on the output: ask claude.ai/design to refine specific elements ("tighten the product card spacing", "make the dark variant more confident", "show the RTL version").
5. Once locked, save the generated JSX as `design-artifacts/<screen-name>.tsx` in this repo (we'll port from there in Phase E).

---

## Phase B — Flagship Screens (generate first, in order)

These three set the visual vocabulary for everything else. Each is intentionally chosen to stress a different surface (visual-dense grid, editorial showcase, dense info dashboard).

---

### Flagship 1 — Catalog

```
# Screen: Catalog (route: /)
## Audience: Customer (public, also logged-in)
## Purpose: Browse, filter, and discover the full product range. The default landing page after login.

## Key UI elements
- Page header: H1 "Premium medical apparel" / "ملابس طبية متميزة" + 1-line subtitle
- Search input (full-width on mobile, flexed with sort on desktop)
- Sort select (Newest / Price ascending / Price descending / Name) — uses HeroUI `Select`
- Category chips row (horizontal scroll on mobile, wraps on desktop) — "All", "Scrub Tops", "Scrub Pants", "Lab Coats", "Surgical Headwear", "Footwear"
- Product grid: 1 col mobile, 2 col sm, 3 col md, 4 col xl. Gap: gap-4. 24 products per page.
- Each ProductCard: 4:5 image (warm bone background in dark, cool grey in light), product name (text-base font-medium), color swatch row (max 5 visible + "+N more"), price (text-base font-semibold tabular-nums, EGP "ج.م" / "EGP" prefix), gender chip, optional "Sold out" badge top-end (logical CSS).
- Pagination bar at bottom: page info ("Showing 1–24 of 142"), prev / page numbers / next. Hidden if 1 page.
- Empty state component (when no results): icon, "No products match" heading, 1-line help, optional "Clear filters" button.

## States to render
1. **Dark + LTR (English)** — canonical, default
2. **Dark + RTL (Arabic)** — verify the design holds in RTL
3. **Light + LTR (English)** — light mode parity

## RTL notes
- Sort select chevron mirrors. Search input clear-button position uses `me-*`.
- Category chips: first chip ("All") is at the *start* (right in RTL, left in LTR).
- Pagination prev/next arrows mirror.
- Price layout: numbers always Western (1,250), currency suffix follows direction.

## Reference
- https://wearfigs.com/collections/scrub-tops — for product grid density and tile rhythm
- Linear's home dashboard for the filter/sort row discipline

## Constraints recap
- ONE accent (emerald). ≤ 3 font weights. ≤ 2 card nesting levels.
- No hero gradient. No marketing carousel. The grid IS the hero.
- Use HeroUI Button, Input, Select, Chip components — restyle, don't replace.
```

---

### Flagship 2 — Product Detail

```
# Screen: Product Detail (route: /products/:slug)
## Audience: Customer
## Purpose: Editorial showcase of a single product. Convert browse intent into add-to-cart. This is the "premium" moment — typography, photography, and restraint do the work.

## Key UI elements
- Back-to-catalog link at top with mirrored arrow (start-aligned)
- 2-column grid on desktop (image gallery start, info end), stacked on mobile

### Left column (image gallery)
- Main image: 4:3 or 4:5 aspect, large (~600px wide on desktop), `rounded-large`, warm bone background
- Thumbnail row beneath: 4–6 thumbs, 80x64, active has emerald ring (`ring-2 ring-brand`), inactive has subtle border
- Optional small editorial detail shots (close-up fabric, stitching)

### Right column (product info)
- Category eyebrow link: `text-xs uppercase tracking-wide text-muted` ("Scrub Tops" / "بدلات طبية")
- H1 product name (`text-2xl font-semibold tracking-tight`)
- Price row: large price (`text-2xl font-semibold tabular-nums`) + gender chip
- Color picker: row of circular swatches, 32px each, with ring on selected. Color name appears below selection.
- Size picker: pill-style buttons in a row ("XS · S · M · L · XL"), grayed-out for out-of-stock. Selected has emerald background.
- Spec grid (HeroUI `<dl>` or simple grid): 2-3 columns showing Brand, Material, SKU, Stock availability — uppercase tracking-wide labels
- Description: text-sm leading-relaxed, max 3 paragraphs visible, expandable if longer
- CTA row: primary "Add to cart" button (solid emerald, full-width on mobile, ~280px on desktop) + secondary "Inquire about product" outline button
- Cart hint below CTAs: "You have N items in your cart" (text-xs text-muted)
- Inquiry form (collapsed by default): expands inline when "Inquire" is clicked — name, email, phone, message fields

## States to render
1. **Dark + LTR (English)** — show a scrub top product
2. **Dark + RTL (Arabic)** — same product, Arabic content
3. **Light + LTR (English)** — light parity
4. **(Bonus) Out-of-stock state** — Add to cart disabled, "Out of stock" tone

## RTL notes
- Back arrow mirrors (already handled with `rtl:rotate-180`)
- 2-column grid: in RTL, image is on the right, info on the left — Tailwind grid handles this naturally
- Color swatch row + size picker: same physical order in both directions
- "Inquire" arrow icon mirrors

## Reference
- https://aesop.com/uk/p/skin/hand/resurrection-aromatique-hand-balm/ — editorial typography rhythm, restraint
- https://hermes.com — product detail layouts (without their volume of marketing copy)
- FIGS product page for product info structure

## Constraints recap
- This is THE premium moment. Whitespace is your friend.
- ONE accent: emerald on price highlights, CTA, active variants.
- Photography sells the product — show a confident studio shot, not a model shot.
- Specs grid is NOT a separate card — it's an inline `<dl>` with subtle background.
```

---

### Flagship 3 — Admin Dashboard

```
# Screen: Admin Dashboard (route: /admin)
## Audience: Admin (authenticated, role=Admin)
## Purpose: Operations overview — at a glance: how many orders need action, what's recent, where to go next. Information density without crowding.

## Key UI elements

### Top bar (already exists in AdminLayout, but mock its restyle)
- Logo at start
- Page title in center or start: "Dashboard"
- Right (logical end): theme toggle, locale switcher, user menu (avatar + name dropdown)

### Left sidebar (240px, fixed)
- Section: "Operations"
  - Dashboard (active — emerald start-border + bg-surface-2 tint)
  - Orders
  - Inquiries
- Section: "Catalog"
  - Products
  - Categories
  - Payment methods
- Section: "People"
  - Users
- Items: 36px tall, `text-sm font-medium`, Lucide icon at start, label, optional count badge at end
- Section labels: `text-xs uppercase font-medium text-muted tracking-wide` with `mb-2 mt-6`
- Footer: small "Signed in as Mustafa El Shahhat" + sign-out link

### Main area
- Page header: H1 "Dashboard" + 1-line subtitle "Daily operations overview"
- KPI grid: 6 cards in 3-col layout on lg, 2-col on sm
  - Card 1 (primary tone): "Total orders" — value in emerald
  - Cards 2-6 (default tone): "Pending", "Awaiting review", "Paid", "Preparing", "Shipped"
  - Each card: text-xs uppercase label, text-3xl font-semibold tabular-nums value, optional trend indicator (subtle, +12 / -3 vs last week)
  - Cards: rounded-xl, bg-surface, border border-white/8 in dark, no shadow

- Below KPIs, split layout (1fr | 280px on desktop):

#### Recent Orders (main column)
- H2 "Recent orders"
- List of 5 most recent orders as rows (NOT a table for a count of 5)
- Each row: rounded-md, border-bottom or full border, padding `py-3 px-4`
  - Start: order number (font-medium, tabular-nums) + customer name below in text-xs muted
  - Middle: status badge (emerald-tinted for "Paid", amber for "Pending review", etc.)
  - End: item count + total price (tabular-nums, text-end logical)
- "View all orders →" link below

#### Quick Links (side column)
- H2 "Quick links"
- 3 link rows with Lucide icons: Orders queue, Products, Users
- Each row: rounded-md bg-surface px-3 py-2.5, hover tint, icon at start

### Page footer (subtle)
- `border-t border-white/8 pt-4`
- text-xs text-muted: "Signed in as Mustafa El Shahhat · Last login 2 hours ago"

## States to render
1. **Dark + LTR (English)** — canonical
2. **Light + LTR (English)** — light parity
3. **(Bonus) Loading state** — skeleton placeholders for KPI cards and recent orders list

## RTL notes
- Sidebar is on the right in RTL, left in LTR — Tailwind flex direction handles it
- KPI grid: same physical order in both directions (Total first)
- Status badges: text inside is locale-direction-aware, but badge structure is symmetric
- Order rows: "Order #" starts at logical start, "Total" ends at logical end

## Reference
- https://vercel.com/dashboard — KPI density and clean dark mode
- https://linear.app — sidebar discipline, list-row navigation (not stacked cards)
- Stripe Dashboard — KPI hierarchy

## Constraints recap
- This is INFO-DENSE — text-sm body, py-2 cells, tabular-nums on all numerics.
- Sidebar uses list rows with section dividers, NOT stacked cards.
- ONE accent (emerald) — used on primary KPI value, active sidebar item, primary CTAs.
- Status colors only on status badges; never decorative.
- No shadows in dark mode — elevation by lightness.
```

---

## Phase D — Remaining Customer-Facing Screens

(Generate after the flagships are locked and the system tokens are implemented. These can be batched in fewer iterations since the language is set.)

### Cart

```
# Screen: Cart (route: /cart)
## Audience: Customer
## Purpose: Review and edit items before checkout.

## Key UI elements
- H1 "Your cart" + item count subtitle
- Cart line items: image thumbnail (80x100 with bone bg), product name + variant (color/size below in text-xs muted), unit price, quantity stepper (HeroUI), line subtotal at end, trash icon button
- Sticky summary panel (right column on desktop, bottom on mobile): items count, subtotal, shipping note "Calculated at checkout", "Checkout" primary CTA (full-width, emerald, large), "Continue shopping" link below
- Empty cart state: large bag icon (Lucide), heading "Your cart is empty", subhead, "Browse products" primary CTA

## States: dark+LTR, dark+RTL, light+LTR. Also: empty state.
## RTL: stepper buttons mirror (+/- positions stay logical). Trash icon stays at end (logical).
```

### Checkout

```
# Screen: Checkout (route: /checkout)
## Audience: Customer (authenticated)
## Purpose: 3-step funnel: Address → Payment Method → Review & Place.

## Key UI elements
- Sticky top progress: 3 steps with numbers, current step in emerald, completed steps with check
- Step 1: Saved address picker (radio cards) + "Add new address" inline form (collapsed)
- Step 2: Payment method picker (radio cards) — each shows icon + name + 1-line description (bank transfer, cash, etc.)
- Step 3: Order review — items list (read-only), address, payment method, totals breakdown (subtotal, shipping, tax, grand total all tabular-nums), terms checkbox, "Place order" primary CTA
- Right column (desktop): order summary card sticky — items, totals, change-step links

## States: dark+LTR (all 3 steps), dark+RTL (step 3), light+LTR (step 1)
## RTL: progress arrow flow mirrors. Form labels stay above inputs.
```

### Login & Register

```
# Screen: Login (route: /login)
## Audience: Public
## Purpose: Authenticate existing users.

## Key UI elements
- Centered narrow card (max-w-sm), full viewport, theme + locale toggles at top-end of viewport
- Brand logo above card
- H1 "Welcome back" / "أهلاً بعودتك"
- Subtitle "Sign in to your account"
- Form: email input (variant="underlined"), password input with show/hide toggle (Lucide eye/eye-off)
- Optional: "Forgot password" link (text-xs, end-aligned)
- Primary "Sign in" button (solid emerald, full-width)
- Footer link: "Don't have an account? Sign up" with link to /register
- Locale switcher row at the very top (outside card): 2 small chip buttons "AR" / "EN", theme toggle icon

## States: dark+LTR, dark+RTL, light+LTR
## RTL: form labels start-aligned. Submit button text centered. Decorative elements unchanged.
```

(Continue with similar blocks for Register, Account Dashboard, Orders List, Order Detail, Address Book as Phase D progresses. Mirror the structure of the flagship blocks.)

---

## Phase D — Admin Screens

(Lower priority — generate after customer-facing is in good shape. Mostly forms and tables, so they inherit heavily from the Admin Dashboard flagship.)

### Admin Orders Queue
- Status filter chips at top (All, Pending, Pending Review, Paid, Preparing, Shipped, Delivered, Cancelled)
- Dense table: order #, date, customer, item count, status badge, total, actions menu
- Pagination at bottom

### Admin Order Detail
- Header: order # + status pill + transition actions (Approve / Reject / Mark Shipped)
- Customer info card, shipping address card, items list, payment proof gallery, order timeline (vertical stepper)

### Admin Products List
- Search input, filters (category, gender, publish status)
- Dense table: thumbnail, name (AR/EN), category, gender, variants count, stock total, price, published toggle
- Bulk actions row when items selected

### Admin Product Create/Edit
- Multi-section form: Basics (names, slug, category), Pricing, Variants (color+size matrix builder), Images (drag-drop gallery), Description (markdown), Publishing
- Sticky save bar at bottom (Cancel / Save draft / Publish)

### Admin Categories
- Simple list with inline-edit rows; "Add category" inline form at top

### Admin Payment Methods
- List + inline editor; toggle active state per method

### Admin Inquiries
- Status filter chips (All / Unread / Read)
- Inquiry rows: subject, sender name + email, product link, message preview, status badge, "Mark read" + "Reply via email" actions

### Admin Users
- Search input (debounced)
- Table: name, email, role chip, account count, joined date
- Inline role toggle on each row

---

## Iteration Tips for claude.ai/design

- **Generate the dark variant first.** Don't ask for both at once — you'll get split attention. Lock dark, then ask "now generate the light mode variant with the same layout."
- **Ask for one screen state per artifact.** Don't combine "logged in + logged out" or "loading + loaded" in one mockup — they compete for attention.
- **When iterating, be surgical:** "make the product card 4:5 instead of 1:1", "tighten the gap between the price and the gender chip to gap-2", "the emerald is too bright — drop the chroma by 20%".
- **Watch for HeroUI drift:** if the artifact uses raw `<button>` instead of `<Button color="primary">`, ask it to use HeroUI components.
- **Push back on busy compositions:** if the result has more than 1 accent hue or feels SaaS-templated, say "this feels generic — remove all decorative chrome, the product photography is the hero."
- **Save the good ones.** When a flagship locks, export the JSX and save it to `design-artifacts/<screen>.tsx`. We'll port from those files in Phase E.
