# Dr_Mirror

Arabic-first (RTL) specialist store for **medical scrubs and uniforms** — scrub tops, scrub pants, lab coats, surgical headwear, and medical footwear. Bilingual (ar / en), bilingual product copy, full size × colour variant matrix, single-currency (EGP).

> **Before doing any work in this repo, read both:**
> - `PROJECT_MAP.md` — the durable architecture map (tech, flow, structure, deferred items).
> - `DESIGN_PRINCIPLES.md` — the durable UI rulebook (required reading for any UI change).

## Stack

- **Frontend** — React 19 + TypeScript + Vite + HeroUI + Tailwind CSS 4 + next-themes + i18next + React Query. Hosted on Vercel.
- **Backend** — .NET 10 + ASP.NET Core (Minimal APIs, vertical slices) + EF Core + SQL Server + ASP.NET Identity + JWT + Serilog + Coravel + MailKit + Cloudinary. Hosted on MonsterASP.NET.
- **Typography** — Self-hosted Satoshi (en) + Alexandria (ar), variable WOFF2, preloaded.
- **Theming** — Dark-first; light + dark both ship; user choice persisted; full RTL parity.

## Repo layout

```
backend/                 .NET 10 solution (DrMirror.slnx)
  src/DrMirror.Api/      Single ASP.NET Core 10 project, vertical slices under /Features
  tests/DrMirror.Tests/  xUnit
frontend/                Vite + React + TypeScript project
  public/fonts/          Self-hosted WOFF2 variable fonts
  src/                   App, providers, features, shared, locales, styles
PROJECT_MAP.md           Architecture map — single source of truth
DESIGN_PRINCIPLES.md     UI rulebook — read before any UI change
```

## Quick start

### Backend

```powershell
cd backend\src\DrMirror.Api
dotnet run
```

Health check: `http://localhost:5223/api/health`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173/` in `ar` + dark mode by default.

## Environment

Secrets are never committed. Configure via environment variables (see §7 of the architectural plan):

- `ConnectionStrings__Default` — MSSQL connection string
- `Jwt__Issuer`, `Jwt__Audience`, `Jwt__Secret`
- `Admin__SeedEmail`, `Admin__SeedPassword` (first boot only)
- `Cors__AllowedOrigins`
- `Auth__UseCrossSiteCookies` (set `true` in prod when SPA + API are on different origins)
- `Catalog__SeedSamples` (Development only — populates 5 apparel categories + 10 products + ~133 variants on first boot when `true`; default `true` in `appsettings.Development.json`)
- `FileStorage__Provider` — `local` (default, dev) writes payment-proof uploads to `wwwroot/uploads`; `cloudinary` streams uploads to Cloudinary.
- `FileStorage__CloudinaryCloudName`, `FileStorage__CloudinaryApiKey`, `FileStorage__CloudinaryApiSecret` — required when `FileStorage__Provider=cloudinary`.
- `Email__Provider` — `logonly` (default, dev) writes outbound emails to Serilog at info level; `mailkit` sends via SMTP.
- `Email__FromAddress`, `Email__FromName`, `Email__SmtpHost`, `Email__SmtpPort`, `Email__SmtpUseStartTls`, `Email__SmtpUsername`, `Email__SmtpPassword` — required when `Email__Provider=mailkit`.

### Dev secrets (user-secrets)

`Jwt__Secret` and `Admin__SeedPassword` are stored in [.NET user-secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) so they never enter source control:

```powershell
dotnet user-secrets set "Jwt:Secret" "<64+ char random>" --project backend/src/DrMirror.Api/DrMirror.Api.csproj
dotnet user-secrets set "Admin:SeedPassword" "<your-password>" --project backend/src/DrMirror.Api/DrMirror.Api.csproj
```

If `Admin:SeedPassword` is **not** set, the seeder generates a strong random password on first boot and logs it **once** at warning level. Save that output — it will never be displayed again.

### EF Core migrations

In Development, the API auto-applies pending migrations on startup. To work with migrations manually:

```powershell
# Add a migration after a model change
dotnet ef migrations add <Name> `
  --project backend/src/DrMirror.Api/DrMirror.Api.csproj `
  --startup-project backend/src/DrMirror.Api/DrMirror.Api.csproj `
  --output-dir Infrastructure/Persistence/Migrations

# Apply migrations to the configured DB
dotnet ef database update `
  --project backend/src/DrMirror.Api/DrMirror.Api.csproj `
  --startup-project backend/src/DrMirror.Api/DrMirror.Api.csproj
```

## Milestones

Execution follows a milestone-driven roadmap (M0 → M10). Each milestone has a single binary acceptance check; nothing is "done" until it passes. See the architectural plan for the full roadmap.

- **M0** — Frontend shell, RTL, dark/light theming, typography.
- **M1** — Auth & Identity (register / login / refresh / logout / me; JWT + rotating refresh cookie; seeded admin).
- **M2** — Public Catalog (browse + filter by category / gender / size / colour + product detail + variant picker). Domain locked to apparel only.
- **M3** — Cart, Checkout & Orders. Hybrid cart (localStorage guest cart + server-side authed cart with merge-on-sign-in), multi-step checkout, three seeded payment methods (COD, Instapay, Wallet), payment-proof upload with `IFileStorageService` abstraction (local in dev, Cloudinary in prod), order state machine with eight statuses, buyer cancel + admin transitions, admin queue at `/admin/orders` with proof Approve / Reject, Coravel-queued status emails behind `IEmailSender`.
- **M4+** — Admin catalog CRUD, address book, advanced order operations, inquiries, real-time review push, payments review polish, and beyond.
