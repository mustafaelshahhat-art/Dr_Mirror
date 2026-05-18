# Implementation Plan: May 2026 Audit Hardening Pass

**Branch**: `006-audit-hardening` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-audit-hardening/spec.md`

## Summary

Close the 26 findings from the May 2026 full-project audit without changing any user-visible storefront/admin behaviour and without altering the existing public API contract (with two strictly additive exceptions: the new `addressSaveOutcome` enum field on the checkout response, and the relaxation of admin publish/unpublish to be idempotent on no-op transitions).

Work is grouped into four themes mapped to the spec's eight prioritised user stories:

1. **API security headers + refresh-endpoint Origin allowlist + open-redirect tightening** — a single security-headers middleware in front of the pipeline; a per-endpoint Origin filter on `/api/auth/refresh`; percent-decoding in the SPA's `getSafeNextPath`.
2. **Streaming proof file + Sentry cycle-safe scrubber** — replace `GetByteArrayAsync` with `GetStreamAsync` and return the raw `Stream`; add a `WeakSet` visited guard to `scrubObject`.
3. **Audit truthfulness, address-book-full visibility, exact-match auth path interceptor** — load the row before publish/unpublish, write audit only on real transitions; thread an `addressSaveOutcome` enum through `CreateOrderResponse`; tighten the SPA's `isAuthEndpoint` to anchored regex match.
4. **CI hardening** — add `dotnet list package --vulnerable --include-transitive` and `npm audit --audit-level=high` steps; add a release-target CI step that runs the same startup-secret validation the API performs at boot.

All work is constrained by the existing test runners (xUnit + Vitest), no browser-automation tooling, and the existing i18n parity gate.

## Technical Context

**Language/Version**: Backend C# on **.NET 10** (LTS-track). Frontend **TypeScript ~6** on **Node 22** (per `frontend/.nvmrc`).

**Primary Dependencies**: ASP.NET Core Minimal APIs, EF Core 10, ASP.NET Identity, Serilog, MailKit, Cloudinary SDK, Mapster, FluentValidation. Frontend React 19, Vite 8, HeroUI v3, Tailwind v4, react-router-dom v7, TanStack Query v5, react-hook-form + Zod, axios, i18next, Sentry browser SDK.

**Storage**: SQL Server (via EF Core). No schema migration required by this feature.

**Testing**: Backend xUnit (`backend/tests/DrMirror.Tests`). Frontend Vitest (`npm --prefix frontend test`). **No browser automation may be added** (repo boundary).

**Target Platform**: API hosted on MonsterASP (Windows / .NET host with HTTPS terminating at the edge). SPA hosted on Vercel. Both behind public DNS.

**Project Type**: Web application — backend ASP.NET Core service + frontend React SPA, two surfaces (storefront + admin dashboard).

**Performance Goals**: Match or improve existing baselines. Specifically: payment-proof streaming endpoint MUST not grow API working set by more than ~1 MB during a 5 MB transfer (SC-003); Sentry scrubber MUST complete a 1,000-node cyclic graph in under 50 ms (SC-011); no measurable latency added to non-targeted endpoints by the security-headers middleware.

**Constraints**: No public API contract change beyond FR-017 (`addressSaveOutcome`) and FR-015 (idempotent publish/unpublish). No new UI flow change beyond the new address-save-skipped toast (FR-018). No new locales beyond `ar` and `en`. No new browser-automation dependencies. RTL + dark/light parity preserved for the new toast.

**Scale/Scope**: Hardening pass — affects ~10 backend files (middleware, two endpoints, one storage adapter, configuration), ~6 frontend files (sentry, api-client, ProtectedRoute, checkout response handling, toast string, query of address-save outcome), and 1 CI workflow file. ~15 new automated tests across backend xUnit + frontend Vitest.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.1.0 (Principles I–VIII).

| Principle | Status | Notes |
|---|---|---|
| **I. Full-Stack Production Reality** | PASS | The feature touches frontend (Sentry, auth path matcher, redirect resolver, toast), API (headers middleware, Origin filter on refresh, streaming, audit truthfulness, checkout response field), and CI (vuln gates, secrets validation). Every theme reasons about its production-stack impact. |
| **II. Arabic-First Bilingual & RTL Parity** | PASS | Only one new user-visible string is introduced (FR-018 toast); the plan requires entries in both `locales/ar/orders.json` (or `checkout.json`) and `locales/en/...`, validated by the existing `npm run i18n:check` CI step. |
| **III. Security, Auth & Access Boundaries** | PASS — strengthens | The whole point of the feature is to harden auth boundaries (Origin allowlist on refresh; security headers; redirect tightening). No existing control is loosened. |
| **IV. Egyptian Payment Integrity** | PASS — neutral | Payment-proof streaming change is a memory-profile refactor; auth, ownership, rate-limit, and audit semantics are explicitly preserved (FR-009). No COD/Instapay/wallet rules touched. |
| **V. Structural Integrity: Vertical Slices & Feature Folders** | PASS | All backend edits live inside existing feature slices (`Features/Auth/Refresh`, `Features/Orders/DownloadPaymentProof`, `Features/Admin/Catalog/Products`, `Features/Checkout/CreateOrder`). The new headers middleware lives under `Shared/Http/` (new folder for a new cross-cutting concern), justified below in Complexity Tracking. |
| **VI. Accessibility, Responsive & Theme Parity** | PASS | The single new UI affordance (toast) reuses the existing HeroUI toast pattern, which already satisfies focus/keyboard/contrast/RTL/theme parity. |
| **VII. Observability, Reliability & Recovery** | PASS — strengthens | The CI secrets-validation gate (FR-024) converts a runtime failure into a build failure, directly extending the constitution's "startup validation" requirement. Audit truthfulness (FR-014) increases the trustworthiness of structured logs. |
| **VIII. UI System & Visual Discipline** | PASS | New toast uses HeroUI v3, Lucide icon, logical CSS, single emerald accent. No second hue, no glow, no arbitrary Tailwind values. No new form is introduced; the existing checkout form is unchanged. |

**Result:** **All gates pass.** One minor structural decision (the new `Shared/Http/SecurityHeadersMiddleware.cs` location) is recorded in Complexity Tracking for transparency.

## Project Structure

### Documentation (this feature)

```text
specs/006-audit-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 — implementation-decision research
├── data-model.md        # Phase 1 — entity & response-shape changes
├── quickstart.md        # Phase 1 — local-dev verification recipe
├── contracts/           # Phase 1 — HTTP wire contracts
│   ├── refresh-origin-policy.md
│   ├── checkout-response.md
│   ├── publish-unpublish-idempotency.md
│   └── security-headers.md
├── checklists/
│   └── requirements.md  # Created by /speckit.specify
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

This is a **web application** layout (backend + frontend). The feature touches only existing slices; the only **new** path is the shared security-headers middleware folder.

```text
backend/src/DrMirror.Api/
├── Features/
│   ├── Auth/Refresh/
│   │   └── RefreshEndpoint.cs                  # add Origin-allowlist filter
│   ├── Admin/Catalog/Products/
│   │   └── AdminProductsEndpoints.cs           # idempotent publish/unpublish, truthful audit
│   ├── Checkout/CreateOrder/
│   │   ├── CreateOrderEndpoint.cs              # populate addressSaveOutcome
│   │   └── CreateOrderResponse.cs              # add AddressSaveOutcome enum + field
│   └── Orders/DownloadPaymentProof/
│       └── DownloadPaymentProofEndpoint.cs     # stream pass-through (no buffering)
├── Infrastructure/
│   └── Storage/
│       └── CloudinaryFileStorageService.cs     # GetStreamAsync instead of GetByteArrayAsync
├── Shared/
│   └── Http/                                   # NEW folder
│       ├── SecurityHeadersMiddleware.cs        # NEW
│       └── SecurityHeadersOptions.cs           # NEW
└── Program.cs                                  # wire middleware in the correct order
backend/tests/DrMirror.Tests/
├── Security/
│   ├── SecurityHeadersTests.cs                 # NEW
│   ├── RefreshOriginAllowlistTests.cs          # NEW
│   └── AdminProductIdempotencyAuditTests.cs    # NEW
├── Storage/
│   └── PaymentProofStreamingTests.cs           # NEW (memory profile)
└── Checkout/
    └── AddressSaveOutcomeTests.cs              # NEW

frontend/src/
├── shared/lib/
│   ├── sentry.ts                               # cycle-safe scrubObject
│   └── api-client.ts                           # anchored isAuthEndpoint matcher
├── features/auth/
│   └── ProtectedRoute.tsx                      # percent-decode + reject //
├── features/checkout/
│   ├── api.ts                                  # type AddressSaveOutcome
│   └── components/CheckoutSuccessNotice.tsx    # NEW toast trigger using existing pattern
└── locales/
    ├── ar/checkout.json                        # ADD "addressNotSaved..." key
    └── en/checkout.json                        # ADD "addressNotSaved..." key
frontend/src/test/
├── sentry.cycle.test.ts                        # NEW
├── api-client.auth-match.test.ts               # NEW
└── protected-route.next-redirect.test.ts       # NEW (open-redirect coverage)

.github/workflows/
└── ci.yml                                      # add dotnet-vuln + npm-audit + secrets-precheck steps

backend/scripts/                                # NEW folder (CI-only helper)
└── verify-prod-secrets.ps1                     # NEW — runs same validation as Program.cs
```

**Structure Decision**: Web application (backend + frontend), already-established vertical slices on the backend and feature folders on the frontend. The only new directory is `backend/src/DrMirror.Api/Shared/Http/` for the cross-cutting security-headers middleware, plus a CI helper script under `backend/scripts/`. Both are justified in **Complexity Tracking** below.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **New folder** `Shared/Http/` for `SecurityHeadersMiddleware.cs` | The middleware is genuinely cross-cutting — it must run before *any* feature slice's endpoint and after `UseRouting`. There is no existing feature it logically belongs to. | Putting it under any single feature slice (e.g., `Features/Auth`) would violate Principle V because the middleware applies to catalog, orders, admin, and health responses equally — it is not authentication code. |
| **New folder** `backend/scripts/verify-prod-secrets.ps1` | The CI secrets-precheck step (FR-024) needs a reusable entry point that imports the same validation logic the API runs at startup, so CI cannot drift from runtime. | Inlining the PowerShell into `.github/workflows/ci.yml` would couple CI YAML to backend internals and make local repro harder. A `backend/scripts/` script can be invoked identically from CI and from a developer machine. |

Both additions are minor and self-contained. All other work happens inside existing slices and existing feature folders.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 artifacts (research.md, data-model.md, contracts/, quickstart.md) were generated.*

- All eight principles remain in the same status as the pre-design check above.
- No new structural deviation was introduced in Phase 1.
- The only public API contract changes are exactly those listed in FR-017 (additive enum field) and FR-015 (idempotent success), both documented under `contracts/`.
- No new dependencies introduced. CI uses tools already shipped with the toolchain (`dotnet list package --vulnerable`, `npm audit`).

**Result:** **Re-check PASS.** Plan is ready for `/speckit.tasks`.
