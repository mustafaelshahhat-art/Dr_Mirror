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

## [DOMAIN]

**Dr. Mirror is a specialist store for medical scrubs and medical uniforms — apparel only.** Equipment, refurbished devices, spare parts, surplus inventory, and any other non-apparel commerce concepts are explicitly out of scope. All architecture, naming, copy, and SEO direction must align with apparel/fashion commerce.

Catalog axes:
- **Categories** — Scrub Tops, Scrub Pants, Lab Coats, Surgical Headwear, Medical Footwear (extensible).
- **Gender** — Men / Women / Unisex (kids deferred).
- **Variants** — every buyable SKU is a Size × Color permutation; stock and SKU codes live on the variant, not the parent product.
- **Material / fabric** — free-form composition string on the parent product.
- **Apparel galleries** — multiple images per product, optionally seeded per colour for colour-specific photography.

## [SYSTEM_FLOW]

Customer
  Browse (filter by category / gender / size / color) → Product (pick colour + size) → Cart
    (guest cart lives in localStorage; merges into server cart on sign-in)
  → Checkout (`/checkout` multi-step: address → payment → review, react-hook-form + zod)
    → choose Payment Method
        - COD          → Order (Confirmed)
        - Instapay/Wallet → Order (Pending) → buyer uploads proof → Order (PendingPaymentReview)
  → Order detail (`/account/orders/:orderNumber`) shows timeline, payment instructions,
    proof upload, status-aware cancel
  Inquiry (per product or general) → Admin inbox + email *(M4 scope)*

Admin
  Login → Dashboard (`/admin/orders`, behind <AdminRoute /> role gate)
    Catalog: Category CRUD, Product CRUD (master + variant matrix; Cloudinary upload) *(M4 scope)*
    Orders: queue filtered by status; transitions via OrderStateMachine; proof Approve / Reject
    Payments: seeded COD + Instapay + Wallet (admin CRUD lands in M4)
    Inquiries: inbox *(M4 scope)*
    Users: role management *(M4+ scope)*

Async
  Email sending → Coravel queue (`IQueue` + `IInvocable` jobs)
  Provider env-switched: `Email:Provider=logonly` (dev) | `mailkit` (prod)
  Order-status emails: `SendOrderConfirmationJob`, `SendPaymentReviewNeededJob`,
    `SendStatusChangedJob` — fired after every commit; carry the *event-time* status
    in the payload so a later transition doesn't overwrite the subject line.

File storage (payment proofs)
  Provider env-switched: `FileStorage:Provider=local` (dev) | `cloudinary` (prod)
  Local writes to `wwwroot/uploads/payment-proofs/<orderNumber>/<guid>.<ext>`;
  Cloudinary streams the upload and returns a CDN URL + public id.
  Extension is *always* derived from the validated content-type, never from
  the user-supplied filename.

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

- **HeroUI v3 / Tailwind v4** — `HeroUIProvider` does not exist in v3; use `RouterProvider` + `I18nProvider` from `@heroui/react` (both re-exported from React Aria Components). Button variants are `primary | secondary | tertiary | outline | ghost | danger | danger-soft`; the legacy `light` was renamed to `ghost`. HeroUI v3 `Button` does NOT accept `as`/polymorphism — use a styled `<Link>` for link-shaped buttons.
- **Identity bootstrap** — `AddIdentityCore<User>` is used (not `AddIdentity<,>`) so no Cookie auth handler is registered. JWT Bearer is the sole auth scheme, ensuring unauthenticated API requests return 401 (not a redirect to a non-existent `/Account/Login`).
- **Refresh token model** — Raw 256-bit token in httpOnly cookie at `Path=/api/auth`; SHA-256 hash persisted. Rotation on every use. Reuse of a revoked token triggers cascade revocation of all of the user's outstanding sessions (credential-theft heuristic).
- **Auto-migration** — `DatabaseSeeder` calls `MigrateAsync` on startup **only in Development**. Production migrations are a deployment step.
- **`[AsParameters]` is strict** — Minimal-API request-delegate factory treats every non-nullable property as required, even when the C# class declares a default. Make every optional query property nullable and resolve defaults via `Effective*` accessors in the request DTO.
- **Catalog localization model** — Bilingual columns (`NameAr`/`NameEn`, `DescriptionAr`/`DescriptionEn`) on a single `Product` row. Variants additionally carry `ColorName` + `ColorNameAr` so colour pickers render natively in both locales. No translations table. Frontend picks the locale via `useLocalizedField` / `useLocalizedDescription` with fallback to the other side if one is empty.
- **Slugs** — ASCII-only, lowercase-kebab, generated from `NameEn` via `Shared/Slugs/SlugGenerator`. Globally unique on `Product`/`Category`. Collisions resolved by appending `-2`/`-3`. URLs are stable when names change because slugs are stored separately.
- **Product image URLs (M2 dev only)** — `ProductImage.Url` carries an absolute HTTPS URL; M2 seeds `picsum.photos/seed/<slug>-<color>-<i>` placeholders so each colour variant gets a distinct gallery in dev. M4 swaps in real Cloudinary uploads (and adds `CloudinaryPublicId` non-breakingly).
- **Variant matrix** — `ProductVariant` is the buyable SKU. Stock and `Sku` live on the variant, never on Product. Unique on `(ProductId, Size, ColorName)` and on `Sku`. Variant SKU convention: `{ProductSku}-{Size}-{ColorSlug}` (e.g. `CHK-VST-001-M-NAVY`).
- **Catalog public visibility** — A product is public iff `IsPublished=true` AND `Category.IsActive=true`. Variant-level filters additionally require `IsActive=true AND Stock>0`. Filters applied at the LINQ level in every public catalog endpoint.
- **Currency display** — `1,250.00 ج.م` in `ar`, `EGP 1,250.00` in `en`. Western numerals only (`numberingSystem: 'latn'`). Centralized in `frontend/src/shared/lib/format.ts` — never inline-format prices in components.
- **HeroUI v3 picker accessibility** — colour and size pickers are RAC `radiogroup`s (one selectable role at a time, keyboard arrow-key navigation). Out-of-stock sizes stay rendered but disabled + line-through so the size system is always visible to the buyer.
- **Hybrid cart persistence** — guest cart lives in `localStorage` under `dr_mirror.guest_cart.v1`; server cart lives on `Cart`/`CartItem` keyed by `UserId`. On sign-in, `CartProvider` POSTs the localStorage cart to `/api/cart/merge` and clears localStorage. The merge endpoint dedupes duplicate variant ids in the request (summing quantities), drops disabled / out-of-stock variants, and removes existing lines whose variant has gone to zero stock.
- **Order state machine** — `OrderStateMachine` owns the only legal transitions. Lookup keyed by `(fromStatus, OrderActor)` where actor ∈ `{ Buyer, Admin, System }`. COD orders skip `Pending` (System → `Confirmed` at checkout); non-COD orders stay `Pending` until proof upload bumps them to `PendingPaymentReview`. Admin reject sends them back to `Pending` so the buyer can re-upload. `Delivered` and `Cancelled` are terminal. The DTO exposes both `allowedNextStatesForBuyer` and `allowedNextStatesForAdmin` so the SPA never needs to recompute the matrix.
- **Order numbers** — `DM-{YYYY}-{NNNNNN}`. `OrderNumberGenerator` reads/upserts a row in `OrderCounters` (`Year` is the PK, *non-IDENTITY* — `ValueGeneratedNever`). A static `SemaphoreSlim` serialises within a process. Counter increments are committed separately from the order itself; if order creation fails after the counter increment we tolerate the resulting gap rather than holding a lock. Multi-instance deployment would need to swap this for an MSSQL `SEQUENCE`.
- **Transactions vs. EF retry strategy** — `UseSqlServer(...).EnableRetryOnFailure()` forbids user-initiated `BeginTransaction`. All M3 mutations rely on the implicit transaction around a single `SaveChangesAsync` call; we accept a one-row gap in `OrderCounter` on the very rare path where order creation fails after the counter increment. Don't reintroduce `BeginTransactionAsync` without an `ExecutionStrategy.ExecuteAsync` wrapper.
- **Stock decrement on checkout** — variant stock is decremented in the same `SaveChangesAsync` that creates the order and clears the cart, so they're atomic. Cancel (buyer or admin) restocks. No row-level lock yet — two concurrent checkouts on the same variant can pass the stock check together; load-tested protection (`UPDLOCK`/rowversion + retry) is in the M4 backlog.
- **Snapshots vs. live joins on `Order`** — Item name / colour / SKU / size / unit price are **snapshotted** onto `OrderItem` so historical orders survive upstream catalog edits. Payment-method name + kind are snapshotted on `Order`; instructions + receiving account number are read **live** from the `PaymentMethod` navigation. Admin can therefore rotate an Instapay handle without rewriting history (trade-off documented; M4 may snapshot all fields if the buyer mix demands it).
- **File storage abstraction** — `IFileStorageService` with `LocalFileStorageService` (dev, writes to `wwwroot/uploads`) and `CloudinaryFileStorageService` (prod). Env-switched via `FileStorage:Provider`. The endpoint validates MIME against an image-only allow-list and enforces `MaxFileSizeBytes`; the storage layer **always** derives the on-disk extension from the validated content-type, never from `originalFileName`, to prevent footguns like `evil.php` being persisted with its original extension.
- **Email abstraction** — `IEmailSender` with `LogOnlyEmailSender` (dev) and `MailKitEmailSender` (prod). Env-switched via `Email:Provider`. Coravel `IQueue` queues `IInvocable` jobs that own their own scoped `AppDbContext`. The status-changed job carries an `OrderStatusChangedPayload(OrderId, EventStatus)` — never reads "current" status — so rapid transitions don't collapse multiple emails into the final-state subject.
- **Egyptian shipping address (M3 minimum)** — owned value object inlined on `Order` with columns `ShipRecipientName`, `ShipPhone`, `ShipGovernorate`, `ShipCity`, `ShipStreetAddress`, optional `ShipFloor`/`ShipApartment`/`ShipLandmark`/`ShipNotes`. Phone validated by a permissive regex (`^\+?\d[\d\s\-]{8,18}\d$`); governorate is free-text in M3 and will tighten to the 27-governorate enum in M4 once the admin UX lands. No multi-address book in V1.
- **Admin authorization on the SPA** — `AdminRoute` (sibling of `ProtectedRoute`) requires `user.roles.includes('Admin')`. Buyers without the role bounce to `/` rather than `/login` — they're authenticated, just not authorized. Mirrors the backend's `RequireRole(Admin)` on every `/api/admin/*` endpoint.
- **Multipart upload from Axios** — Axios v1 auto-emits `multipart/form-data; boundary=…` when a `FormData` body is detected, BUT only if no explicit `Content-Type` header is set. Setting it manually drops the boundary and breaks the server-side parser. Every multipart caller in this repo (currently `ordersApi.uploadPaymentProof`) lets Axios pick the header.
- **Static files for /uploads** — `app.UseStaticFiles()` mounted before auth middleware; the `LocalFileStorageService` provider creates `wwwroot/uploads` at boot. URLs include an unguessable GUID and are only emitted in order-detail responses (which already require auth + ownership / admin role), so the lack of additional auth on the file URL itself is acceptable for V1.

## [ORPHANS & PENDING]

(see architectural plan §8 — kept in sync each milestone)

### Resolved at M1
- Admin seed strategy → auto-generated random password on first boot when `Admin:SeedPassword` is unset; logged once at WARN.
- Buyer signup → confirmed immediately, no email verification (M1 decision; revisit in M3+ when SMTP lands).
- MSSQL → local SQL Server Express via Windows Integrated Auth (connection string in `appsettings.Development.json`).

### Resolved at M2
- **Domain pivot (locked at M2 close)** → equipment / refurbished / surplus / spare-parts framing **removed** in favour of medical scrubs & uniforms only. All naming, copy, and SEO follow apparel/fashion commerce.
- Currency display format → `1,250.00 ج.م` in ar / `EGP 1,250.00` in en, both with Western numerals + tabular-nums.
- Product localization → bilingual columns on a single row (`NameAr`/`NameEn`/`DescriptionAr`/`DescriptionEn`); no translations table.
- Dev image storage → `picsum.photos/seed/<slug>-<color>-<i>/...` URLs (colour-keyed) in seed data; M4 swaps in Cloudinary uploads.
- Slug strategy → ASCII lowercase-kebab from `NameEn`, dedup with numeric suffix, separate column from name.
- Category hierarchy → flat for now (no `ParentId`); add later non-breakingly if needed.
- Apparel categories (M2 baseline) → Scrub Tops, Scrub Pants, Lab Coats, Surgical Headwear, Medical Footwear.
- Apparel taxonomy → `ProductGender` enum (`Men=0 | Women=1 | Unisex=2`) on Product. No `Condition` field.
- Variant model → `ProductVariant(Id, ProductId, Size, ColorName, ColorNameAr, ColorHex, Sku, Stock, IsActive, …)` with unique constraint on `(ProductId, Size, ColorName)` and a unique `Sku`. **Stock lives on the variant, not on Product.**
- Sizes → free-form string column (max 16 chars). Apparel uses XS / S / M / L / XL / XXL / XXXL / OS; footwear uses EU numerics 36–46. Validation happens in the admin upload UI (M4), not at the schema level.
- Colours → English + Arabic display name + 7-char hex on each variant. No separate Colors table in V1.
- Material / fabric → free-form string on Product (max 200), e.g. `"65% polyester / 35% cotton"`.
- Catalog filters → `categoryId`, `q` (over name + brand + sku), `gender`, `size`, `color` (matched against either `ColorName` or `ColorNameAr` so the same query works in both locales), `minPrice`, `maxPrice`, `sort`.
- Catalog pagination → offset-based, default 24, max 60; envelope `{ items, page, pageSize, totalCount, totalPages }`.
- Catalog visibility filter → `IsPublished=true AND Category.IsActive=true` for all public reads. Variant-level filters additionally require `IsActive=true AND Stock>0`.
- Summary aggregates → `availableSizes`, `availableColors`, `totalStock` projected server-side from the variant matrix so cards render swatches + sold-out state without an extra round-trip.

### Resolved at M3
- **Cart persistence** → hybrid. Guest cart in `localStorage` (`dr_mirror.guest_cart.v1`), server cart on `Cart`/`CartItem` keyed by `UserId`. `CartProvider` auto-merges on sign-in via `/api/cart/merge`. Dedup on `(CartId, ProductVariantId)`.
- **Order number scheme** → `DM-{YYYY}-{NNNNNN}` (6-digit yearly counter, semaphore-serialised within process).
- **Order state machine** → 8 statuses (`Pending`, `Confirmed`, `PendingPaymentReview`, `Paid`, `Preparing`, `Shipped`, `Delivered`, `Cancelled`); transitions gated by `(from, actor)` matrix; `OrderStateMachine.Transition` is the only legal writer to `Order.Status`.
- **Address field set (M3 minimum)** → owned value object on `Order`. `RecipientName`, `Phone` (Egyptian regex), `Governorate` (free string in M3, enum in M4), `City`, `StreetAddress`, optional `Floor`/`Apartment`/`Landmark`/`Notes`. No multi-address book in V1.
- **Payment methods (seeded)** → COD, Instapay (`drmirror@instapay`), Wallet (`01001234567`). Admin CRUD UI lands M4; numbers are placeholders to be edited via the M4 admin tool.
- **Payment proof storage abstraction** → `IFileStorageService` with `LocalFileStorageService` (dev) + `CloudinaryFileStorageService` (prod). Env-switched via `FileStorage:Provider`. Image-only MIME allow-list. Extension *always* derived from content-type, never from filename.
- **Email abstraction + queue** → `IEmailSender` with `LogOnlyEmailSender` (dev) + `MailKitEmailSender` (prod). Env-switched via `Email:Provider`. Coravel `IQueue` + 3 `IInvocable` jobs (`SendOrderConfirmationJob`, `SendPaymentReviewNeededJob`, `SendStatusChangedJob`). Status job carries event-time status to avoid subject drift on rapid transitions.
- **Stock semantics** → decrement on order creation, restock on cancel (buyer- or admin-initiated). No row lock yet — see M4 backlog.
- **Admin role gate** → frontend `AdminRoute` (bounces unauthorised buyers to `/`), backend `RequireRole(Admin)` on every `/api/admin/*` endpoint.

### Still open (will be resolved per milestone)
- Concurrent-checkout stock-decrement race protection (`UPDLOCK` or rowversion retry) — M4 load-test follow-up
- Address book (multiple saved addresses per buyer + default-address picker) — M4
- Admin payment-method CRUD + product upload UI — M4
- Admin orders bulk operations + CSV export — M4
- Lock `Governorate` to the 27-Egyptian-governorate enum — M4
- Real-time push when admin reviews a proof (SignalR or polling) — M5+
- Inquiry slice (per-product + general) — M4
- Production domain + Cloudinary credentials + real SMTP secrets — M9
