---
description: "Task list for feature 001-admin-customer-separation"
---

# Tasks: Admin / Customer Separation & Production Polish

**Input**: Design documents from `specs/001-admin-customer-separation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Backend `AdminRoleRoutingTests` (xUnit) is required by
[contracts/admin-api-contract.md](./contracts/admin-api-contract.md). Frontend unit tests for
the routing helper are deferred to `[ORPHANS & PENDING]` per
[research.md](./research.md) §2.5 (vitest setup not present).

**Organization**: Phase 3 (US1) is the MVP — admin sign-in → admin dashboard only. Phase 4
(US2) protects the customer storefront from regression. Phase 5 (US3) is the bounded
production-readiness sweep. The two P1 stories share the same routing surface and therefore
share files; they are not parallelizable across stories, but tasks within each story that
touch distinct files ARE parallelizable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1, US2, US3) — omitted for setup,
  foundational, and polish phases
- File paths are exact

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring the working tree to a known-good baseline. This is a brownfield change —
no new dependencies are introduced.

- [X] T001 Verify the working tree is clean, all M3 features still build, and the dev server boots — run `dotnet build backend/DrMirror.slnx` and `npm run build` in `frontend/`; record any pre-existing failures in `specs/001-admin-customer-separation/research.md` before starting changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared client-side primitives that BOTH P1 stories depend on. No story
work can start until this phase is complete.

**⚠️ CRITICAL**: US1 and US2 both consume `isAdmin` and `resolvePostAuthDestination`.

- [X] T002 Extend `AuthContextValue` and `AuthProvider` to expose a memoized `isAdmin: boolean` derived from `user?.roles.includes('Admin') ?? false` in `frontend/src/features/auth/AuthProvider.tsx`
- [X] T003 Create the post-auth destination helper exporting `resolvePostAuthDestination(user, from)` with the rule table from [contracts/routing-contract.md](./contracts/routing-contract.md) §2 in `frontend/src/features/auth/postAuthDestination.ts`
- [X] T004 [P] Add admin-shell locale strings (sidebar nav labels, account-menu labels, "you don't have access" 403 banner copy, sign-out confirmation) to `frontend/src/locales/ar/admin.json`
- [X] T005 [P] Add admin-shell locale strings (matching keys, English translations) to `frontend/src/locales/en/admin.json`

**Checkpoint**: `isAdmin` is available on the auth context, the post-auth helper is callable
and exercised by future tasks, both locales carry the admin-shell strings. User story work
can now begin.

---

## Phase 3: User Story 1 — Admin signs in and lands on the Admin Dashboard only (Priority: P1) 🎯 MVP

**Goal**: An Admin-role user is routed to `/admin` on sign-in and cannot reach `/`,
`/products/*`, `/cart`, `/checkout`, or `/account/*`. The admin shell renders with
admin-scoped chrome and zero storefront affordances.

**Independent Test**: Run [quickstart.md](./quickstart.md) Tests 1–4 and Test 7 (admin sign-in
lands on `/admin`, admin cannot reach storefront URLs, admin shell composition, admin reload
+ deep-link, `/login` while already signed in as admin redirects to `/admin`). All five
tests pass with no flash of customer content.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `AdminLayout` (admin shell wrapper with top bar, persistent left rail, content `<Outlet />`, responsive collapse on `< md`) using only logical CSS and Lucide icons in `frontend/src/features/admin/components/AdminLayout.tsx`
- [X] T007 [P] [US1] Create `AdminHeader` (admin top bar: account chip with display name, language toggle, theme toggle, sign-out button — no storefront brand link, no cart, no buyer-account link) in `frontend/src/features/admin/components/AdminHeader.tsx`
- [X] T008 [P] [US1] Create `AdminSidebar` (persistent left rail with Orders, Products, Categories, Payment Methods, Inquiries, Users navigation links; active-state indicator; collapses to icon-only rail on `< md` and to a side sheet on mobile) in `frontend/src/features/admin/components/AdminSidebar.tsx`
- [X] T009 [US1] Harden `AdminRoute` to render the matrix from [contracts/routing-contract.md](./contracts/routing-contract.md) §1.4 (anonymous → `/login?from=...`; non-admin → `/`; admin → render; bootstrapping → spinner) in `frontend/src/features/auth/ProtectedRoute.tsx`
- [X] T010 [US1] Introduce `CustomerRoute` in the same file with the matrix from [contracts/routing-contract.md](./contracts/routing-contract.md) §1.2 (anonymous → render; buyer → render; admin → `/admin`; bootstrapping → spinner) in `frontend/src/features/auth/ProtectedRoute.tsx`
- [X] T011 [US1] Update `ProtectedRoute` so authenticated admins on `/checkout` or `/account/*` are redirected to `/admin` per [contracts/routing-contract.md](./contracts/routing-contract.md) §1.3 in `frontend/src/features/auth/ProtectedRoute.tsx`
- [X] T012 [US1] Restructure the route tree: split admin routes onto their own `<AdminLayout />` (under `<AdminRoute />`), wrap storefront routes (`/`, `/products/:slug`, `/cart`) in `<CustomerRoute />` inside `<Layout />`, keep `/checkout` and `/account/*` inside `<ProtectedRoute />` inside `<Layout />` in `frontend/src/app/router.tsx`
- [X] T013 [US1] Wire `LoginPage` to call `resolvePostAuthDestination(user, location.state?.from?.pathname ?? null)` after `login()` resolves and `navigate(dest, { replace: true })` in `frontend/src/features/auth/LoginPage.tsx`

**Checkpoint**: Admin can sign in and is taken directly to `/admin`. Admin cannot reach any
customer URL. Admin shell renders with admin-scoped chrome. Quickstart Tests 1–4 and Test 7
pass.

---

## Phase 4: User Story 2 — Visitors and customers experience the storefront unchanged (Priority: P1)

**Goal**: Anonymous visitors and signed-in buyers continue to use the storefront with no
regression: storefront landing, browse, product detail, cart, checkout, buyer account,
address book, order history all behave as they did at end-of-M3.

**Independent Test**: Run [quickstart.md](./quickstart.md) Tests 5 and 6 (buyer flow
unchanged, anonymous flow unchanged). The four-state UI matrix renders correctly on the
storefront landing, product detail, cart, and checkout (Test 9 subset).

### Implementation for User Story 2

- [X] T014 [US2] Update `PublicOnlyRoute` to use `resolvePostAuthDestination(user, null)` so already-signed-in admins are redirected to `/admin` and buyers to `/` per [contracts/routing-contract.md](./contracts/routing-contract.md) §1.1 in `frontend/src/features/auth/ProtectedRoute.tsx`
- [X] T015 [US2] Wire `RegisterPage` to call `resolvePostAuthDestination(user, null)` after `register()` resolves (replaces the unconditional `navigate('/')`) in `frontend/src/features/auth/RegisterPage.tsx`
- [X] T016 [US2] Defensive header pass — short-circuit the customer `Header` to a minimal render (or return `null`) when `isAdmin` is true, so any race between role transition and the route gate cannot leak cart/buyer-account chrome to an admin session in `frontend/src/shared/components/Header.tsx`
- [X] T017 [US2] Confirm `<Layout />` still wraps storefront, checkout, and buyer-account routes correctly after the T012 split — no regression in shared shell, header, page gutters, or footer in `frontend/src/shared/components/Layout.tsx` (no edit expected; review-only)
- [ ] T018 [US2] Walk the buyer journey end-to-end (browse → product → cart → merge cart → checkout → upload payment proof → view order detail) and confirm no console errors, no missing translation keys, and no broken redirects against the running dev stack (manual; record findings in [quickstart.md](./quickstart.md) Test 5 result)

**Checkpoint**: Buyer flow is regression-free. Anonymous flow is regression-free. Quickstart
Tests 5, 6, and 9 (storefront subset) pass.

---

## Phase 5: User Story 3 — Production-ready polish (Priority: P2)

**Goal**: The bounded polish scope from spec FR-016 through FR-023 is resolved or
explicitly deferred via `PROJECT_MAP.md`'s `[ORPHANS & PENDING]`.

**Independent Test**: The production-readiness checklist for this feature is 100% checked or
each unchecked item has a matching deferral entry in `PROJECT_MAP.md`'s
`[ORPHANS & PENDING]` section. Backend `dotnet test` passes including the new
`AdminRoleRoutingTests` fixture.

### Implementation for User Story 3

- [X] T019 [P] [US3] Add xUnit fixture `AdminRoleRoutingTests` that resolves the application's `EndpointDataSource` via `WebApplicationFactory<Program>`, walks every endpoint with route prefix `/api/admin/`, and asserts each carries an authorize requirement naming the `Admin` role per [contracts/admin-api-contract.md](./contracts/admin-api-contract.md) §2 in `backend/tests/DrMirror.Tests/Security/AdminRoleRoutingTests.cs`
- [X] T020 [P] [US3] Add a conservative rate-limit policy for `/api/admin/*` (e.g., 120 req/min per authenticated user) and apply it to the admin endpoint group in `backend/src/DrMirror.Api/Shared/RateLimiting/RateLimitPolicies.cs` and `backend/src/DrMirror.Api/Features/Admin/AdminEndpoints.cs`
- [X] T021 [US3] Add a 403 response handler to the axios response interceptor — distinguish 403 from 401, surface a non-modal banner with the localized "not authorized" copy from T004/T005, and if the user is currently inside `/admin/*` and no longer holds the Admin role, navigate them away in `frontend/src/shared/lib/api-client.ts`
- [X] T022 [US3] Audit admin tiles, sidebar rail, and table rows for `motion-reduce:transition-none` / equivalent reduced-motion guard on every hover or focus transition introduced in this feature in `frontend/src/features/admin/AdminHubPage.tsx`, `frontend/src/features/admin/components/AdminSidebar.tsx`, `frontend/src/features/admin/components/AdminLayout.tsx`
- [X] T023 [US3] Update `PROJECT_MAP.md` `[ARCHITECTURE]` and `[ARCHITECTURE NOTES]` sections to record: the customer/admin shell split, the new `CustomerRoute` gate, the `isAdmin` context flag, the `resolvePostAuthDestination` helper, and the `AdminRoleRoutingTests` invariant in `PROJECT_MAP.md`
- [X] T024 [US3] Update `PROJECT_MAP.md` `[ORPHANS & PENDING]` section to add explicit deferral entries with owner + target milestone for: (a) vitest setup + frontend smoke tests for role-routing, (b) buyer `/account` `ShellPage` rebuild, (c) i18n-coverage build check script — per [research.md](./research.md) §2.5–2.6 in `PROJECT_MAP.md`
- [X] T025 [US3] Update `frontend/src/locales/{ar,en}/common.json` if any of the polish strings (403 banner, sign-out confirmation, role-revoked notice) belong in `common` rather than `admin` — verify no missing keys, no leaked translations between locales in `frontend/src/locales/ar/common.json` and `frontend/src/locales/en/common.json`

**Checkpoint**: All P2 polish items either resolved or deferred with a written entry.
Backend test suite green. `PROJECT_MAP.md` reflects the new architecture.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting validation that proves the feature meets binary acceptance for
milestone M4.

- [X] T026 Run `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj` and confirm green — all existing fixtures plus the new `AdminRoleRoutingTests` pass; record output in the PR description
- [X] T027 Run `npm run build` and `npm run lint` in `frontend/` — both must succeed with no errors; record output in the PR description
- [ ] T028 Walk the four-state UI matrix `(dark|light) × (rtl|ltr)` on every page listed in [quickstart.md](./quickstart.md) Test 9 (storefront landing, product detail, cart, checkout, admin dashboard, admin orders queue, admin order detail); record screenshots or a short pass/fail note per state per page
- [ ] T029 Walk the full [quickstart.md](./quickstart.md) Tests 1–10 end-to-end against a fresh seed; record pass/fail per test in the PR description
- [ ] T030 Code review pass for unused imports, dead variables, and any drift from `DESIGN_PRINCIPLES.md` §10 (logical CSS only, ≤ 2 card nesting, ≤ 3 font weights, one accent hue, Lucide icons only) across files touched in this feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** — No dependencies. Run first.
- **Foundational (Phase 2)** — Depends on Phase 1. BLOCKS Phase 3 and Phase 4.
- **User Story 1 (Phase 3, P1)** — Depends on Phase 2. Same files as US2 (router, gates,
  LoginPage), so cannot run in parallel with US2.
- **User Story 2 (Phase 4, P1)** — Depends on Phase 2 AND Phase 3 (router restructure in T012
  is a prerequisite for the buyer regression tasks). Independent at the verification level
  (different acceptance tests), sequential at the file-touch level.
- **User Story 3 (Phase 5, P2)** — Depends on Phase 3 + Phase 4 conceptually (polish lands
  after the routing change is in), but the *backend* polish tasks (T019, T020) are
  file-independent and can start in parallel with US1/US2 once Foundational is done.
- **Polish (Phase 6)** — Depends on all prior phases.

### User Story Dependencies

- **US1 (P1)**: Blocks US2 (T012 router restructure is a hard prerequisite).
- **US2 (P1)**: Depends on US1's T012. T014–T018 then proceed.
- **US3 (P2)**: Independent of US1/US2 at the file level for the backend tasks (T019, T020).
  Frontend tasks (T021, T022) depend on US1's admin shell existing.

### Within Each User Story

- Models / shared primitives first (already done in Foundational).
- Component creation before component wiring.
- Component wiring before route-tree restructure.
- Route-tree restructure before regression validation.

### Parallel Opportunities

- **Foundational**: T004 and T005 (Arabic + English locale files) are independent — run in
  parallel.
- **US1 component creation**: T006, T007, T008 (`AdminLayout`, `AdminHeader`,
  `AdminSidebar`) touch distinct new files and can run in parallel.
- **US1 gate edits**: T009, T010, T011 all modify the SAME file (`ProtectedRoute.tsx`) and
  MUST run sequentially.
- **US3 backend tasks**: T019 and T020 touch distinct files and can run in parallel; both
  are independent of US1 frontend work.

---

## Parallel Example: User Story 1 — admin shell components

```bash
# Three brand-new component files; safe to author in parallel:
Task: "Create AdminLayout in frontend/src/features/admin/components/AdminLayout.tsx"
Task: "Create AdminHeader in frontend/src/features/admin/components/AdminHeader.tsx"
Task: "Create AdminSidebar in frontend/src/features/admin/components/AdminSidebar.tsx"
```

## Parallel Example: Foundational locales

```bash
# Independent locale files:
Task: "Add admin shell strings to frontend/src/locales/ar/admin.json"
Task: "Add admin shell strings to frontend/src/locales/en/admin.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T005).
3. Complete Phase 3: User Story 1 (T006–T013).
4. **STOP and VALIDATE**: Run [quickstart.md](./quickstart.md) Tests 1–4 and Test 7. If
   admin sign-in lands on `/admin` and admin cannot reach storefront URLs, the headline
   promise of the feature is delivered.

### Incremental Delivery

1. Foundational ready → run T001–T005.
2. US1 ready → run T006–T013, validate Tests 1–4 + 7, the **MVP**.
3. US2 ready → run T014–T018, validate Tests 5 + 6 + storefront subset of Test 9.
4. US3 ready → run T019–T025, validate Test 10 (backend invariant) and confirm
   `[ORPHANS & PENDING]` entries are in place.
5. Polish → run T026–T030, sign off on milestone M4 binary acceptance.

### Parallel Team Strategy

If two developers are available after Foundational:

- **Developer A**: Owns US1 (T006–T013) — frontend admin shell + routing.
- **Developer B**: Owns US3 backend tasks (T019, T020) — `AdminRoleRoutingTests` fixture +
  admin rate-limit. Independent file set.

Then both converge on US2 (T014–T018) once T012 lands.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] label maps task to its user story for traceability.
- Backend changes are minimal: one new test fixture, one rate-limit policy update.
- Frontend changes touch ~10 files; ~4 are new, the rest are edits.
- No database schema change. No migration to author.
- Verify each story's checkpoint before moving to the next priority.
- Avoid vague tasks, cross-story file conflicts that break US2 independence, and any drift
  from the constitution principles I (RTL), III (vertical slices), IV (design).
