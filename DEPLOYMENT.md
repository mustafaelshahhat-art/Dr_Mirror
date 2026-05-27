# Dr. Mirror — Production Deployment Guide

## Architecture Overview

| Component | Platform | Technology |
|-----------|----------|------------|
| Backend API | MonsterASP.NET (Windows / IIS) | .NET 10 ASP.NET Core |
| Frontend SPA | Vercel | React + Vite |
| WhatsApp Sidecar | Render | Node.js 20 |
| Main Database | SQL Server on MonsterASP | EF Core (SQL Server provider) |
| WhatsApp Session Store | MongoDB Atlas | MongoDB 6+ |

> **Database constraint**: The backend uses `Microsoft.EntityFrameworkCore.SqlServer`
> and all migrations contain SQL Server-specific syntax (`uniqueidentifier`, `nvarchar`,
> `SYSUTCDATETIME()`, etc.). **Supabase (PostgreSQL) is not compatible** without
> replacing the EF Core provider and regenerating every migration from scratch.
> Use MonsterASP's built-in SQL Server for the main database.

---

## Deployment Order

Deploy in this sequence to avoid dependency failures:

1. **SQL Server** — run EF Core migrations first.
2. **MongoDB Atlas** — create cluster, database user, and whitelist IPs.
3. **Render (WhatsApp sidecar)** — deploy and confirm `/health` returns `{"ok":true}`.
4. **MonsterASP (Backend)** — deploy, verify `/api/health/ready` returns 200.
5. **Vercel (Frontend)** — deploy, confirm the SPA loads and reaches the backend.
6. **WhatsApp pairing** — scan QR once, then lock down the pairing UI (see §3).

---

## 1. Main Database — SQL Server on MonsterASP

### Setup
1. In the MonsterASP control panel, create a SQL Server database.
2. Note the generated connection string — you need it for the backend.
3. Run EF Core migrations **before** the first deployment (and before any
   deployment that includes schema changes):

```powershell
# Run from the repo root — set the real production connection string
$env:ConnectionStrings__Default = "Server=YOUR_SERVER.mssql.somee.com;Database=YOUR_DB;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True;MultipleActiveResultSets=True;"
$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet ef database update --project backend\src\DrMirror.Api
```

Migrations are **never** auto-applied in production (only in Development).

### Connection String Format
```
Server=YOUR_SERVER.mssql.somee.com;Database=YOUR_DB;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True;MultipleActiveResultSets=True;
```

---

## 2. WhatsApp Session Store — MongoDB Atlas

### Setup
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Under **Database Access**, create a user with **Read and Write** to the database.
3. Under **Network Access**, add `0.0.0.0/0` (or restrict to Render's static IPs).
4. From **Connect → Drivers**, copy the connection string:
   ```
   mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/whatsapp_sessions?retryWrites=true&w=majority
   ```
5. The `baileys_auth_state` collection is created automatically on first run.

---

## 3. WhatsApp Service — Render

### render.yaml Placement
`render.yaml` must live at the **repository root** to be used by Render's
infrastructure-as-code feature. The file is currently at
`whatsapp-service/render.yaml` — either move it to the repo root, or
configure the service manually in the Render dashboard with these settings:

| Setting | Value |
|---------|-------|
| **Root directory** | `whatsapp-service` |
| **Runtime** | Node |
| **Node version** | 20 |
| **Build command** | `npm ci` |
| **Start command** | `npm start` |
| **Health check path** | `/health` |

### Environment Variables (Render Dashboard → Environment)

| Variable | Required | Value / Description |
|----------|----------|---------------------|
| `NODE_ENV` | Yes | `production` |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `INTERNAL_API_KEY` | Yes | Shared secret with the backend — must be ≥32 chars and match `WhatsApp__InternalApiKey` on MonsterASP. Generate: `openssl rand -hex 32` |
| `PAIRING_ADMIN_TOKEN` | No | Separate admin token for the pairing UI. Falls back to `INTERNAL_API_KEY` if omitted |
| `ENABLE_PAIRING_UI` | Yes | `false` — only set to `true` temporarily when scanning the QR |
| `SEND_TIMEOUT_MS` | No | Send timeout in ms. Default: `15000` |
| `DAILY_PHONE_LIMIT` | No | Max messages per phone per day. Default: `10` |
| `GLOBAL_SEND_LIMIT_PER_MINUTE` | No | Global send cap per minute. Default: `60` |

`PORT` is injected automatically by Render — do not add it to the environment.
The service reads `process.env.PORT` and defaults to `3005` for local development.

### First-Time WhatsApp Pairing
1. Set `ENABLE_PAIRING_UI=true` and trigger a redeploy.
2. Open `https://YOUR-RENDER-URL/pair` in a browser (authenticates via
   `PAIRING_ADMIN_TOKEN` or `INTERNAL_API_KEY` as a URL query parameter:
   `https://YOUR-RENDER-URL/qr/YOUR_TOKEN`).
3. Scan the QR code from WhatsApp → Settings → Linked Devices.
4. Set `ENABLE_PAIRING_UI=false` and redeploy. The session persists in MongoDB.

---

## 4. Backend API — MonsterASP.NET

### Build & Publish

```powershell
dotnet publish backend\src\DrMirror.Api\DrMirror.Api.csproj `
  -c Release `
  -r win-x64 `
  --self-contained false `
  -o .\publish
```

Upload the contents of `.\publish` to the MonsterASP web root via FTP or the
control panel's file manager.

**Runtime requirement**: .NET 10. Verify that MonsterASP has .NET 10 available
before deploying (check their control panel for supported runtimes).

**IIS Application Pool**: Set to **No Managed Code** — ASP.NET Core runs its
own Kestrel server hosted inside the IIS worker process.

### Environment Variables

ASP.NET Core maps flat environment variable names to hierarchical config keys
using double-underscore (`__`) as the separator. Set these in the MonsterASP
control panel under **Application Settings** (or directly in `web.config`
under `<aspNetCore><environmentVariables>`).

#### Required

| Environment Variable | Notes |
|----------------------|-------|
| `ASPNETCORE_ENVIRONMENT` | Must be `Production` |
| `ConnectionStrings__Default` | SQL Server connection string from §1 |
| `Jwt__Secret` | JWT signing secret — must be ≥64 chars. Generate: `openssl rand -hex 64` |
| `Jwt__Issuer` | JWT issuer claim, e.g. `drmirror.com` |
| `Jwt__Audience` | JWT audience claim, e.g. `drmirror.com` |
| `Admin__SeedEmail` | Initial admin account email |
| `Admin__SeedPassword` | Initial admin password (≥12 chars, mixed case + symbols) |
| `Cors__AllowedOrigins__0` | Vercel frontend URL, e.g. `https://drmirror.vercel.app` |
| `Email__FrontendBaseUrl` | Same value as `Cors__AllowedOrigins__0` — used in email links |

Use `Cors__AllowedOrigins__0`, `__1`, etc. for each additional allowed origin
(e.g., a custom domain alongside the Vercel subdomain).

#### File Storage — choose one provider

**Cloudinary** (recommended):

| Variable | Value |
|----------|-------|
| `FileStorage__Provider` | `cloudinary` |
| `FileStorage__CloudinaryCloudName` | Your Cloudinary cloud name |
| `FileStorage__CloudinaryApiKey` | Cloudinary API key |
| `FileStorage__CloudinaryApiSecret` | Cloudinary API secret |

**Local filesystem** (only suitable if MonsterASP provides persistent writable storage):

| Variable | Value |
|----------|-------|
| `FileStorage__Provider` | `local` |

#### Email — choose one provider

**SMTP / MailKit**:

| Variable | Value |
|----------|-------|
| `Email__Provider` | `mailkit` |
| `Email__FromAddress` | Sender address |
| `Email__FromName` | Sender display name |
| `Email__SmtpHost` | SMTP hostname, e.g. `smtp.gmail.com` |
| `Email__SmtpPort` | `587` |
| `Email__SmtpUseStartTls` | `true` |
| `Email__SmtpUsername` | SMTP username |
| `Email__SmtpPassword` | SMTP app password |

**Log-only** (no real email — useful for staging):

| Variable | Value |
|----------|-------|
| `Email__Provider` | `logonly` |

#### WhatsApp Integration

| Variable | Value |
|----------|-------|
| `WhatsApp__Enabled` | `true` |
| `WhatsApp__ServiceUrl` | Render URL, e.g. `https://drmirror-whatsapp.onrender.com` |
| `WhatsApp__InternalApiKey` | Must exactly match `INTERNAL_API_KEY` on Render |
| `WhatsApp__TimeoutSeconds` | HTTP timeout for sidecar calls. Default: `30` |
| `WhatsApp__MaxAttempts` | Outbox retry cap. Default: `5` |
| `WhatsApp__DailyLimitPerPhone` | Daily message cap per phone. Default: `50` |

#### Optional

| Variable | Default | Notes |
|----------|---------|-------|
| `Support__ContactEmail` | — | Email shown in the SPA contact affordance |
| `Retention__EnableProofPurge` | `true` in Production | Enables scheduled payment proof purge |
| `HealthChecks__OutboxStuckThreshold` | `100` | Unhealthy threshold for stuck outbox messages |
| `RateLimit__PermitLimitMultiplier` | `1` | Scale factor for all rate limit windows |

### Pre-deploy Secret Validation

Before uploading a new build, run the built-in validator to catch missing
secrets early (exits 1 with a list of every missing key):

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
$env:ConnectionStrings__Default = "..."
$env:Jwt__Secret = "..."
$env:Jwt__Issuer = "drmirror.com"
$env:Jwt__Audience = "drmirror.com"
$env:Admin__SeedEmail = "admin@drmirror.com"
$env:Admin__SeedPassword = "..."
$env:Cors__AllowedOrigins__0 = "https://your-frontend.vercel.app"
# ... set remaining optional vars (FileStorage, Email, WhatsApp) ...
dotnet .\publish\DrMirror.Api.dll --validate-prod-secrets
```

### Notes
- Migrations must be run **before** each deployment that changes the schema.
- On first boot the admin account is created automatically. The generated
  password is written to the log **once** at Warning level — check startup
  logs immediately if you did not set `Admin__SeedPassword`.

---

## 5. Frontend SPA — Vercel

### Project Settings (Vercel Dashboard)

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | 20.x |

`frontend/vercel.json` handles SPA routing (all paths → `index.html`) and
sets a 1-year immutable cache on hashed Vite asset bundles.

### Environment Variables (Vercel Dashboard → Settings → Environment Variables)

#### Required

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | MonsterASP backend URL, e.g. `https://api.drmirror.shop`. `/api` is appended automatically by the client. |

#### Optional — Sentry

| Variable | Description |
|----------|-------------|
| `VITE_SENTRY_DSN` | Sentry DSN. Leave blank to disable Sentry entirely. |
| `VITE_APP_RELEASE` | Release tag, e.g. `v1.2.3` or a git SHA. |
| `SENTRY_AUTH_TOKEN` | Sentry token for source-map upload during `npm run build`. |
| `SENTRY_ORG` | Sentry organization slug. |
| `SENTRY_PROJECT` | Sentry project slug. |

`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are build-time only
and must **not** be prefixed with `VITE_` — they are consumed by
`@sentry/vite-plugin` and never embedded in the bundle.

---

## 6. Credentials to Rotate Before Going Live

The following credentials exist in local development files. They are
gitignored and never committed, but should still be rotated before production
use in case they were shared or exposed through other means.

### MongoDB (`whatsapp-service/.env`)
The MongoDB user and password previously stored in `whatsapp-service/.env`
must be considered exposed. Rotate them before any production deployment.

1. Log into MongoDB Atlas → **Database Access**.
2. Edit or delete the development database user and set a new strong password.
3. Update the `MONGODB_URI` secret in the Render dashboard with the new password.

### Cloudinary (`backend/src/DrMirror.Api/appsettings.Development.json`)
The Cloudinary API key and secret stored in `appsettings.Development.json`
should be treated as potentially exposed. Rotate them before production.

1. Log into [cloudinary.com](https://cloudinary.com) → Settings → API Keys.
2. Regenerate the API secret (or create a new key pair and delete the old one).
3. Set the new values for `FileStorage__CloudinaryApiKey` and
   `FileStorage__CloudinaryApiSecret` in MonsterASP Application Settings.

### Gmail SMTP (`backend/src/DrMirror.Api/appsettings.Development.json`)
The Gmail SMTP app password in `appsettings.Development.json` should be
revoked and replaced.

1. Go to Google Account → Security → App passwords.
2. Revoke the existing app password and generate a new one.
3. Set the new value for `Email__SmtpPassword` in MonsterASP Application Settings.

---

## 7. Pre-launch Checklist

### Backend (MonsterASP)
- [ ] EF Core migrations applied to the production SQL Server database
- [ ] `ASPNETCORE_ENVIRONMENT=Production`
- [ ] `ConnectionStrings__Default` — real SQL Server connection string
- [ ] `Jwt__Secret` — ≥64-char random string (not a dev placeholder)
- [ ] `Jwt__Issuer` and `Jwt__Audience` — set to your production domain (e.g. `drmirror.com`)
- [ ] `Admin__SeedEmail` — admin account email
- [ ] `Admin__SeedPassword` — strong, unique password (≥12 chars)
- [ ] `Cors__AllowedOrigins__0` — real Vercel deployment URL
- [ ] `FileStorage__CloudinaryApiSecret` (if using Cloudinary) — rotated
- [ ] `Email__SmtpPassword` (if using MailKit) — rotated
- [ ] `WhatsApp__InternalApiKey` — matches sidecar `INTERNAL_API_KEY`
- [ ] `--validate-prod-secrets` exits 0

### WhatsApp Sidecar (Render)
- [ ] `MONGODB_URI` — rotated Atlas credentials
- [ ] `INTERNAL_API_KEY` — matches backend `WhatsApp__InternalApiKey`
- [ ] `ENABLE_PAIRING_UI=false`
- [ ] `/health` returns `{"ok":true}`

### Frontend (Vercel)
- [ ] `VITE_API_BASE_URL` — points to the live MonsterASP URL
- [ ] SPA routing works (navigate to `/about`, reload — should not 404)
