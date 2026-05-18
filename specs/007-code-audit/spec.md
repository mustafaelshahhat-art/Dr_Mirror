# Feature Specification: Full-Stack Code Audit (Read-Only)

**Feature Branch**: `007-code-audit`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "audit all code not just branche be sure it follow code best practise and audit it not edit any code just audit all full stack layers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Repository-Wide Best-Practice Audit Report (Priority: P1)

The maintainer wants a single, authoritative audit report that surveys the **entire codebase** (every layer, every feature folder, every branch's merged state on `main` plus all currently-tracked source files) and grades it against established best practices. The report must identify violations, classify them by severity, and point to exact file/line locations — but **must not modify any source code**.

**Why this priority**: This is the foundational deliverable. Without a comprehensive, non-destructive audit, the maintainer cannot triage what to fix next or prove the codebase's current quality baseline. Every other audit slice depends on this catalog of findings existing.

**Independent Test**: Can be fully validated by opening the produced audit report and confirming that (a) every top-level source folder is referenced at least once, (b) each finding cites a concrete file path and line range, (c) no files in the working tree have been modified between the audit start and end (verified by `git status` showing no changes other than the report itself).

**Acceptance Scenarios**:

1. **Given** a clean working tree on the audit branch, **When** the audit is performed, **Then** a report file is produced under `specs/007-code-audit/` and `git diff` shows zero changes to any file outside that folder.
2. **Given** the audit report exists, **When** the maintainer reads it, **Then** they can locate every finding by file path and line number without needing to re-search the codebase.
3. **Given** a finding is recorded, **When** the maintainer reviews it, **Then** the finding states (i) what rule/best-practice was violated, (ii) why it matters, (iii) the concrete location, and (iv) a suggested remediation — without the remediation having been applied.

---

### User Story 2 - Backend Layer Audit (.NET / EF Core / Identity / Background Services) (Priority: P1)

The maintainer needs the audit to cover every backend concern: feature slices (`backend/src/DrMirror.Api/Features/**`), domain model and state machines, EF Core configurations and migrations, ASP.NET Identity and JWT wiring, rate limiting, Serilog enrichment, background services (email outbox, payment-proof retention), validation pipelines, error/exception handling, and the test project. The audit must call out anti-patterns specific to .NET 10 / ASP.NET Core Minimal APIs.

**Why this priority**: The backend holds the authoritative business state (orders, payments, audit log, identity) and any defect there has a larger blast radius than UI bugs. Auditing the backend first ensures security, data-integrity, and correctness issues surface before cosmetic ones.

**Independent Test**: The backend section of the report can stand alone — a reader who only opens the backend findings can act on them without needing the frontend section. Every backend feature folder must appear in at least the "audited" list (even if no findings).

**Acceptance Scenarios**:

1. **Given** the backend is audited, **When** the maintainer reads the backend section, **Then** every feature folder under `backend/src/DrMirror.Api/Features/` is listed with either findings or an explicit "no issues" note.
2. **Given** any endpoint that mutates data, **When** evaluated, **Then** the audit confirms (or flags absence of) authorization, validation, and audit-log emission.
3. **Given** every EF Core entity, **When** evaluated, **Then** the audit reports any missing indexes, missing concurrency tokens, soft-delete inconsistencies, or `DateTime` columns that should be `DateTimeOffset`.

---

### User Story 3 - Frontend Layer Audit (React 19 / TS / HeroUI v3 / i18n / RTL) (Priority: P1)

The maintainer needs the audit to cover the frontend in equal depth: route configuration, providers, feature folders under `frontend/src/features/**`, shared library code, forms, data fetching, accessibility, RTL/logical-CSS compliance, HeroUI-only usage, Lucide-only icons, i18n parity (ar/en), Sentry wiring, and the Vitest suite. The audit must apply the project's documented conventions from `CLAUDE.md` as additional rules.

**Why this priority**: The frontend is the user-visible surface. Convention violations there (raw `<button>`, ml/mr classes, missing translations, useState-driven forms) degrade UX, accessibility, and Arabic-first compliance — all explicitly prioritized in this project.

**Independent Test**: The frontend section of the report can be read in isolation; a frontend developer must be able to enumerate every violation without reading the backend section. Project-specific rules (logical CSS, HeroUI-only, Lucide-only, i18n parity, no inline currency formatting, one accent per page, no arbitrary Tailwind values without justification) must each appear as named audit categories with their findings count.

**Acceptance Scenarios**:

1. **Given** the frontend convention "logical CSS only", **When** the audit runs, **Then** every occurrence of `ml-*`, `mr-*`, `text-left`, `text-right`, `pl-*`, `pr-*` in `frontend/src/**/*.{ts,tsx,css}` is enumerated (path + line).
2. **Given** the rule "HeroUI v3 only", **When** the audit runs, **Then** every raw `<button>`, `<input>`, `<select>`, `<dialog>` in `.tsx` files is enumerated with its location.
3. **Given** the rule "i18n parity", **When** the audit runs, **Then** the report states whether `npm run i18n:check` passes and lists any keys missing from `ar` or `en` namespaces.
4. **Given** the rule "no inline currency formatting", **When** the audit runs, **Then** any price/number rendering that bypasses `formatCurrency()` from `shared/lib/format.ts` is flagged.

---

### User Story 4 - Cross-Cutting & Repo-Hygiene Audit (Priority: P2)

Beyond per-layer code, the audit must inspect cross-cutting concerns: dependency versions and known-vulnerable packages (frontend `package.json`, backend `.csproj` files), repo boundaries (no Playwright / Cypress / Puppeteer / Selenium dependencies — per `CLAUDE.md`), `.gitignore` correctness, secret-exposure surface, build configuration, CI/scripts, environment variable handling, and documentation drift (do `docs/` and feature folders match shipped code).

**Why this priority**: These issues do not live in any single feature folder but can still block releases. They are P2 because they are lower-frequency than per-layer findings but high-impact when present (e.g., an accidentally committed secret, a forbidden dependency creeping in, a missing migration).

**Independent Test**: A reader of only this section can answer: "Is the repo configuration clean, are there any forbidden dependencies, are any secrets at risk, is the documentation current?" — without reading any other section.

**Acceptance Scenarios**:

1. **Given** the repo-boundaries rule, **When** the audit runs, **Then** the report explicitly confirms (or denies) the absence of Playwright, Puppeteer, Cypress, Selenium in dependencies, configs, scripts, and lockfile entries.
2. **Given** the dependency lists, **When** evaluated, **Then** outdated or known-vulnerable packages are listed with current vs. latest stable version.
3. **Given** the `docs/` folder and CLAUDE.md conventions, **When** evaluated, **Then** any documentation that contradicts current code is flagged.

---

### User Story 5 - Audit Findings Prioritized & Categorized (Priority: P2)

Every finding must be tagged with a severity (Critical / High / Medium / Low / Info) and a category (Security, Correctness, Performance, Accessibility, Maintainability, Convention, Documentation, Test Coverage). The report must end with a prioritized punch-list that the maintainer can hand to a follow-up `/speckit-plan` invocation to drive remediation work.

**Why this priority**: Raw findings without classification are hard to action. P2 because it depends on US1–US4 completing first, but is required before any remediation work can be planned.

**Independent Test**: The punch-list at the end of the report can be read alone and answers "What should we fix first?" without needing to scroll back to individual findings.

**Acceptance Scenarios**:

1. **Given** every finding in the report, **When** the punch-list is generated, **Then** each finding has exactly one severity and one primary category.
2. **Given** the punch-list, **When** sorted by severity (Critical → Low), **Then** Critical and High items are scoped tightly enough that each could become a single follow-up task.

---

### Edge Cases

- **Generated or vendored files**: `node_modules/`, `bin/`, `obj/`, `dist/`, `frontend/.vite/`, migration snapshot files, and any other generated artifacts MUST be excluded from findings (but their presence/absence in `.gitignore` is itself fair game for the hygiene audit).
- **Captured screenshot PNGs** under `docs/screenshots/` are content, not code, and are excluded from findings.
- **Markdown content in `specs/`**: prior spec/plan/task files are read for context but not audited as "code".
- **Conflicting rules**: when `CLAUDE.md` conventions conflict with general best practice, the project convention wins and the conflict is noted in the report's "Assumptions" section.
- **Zero-finding categories**: a category with no findings is still listed in the report with "No issues found" — silence is not acceptable.
- **Findings the maintainer disputes**: the report format must allow each finding to be flagged "Accepted / Disputed / Deferred" by the maintainer in a follow-up pass without re-running the audit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The audit MUST cover the entire tracked codebase (everything under `backend/`, `frontend/`, `docs/`, and root configuration files), not only files changed on the current branch.
- **FR-002**: The audit MUST NOT modify, create, or delete any source file outside `specs/007-code-audit/`. Verifiable via `git diff` after completion showing changes scoped to that directory only.
- **FR-003**: The audit MUST produce a single primary report file at `specs/007-code-audit/audit-report.md` containing all findings.
- **FR-004**: Every finding MUST include: (a) severity, (b) category, (c) rule/best-practice violated, (d) file path, (e) line number or line range, (f) short rationale, (g) suggested remediation in prose (not as a code patch).
- **FR-005**: The audit MUST evaluate the backend layer against general .NET / ASP.NET Core Minimal API best practices AND against the project's own documented conventions in `CLAUDE.md`.
- **FR-006**: The audit MUST evaluate the frontend layer against general React / TypeScript / accessibility best practices AND against the project's documented conventions (logical CSS only, HeroUI v3 only, Lucide-only icons, i18n parity, react-hook-form + Zod, formatCurrency, one accent per page, no arbitrary Tailwind values without justification).
- **FR-007**: The audit MUST evaluate cross-cutting concerns: dependency hygiene, secret exposure, repo-boundary rules (no Playwright/Cypress/Puppeteer/Selenium), `.gitignore` completeness, documentation drift.
- **FR-008**: The audit MUST classify every finding by severity (Critical, High, Medium, Low, Info) and by category (Security, Correctness, Performance, Accessibility, Maintainability, Convention, Documentation, Test Coverage).
- **FR-009**: The audit MUST end with a prioritized punch-list ordered Critical → Low, suitable as input to a follow-up planning command.
- **FR-010**: The audit MUST explicitly list every audited area, including those with zero findings, so the maintainer can confirm coverage.
- **FR-011**: The audit MUST run the existing project verification commands in read-only fashion (`npm run i18n:check`, `dotnet build --no-restore` if available, `npm --prefix frontend run build` only if the user pre-approves) and record their pass/fail status — but failure of these commands MUST NOT cause the audit itself to fail or modify code.
- **FR-012**: The audit report MUST include a top-level "Coverage Map" section enumerating every folder audited and the rules applied to it.
- **FR-013**: The audit MUST treat the canonical source-of-truth for tracked files as `git ls-files` (so untracked working-tree files are noted separately, not mixed in).

### Key Entities

- **Audit Report**: The single deliverable markdown file. Contains coverage map, per-layer sections (backend, frontend, cross-cutting), individual findings, and the prioritized punch-list.
- **Finding**: One discrete issue. Carries severity, category, rule, location (file + line range), rationale, and suggested remediation.
- **Coverage Map**: An enumeration of audited folders with the rule sets applied to each — proves comprehensiveness.
- **Punch-List**: The ordered, severity-grouped list of findings at the end of the report, suitable as input to a planning command.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of top-level source folders (`backend/src/DrMirror.Api/Features/*`, `backend/src/DrMirror.Api/Domain`, `backend/src/DrMirror.Api/Infrastructure`, `backend/src/DrMirror.Api/BackgroundServices`, `backend/src/DrMirror.Api/Shared`, `frontend/src/app`, `frontend/src/features/*`, `frontend/src/shared`, `frontend/src/locales`, `frontend/src/styles`) appear in the report's Coverage Map.
- **SC-002**: 100% of findings carry all seven required fields (severity, category, rule, file path, line range, rationale, suggested remediation).
- **SC-003**: After the audit completes, `git status` shows zero modifications outside `specs/007-code-audit/`.
- **SC-004**: A reader unfamiliar with the codebase can, from the punch-list alone, identify the top three remediation priorities in under five minutes.
- **SC-005**: Every project-specific convention listed in `CLAUDE.md` ("Key Conventions" section) appears as a named audit category in the report with a finding count (zero allowed).
- **SC-006**: The audit is reproducible: re-running it on the same commit produces a report whose findings differ only in non-substantive ways (e.g., ordering ties, timestamp).

## Assumptions

- The audit is a one-shot deliverable for commit-level state as of branch `007-code-audit`; it is not a continuous CI check.
- "All code" means everything under version control (`git ls-files`), excluding generated/vendored output (`node_modules/`, `bin/`, `obj/`, `dist/`, `.vite/`, EF migration snapshots) and excluding captured screenshot binaries.
- Project-specific conventions documented in `CLAUDE.md` override generic best-practice opinions where they conflict; conflicts are noted, not silently resolved.
- The audit may run read-only verification commands (`npm run i18n:check`, `dotnet build`, `npm run build`) but only if they leave the working tree unchanged; any side-effecting tool (formatters, lint --fix, migration generators) is prohibited.
- "Audit" excludes test execution. The report comments on test **coverage and quality** but does not run the test suites as part of audit success criteria.
- Existing audit work captured in `specs/003-production-reality-hardening/`, `specs/004-uiux-excellence-pass/`, `specs/005-code-quality-hardening/`, and the recently-merged `006-audit-hardening` branch is treated as **prior context** — the new audit references prior findings rather than re-discovering them, but verifies they remain resolved.
- The audit report is written in English; Arabic-localization issues are described in English with Arabic strings quoted as needed.
