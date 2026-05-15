# Implementation Plan: Admin / Customer Separation & Production Polish

**Branch**: `001-admin-customer-separation` | **Date**: 2026-05-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-admin-customer-separation/spec.md`

## Summary

Separate the staff experience from the customer experience: an Admin-role user is routed to a
dedicated admin shell at `/admin` on every sign-in, session restore, and accidental navigation;
the customer storefront is reachable only to anonymous visitors and non-Admin authenticated
buyers. The change is a routing + shell refactor (no schema change). It ships alongside a
bounded production-readiness sweep that resolves issues uncovered by codebase analysis or
defers them to `PROJECT_MAP.md`'s `[ORPHANS & PENDING]` register.

Technical approach:

- Introduce a single source of truth for "is this user an admin" on the client (`isAdmin` on
  the auth context, derived from `user.roles.includes('Admin')`).
- Split the route tree into a **customer shell** (current `<Layout />`) and a new **admin
  shell** with its own header/sidebar; both share the providers stack.
- Replace `<AdminRoute />`'s permissive behavior with a strict gate that *also* triggers on
  customer routes (`<CustomerRoute />`) to redirect admins away from `/`.
- Rewrite the post-sign-in redirect to honor role: admin → `/admin`; non-admin → the recorded
  `from` URL (with admin URLs filtered out for non-admins, and customer URLs filtered out for
  admins).
- Keep all admin server endpoints behind the existing `RequireRole(Admin)` + JWT pipeline;
  client routing remains a UX optimization, not the access-control source of truth.
- Polish work is bounded by FR-016 through FR-023 in the spec; any issue that doesn't pass
  that bar is deferred via `PROJECT_MAP.md` rather than expanded.

## Technical Context

**Language/Version**: TypeScript 5.x on the frontend (React 19, Vite 7); C# 13 / .NET 10 on the
backend (ASP.NET Core 10 Minimal APIs).

**Primary Dependencies**:

- *Frontend* — React Router 7, TanStack Query 5, react-hook-form + zod, axios, HeroUI on
  Tailwind CSS 4, next-themes, i18next, lucide-react, dayjs.
- *Backend* — ASP.NET Core 10 Minimal APIs (vertical slices), EF Core 10, ASP.NET Identity,
  JwtBearer, FluentValidation 11, Mapster, Serilog, Coravel, MailKit, CloudinaryDotNet.

**Storage**: Microsoft SQL Server (hosted on MonsterASP.NET); EF Core Migrations as the only
schema-change mechanism. No schema change in this feature.

**Testing**: xUnit on the backend (`backend/tests/DrMirror.Tests`). The frontend has no
automated test suite today — addressed in scope under a polish item (frontend smoke tests for
role-based routing).

**Target Platform**: Modern evergreen browsers (Chromium, Firefox, Safari, Edge) on desktop and
mobile. Backend runs on Windows IIS via MonsterASP.NET. SPA hosted on Vercel.

**Project Type**: Web application (single-currency storefront + admin dashboard). Two projects:
`backend/` (.NET) and `frontend/` (Vite SPA).

**Performance Goals**:

- Storefront landing TTI under 2.5s on a cold cache on a representative residential connection.
- Admin orders queue paints within 1.5s after sign-in for the seeded dataset (~30 orders).
- Sign-in → first paint of the admin dashboard within 1.5s after credentials submit.

**Constraints**:

- Arabic-first / RTL parity is non-negotiable (Constitution principle I).
- Dark-first design (Constitution principle IV); admin shell must respect the same elevation,
  spacing, motion, and typography rules as the customer shell.
- No schema or auth-protocol change in this feature.
- No new server endpoints in this feature; the existing `/api/admin/*` routes already enforce
  `RequireRole(Admin)`.

**Scale/Scope**: Specialist storefront. Catalog under ~500 SKUs initially, single tenant,
single currency (EGP), bilingual (ar primary, en secondary). Admin user count in single
digits; buyer base modest at launch. Scope of *this* feature: rewriting ~6 routing surfaces,
introducing one new shell component, and a bounded polish sweep covering ~15 candidate items
from the analysis output.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Arabic-First, RTL Parity (NON-NEGOTIABLE)** — The new admin shell is a UI surface; every
  element MUST use logical CSS (`ms-*`/`me-*`/`ps-*`/`pe-*`/`text-start`/`text-end`), strings
  MUST be added to both `frontend/src/locales/ar/admin.json` and
  `frontend/src/locales/en/admin.json`, and the shell MUST be verified in all four states
  `(dark|light) × (rtl|ltr)`. Numerics in admin tables remain `tabular-nums`. **Status: PASS,
  no deviation.**
- **II. Domain Discipline — Medical Apparel Only** — The feature touches routing and shell,
  not catalog taxonomy. No naming or copy outside the apparel domain. **Status: PASS,
  N/A — no catalog/taxonomy change.**
- **III. Vertical Slices & Single Source of Truth** — Frontend changes land in
  `frontend/src/features/auth/` (route gates, redirect logic) and a new
  `frontend/src/features/admin/components/AdminLayout.tsx` (plus shell siblings) — admin shell
  is consolidated next to the existing admin features rather than under `shared/components`
  to keep the slice boundary clean. Backend changes (if any — likely zero for this feature)
  would land under the existing `/Features/Admin/...` slices. `PROJECT_MAP.md`
  `[ARCHITECTURE]` and `[ARCHITECTURE NOTES]` will be updated at milestone close to record the
  shell split. **Status: PASS, no deviation.**
- **IV. Design Discipline** — Admin shell MUST honor `DESIGN_PRINCIPLES.md` §10: at most 2
  levels of card nesting, ≤ 3 font weights, one accent hue (HeroUI `primary`), 4 px spacing
  grid, elevation by lightness, `prefers-reduced-motion` respected, Lucide icons only. No
  glow / glass / parallax / autoplay. **Status: PASS, no deviation.**
- **V. Milestone-Driven Delivery with Binary Acceptance** — This feature belongs to **M4**
  (Admin polish + role-routing fix). Binary acceptance: a fresh sign-in as an Admin-role user
  lands on `/admin` and cannot reach `/`, `/products/*`, `/cart`, `/checkout`, or
  `/account/*` by URL or back-button; a fresh sign-in as a buyer continues to use the
  storefront with no regression in the M3 buyer flow. **Status: PASS.**

**Pre-Phase-0 gate: PASS.** No deviations require entry in Complexity Tracking.

**Post-Phase-1 re-check (2026-05-15): PASS.** The Phase 1 design (admin shell composition,
routing helper, `isAdmin` on auth context, server-side invariant test) introduces no
violations against principles I–V. Admin shell strings are planned in both `ar/admin.json`
and `en/admin.json`; the four-state matrix is explicit in `quickstart.md` Test 9; the new
shell components live inside `frontend/src/features/admin/components/`. Complexity Tracking
remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-customer-separation/
├── plan.md                   # This file (/speckit-plan output)
├── spec.md                   # /speckit-specify output
├── research.md               # Phase 0 output
├── data-model.md             # Phase 1 output
├── quickstart.md             # Phase 1 output
├── contracts/
│   ├── routing-contract.md   # Client-side route gate contract
│   └── admin-api-contract.md # Server-side admin endpoint authorization contract
├── checklists/
│   └── requirements.md       # /speckit-specify quality checklist (already passing)
└── tasks.md                  # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/DrMirror.Api/
│   ├── Features/
│   │   ├── Auth/                 # Login, Refresh, Logout, Me, Register (no change in this feature)
│   │   ├── Admin/                # All staff endpoints behind RequireRole(Admin)
│   │   ├── Catalog/              # Public catalog reads
│   │   ├── Cart/                 # Buyer cart + merge
│   │   ├── Checkout/             # Buyer checkout
│   │   ├── Orders/               # Buyer order detail + cancel + proof upload
│   │   ├── Addresses/            # Buyer address book
│   │   └── Inquiries/            # Buyer inquiry submit + admin inbox
│   ├── Domain/Entities/          # Aggregates (unchanged)
│   ├── Infrastructure/           # Persistence, Identity, Storage, Email, Jobs (unchanged)
│   └── Shared/                   # Cross-cutting helpers (unchanged)
└── tests/DrMirror.Tests/
    └── Security/                 # Adds AdminRoleRoutingTests covering RequireRole(Admin) coverage on /api/admin/*

frontend/
├── src/
│   ├── app/
│   │   ├── router.tsx            # MODIFIED: customer shell vs admin shell split, customer-route gate added
│   │   └── providers.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx  # MODIFIED: derive isAdmin once, expose on context
│   │   │   ├── ProtectedRoute.tsx # MODIFIED: AdminRoute hardened, CustomerRoute introduced, PublicOnlyRoute role-aware
│   │   │   ├── LoginPage.tsx     # MODIFIED: role-aware post-login navigate
│   │   │   ├── RegisterPage.tsx  # MODIFIED: role-aware post-register navigate
│   │   │   └── useAuth.ts        # Re-exports isAdmin via context
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   │   ├── AdminLayout.tsx        # NEW: admin shell (Outlet) — admin-only chrome
│   │   │   │   ├── AdminHeader.tsx        # NEW: admin top bar (account, sign-out, theme, lang)
│   │   │   │   └── AdminSidebar.tsx       # NEW: admin nav (orders, products, categories, payment, inquiries, users)
│   │   │   └── (existing admin pages, unchanged)
│   │   └── (other features, unchanged)
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Header.tsx        # MODIFIED: drop cart button + buyer-account link when isAdmin
│   │   │   └── Layout.tsx        # MODIFIED: customer-only shell (renamed semantically; routes use it explicitly)
│   │   └── lib/auth-storage.ts   # No change
│   └── locales/
│       ├── ar/admin.json         # MODIFIED: add admin shell strings
│       └── en/admin.json         # MODIFIED: add admin shell strings
└── tests/                        # NEW (light): vitest setup for role-routing smoke tests (deferred to polish item if vitest absent)
```

**Structure Decision**: Two-project web application (Option 2 in the template). The admin
shell lives inside the existing `frontend/src/features/admin/` slice rather than under
`shared/components/`, because it is admin-scope, not cross-cutting. The customer `Layout` and
`Header` remain in `shared/components/` because they continue to serve both anonymous and
buyer experiences. No backend slice is added; existing `/api/admin/*` endpoints already
enforce `RequireRole(Admin)`, and the new test file in `tests/DrMirror.Tests/Security/`
records that enforcement as an invariant.

## Complexity Tracking

> *No constitution-check violations to justify. Section intentionally left empty.*
