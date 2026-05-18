# Contract: `<Snippet>` (in-house wrapper)

**Location**: `frontend/src/shared/components/Snippet.tsx` (NEW in Phase C)

**Purpose**: Provide a copy-to-clipboard control whose API matches HeroUI v2's `Snippet` in spirit, because HeroUI v3 ships no equivalent and the pass forbids new dependencies.

**Composition (implementation note, not contract)**: HeroUI `Button isIconOnly` + HeroUI `Tooltip` + Lucide `Copy` / `Check`. No other primitives.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `string` | yes | The string written to the clipboard on click. |
| `children` | `ReactNode` | yes | The visible content rendered alongside the copy button (e.g., an order number, an Instapay handle). The component MUST NOT replace this — it sits beside it. |
| `aria-label` | `string` | yes | Accessible name for the copy button. Defaults to the i18n key `common.copy` if not provided; if that key is missing, the component throws at build/dev time (no silent fallback). |
| `className` | `string` | no | Optional class applied to the outer wrapper. |
| `tooltipPlacement` | `"top" \| "bottom" \| "start" \| "end"` | no | Default `"top"`. |

## Behavior

1. On click, write `value` to the clipboard via `navigator.clipboard.writeText(value)`.
2. Swap the button icon from `Copy` → `Check` for ~1500ms, then revert.
3. While the "copied" state is active, the tooltip content reads the i18n key `common.copied` instead of `common.copy`. If `common.copied` is missing, the tooltip falls back to the same value as `common.copy` (this is the one allowed fallback because the icon swap is itself the primary feedback signal).
4. The button is a HeroUI `Button isIconOnly` with `variant="ghost"`, `size="sm"`, and `aria-label` from props (or i18n default).
5. The component MUST work in RTL: it uses logical placement for the tooltip (`"start"`/`"end"`) rather than `"left"`/`"right"`.
6. The component MUST respect `prefers-reduced-motion`: no icon-swap animation when the user prefers reduced motion (the swap is instantaneous).
7. The component MUST NOT capture or alter keyboard focus beyond what HeroUI `Button` already does.

## Adoption sites (Phase C)

| Site | Current code | After |
|------|--------------|-------|
| `features/orders/components/PaymentInstructionsCard.tsx:71–86` | hand-rolled `<span>` + `<button>` + manual `setTimeout` | `<Snippet value={instapayHandle} aria-label={t('payment.copy.handle')}>{instapayHandle}</Snippet>` |
| `features/orders/OrderDetailPage.tsx` (near H1) | none | `<Snippet value={order.orderNumber} aria-label={t('order.copy.number')}>` placed as a side-element next to the existing `<h1>` (not replacing it) |
| `features/admin/AdminOrderDetailPage.tsx` (near H1) | none | same shape as storefront `OrderDetailPage` |

## Tests

A minimal `Snippet.test.tsx` MUST cover:

1. Clicking the button calls `navigator.clipboard.writeText` with the `value` prop.
2. After the click, the rendered icon changes to `Check` (queryable by `aria-hidden` icon role or `data-testid`).
3. The button's `aria-label` is present and equals the prop value.
4. In RTL (`<div dir="rtl">…</div>`), the tooltip placement uses logical `start`/`end`.

This test sits at `frontend/src/shared/components/Snippet.test.tsx` and adds to the pre-flight test count — the recorded baseline for phases after C accounts for it.
