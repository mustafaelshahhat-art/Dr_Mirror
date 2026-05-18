# Contract: `<PaginationControls>` (adapter shim around HeroUI Pagination)

**Location**: `frontend/src/shared/components/PaginationControls.tsx` (existing — internals replaced in Phase C)

**Purpose**: Preserve the existing public API of `PaginationControls` so all six consumers continue to work without call-site changes, while delegating the rendering to HeroUI v3's `Pagination` primitive.

## Public API (UNCHANGED)

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `page` | `number` | yes | 1-indexed current page. |
| `totalPages` | `number` | yes | Total number of pages. |
| `onPageChange` | `(nextPage: number) => void` | yes | Called when the user changes pages. |
| `disabled` | `boolean` | no | If true, all controls are disabled. |
| `aria-label` | `string` | no | Accessible label for the pagination region; defaults to `t('common.pagination.label')`. |
| `className` | `string` | no | Optional class on the outer wrapper. |

These props MUST NOT change. The shim handles the mapping to HeroUI's API internally.

## Mapping to HeroUI `Pagination`

HeroUI v3 `Pagination` exposes:
- `page` (1-indexed) — maps 1:1 from `page`.
- `total` — maps from `totalPages`.
- `onChange(page: number)` — maps from `onPageChange`.
- `isDisabled` — maps from `disabled`.

Other HeroUI `Pagination` props (`showControls`, `siblings`, etc.) are set by `PaginationControls` to defaults that match today's visual: `showControls` true, default sibling count.

## i18n keys

All existing i18n keys used by `PaginationControls` today MUST remain. If HeroUI's `Pagination` introduces any user-facing string the existing keys do not cover (e.g., "next page", "previous page" tooltips), the keys MUST already exist in both `ar` and `en` — else a stop condition fires for Phase C.

Today's `PaginationControls` consumers use these aria-labels (verified against the existing component at `frontend/src/shared/components/PaginationControls.tsx`):
- `common.pagination.previous`
- `common.pagination.next`
- `common.pagination.label`

HeroUI `Pagination` accepts these via `getItemAriaLabel` or per-control props; the shim wires them so the visible accessible labels are unchanged.

## Consumers (verified)

The shim MUST be verified against all six existing call sites:

1. `frontend/src/features/orders/OrdersListPage.tsx`
2. `frontend/src/features/admin/AdminUsersPage.tsx`
3. `frontend/src/features/admin/AdminInquiriesPage.tsx`
4. `frontend/src/features/admin/AdminProductsListPage.tsx` (or equivalent admin products list)
5. `frontend/src/features/admin/audit/AuditLogPage.tsx`
6. `frontend/src/features/catalog/components/PaginationBar.tsx` (used by `CatalogPage`)

For each consumer, the four-state matrix screenshot (dark-rtl, dark-ltr, light-rtl, light-ltr) MUST show the pagination region in the same visual position and with the same accessible labels as before the swap.

## Tests

Existing `PaginationControls` tests MUST pass without changes. If any existing test asserts on internal DOM structure (rather than behavior), it MAY be updated in this phase to assert on accessible name / role queries instead — but no test is deleted.

A new test verifying RTL behavior MAY be added: when wrapped in `dir="rtl"`, "previous" and "next" controls swap visually but their accessible labels remain semantically correct (`previous` is `previous`).
