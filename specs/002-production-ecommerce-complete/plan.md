# Implementation Plan: Production-Ready E-Commerce Platform

**Branch**: `002-production-ecommerce-complete` | **Date**: 2026-05-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-production-ecommerce-complete/spec.md`

---

## Summary

Dr_Mirror is an Arabic-first, RTL medical-apparel e-commerce platform at approximately M3-complete state. This plan covers the remaining work to reach a fully production-ready, polished, stable, and secure application. The primary concerns are: (1) fixing two pre-existing test failures, (2) RTL/LTR CSS audit across all components, (3) UI/UX polish on storefront and admin surfaces, (4) verifying all 4 rendering states `(dark|light) × (rtl|ltr)`, (5) i18n coverage completeness, and (6) closing remaining open items from `PROJECT_MAP.md [ORPHANS & PENDING]`.

The technical approach is code-only fixes and polish — no new database entities or migrations are required. All endpoint contracts are stable.

---

## Technical Context

**Language/Version**: .NET 10 (C# 13) · React 19 · TypeScript 6

**Primary Dependencies**:
- Backend: ASP.NET Core 10 Minimal APIs, EF Core 10, ASP.NET Identity, JWT Bearer, FluentValidation 11, Coravel 6, MailKit 4, CloudinaryDotNet, Serilog
- Frontend: Vite 8, HeroUI v3 (Tailwind v4 era), React Router 7, TanStack Query 5, react-hook-form + zod, i18next, dayjs, lucide-react, next-themes

**Storage**: SQL Server (MonsterASP production) · In-memory (xUnit tests) · Local filesystem + Cloudinary (file uploads, env-switched)

**Testing**: xUnit (backend) · No frontend test runner yet (M5 scope)

**Target Platform**: Frontend → Vercel (static SPA) · Backend → MonsterASP.NET (IIS/Windows) · DB → MonsterASP MSSQL

**Project Type**: Full-stack web application (SPA + REST API)

**Performance Goals**: p95 API response < 500 ms under normal load; Vite cold start < 5 s; Language switch < 300 ms

**Constraints**: Must render without hydration errors; no directional CSS literals (`left`/`right`); RTL correctness in all 4 states; zero nested `<button>` elements; no secrets in repo

**Scale/Scope**: < 20 concurrent admin users; buyer-facing catalog handles typical boutique retailer traffic; no horizontal scale-out in V1 (OrderCounter uses process-level semaphore)

---

## Constitution Check

### I. Arabic-First, RTL Parity (NON-NEGOTIABLE) ✅

Every new or modified UI surface in this plan:
- Uses only Tailwind logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`, `rounded-s-*`, `rounded-e-*`)
- Ships translation keys in both `frontend/src/locales/ar/<ns>.json` and `frontend/src/locales/en/<ns>.json`
- Will be verified against all four `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)` states before tasks are marked complete
- Numeric columns use `tabular-nums` and Western digits via centralized `format.ts`

RTL audit task covers `CheckoutPage.tsx`, `AdminProductEditPage.tsx`, `AdminOrderDetailPage.tsx`, and any other component found to use directional literals during audit.

### II. Domain Discipline — Medical Apparel Only ✅

All work in this plan is infrastructure, UI polish, and bug-fix in nature. No new catalog entities, categories, or product types are introduced. The 5 seeded apparel categories (Scrub Tops, Scrub Pants, Lab Coats, Surgical Headwear, Medical Footwear) remain unchanged. No non-apparel taxonomy is introduced.

### III. Vertical Slices & Single Source of Truth ✅

- Bug fixes land in their respective slice: `Features/Inquiries` (email validator), `Features/Admin/Orders/ReviewPaymentProof` (review note persistence)
- UI polish lands in `frontend/src/features/<sliceName>` for slice-specific pages and `frontend/src/shared` for shared primitives
- `PROJECT_MAP.md` will be updated at milestone close to reflect: (a) resolved orphans, (b) moved-to-resolved items, (c) updated `[ORPHANS & PENDING]` list

### IV. Design Discipline ✅

All UI changes apply `DESIGN_PRINCIPLES.md §10` pre-merge checklist:
- ≤ 2 card nesting levels (no violations expected; current layout is flat)
- ≤ 3 font weights per page (current usage is 400/500/600 only)
- No `left`/`right` hardcoded directionality (enforced by RTL audit)
- `prefers-reduced-motion` honored by HeroUI defaults + no custom animations added
- Lucide icons only; no emoji
- No console errors, no missing translation keys, no missing `alt` text

### V. Milestone-Driven Delivery with Binary Acceptance ✅

This work belongs to **M4–M5** (polish, audit, and open-item closure phase). Binary acceptance check:

> **All 212 backend tests pass. The storefront and admin dashboard render without console errors in all 4 states `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)` on both mobile (375 px) and desktop (1280 px) viewports.**

Post-Phase-1 check: No new deviations identified after design review.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-production-ecommerce-complete/
├── plan.md              ← this file
├── research.md          ← Phase 0 (complete)
├── data-model.md        ← Phase 1 (complete)
├── quickstart.md        ← Phase 1 (complete)
├── contracts/
│   ├── routing-contract.md   ← Phase 1 (complete)
│   └── api-contract.md       ← Phase 1 (complete)
├── checklists/
│   └── requirements.md
└── tasks.md             ← Phase 2 (generated by /speckit.tasks)
```

### Source Code

```text
backend/
├── src/
│   └── DrMirror.Api/
│       ├── Features/
│       │   ├── Admin/Orders/ReviewPaymentProof/  ← ReviewNote bug fix
│       │   └── Inquiries/                        ← Email validator fix
│       └── Infrastructure/Persistence/           ← Seeder, migrations (no new migrations)
└── tests/
    └── DrMirror.Tests/
        ├── Orders/PaymentProofTests.cs           ← Fix failing test
        ├── Inquiries/InquiryValidatorTests.cs    ← Fix failing test
        └── Security/AdminRoleRoutingTests.cs     ← Already green

frontend/
├── src/
│   ├── features/
│   │   ├── catalog/        ← CatalogPage empty state, filter UX polish
│   │   ├── checkout/       ← RTL audit, form UX polish
│   │   ├── orders/         ← OrderDetailPage 4-state verification
│   │   ├── cart/           ← CartButton (already fixed), CartLineRow audit
│   │   ├── admin/          ← AdminHubPage KPI panel, all admin pages 4-state audit
│   │   └── auth/           ← ShellPage → AccountShellPage rebuild
│   ├── shared/
│   │   ├── components/     ← EmptyState component (shared), ForbiddenBanner
│   │   └── lib/            ← format.ts (stable)
│   └── locales/
│       ├── ar/             ← i18n coverage audit + missing key additions
│       └── en/             ← i18n coverage audit + missing key additions
└── (no test runner yet — M5 scope)
```

**Structure Decision**: Web application (Option 2). Backend: single `DrMirror.Api` project with vertical slices. Frontend: single Vite project with feature-mirrored slice folders.

---

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *(none)* | — | — |
