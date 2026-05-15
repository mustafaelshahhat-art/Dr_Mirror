# Quickstart: Production-Ready E-Commerce Platform

**Feature**: 002-production-ecommerce-complete  
**Date**: 2026-05-15

---

## Prerequisites

- .NET 10 SDK
- Node 22+ / pnpm (or npm)
- SQL Server Express (local) with Windows Auth
- Git

---

## Backend Setup

```powershell
# 1. Set user-secrets for the API project
cd backend/src/DrMirror.Api

dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost\SQLEXPRESS;Database=DrMirror;Trusted_Connection=True;TrustServerCertificate=True;"
dotnet user-secrets set "Jwt:Secret" "your-local-dev-signing-secret-min-32-chars"
dotnet user-secrets set "Admin:SeedPassword" "Admin@123!"   # optional; auto-generated if omitted

# 2. Run (auto-migrates + seeds in Development)
dotnet run --project backend/src/DrMirror.Api/DrMirror.Api.csproj
# → listening on http://localhost:5223
```

On first boot, `DatabaseSeeder` runs migrations + seeds:
- 5 apparel categories (Scrub Tops, Scrub Pants, Lab Coats, Surgical Headwear, Medical Footwear)
- Sample products with colour variants and picsum.photos placeholder images
- 3 payment methods (COD, Instapay, Wallet)
- 1 admin user (`admin@drmirror.com` / seed password)

If `Admin:SeedPassword` is not set, the seeder generates a random password and logs it once at `WARN` level — capture it from the console.

---

## Frontend Setup

```powershell
cd frontend
npm install        # or pnpm install

npm run dev
# → http://localhost:5173 (proxies /api → http://localhost:5223)
```

The Vite dev server proxies all `/api/*` requests to the backend — no CORS configuration needed in development.

---

## Running Tests

```powershell
# All backend tests (212 total; 2 pre-existing failures under investigation)
dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj

# Security routing tests only
dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj --filter "FullyQualifiedName~AdminRoleRoutingTests"
```

The `WebApplicationFactory` sets `ConnectionStrings__Default` and `Jwt__Secret` as process environment variables and uses an in-memory database. No live SQL Server is required for tests.

---

## Key Development URLs

| URL | Description |
|---|---|
| `http://localhost:5173/` | Storefront (catalog, products, cart) |
| `http://localhost:5173/login` | Sign-in page |
| `http://localhost:5173/admin` | Admin dashboard (requires Admin role) |
| `http://localhost:5223/swagger` | Swagger UI (Development only) |

---

## Environment Variables (Production)

Set as environment variables on the IIS/MonsterASP host — never commit to repo:

```
ConnectionStrings__Default=Server=...
Jwt__Secret=<min 32-char random secret>
Admin__SeedPassword=<strong password>
Email__Provider=mailkit
Email__SmtpHost=...
Email__SmtpPort=587
Email__SmtpUser=...
Email__SmtpPassword=...
Email__FromAddress=noreply@drmirror.com
FileStorage__Provider=cloudinary
Cloudinary__CloudName=...
Cloudinary__ApiKey=...
Cloudinary__ApiSecret=...
```

---

## Useful Commands

```powershell
# Add EF Core migration
dotnet ef migrations add <MigrationName> \
  --project backend/src/DrMirror.Api \
  --startup-project backend/src/DrMirror.Api

# Apply migrations manually (production)
dotnet ef database update \
  --project backend/src/DrMirror.Api \
  --startup-project backend/src/DrMirror.Api

# Lint frontend
cd frontend && npm run lint

# Build frontend for production
cd frontend && npm run build
```

---

## Architecture Pointers

| Concern | Location |
|---|---|
| Backend vertical slices | `backend/src/DrMirror.Api/Features/<SliceName>/` |
| Domain entities | `backend/src/DrMirror.Api/Domain/Entities/` |
| EF Core config | `backend/src/DrMirror.Api/Infrastructure/Persistence/Config/` |
| Seeder | `backend/src/DrMirror.Api/Infrastructure/Persistence/DatabaseSeeder.cs` |
| Order state machine | `backend/src/DrMirror.Api/Domain/Orders/OrderStateMachine.cs` |
| Frontend features | `frontend/src/features/<sliceName>/` |
| Shared UI primitives | `frontend/src/shared/components/`, `frontend/src/shared/lib/` |
| Locale files | `frontend/src/locales/{ar,en}/<namespace>.json` |
| Route tree | `frontend/src/app/router.tsx` |
| Auth context | `frontend/src/features/auth/AuthProvider.tsx` |
| Cart context | `frontend/src/features/cart/CartProvider.tsx` |
