# Implementation Plan: Full-Stack Production Reality Hardening

**Branch**: `003-production-reality-hardening` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-production-reality-hardening/spec.md`

## Summary

Harden Dr Mirror across all 13 production-reality layers without replacing the architecture or changing business behavior. Concretely: enforce access boundaries on the backend (ownership, role, disabled-user, refresh-reuse, role-escalation) with new integration tests; make checkout concurrency-safe (variant stock, double-submit, order counter); upgrade `/api/health` to a real readiness probe; add a GitHub Actions workflow that runs backend + frontend + i18n parity on every PR with SQL integration tests gated on `DRMIRROR_TEST_SQL_CONNECTION`; wire Sentry into the SPA build with source maps, PII scrubbing, and ErrorBoundary forwarding; add an `AdminAuditLogEntry` table with append-only writes for order/proof/stock/role mutations; add a background job that purges payment-proof files 2 years after order completion; tighten payment-proof upload validation to 5 MB / JPEG-PNG-PDF; document deployment, backup/restore (RPO ≤ 1 h, RTO ≤ 2 h), and a seven-scenario runbook. Frontend work covers UX/i18n/accessibility parity verification across all four (theme × direction) states, intentional skeletons/empty/error states, and duplicate-submit guards. No new framework, no architecture swap, no business-rule change.

## Technical Context

**Language/Version**: .NET 10 (backend) | TypeScript / React 19 (frontend)

**Primary Dependencies**:
- Backend: ASP.NET Core Minimal APIs (vertical slices), EF Core, ASP.NET Identity, JWT bearer, Serilog (+ CorrelationId enricher), MailKit, CloudinaryDotNet, FluentValidation, RFC 7807 ProblemDetails.
- Frontend: React 19, Vite, HeroUI v3, Tailwind CSS v4, i18next, React Query, React Router, Lucide icons, Sentry React SDK (new).
- CI: GitHub Actions (new).

**Storage**: SQL Server (production), in-memory provider (default tests) with opt-in SQL Server integration tests gated on `DRMIRROR_TEST_SQL_CONNECTION`. Media: Cloudinary in production (`FileStorage__Provider=cloudinary`), local `wwwroot/uploads` in development; payment-proof files private (never via static-file middleware).

**Testing**: xUnit + WebApplicationFactory for backend integration tests (`backend/tests/DrMirror.Tests/{Addresses, Admin, AppConfig, Cart, Catalog, Checkout, Email, Identity, Infrastructure, Inquiries, Options, Orders, Pagination, RateLimit, Security, Seeding, Storage}` plus new folders this feature adds). Vitest for frontend unit/component tests. `npm run i18n:check` for locale parity. `npm run build` for TypeScript compile + Vite production build.

**Target Platform**:
- Frontend: Vercel-class static hosting (current target: Vercel). Build artifact: `frontend/dist/`.
- Backend: MonsterASP.NET-class ASP.NET hosting on Windows (current target: MonsterASP.NET). Build artifact: published `DrMirror.Api`.
- Database: SQL Server on the same host tier or a managed SQL Server instance the host supports.

**Project Type**: Web application (frontend SPA + backend API + database). Source tree already follows `backend/src/DrMirror.Api`, `backend/tests/DrMirror.Tests`, `frontend/src` — preserved.

**Performance Goals**:
- Storefront catalog list & product detail: **p95 ≤ 500 ms** server response (warm cache, single-instance production host) — FR-LB7, SC-013.
- CI duration: **≤ 10 minutes** end-to-end on a standard GitHub-Actions-class runner — SC-002.
- Uptime SLO: **99.5% monthly** measured via 1-minute synthetic readiness checks — FR-R8, SC-014.

**Constraints**:
- RPO ≤ 1 hour, RTO ≤ 2 hours for the production database.
- Payment-proof uploads: ≤ 5 MB, JPEG/PNG/PDF only, server-validated.
- Audit-log retention: indefinite; payment-proof file retention: 2 years post-terminal-state.
- Backend stays stateless apart from SQL Server and external storage (Cloudinary, SMTP, Sentry).
- No business behavior change: 8-state order lifecycle, COD vs Instapay/Wallet proof rules, proof approve/reject admin flow are immutable for this feature.
- HeroUI v3 + Tailwind v4 + Lucide remain the only UI/icon systems; no second design system.

**Scale/Scope**:
- Repository scope: entire monorepo (`backend/`, `frontend/`, `docs/`, `.github/workflows/` to be added). Both customer storefront and admin console surfaces.
- v1 traffic assumption: low-to-moderate Egyptian-market e-commerce — single-instance backend is sufficient with the documented 99.5% SLO; the codebase MUST NOT *block* future horizontal scaling.
- Catalog: scrubs, lab coats, surgical headwear, medical footwear with Size × Colour variant matrix; current dev seed is ~133 variants. Plan must scale to thousands of variants and tens of thousands of orders without hitting list-page hot paths.

**No Open Questions Remain**: All 3 spec-time questions (OQ-1 Sentry, OQ-2 RPO/RTO, OQ-3 GitHub Actions) and all 5 clarification questions (proof upload caps, p95 target, SLO, retention, audit log retention) are resolved in the spec and folded into FRs and Success Criteria.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.0.0.

| Principle | Status | Notes |
|---|---|---|
| **I. Full-Stack Production Reality** (NON-NEG) | PASS | The feature is explicitly scoped to all 13 production layers. Every user story spans more than one layer. |
| **II. Arabic-First Bilingual & RTL Parity** (NON-NEG) | PASS | FR-F1–F12 + UX section require four-state shipping ((dark/light) × (RTL/LTR)) and i18n parity gated by `npm run i18n:check` in CI. No hardcoded strings introduced. |
| **III. Security, Auth & Access Boundaries** (NON-NEG) | PASS | FR-S1–S9, FR-SEC1–SEC10 strengthen — never weaken — JWT auth, role separation, ownership checks, last-admin guard, payment-proof privacy, CORS allowlist, secret hygiene, rate limiting. New integration tests cover every negative case. |
| **IV. Egyptian Payment Integrity** (NON-NEG) | PASS | FR-A4 + spec NG-7 + AC-12 explicitly preserve COD-vs-Instapay/Wallet rules, server-side amount verification, private proof files, cancellation reason persistence, stale-proof guard. The 5 MB / JPEG-PNG-PDF cap is an additional safety improvement, not a business-rule change. |
| **V. Structural Integrity: Vertical Slices & Feature Folders** | PASS | New work lands in existing slices (`Features/Admin/Audit`, extending `Features/Orders/UploadPaymentProof`, `Features/Auth/*`) and existing frontend feature folders. New EF Core migration `M9_AdminAuditLog` is additive. No cross-cutting controllers/services bucket introduced. |
| **VI. Accessibility, Responsive & Theme Parity** | PASS | FR-F3–F11 cover keyboard, focus, theme parity, responsive parity, contrast, alt text. Existing PRODUCT.md anti-references upheld (no "AI assistant" aesthetic, no generic Shopify-minimal). |
| **VII. Observability, Reliability & Recovery** | PASS | Serilog preserved and extended (audit log, Sentry frontend sink). Startup validation extended for `Jwt__Secret` length, `FileStorage__*` (Cloudinary), `Email__*` (mailkit). Outbox lease (M8) preserved. Health endpoint upgraded to a true readiness probe (FR-R1). Runbook + backups documented (FR-R2–R7). |

**Complexity / Violations**: None. No constitutional amendment required.

**Gate**: PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/003-production-reality-hardening/
├── plan.md                    # This file
├── research.md                # Phase 0 output (decisions per technical area)
├── data-model.md              # Phase 1 output (entities + new tables/columns)
├── quickstart.md              # Phase 1 output (verification + dev runbook)
├── contracts/                 # Phase 1 output (API + ops contracts)
│   ├── README.md
│   ├── api-changes.md
│   ├── audit-log.md
│   ├── health.md
│   └── runbook.md
├── checklists/
│   └── requirements.md        # Spec quality checklist (already present)
└── tasks.md                   # Phase 2 output — NOT created by /speckit-plan
```

### Source Code (repository root)

The repository already follows a web-application layout. This feature preserves it and adds only the marked items.

```text
backend/
├── src/DrMirror.Api/
│   ├── Domain/
│   │   ├── Entities/                              # + AdminAuditLogEntry.cs (new)
│   │   └── Identity/
│   ├── Features/                                  # vertical slices (PRESERVED)
│   │   ├── Addresses/
│   │   ├── Admin/
│   │   │   ├── AdminEndpoints.cs
│   │   │   ├── Audit/                             # + new sub-slice for audit query endpoints
│   │   │   ├── Catalog/
│   │   │   ├── Inquiries/
│   │   │   ├── Orders/
│   │   │   ├── Payments/
│   │   │   └── Users/
│   │   ├── AppConfig/
│   │   ├── Auth/
│   │   ├── Cart/
│   │   ├── Catalog/
│   │   ├── Checkout/                              # idempotency-key support added in CreateOrder
│   │   ├── Inquiries/
│   │   └── Orders/                                # UploadPaymentProof tightened (5 MB / JPEG-PNG-PDF)
│   ├── Infrastructure/
│   │   ├── Email/                                 # outbox preserved (M8 lease)
│   │   ├── Extensions/                            # + AdminAuditServiceExtension (new)
│   │   ├── Identity/
│   │   ├── Persistence/
│   │   │   ├── AppDbContext.cs                    # + AdminAuditLogEntries DbSet
│   │   │   ├── Configurations/                    # + AdminAuditLogEntryConfig.cs
│   │   │   ├── DatabaseSeeder.cs
│   │   │   ├── Migrations/                        # + M9_AdminAuditLog (new EF migration)
│   │   │   └── Seed/
│   │   └── Storage/                               # provider switch preserved
│   ├── Shared/
│   │   ├── Auditing/                              # + IAdminAuditWriter, AdminAuditWriter (new)
│   │   ├── HealthChecks/                          # + ReadinessHealthCheck (new)
│   │   ├── RateLimiting/
│   │   ├── Slugs/
│   │   └── Validation/
│   ├── BackgroundServices/                        # + PaymentProofRetentionPurgeService (new)
│   ├── Program.cs                                 # + health-check registration; tighter startup validation
│   ├── appsettings.Example.json                   # + new keys documented
│   └── wwwroot/
└── tests/DrMirror.Tests/
    ├── Admin/
    │   └── Audit/                                 # + new audit log tests
    ├── Checkout/                                  # + concurrency / double-submit / idempotency tests
    ├── Orders/                                    # + payment-proof validation tests (size, MIME)
    ├── Retention/                                 # + new folder for retention purge tests
    ├── Security/                                  # + ownership, role-escalation, disabled-user, refresh-reuse tests
    ├── HealthChecks/                              # + readiness probe tests
    └── ...

frontend/
├── src/
│   ├── app/                                       # Sentry init + ErrorBoundary forwarding
│   ├── features/
│   │   ├── admin/
│   │   │   ├── audit/                             # + new admin audit log viewer (page + hooks)
│   │   │   └── ...
│   │   ├── checkout/                              # idempotency key + duplicate-submit guards
│   │   ├── orders/                                # proof-upload size/type pre-check + localized error
│   │   └── ...
│   ├── locales/
│   │   ├── ar/                                    # + admin.audit, errors.* keys
│   │   └── en/                                    # mirrored
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx                  # forward to Sentry
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api-client.ts                      # idempotency-key header support
│   │       └── sentry.ts                          # + Sentry init/DSN/env tagging (new)
│   └── ...
├── scripts/i18n-check.ts                          # preserved
└── package.json                                   # + @sentry/react dependency

.github/
└── workflows/
    └── ci.yml                                     # NEW — backend + frontend + i18n + lint + optional SQL

docs/
├── PROJECT_MAP.md                                 # NEW — second-operator deploy reference
├── DEPLOY.md                                      # NEW — production deploy + smoke check
├── RUNBOOK.md                                     # NEW — 7-scenario operational runbook
├── BACKUP_RESTORE.md                              # NEW — RPO ≤ 1h / RTO ≤ 2h procedure + drill cadence
├── THREAT_MODEL.md                                # NEW — checkout, proof review, catalog edit, role mgmt
└── REDESIGN_AUDIT.md                              # preserved
```

**Structure Decision**: Web-application layout preserved with surgical additions. All new backend code lands in either an existing feature slice (e.g., `Features/Orders/UploadPaymentProof`) or a new feature sub-slice under the same vertical-slice umbrella (e.g., `Features/Admin/Audit`). Cross-cutting infrastructure (audit writer, readiness check, retention background service) lands under `Shared/Auditing`, `Shared/HealthChecks`, and `BackgroundServices/` respectively — these are pure infrastructure with no business behavior. Migration `M9_AdminAuditLog` is additive only (per Principle V). Frontend additions land in existing feature folders (`features/admin/audit`, `features/checkout`, `features/orders`) and `shared/lib/sentry.ts`. The new CI workflow lands in `.github/workflows/ci.yml`. New documentation lands in `docs/` (the `PROJECT_MAP.md` reference in README is satisfied).

## Complexity Tracking

No constitutional violations. Table left blank intentionally.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)*  | *(n/a)*    | *(n/a)*                              |

## Phase 0 — Research

See [research.md](./research.md). All technical decisions for each Layer 1–13 area are recorded with **Decision / Rationale / Alternatives**. No `NEEDS CLARIFICATION` markers remain.

## Phase 1 — Design & Contracts

See:
- [data-model.md](./data-model.md) — entities preserved, new `AdminAuditLogEntry` table, new EF Core configuration, indexes, retention behavior.
- [contracts/README.md](./contracts/README.md) and adjacent contract files — API, audit log, health endpoint, and operational runbook contracts.
- [quickstart.md](./quickstart.md) — how a developer or operator verifies this feature locally and in production-class staging.

## Constitution Re-Check (Post-Design)

After completing Phase 0 + Phase 1 artifacts: re-evaluated all seven principles against `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`. **No new violations introduced.** Sentry SDK is a permitted addition (third-party error tracking is explicitly named in FR-O2 and is the only new runtime dependency; it does not replace any architecture component). GitHub Actions is a permitted CI runner (does not affect runtime). All other additions sit within existing structural categories. **Gate: PASS — ready for `/speckit-tasks`.**
