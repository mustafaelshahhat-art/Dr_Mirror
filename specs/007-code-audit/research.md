# Phase 0 — Research: Full-Stack Code Audit

This document resolves all open questions before Phase 1 design. The audit has no `NEEDS CLARIFICATION` markers in the spec, so research here focuses on **rule consolidation, scope boundaries, and prior-context reuse** rather than unknowns.

## Decisions

### Decision 1 — Rule sources are layered

**Decision**: The audit applies three rule layers, in increasing precedence:
1. **General best practice** for each language/framework (C# / .NET 10 / ASP.NET Core / EF Core for backend; React 19 / TypeScript / Tailwind / a11y for frontend).
2. **Project conventions** from `CLAUDE.md` (logical CSS, HeroUI-only, Lucide-only, react-hook-form + Zod, `formatCurrency`, i18n parity, no arbitrary Tailwind values, one accent per page, repo boundaries).
3. **Constitution** in `.specify/memory/constitution.md` — Principles I–VIII, with I–IV NON-NEGOTIABLE. The constitution wins any conflict.

**Rationale**: A finding is only valuable if its source rule is identifiable. Three-layer attribution lets the report cite the exact rule per finding (e.g., "Constitution III — payment-proof URL leaked").

**Alternatives considered**:
- *Single flat rule list*: rejected — loses provenance, makes the "convention vs. opinion" distinction invisible.
- *Per-finding free-form rationale only*: rejected — fails SC-005 (every CLAUDE.md convention needs a named category with a finding count).

### Decision 2 — Severity scale: 5 levels

**Decision**: `Critical | High | Medium | Low | Info`.

- **Critical** — active security, payment-integrity, or data-loss issue; constitutional NON-NEGOTIABLE violation (Principles I–IV).
- **High** — broken contract, broken accessibility, broken i18n parity, or NON-NEGOTIABLE adjacent (e.g., RTL break).
- **Medium** — convention violation with user-visible impact (Principle V–VIII drift).
- **Low** — convention violation with no user-visible impact (style, naming, dead code).
- **Info** — observation worth recording for context; no action required.

**Rationale**: Five levels matches existing industry tooling (Snyk, Sonar) and the project's prior audit reports (specs 003, 005). Letting "Info" exist prevents the audit from inflating Low to record neutral context.

**Alternatives considered**:
- *3 levels (Critical / Major / Minor)*: rejected — too coarse to distinguish security from style.
- *Numeric 1–10*: rejected — false precision; humans triage by buckets.

### Decision 3 — Category set: 8 categories

**Decision**: `Security | Correctness | Performance | Accessibility | Maintainability | Convention | Documentation | TestCoverage`.

A finding has **exactly one** primary category. Cross-cutting concerns (e.g., a security issue that is also a convention violation) pick the highest-impact category and reference the secondary rule in the rationale.

**Rationale**: Eight categories give every CLAUDE.md convention a home while keeping the punch-list groupable. "Convention" is intentionally distinct from "Maintainability" so DESIGN.md drift is visible as its own bucket.

**Alternatives considered**:
- *OWASP-style category code list*: rejected — too security-skewed for a full-stack audit.

### Decision 4 — Scope inclusion via `git ls-files`

**Decision**: The canonical in-scope file list is `git ls-files` output, then filtered.

**Inclusions**: `backend/src/**`, `backend/tests/**`, `frontend/src/**`, `frontend/index.html`, `frontend/vite.config.*`, `frontend/tsconfig*.json`, `frontend/package.json`, `frontend/tailwind.config.*`, `docs/**/*.md`, root `*.csproj`, `*.sln`, `appsettings*.json` (templates only — never with secrets), `.gitignore`, `.editorconfig`, `.specify/extensions.yml`, `CLAUDE.md`.

**Exclusions** (recorded but **not** audited as code):
- Generated/vendored: `node_modules/**`, `bin/**`, `obj/**`, `dist/**`, `frontend/.vite/**`, `**/*.designer.cs`, EF migration snapshot `*ModelSnapshot.cs` (the snapshot is generated; the migration `.cs` file itself IS audited).
- Binary content: `docs/screenshots/**/*.png` and any other PNG/JPG/PDF — content, not code.
- Lockfiles: `package-lock.json` is **scanned for forbidden-dependency entries** (FR-007) but its diff churn is not a finding.
- Prior specs: `specs/**` files are read for **context** only (see Decision 5); they are not audited as "code".

**Rationale**: Using `git ls-files` makes the scope reproducible and excludes untracked working-tree noise. Generated files are out of bounds because findings against them are not actionable.

**Alternatives considered**:
- *Filesystem walk*: rejected — would surface `node_modules/` and `bin/` noise.
- *Branch diff only*: explicitly rejected by the user — "audit all code not just branche".

### Decision 5 — Prior audit work is reused, not redone

**Decision**: Specs 003, 004, 005, and 006 (now merged into `main` as commit `b30a154`) are **prior context**. For each:
1. Read the spec/plan/tasks files for that feature folder.
2. Identify the findings that were claimed resolved (search the codebase to **verify** resolution).
3. If a prior finding remains unresolved, re-record it in the new report (cite the prior spec ID).
4. If a prior finding is resolved, **do not re-list it** — but include a "Resolved prior findings (verified)" appendix in the report listing the spec IDs whose recommendations are now in effect.

**Rationale**: The maintainer has already invested four cycles of remediation. Repeating findings that have been fixed wastes signal. Verifying resolution catches regressions.

**Alternatives considered**:
- *Re-audit from scratch ignoring prior specs*: rejected — duplicates work, hides regression signal.
- *Trust prior specs without verification*: rejected — defeats the audit's purpose.

### Decision 6 — Read-only verification commands are allowed

**Decision**: The following commands may be run as part of the audit. Each is read-only (does not modify source):

| Command | Purpose | Side effects |
|---------|---------|--------------|
| `git ls-files` | Source-of-truth file list | None |
| `git status` | Final read-only invariant check | None |
| `git log --oneline -50` | Recent-change context | None |
| `npm --prefix frontend run i18n:check` | i18n parity (FR-011) | Stdout only |
| `npm --prefix frontend run build` | TS + Vite build status | Writes to `frontend/dist/` — **gitignored, so does not violate SC-003** |
| `npm --prefix frontend test -- --run` | Vitest pass/fail status | Writes to `frontend/coverage/` if configured — gitignored |
| `dotnet build backend/src/DrMirror.Api/DrMirror.Api.csproj` | Compilation status | Writes to `bin/`/`obj/` — gitignored |
| `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --no-build` | Test pass/fail | Writes to `bin/`/`obj/` — gitignored |

**Forbidden during audit**: any formatter (`dotnet format`, `prettier --write`), any `--fix` flag, any code generator (`dotnet ef migrations add`, `npm run codemod`), any package install (`npm install`, `dotnet restore` against an empty cache).

**Rationale**: Compilation and test status are necessary signals; their build artifacts are gitignored so the read-only invariant (SC-003) is preserved. Anything that touches a tracked file is prohibited.

**Alternatives considered**:
- *Skip verification entirely*: rejected — "does it build?" and "do tests pass?" are first-class audit signals.
- *Allow `dotnet format --verify-no-changes`*: marginal; deferred unless needed in implementation.

### Decision 7 — Report style: dense markdown, one file

**Decision**: The deliverable is a single markdown file `audit-report.md`. Sections are ordered top-down: Executive Summary → Coverage Map → Backend Findings → Frontend Findings → Cross-Cutting Findings → Resolved Prior Findings → Prioritized Punch-List → Appendices.

**Rationale**: A single file is grep-able, diff-able in PR review, and obviously read-only (one artifact). The maintainer asked for an audit, not a multi-page site. The schema for each section is locked down in `contracts/report-schema.md`.

**Alternatives considered**:
- *Per-layer files (`backend.md`, `frontend.md`, `cross-cutting.md`)*: rejected — fragments the punch-list and complicates the coverage map.
- *JSON findings + a renderer*: rejected — adds tooling complexity for a one-shot deliverable.

### Decision 8 — Tooling stays minimal (no new deps)

**Decision**: The audit uses only tools already present: ripgrep (Grep tool), glob, file read, and the read-only commands above. No new linters, no SAST tools, no SBOM generators are added to the repo.

**Rationale**: The constitution forbids adding browser-automation tooling and is generally suspicious of new dependencies. Adding tooling for a one-shot audit creates lockfile churn. Manual + grep-driven inspection is sufficient at this codebase's scale (~thousand-LoC scope per layer).

**Alternatives considered**:
- *Run Roslyn analyzers / SonarLint*: rejected for this iteration — would require dependency additions; deferred for a future continuous-quality feature.
- *Run `npm audit` for dependency vulnerabilities*: ALLOWED (it's a read-only npm subcommand requiring no install). Output is captured into the Cross-Cutting section.
- *Run `dotnet list package --vulnerable --include-transitive`*: ALLOWED for the same reason. Output is captured into the Cross-Cutting section.

## Open Questions

None. All spec requirements have a decided approach above. Phase 1 (data-model, contracts, quickstart) can proceed.
