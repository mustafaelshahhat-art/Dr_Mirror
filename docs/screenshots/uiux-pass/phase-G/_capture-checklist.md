# Phase G screenshot checklist

Phase G is semantics, not visuals — most additions (`aria-busy`, shared
`aria-live` region, `aria-label` audit) produce **no visual artifact**.
Capture each row below in all four (theme × direction) states and save with
the expected filename. For the semantics-only rows, the PNG documents the
shell with the dev-tools accessibility tree open (or note "no visual
artifact" if the inspector cannot be captured).

| Page / surface | dark-rtl | dark-ltr | light-rtl | light-ltr |
|----------------|----------|----------|-----------|-----------|
| Storefront shell — Layout with `LiveRegion` (a11y tree) | `phase-G__storefront-shell__dark-rtl.png` | `phase-G__storefront-shell__dark-ltr.png` | `phase-G__storefront-shell__light-rtl.png` | `phase-G__storefront-shell__light-ltr.png` |
| Admin shell — AdminLayout with `LiveRegion` (a11y tree) | `phase-G__admin-shell__dark-rtl.png` | `phase-G__admin-shell__dark-ltr.png` | `phase-G__admin-shell__light-rtl.png` | `phase-G__admin-shell__light-ltr.png` |
| CatalogPage product grid (aria-busy during refetch) | `phase-G__catalog__dark-rtl.png` | `phase-G__catalog__dark-ltr.png` | `phase-G__catalog__light-rtl.png` | `phase-G__catalog__light-ltr.png` |
| OrdersListPage list (aria-busy during refetch) | `phase-G__orders-list__dark-rtl.png` | `phase-G__orders-list__dark-ltr.png` | `phase-G__orders-list__light-rtl.png` | `phase-G__orders-list__light-ltr.png` |
| AddressBookPage list (aria-busy during mutation) | `phase-G__address-book__dark-rtl.png` | `phase-G__address-book__dark-ltr.png` | `phase-G__address-book__light-rtl.png` | `phase-G__address-book__light-ltr.png` |
| CartPage line list (aria-busy during mutation) | `phase-G__cart__dark-rtl.png` | `phase-G__cart__dark-ltr.png` | `phase-G__cart__light-rtl.png` | `phase-G__cart__light-ltr.png` |
| AdminUsersPage table (aria-busy during refetch) | `phase-G__admin-users__dark-rtl.png` | `phase-G__admin-users__dark-ltr.png` | `phase-G__admin-users__light-rtl.png` | `phase-G__admin-users__light-ltr.png` |
| AdminInquiriesPage list (aria-busy during refetch) | `phase-G__admin-inquiries__dark-rtl.png` | `phase-G__admin-inquiries__dark-ltr.png` | `phase-G__admin-inquiries__light-rtl.png` | `phase-G__admin-inquiries__light-ltr.png` |
| AdminProductsListPage table (aria-busy during refetch) | `phase-G__admin-products__dark-rtl.png` | `phase-G__admin-products__dark-ltr.png` | `phase-G__admin-products__light-rtl.png` | `phase-G__admin-products__light-ltr.png` |
| AdminCategoriesPage list (aria-busy during mutation) | `phase-G__admin-categories__dark-rtl.png` | `phase-G__admin-categories__dark-ltr.png` | `phase-G__admin-categories__light-rtl.png` | `phase-G__admin-categories__light-ltr.png` |
| AdminPaymentMethodsPage list (aria-busy during mutation) | `phase-G__admin-payment-methods__dark-rtl.png` | `phase-G__admin-payment-methods__dark-ltr.png` | `phase-G__admin-payment-methods__light-rtl.png` | `phase-G__admin-payment-methods__light-ltr.png` |
| AuditLogPage table (aria-busy during refetch) | `phase-G__audit-log__dark-rtl.png` | `phase-G__audit-log__dark-ltr.png` | `phase-G__audit-log__light-rtl.png` | `phase-G__audit-log__light-ltr.png` |
| AdminHubPage recent-orders section (aria-busy during refetch) | `phase-G__admin-hub__dark-rtl.png` | `phase-G__admin-hub__dark-ltr.png` | `phase-G__admin-hub__light-rtl.png` | `phase-G__admin-hub__light-ltr.png` |

Commit the PNGs as `docs(ui): phase G screenshots`.
