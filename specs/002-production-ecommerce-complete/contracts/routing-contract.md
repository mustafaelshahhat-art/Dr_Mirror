# Routing Contract

**Feature**: 002-production-ecommerce-complete  
**Scope**: Frontend route tree + access control rules

---

## Customer Shell — `<Layout />` + `<Header />`

| Route | Guard | Component | Notes |
|---|---|---|---|
| `/` | `<CustomerRoute />` | `CatalogPage` | Admins are redirected to `/admin` |
| `/products/:slug` | `<CustomerRoute />` | `ProductDetailPage` | |
| `/cart` | `<CustomerRoute />` | `CartPage` | |
| `/login` | `<PublicOnlyRoute />` | `LoginPage` | Redirects to `/admin` or `/` if already authed |
| `/register` | `<PublicOnlyRoute />` | `RegisterPage` | Same redirect logic |
| `/checkout` | `<ProtectedRoute />` | `CheckoutPage` | Requires authenticated buyer |
| `/account` | `<ProtectedRoute />` | `AccountShellPage` | Buyer dashboard — currently a stub |
| `/account/orders` | `<ProtectedRoute />` | `OrdersListPage` | |
| `/account/orders/:orderNumber` | `<ProtectedRoute />` | `OrderDetailPage` | |
| `/account/addresses` | `<ProtectedRoute />` | `AddressBookPage` | |

---

## Admin Shell — `<AdminLayout />` + `<AdminSidebar />` + `<AdminHeader />`

| Route | Guard | Component | Notes |
|---|---|---|---|
| `/admin` | `<AdminRoute />` | `AdminHubPage` | Dashboard / KPI landing |
| `/admin/orders` | `<AdminRoute />` | `AdminOrdersListPage` | |
| `/admin/orders/:orderNumber` | `<AdminRoute />` | `AdminOrderDetailPage` | |
| `/admin/categories` | `<AdminRoute />` | `AdminCategoriesPage` | |
| `/admin/products` | `<AdminRoute />` | `AdminProductsListPage` | |
| `/admin/products/new` | `<AdminRoute />` | `AdminProductCreatePage` | |
| `/admin/products/:id/edit` | `<AdminRoute />` | `AdminProductEditPage` | |
| `/admin/payment-methods` | `<AdminRoute />` | `AdminPaymentMethodsPage` | |
| `/admin/inquiries` | `<AdminRoute />` | `AdminInquiriesPage` | |
| `/admin/users` | `<AdminRoute />` | `AdminUsersPage` | |

---

## Guard Semantics

| Guard | Condition | Redirect |
|---|---|---|
| `<PublicOnlyRoute />` | Not authenticated | Pass-through |
| `<PublicOnlyRoute />` | Authenticated as Admin | → `/admin` |
| `<PublicOnlyRoute />` | Authenticated as Buyer | → recorded `from` or `/` |
| `<CustomerRoute />` | Admin tries to access | → `/admin` |
| `<ProtectedRoute />` | Not authenticated | → `/login?from=<path>` |
| `<AdminRoute />` | Not authenticated | → `/login` |
| `<AdminRoute />` | Authenticated as Buyer | → `/forbidden` (or ForbiddenBanner) |

---

## Post-Auth Destination Rules (`resolvePostAuthDestination`)

1. If `user.roles.includes('Admin')` → always `/admin`
2. Else if `from` param is set and `from` does not start with `/admin` → `from`
3. Else → `/`

---

## API Route Prefixes (Backend)

| Prefix | Auth Requirement | Rate Limit |
|---|---|---|
| `/api/auth/*` | None (except `/me`, `/logout`) | Standard |
| `/api/catalog/*` | None | Standard |
| `/api/cart/*` | Bearer JWT (Buyer) | Standard |
| `/api/orders/*` | Bearer JWT (Buyer, owns order) | Standard |
| `/api/checkout/*` | Bearer JWT (Buyer) | Standard |
| `/api/addresses/*` | Bearer JWT (Buyer) | Standard |
| `/api/inquiries` (POST) | None | Standard |
| `/api/admin/*` | Bearer JWT + Role=Admin | 120 req/min per user |
