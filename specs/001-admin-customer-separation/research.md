# Phase 0 — Research & Codebase Analysis

**Feature**: Admin / Customer Separation & Production Polish
**Spec**: [spec.md](./spec.md)
**Date**: 2026-05-15

Inputs reviewed: `README.md`, `PROJECT_MAP.md`, `DESIGN_PRINCIPLES.md`, `AGENTS.md`,
`.specify/memory/constitution.md`, `frontend/src/app/router.tsx`,
`frontend/src/features/auth/AuthProvider.tsx`,
`frontend/src/features/auth/ProtectedRoute.tsx`,
`frontend/src/features/auth/LoginPage.tsx`,
`frontend/src/features/auth/RegisterPage.tsx`, `frontend/src/shared/components/Header.tsx`,
`frontend/src/shared/components/Layout.tsx`,
`frontend/src/features/admin/AdminHubPage.tsx`,
`backend/src/DrMirror.Api/Features/Admin/AdminEndpoints.cs`,
`backend/src/DrMirror.Api/Program.cs`,
`backend/tests/DrMirror.Tests/Security/*`.

## 1. Findings — what is in place today

- **Backend authorization is correct.** Every admin endpoint sits under
  `app.MapAdminEndpoints()` and applies `RequireRole(Admin)` per slice. xUnit security tests
  (`AdminActorGuardTests`, `OrderOwnershipTests`, `UserRoleSecurityTests`) confirm role gating
  on the order state machine and ownership checks. Server-side access control is **not** the
  problem this feature addresses.
- **Frontend admin route gate exists but is permissive.** `AdminRoute` in
  `frontend/src/features/auth/ProtectedRoute.tsx` correctly redirects non-admins away from
  `/admin/*`, but the inverse (kicking admins off `/`, `/products/*`, `/cart`, `/checkout`,
  `/account/*`) is not implemented.
- **Post-login redirect ignores role.** `LoginPage` navigates to `location.state.from.pathname
  ?? '/'` after a successful sign-in. Admins consequently land on the public catalog on every
  sign-in. `RegisterPage` always navigates to `/`.
- **`PublicOnlyRoute` always redirects to `/`.** When an authenticated user lands on `/login`
  or `/register`, the gate sends them to `/` regardless of role — wrong for admins.
- **Admin pages render inside the customer shell.** `AdminRoute` is nested under `<Layout />`
  in `router.tsx`. That means admins see the customer `Header` (brand link to `/`, cart icon,
  buyer-account link, sign-in button) while viewing admin pages — every reason a staff member
  could accidentally drift back into the storefront.
- **No "isAdmin" derived state.** Every consumer recomputes `user.roles.includes('Admin')`.
  Centralizing this on the auth context is a small refactor that compresses the role-routing
  logic and gives us one place to test.
- **Some admin features already exist** (`/admin`, `/admin/orders`, `/admin/products`,
  `/admin/categories`, `/admin/payment-methods`, `/admin/inquiries`, `/admin/users`). The
  Admin Hub is a tile grid — no persistent admin sidebar, no admin-scoped chrome.

## 2. Codebase-analysis output (production-readiness sweep)

Discovered issues clustered by category. Each is rated **MUST-FIX** (blocks this feature),
**SHOULD-FIX** (in-scope polish per FR-016..023), or **DEFER** (record in
`PROJECT_MAP.md`'s `[ORPHANS & PENDING]`).

### 2.1 Routing & shell (MUST-FIX — these are the feature)

- **Admin role-aware post-login redirect missing.** `LoginPage` / `RegisterPage` ignore role.
- **No `CustomerRoute` gate.** Admins can hit `/`, `/products/*`, `/cart`, `/checkout`,
  `/account/*` directly.
- **No dedicated `AdminLayout`.** Admin pages reuse the customer `Layout` + `Header`.
- **`PublicOnlyRoute` is role-blind.** Authenticated admins landing on `/login` get pushed
  to `/` instead of `/admin`.
- **`AuthProvider` does not expose `isAdmin`.** Consumers recompute it locally.

### 2.2 UX / a11y (SHOULD-FIX — bounded polish)

- **Admin Hub is the only admin nav.** No persistent sidebar or breadcrumb — every navigation
  is a click back to `/admin` then a click into another tile. With four to six daily-use
  surfaces, a sidebar is justified.
- **Header sign-in button uses raw `<Link>` styled as a button.** Functional, but inconsistent
  with HeroUI button variants used elsewhere. Easy to bring in line.
- **No "loading session" indicator at the page level for `AdminRoute` / `ProtectedRoute`
  bootstrap.** They render a full-screen spinner — fine — but the customer `Header` flashes
  briefly because it does not gate its own render on `isBootstrapping`. (Lower impact since
  the spinner takes the screen; still worth a tightening pass.)
- **Destructive admin actions lack a uniform confirmation pattern.** Order-state transitions
  prompt via inline button; role-change and payment-method delete vary. A single
  `<ConfirmAction>` helper would standardise.
- **`prefers-reduced-motion` is honored by HeroUI defaults but not by the custom hover
  transitions on tiles and table rows.** Add a `motion-reduce:transition-none` guard.

### 2.3 i18n (SHOULD-FIX)

- **English `catalog.json` ships but Arabic locale files may have stale keys.** A scripted
  `i18n-coverage` check that fails the build on missing keys would prevent regression. In
  scope as a polish item if the helper is small; otherwise DEFER to a tooling milestone.
- **Admin shell strings will be net-new.** Both `ar/admin.json` and `en/admin.json` must add
  the navigation labels, account-menu labels, and the role-aware redirect notice (e.g.,
  "you don't have access to this page").

### 2.4 Security / hardening (SHOULD-FIX)

- **Rate limiting is wired** (commit `4c49150`) for auth and inquiry endpoints. The admin
  endpoints are not rate-limited — operational risk if an admin account is compromised. A
  conservative bucket on `/api/admin/*` is in scope as a defense-in-depth polish item.
- **Sign-out does not invalidate the local query cache before navigation.** `AuthProvider`'s
  `clearSession` calls `queryClient.clear()` — good. Verify no admin pages re-fetch behind
  the spinner on the way out.
- **Refresh-token reuse cascade is implemented** (per `PROJECT_MAP.md`). xUnit coverage
  exists in `UserRoleSecurityTests`. No change needed; record the invariant in this feature's
  tests for the new admin routing as a sibling assertion.

### 2.5 Frontend test coverage (DEFER)

- **No vitest / jest setup on the frontend.** Adding a smoke test for "admin sign-in lands on
  /admin" would require new tooling. **Defer** to `[ORPHANS & PENDING]` as a tooling task;
  the routing change is small enough that manual smoke + a backend `AdminRoleRoutingTests`
  fixture covers FR-001 / FR-006 / FR-007 at the contract level.

### 2.6 Dead code / debt (DEFER unless trivial)

- **`ShellPage` at `/account` is a stub** that links to orders and addresses. Could be
  rebuilt into a buyer dashboard but is **DEFER** — out of scope for the role-routing
  feature.
- **No structured handler for "403 from /api/admin/*" on the SPA side.** Should surface a
  friendly "not authorized" banner. SHOULD-FIX as a small polish item — covers FR-015.

## 3. Decisions

### Decision 1 — Client-side admin gating strategy

- **Decision**: Add a new `CustomerRoute` outlet alongside the existing `ProtectedRoute` /
  `AdminRoute`. Strict admin gate redirects to `/admin`; strict customer gate redirects
  admins to `/admin`. Both gates render only after `isBootstrapping` resolves.
- **Rationale**: Mirrors the existing pattern, adds one component, keeps the auth concern in
  the auth slice. A single helper (`<RoleAwareOutlet />`) was considered but rejected because
  the existing `<Outlet />` pattern is already understood by every page and code reviewer.
- **Alternatives considered**:
  - *Single conditional inside `<AppRoutes />` (`isAdmin ? <AdminRoutes /> : <PublicRoutes
    />`)*. Rejected — duplicates route definitions and creates a re-mount on role change.
  - *Server-side redirect on `GET /`*. Rejected — would force every customer page to make a
    server round-trip on cold load; conflicts with the Vercel SPA hosting model and offers no
    new security guarantee on top of the existing JWT gate.

### Decision 2 — Admin shell composition

- **Decision**: New `AdminLayout` component at `frontend/src/features/admin/components/`.
  Top bar (admin-scoped `AdminHeader`) + persistent left rail (`AdminSidebar`) + content
  outlet. Both are responsive: sidebar collapses to an icon rail on `< md`, with a sheet for
  mobile that opens from the trailing edge in LTR / leading edge in RTL.
- **Rationale**: A sidebar is justified by ≥ 4 admin surfaces in daily use. It also creates
  obvious visual differentiation from the customer storefront (which has no left rail),
  satisfying the spec's "visually distinguish itself" rule (FR-013). All within
  `DESIGN_PRINCIPLES.md` rules — no card nesting in the rail; logical CSS for the leading-
  edge layout.
- **Alternatives considered**:
  - *Reuse the customer `Header` with admin-scoped links*. Rejected — would still show the
    storefront brand link and cart, and would not solve the "drift" risk.
  - *Top-bar-only admin chrome (no sidebar)*. Rejected — works for ≤ 3 surfaces; we have six
    and growing.

### Decision 3 — Post-sign-in redirect contract

- **Decision**: `LoginPage` and `RegisterPage` compute `destination` after `login()` /
  `register()` resolves. If `user.roles.includes('Admin')`, destination is `/admin`. If not,
  destination is the recorded `from` path **only if** `from` is a non-admin path; otherwise
  it falls back to `/`. `PublicOnlyRoute` mirrors the same logic for already-authed users
  who land on auth pages.
- **Rationale**: One rule everywhere prevents the "where did I end up?" inconsistency. The
  same rule lives once in a small helper, e.g., `resolvePostAuthDestination(user, from)`, so
  the unit-test surface is one function.
- **Alternatives considered**:
  - *Always send admins to `/admin` and ignore `from`*. Rejected — breaks the deep-link
    edge case (admin clicks an email link to `/admin/orders/DM-2026-000123` → should land
    there, not `/admin`).
  - *Read role-scoped landing from a server `/auth/me` response*. Rejected — the role is
    already on the auth user; no need to round-trip.

### Decision 4 — Server-side enforcement remains the source of truth

- **Decision**: Keep all existing `RequireRole(Admin)` gates on `/api/admin/*`. Add one
  xUnit test class — `Security/AdminRoleRoutingTests` — that asserts every endpoint mounted
  in `MapAdminEndpoints` requires the Admin role at the metadata level. Adopts a reflection
  walk over `app.MapAdminEndpoints` to fail the build if an admin endpoint forgets the
  attribute.
- **Rationale**: Client routing is UX; server gating is access control. A meta-level test
  protects future endpoints from accidentally shipping without `RequireRole(Admin)`.
- **Alternatives considered**:
  - *Per-endpoint test for each admin route*. Rejected — drifts over time and the meta test
    catches the class of bug rather than each instance.

### Decision 5 — Production-readiness polish scope (bounded)

In scope for this feature:

1. Centralize `isAdmin` on the auth context.
2. Introduce `CustomerRoute` and harden `AdminRoute` + `PublicOnlyRoute`.
3. Implement `AdminLayout`, `AdminHeader`, `AdminSidebar`.
4. Role-aware post-auth redirect helper.
5. Friendly 403 handler on the SPA for `/api/admin/*` responses (covers FR-015).
6. Conservative rate limit on `/api/admin/*` for defense-in-depth.
7. `motion-reduce:transition-none` audit on admin tiles and table rows.
8. xUnit `AdminRoleRoutingTests` covering endpoint metadata.
9. Locale entries for the admin shell in both `ar/admin.json` and `en/admin.json`.
10. `PROJECT_MAP.md` updated at milestone close to record the shell split, the new
    `CustomerRoute`, and the meta-test invariant.

Deferred to `[ORPHANS & PENDING]`:

- Vitest setup + frontend smoke tests for routing (tooling task).
- Buyer `ShellPage` rebuild at `/account` (UX task, not blocking).
- i18n-coverage build check script (tooling task).

## 4. Open questions resolved

| Topic | Resolution |
| --- | --- |
| Should admins ever see the storefront? | No. The product does not currently support "view-as-customer"; if requested later, scope it as a new feature. (Spec Assumption.) |
| Role transition mid-session | Treated on next authenticated render via the auth-context `isAdmin` value; no manual sign-out required. (Spec edge case + FR-009.) |
| Deep-linked admin URLs while anonymous | `AdminRoute` preserves the original URL via `location.state.from`; after sign-in, the role-aware helper sends the admin straight to that deep-linked admin URL. |
| Where the admin shell lives in the tree | Inside `frontend/src/features/admin/components/` — admin-scope, not cross-cutting. (Constitution principle III.) |
| Backend changes needed | None functional. One new test fixture asserts existing enforcement. |
| Database schema changes | None. |
