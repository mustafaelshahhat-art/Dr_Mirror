# Phase 1 — Data Model

**Feature**: Admin / Customer Separation & Production Polish
**Date**: 2026-05-15

## Scope

This feature is a routing and shell refactor. **No database schema change is introduced.**
All persistence-layer entities (`User`, `Role`, `UserRole`, `Order`, `Cart`, `CartItem`,
`Address`, `Product`, `ProductVariant`, `ProductImage`, `Category`, `PaymentMethod`,
`Inquiry`, `OrderCounter`, refresh tokens) remain exactly as documented in `PROJECT_MAP.md`.

The data model worth recording here is the **client-side authentication model** that drives
the role-aware routing behavior. It is derived state, not new persisted state.

## Client auth model (derived)

### `AuthUser` (existing, unchanged shape)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Identity user id (Guid string). |
| `email` | `string` | Login identifier. |
| `fullName` | `string` | Display name on the account chip. |
| `roles` | `string[]` | Role names. Source of truth for `isAdmin`. |

**Validation** (from server contract):

- `roles` is always an array; absence is encoded as `[]`, never `null` or `undefined`.
- Role names are case-sensitive and match the seeded Identity role names; `'Admin'` is the
  only role considered by this feature.

### `AuthContextValue` (existing — fields **added** in this feature marked ➕)

| Field | Type | Notes |
| --- | --- | --- |
| `user` | `AuthUser \| null` | Current authenticated user. |
| `isAuthenticated` | `boolean` | `user !== null`. |
| `isBootstrapping` | `boolean` | True until initial `/auth/refresh` resolves. |
| ➕ `isAdmin` | `boolean` | `user?.roles.includes('Admin') ?? false`. Memoized. |
| `login(input)` | `(LoginInput) => Promise<AuthUser>` | Unchanged. |
| `register(input)` | `(RegisterInput) => Promise<AuthUser>` | Unchanged. |
| `logout()` | `() => Promise<void>` | Unchanged. |

**Rationale for `isAdmin` on the context**: every route gate and every navigation decision
needs the same flag. Computing it once on the provider gives one place to test and prevents
drift between consumers.

## Routing state model

### Post-sign-in destination resolution

A single pure helper governs every "where should this user land" decision:

```text
resolvePostAuthDestination(user: AuthUser, from: string | null): string
```

**Inputs**

- `user` — the authenticated user (must be non-null when this is called).
- `from` — the URL the user was trying to reach before sign-in, or `null` if they came
  directly to `/login` or `/register`.

**Output** — a single URL path.

**Rules**

1. If `user.roles` includes `'Admin'`:
   - If `from` is non-null AND `from` starts with `/admin`, return `from`.
   - Otherwise return `/admin`.
2. If `user.roles` does NOT include `'Admin'`:
   - If `from` is non-null AND `from` does NOT start with `/admin`, return `from`.
   - Otherwise return `/`.

**Invariants**

- An admin NEVER receives a non-admin URL as the destination.
- A non-admin NEVER receives an admin URL as the destination.
- Anonymous deep links into the admin surface for an admin are preserved (FR-001 + edge case
  4 in the spec).

### Route gate matrix

| Gate | Anonymous | Authed buyer | Authed admin |
| --- | --- | --- | --- |
| `PublicOnlyRoute` (wraps `/login`, `/register`) | Render | Redirect → `/` | Redirect → `/admin` |
| `CustomerRoute` (wraps `/`, `/products/*`, `/cart`) | Render | Render | Redirect → `/admin` |
| `ProtectedRoute` (wraps `/checkout`, `/account/*`) | Redirect → `/login?from=...` | Render | Redirect → `/admin` |
| `AdminRoute` (wraps `/admin/*`) | Redirect → `/login?from=...` | Redirect → `/` | Render |

All gates BLOCK on `isBootstrapping`; while bootstrapping, the gate renders a centered
spinner — never the underlying page — so no flash of unauthorized content is possible.

## Server-side authorization model (unchanged, recorded for traceability)

Every `/api/admin/*` endpoint is mounted under `MapAdminEndpoints` and applies
`RequireRole('Admin')`. No code change is introduced; an xUnit invariant test (described in
the contracts directory) ensures this remains true as endpoints are added.

| Surface | Endpoint group | Server gate |
| --- | --- | --- |
| Admin orders | `/api/admin/orders/*` | JWT + `RequireRole('Admin')` |
| Admin catalog | `/api/admin/categories/*`, `/api/admin/products/*` | JWT + `RequireRole('Admin')` |
| Admin payments | `/api/admin/payment-methods/*` | JWT + `RequireRole('Admin')` |
| Admin inquiries | `/api/admin/inquiries/*` | JWT + `RequireRole('Admin')` |
| Admin users | `/api/admin/users/*` | JWT + `RequireRole('Admin')` |

## State transitions

This feature introduces no new entity state machines. The existing `OrderStateMachine`
(`Pending → Confirmed → PendingPaymentReview → Paid → Preparing → Shipped → Delivered`, with
`Cancelled` as a terminal alternate) is unchanged.

The only "state transition" introduced is the **role transition** of a single user (Admin
role granted or removed by an admin via `/admin/users`). The behavioral spec for the
transition is in the spec.md edge cases:

- Grant Admin role → next authenticated render routes as admin (no manual sign-out).
- Remove Admin role → next authenticated render routes as buyer. In-flight admin requests
  return 403 from the server (per existing `RequireRole`), and the SPA surfaces a friendly
  403 banner (FR-015).

This is enforced behaviorally by the routing model above; no schema state need persist.
