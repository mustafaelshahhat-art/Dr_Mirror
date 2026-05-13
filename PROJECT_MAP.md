# Dr_Mirror — PROJECT_MAP

> Single source of truth for tech, flow, architecture, and pending items.
> Updated at the end of every milestone.
> **UI work must also read `DESIGN_PRINCIPLES.md`** (sibling file at repo root) before touching components or layouts.

## [TECH_STACK]

Frontend
- React 19.2 (TypeScript 5.x / 6.x as installed)
- Vite 7+ (build & dev server)
- HeroUI (Tailwind v4 era) + Tailwind CSS 4 (darkMode: 'class')
- next-themes 0.4 (theme provider; defaultTheme="dark", enableSystem=false, storageKey="dr-mirror-theme")
- Self-hosted typography: Satoshi-Variable.woff2 (en) + Alexandria-Variable.woff2 (ar) in /public/fonts, preloaded, font-display: swap, no third-party font CDN
- Western numerals (0–9) across both locales; font-variant-numeric: tabular-nums on tables and dashboards
- React Router 7, TanStack Query 5
- react-hook-form + zod
- i18next + react-i18next (ar primary, en secondary, RTL-aware)
- axios (JWT interceptor + refresh)
- dayjs (with ar locale), lucide-react

Backend
- .NET 10 (LTS), ASP.NET Core 10 (Minimal APIs, vertical slices)
- EF Core 10 + SQL Server provider
- ASP.NET Identity + Microsoft.AspNetCore.Authentication.JwtBearer
- FluentValidation 11, Mapster
- Serilog (Async + File + Console + CorrelationId)
- MailKit 4 (SMTP)
- Coravel 6 (scheduled + queued jobs)
- CloudinaryDotNet

Data
- Microsoft SQL Server (MonsterASP.NET hosted)
- EF Core Migrations as the only schema-change mechanism

Hosting
- Frontend → Vercel (production + preview deploys)
- Backend → MonsterASP.NET (IIS / Windows)
- DB → MonsterASP.NET MSSQL

## [SYSTEM_FLOW]

Customer
  Browse → Product → Cart → Checkout
    → choose Payment Method
        - COD          → Order (Confirmed)
        - Instapay/Wallet → upload proof → Order (PendingPaymentReview)
  Inquiry (per product or general) → Admin inbox + email

Admin
  Login → Dashboard
    Catalog: Category CRUD, Product CRUD (Cloudinary upload)
    Orders: queue by status; transitions via OrderStateMachine
    Payments: CRUD payment methods (numbers, enabled flag)
    Inquiries: inbox
    Users: role management

Async
  Email sending → Coravel queue
  Order-status emails → triggered by state-machine on transition

## [ARCHITECTURE]

Backend
- Single project DrMirror.Api with vertical slices under /Features/*
- Domain entities under /Domain/Entities (one aggregate per file)
- Infrastructure adapters under /Infrastructure (Persistence, Identity, Storage, Email, Jobs)
- Shared cross-cutting under /Shared (Logging, Validation, Errors, Pagination)
- Single AppDbContext, IEntityTypeConfiguration per aggregate

Frontend
- Single Vite project with feature folders under /src/features mirroring backend slices
- Shared primitives under /src/shared
- Locales under /src/locales/{ar,en}/<namespace>.json
- Direction (rtl|ltr) and Theme (dark|light) are independent axes; both managed at HTML root
- Theme: next-themes ThemeProvider wraps HeroUIProvider; dark forced on first visit; user choice persisted in localStorage('dr-mirror-theme')
- Anti-FOUC inline script in index.html applies the theme class before React mounts
- ThemeToggle + LangSwitcher both live in the global Header; HeroUI's built-in light/dark palettes used as-is (no custom tokens in V1)
- Typography: CSS variables --font-en (Satoshi-first) and --font-ar (Alexandria-first); both stacks include both families for mixed-script fallback; html[lang] selects the primary; weights 400/500/600/700; no custom type scale

State
- Server state: React Query
- Form state: react-hook-form
- Auth state: in-memory + httpOnly-style storage decision recorded in shared/lib/auth-storage.ts

Security
- JWT access 15 min, refresh 14 days, rotation on use, hashed at rest
- Role-based authorization, resource ownership checks on /me endpoints
- ProblemDetails error contract
- File upload MIME & size validation before Cloudinary stream

## [DESIGN]

- See sibling `DESIGN_PRINCIPLES.md` (repo root) — required reading before any UI work or modification
- Quality bar: Linear / Vercel / Stripe / Notion (borrow discipline, not layouts)
- Hard rules: nested cards ≤ 2; ≤ 3 font weights per page; logical CSS only (no `left/right`); one accent hue per page; no glows / autoplay / parallax / glassmorphism; `prefers-reduced-motion` respected; numerics use `tabular-nums`
- 4-state matrix verified per page: (dark|light) × (rtl|ltr)

## [ARCHITECTURE NOTES]

- **HeroUI v3 / Tailwind v4** — `HeroUIProvider` does not exist in v3; use `RouterProvider` + `I18nProvider` from `@heroui/react` (both re-exported from React Aria Components). Button variants are `primary | secondary | tertiary | outline | ghost | danger | danger-soft`; the legacy `light` was renamed to `ghost`.
- **Identity bootstrap** — `AddIdentityCore<User>` is used (not `AddIdentity<,>`) so no Cookie auth handler is registered. JWT Bearer is the sole auth scheme, ensuring unauthenticated API requests return 401 (not a redirect to a non-existent `/Account/Login`).
- **Refresh token model** — Raw 256-bit token in httpOnly cookie at `Path=/api/auth`; SHA-256 hash persisted. Rotation on every use. Reuse of a revoked token triggers cascade revocation of all of the user's outstanding sessions (credential-theft heuristic).
- **Auto-migration** — `DatabaseSeeder` calls `MigrateAsync` on startup **only in Development**. Production migrations are a deployment step.

## [ORPHANS & PENDING]

(see architectural plan §8 — kept in sync each milestone)

### Resolved at M1
- Admin seed strategy → auto-generated random password on first boot when `Admin:SeedPassword` is unset; logged once at WARN.
- Buyer signup → confirmed immediately, no email verification (M1 decision; revisit in M3+ when SMTP lands).
- MSSQL → local SQL Server Express via Windows Integrated Auth (connection string in `appsettings.Development.json`).

### Still open (will be resolved per milestone)
- Currency display format (LE prefix vs ج.م suffix) — M2
- Order number scheme — M3
- Address field set per Egyptian market — M4
- SMTP provider — M3
- Production domain + Cloudinary credentials — M9
