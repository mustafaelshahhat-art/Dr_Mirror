# Contract — Client-Side Routing

**Feature**: Admin / Customer Separation & Production Polish
**Surface**: `frontend/src/app/router.tsx` + `frontend/src/features/auth/ProtectedRoute.tsx`
+ post-auth navigation in `LoginPage.tsx` / `RegisterPage.tsx`.

This document defines the observable behavior of the route gates and the post-auth redirect
helper. It is the contract every test (manual or automated) MUST verify.

## 1. Route gates

### 1.1 `<PublicOnlyRoute />`

Wraps `/login` and `/register`.

| Input | Expected output |
| --- | --- |
| Anonymous user | Renders the wrapped page. |
| Authenticated buyer | `<Navigate to="/" replace />` |
| Authenticated admin | `<Navigate to="/admin" replace />` |
| Bootstrapping (`isBootstrapping === true`) | Renders a centered `<Spinner />`. |

### 1.2 `<CustomerRoute />` (NEW)

Wraps `/`, `/products/:slug`, `/cart`.

| Input | Expected output |
| --- | --- |
| Anonymous user | Renders the wrapped page. |
| Authenticated buyer | Renders the wrapped page. |
| Authenticated admin | `<Navigate to="/admin" replace />` |
| Bootstrapping | Renders a centered `<Spinner />`. |

### 1.3 `<ProtectedRoute />`

Wraps `/checkout`, `/account`, `/account/orders`, `/account/orders/:orderNumber`,
`/account/addresses`.

| Input | Expected output |
| --- | --- |
| Anonymous user | `<Navigate to="/login" replace state={{ from: location }} />` |
| Authenticated buyer | Renders the wrapped page. |
| Authenticated admin | `<Navigate to="/admin" replace />` |
| Bootstrapping | Renders a centered `<Spinner />`. |

### 1.4 `<AdminRoute />`

Wraps every `/admin/*` route.

| Input | Expected output |
| --- | --- |
| Anonymous user | `<Navigate to="/login" replace state={{ from: location }} />` |
| Authenticated buyer | `<Navigate to="/" replace />` |
| Authenticated admin | Renders the wrapped page (inside `<AdminLayout />`). |
| Bootstrapping | Renders a centered `<Spinner />`. |

## 2. Post-auth destination helper

```text
resolvePostAuthDestination(user, from): string
```

**Signature**

- `user: AuthUser` — must be non-null at call time.
- `from: string | null` — the URL path the user was trying to reach pre-auth.

**Behavior table**

| `user.roles` includes `'Admin'` | `from` value | Returned destination |
| --- | --- | --- |
| Yes | `null` | `/admin` |
| Yes | starts with `/admin` (e.g., `/admin/orders/DM-2026-000123`) | `from` (preserved) |
| Yes | anything else (e.g., `/`, `/cart`, `/products/scrub-top`) | `/admin` |
| No | `null` | `/` |
| No | starts with `/admin` | `/` |
| No | anything else | `from` (preserved) |

**Test cases the implementation MUST satisfy**

| # | `roles` | `from` | Expected |
| --- | --- | --- | --- |
| T1 | `['Admin']` | `null` | `/admin` |
| T2 | `['Admin']` | `'/admin/orders'` | `/admin/orders` |
| T3 | `['Admin']` | `'/cart'` | `/admin` |
| T4 | `[]` | `null` | `/` |
| T5 | `['Buyer']` | `'/account/orders'` | `/account/orders` |
| T6 | `[]` | `'/admin'` | `/` |
| T7 | `['Admin', 'Buyer']` | `'/admin/products/new'` | `/admin/products/new` |

## 3. Caller obligations

- `LoginPage` MUST call `resolvePostAuthDestination(user, location.state?.from?.pathname ??
  null)` and pass the result to `navigate(dest, { replace: true })`. No exceptions for
  edge-case URL shapes.
- `RegisterPage` MUST do the same. Today it always navigates to `/`, ignoring `from`. The fix
  uses the same helper so a buyer who deep-links to `/cart`, bounces to `/login`, then
  switches to `/register`, lands on `/cart` after registering.
- `PublicOnlyRoute` MUST use the helper internally so its "already signed in" redirect uses
  the same rule.

## 4. Non-goals

- This contract does NOT cover deep-linked post-sign-in routing for query strings or hash
  fragments. The current router uses path-only `from` and that remains.
- It does NOT introduce a 'view-as-customer' mode. An admin trying to reach `/cart` is
  always redirected.
- It does NOT remove the server-side `RequireRole('Admin')` enforcement; it adds a UX
  optimization on top of it.
