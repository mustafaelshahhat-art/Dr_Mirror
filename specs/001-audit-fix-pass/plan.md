# Implementation Plan: Audit Fix Pass

**Branch**: `001-audit-fix-pass` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-audit-fix-pass/spec.md`

## Summary

Fix all 9 issues found in the code audit (3 Medium, 6 Low). Backend fixes: rewrite cache-control middleware using `Response.OnStarting`, extend outbox purge to include `Failed` rows, fix purge-count logging, add `using` to payment-proof stream. Frontend fixes: refactor 5 admin forms from raw `useState` to react-hook-form + Zod with `isRequired` on mandatory fields. Cross-cutting: harden CI lint step, add `eslint-plugin-jsx-a11y`.

**Pre-plan finding**: F-006 (skip-link) is already resolved in the current codebase — both `Layout.tsx` and `AdminLayout.tsx` already have visually-hidden skip-links targeting `#main-content` / `#admin-main`. No work needed.

## Technical Context

**Language/Version**: .NET 10 (C# 14) + TypeScript ~6 + React 19

**Primary Dependencies**: ASP.NET Core Minimal APIs, EF Core 10, HeroUI v3, react-hook-form 7.x, zod 4.x, @hookform/resolvers 5.x

**Storage**: SQL Server via EF Core (no schema changes needed)

**Testing**: xUnit (backend `dotnet test`), Vitest (frontend `npm test`)

**Target Platform**: Web — server + SPA

**Project Type**: Full-stack web application (e-commerce)

**Performance Goals**: Cache-control headers on catalog endpoints for browser/CDN caching

**Constraints**: No new npm dependencies except `eslint-plugin-jsx-a11y` (dev). No API contract changes. No DB migrations.

**Scale/Scope**: 9 discrete fixes across ~12 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Full-Stack Production Reality | ✅ Pass | Fixes span backend middleware, background services, frontend forms, CI — all production layers |
| II | Arabic-First Bilingual & RTL | ✅ Pass | No new user-facing strings needed (F-006 skip-link already has i18n keys). Admin forms keep existing i18n labels |
| III | Security, Auth & Access | ✅ Pass | F-004 stream fix strengthens resource safety. No auth/CORS/rate-limit changes |
| IV | Egyptian Payment Integrity | ✅ Pass | F-004 hardens payment-proof upload. No payment flow changes |
| V | Structural Integrity | ✅ Pass | All changes in existing files within their feature slices. No new endpoints or DTOs |
| VI | Accessibility, Responsive & Theme | ✅ Pass | F-005/F-007 adds `isRequired` + schema validation to admin forms. F-006 already done. F-009 adds lint-time a11y checks |
| VII | Observability, Reliability & Recovery | ✅ Pass | F-002 fixes data growth. F-003 fixes log accuracy |
| VIII | UI System & Visual Discipline | ✅ Pass | F-005 enforces react-hook-form + Zod convention. HeroUI-only, Lucide-only maintained |

**Gate result**: ✅ ALL PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-audit-fix-pass/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (files modified)

```text
backend/src/DrMirror.Api/
├── Program.cs                                                    # F-001: cache-control via OnStarting
├── BackgroundServices/
│   ├── EmailOutboxRetentionService.cs                            # F-002: purge Failed rows
│   └── PaymentProofRetentionPurgeService.cs                      # F-003: accurate purge count
└── Features/Orders/UploadPaymentProof/
    └── UploadPaymentProofEndpoint.cs                             # F-004: using on stream

frontend/
├── src/features/addresses/components/AddressForm.tsx             # F-005: RHF+Zod
├── src/features/admin/catalog/AdminCategoriesPage.tsx            # F-005+F-007: RHF+Zod+isRequired
├── src/features/admin/catalog/components/
│   ├── ProductMasterForm.tsx                                     # F-005+F-007: RHF+Zod+isRequired
│   └── ProductVariantsSection.tsx                                # F-005+F-007: RHF+Zod+isRequired
├── src/features/admin/catalog/components/payment-methods/
│   └── PaymentMethodForm.tsx                                     # F-005+F-007: RHF+Zod+isRequired
├── eslint.config.js                                              # F-009: jsx-a11y plugin
└── package.json                                                  # F-009: jsx-a11y devDep

.github/workflows/ci.yml                                         # F-008: remove conditional lint guard
```

**Structure Decision**: Web application (existing structure). All changes are in-place edits to existing files. No new files except possible Zod schema modules co-located with their forms.

## Complexity Tracking

No violations — table not needed.
