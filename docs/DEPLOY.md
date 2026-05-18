# Deploy

This document explains how to deploy Dr Mirror to a Vercel-class frontend host and MonsterASP.NET-class backend host, then run the production smoke check.

## Backend

1. Create the SQL Server database.
2. Set all required environment variables from `docs/PROJECT_MAP.md`.
3. Publish `backend/src/DrMirror.Api/DrMirror.Api.csproj` in Release mode.
4. Run EF Core migrations against the production connection string.
5. Start the API and confirm `GET /api/health/live` returns `Healthy`.

## Frontend

1. Set `VITE_API_BASE_URL` to the backend origin.
2. Set `VITE_SENTRY_DSN` and `VITE_APP_RELEASE` for staging/production builds.
3. Run `npm ci` and `npm run build` in `frontend/`.
4. Deploy `frontend/dist/` to the static host.

## Smoke Check

1. `GET https://<api>/api/health/live` returns 200.
2. `GET https://<api>/api/health/ready` returns 200 and all checks are Healthy.
3. Public catalog renders in Arabic on the deployed frontend.
4. Admin can sign in and open the admin dashboard.
5. Test buyer can place a COD order and see it in account orders.
6. Test buyer can place an Instapay or wallet order, upload a valid proof, and admin can approve it.

## Post-Deploy Synthetic Monitor Setup

Configure a 1-minute synthetic check against `https://<api>/api/health/ready` using BetterStack, UptimeRobot, or the host monitor. Page on 3 consecutive failures, page on any `Unhealthy`, and notify if `Degraded` lasts at least 5 minutes.

## Staging Performance Smoke Check

Before production promotion, run `DRMIRROR_PERF_SMOKE=1 dotnet test` against the staging-hosted API and confirm catalog list and product detail p95 are at or below 500 ms.
