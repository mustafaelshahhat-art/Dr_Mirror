---

description: "Task list for the Full-Stack Code Audit (Read-Only) feature"
---

# Tasks: Full-Stack Code Audit (Read-Only)

**Input**: Design documents from `/specs/007-code-audit/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/report-schema.md](./contracts/report-schema.md), [quickstart.md](./quickstart.md)

**Tests**: This feature does **not** request test tasks. The audit is a documentation deliverable; its "test" is the FR-002 / SC-003 invariant verified by `git diff`. Acceptance is checked by the validation tasks in Phase 8.

**Organization**: Tasks are grouped by user story. The audit's deliverable is a single Markdown file (`specs/007-code-audit/audit-report.md`); most "implementation" tasks append findings to specific sections of that file. Sweep tasks share the report file, so they are **not** marked `[P]` — true parallelism exists only for tasks that touch different files (verification-command transcripts, prior-spec reads).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

- **Deliverable**: `specs/007-code-audit/audit-report.md` (single Markdown file built up across phases).
- **Audit targets**: `backend/`, `frontend/`, `docs/`, repo-root configs.
- All paths are relative to repo root (`D:\projects\Dr_Mirror`).

---

## Phase 1: Setup (Baseline & Read-Only Invariant)

**Purpose**: Establish the read-only baseline and capture the immutable inputs the audit cites.

- [ ] T001 Run `git status --porcelain` from repo root and confirm output is empty; if not, stop and surface the dirty paths to the maintainer (this preserves the FR-002 read-only invariant baseline). No file written.
- [ ] T002 Capture audit-target commit SHA via `git rev-parse HEAD` and record it for use in the `Commit Audited` frontmatter line of `specs/007-code-audit/audit-report.md`.
- [ ] T003 Capture in-scope file list via `git ls-files` (in-memory snapshot used by every sweep task as the authoritative scope per Decision 4 of [research.md](./research.md)). Do not commit a snapshot file.

---

## Phase 2: Foundational (Read-Only Verification Commands)

**Purpose**: Capture pass/fail status and stdout from each verification command. These transcripts populate §8 Appendix A and inform §1 Executive Summary. None of these commands modify tracked files (build artifacts go to gitignored `bin/`, `obj/`, `dist/`).

**⚠️ CRITICAL**: All sweep tasks (US2/US3/US4) cite these results. This phase must complete before findings sections are written.

- [ ] T004 [P] Run `npm --prefix frontend run i18n:check`, capture exit code + stdout to scratch; will be appended to `specs/007-code-audit/audit-report.md` §8 Appendix A by T076.
- [ ] T005 [P] Run `npm --prefix frontend run build`, capture exit code + last ~40 stdout lines to scratch; will be appended to `specs/007-code-audit/audit-report.md` §8 Appendix A by T076.
- [ ] T006 [P] Run `npm --prefix frontend test -- --run`, capture exit code + summary line to scratch; will be appended to `specs/007-code-audit/audit-report.md` §8 Appendix A by T076.
- [ ] T007 [P] Run `dotnet build backend/src/DrMirror.Api/DrMirror.Api.csproj`, capture exit code + warning/error count to scratch; will be appended to `specs/007-code-audit/audit-report.md` §8 Appendix A by T076.
- [ ] T008 [P] Run `dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --no-build`, capture exit code + per-suite summary to scratch; will be appended to `specs/007-code-audit/audit-report.md` §8 Appendix A by T076.
- [ ] T009 [P] Run `npm --prefix frontend audit --json` and summarize vulnerabilities by severity to scratch; output drives Cross-Cutting findings created in T067 in `specs/007-code-audit/audit-report.md` §5.
- [ ] T010 [P] Run `dotnet list backend/src/DrMirror.Api/DrMirror.Api.csproj package --vulnerable --include-transitive`; output drives Cross-Cutting findings created in T067 in `specs/007-code-audit/audit-report.md` §5.

**Checkpoint**: Verification signals are captured. Sweep phases can now produce findings that cite real build/test/vuln status.

---

## Phase 3: User Story 1 — Repository-Wide Best-Practice Audit Report (Priority: P1) 🎯 MVP

**Goal**: A single read-only audit report exists at `specs/007-code-audit/audit-report.md` with the canonical structure from [contracts/report-schema.md](./contracts/report-schema.md), so every downstream sweep has a target to append findings to and the maintainer has a single deliverable.

**Independent Test**: After Phase 3, opening `specs/007-code-audit/audit-report.md` shows the frontmatter populated, all eight H2 sections present in canonical order, the Coverage Map header row in place, and `git diff --name-only` outside `specs/007-code-audit/` is empty.

### Implementation for User Story 1

- [ ] T011 [US1] Create `specs/007-code-audit/audit-report.md` with the top-of-file frontmatter from [contracts/report-schema.md](./contracts/report-schema.md), populating `Audit Date` (today), `Commit Audited` (from T002), `Branch` (`007-code-audit`), `Spec`/`Plan` links, `Auditor`, and a placeholder `Result Summary: Critical: 0 · High: 0 · Medium: 0 · Low: 0 · Info: 0 · Total: 0` (updated by T075).
- [ ] T012 [US1] Append the eight canonical H2 section headings (`## 1. Executive Summary` through `## 8. Appendices`) to `specs/007-code-audit/audit-report.md` in the order locked by [contracts/report-schema.md](./contracts/report-schema.md), each followed by `_To be populated._`
- [ ] T013 [US1] In `specs/007-code-audit/audit-report.md` §2, insert the Coverage Map table header row (`| Path | Layer | Rule Sets Applied | Findings | Notes |` + separator) per the contract; rows are added incrementally by T072.
- [ ] T014 [P] [US1] Read `specs/003-production-reality-hardening/spec.md` and `specs/003-production-reality-hardening/tasks.md`; extract the list of recommendations to verify (note for T069).
- [ ] T015 [P] [US1] Read `specs/004-uiux-excellence-pass/spec.md` and `specs/004-uiux-excellence-pass/tasks.md`; extract the list of recommendations to verify (note for T069).
- [ ] T016 [P] [US1] Read `specs/005-code-quality-hardening/spec.md` and `specs/005-code-quality-hardening/tasks.md`; extract the list of recommendations to verify (note for T069).
- [ ] T017 [P] [US1] Read commit `b30a154` (`feat(security): May 2026 audit hardening pass`) via `git show --stat b30a154` and inspect any spec under `specs/006-audit-hardening/` if present in history; extract recommendations to verify (note for T069).

**Checkpoint**: Report skeleton exists, prior-audit context is loaded into the auditor's working memory. Layer sweeps may now begin.

---

## Phase 4: User Story 2 — Backend Layer Audit (Priority: P1)

**Goal**: Every backend folder is graded against general .NET / ASP.NET Core / EF Core best practice **plus** the constitution and `CLAUDE.md`. Findings are appended under `specs/007-code-audit/audit-report.md` §3 with the contract-locked finding format (`F-{nnn}` blocks).

**Independent Test**: Open `specs/007-code-audit/audit-report.md` §3; every backend feature folder is represented either by `F-NNN` findings or by an explicit `_No findings._` line under its H3 sub-group, and every endpoint that mutates data is either confirmed-or-flagged for auth + validation + audit-log emission.

> All tasks in this phase share `specs/007-code-audit/audit-report.md` as their output file, so `[P]` is intentionally omitted — the analyses are independent, but the appends serialize.

### Implementation for User Story 2 — Feature Slices

- [ ] T018 [US2] Audit `backend/src/DrMirror.Api/Features/Auth/` against Constitution §III (JWT, role separation, last-admin guard, rate limiting on auth + password reset) and CLAUDE.md backend conventions; append F-NNN findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Auth`.
- [ ] T019 [US2] Audit `backend/src/DrMirror.Api/Features/Catalog/` (slug uniqueness, image handling via Cloudinary, listing pagination, validation, public-vs-admin separation); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Catalog`.
- [ ] T020 [US2] Audit `backend/src/DrMirror.Api/Features/Cart/` (cart-merge recovery, ownership, idempotency, validation); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Cart`.
- [ ] T021 [US2] Audit `backend/src/DrMirror.Api/Features/Checkout/` (address + governorate handling, server-side total verification per Constitution §IV, payment-method scope COD/Instapay/Wallets); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Checkout`.
- [ ] T022 [US2] Audit `backend/src/DrMirror.Api/Features/Orders/` (state machine `OrderStateMachine`, customer ownership checks, cancellation reason consistency, status transition coverage); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Orders`.
- [ ] T023 [US2] Audit `backend/src/DrMirror.Api/Features/Addresses/` (validation, governorate enum integrity, default-address constraint per spec 003); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Addresses`.
- [ ] T024 [US2] Audit `backend/src/DrMirror.Api/Features/Inquiries/` (rate limiting, anti-spam, validation, admin-side privacy); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Inquiries`.
- [ ] T025 [US2] Audit `backend/src/DrMirror.Api/Features/AppConfig/` (config exposure surface, role-gating, no secret leakage); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/AppConfig`.
- [ ] T026 [US2] Audit `backend/src/DrMirror.Api/Features/Admin/Audit/` (audit-log emission patterns, query authorization, PII handling); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Admin/Audit`.
- [ ] T027 [US2] Audit `backend/src/DrMirror.Api/Features/Admin/Catalog/` (admin-only role enforcement, image upload validation, slug regeneration safety); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Admin/Catalog`.
- [ ] T028 [US2] Audit `backend/src/DrMirror.Api/Features/Admin/Inquiries/` (admin-only authorization, soft-delete + audit-log discipline); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Admin/Inquiries`.
- [ ] T029 [US2] Audit `backend/src/DrMirror.Api/Features/Admin/Orders/` (admin state transitions, audit-log emission, cancellation-reason persistence); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Admin/Orders`.
- [ ] T030 [US2] Audit `backend/src/DrMirror.Api/Features/Admin/Payments/` (Constitution §III payment-proof privacy: ownership-checked endpoint, admin access logging, no public URLs, stale-proof guard); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Admin/Payments`.
- [ ] T031 [US2] Audit `backend/src/DrMirror.Api/Features/Admin/Users/` (last-admin guard, role mutation safety, deactivation flow); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Features/Admin/Users`.

### Implementation for User Story 2 — Core Backend

- [ ] T032 [US2] Audit `backend/src/DrMirror.Api/Domain/Entities/` and `backend/src/DrMirror.Api/Domain/Orders/` (entity invariants, value objects, enum totality, OrderStateMachine transitions); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Domain`.
- [ ] T033 [US2] Audit `backend/src/DrMirror.Api/Infrastructure/Persistence/` (DbContext setup, entity configurations, indexes, soft-delete consistency, concurrency tokens, `DateTimeOffset` vs `DateTime`, seeder idempotency); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Infrastructure/Persistence`.
- [ ] T034 [US2] Audit `backend/src/DrMirror.Api/Infrastructure/Persistence/Migrations/` (additive vs destructive, meaningful naming per Constitution §V, reversibility documentation); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Infrastructure/Migrations`.
- [ ] T035 [US2] Audit `backend/src/DrMirror.Api/Infrastructure/Identity/` (ASP.NET Identity wiring, JWT signing-key handling, refresh-cookie HttpOnly/Secure flags); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Infrastructure/Identity`.
- [ ] T036 [US2] Audit `backend/src/DrMirror.Api/Infrastructure/Email/` (MailKit usage, outbox lease, retry/idempotency, secret handling); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Infrastructure/Email`.
- [ ] T037 [US2] Audit `backend/src/DrMirror.Api/Infrastructure/Storage/` (Cloudinary credential handling, signed-URL discipline, payment-proof private-vs-public boundary); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Infrastructure/Storage`.
- [ ] T038 [US2] Audit `backend/src/DrMirror.Api/BackgroundServices/` (lease semantics, restart tolerance, retention purge — PaymentProofRetentionPurgeService, EmailOutboxRetentionService); append findings under `specs/007-code-audit/audit-report.md` §3 → `### BackgroundServices`.
- [ ] T039 [US2] Audit `backend/src/DrMirror.Api/Shared/` (Auditing, HealthChecks, RateLimiting, Logging Serilog enrichment, Slugs, Validation pipeline); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Shared`.
- [ ] T040 [US2] Audit `backend/src/DrMirror.Api/Program.cs` and any composition root files (startup validation per Constitution §VII, DI registration order, middleware order, CORS allowlist, rate-limit middleware placement); append findings under `specs/007-code-audit/audit-report.md` §3 → `### Composition Root`.
- [ ] T041 [US2] Audit `backend/tests/DrMirror.Tests/` for coverage gaps and the "integration tests MUST hit a real database, not mocks" rule from Constitution Quality Gates; append findings under `specs/007-code-audit/audit-report.md` §3 → `### Tests`.

**Checkpoint**: §3 of the report is fully populated. Backend coverage is complete; every feature folder under `Features/` is either confirmed clean or has at least one finding cited.

---

## Phase 5: User Story 3 — Frontend Layer Audit (Priority: P1)

**Goal**: Every frontend folder is graded against React 19 / TypeScript / a11y best practice **plus** Constitution §II/VI/VIII and `CLAUDE.md` Key Conventions. Findings appear under `specs/007-code-audit/audit-report.md` §4.

**Independent Test**: Open §4; each `CLAUDE.md` Key Convention (logical CSS, HeroUI v3 only, Lucide-only, forms via react-hook-form + Zod, `formatCurrency`, one accent per page, no arbitrary Tailwind values, i18n parity) appears as a named audit category with a finding count (zero allowed). Every occurrence of `ml-*` / `mr-*` / `text-left` / `text-right` in `frontend/src/**` is enumerated by file + line.

> Sweep tasks in this phase share `specs/007-code-audit/audit-report.md` as their output and are not marked `[P]`. Cross-file pattern searches (T044, T045, T046) are conceptually parallel but serialize on the report append.

### Implementation for User Story 3 — Cross-File Convention Sweeps

- [ ] T042 [US3] Sweep `frontend/src/**/*.{ts,tsx,css}` (limited to `git ls-files`) for **physical CSS classes** (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right`, `left-*`, `right-*` Tailwind utilities); enumerate every occurrence as one F-NNN finding (multi-location format from data-model.md) under `specs/007-code-audit/audit-report.md` §4 → `### Convention: Logical CSS only`.
- [ ] T043 [US3] Sweep `frontend/src/**/*.tsx` for **raw HTML primitives** (`<button`, `<input`, `<select`, `<dialog`, `<table` outside HeroUI wrappers); enumerate each as one F-NNN finding under `specs/007-code-audit/audit-report.md` §4 → `### Convention: HeroUI v3 only`.
- [ ] T044 [US3] Sweep `frontend/src/**/*.{ts,tsx}` for **non-Lucide icon imports** (any import from `@heroicons/*`, `react-icons/*`, `lucide-react` is allowed only) and emoji glyphs used as UI iconography; enumerate as one F-NNN finding under `specs/007-code-audit/audit-report.md` §4 → `### Convention: Lucide-only icons`.
- [ ] T045 [US3] Sweep `frontend/src/**/*.{ts,tsx}` for **forms using `useState` for form state** instead of `react-hook-form` + Zod (search for `useState` near `<form` or near `onSubmit`); enumerate as one F-NNN finding per offending form under `specs/007-code-audit/audit-report.md` §4 → `### Convention: react-hook-form + Zod`.
- [ ] T046 [US3] Sweep `frontend/src/**/*.{ts,tsx}` for **inline currency formatting** (occurrences of `.toFixed(`, hand-rolled `${...} EGP`, `Intl.NumberFormat` outside `shared/lib/format.ts`); enumerate under `specs/007-code-audit/audit-report.md` §4 → `### Convention: formatCurrency()`.
- [ ] T047 [US3] Sweep `frontend/src/**/*.{ts,tsx,css}` for **arbitrary Tailwind values** (`\[[0-9]+px\]`, `\[[0-9.]+rem\]`) and check whether each has a same-line justification comment; enumerate offenders under `specs/007-code-audit/audit-report.md` §4 → `### Convention: No arbitrary Tailwind values`.
- [ ] T048 [US3] Compare `frontend/src/locales/ar/*.json` and `frontend/src/locales/en/*.json` for **key parity** (cross-reference T004 result); enumerate missing-key sets under `specs/007-code-audit/audit-report.md` §4 → `### Convention: i18n parity (ar / en)`.

### Implementation for User Story 3 — Per-Folder Sweeps

- [ ] T049 [US3] Audit `frontend/src/app/` (`router.tsx`, `providers.tsx`) — route guards for admin vs customer (Constitution §III client-side defense in depth), theme provider, query client config, Sentry init; append findings under `specs/007-code-audit/audit-report.md` §4 → `### app`.
- [ ] T050 [US3] Audit `frontend/src/features/auth/` — login/register UX, RTL parity (Constitution §II), error states, Zod schemas; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/auth`.
- [ ] T051 [US3] Audit `frontend/src/features/catalog/` — listing, filters, image lazy-load + `alt` text (Constitution §VI), pagination keyboard nav; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/catalog`.
- [ ] T052 [US3] Audit `frontend/src/features/cart/` — quantity controls keyboard a11y, total formatting via `formatCurrency`, RTL layout; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/cart`.
- [ ] T053 [US3] Audit `frontend/src/features/checkout/` — address form, governorate select (RTL), payment-method radiogroup (Constitution §VI keyboard nav), COD-no-proof / Instapay-requires-proof flows; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/checkout`.
- [ ] T054 [US3] Audit `frontend/src/features/orders/` — order detail view, status timeline, ownership-error states, RTL parity; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/orders`.
- [ ] T055 [US3] Audit `frontend/src/features/addresses/` — default-address selection, edit/delete confirms, RTL; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/addresses`.
- [ ] T056 [US3] Audit `frontend/src/features/inquiries/` — submission form, rate-limited error UX, i18n; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/inquiries`.
- [ ] T057 [US3] Audit `frontend/src/features/app-config/` — config consumption, no secret leakage to bundle; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/app-config`.
- [ ] T058 [US3] Audit `frontend/src/features/admin/audit/` — audit-log viewer, filter UX, table a11y; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/admin/audit`.
- [ ] T059 [US3] Audit `frontend/src/features/admin/catalog/` — admin product CRUD, image upload UX, focus management on dialogs (Constitution §VI Escape closes); append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/admin/catalog`.
- [ ] T060 [US3] Audit `frontend/src/features/admin/components/` and `frontend/src/features/admin/users/` — admin table component, user role editor, last-admin guard UX, focus rings; append findings under `specs/007-code-audit/audit-report.md` §4 → `### features/admin/users-and-components`.
- [ ] T061 [US3] Audit `frontend/src/shared/components/` — reusable UI building blocks, HeroUI wrapping correctness, ARIA attributes; append findings under `specs/007-code-audit/audit-report.md` §4 → `### shared/components`.
- [ ] T062 [US3] Audit `frontend/src/shared/lib/` (`api-client.ts`, `format.ts`, `i18n.ts`, `sentry.ts`) — interceptor error handling, refresh-token flow, Sentry PII scrubbing, `formatCurrency` implementation correctness; append findings under `specs/007-code-audit/audit-report.md` §4 → `### shared/lib`.
- [ ] T063 [US3] Audit `frontend/src/shared/hooks/`, `frontend/src/shared/pages/`, `frontend/src/shared/types/` — hook reusability, 404/500 page parity, type-safety leakage (`any`, `as unknown as`); append findings under `specs/007-code-audit/audit-report.md` §4 → `### shared/other`.
- [ ] T064 [US3] Audit `frontend/src/locales/ar/*.json` and `frontend/src/locales/en/*.json` — key naming consistency, no hardcoded strings remaining in components (cross-reference T048); append findings under `specs/007-code-audit/audit-report.md` §4 → `### locales`.
- [ ] T065 [US3] Audit `frontend/src/styles/globals.css` — OKLCH palette discipline, single-accent rule, HeroUI v3 token aliases, font-face declarations, no glow/glass/neon (Constitution §VIII); append findings under `specs/007-code-audit/audit-report.md` §4 → `### styles`.

**Checkpoint**: §4 of the report is fully populated. Every CLAUDE.md convention category has a finding count (possibly zero). Every frontend feature folder is represented.

---

## Phase 6: User Story 4 — Cross-Cutting & Repo-Hygiene Audit (Priority: P2)

**Goal**: Repo-wide concerns that do not live in one feature — dependency hygiene, secret exposure, repo-boundary rule (no Playwright/Cypress/Puppeteer/Selenium), `.gitignore` correctness, documentation drift, prior-audit verification — are graded. Findings appear in `specs/007-code-audit/audit-report.md` §5; verified prior-audit recommendations appear in §6.

**Independent Test**: §5 contains an explicit statement (positive or negative) about each of: forbidden-dependency presence, current dep vuln status, secret exposure surface, `.gitignore` completeness, doc drift. §6 lists prior specs whose recommendations have been verified.

> All tasks in this phase share `specs/007-code-audit/audit-report.md` and are not marked `[P]`.

### Implementation for User Story 4 — Dependencies

- [ ] T066 [US4] Inspect `frontend/package.json` and `frontend/package-lock.json` for **forbidden dependencies** (`playwright`, `puppeteer`, `cypress`, `selenium-webdriver`, `@playwright/*`, `webdriverio`) and for **mixed UI libraries** (`@mui/*`, `@chakra-ui/*`, `@radix-ui/*`, `@headlessui/*`); append findings under `specs/007-code-audit/audit-report.md` §5 → `### Repo Boundaries`. If none found, append `_Repo boundaries clean: no forbidden dependencies present._`
- [ ] T067 [US4] Using T009 + T010 output, append per-package vulnerability findings under `specs/007-code-audit/audit-report.md` §5 → `### Dependencies`. Each `npm audit` advisory or vulnerable `dotnet list package` entry becomes one F-NNN (severity mapped: critical/high vuln → Critical; moderate → High; low → Medium).
- [ ] T068 [US4] Inspect every `*.csproj` under `backend/` and `frontend/package.json` for **outdated direct dependencies** at least one major version behind current stable; append findings under `specs/007-code-audit/audit-report.md` §5 → `### Dependencies (Outdated)`.

### Implementation for User Story 4 — Secrets, Config & Hygiene

- [ ] T069 [US4] Grep all tracked files for **secret-shaped strings** (`Bearer `, `eyJ` JWT prefix, `cloudinary://`, `Server=.*Password=`, `SMTP_PASSWORD`, `API_KEY=`) and inspect `appsettings*.json`, `*.env*`, `frontend/.env*`; append findings under `specs/007-code-audit/audit-report.md` §5 → `### Secrets / Config`. Cite Constitution §III secrets policy. If clean, append `_No committed secrets detected in tracked files._`
- [ ] T070 [US4] Inspect `.gitignore` against the expected exclusion list from research.md Decision 4 (`node_modules/`, `bin/`, `obj/`, `dist/`, `frontend/.vite/`, `*.env*`, `appsettings.Development.json`, payment-proof local cache if any); append findings under `specs/007-code-audit/audit-report.md` §5 → `### .gitignore Completeness`.
- [ ] T071 [US4] Inspect `docs/**/*.md` (excluding `docs/screenshots/`) for **drift against current code** — claims about endpoints, conventions, or paths that no longer match (sample-check the highest-traffic docs: `docs/SCREENSHOTS.md`, any `README.md`, `DESIGN.md` if referenced); append findings under `specs/007-code-audit/audit-report.md` §5 → `### Documentation Drift`.

### Implementation for User Story 4 — Coverage Map & Prior Audits

- [ ] T072 [US4] Populate `specs/007-code-audit/audit-report.md` §2 Coverage Map: one row per audited folder from plan.md's "Source Code" tree, plus root configs and `docs/`. Count findings per path by matching `Location` strings in §3/§4/§5 against each row's `Path`. Verify zero-finding folders are still listed (FR-010).
- [ ] T073 [US4] Using notes from T014–T017, **verify** each prior-spec recommendation (003, 004, 005, 006) by reading the cited current-code location. For each verified recommendation, append a bullet under `specs/007-code-audit/audit-report.md` §6 → `Resolved Prior Findings`. For each **unverified** (regressed) recommendation, file an F-NNN finding in the appropriate §3/§4/§5 sub-group instead, with Severity ≥ High and Rule citing the prior spec.

**Checkpoint**: §5 and §6 are populated. The Coverage Map is complete. Findings exist or are explicitly absent across every audit dimension.

---

## Phase 7: User Story 5 — Findings Prioritized & Categorized (Priority: P2)

**Goal**: Every finding produced in Phases 4–6 has a single Severity and single Category, and the report ends with a prioritized punch-list suitable as input to a future remediation `/speckit-plan`. The frontmatter totals match the section totals.

**Independent Test**: Reading §7 alone (no scrolling back) lets the maintainer identify the top three remediation priorities in under five minutes (SC-004). The frontmatter `Result Summary` equals the sum of findings across §3 + §4 + §5.

> All tasks in this phase share `specs/007-code-audit/audit-report.md` and are not marked `[P]`.

### Implementation for User Story 5

- [ ] T074 [US5] Walk every `F-NNN` block in `specs/007-code-audit/audit-report.md` §3, §4, §5 and verify each has exactly one `**Severity**:` value from the enum {Critical, High, Medium, Low, Info} and exactly one `**Category**:` value from {Security, Correctness, Performance, Accessibility, Maintainability, Convention, Documentation, TestCoverage}. Fix any non-conforming blocks in place.
- [ ] T075 [US5] Compute per-severity counts and total finding count; update the `Result Summary` line in the frontmatter of `specs/007-code-audit/audit-report.md`. Verify the sum equals the Coverage Map column total from T072.
- [ ] T076 [US5] Assemble `specs/007-code-audit/audit-report.md` §8 Appendix A by appending the captured transcripts from T004–T010 verbatim (each in a triple-backtick fenced block — fenced blocks ARE allowed in §8 per the contract). Each transcript labeled with command + exit code.
- [ ] T077 [US5] Build the prioritized punch-list in `specs/007-code-audit/audit-report.md` §7: H3 sub-headings per severity (Critical → Info, omit empty groups); under each, list every `F-NNN` as `- F-NNN [Severity/Category] short title — \`path:line\`` sorted by Category then ID. This is the section the next `/speckit-plan` will consume.
- [ ] T078 [US5] Write `specs/007-code-audit/audit-report.md` §1 Executive Summary (3–6 paragraphs) covering: top-3 Critical/High items by ID with one-line rationale each, frontend build pass/fail (T005), backend build pass/fail (T007), test pass/fail (T006/T008), i18n parity status (T004), dependency-vuln status (T067), RTL convention status (T042), prior-audit resolution status (T073).

**Checkpoint**: The report is complete. Every cross-reference between §1 → §7, §2 → §3-§5, frontmatter → totals is internally consistent.

---

## Phase 8: Polish & Validation (Read-Only Invariant + Schema Conformance)

**Purpose**: Verify the audit met its hard constraints before handing off.

- [ ] T079 Run `git status --porcelain`. Confirm every listed path begins with `specs/007-code-audit/`. If any path outside that folder appears, the audit has violated FR-002 / SC-003 — investigate and revert before handing off.
- [ ] T080 Schema-validate `specs/007-code-audit/audit-report.md` against `specs/007-code-audit/contracts/report-schema.md`: (a) exactly one H2 section per canonical name in canonical order; (b) every `F-NNN` has all required fields; (c) no triple-backtick fenced blocks appear outside §8; (d) every `Location` path appears in `git ls-files`; (e) `Result Summary` equals section totals.
- [ ] T081 [P] Update `specs/007-code-audit/checklists/requirements.md` with the final pass/fail status for each item (the checklist was filled by `/speckit-specify`; this task confirms the audit honored every item).
- [ ] T082 [P] Append a brief "Handoff" note (3–5 lines) at the bottom of `specs/007-code-audit/audit-report.md` pointing the maintainer to: (a) `/speckit-plan` for a remediation feature consuming §7, (b) `/speckit-tasks` to convert §7 directly into tasks, or (c) acceptance / dispute of individual findings via the `Triage:` line.

**Checkpoint**: The audit is complete, schema-valid, read-only-invariant-preserved, and handoff-ready.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. T004–T010 are independent of each other (different processes; `[P]`).
- **User Story 1 (Phase 3)**: Depends on Phase 2 (verification status fields populated later cite Phase 2 results). T011 → T012 → T013 sequential (single file). T014–T017 `[P]` after T013 (independent reads).
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion (needs report skeleton). Sweep tasks T018–T041 share the report file → strictly sequential.
- **User Story 3 (Phase 5)**: Depends on Phase 3. May run after or alongside Phase 4 in a multi-auditor setup; in a single-auditor (model) workflow, run after Phase 4. T042–T065 share the report file → sequential.
- **User Story 4 (Phase 6)**: Depends on Phases 3 (skeleton), 4, and 5 (findings to count for Coverage Map T072 and to cross-reference prior-spec status in T073). Strictly sequential.
- **User Story 5 (Phase 7)**: Depends on Phases 4, 5, 6 completing — needs the complete findings set.
- **Polish (Phase 8)**: Depends on Phase 7. T081, T082 are `[P]` (different files).

### User Story Independence Notes

The audit's user stories share a single output file. Strict "different developers in parallel" independence is not achievable for the **write** path. However:

- **US2 alone** (with Phases 1–3) yields a backend-only audit — a valid MVP for a backend-team handoff.
- **US3 alone** (with Phases 1–3) yields a frontend-only audit — a valid MVP for a frontend-team handoff.
- **US2 + US3** yield a per-layer audit without cross-cutting; US4 then strictly adds repo-hygiene coverage.
- **US5** is a pure post-processing step; without it, the report still contains all findings, just unsorted and unsummarized.

### Parallel Opportunities

Truly parallel-safe tasks (different files / different processes, no shared writes):

- **Phase 2**: T004, T005, T006, T007, T008, T009, T010 (seven independent processes).
- **Phase 3**: T014, T015, T016, T017 (four independent file reads after the skeleton T011–T013 lands).
- **Phase 8**: T081, T082 (different files).

Within Phases 4–6, "analysis" can be parallelized across reviewers, but the **append** to `audit-report.md` serializes by file. A single auditor will execute these sequentially.

---

## Parallel Example: Phase 2

```bash
# All seven read-only verification commands run together — different processes, output captured per task:
Task T004: npm --prefix frontend run i18n:check
Task T005: npm --prefix frontend run build
Task T006: npm --prefix frontend test -- --run
Task T007: dotnet build backend/src/DrMirror.Api/DrMirror.Api.csproj
Task T008: dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --no-build
Task T009: npm --prefix frontend audit --json
Task T010: dotnet list backend/src/DrMirror.Api/DrMirror.Api.csproj package --vulnerable --include-transitive
```

## Parallel Example: Phase 3 (after T013)

```bash
# Four prior-spec context reads run together — independent files:
Task T014: read specs/003-production-reality-hardening/
Task T015: read specs/004-uiux-excellence-pass/
Task T016: read specs/005-code-quality-hardening/
Task T017: git show --stat b30a154 (+ specs/006-audit-hardening/ if present)
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 = Backend-only audit)

1. Complete Phase 1 (T001–T003): baseline + invariant established.
2. Complete Phase 2 (T004–T010): verification signals captured.
3. Complete Phase 3 (T011–T017): report skeleton + prior-spec context.
4. Complete Phase 4 (T018–T041): backend findings populated.
5. Run abbreviated Phase 7 + 8 (skip frontend/cross-cutting): populate §1 Summary + §7 Punch-List using only backend findings.
6. **STOP and VALIDATE**: Maintainer can read backend-only audit and act on it. `git diff` clean outside `specs/007-code-audit/`.

### Incremental Delivery

1. MVP (above) → **deliver backend-only audit**.
2. Add Phase 5 (US3) → re-run Phase 7 to refresh §7 with frontend findings → **deliver per-layer audit**.
3. Add Phase 6 (US4) → re-run Phase 7 to refresh §7 with cross-cutting findings → **deliver full audit**.
4. Final Phase 8 → schema-validate + handoff.

### Single-Auditor Strategy (recommended for this run)

A single agent executes phases sequentially: 1 → 2 (parallel where possible) → 3 → 4 → 5 → 6 → 7 → 8. Total estimate: single-digit hours of model time, dominated by Phases 4 and 5.

---

## Notes

- `[P]` markers are reserved for tasks that touch **different files** or run **different processes**. Sweep tasks share `specs/007-code-audit/audit-report.md` and are therefore sequential by file-write constraint, even though their analyses are independent.
- Tasks were NOT generated for testing because (a) the spec does not request tests and (b) the audit's correctness criterion is the FR-002 / SC-003 invariant verified by `git diff` in T079.
- Every sweep task names both the **path under audit** AND the **report section to append to**, so progress is traceable.
- Commit after each phase checkpoint (T010, T017, T041, T065, T073, T078, T082). The optional `before_tasks` / `after_tasks` hooks already enable per-phase commits.
- Avoid: writing patches, formatters, lint --fix, package installs — any of these violates the read-only invariant and FR-002.
