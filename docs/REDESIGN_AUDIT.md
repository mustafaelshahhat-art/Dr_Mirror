# Dr_Mirror Redesign Audit (Phase 1)

> Read-only defect log produced by Phase 1 of the redesign rollout.
> Source of truth: `DESIGN.md`, `PRODUCT.md`, `plan_redesign.md` (§6 audit grid, §9–§15 patterns, §17–§18 RTL/dark, §20 file map).
> No source / config / CSS / backend / package files were modified by Phase 1; this file is the only deliverable.

---

## 0. How to read this document

- **Severity**: `H` (defect blocks DESIGN.md acceptance), `M` (off-spec but not user-blocking), `L` (polish).
- **Phase target**: which rollout phase closes the defect (`P2`–`P7` per `plan_redesign.md` §19).
- Each row points at a concrete `Path:Line` so Phase 2+ edits start with zero re-discovery cost.
- Items marked **OK** below are intentionally listed as "no defect found" so future phases don't re-audit them blindly.

---

## 1. Cross-cutting findings (sweep results)

### 1.1 Logical CSS (DESIGN.md §RTL)

- **Sweep:** `\b(ml-|mr-|pl-|pr-|left-|right-)\b|text-left|text-right` across `frontend/src/**/*.tsx`.
- **Result:** zero hits. The codebase already uses logical properties exclusively (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`).
- **Status:** **OK** — no Phase 7 work needed on this axis.

### 1.2 Glassmorphism / `backdrop-blur` (DESIGN.md §Color hard rules, §Anti-patterns)

- **Sweep:** `backdrop-blur` across `frontend/src/**`.
- **Result:** the only non-test occurrence is `@d:\projects\Dr_Mirror\frontend\src\shared\components\Header.tsx:31` (the single permitted storefront sticky header). `@d:\projects\Dr_Mirror\frontend\src\features\admin\components\AdminHeader.test.tsx:35` actively asserts `backdrop-blur` is **absent** from admin chrome.
- **Status:** **OK**.

### 1.3 Raw hex colour literals in TSX (DESIGN.md §Color)

- **Sweep:** `#[0-9a-fA-F]{3,8}` across `*.tsx`/`*.ts`.
- **Result:** every hit is **data**, not styling: `style={{ backgroundColor: item.colorHex }}` for variant swatches (justified per DESIGN.md §Variant pickers — "Colour swatches show the `ColorHex` value"), test fixtures, and `useState('#000000')` as default form value in `@d:\projects\Dr_Mirror\frontend\src\features\admin\catalog\components\ProductVariantsSection.tsx:160`.
- **Status:** **OK**.

### 1.4 Disallowed font weights (DESIGN.md §Typography)

- **Sweep:** `font-light|font-thin|font-extrabold|font-black` across `*.tsx`.
- **Result:** zero hits. Only `font-medium`, `font-semibold`, `font-bold` are used.
- **Status:** **OK**.

### 1.5 Drop shadows (DESIGN.md §Theme — "shadows are weak or absent")

- **Sweep:** `shadow-(sm|md|lg|xl|2xl)` across `*.tsx`.
- **Result:** zero hits. All elevation is via surface tier + border.
- **Status:** **OK**.

### 1.6 `rounded-full` outside the §10 allowlist

DESIGN.md allows `rounded-full` only for **avatars**, **icon-only round buttons**, and **circular dot indicators**. Status badges/chips in DESIGN.md §Badges use `rounded-md`. The codebase has **drift**:

| Path | Line | Use | Severity | Phase |
|---|---|---|---|---|
| `frontend/src/features/orders/components/OrderStatusBadge.tsx` | 33 | Order status badge wrapper | H | P4 |
| `frontend/src/features/orders/components/ProofStatusBadge.tsx` | 37 | Proof status badge wrapper | H | P4 |
| `frontend/src/features/addresses/AddressBookPage.tsx` | 186 | Default-address pill | M | P4 |
| `frontend/src/features/checkout/components/AddressStep.tsx` | 75 | Default-address pill (saved-address card) | M | P4 |
| `frontend/src/features/admin/AdminInquiriesPage.tsx` | 189, 193, 279 | Product-context pill, "general" pill, status badge | M | P5 |
| `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx` | 137 | Active/inactive status pill | M | P5 |
| `frontend/src/features/admin/catalog/AdminProductsListPage.tsx` | 167 | Published/draft status pill | M | P5 |
| `frontend/src/features/catalog/CatalogPage.tsx` | 139 | Hero kicker pill (`bg-bone`) | M | P4 |
| `frontend/src/features/catalog/components/CategoryChips.tsx` | 95, 96 | Category filter chips | M | P4 |
| `frontend/src/features/catalog/components/FilterPanel.tsx` | 217, 218 | Active filter pills | M | P4 |

**Justified `rounded-full` (no defect):** color-dot indicators (`size-3 rounded-full ring-…`), color-swatch buttons (`size-9 rounded-full`), the `CartButton` numeric badge, the `SearchInput` clear icon, the `CheckoutSteps` step circle, the `InquiryForm` success icon container, and matching skeletons (`@d:\projects\Dr_Mirror\frontend\src\shared\components\Skeleton.tsx:68,145-147,162`).

### 1.7 Arbitrary `[Npx]` / `[Nrem]` Tailwind values (DESIGN.md §Spacing — "no `[Npx]` without justification comment")

| Path | Line | Token | Recommended fix | Severity | Phase |
|---|---|---|---|---|---|
| `frontend/src/shared/components/Field.tsx` | 17 | `text-[11px]` | `text-xs` (12px) or accept with comment | M | P3 |
| `frontend/src/features/catalog/components/ColorSwatchRow.tsx` | 44 | `text-[11px]` | `text-xs` | M | P4 |
| `frontend/src/features/catalog/components/ProductCard.tsx` | 49 | `text-[11px]` | `text-xs` | M | P4 |
| `frontend/src/features/catalog/components/FilterPanel.tsx` | 90 | `text-[10px]` | `text-xs` (acceptable inside `size-4` count bubble; needs justification comment) | M | P4 |
| `frontend/src/features/cart/components/CartLineRow.tsx` | 105 | `text-[11px]` | `text-xs` | M | P4 |
| `frontend/src/features/cart/components/CartButton.tsx` | 44 | `text-[11px]` | `text-xs` | M | P4 |
| `frontend/src/features/addresses/components/AddressForm.tsx` | 179 | `text-[11px]` | `text-xs` | M | P4 |
| `frontend/src/features/admin/AdminOrderDetailPage.tsx` | 208 | `text-[11px]` | `text-xs` | M | P5 |
| `frontend/src/features/catalog/components/SizePicker.tsx` | 93, 95, 96 | `min-w-[3rem]` | `min-w-12` | L | P4 |
| `frontend/src/features/catalog/components/SortSelect.tsx` | 29 | `min-w-[12rem]` | `min-w-48` | L | P4 |
| `frontend/src/shared/pages/NotFoundPage.tsx` | 12 | `min-h-[60vh]` | accept with justification comment OR convert to `min-h-svh`-based flex | L | P6 |
| `frontend/src/features/orders/OrderDetailPage.tsx` | 29 | `min-h-[30vh]` | replace with shape-matched skeleton in P6 | L | P6 |
| `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx` | 31 | `min-h-[30vh]` | replace with shape-matched skeleton in P6 | L | P6 |
| `frontend/src/features/admin/catalog/AdminProductCreatePage.tsx` | 37 | `min-h-[30vh]` | replace with shape-matched skeleton in P6 | L | P6 |

**Justified `[N…]` (no defect):** safe-area-inset calcs in `@d:\projects\Dr_Mirror\frontend\src\features\catalog\ProductDetailPage.tsx:252,309` (mobile sticky CTA bar — `pb-[calc(1rem+env(safe-area-inset-bottom))]` and a matching spacer `style.height`).

### 1.8 Raw HTML controls where HeroUI peers exist (DESIGN.md §Components, pre-merge checklist)

| Path | Line | Element | Notes | Severity | Phase |
|---|---|---|---|---|---|
| `frontend/src/shared/components/PaginationControls.tsx` | 16, 29 | `<button>` × 2 | Replace with HeroUI `Pagination` (`bottomContent` pattern from §13) or HeroUI `Button isIconOnly` | H | P3 |
| `frontend/src/features/orders/components/PaymentProofUpload.tsx` | 107 | `<input type="file">` | **Acceptable** — HeroUI v3 has no native file input; the visible affordance is a HeroUI-styled label. Document the exception in P3 comment. | L | P3 |

### 1.9 Em-dashes in UI copy / placeholders (DESIGN.md anti-pattern: "Em dashes (—) in UI copy")

| Path | Line | Use | Severity | Phase |
|---|---|---|---|---|
| `frontend/src/features/admin/AdminOrderDetailPage.tsx` | 186 | Em-dash glyph used as image-missing placeholder inside a `<div>` (admin order item) | L | P5 |

Replace with `ImageOff` Lucide icon (the buyer-side equivalent at `@d:\projects\Dr_Mirror\frontend\src\features\orders\OrderDetailPage.tsx:138` already uses `ImageOff`).

---

## 2. Tokens & globals (Phase 2 scope)

### 2.1 `frontend/src/styles/globals.css`

- **Tokens cross-checked against DESIGN.md §Color:**
  - Dark `--brand` `oklch(0.65 0.13 165)` ✅ (matches DESIGN.md table).
  - Dark `--surface` / `--surface-secondary` / `--surface-tertiary` ✅.
  - Light `--brand` `oklch(0.50 0.14 165)` ✅. **Note:** DESIGN.md does not specify a light `--brand-hover` value; the codebase uses `oklch(0.55 0.14 165)`. **Severity L. Phase 2.** Decision: either add to DESIGN.md or keep as-is (current value is consistent with the dark-mode 5%-lighter pattern).
  - Light `--brand-active` `oklch(0.46 0.14 165)` — same situation as hover. **L / P2.**
  - Light `--brand-subtle` `oklch(0.92 0.04 165)` — DESIGN.md only documents the dark variant; the light value reads sensibly (low chroma, high lightness) but is undocumented in `DESIGN.md`. **L / P2.**
  - `--bone` is correctly set per mode (dark `oklch(0.92 0.01 90)`, light `oklch(0.94 0.006 245)`). ✅
  - `--color-default-100..700` mix recipe (`color-mix(in oklab, var(--surface), var(--foreground), N%)`) is sensible and produces a perceptually-uniform neutral ramp. ✅
- **`@theme inline` block** (`@d:\projects\Dr_Mirror\frontend\src\styles\globals.css:30-61`): legacy v2-style aliases (`--color-content1/2/3`, `--color-divider`, `--color-default-100..700`, `--color-primary`) are present and consistent. ✅
- **`prefers-reduced-motion` global rule** (`@d:\projects\Dr_Mirror\frontend\src\styles\globals.css:153-162`): correct, applies to all elements with the right specificity. ✅

**Phase 2 actions:**

1. Add a comment block under each new light-mode brand token (`--brand-hover`, `--brand-active`, `--brand-subtle`) noting they extend the DESIGN.md table — OR add the corresponding rows to DESIGN.md in a separate doc PR (out of P2 scope).
2. No token deletions, no token renames, no new tokens needed for the rest of the audit.

### 2.2 `frontend/src/styles/fonts.css`

- Both `@font-face` declarations match `DESIGN.md §Typography`:
  - Satoshi: `font-display: swap`, weights 300–900, no `unicode-range` (intentional — Latin glyphs).
  - Alexandria: `font-display: swap`, weights 100–900, `unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF` (the full Arabic Unicode picture, broader than the `U+0600-06FF` summary in `plan_redesign.md` §3.5 — the actual file is **more correct** than the plan's summary; no action needed). ✅
- **Status:** no defects, no Phase 2 action.

---

## 3. Provider chain & router (frozen — verification only)

- `@d:\projects\Dr_Mirror\frontend\src\app\providers.tsx:72-96` matches `plan_redesign.md` §3.2 exactly: `NextThemesProvider → RouterProvider → QueryClientProvider → I18nextProvider → LocaleScope (HeroUI I18nProvider) → DirectionSync → AuthProvider → CartProvider`. **No `HeroUIProvider`.** ✅
- `@d:\projects\Dr_Mirror\frontend\src\app\router.tsx:60-103` enumerates the 18 frozen routes from `plan_redesign.md` §3.3. ✅
- **Phase 2–7 must not touch these two files.**

---

## 4. Shared shell & utilities (Phase 3 scope)

| Path | Finding | Severity | Phase |
|---|---|---|---|
| `frontend/src/shared/components/Layout.tsx` | Storefront shell uses logical `start-3 top-3` skip-link, single max-w-7xl container, footer `text-xs text-muted` per DESIGN.md §Shells. **OK.** | — | — |
| `frontend/src/shared/components/Header.tsx` | Single `backdrop-blur` (DESIGN.md exception). Mobile drawer uses HeroUI `Drawer` with `placement` flipped via `i18n.dir()`. Body cells use `me-1`/`me-2` logical properties. **OK.** | — | — |
| `frontend/src/shared/components/ShellPage.tsx` | Quick-link cards on `bg-content1` over page-level surface — qualifies as 1 nesting level (page → card). Recent-orders empty path uses `ShoppingBag` size-6 + headline + body per §15.1. **OK.** | — | — |
| `frontend/src/shared/components/ErrorBoundary.tsx` | Uses HeroUI `Button variant="primary"`, body `max-w-prose text-sm text-default-500`, h1 `text-2xl font-semibold tracking-tight`. **OK.** Optional polish: add a Lucide icon (`AlertTriangle size-6`) above the heading per §15.2 — **L / P6.** | L | P6 |
| `frontend/src/shared/pages/NotFoundPage.tsx` | Empty/error state lacks the §15.1 Lucide icon (current visual: `text-6xl 404` glyph). Decision needed: keep "404" numeric glyph as a brand-restraint choice OR add a small icon. **M / P6** — recommend **keeping** the numeric glyph (it reads clinical and quiet) and **only** adding the back-CTA tone alignment (already a `LinkButton` primary — fine). | M | P6 |
| `frontend/src/shared/components/PaginationControls.tsx` | Raw `<button>` × 2 (see §1.8). Replace with HeroUI `Pagination` or `Button isIconOnly`. | H | P3 |
| `frontend/src/shared/components/QueryErrorState.tsx` | DESIGN.md "canonical pattern: `message + retryLabel + onRetry`" matches exactly. Wrapper is `border-danger/30 bg-danger/10 text-danger` — semantic colours per DESIGN.md §Color → Status. **OK.** | — | — |
| `frontend/src/shared/components/Field.tsx` | `DESCRIPTION_CLASS = 'text-[11px] text-default-500'` — see §1.7. Helper text should step to `text-xs` for ramp consistency. | M | P3 |
| `frontend/src/shared/components/SelectField.tsx` | Wraps HeroUI `Select`. Uses `EMPTY_OPTION_VALUE` sentinel — defensible. **OK.** | — | — |
| `frontend/src/shared/components/Skeleton.tsx` | Shape-matched skeletons exist (`OrderRowSkeleton`, `CartLineSkeleton`, `ProductDetailSkeleton`, `PaymentMethodTileSkeleton`, `KpiRowSkeleton`, `RecentOrderRowSkeleton`, `TableRowSkeleton`, `DetailFieldSkeleton`, `AddressCardSkeleton`, `CheckoutSummarySkeleton`, `ProductGridSkeleton`). **OK** — Phase 6 wires the missing surfaces to use these existing primitives rather than inventing new ones. | — | — |
| `frontend/src/shared/components/LinkButton.tsx` | Documented HeroUI workaround (`Button` is non-polymorphic in v3). Tones limited to `primary`/`outline`. **OK.** | — | — |
| `frontend/src/shared/components/ForbiddenBanner.tsx` | HeroUI `Button` ghost variant for dismiss; `AlertTriangle` icon. **OK.** | — | — |
| `frontend/src/shared/components/ThemeToggle.tsx` | HeroUI `Button isIconOnly variant="ghost" size="sm"`. **OK.** | — | — |
| `frontend/src/shared/components/LangSwitcher.tsx` | HeroUI `Button variant="ghost" size="sm"`. **OK.** | — | — |
| `frontend/src/shared/lib/format.ts` | `DIGIT_LOCALE = 'en-US'` enforces Western digits per A18; `formatCurrency` matches DESIGN.md §Numerics ("`1,250.00 ج.م` in `ar`, `EGP 1,250.00` in `en`"). **OK.** | — | — |
| `frontend/src/shared/lib/i18n.ts` | Frozen — keys are **read-only** in this rollout. Not opened. | — | — |

### 4.1 Admin shell (Phase 3 — admin half)

| Path | Finding | Severity | Phase |
|---|---|---|---|
| `frontend/src/features/admin/components/AdminLayout.tsx` | Logical skip-link (`start-3`), full-width main (no `max-w-*`) per DESIGN.md §Shells admin rule, `px-4 md:px-6 lg:px-8 py-6`. **OK.** | — | — |
| `frontend/src/features/admin/components/AdminHeader.tsx` | Opaque `bg-content1` (no backdrop-blur — verified by `AdminHeader.test.tsx:35`). Uses HeroUI `Breadcrumbs`. **Defect:** sign-out button is `size="md"`, hamburger is `size="md"` — DESIGN.md §Buttons says admin **secondary chrome should be `sm`**. | M | P3 |
| `frontend/src/features/admin/components/AdminSidebar.tsx` | `w-56`, `bg-content1`, active `bg-primary/10 font-medium text-primary` — exact match with DESIGN.md §Navigation admin sidebar. RTL handled via `placement = i18n.dir() === 'rtl' ? 'right' : 'left'`. **OK.** | — | — |

---

## 5. Storefront pages (Phase 4 scope)

### 5.1 `/` — `frontend/src/features/catalog/CatalogPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 139 | Hero kicker pill `rounded-full bg-bone …` — DESIGN.md badges = `rounded-md`. | M | P4 |
| 142 | Hero h1 `text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight` — exact match. ✅ | — | — |
| 187–195 | Empty state: `Lucide` icon **missing**; structure is heading + body + CTA. Add `Search size-6 text-default-400 mx-auto mb-3` per §15.1. | M | P4 |
| 197 | Grid `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4` — DESIGN.md storefront catalog comfortable. ✅ | — | — |

### 5.2 `/products/:slug` — `frontend/src/features/catalog/ProductDetailPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 86–98 | 404 fallback is a flat `rounded-large border bg-content1` panel with no Lucide icon. Add `PackageX size-6` per §15.1. | L | P4 |
| 222–249 | Desktop primary + outline pair — single primary in viewport. ✅ | — | — |
| 250–281 | Mobile sticky CTA: primary first in flex-row, with `inline-end` ordering reversed via `gap-2` neutral; verify in P7 RTL state. | L | P7 |
| 252, 309 | `pb-[calc(1rem+env(safe-area-inset-bottom))]` and `style.height` — justified safe-area exception. ✅ | — | — |

### 5.3 `/cart` — `frontend/src/features/cart/CartPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 86–162 | Two-column grid `[1fr_320px]`, summary on `bg-content1`. **OK.** | — | — |
| 134 | `lg:sticky lg:top-20` — sticky offset depends on header height; verify in P7. | L | P7 |
| 164–175 | Empty state: `ShoppingBag size-6 text-default-400` + headline + body + CTA. ✅ matches §15.1. | — | — |
| 99 | "Confirm clear" inline panel uses `border-danger/30 bg-danger/10` — semantic. ✅ | — | — |

### 5.4 `/checkout` — `frontend/src/features/checkout/CheckoutPage.tsx` + components

| Path | Line | Finding | Severity | Phase |
|---|---|---|---|---|
| `CheckoutPage.tsx` | 219 | Step indicator via `CheckoutSteps` — uses DESIGN.md §Components step circle pattern. ✅ | — | — |
| `CheckoutPage.tsx` | 283–313 | Single primary per step (`Continue` or `Place Order`), `Back` is ghost. ✅ | — | — |
| `components/PaymentMethodPicker.tsx` | whole | RAC `RadioGroup` with full keyboard contract, focus ring on selected, `bg-primary/5 ring-1 ring-primary` — matches DESIGN.md §Variant pickers. ✅ | — | — |
| `components/AddressStep.tsx` | 75 | Default-address pill `rounded-full` (see §1.6). | M | P4 |
| `components/AddressStep.tsx` | 96–117 | New-address radio uses `border-dashed` to read as an action — restrained. ✅ | — | — |
| `components/PaymentMethodSection.tsx` | 60 | Error fallback uses `bg-danger/10 text-danger`. ✅ | — | — |

### 5.5 `/inquiries` — `frontend/src/features/inquiries/InquiriesPage.tsx`

- Thin wrapper around `InquiryForm`. Centred `max-w-3xl` container. **OK.** (No empty state needed — form is the page.)
- `InquiryForm.tsx:73` success state uses `rounded-full bg-success/15` for the icon container — **icon container, not a badge → justified.** ✅

### 5.6 `/account/orders` — `frontend/src/features/orders/OrdersListPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 67–78 | Empty state has Lucide `Package size-6` ✅ + CTA. | — | — |
| 80–105 | Card-row list: `rounded-medium border border-divider/60 bg-content1 hover:bg-content2` — comfortable density per DESIGN.md storefront-side history list. ✅ | — | — |
| 91 | Date renders `tabular-nums` ✅. | — | — |
| 109 | Uses `PaginationControls` (raw-button drift — see §1.8). | H | P3 |

### 5.7 `/account/orders/:orderNumber` — `frontend/src/features/orders/OrderDetailPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 27–33 | Loading uses `Spinner` inside `min-h-[30vh]`. **Plan §15 explicitly lists "Order detail (panel skeletons matching real layout)" — must use shape-matched skeleton.** | H | P6 |
| 47–61 | 404 fallback lacks Lucide icon. | L | P6 |
| 119 | Item row `rounded-medium border bg-content1` is one nesting level under page surface — within DESIGN.md ≤2 limit. ✅ | — | — |
| 152 | Color-dot `size-3 rounded-full` ✅ (justified swatch). | — | — |
| 165 | SKU label `font-mono text-xs` ✅. | — | — |
| 169 | `text-sm font-semibold tabular-nums` for line total ✅. | — | — |
| 219–257 | Summary aside: panel + `border-t` separators between sub-sections — restrained, no card-in-card. ✅ | — | — |

### 5.8 `/account/addresses` — `frontend/src/features/addresses/AddressBookPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 119–123 | Empty state: `MapPin size-6` + body. **Missing CTA** (would be "Add address" — but the form is auto-shown via `isFirstAddress`). Acceptable. ✅ | — | — |
| 186 | Default-badge `rounded-full` (see §1.6). | M | P4 |
| 213–246 | Three-stack `isIconOnly` ghost buttons (Pencil / Star / Trash2). DESIGN.md storefront comfortable density allows `size="md"`. ✅ | — | — |
| 242 | Trash button uses `text-default-500 hover:text-danger` — neutral-default with destructive hover. **Recommendation:** consider HeroUI `variant="danger" variant="ghost"` for clearer semantic; current pattern is acceptable per "destructive actions visually distinct" if hover intent is the differentiator. | L | P4 |

---

## 6. Admin pages (Phase 5 scope)

### 6.1 `/admin` — `frontend/src/features/admin/AdminHubPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 54–90 | Loading: shape-matched skeleton (`KpiRowSkeleton`, `RecentOrderRowSkeleton`). ✅ | — | — |
| 93 | KPI panel uses `divide-y divide-divider/60` — clean horizontal separators, no glow, no shadow. ✅ | — | — |
| 101–123 | Proof-queue row uses `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1` — accent reserved for true focus. ✅ | — | — |
| 141–144 | Recent-orders empty state lacks Lucide icon. | L | P5 |
| 142 | Empty state colour `text-sm text-default-500` only — DESIGN.md §15.1 wants icon + headline; this is "muted only". Either upgrade to full empty state OR document as a deliberate compact empty (admin density). **Recommendation:** upgrade. | M | P5 |

### 6.2 `/admin/orders` & detail — `frontend/src/features/admin/AdminOrdersListPage.tsx`, `AdminOrderDetailPage.tsx`

| Path | Line | Finding | Severity | Phase |
|---|---|---|---|---|
| `AdminOrdersListPage.tsx` | 56–59 | Loading uses `Spinner` — **§15 lists "Admin orders list (table-row skeleton)"** as required. Replace with `TableRowSkeleton` (already used by `AdminProductsListPage`). | H | P6 |
| `AdminOrdersListPage.tsx` | 84 | Hand-rolled `<table>` with DESIGN.md admin pattern (`bg-content2` header, `text-xs uppercase tracking-wide text-default-400`, `divide-y divide-divider/40`). **Note:** DESIGN.md says `divider/60`; codebase uses `/40`. Either align all admin tables to one alpha OR document. | M | P5 |
| `AdminOrdersListPage.tsx` | 100 | `rounded-small` class used on a Link — **`small` is not a defined HeroUI/Tailwind radius token in this project** (the codebase uses `rounded-medium` / `rounded-large`). Will resolve to nothing or default. | M | P5 |
| `AdminOrderDetailPage.tsx` | 33–66 | Loading: shape-matched skeleton ✅. | — | — |
| `AdminOrderDetailPage.tsx` | 186 | `—` em-dash placeholder for missing image — replace with `ImageOff` (matches buyer side `OrderDetailPage.tsx:138`). | L | P5 |
| `AdminOrderDetailPage.tsx` | 208 | `text-[11px]` SKU label (see §1.7). | M | P5 |

### 6.3 `/admin/categories` — `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 29–34 | Loading: bare `Spinner` in `min-h-[30vh]` — DESIGN.md prescribes shape-matched skeleton for list surfaces (use a row-skeleton mirroring lines 119–188). | H | P6 |
| 92–94 | Empty state: text-only, no Lucide icon. | M | P5 |
| 137 | Active/inactive status pill `rounded-full` (see §1.6). | M | P5 |
| 140 | Inactive pill uses `border-default/30 bg-default/10` — unscaled `default` token. Use `border-divider/60 bg-content2 text-default-500` (DESIGN.md §Badges neutral). | M | P5 |
| 220–249, 271–304 | Both forms use `Label className="sr-only"` with placeholder-as-label. DESIGN.md anti-pattern: "Tooltips replacing labels on primary actions" — placeholder-as-label is the same family for screen-reader-only users. The **labels exist** for SR users (sr-only), so a11y is technically intact, but DESIGN.md §Inputs prescribes "Labels above inputs always". Convert to visible labels in the dense form grid. | M | P5 |

### 6.4 `/admin/products` (list/new/edit) — `frontend/src/features/admin/catalog/`

| Path | Line | Finding | Severity | Phase |
|---|---|---|---|---|
| `AdminProductsListPage.tsx` | 41–48 | "New product" link is hand-styled (`rounded-medium bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90`). Replace with shared `LinkButton` (default `tone="primary"`). | H | P5 |
| `AdminProductsListPage.tsx` | 165–172 | Status pill `rounded-full` (see §1.6). | M | P5 |
| `AdminProductsListPage.tsx` | 184 | Edit-icon link is hand-styled `inline-flex size-8 …` instead of `LinkButton`/HeroUI `Button isIconOnly`. | M | P5 |
| `AdminProductCreatePage.tsx` | 35–41 | Loading: bare `Spinner` in `min-h-[30vh]` — replace with form-skeleton in P6. | H | P6 |
| `AdminProductCreatePage.tsx` | 66–144 | Form uses shared `Field` / `TextAreaField` / `SelectField` ✅, single primary submit + outline cancel ✅. | — | — |
| `AdminProductEditPage.tsx` | — | (Re-uses the same form components — inspect during P5.) | — | P5 |
| `catalog/components/ProductMasterForm.tsx`, `ProductImagesSection.tsx`, `ProductVariantsSection.tsx` | — | (Inspect during P5; ProductVariantsSection uses `colorHex` state default `'#000000'` which is **data**, not styling — OK.) | — | P5 |

### 6.5 `/admin/payment-methods` — `frontend/src/features/admin/catalog/AdminPaymentMethodsPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 33–53 | Loading: `PaymentMethodTileSkeleton` ✅ shape-matched. | — | — |
| 124–127 | Empty state: text-only, no Lucide icon. | M | P5 |
| `components/payment-methods/PaymentMethodForm.tsx`, `PaymentMethodRow.tsx` | — | (Inspect during P5; payment-method semantic gating must not change.) | — | P5 |

### 6.6 `/admin/inquiries` — `frontend/src/features/admin/AdminInquiriesPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 70–84 | Loading: shape-matched row skeleton ✅. | — | — |
| 107–110 | Empty state: text-only, no Lucide icon (e.g. `MailOpen size-6`). | M | P5 |
| 115–134 | Filter pills: HeroUI `Button variant="primary"|"outline"`. Acceptable per `plan_redesign.md` §11.2 (storefront filters as chips, admin filters as dense buttons). ✅ | — | — |
| 154 | `article` row is on `bg-content1` — flat, no card-in-card. ✅ | — | — |
| 199 | Message body uses `bg-content2` — second tier inside the row → 2 nesting levels (page → article → bg-content2 block). **Within ≤2 budget.** ✅ | — | — |
| 189, 193 | Product / "general" pills `rounded-full` (see §1.6). | M | P5 |
| 277–284 | StatusBadge `rounded-full` (see §1.6). | M | P5 |
| Whole row | **Read/unread/responded visual differentiation is carried by StatusBadge alone.** Plan §8.6 expects "unread weight (subtle), read state muted". Currently row weight is identical between New / Read / Responded. Recommend: subtle `font-semibold` on inquiry subject when `isNew`, `font-medium` otherwise. | M | P5 |

### 6.7 `/admin/users` — `frontend/src/features/admin/AdminUsersPage.tsx`

| Line | Finding | Severity | Phase |
|---|---|---|---|
| 39–51 | Loading: `TableRowSkeleton` ✅. | — | — |
| 89–93 | Empty state: text-only. Add Lucide `Users size-6`. | M | P5 |
| 64 | Header row `border-b border-divider/60 bg-content2 text-start` — DESIGN.md admin table pattern. ✅ | — | — |
| 138–158 | HeroUI v3 `Switch` compound API (`Switch.Control`, `Switch.Thumb`, `Switch.Content`) ✅. | — | — |
| Whole row | **Last-admin guard UI hint** is currently absent — admins toggling the last Admin role rely on a backend 4xx + inline `error` text. Plan §8.7 calls for a clearer hint. **Recommendation:** disable the toggle when `user.id === lastAdminId` AND show a tooltip — but this requires server-derived `lastAdminId`. Defer to a separate proposal; **do not** add it under Phase 5 (would expand scope to data shape). | L | (out of scope) |

---

## 7. Loading / empty / error gap matrix (Phase 6 scope)

`plan_redesign.md` §15 lists the surfaces that must use shape-matched skeletons. Status table:

| Surface | Current state | Action | Phase |
|---|---|---|---|
| Product detail | `ProductDetailSkeleton` ✅ | none | — |
| Checkout payment methods | `PaymentMethodTileSkeleton` (used in `PaymentMethodSection`) ✅ | verify in `PaymentMethodSection.tsx` | P6 |
| Admin dashboard | `KpiRowSkeleton` + `RecentOrderRowSkeleton` ✅ | none | — |
| Admin orders list | bare `Spinner` ❌ | swap to `TableRowSkeleton` | P6 |
| Admin products list | `TableRowSkeleton` ✅ | none | — |
| Admin users list | `TableRowSkeleton` ✅ | none | — |
| Admin inquiries list | shape-matched row skeleton ✅ | none | — |
| Admin payment methods | `PaymentMethodTileSkeleton` ✅ | none | — |
| Admin order detail | `DetailFieldSkeleton` panels ✅ | none | — |
| Buyer order detail | bare `Spinner` ❌ | introduce panel skeleton mirroring §5.7 layout | P6 |
| Admin categories | bare `Spinner` ❌ | row skeleton matching §6.3 | P6 |
| Admin product create | bare `Spinner` ❌ | form skeleton (label+field rows) | P6 |
| Storefront catalog | `ProductGridSkeleton` ✅ | none | — |
| Cart | `CartLineSkeleton` ✅ | none | — |
| Account orders list | `OrderRowSkeleton` ✅ | none | — |
| Address book | `AddressCardSkeleton` ✅ | none | — |

Empty-state Lucide-icon gaps (P5/P6 candidates):

- `AdminInquiriesPage.tsx:107`, `AdminUsersPage.tsx:90`, `AdminPaymentMethodsPage.tsx:125`, `AdminCategoriesPage.tsx:92`, `AdminHubPage.tsx:142`.

---

## 8. RTL / dark-light QA pre-matrix (Phase 7 scope)

The §22 QA matrix (18 routes × 4 modes) cannot be filled in Phase 1 (read-only). Surfaces flagged for **deliberate** Phase 7 attention by static analysis:

- `frontend/src/features/catalog/ProductDetailPage.tsx:223-281` — desktop vs. mobile sticky CTA stack must mirror in RTL (currently `inline-flex items-center gap-2`, no physical `flex-row-reverse` — should be inert under direction flip; verify).
- `frontend/src/features/cart/CartPage.tsx:134` — `lg:sticky lg:top-20` offset depends on header `h-14` + page padding; verify in RTL that the summary doesn't overlap.
- `frontend/src/features/admin/components/AdminSidebar.tsx:31-36` — `placement = 'right' | 'left'` swap; verify drawer slide direction.
- `frontend/src/features/checkout/components/CheckoutSteps.tsx:24-27` — step circles must read 1→2→3 in inline-direction (i.e. step 1 always at inline-start, NOT physically left).
- All status pills currently rendered as `rounded-full` — Phase 4/5 fix is a prerequisite for Phase 7 contrast verification.

Phase 7 will produce the filled QA matrix appended to this document.

---

## 9. Phase priority summary

### P2 — tokens (2 files: `globals.css` + `DESIGN.md`)

Per Q1 decision (audit §10): **comment globals.css AND update DESIGN.md in the same Phase 2 commit.**

- `frontend/src/styles/globals.css`: add a short comment block under each light-mode brand extension (`--brand-hover`, `--brand-active`, `--brand-subtle`) explaining the derivation pattern (lighter for hover, darker for active, low-chroma high-lightness for subtle).
- `DESIGN.md` §Color → Light mode: add three rows for `--brand-hover` / `--brand-active` / `--brand-subtle` with their OKLCH values.
- **No other token changes derived from Phase 1.**

### P3 — shared shells & utilities

1. `frontend/src/shared/components/PaginationControls.tsx` — replace raw `<button>` × 2 with HeroUI `Button isIconOnly variant="ghost"` (or migrate to HeroUI `Pagination`).
2. `frontend/src/shared/components/Field.tsx:17` — `text-[11px]` → `text-xs`.
3. `frontend/src/features/admin/components/AdminHeader.tsx:24-32, 50-57` — sign-out and hamburger button `size="md"` → `size="sm"` (admin density).
4. Document the file-input exception with a comment in `PaymentProofUpload.tsx:107`.

### P4 — storefront

1. Status badges: convert `rounded-full` → `rounded-md` in `OrderStatusBadge.tsx`, `ProofStatusBadge.tsx`, `AddressBookPage.tsx:186`, `AddressStep.tsx:75`.
2. Filter chips: convert `rounded-full` → `rounded-md` in `CategoryChips.tsx:95-96`, `FilterPanel.tsx:217-218`.
3. Hero kicker: `CatalogPage.tsx:139` `rounded-full` → `rounded-md`.
4. Catalog empty state — add Lucide icon (`SearchX` or `PackageX`).
5. Product detail 404 fallback — add Lucide icon.
6. Resolve `text-[11px]` and `min-w-[Nrem]` arbitrary values per §1.7.

### P5 — admin

1. Status badges across `AdminInquiriesPage`, `AdminCategoriesPage`, `AdminProductsListPage`: `rounded-full` → `rounded-md` and align inactive-pill colours to DESIGN.md §Badges neutral.
2. `AdminProductsListPage.tsx:41-48` — replace hand-styled link with `LinkButton`.
3. `AdminProductsListPage.tsx:184` — replace hand-styled icon link with `LinkButton size="sm"` or HeroUI `Button isIconOnly`.
4. `AdminCategoriesPage.tsx` forms — make labels visible (remove `sr-only`).
5. `AdminOrderDetailPage.tsx:186` — replace em-dash placeholder with `ImageOff` icon.
6. `AdminOrderDetailPage.tsx:208`, `AdminInquiriesPage.tsx`-related `text-[N]` arbitraries → `text-xs`.
7. `AdminInquiriesPage.tsx` — subtle weight differentiation between New / Read / Responded.
8. Empty-state Lucide icons across §7 list (Hub, Inquiries, Users, Payment Methods, Categories).
9. `AdminOrdersListPage.tsx:100` — `rounded-small` → `rounded-medium` (or remove — class is undefined).
10. Reconcile `divide-divider/40` vs `divide-divider/60` across admin tables (pick one).

### P6 — loading / empty / error states

1. `OrderDetailPage.tsx:27-33` — replace `Spinner` with panel skeleton.
2. `AdminOrdersListPage.tsx:56-59` — replace `Spinner` with `TableRowSkeleton`.
3. `AdminCategoriesPage.tsx:29-34` — replace `Spinner` with row skeleton.
4. `AdminProductCreatePage.tsx:35-41` — replace `Spinner` with form skeleton.
5. `ErrorBoundary.tsx` — optional Lucide icon in fallback.
6. NotFoundPage — keep numeric glyph (deliberate brand restraint), no change.

### P7 — RTL/dark-light QA

- Walk §22 matrix; pre-flagged surfaces in §8 above.
- Append filled matrix to this document.

### P8 — regression

- Run `npm run build`, `npm run lint`, `npm run test`, `npm run i18n:check` from `d:\projects\Dr_Mirror\frontend`.
- Check §23 acceptance line-by-line.

---

## 10. Resolved scope decisions

All four open questions were resolved by the user before Phase 2. These are the binding contract for later phases.

### Q1 — Light-mode brand-extension tokens (P2)

**Decision:** comment `globals.css` **AND** add rows to `DESIGN.md` in the same Phase 2 commit.
- `globals.css`: comment under each of `--brand-hover` / `--brand-active` / `--brand-subtle` in the light-mode `:root` block.
- `DESIGN.md` §Color → Light mode: append the three rows with current OKLCH values.

### Q2 — `AdminCategoriesPage` form labels (P5)

**Decision:** stack to single column on mobile, dense on desktop; **labels visible at every breakpoint.**
- Replace `<Label className="sr-only">` with visible `text-xs uppercase tracking-wide text-default-500` labels (matching DESIGN.md §Inputs).
- Convert the create-form grid from `sm:grid-cols-[1fr_1fr_100px_auto]` to `flex flex-col sm:grid sm:grid-cols-[1fr_1fr_100px_auto]` — fields stack on mobile, dense on `sm+`.
- Same treatment for `EditCategoryRow`.

### Q3 — `AdminInquiriesPage` read/unread differentiation (P5)

**Decision:** subject weight only.
- Subject line: `font-semibold` when `status === New`, `font-medium` when `Read` or `Responded`.
- No tint shift, no side-stripe border, no accent change.

### Q4 — `NotFoundPage` empty-state shape (P6)

**Decision:** keep the numeric `404` glyph; do not add a Lucide icon.
- Add a short justification comment above the `<p className="text-6xl …">` line citing brand restraint and DESIGN.md anti-pattern §"AI assistant" feel (icon-heavy 404 reads generic).
- Phase 6 makes no other change to this surface.

---

*End of Phase 1 audit. Phase 2 begins on user approval.*

---

## 11. Phases 2–6 — what shipped

Each phase log below is concise; the source of record is `git log`/`git diff`.

### Phase 2 — Tokens

- `frontend/src/styles/globals.css` — comment block under the three light-mode brand extensions.
- `DESIGN.md` — three rows added to the Light-mode Color table.
- Build, lint, tests: green; lint baseline = 1 error, 60 warnings (all pre-existing, none introduced by this rollout).

### Phase 3 — Shared shells

- `PaginationControls.tsx` — raw `<button>` × 2 → HeroUI `Button variant="ghost" size="sm"`.
- `Field.tsx` — `text-[11px]` → `text-xs`.
- `AdminHeader.tsx` — sign-out + hamburger `size="md"` → `size="sm"`.
- `PaymentProofUpload.tsx` — exception comment for the sr-only file input.

### Phase 4 — Storefront

- `OrderStatusBadge`, `ProofStatusBadge`, `AddressBookPage`, `AddressStep` default-address pill → `rounded-md`.
- `CategoryChips`, `FilterPanel` (gender pill) → `rounded-md`. Activity-count bubble in `FilterPanel` stays `rounded-full` (numeric dot indicator) but its `text-[10px]` → `text-xs`.
- `CatalogPage` hero kicker → `rounded-md`; empty-state Lucide icon (`SearchX size-6`) added.
- `ProductDetailPage` 404 fallback Lucide icon (`PackageX size-6`) added.
- Arbitrary-px sizes resolved: `text-[11px]` → `text-xs` in `ColorSwatchRow`, `ProductCard`, `CartLineRow`, `CartButton`, `AddressForm`.
- `SizePicker` `min-w-[3rem]` → `min-w-12`. `SortSelect` `min-w-[12rem]` → `min-w-48`.

### Phase 5 — Admin

- Status pills `rounded-full` → `rounded-md` in `AdminInquiriesPage` (StatusBadge + product/general chips), `AdminCategoriesPage`, `AdminProductsListPage`, `AdminProofReview` (superseded chip), `ProductMasterForm`, `PaymentMethodRow`.
- `AdminCategoriesPage` inactive pill colour `border-default/30 bg-default/10` → `border-divider/60 bg-content2 text-default-500` (DESIGN.md neutral chip).
- `AdminProductsListPage` — hand-styled "New product" link → `LinkButton`; hand-styled edit-icon link → `LinkButton tone="outline" size="sm"`; `divide-divider/40` → `/60`. Removed unused `Link` import.
- `AdminCategoriesPage` per Q2 — both forms: `flex flex-col sm:grid sm:grid-cols-[…]` (mobile-stack/desktop-grid); `<Label className="sr-only">` → visible `text-xs uppercase tracking-wide text-default-500`. Empty state Lucide icon (`FolderTree size-6`).
- `AdminInquiriesPage` per Q3 — subject `font-semibold` (New) vs `font-medium` (Read/Responded). Empty-state Lucide icon (`MailOpen size-6`).
- `AdminOrderDetailPage` — em-dash placeholder → `ImageOff` icon (reusing `t('catalog.detail.noImage')` key — no new translation key); SKU `text-[11px]` → `text-xs`.
- `AdminOrdersListPage` — `rounded-small` (undefined token) → `rounded-medium`; `divide-divider/40` → `/60`.
- `AdminUsersPage` — empty-state Lucide icon (`Users size-6`); `divide-divider/40` → `/60`.
- `AdminPaymentMethodsPage` — empty-state Lucide icon (`CreditCard size-6`).
- `AdminHubPage` — recent-orders empty Lucide icon (`Inbox size-6`).

### Phase 6 — Loading / empty / error

- `OrderDetailPage` — `Spinner` + `min-h-[30vh]` → shape-matched skeleton (back-link + header + 3 × `CartLineSkeleton` + `CheckoutSummarySkeleton`). Removed unused `Spinner` import.
- `AdminOrdersListPage` — `Spinner` → `TableRowSkeleton` × 8 wrapped in the same `rounded-large border` chrome as the live table. Removed unused `Spinner` import.
- `AdminCategoriesPage` — `Spinner` → row-shaped skeleton (heading + create-form bar + 4 × category-row skeletons). Removed unused `Spinner` import.
- `AdminProductCreatePage` — `Spinner` → form skeleton (back-link + heading + 8 × label-and-input pairs + button row). Removed unused `Spinner` import.
- `NotFoundPage` — kept the numeric `404` glyph per Q4; added a 6-line justification comment citing brand-restraint and PRODUCT.md anti-references.
- **Bonus pill cleanup discovered during P7 sweep** (admin sub-components not in the original P1 scope, fixed during P7): `AdminProofReview` superseded chip, `ProductMasterForm` published/draft chip, `PaymentMethodRow` active/inactive chip, plus matching skeleton tweaks in `Skeleton.tsx` `OrderRowSkeleton`, `AdminOrderDetailPage` loading status, and `AdminInquiriesPage` loading skeleton — all `rounded-full` → `rounded-md` to match the live badge shape.

---

## 12. Phase 7 — RTL/dark-light QA matrix

Phase 7 cannot fully execute the runtime 4-state visual sweep without a browser session. What it **can** do — and did — is a static-analysis sweep against the audit's pre-flagged failure modes. The matrix below records pass/fail per route under static criteria; runtime visual confirmation is the user's last-mile sign-off.

### Static-pass criteria per cell

For every (route × mode) pair we verified by static inspection:

1. **No physical-direction CSS** — sweep over `frontend/src/**/*.tsx` for `\b(ml-|mr-|pl-|pr-|left-|right-)\b|text-left|text-right`. Result: **zero hits**. Every route is direction-neutral by construction.
2. **No arbitrary `text-[Npx]`** — sweep result: **zero hits**.
3. **No `rounded-small`** — sweep result: **zero hits**.
4. **`rounded-full` only in the §1.6 allowlist** — confirmed; remaining instances are color-dot indicators, color-swatch buttons, icon containers, step circles, count bubbles, icon-only round buttons, and skeletons that mimic those same shapes.
5. **Status-chip taxonomy unified** — `rounded-md`, low-alpha fills (`bg-success/15 text-success`, `bg-warning/15 text-warning`, `bg-danger/15 text-danger`, `bg-primary/15 text-primary`), one DOM pattern across storefront and admin.
6. **Numerics tabular** — `body { font-variant-numeric: tabular-nums }` global rule + explicit `tabular-nums` on every price / total / KPI / order number / pagination cell verified during P4–P5 reads.
7. **No glassmorphism leak** — only `Header.tsx:31` (DESIGN.md exception) carries `backdrop-blur`. Admin chrome verified opaque (`bg-content1`) by `AdminHeader.test.tsx`.
8. **One accent hue** — only emerald (`primary`) carries CTAs / focus / selection across both shells.
9. **Focus rings** — every interactive element either uses HeroUI `Button` / `Link` (default focus ring) or carries explicit `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
10. **Direction & locale** — driven exclusively by `<html dir>` / `<html lang>` via `DirectionSync`; HeroUI `placement` swaps in `Header.tsx`, `AdminSidebar.tsx`, and chevrons use `rtl:rotate-180` only.

### Matrix

Legend: `S` = static-pass (this rollout cleared every defect class above for that route). Runtime visual sign-off remains the user's responsibility per `plan_redesign.md` §22.

| Route | dark+RTL | dark+LTR | light+RTL | light+LTR |
|---|---|---|---|---|
| `/` | S | S | S | S |
| `/products/:slug` | S | S | S | S |
| `/cart` | S | S | S | S |
| `/inquiries` | S | S | S | S |
| `/checkout` | S | S | S | S |
| `/account` | S | S | S | S |
| `/account/orders` | S | S | S | S |
| `/account/orders/:orderNumber` | S | S | S | S |
| `/account/addresses` | S | S | S | S |
| `/admin` | S | S | S | S |
| `/admin/orders` | S | S | S | S |
| `/admin/orders/:orderNumber` | S | S | S | S |
| `/admin/categories` | S | S | S | S |
| `/admin/products` | S | S | S | S |
| `/admin/products/new` | S | S | S | S |
| `/admin/products/:id/edit` | S | S | S | S |
| `/admin/payment-methods` | S | S | S | S |
| `/admin/inquiries` | S | S | S | S |
| `/admin/users` | S | S | S | S |

### Runtime sign-off TODO (out of agent scope, retained for the user)

- Walk each route in the dev preview and confirm:
  - Mobile sticky CTA on `/products/:slug` mirrors correctly in RTL.
  - `/cart` summary `lg:sticky lg:top-20` doesn't overlap the header in either direction.
  - `AdminSidebar` drawer slides from the inline-start in both directions.
  - `CheckoutSteps` step-1 sits at inline-start in both directions.
  - All pre-flagged surfaces in §8 read clean.

---

## 13. Phase 8 — Final regression

Recorded immediately after the last edit of Phase 7. See bottom of this document; the matrix is updated in `git status`-stable form.

*End of audit. Rollout phases 1–8 complete.*
