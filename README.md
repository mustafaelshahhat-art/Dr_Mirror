# Dr Mirror

An online store for medical scrubs and uniforms, built for the Egyptian market. The catalog covers scrub tops, scrub pants, lab coats, surgical headwear, and medical footwear — each in a full size × colour variant matrix. Arabic is the primary language (RTL), with English as a full second locale. Everything is priced in EGP and payment options are what actually work in Egypt: Cash on Delivery, Instapay, and mobile wallets.

## Stack

- **Backend** — .NET 10, ASP.NET Core (Minimal APIs, vertical slices), EF Core, SQL Server, ASP.NET Identity + JWT, Serilog, Coravel, MailKit, Cloudinary. Hosted on MonsterASP.NET.
- **Frontend** — React 19, TypeScript, Vite, HeroUI, Tailwind CSS v4, i18next, React Query. Hosted on Vercel.
- **Fonts** — Satoshi (Latin) and Alexandria (Arabic), self-hosted variable WOFF2, preloaded.
- **Theming** — Dark-first; light and dark both ship; user choice persisted; full RTL parity.

## Project structure

```
backend/
  src/DrMirror.Api/      ASP.NET Core 10 — vertical slices under /Features
  tests/DrMirror.Tests/  xUnit
frontend/
  public/fonts/          Self-hosted WOFF2 variable fonts
  src/                   App, providers, features, shared, locales, styles
```

## Quick start

**Backend**

```powershell
cd backend\src\DrMirror.Api
dotnet run
```

Health check: `http://localhost:5223/api/health`

**Frontend**

```powershell
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173` in Arabic + dark mode.

## Environment

Secrets are never committed. Configure via environment variables:

| Variable | Purpose |
|---|---|
| `ConnectionStrings__Default` | MSSQL connection string |
| `Jwt__Issuer`, `Jwt__Audience`, `Jwt__Secret` | JWT config |
| `Admin__SeedEmail`, `Admin__SeedPassword` | Seeded admin account (first boot only) |
| `Cors__AllowedOrigins` | Allowed CORS origins |
| `Auth__UseCrossSiteCookies` | Set `true` in prod when SPA and API are on different origins |
| `Catalog__SeedSamples` | `true` in Development — seeds 5 categories, 10 products, ~133 variants on first boot |
| `FileStorage__Provider` | `local` (dev) or `cloudinary` (prod) |
| `FileStorage__CloudinaryCloudName`, `...ApiKey`, `...ApiSecret` | Required when provider is `cloudinary` |
| `Email__Provider` | `logonly` (dev) or `mailkit` (prod) |
| `Email__FromAddress`, `Email__FromName`, `Email__SmtpHost`, `Email__SmtpPort`, `Email__SmtpUseStartTls`, `Email__SmtpUsername`, `Email__SmtpPassword` | Required when provider is `mailkit` |

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

The store is functional end-to-end: customers can browse the catalog, manage a cart, check out, upload payment proof, and track orders through an eight-state lifecycle. Admins have a dashboard, order queue with proof approve/reject, product and category CRUD, and an inquiry inbox. Current focus is M4 — polishing admin workflows and advanced order operations.

---

Architecture decisions and constraints live in [PROJECT_MAP](docs/PROJECT_MAP.md). UI rules are in [DESIGN_PRINCIPLES](docs/DESIGN_PRINCIPLES.md) — read that before touching the frontend.
