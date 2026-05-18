# Quickstart — Reproducing the Audit

This document is the **runbook** a future contributor (human or AI) follows to re-run the audit. It is deliberately mechanical and does not change source code at any step.

## Prerequisites

- Repo cloned and on branch `007-code-audit` (or any descendant).
- Node ≥ 20 and `npm` available.
- .NET 10 SDK available.
- PowerShell (Windows) or Bash (Linux/macOS).
- The maintainer has previously reviewed `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `contracts/report-schema.md`.

## Step 0 — Verify clean working tree

```powershell
git status --porcelain
```

Expected: empty output. If anything is dirty, commit or stash before starting — the read-only invariant depends on a clean baseline.

## Step 1 — Capture commit SHA for the report frontmatter

```powershell
git rev-parse HEAD
```

Record this SHA. It becomes the `Commit Audited` value in the report frontmatter.

## Step 2 — Snapshot the in-scope file list

```powershell
git ls-files | Out-File specs/007-code-audit/.fileset.txt -Encoding utf8
```

> The `.fileset.txt` artifact is for the auditor's reference only. It is gitignored if listed in `.gitignore`; if not, it MUST be deleted before commit so it does not pollute the spec folder. Treat it as a scratchpad.

## Step 3 — Run read-only verification commands

Run each and capture exit code + last ~40 lines of output. These go in §8 Appendix A.

```powershell
# i18n parity
npm --prefix frontend run i18n:check

# Frontend build (writes to gitignored dist/)
npm --prefix frontend run build

# Frontend tests
npm --prefix frontend test -- --run

# Backend build
dotnet build backend/src/DrMirror.Api/DrMirror.Api.csproj

# Backend tests (skip rebuild for speed)
dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --no-build

# Dependency vulnerability scans (read-only — no install)
npm --prefix frontend audit --json
dotnet list backend/src/DrMirror.Api/DrMirror.Api.csproj package --vulnerable --include-transitive
```

Each command's pass/fail status becomes a bullet in §1 Executive Summary.

## Step 4 — Sweep each layer

Audit in this fixed order, recording findings against the contract in `contracts/report-schema.md`:

1. **Backend** — for each path under `backend/src/DrMirror.Api/`, in this order:
   `Features/Auth`, `Features/Catalog`, `Features/Cart`, `Features/Checkout`, `Features/Orders`, `Features/Addresses`, `Features/Inquiries`, `Features/AppConfig`, `Features/Admin/*`, `Domain/`, `Infrastructure/`, `BackgroundServices/`, `Shared/`, `Persistence/Migrations/`, `Program.cs` + composition root. Apply: Constitution §I/III/IV/VII + general .NET best practice + CLAUDE.md backend conventions.
2. **Frontend** — for each path under `frontend/src/`, in this order:
   `app/`, `features/auth`, `features/catalog`, `features/cart`, `features/checkout`, `features/orders`, `features/addresses`, `features/inquiries`, `features/app-config`, `features/admin/*`, `shared/components`, `shared/lib`, `shared/hooks`, `shared/pages`, `shared/types`, `locales/ar/`, `locales/en/`, `styles/`. Apply: Constitution §II/VI/VIII + React/a11y best practice + CLAUDE.md frontend conventions.
3. **Cross-cutting** — repo root, `docs/`, `package.json`/`*.csproj`/`*.sln`, `appsettings*.json` (template only), `.gitignore`, `.editorconfig`, CI/scripts, `.specify/` config. Apply: Constitution §III/V/VII + repo-boundary rule + dependency hygiene.

For each finding, append a `#### F-{nnn} — …` block to the in-progress report file under the correct H3 sub-group. Number monotonically across the whole report.

## Step 5 — Verify prior audits

For each of `specs/003-production-reality-hardening`, `specs/004-uiux-excellence-pass`, `specs/005-code-quality-hardening`, `specs/006-audit-hardening`:

1. Read the spec's user stories / tasks list.
2. For each recommendation, search the current codebase to verify it is in effect.
3. If verified → record under §6 "Resolved Prior Findings" with the location proving it.
4. If not verified → record under the appropriate findings section (§3/§4/§5) as a Critical or High finding, citing the regressed prior spec.

## Step 6 — Build the Coverage Map (§2)

Walk every top-level folder enumerated in `plan.md`'s "Source Code" tree and add a row. Count findings per path. Verify zero-finding folders are still listed.

## Step 7 — Assemble the punch-list (§7)

Group all F-NNN entries by severity (Critical → Info), within each group sort by category then ID. Render each as the one-line format from `contracts/report-schema.md`.

## Step 8 — Write the Executive Summary (§1)

Last. Now that all findings exist, write 3–6 paragraphs covering:
- Top 3 Critical/High items by ID (one-line each).
- Build + test status (from §8 Appendix A).
- Dependency vuln status.
- RTL/i18n parity status.
- Prior-audit resolution status.

## Step 9 — Frontmatter totals

Compute per-severity counts and fill the frontmatter `Result Summary`. Verify totals match the Coverage Map column sum.

## Step 10 — Read-only invariant check

```powershell
git diff --name-only
```

Every path listed MUST start with `specs/007-code-audit/`. If any other path appears, the audit has violated SC-003 — investigate, revert, document.

```powershell
git status --short
```

The only entries should be the new files inside `specs/007-code-audit/`.

## Step 11 — Hand off

Commit the report (`audit-report.md`) and supporting Phase 0/1 artifacts. The maintainer's next move is `/speckit-tasks` (to break the punch-list into trackable tasks) or `/speckit-plan` for a remediation feature that consumes the punch-list as input.

## Total expected time

A single-pass audit at this codebase's scale (~thousand-LoC per layer) should fit in single-digit hours of model time, dominated by the sweep in Step 4. Subsequent audits on the same commit are faster because Phase 0/1 artifacts are reusable.
