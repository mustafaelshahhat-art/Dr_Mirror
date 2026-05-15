# Quickstart — Admin / Customer Separation

**Feature**: Admin / Customer Separation & Production Polish
**Date**: 2026-05-15

This is a "what does success look like in the running app" walkthrough for the implementer,
reviewer, or QA validator. It maps directly to the spec's acceptance scenarios and success
criteria.

## Prereqs

- Backend running locally (`dotnet run` from `backend/src/DrMirror.Api`). Health check at
  `http://localhost:5223/api/health`.
- Frontend running locally (`npm run dev` from `frontend/`). Opens at
  `http://localhost:5173/` in Arabic + dark mode by default.
- Database has the dev seed applied. Seeded admin email and password are sourced from
  `Admin:SeedEmail` and `Admin:SeedPassword` (or the auto-generated password logged on first
  boot at WARN). At least one buyer account exists (or register one through the SPA).

Two test users:

- **Admin** — the seeded admin account (`Admin:SeedEmail`).
- **Buyer** — any non-admin account registered through `/register`.

## Test 1 — Admin sign-in lands on the Admin Dashboard

1. Open `http://localhost:5173/login` in a fresh browser session.
2. Sign in with the admin credentials.
3. **Expected**: URL changes to `/admin`. The admin shell renders (admin top bar + sidebar +
   dashboard tiles). No flash of the customer storefront occurs.

**Maps to**: FR-001, US1 Acceptance 1, SC-001.

## Test 2 — Admin cannot reach the storefront by URL

1. Signed in as admin on `/admin`, manually navigate to `http://localhost:5173/`.
2. **Expected**: URL is replaced with `/admin`. No customer content renders.
3. Repeat with `/products/<any-slug>`, `/cart`, `/checkout`, `/account`, `/account/orders`.
   Each MUST redirect to `/admin`.

**Maps to**: FR-006, US1 Acceptance 2, SC-002.

## Test 3 — Admin shell composition

1. While signed in as admin on `/admin`, inspect the header.
2. **Expected**: header contains admin nav (Orders, Products, Categories, Payment Methods,
   Inquiries, Users), an account chip with the admin's display name, language toggle, theme
   toggle, sign-out. No storefront brand link to `/`. No cart icon. No buyer-account link.

**Maps to**: FR-010, FR-011, FR-013, US1 Acceptance 4.

## Test 4 — Admin reload and deep-link

1. While signed in as admin on `/admin/orders/<any-order-number>`, reload the browser tab.
2. **Expected**: a session-restore spinner appears briefly; then the same admin order detail
   page renders. No customer page is rendered in between.
3. Copy the URL, paste it into a fresh incognito tab, sign in as admin, and verify the user
   lands on the deep-linked admin URL — not the dashboard root.

**Maps to**: FR-001, FR-008, US1 Acceptance 3, SC-001.

## Test 5 — Buyer flow unchanged

1. Sign out. Sign in as a non-admin buyer.
2. **Expected**: URL goes to `/` (storefront landing). Customer header is visible (brand
   link, cart, language toggle, theme toggle, account chip). Catalog renders normally.
3. Click a product → product detail renders. Add a variant to cart → cart page renders.
   Open checkout → checkout renders.
4. Manually navigate to `/admin`. **Expected**: URL is replaced with `/`. No admin content
   renders.

**Maps to**: FR-002, FR-007, US2 Acceptance 1–4, SC-003.

## Test 6 — Anonymous flow unchanged

1. Sign out. As anonymous, open `/`.
2. **Expected**: customer storefront renders with sign-in button visible.
3. Manually navigate to `/admin`. **Expected**: redirected to `/login`; after signing in as
   an admin, the post-auth redirect deposits the user on `/admin` (NOT on `/`).
4. Repeat: navigate to `/admin/orders` while anonymous → after signing in as admin, the user
   lands on `/admin/orders`.

**Maps to**: FR-007, FR-001, US1 edge cases.

## Test 7 — Pre-auth screens for already-signed-in users

1. While signed in as admin, navigate to `/login` directly. **Expected**: redirect to
   `/admin`, no login form shown.
2. While signed in as a buyer, navigate to `/login` directly. **Expected**: redirect to `/`,
   no login form shown.

**Maps to**: FR-004, FR-005.

## Test 8 — Sign-out cleanup

1. From any admin surface, sign out.
2. **Expected**: redirected to `/login` (or to `/`, depending on Public landing rule). The
   in-memory user is cleared. Pressing the browser back-button returns to `/login` or `/`,
   never to an authenticated admin page.

**Maps to**: FR-022, SC-010.

## Test 9 — Four-state UI matrix

For each of: storefront landing, product detail, cart, checkout, admin dashboard, admin
orders queue, admin order detail.

1. Toggle theme via the theme toggle. Verify dark and light each render.
2. Toggle language via the language switcher. Verify Arabic (RTL) and English (LTR) each
   render.
3. **Expected**: no layout overflow, no mirrored-icon errors (directional icons mirror;
   symbolic icons do not), no missing translation keys, no `tabular-nums` regression on
   numeric tables, no console errors.

**Maps to**: FR-020, SC-004, SC-009.

## Test 10 — Backend invariant

1. Run the backend test suite:

   ```powershell
   dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj
   ```

2. **Expected**: the new `AdminRoleRoutingTests` fixture passes (every `/api/admin/*`
   endpoint requires the `Admin` role), and the existing `Security/*` suites continue to
   pass.

**Maps to**: FR-014, SC-005.

## Smoke summary

If all ten quickstart tests pass and the production-readiness checklist for this feature
(`specs/001-admin-customer-separation/checklists/requirements.md`) is fully checked or has
written deferrals captured in `PROJECT_MAP.md`'s `[ORPHANS & PENDING]`, the feature meets the
binary acceptance for milestone M4 and is ready to ship.
