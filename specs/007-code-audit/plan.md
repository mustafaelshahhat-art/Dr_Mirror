# Implementation Plan: Full-Stack Code Audit (Read-Only)

**Branch**: `007-code-audit` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-code-audit/spec.md`

## Summary

Produce a single comprehensive, read-only audit report (`specs/007-code-audit/audit-report.md`) that grades the entire Dr_Mirror codebase against general best practices plus the project's own conventions in `CLAUDE.md` and the eight constitutional principles. The report covers backend (.NET 10 vertical slices, EF Core, Identity, background services), frontend (React 19, HeroUI v3, RTL/i18n, Tailwind v4, forms, accessibility), and cross-cutting concerns (dependencies, repo hygiene, docs drift, secret exposure, forbidden dependencies). Every finding carries severity + category + concrete location + suggested remediation in prose. The audit MUST NOT modify any file outside `specs/007-code-audit/`.

**Technical approach**: A deterministic, scripted sweep. Each layer is audited in a fixed order using `git ls-files` as the source of truth for in-scope files, with Grep/Glob/Read calls and read-only verification commands (`npm run i18n:check`, `npm --prefix frontend run build`, `dotnet build`, `dotnet test --no-build`). All findings are appended to the report file under per-layer sections, then sorted into a prioritized punch-list. Generated/vendored paths are excluded. Prior audit specs (003–006) are consulted for context — the new audit verifies prior findings remain resolved rather than rediscovering them.

## Technical Context

**Language/Version**: N/A for the deliverable (plain Markdown). Codebase under audit: C# / .NET 10, TypeScript ~5.x targeting React 19, JSON, CSS (Tailwind v4 source), PowerShell scripts.

**Primary Dependencies**: None added. Audit uses only tools already available — Grep, Glob, Read, Bash (PowerShell on Windows), plus the read-only verification scripts already in the repo (`npm run i18n:check`, `npm run build`, `dotnet build`).

**Storage**: Filesystem only. Single primary artifact: `specs/007-code-audit/audit-report.md`. No database, no service.

**Testing**: Acceptance is asserted by post-run `git diff` showing zero changes outside `specs/007-code-audit/`, plus checklist self-validation against `spec.md` SC-001 through SC-006. No new test files are created.

**Target Platform**: Local developer workstation — Windows 11 + PowerShell 5.1, Node ≥20, .NET 10 SDK. Same as the rest of the repo.

**Project Type**: Documentation deliverable (audit report). Not a runtime feature.

**Performance Goals**: Complete the audit in a single reasonable sitting (single-digit hours of model time). No hard latency SLO — this is a one-shot artifact, not a continuous check.

**Constraints**:
- **Read-only on source** (FR-002, SC-003): all writes scoped to `specs/007-code-audit/`.
- **Single primary deliverable file** (FR-003): findings consolidated into one markdown report, not scattered.
- **Coverage-complete**: every top-level source folder MUST appear in the Coverage Map (SC-001), even if zero findings.
- **Convention parity**: every `CLAUDE.md` "Key Conventions" rule MUST appear as a named audit category (SC-005).

**Scale/Scope**:
- Backend: ~80 feature files across `backend/src/DrMirror.Api/Features/**`, plus Domain / Infrastructure / Background services / Shared (≈ a few thousand C# lines).
- Frontend: ~200+ `.ts`/`.tsx`/`.css` files across `frontend/src/**`, plus 24 locale namespace files (12 ar + 12 en).
- Docs: `docs/**` (excluding screenshot PNGs).
- Root configs: `package.json`, `*.csproj`, `*.sln`, `.gitignore`, `appsettings*.json`, CI scripts, `.specify/**` configuration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This is a **read-only audit**. By construction the feature cannot introduce stack-level regressions — it produces a markdown report and changes no source code. The audit itself is *evaluated against* the constitution; this gate verifies the audit's design is also constitutional.

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Full-Stack Production Reality | ✅ PASS | The audit explicitly covers all ten Production Reality layers (frontend, APIs, DB/EF, auth, hosting/config, CI/scripts, security, rate limiting, observability, recovery). User Stories 2–4 enforce this. |
| II | Arabic-First / RTL Parity | ✅ PASS | The audit *enforces* this on the codebase via US3 (logical-CSS enumeration, i18n parity check). The report itself is English Markdown — explicitly noted in spec Assumptions; this is consistent with prior spec deliverables (003, 005, 006). |
| III | Security, Auth & Access Boundaries | ✅ PASS | The audit *evaluates* JWT, role separation, ownership checks, payment-proof privacy, CORS, secrets, rate limiting (US2, US4). It does not relax any boundary. |
| IV | Egyptian Payment Integrity | ✅ PASS | Audit checks COD-vs-proof flow integrity, payment-proof privacy, cancellation-reason consistency, and server-side total verification as part of US2. No payment behavior changes. |
| V | Structural Integrity / Vertical Slices | ✅ PASS | The audit reads vertical slices; it does not move, rename, or restructure code. Findings about structure are recorded in prose, not applied. |
| VI | Accessibility / Responsive / Theme Parity | ✅ PASS | The audit *evaluates* keyboard nav, focus management, theme parity, WCAG AA contrast as a named category in US3. |
| VII | Observability / Reliability / Recovery | ✅ PASS | The audit checks Serilog enrichment, startup validation, seeder idempotency, outbox lease behavior, health endpoint, and migration reversibility as part of US2. |
| VIII | UI System & Visual Discipline | ✅ PASS | The audit enforces HeroUI-only, Lucide-only, one accent, max 3 weights, max 2 nesting, no glow/glass, no arbitrary Tailwind values, logical CSS only, `formatCurrency` mandatory, i18n parity. Each is a named audit category per SC-005. |

**Gate result**: PASS. No constitutional violations to justify. Complexity Tracking section is therefore intentionally omitted (the template permits this when there are no violations).

**Post-Phase-1 re-check** (recorded at end of Phase 1 below): still PASS — Phase 1 design adds no source-tree modifications.

## Project Structure

### Documentation (this feature)

```text
specs/007-code-audit/
├── plan.md                       # This file
├── spec.md                       # Feature specification
├── research.md                   # Phase 0 — rule sets, scope decisions, prior-audit context
├── data-model.md                 # Phase 1 — Finding/Coverage-Map/Report shapes
├── quickstart.md                 # Phase 1 — how to reproduce the audit
├── contracts/
│   └── report-schema.md          # Phase 1 — required structure of audit-report.md
├── checklists/
│   └── requirements.md           # Spec quality checklist (already produced by /speckit-specify)
├── audit-report.md               # FINAL DELIVERABLE — written during /speckit-implement
└── tasks.md                      # Phase 2 — produced by /speckit-tasks (NOT created here)
```

### Source Code (repository root) — under audit, never modified

```text
backend/
├── src/DrMirror.Api/
│   ├── Features/           # Vertical slices: Addresses, Admin/*, AppConfig, Auth, Cart, Catalog,
│   │                       # Checkout, Inquiries, Orders
│   ├── Domain/             # Entities/, Orders/ (enums, OrderStatus, OrderStateMachine)
│   ├── Infrastructure/     # Email outbox, Identity, Persistence (EF + seeder + migrations), Storage
│   ├── BackgroundServices/ # PaymentProofRetentionPurgeService, EmailOutboxRetentionService
│   └── Shared/             # Auditing, HealthChecks, RateLimiting, Logging, Slugs, Validation
└── tests/DrMirror.Tests/   # xUnit suite — audited for coverage gaps only

frontend/
├── src/
│   ├── app/                # router.tsx, providers.tsx
│   ├── features/           # addresses, admin/* (audit, catalog, components, users), app-config,
│   │                       # auth, cart, catalog, checkout, inquiries, orders
│   ├── shared/             # components, lib (api-client, format, i18n, sentry), hooks, pages, types
│   ├── locales/            # ar/ + en/ — 12 namespace files each (i18n parity target)
│   └── styles/             # globals.css — OKLCH palette, font-face, HeroUI v3 token aliases
└── package.json            # Dependency hygiene + repo-boundary check

docs/                       # Documentation drift evaluation (screenshots/ excluded as content)
.specify/                   # Spec Kit configuration — light review only
*.sln, *.csproj, *.json     # Root configs — secret-exposure + .gitignore review
```

**Structure Decision**: Standard Web-application layout (Option 2 from the template) — `backend/` + `frontend/`. The deliverable lives entirely under `specs/007-code-audit/`. The audit does not change the structure; it only references it.

## Complexity Tracking

> Constitution Check passed with zero violations. No complexity entries required.

---

## Phase 0 → Phase 1 Outputs

The artifacts referenced under "Documentation (this feature)" are generated alongside this plan:

- [research.md](./research.md) — Phase 0: rule catalog (general best practice + CLAUDE.md + constitution), scope decisions (which paths are in/out), prior-audit reuse map (003 → 006), verification-command policy.
- [data-model.md](./data-model.md) — Phase 1: structural shape of Finding, Coverage Map entry, and Report sections expressed as markdown schemas (since the deliverable is markdown, not a database).
- [contracts/report-schema.md](./contracts/report-schema.md) — Phase 1: the report's *external interface* — the section headings, field order, and severity/category enums that downstream `/speckit-tasks` and `/speckit-implement` must honor.
- [quickstart.md](./quickstart.md) — Phase 1: the reproducible sequence a future contributor follows to re-run the audit.

**Agent context update**: `CLAUDE.md`'s `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` block is updated to reference this plan file.

**Post-design Constitution re-check**: PASS. The Phase 1 outputs add no source modifications and no new runtime dependencies; the read-only invariant is preserved.
