# Implementation Plan: Code Quality & Reliability Hardening Pass

**Branch**: `005-code-quality-hardening` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-code-quality-hardening/spec.md`

## Summary

This pass closes five verified gaps from the 004-branch audit. The technical approach, in one line per gap:

1. **Proof-file delete observability** — Stop swallowing exceptions in `LocalFileStorageService.DeleteAsync`. Surface non-"file missing" failures to the caller; the proof retention background service catches them, logs at warning, and leaves `FilePurgedAtUtc` unset so the row is re-tried on the next run.
2. **Outbox terminal state + bounded backoff** — `OutboxMessageStatus.Failed` already exists and is already wired; the actual changes are (a) make `maxAttempts` configurable via `EmailOptions` (default 7, down from the current hardcoded 10) and (b) clamp the exponential backoff to a 7-day ceiling. No database migration required.
3. **Shared toast helper for transport/server errors** — Add HeroUI's `ToastProvider` to the app provider chain. New `useApiErrorToast()` hook in `frontend/src/shared/hooks/` that maps `(status, ProblemDetails.title|type)` to a frontend translation key via a new `frontend/src/shared/lib/api-error-map.ts` module. Falls back to a generic localized message. `.detail` is captured into Sentry breadcrumbs but never rendered. Sweep all mutations in cart/checkout/orders/admin/inquiries/addresses/app-config to call the hook in `onError`.
4. **Centralized React Query keys** — New `frontend/src/shared/lib/query-keys.ts` exporting typed key factories (`queryKeys.cart()`, `queryKeys.orders.detail(id)`, etc.). Sweep all `useQuery` / `useMutation` / `setQueryData` / `invalidateQueries` call sites to consume from this module. Two ESLint rules guard the convention (see research R5).
5. **Accessibility regression smoke tests** — Eight tests under `frontend/src/test/a11y/`, two per route group (happy path + one non-happy state), reusing the existing `axe.ts` helper. Specific non-happy states per spec FR-017a. At least one test runs under Arabic locale.

The pass is intentionally bounded: no architectural refactors, no new top-level folders, no API contract changes, no UI/UX changes from Phase A–H.

## Technical Context

**Language/Version**: C# 13 on .NET 10 (backend); TypeScript 6 on React 19 + Vite 8 (frontend).

**Primary Dependencies**:
- Backend: ASP.NET Core Minimal APIs, EF Core (SQL Server provider), Serilog, MailKit.
- Frontend: HeroUI 3 (provides `ToastProvider` / `addToast`), TanStack Query 5, react-i18next 17, axios 1, react-hook-form 7 + zod 4, Sentry SDK 10.

**Storage**: SQL Server via EF Core; local filesystem for payment-proof artifacts in dev (`wwwroot/uploads`).

**Testing**:
- Backend: xUnit + `WebApplicationFactory` in `backend/tests/DrMirror.Tests`. Integration tests use a real EF Core DB per constitution VII.
- Frontend: Vitest 4 + Testing Library + jsdom 29, plus `vitest-axe` (already wired in `frontend/src/test/axe.ts`).

**Target Platform**: API runs as ASP.NET Core service (Windows/Linux). SPA is statically deployed; evergreen Chrome/Edge/Safari/Firefox.

**Project Type**: Web application (separate `backend/` and `frontend/` projects).

**Performance Goals**: No new SLOs introduced. Existing behavior preserved on retention runs and outbox tick. Frontend mutation error overhead is bounded by one toast render per failed request.

**Constraints**:
- No new top-level project folders (FR-020).
- No public HTTP API contract changes (FR-021).
- No UI/UX changes from Phase A–H (FR-022) other than the addition of consistent error toasts.
- No browser-automation dependency (FR-023, CLAUDE.md repo boundary).
- New user-visible strings in both Arabic and English (FR-024, Constitution II).

**Scale/Scope**: ~25 mutation call sites to migrate (cart, checkout, orders, admin proof review, admin user mgmt, admin catalog, inquiries, addresses, app-config). Eight new a11y tests. One new HeroUI provider, three new frontend modules (toast hook, error-signal map, key-factory module), two backend code-level changes (storage delete-throw, outbox config + cap), zero migrations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Evaluated against the seven principles in `.specify/memory/constitution.md` v1.0.0:

| Principle | Pass | Notes |
|---|---|---|
| **I. Full-Stack Production Reality (NON-NEGOTIABLE)** | PASS | Touches Frontend (toast helper, query keys, a11y tests), API (LocalFileStorageService, EmailOutboxProcessor, options binding), Auth (none), Storage (no schema change). Each affected layer is addressed in tasks. |
| **II. Arabic-First Bilingual & RTL Parity (NON-NEGOTIABLE)** | PASS | All new user-visible strings (toast titles, fallback message, per-signal mapped messages) added under existing `ar/errors.json` + `en/errors.json` namespaces. One of the eight a11y tests exercises `dir="rtl"` per FR-018. |
| **III. Security, Auth & Access Boundaries (NON-NEGOTIABLE)** | PASS | No auth, ownership, or proof-privacy changes. The toast helper explicitly never renders ProblemDetails `.detail` (FR-010b), eliminating any leak risk introduced by this change. Sentry continues to scrub PII via the existing `sentry.ts` redaction. |
| **IV. Egyptian Payment Integrity (NON-NEGOTIABLE)** | PASS | No COD/Instapay/wallet logic changes. The proof-retention compliance fix (US 1) strengthens the existing 2-year purge guarantee — a net positive for this principle. |
| **V. Structural Integrity: Vertical Slices & Feature Folders** | PASS | No new top-level folders (FR-020). Frontend additions live in `shared/lib` + `shared/hooks` + `test/a11y` (all pre-existing layout slots). Backend additions live in `Infrastructure/Storage` + `Infrastructure/Email` + `BackgroundServices` (all pre-existing). No API contract change (FR-021). |
| **VI. Accessibility, Responsive & Theme Parity** | PASS | Phase G work is what this pass protects. No new widget surface; the toast comes from HeroUI's accessible primitive (`role="status"`). Eight regression-locking tests are the spec's whole point for US 5. |
| **VII. Observability, Reliability & Recovery** | PASS | Both US 1 (proof delete) and US 2 (outbox terminal state) are direct observability/reliability uplifts. New Serilog structured properties for failure logging. Existing lease-based outbox claim semantics are preserved unchanged. |

**Verdict**: PASS. No violations. Complexity Tracking section is empty.

**Post-design re-check** (after Phase 1 artifacts written): The data-model confirms zero schema changes, the contracts directory confirms zero API contract changes, and the quickstart confirms a clean rollback path. No principle re-evaluation flips negative. Verdict unchanged: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/005-code-quality-hardening/
├── plan.md                          # This file
├── research.md                      # Phase 0 output (created by /speckit-plan)
├── data-model.md                    # Phase 1 output (created by /speckit-plan)
├── quickstart.md                    # Phase 1 output (created by /speckit-plan)
├── contracts/
│   └── README.md                    # Phase 1: documents that NO contracts change in this feature
├── checklists/
│   └── requirements.md              # From /speckit-specify
└── tasks.md                         # Phase 2 output (NOT created here; /speckit-tasks will create it)
```

### Source Code (repository root)

**Backend additions / modifications**

```text
backend/src/DrMirror.Api/
├── Infrastructure/
│   ├── Storage/
│   │   └── LocalFileStorageService.cs                  # MODIFY: DeleteAsync throws on real failures
│   └── Email/
│       ├── EmailOptions.cs                             # MODIFY: add MaxAttempts (default 7) + MaxBackoff (default 7d)
│       └── EmailOutboxProcessor.cs                     # MODIFY: read options, clamp backoff, drop hardcoded `const int maxAttempts = 10`
└── BackgroundServices/
    └── PaymentProofRetentionPurgeService.cs            # MODIFY: catch storage exceptions, log warning, skip FilePurgedAtUtc on failure

(no new files, no migration, no new entity field)

backend/tests/DrMirror.Tests/
├── Retention/
│   └── ProofPurge/
│       └── DeleteFailureRetriesNextRunTests.cs         # NEW: covers FR-001..FR-004
└── Email/
    ├── OutboxMaxAttemptsConfigurableTests.cs           # NEW: covers FR-006
    └── OutboxBackoffCeilingTests.cs                    # NEW: covers FR-005
```

**Frontend additions / modifications**

```text
frontend/src/
├── shared/
│   ├── lib/
│   │   ├── api-error-map.ts                            # NEW: signal -> translation-key mapping module (FR-010, FR-010a)
│   │   └── query-keys.ts                               # NEW: typed query-key factory module (FR-014)
│   └── hooks/
│       └── useApiErrorToast.ts                         # NEW: shared toast helper (FR-009, FR-011, FR-012, FR-013)
├── app/
│   └── providers.tsx                                   # MODIFY: add HeroUI <ToastProvider /> inside <LocaleScope>
├── locales/
│   ├── ar/errors.json                                  # MODIFY: add toast.* keys (FR-024)
│   └── en/errors.json                                  # MODIFY: add toast.* keys (FR-024)
├── features/
│   ├── cart/                                           # MODIFY: CartProvider mutations -> use useApiErrorToast + queryKeys.cart
│   ├── checkout/                                       # MODIFY: createOrder + saveAddress mutations; remove `serverError` local state
│   ├── orders/                                         # MODIFY: hooks + uploadPaymentProof mutation
│   ├── admin/                                          # MODIFY: AdminProofReview, user-role mgmt, admin catalog mutations
│   ├── inquiries/                                      # MODIFY: createInquiry + replyToInquiry mutations
│   ├── addresses/                                      # MODIFY: address CRUD mutations
│   └── app-config/                                     # MODIFY: any admin config mutations (sweep)
└── test/
    └── a11y/                                           # NEW SUBFOLDER under existing test/
        ├── cart.happy.test.tsx                         # NEW (covers FR-017)
        ├── cart.empty.test.tsx                         # NEW
        ├── checkout.happy.test.tsx                     # NEW
        ├── checkout.error.test.tsx                     # NEW (with visible validation error)
        ├── orders.happy.test.tsx                       # NEW
        ├── orders.empty.test.tsx                       # NEW
        ├── admin-order-detail.happy.test.tsx           # NEW
        └── admin-order-detail.proof-review.test.tsx    # NEW (Arabic locale — covers FR-018)

(eslint.config.js MODIFY: two no-restricted-syntax rules guarding inline query-key tuples — see research R5)
(axe.ts, setup.ts already exist; reused)
```

**Structure Decision**: This repository is a multi-project web application with `backend/` (.NET API) and `frontend/` (Vite SPA) at the root. The plan adds new files **only** within existing top-level folders to honor FR-020 and Constitution Principle V. New `test/a11y/` is a subdirectory of `frontend/src/test/`, not a new top-level location. The `contracts/` folder is created under this spec for the audit trail but is intentionally empty save for a README — no public contract changes ship in this feature.

## Complexity Tracking

> Empty: no constitutional violations require justification.
