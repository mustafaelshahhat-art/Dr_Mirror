# Quickstart: Audit Fix Pass

**Branch**: `001-audit-fix-pass`

## Prerequisites

- .NET 10 SDK
- Node.js (see `frontend/.nvmrc`)
- SQL Server instance (local or Docker)

## Setup

```powershell
# Backend
dotnet restore backend/src/DrMirror.Api/DrMirror.Api.csproj

# Frontend
npm --prefix frontend install
```

## Verify Before Changes

```powershell
# Backend builds and tests pass
dotnet build backend/src/DrMirror.Api/DrMirror.Api.csproj
dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj

# Frontend builds and tests pass
npm --prefix frontend run build
npm --prefix frontend test
npm --prefix frontend run i18n:check
```

## Implementation Order

1. **Backend fixes** (F-001, F-002, F-003, F-004) — independent of each other
2. **Frontend form refactors** (F-005 + F-007) — each form is independent
3. **Cross-cutting** (F-008, F-009) — independent of above

## Verify After Changes

```powershell
# All backend tests still pass
dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj

# All frontend tests still pass
npm --prefix frontend test

# Frontend builds cleanly (TypeScript + Vite)
npm --prefix frontend run build

# i18n parity maintained
npm --prefix frontend run i18n:check

# Lint passes with new jsx-a11y rules
npm --prefix frontend run lint
```

## Manual Verification

- **F-001**: Start backend, `curl -I https://localhost:PORT/api/catalog/products` — verify `Cache-Control: public, max-age=60, stale-while-revalidate=300` and `Vary: Accept-Language` headers present.
- **F-005**: Open admin dashboard, try submitting each form with empty required fields — verify inline Zod error messages appear.
- **F-006**: Already resolved — Tab on any page to confirm skip-link visible.
