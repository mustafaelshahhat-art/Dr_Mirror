# Contract — Operational Runbook (Scenarios & Recovery)

The implementation MUST produce a `docs/RUNBOOK.md` covering at least the seven scenarios below. This file is the **contract**: it specifies what every entry MUST contain and what the acceptance test checks. The final `docs/RUNBOOK.md` is written during implementation.

## Required structure per scenario

Every entry MUST contain:

1. **Symptoms** — how an operator notices the failure (synthetic check, Sentry alert, customer report, log signal).
2. **First-line check** — one command or URL to confirm the diagnosis (e.g., `curl https://api/.../health/ready`, `dotnet ef database update --dry-run`).
3. **Likely causes** — short bulleted list of the top 2–4 root causes.
4. **Recovery steps** — numbered, copy-pasteable. Each step lists the host control panel action, command, or env-var change. No "consult original author" steps allowed.
5. **Verification** — how to confirm the fix worked (re-run the first-line check; place a test order; sign in as admin).
6. **Follow-up** — what to do after service is restored (Sentry triage, post-mortem ticket if SLO breached).

## Seven required scenarios

### S1 — API down

- Symptoms: synthetic check 503/timeout; SPA shows global downtime banner; Sentry network errors spike.
- First-line check: `curl https://<api>/api/health/live`.
- Likely causes: process crash, host reset, deploy regression, missing critical config.
- Recovery: see host control panel (MonsterASP.NET restart); if deploy regression, re-deploy previous artifact (see S5).

### S2 — Database unavailable

- Symptoms: `/api/health/ready` reports `sqlserver: Unhealthy`; logs show EF connection failures; orders cannot be placed.
- First-line check: host SQL Server panel; `Test-NetConnection <db-host> -Port 1433`.
- Likely causes: SQL Server instance down, connection string changed, firewall rule, host maintenance.
- Recovery: verify connection string env var; restart instance from host panel; if data corruption suspected, follow `docs/BACKUP_RESTORE.md`.

### S3 — Cloudinary / storage failure

- Symptoms: `/api/health/ready` reports `filestorage: Unhealthy` or `Degraded`; admin product-image uploads fail; new payment-proof uploads fail with 502/5xx surfaced as ProblemDetails.
- First-line check: Cloudinary status page; HEAD request to Cloudinary API root.
- Likely causes: Cloudinary outage, expired API credentials, account suspended (billing).
- Recovery: verify credentials; check billing; if extended outage, communicate that admins cannot upload new images and new buyers cannot upload new proofs. Existing images/proofs continue to serve from CDN cache during partial outages.

### S4 — SMTP failure

- Symptoms: customers report no order-status emails; outbox health check reports `Degraded` or `Unhealthy` (stuck-message count rises); Sentry / logs show MailKit exceptions.
- First-line check: query `EmailOutboxMessage WHERE DispatchedUtc IS NULL` count; SMTP provider status page.
- Likely causes: SMTP credentials expired, provider rate-limited, IP-reputation block, port 587 firewall.
- Recovery: rotate SMTP credentials; switch SMTP provider via env vars; the outbox will replay stuck messages once SMTP is restored (lease-based; multi-instance safe).

### S5 — Frontend deploy issue

- Symptoms: SPA fails to load (white page or chunk-load error); Sentry breadcrumbs show JS errors immediately after deploy.
- First-line check: load the SPA in a fresh incognito window; check Vercel deployment logs.
- Likely causes: missing `VITE_API_BASE_URL`, missing `VITE_SENTRY_DSN`, bad source-map upload, broken build artifact.
- Recovery: re-promote the previous Vercel build (one-click rollback); investigate via the Sentry release tag for the broken build.

### S6 — CORS / env misconfiguration

- Symptoms: backend refuses to start in Production (fail-fast); or SPA gets blocked on `Access-Control-Allow-Origin` errors.
- First-line check: inspect backend startup logs for `InvalidOperationException` from `Program.cs`; check `Cors__AllowedOrigins__0` in host env vars.
- Likely causes: missing `Cors__AllowedOrigins__0`, typo in production frontend URL, missing `Jwt__Secret`, missing `FileStorage__Cloudinary*` when provider is `cloudinary`, missing `Email__Smtp*` when provider is `mailkit`.
- Recovery: set the missing env var from the host control panel; restart the API; verify with `/api/health/live`.

### S7 — Admin lockout

- Symptoms: no admin can sign in; last-admin guard prevented self-demotion (working as intended) but a credentials issue locked the only seeded admin.
- First-line check: confirm via DB query that an `Admin`-role user exists.
- Likely causes: forgotten admin password; admin email mistyped; admin record accidentally disabled (the guard blocks this for the last admin, but if a second admin existed it could happen).
- Recovery: bootstrap path — set `Admin__SeedEmail` + `Admin__SeedPassword` env vars to the desired credentials and restart the API. The seeder is idempotent: if a user with that email exists, the seeder resets the password and ensures the Admin role and `IsDisabled = false`. If no `Admin__SeedPassword` is set, the seeder generates a strong random password and logs it once at Warning level — capture it immediately.

## Acceptance check

For each of S1–S7, a staging simulation must produce the documented symptoms, the operator must execute the documented steps **without consulting the original author**, and service must be restored. This is part of Acceptance Criteria AC-5.
