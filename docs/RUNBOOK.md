# Runbook

Operational recovery procedures for production incidents. Each scenario includes symptoms, first-line check, likely causes, recovery steps, verification, and follow-up.

## S1 API Down

Symptoms: synthetic check timeout or 503, SPA downtime banner, Sentry network errors.

First-line check: `curl https://<api>/api/health/live`.

Likely causes: process crash, host reset, deploy regression, missing critical config.

Recovery steps:
1. Restart the API from the hosting control panel.
2. If startup fails, inspect logs for missing configuration keys.
3. If the issue started after deploy, re-deploy the previous backend artifact.

Verification: `GET /api/health/live` returns 200 and frontend API calls recover.

Follow-up: review Sentry/logs and open a post-incident ticket if the SLO budget was consumed.

## S2 Database Unavailable

Symptoms: readiness reports `sqlserver: Unhealthy`, EF connection errors, checkout fails.

First-line check: `Test-NetConnection <db-host> -Port 1433` and the host SQL panel.

Likely causes: SQL instance down, bad connection string, firewall or host maintenance.

Recovery steps:
1. Verify `ConnectionStrings__Default` in host configuration.
2. Restart or resume SQL Server from the host panel.
3. If corruption is suspected, follow `docs/BACKUP_RESTORE.md`.

Verification: `/api/health/ready` returns Healthy and a test catalog query succeeds.

Follow-up: record outage window and confirm backups are current.

## S3 Cloudinary Or Storage Failure

Symptoms: `filestorage` readiness is Degraded or Unhealthy, uploads fail, proof access errors rise.

First-line check: Cloudinary status page and a HEAD request to the configured API root.

Likely causes: Cloudinary outage, expired credentials, billing suspension.

Recovery steps:
1. Verify Cloudinary credentials in host environment variables.
2. Check provider billing and status.
3. Communicate that new uploads may be paused while existing CDN-cached assets may continue to load.

Verification: `/api/health/ready` reports `filestorage: Healthy` and a test upload succeeds.

Follow-up: rotate credentials if exposed or expired.

## S4 SMTP Failure

Symptoms: customers do not receive emails, outbox readiness Degraded or Unhealthy, MailKit exceptions.

First-line check: query undispatched `EmailOutboxMessage` count and check SMTP provider status.

Likely causes: expired credentials, provider rate limit, IP reputation block, blocked port.

Recovery steps:
1. Rotate SMTP credentials or switch provider through env vars.
2. Restart the API so the outbox worker picks up config.
3. Let the outbox replay pending messages through its lease-based processor.

Verification: stuck outbox count decreases and test email dispatch succeeds.

Follow-up: review persistent failures and provider limits.

## S5 Frontend Deploy Issue

Symptoms: white page, chunk-load errors, Sentry release errors after deploy.

First-line check: load the SPA in a fresh incognito session and inspect Vercel deployment logs.

Likely causes: missing `VITE_API_BASE_URL`, bad artifact, broken source-map release.

Recovery steps:
1. Roll back to the previous known-good frontend deployment.
2. Confirm build-time variables on the failed deployment.
3. Rebuild after fixing the variable or code issue.

Verification: catalog loads and Sentry errors stop rising for the bad release.

Follow-up: annotate the failed deployment and link the fixing PR.

## S6 CORS Or Env Misconfiguration

Symptoms: Production startup fails fast or browser blocks API calls with CORS errors.

First-line check: inspect startup logs and verify `Cors__AllowedOrigins__0`.

Likely causes: missing allowed origin, typo in frontend URL, missing JWT/storage/email setting.

Recovery steps:
1. Set the missing or corrected env var in the host control panel.
2. Restart the API.
3. Re-test the SPA from the production frontend URL.

Verification: `/api/health/live` is Healthy and authenticated SPA calls succeed.

Follow-up: add the missed setting to deployment notes if absent.

## S7 Admin Lockout

Symptoms: no admin can sign in or the only active admin credentials are lost.

First-line check: query the database for at least one active user in the Admin role.

Likely causes: forgotten password, mistyped admin email, non-last admin disabled by mistake.

Recovery steps:
1. Set `Admin__SeedEmail` and `Admin__SeedPassword` to the recovery admin credentials.
2. Restart the API to run the idempotent seeder.
3. Sign in and create or repair the intended admin account.

Verification: an active admin can sign in and open `/admin`.

Follow-up: rotate the temporary password and document the recovery event.
