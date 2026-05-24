# Dr Mirror

An online store for medical scrubs and uniforms, built for the Egyptian market. The catalog covers scrub tops, scrub pants, lab coats, surgical headwear, and medical footwear — each in a full size × colour variant matrix. Arabic is the primary language (RTL), with English as a full second locale. Everything is priced in EGP and payment options are what actually work in Egypt: Cash on Delivery, Instapay, and mobile wallets.

## Stack

- **Backend** — .NET 10, ASP.NET Core (Minimal APIs, vertical slices), EF Core, SQL Server, ASP.NET Identity + JWT (access + refresh token via HttpOnly cookie), Serilog, MailKit, Cloudinary, Mapster, FluentValidation, IP-keyed rate limiting. Hosted on MonsterASP.NET.
- **Frontend** — React 19, TypeScript ~6, Vite 8, HeroUI v3, Tailwind CSS v4, react-router-dom v7, TanStack Query v5, react-hook-form + Zod, axios, dayjs, i18next, next-themes, Lucide icons, Sentry. Hosted on Vercel.
- **Fonts** — Satoshi (Latin) and Alexandria (Arabic), self-hosted variable WOFF2, preloaded.
- **Theming** — Dark-first; light and dark both ship; user choice persisted; full RTL parity.

## Project structure

```
backend/
  src/DrMirror.Api/
    Features/            Vertical slices: Addresses, Admin, AppConfig, Auth,
                         Cart, Catalog, Checkout, Inquiries, Orders
    Domain/              Entities + Orders (enums, state machine)
    Infrastructure/      Email outbox, Identity, Persistence (EF + seeder +
                         migrations), Storage
    BackgroundServices/  Proof retention purge, email outbox retention
    Shared/              Auditing, HealthChecks, RateLimiting, Slugs, Validation
  tests/DrMirror.Tests/  xUnit + in-memory EF
frontend/
  public/fonts/          Self-hosted WOFF2 variable fonts
  src/
    app/                 router.tsx, providers.tsx
    features/            addresses, admin (+ audit/ catalog/ components/ users/),
                         app-config, auth, cart, catalog, checkout, inquiries, orders
    shared/              components, lib (api-client, format, i18n, sentry, …),
                         hooks, pages, types
    locales/             ar/ + en/ — 12 namespace files each
    styles/              globals.css — OKLCH palette, font-face, HeroUI v3 aliases
```

## Quick start

**Backend**

```powershell
cd backend\src\DrMirror.Api
dotnet run
```

Health checks:
- `http://localhost:5223/api/health` — readiness (DB + file storage + outbox)
- `http://localhost:5223/api/health/live` — liveness only (no dependency checks)

**Frontend**

```powershell
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173` in Arabic + dark mode.

## Testing & Quality

**Backend Tests**
```powershell
cd backend
dotnet test
```
*Tests run entirely in-memory by default. To opt-in to SQL Server integration tests (isolates per test run), set the `DRMIRROR_TEST_SQL_CONNECTION` environment variable.*

**Frontend Tests & Checks**
```powershell
cd frontend
npm test           # Run Vitest suite
npm run build      # Verify TypeScript compilation and Vite build
npm run i18n:check # Verify Arabic/English localization key parity
```

## Environment

Secrets are never committed. Configure via environment variables:

**Backend (environment variables or `appsettings.*.json`)**

| Variable | Purpose |
|---|---|
| `ConnectionStrings__Default` | MSSQL connection string |
| `Jwt__Issuer`, `Jwt__Audience`, `Jwt__Secret` | JWT config (`Secret` must be ≥ 64 chars in production) |
| `Jwt__AccessTokenLifetimeMinutes` | Access token TTL (default: 15) |
| `Jwt__RefreshTokenLifetimeDays` | Refresh token TTL (default: 14) |
| `Admin__SeedEmail`, `Admin__SeedPassword` | Seeded admin account (first boot only) |
| `Cors__AllowedOrigins__0` | Allowed CORS origins (array format required) |
| `Auth__UseCrossSiteCookies` | Set `true` in prod when SPA and API are on different origins |
| `Catalog__SeedSamples` | `true` in Development — seeds 5 categories, 10 products, ~133 variants on first boot |
| `FileStorage__Provider` | `local` (dev) or `cloudinary` (prod) |
| `FileStorage__CloudinaryCloudName`, `...ApiKey`, `...ApiSecret` | Required when provider is `cloudinary` |
| `Email__Provider` | `logonly` (dev) or `mailkit` (prod) |
| `Email__FromAddress`, `Email__FromName`, `Email__FrontendBaseUrl`, `Email__SmtpHost`, `Email__SmtpPort`, `Email__SmtpUseStartTls`, `Email__SmtpUsername`, `Email__SmtpPassword` | Required when provider is `mailkit` |
| `Email__ReplyToAddress`, `Email__MessageIdDomain` | Recommended for production deliverability. Use the same authenticated sending domain as `FromAddress`. |
| `Retention__EnableProofPurge` | `true` enables background purge of old payment proof files (default: prod=true) |
| `Retention__ProofPurgeIntervalHours` | How often the proof purge runs (default: 24) |
| `Retention__OutboxRetentionDays` | Days to keep processed outbox messages (default: 90) |
| `Support__ContactEmail` | Contact email exposed via `/api/app-config` to the SPA |
| `HealthChecks__OutboxStuckThreshold` | Alert threshold for stuck outbox messages (default: 100) |

**Frontend (`.env` / Vercel env)**

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend root URL in production (e.g. `https://api.drmirror.com`); `/api` appended automatically. Leave blank in dev (Vite proxy). |
| `VITE_SENTRY_DSN` | Sentry DSN for frontend error tracking. Omit to disable Sentry entirely. |
| `VITE_APP_RELEASE` | Release tag passed to Sentry (e.g. `v1.2.3`). |

### Email deliverability

Transactional email will still land in spam if the sending domain is not authenticated. For production:

- Send from a real mailbox on your domain, for example `no-reply@drmirror.shop` or `support@drmirror.shop`, not a `.local` address.
- Use an SMTP provider that signs DKIM for the same domain as `Email__FromAddress`.
- Add SPF for the SMTP provider to the sending domain DNS.
- Add DKIM records exactly as the SMTP provider gives them.
- Add DMARC, starting with `p=none`, then move to `quarantine` or `reject` after successful monitoring.
- Keep `Email__FrontendBaseUrl` on the public storefront domain, not `localhost`, in production emails.

### Dev secrets

Store `Jwt__Secret` and `Admin__SeedPassword` in .NET user-secrets so they never enter source control:

```powershell
dotnet user-secrets set "Jwt:Secret" "<64+ char random>" --project backend/src/DrMirror.Api/DrMirror.Api.csproj
dotnet user-secrets set "Admin:SeedPassword" "<your-password>" --project backend/src/DrMirror.Api/DrMirror.Api.csproj
```

If `Admin:SeedPassword` is not set, the seeder generates a strong random password on first boot and logs it once at warning level. Save it — it won't appear again.

### EF Core migrations

Migrations apply automatically in Development. To run them manually:

```powershell
# Add a migration after a model change
dotnet ef migrations add <Name> `
  --project backend/src/DrMirror.Api/DrMirror.Api.csproj `
  --startup-project backend/src/DrMirror.Api/DrMirror.Api.csproj `
  --output-dir Infrastructure/Persistence/Migrations

# Apply to the configured DB
dotnet ef database update `
  --project backend/src/DrMirror.Api/DrMirror.Api.csproj `
  --startup-project backend/src/DrMirror.Api/DrMirror.Api.csproj
```

## Status

The store is functional end-to-end: customers can browse the catalog, manage a cart, check out, upload payment proof, and track orders through an eight-state lifecycle. Payment proofs are stored privately and streamed via an authenticated endpoint. Cash on Delivery requires no proof upload; online flows (Instapay/Wallet) do.

Admins have a dashboard, order queue with proof approve/reject, product and category CRUD, payment method management, an inquiry inbox, a read-only user list with role badges, and a full audit log that records every order transition and catalog mutation.

Email delivery utilizes a durable outbox pattern (polling) to guarantee status emails survive transient network faults. Background retention services purge old payment proof files and processed outbox messages on a configurable schedule.

Rate limiting is applied IP-keyed on sensitive endpoints (auth, checkout, proof upload). Frontend error tracking is available via Sentry (opt-in — requires `VITE_SENTRY_DSN`).

Current focus is Phase 004 — UI/UX Excellence Pass.

## Production Deployment

1. **Database:** Create an empty SQL Server database.
2. **Migrations:** Ensure `.NET SDK` is installed, then run `dotnet ef database update --project backend/src/DrMirror.Api`.
3. **Backend App:** Deploy the compiled .NET outputs. Set `ASPNETCORE_ENVIRONMENT=Production` and configure all required environment variables listed above (particularly `ConnectionStrings__Default`, `Jwt__*`, and `FileStorage__*`). Ensure the app can write to its current directory if using local file storage.
4. **Frontend App:** Run `npm run build`. Set `VITE_API_BASE_URL` to your backend's production root (e.g. `https://api.drmirror.com`); `/api` is appended automatically. Leave blank in development to use the Vite proxy. Deploy the `dist` folder to a static host like Vercel or IIS.
5. **Verify:** Check `<backend_url>/api/health` and attempt to log in with the seeded admin credentials.

---
