# Phase H screenshot checklist

Capture each of the surfaces below in all four states. Filenames follow
`phase-H__<surface>__<theme>-<direction>.png`. Phase H is a polish / micro-craft
pass; the matrix biases toward error shells (which now carry the Phase D
`enter-fade-up` and Phase H copy verification), the `AuditLogPage` em-dash fix,
and a sampling of pages whose top-level section gap moved from `space-y-5` /
`space-y-6` to `space-y-8`.

## Error shells (Phase D motion verified + Phase H copy verified)

| Page / surface | dark-rtl | dark-ltr | light-rtl | light-ltr |
|----------------|----------|----------|-----------|-----------|
| NotFoundPage (404 — storefront route) | `phase-H__notfound-store__dark-rtl.png` | `phase-H__notfound-store__dark-ltr.png` | `phase-H__notfound-store__light-rtl.png` | `phase-H__notfound-store__light-ltr.png` |
| NotFoundPage (404 — `/admin/*` route) | `phase-H__notfound-admin__dark-rtl.png` | `phase-H__notfound-admin__dark-ltr.png` | `phase-H__notfound-admin__light-rtl.png` | `phase-H__notfound-admin__light-ltr.png` |
| ForbiddenBanner (403 surface) | `phase-H__forbidden-banner__dark-rtl.png` | `phase-H__forbidden-banner__dark-ltr.png` | `phase-H__forbidden-banner__light-rtl.png` | `phase-H__forbidden-banner__light-ltr.png` |
| DowntimeBanner (503 surface) | `phase-H__downtime-banner__dark-rtl.png` | `phase-H__downtime-banner__dark-ltr.png` | `phase-H__downtime-banner__light-rtl.png` | `phase-H__downtime-banner__light-ltr.png` |

## Audit log em-dash fix

| Page / surface | dark-rtl | dark-ltr | light-rtl | light-ltr |
|----------------|----------|----------|-----------|-----------|
| AuditLogPage (`/admin/audit`) — capture the status column with both a transition row (`prev → next`) and a no-transition row (middle-dot `·` separator) visible | `phase-H__auditlog__dark-rtl.png` | `phase-H__auditlog__dark-ltr.png` | `phase-H__auditlog__light-rtl.png` | `phase-H__auditlog__light-ltr.png` |

## Spacing rhythm sampling (top-level section gap → `space-y-8`)

| Page / surface | dark-rtl | dark-ltr | light-rtl | light-ltr |
|----------------|----------|----------|-----------|-----------|
| CartPage (`/cart`) | `phase-H__cartpage__dark-rtl.png` | `phase-H__cartpage__dark-ltr.png` | `phase-H__cartpage__light-rtl.png` | `phase-H__cartpage__light-ltr.png` |
| OrderDetailPage (`/account/orders/:orderNumber`) | `phase-H__order-detail__dark-rtl.png` | `phase-H__order-detail__dark-ltr.png` | `phase-H__order-detail__light-rtl.png` | `phase-H__order-detail__light-ltr.png` |
| OrdersListPage (`/account/orders`) | `phase-H__orders-list__dark-rtl.png` | `phase-H__orders-list__dark-ltr.png` | `phase-H__orders-list__light-rtl.png` | `phase-H__orders-list__light-ltr.png` |
| AddressBookPage (`/account/addresses`) | `phase-H__address-book__dark-rtl.png` | `phase-H__address-book__dark-ltr.png` | `phase-H__address-book__light-rtl.png` | `phase-H__address-book__light-ltr.png` |
| ProductDetailPage (`/products/:slug`) | `phase-H__product-detail__dark-rtl.png` | `phase-H__product-detail__dark-ltr.png` | `phase-H__product-detail__light-rtl.png` | `phase-H__product-detail__light-ltr.png` |
| InquiriesPage (`/inquiries`) | `phase-H__inquiries-page__dark-rtl.png` | `phase-H__inquiries-page__dark-ltr.png` | `phase-H__inquiries-page__light-rtl.png` | `phase-H__inquiries-page__light-ltr.png` |
| CheckoutPage (`/checkout`) | `phase-H__checkout__dark-rtl.png` | `phase-H__checkout__dark-ltr.png` | `phase-H__checkout__light-rtl.png` | `phase-H__checkout__light-ltr.png` |
| AdminHubPage (`/admin`) | `phase-H__admin-hub__dark-rtl.png` | `phase-H__admin-hub__dark-ltr.png` | `phase-H__admin-hub__light-rtl.png` | `phase-H__admin-hub__light-ltr.png` |
| AdminOrdersListPage (`/admin/orders`) | `phase-H__admin-orders__dark-rtl.png` | `phase-H__admin-orders__dark-ltr.png` | `phase-H__admin-orders__light-rtl.png` | `phase-H__admin-orders__light-ltr.png` |
| AdminOrderDetailPage (`/admin/orders/:orderNumber`) | `phase-H__admin-order-detail__dark-rtl.png` | `phase-H__admin-order-detail__dark-ltr.png` | `phase-H__admin-order-detail__light-rtl.png` | `phase-H__admin-order-detail__light-ltr.png` |
| AdminUsersPage (`/admin/users`) | `phase-H__admin-users__dark-rtl.png` | `phase-H__admin-users__dark-ltr.png` | `phase-H__admin-users__light-rtl.png` | `phase-H__admin-users__light-ltr.png` |
| AdminInquiriesPage (`/admin/inquiries`) | `phase-H__admin-inquiries__dark-rtl.png` | `phase-H__admin-inquiries__dark-ltr.png` | `phase-H__admin-inquiries__light-rtl.png` | `phase-H__admin-inquiries__light-ltr.png` |
| AdminProductsListPage (`/admin/products`) | `phase-H__admin-products__dark-rtl.png` | `phase-H__admin-products__dark-ltr.png` | `phase-H__admin-products__light-rtl.png` | `phase-H__admin-products__light-ltr.png` |
| AdminProductEditPage (`/admin/products/:id/edit`) | `phase-H__admin-product-edit__dark-rtl.png` | `phase-H__admin-product-edit__dark-ltr.png` | `phase-H__admin-product-edit__light-rtl.png` | `phase-H__admin-product-edit__light-ltr.png` |
| AdminProductCreatePage (`/admin/products/new`) | `phase-H__admin-product-create__dark-rtl.png` | `phase-H__admin-product-create__dark-ltr.png` | `phase-H__admin-product-create__light-rtl.png` | `phase-H__admin-product-create__light-ltr.png` |
| AdminCategoriesPage (`/admin/categories`) | `phase-H__admin-categories__dark-rtl.png` | `phase-H__admin-categories__dark-ltr.png` | `phase-H__admin-categories__light-rtl.png` | `phase-H__admin-categories__light-ltr.png` |
| AdminPaymentMethodsPage (`/admin/payment-methods`) | `phase-H__admin-payments__dark-rtl.png` | `phase-H__admin-payments__dark-ltr.png` | `phase-H__admin-payments__light-rtl.png` | `phase-H__admin-payments__light-ltr.png` |

Capture procedure recap:

- Storefront skip-link verification: from a cold page load (any storefront
  route, in any of the four states), the first Tab stop MUST land on the
  skip-link in `Layout.tsx`. Capture is optional; logged as a Phase H assertion.
- Admin skip-link verification: same as above against `AdminLayout.tsx`. Capture
  is optional.
- Typography / focus-ring / cursor / tabular-nums verifications under Phase H
  are sweep-based, not screenshot-based. No PNGs required.

Commit the PNGs as `docs(ui): phase H screenshots`.
