# Quickstart — Verifying the Hardening

**Feature**: Full-Stack Production Reality Hardening
**Branch**: `003-production-reality-hardening`

This is the developer / operator verification path. It covers what to run locally, what CI does, and what to verify in staging before promoting to production.

## Prerequisites

- .NET 10 SDK (project pins via `<TargetFramework>` and `global.json` if present)
- Node.js LTS (per `.nvmrc` once added; otherwise current LTS)
- SQL Server (LocalDB acceptable for development; managed SQL Server for staging/production)
- `dotnet user-secrets` set:
  - `Jwt:Secret` (≥ 64 chars)
  - `Admin:SeedPassword` (development convenience; optional — seeder generates one otherwise)

## 1. Clean clone — boot end to end

```powershell
git checkout 003-production-reality-hardening

# Backend
cd backend\src\DrMirror.Api
dotnet user-secrets set "Jwt:Secret" "$( -join ((1..72) | ForEach-Object { [char](Get-Random -Min 33 -Max 126) }))"
dotnet user-secrets set "Admin:SeedPassword" "DevPass!2026"
dotnet run

# Verify backend
curl http://localhost:5223/api/health/live    # → { "status": "Healthy" }
curl http://localhost:5223/api/health/ready   # → all checks Healthy

# Frontend (new shell)
cd frontend
npm ci
npm run dev
# Open http://localhost:5173 — Arabic + dark mode default
```

## 2. Run the full test suite

```powershell
# Backend — in-memory provider by default
cd backend
dotnet test

# Backend — opt-in SQL integration tests (only if you have a sandbox SQL Server)
$env:DRMIRROR_TEST_SQL_CONNECTION = "Server=...;Database=DrMirror_Tests;..."
dotnet test

# Frontend
cd ..\frontend
npm test
npm run build           # TypeScript + Vite production build
npm run i18n:check      # locale parity
```

All must pass.

## 3. Verify hardening behaviors locally

### 3.1 Payment-proof validation

- Try uploading a 6 MB JPEG via the frontend proof flow → SPA blocks with localized error; backend returns 413 if the SPA pre-check is bypassed.
- Try uploading a `.exe` renamed to `.jpg` → 415 (magic-bytes mismatch).

### 3.2 Idempotency

- Submit checkout twice rapidly via the frontend → one order created (visible in `/account/orders`).
- Curl `POST /api/checkout/orders` twice with the same `X-Idempotency-Key` → same order in the response body both times.

### 3.3 Access boundaries

Create two test users (A and B) plus the seeded admin:
- Sign in as A; place an order. Note its `orderNumber`.
- Sign in as B; `GET /api/orders/<A's orderNumber>` → 404 ProblemDetails.
- Sign in as the admin; disable user A (`POST /api/admin/users/<A>/disable`); try to use A's still-valid access token → 401.
- As user B (buyer JWT), call any `/api/admin/*` endpoint → 403.

### 3.4 Health readiness

- Stop SQL Server (`Stop-Service MSSQLSERVER` or stop LocalDB instance).
- `curl http://localhost:5223/api/health/ready` → 503, `sqlserver: Unhealthy`.
- Restart SQL → ready endpoint returns Healthy again.

### 3.5 Admin audit log

- Sign in as admin; approve a payment proof or change an order status.
- `GET /api/admin/audit?pageSize=10` → entry present with correct `actionType`, `targetEntityType`, `targetEntityId`, `correlationId`, `timestampUtc`.

### 3.6 Sentry (optional in dev)

- Leave `VITE_SENTRY_DSN` empty → Sentry init no-ops; no network calls; ErrorBoundary still shows localized fallback.
- Set `VITE_SENTRY_DSN` to a dev DSN → throw a test error from a debug button; verify the event reaches Sentry with `environment=development`.

## 4. CI verification

Open a pull request against `main`. The GitHub Actions workflow runs:

- **`backend` job** (Windows): `dotnet restore` → `dotnet build --configuration Release` → `dotnet test --configuration Release`.
- **`frontend` job** (Ubuntu): `npm ci` → `npm run build` → `npm test -- --run` → `npm run i18n:check` (+ `npm run lint` if configured).

Both must pass before merge. Failures block.

If `DRMIRROR_TEST_SQL_CONNECTION` is configured as an org/repo GitHub Actions secret, the backend job additionally runs SQL integration tests. If absent, the step is **skipped cleanly** — not failed.

## 5. Staging deploy — production smoke check

Per `docs/DEPLOY.md` (to be written during implementation). Smoke check requires all of the following to succeed:

- [ ] `GET https://<staging-api>/api/health/live` → 200, `Healthy`.
- [ ] `GET https://<staging-api>/api/health/ready` → 200, all checks `Healthy`.
- [ ] Sign in as the seeded admin → admin hub renders.
- [ ] Public catalog renders in Arabic at the staging frontend URL.
- [ ] End-to-end order placement (test buyer): browse → cart → checkout COD → tracked order visible in `/account/orders`.
- [ ] End-to-end Instapay-style order with a sample valid proof: order moves to `PendingPaymentReview`; admin approves → status `Paid`.
- [ ] Synthetic check pinging `/api/health/ready` at 1-minute interval succeeds for ≥ 1 hour straight.
- [ ] Sentry receives a deliberately-thrown error from the staging build with `environment=staging` and the correct release tag.

## 6. Production runbook drill (per FR-R3)

Before declaring this feature complete, walk an operator (not the original author) through the seven scenarios in `docs/RUNBOOK.md` against a staging environment. Each scenario must be resolvable using only the runbook; document any step that required improvisation and fix the runbook.

## 7. Backup & restore drill (per FR-D9 / FR-R2)

Per `docs/BACKUP_RESTORE.md`:

- [ ] Take a backup of the staging database.
- [ ] Restore it into a parallel "drill" database.
- [ ] Point a sandbox API at the drill database and boot it.
- [ ] Verify `GET /api/health/ready` is Healthy and that recent orders are present.
- [ ] Measure elapsed time from "restore command" to "API healthy on drill DB" — must be ≤ 2 hours (RTO target).

## When to merge

When all of the following are true:

- `/speckit.tasks` has produced `tasks.md` and all tasks are complete.
- Local quickstart §2 + §3 pass.
- CI is green on the PR.
- Staging quickstart §5 passes.
- Runbook drill (§6) and backup drill (§7) have been performed at least once and any deficiencies are fixed.
- `docs/PROJECT_MAP.md`, `docs/DEPLOY.md`, `docs/RUNBOOK.md`, `docs/BACKUP_RESTORE.md`, `docs/THREAT_MODEL.md` are present and reviewed.
- README is updated to link the new docs.

Then merge to `main` and tag the release in the production deploy job log.
