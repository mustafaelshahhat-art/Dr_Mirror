# Feature Specification: Full-Stack Production Reality Hardening

**Feature Branch**: `003-production-reality-hardening`

**Created**: 2026-05-17

**Status**: Draft

**Input**: User description: "Read DR_MIRROR_FULL_STACK_SPECIFY.md completely and use it as the full source of requirements for this specification. Before writing the final spec, inspect the existing Dr Mirror repository carefully and compare the current implementation against every production layer in the file. Generate complete Spec Kit specification for fixing, completing, and hardening the whole project as a real production full-stack e-commerce application. Preserve anything already correct, improve anything weak or incomplete, add anything missing, and identify any bugs, gaps, or inconsistencies across frontend, backend, database, auth, security, deployment, observability, scaling, and recovery."

---

## Problem Statement

Dr Mirror is an Arabic-first Egyptian medical apparel e-commerce store with a working end-to-end customer flow (browse → cart → checkout → payment proof → tracked order lifecycle) and an admin operations console. The architecture is sound (vertical-slice Minimal APIs, EF Core/SQL Server, ASP.NET Identity + JWT, React 19 SPA, durable email outbox, private payment-proof storage, named rate-limit policies, ProblemDetails errors, structured Serilog logging, i18n parity tooling, RTL/LTR × dark/light parity, Cloudinary/local storage switching). However, the project is not yet *production-real*. It contains inconsistencies, gaps, and fragile edges that would surface under real Egyptian-market traffic — particularly around access-boundary enforcement, concurrency safety on checkout/stock, deployment hardening, observability beyond local logs, recovery runbooks, and CI/CD that protects shipped behavior. There is no `.github/workflows/` directory; the only documented health endpoint returns a static "ok"; production error tracking, backup/restore procedure, and operational runbook are not in the repository.

The goal of this feature is to bring the **entire project** — frontend, backend, database, auth, storage, hosting, deployment, observability, scaling, and recovery — to a state where Dr Mirror can be deployed and operated as a real production e-commerce platform serving Egyptian buyers and admin operators, without changing the existing business behavior, without replacing the architecture, and without weakening any safety property already in place.

## Clarifications

### Session 2026-05-17

- Q: Payment-proof upload size cap and accepted file types? → A: 5 MB cap, JPEG/PNG/PDF only.
- Q: Catalog browse performance target? → A: p95 ≤ 500 ms server response time for catalog list and product detail, measured warm-cache on the current MonsterASP.NET-class single-instance setup. Strict enough to catch missing indexes, bad pagination, over-fetching, and inefficient product/category queries without needing Redis or enterprise cache infrastructure.
- Q: Uptime SLO target for v1? → A: **99.5% monthly** (≈3.6 h/month allowed downtime). Realistic for the MonsterASP.NET-class single-instance backend, aligned with RPO ≤ 1 h / RTO ≤ 2 h, and strong enough to require proper health checks, monitoring, runbooks, and rollback procedures without forcing premature HA infrastructure.
- Q: PII and order data retention policy? → A: Orders and buyer addresses retained indefinitely; buyers can delete inactive addresses anytime; payment-proof files automatically purged 2 years after order completion. Preserves order history, accounting, and dispute resolution while reducing long-tail exposure of sensitive bank-receipt and wallet-screenshot images.
- Q: Admin audit-log retention? → A: Retain indefinitely. Audit logs are low-volume, high-value for dispute resolution, incident investigation, and admin accountability. Entries MUST store only safe metadata: actor ID, action type, target ID, timestamps, previous/new status where applicable, correlation/request ID — and MUST NOT store file contents, secrets, passwords, tokens, or raw sensitive payloads.

## Goals

- **G-1**: Every existing correct behavior is preserved bit-for-bit; nothing working today regresses.
- **G-2**: Every weak, inconsistent, or fragile area identified by repository inspection is hardened to a documented, testable production standard.
- **G-3**: Every layer required for a real production full-stack application that is absent today is added with concrete acceptance criteria.
- **G-4**: Arabic RTL stays the primary experience and reaches full key, layout, and behavior parity with English across both customer and admin surfaces.
- **G-5**: Security and access-boundary properties (admin/customer/guest isolation, ownership scoping, private payment-proof access, disabled-user token rejection) are enforced on the backend with integration tests, not only in the UI.
- **G-6**: A deployable, repeatable production setup exists for the documented hosting target (frontend on Vercel-class static host, backend on MonsterASP.NET-class ASP.NET host, SQL Server database, Cloudinary or equivalent media storage, SMTP for email).
- **G-7**: A minimum production runbook and operational observability surface make routine failures (API down, DB unavailable, storage failure, SMTP failure, deploy regression, admin lockout) recoverable.
- **G-8**: CI enforces build, test, type-check, lint, and i18n parity on every pull request without requiring production secrets.

## Non-Goals

- **NG-1**: Adding a payment gateway integration beyond the three already supported flows (Cash on Delivery, Instapay proof upload, mobile wallet proof upload). Egyptian-market payment behavior stays as-is.
- **NG-2**: Replacing the architecture (no Next.js, no NestJS, no microservices, no MongoDB, no Redis-only session store) or swapping the UI library (HeroUI v3 stays).
- **NG-3**: Introducing horizontal autoscaling infrastructure; the spec only ensures the codebase does not *block* future horizontal scaling.
- **NG-4**: Building a mobile app, native or hybrid. Mobile web parity is in scope; native is not.
- **NG-5**: Adding a new customer-facing feature (wishlist, reviews, recommendations, loyalty, returns portal). Catalog scope remains medical apparel only.
- **NG-6**: Reskinning or rebranding. Premium-restrained Arabic-first dark-first aesthetic stays.
- **NG-7**: Changing the eight-state order lifecycle, the COD/Instapay/Wallet proof rules, or the proof approve/reject admin flow.
- **NG-8**: SSR/SSG of the storefront. The SPA hosting model stays.

## Current-State Assumptions Discovered from the Repository

These are observed facts from inspecting the repo on `main` (commit `8f7b5ef`) and are treated as the baseline this feature builds on:

- **CS-1 — Backend stack**: .NET 10 ASP.NET Core Minimal APIs organized as vertical slices under `Features/{Addresses, Admin, AppConfig, Auth, Cart, Catalog, Checkout, Inquiries, Orders}`. EF Core on SQL Server with retry-on-failure. JWT-only auth (Identity Core, no cookie scheme). ProblemDetails registered. CorrelationId-enriched Serilog with rolling 50 MB / 30-day file sink. Named rate-limit policies registered. FluentValidation discovered from the API assembly. CORS allowlist validated to be non-empty in Production at startup.
- **CS-2 — Domain entities present**: `User, RefreshToken, BuyerAddress, ShippingAddress, Cart, CartItem, Category, Product, ProductImage, ProductVariant, Order, OrderItem, OrderCounter, PaymentMethod, PaymentProof, Inquiry, EmailOutboxMessage`.
- **CS-3 — Migrations through M8**: Initial Identity → Catalog → Scrubs refocus → Cart → Orders → Payment Proofs → Admin Catalog → Address book + concurrency → Sync model → Address default constraint → Email outbox → Inquiry responded audit → **M8 EmailOutboxLease (lease-based outbox claim for multi-instance safety)**.
- **CS-4 — Storage**: `IFileStorageService` with `LocalFileStorageService` and `CloudinaryFileStorageService`; provider switched by `FileStorage__Provider` env var. Payment-proof requests under `/uploads/payment-proofs` are short-circuited to 401 before static-file middleware; product images are served from `wwwroot/uploads` (local) or Cloudinary CDN.
- **CS-5 — Email**: `IEmailSender` with `LogOnlyEmailSender` (dev) and `MailKitEmailSender` (prod). Durable outbox via `EmailOutboxMessage` + `EmailOutboxProcessor` background service + lease-based claim.
- **CS-6 — Frontend stack**: React 19, TypeScript, Vite, HeroUI v3, Tailwind v4, i18next, React Query, React Router. RTL/LTR × dark/light parity asserted as a design principle in `PRODUCT.md`. Locales `ar/` and `en/` both contain the same 11 namespaces. `npm run i18n:check` enforces key parity.
- **CS-7 — Frontend areas**: `features/{addresses, admin, auth, cart, catalog, checkout, inquiries, orders}`. Shared infrastructure: `ErrorBoundary`, `ForbiddenBanner` driven by `forbidden-store`, `QueryErrorState`, `Skeleton`, `PaginationControls`, `Header/Layout/ShellPage`, `LangSwitcher`, `ThemeToggle`, `api-client` with auth storage.
- **CS-8 — Tests present** (`backend/tests/DrMirror.Tests`): Addresses, Admin, AppConfig, Cart, Catalog, Checkout, Email, Identity, Infrastructure, Inquiries, Options, Orders, Pagination, RateLimit, Security, Seeding, Storage. SQL Server integration tests are opt-in via `DRMIRROR_TEST_SQL_CONNECTION`.
- **CS-9 — Gaps observed in repo**:
  - **No `.github/workflows/`** directory exists — CI/CD is not in the repository.
  - **No `docs/PROJECT_MAP.md`** despite README pointing at it; only `docs/REDESIGN_AUDIT.md` exists.
  - **Health endpoint `/api/health`** returns static `{ status: "ok" }` and does not verify database connectivity, storage provider readiness, or email outbox health.
  - **Frontend error tracking** has an in-app `ErrorBoundary` but no external sink configured.
  - **Backup / restore / disaster-recovery procedure** is not documented in repo.
  - **Operational runbook** for the failure scenarios listed in the input prompt is not present.
  - **Frontend deployment** instructions in `README.md` exist but no Vercel project configuration file is checked in.
- **CS-10 — Prior hardening already landed** (from memory and migrations): startup validation, seeder hardening, last-admin guard, address default constraint (M5), payment-proof private file enforcement, stale-proof guard, cancellation reason fix, checkout address/governorate fix, cart merge recovery, email outbox lease (M8).
- **CS-11 — Business behavior to preserve**: Eight-state order lifecycle `Pending → Confirmed | PendingPaymentReview → Paid → Preparing → Shipped → Delivered`, with `Cancelled` terminal. COD orders require no payment proof; Instapay/Wallet orders require proof; proof approve/reject is admin-only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Production-Safe Access Boundaries (Priority: P1)

Every record, file, and admin action in Dr Mirror is reachable only by the actor entitled to it: a buyer sees only their own orders, addresses, and payment proofs; an admin sees the operational queue and never has their token re-used after being disabled; a public visitor can read the catalog and submit an inquiry but cannot touch anything authenticated; payment-proof files are only ever streamed through an authenticated, ownership-checked endpoint and never via static-file middleware.

**Why this priority**: Access-boundary leaks (cross-customer order access, role escalation, public payment-proof exposure, disabled-user token reuse) are the single highest-blast-radius class of production failure for an e-commerce store handling financial proofs and personal addresses. Without this, nothing else ships safely.

**Independent Test**: Run the backend test suite extended with new ownership-and-boundary integration tests. Cross-actor scenarios (buyer A reading buyer B's order, anonymous reading payment-proof URL, disabled user retrying with old access token, admin endpoint hit with buyer JWT, role-escalation attempt through profile-edit) must each return the documented status code without exposing private fields. Passing this suite is a sufficient demonstration that the boundary layer is production-safe.

**Acceptance Scenarios**:

1. **Given** buyer A is signed in and owns order `DRM-1001`, **When** buyer A requests order `DRM-1002` belonging to buyer B by guessing the order number, **Then** the API returns a 404-style ProblemDetails (no leak of existence) and no order fields appear in the response body.
2. **Given** a payment-proof file URL is known by direct path under `/uploads/payment-proofs/...`, **When** an unauthenticated client requests it, **Then** static-file middleware does not serve it and the response is 401 ProblemDetails.
3. **Given** a payment-proof file is referenced by id, **When** a buyer who does not own the parent order requests `/api/orders/{orderNumber}/proof/{proofId}/file`, **Then** the API returns 404 ProblemDetails without revealing whether the proof exists.
4. **Given** a user account is disabled by an admin, **When** the user retries with their previously-issued access token, **Then** the next protected request is rejected and the refresh token cannot mint a new access token.
5. **Given** a buyer JWT is presented to any `/api/admin/...` endpoint, **Then** the request is rejected by backend role enforcement (not only by the frontend route guard) and ProblemDetails is returned without stack trace or implementation hints.
6. **Given** a buyer submits a profile-update request carrying `roles: ["Admin"]` or any admin-only field, **Then** the field is ignored on the server and the response confirms only allowed fields changed.

---

### User Story 2 — Reliable Checkout & Inventory Under Pressure (Priority: P1)

Two buyers checking out the last unit of the same Size × Colour variant at the same moment never both succeed; a buyer who double-submits checkout never gets two orders; payment proofs never collide with stale order state; an admin updating stock during a customer's checkout never lets the order oversell; EGP money values never lose precision in any path.

**Why this priority**: A store that oversells, double-charges, or rounds EGP wrongly burns customer trust on the first incident. Concurrency and money correctness are the second-highest-blast-radius class after access boundaries.

**Independent Test**: Run a concurrency-focused integration test suite that exercises (a) parallel checkout for a 1-stock variant, (b) double-submit of the same cart, (c) admin stock decrement racing with a buyer checkout, (d) repeated payment-proof upload for the same order, and (e) money-field round-trip through DB → API → SPA → DB. All scenarios must converge on a single deterministic outcome with no oversell, no duplicate orders, and no EGP drift.

**Acceptance Scenarios**:

1. **Given** a variant with stock = 1 and two buyers both holding it in their cart, **When** they both submit checkout within milliseconds of each other, **Then** exactly one order is created with the unit and the other receives a localized out-of-stock ProblemDetails.
2. **Given** a buyer clicks "Place order" twice in rapid succession, **When** both requests arrive at the server, **Then** the second is rejected or coalesced and the database holds exactly one order.
3. **Given** an Instapay order with proof already uploaded and awaiting admin review, **When** the buyer attempts to upload a new proof, **Then** the system applies the documented stale-proof guard and the admin reviews exactly one canonical proof.
4. **Given** an admin reduces a variant's stock to zero while a buyer's checkout is mid-flight, **Then** the checkout either completes against the reserved quantity or fails cleanly with localized stock error — never both completing and overselling.
5. **Given** a price of `1234.56 EGP`, **When** it round-trips through order creation, persistence, retrieval, and SPA display, **Then** the value is identical and never represented as `1234.5599...`.
6. **Given** the order counter is incremented concurrently across many orders, **Then** every order number is unique and gaps (if any) do not break customer order-lookup.

---

### User Story 3 — Production-Real Deployment & Configuration (Priority: P1)

A new operator can deploy Dr Mirror from a clean clone to a real production environment by following a single documented path: configure environment variables → run migrations → build frontend → deploy. Misconfiguration is caught at startup with a clear message, not at the first failing request. Secrets never enter the repository. Frontend and backend deploy independently and CORS, JWT, file-storage, and email providers all light up correctly.

**Why this priority**: A deploy path that only the original author can execute is not production. The current README is good but assumes implicit knowledge; production readiness requires reproducibility for a second operator.

**Independent Test**: A new operator, starting from the README plus the production deployment section, can stand up a working environment (database, backend, frontend) and pass a documented smoke check (health endpoint reports healthy, admin login works, public catalog renders in Arabic, an order can be placed end-to-end). Missing or wrong critical env vars cause the backend to refuse to start with a precise error.

**Acceptance Scenarios**:

1. **Given** `Cors__AllowedOrigins` is empty in Production, **When** the backend starts, **Then** it refuses to start with a precise message naming the missing variable (current behavior — preserved and extended).
2. **Given** `Jwt__Secret` is missing or shorter than the documented minimum length, **When** the backend starts, **Then** it refuses to start with a precise message.
3. **Given** `FileStorage__Provider=cloudinary` is set but Cloudinary credentials are missing, **When** the backend starts in Production, **Then** it refuses to start with a precise message naming the missing credentials.
4. **Given** `Email__Provider=mailkit` is set but SMTP settings are incomplete, **When** the backend starts in Production, **Then** it refuses to start with a precise message naming the missing settings.
5. **Given** a fresh database, **When** the documented migration step runs, **Then** schema is created idempotently and seeded data (categories, payment methods, admin account) is present without duplicates.
6. **Given** `VITE_API_BASE_URL` is set to the production API root, **When** the SPA build is deployed to the static host, **Then** all API calls reach the backend with correct CORS, correct cookie behavior (if cross-site refresh cookies are enabled), and no `localhost` references.
7. **Given** the production environment is reached, **When** any unhandled exception or validation failure occurs, **Then** the response is ProblemDetails with no stack trace and no implementation-internal field names.

---

### User Story 4 — Observability, Recovery & Operational Runbook (Priority: P2)

When something fails in production — API down, database unreachable, Cloudinary outage, SMTP outage, deploy regression, admin locked out — an operator can diagnose the cause from the logs and known dashboards, recover from a backup, and follow a documented runbook step-by-step. Background services degrade visibly rather than silently. Frontend errors are captured. Customer-facing errors are calm, localized, and non-technical.

**Why this priority**: A working system that nobody can debug is one outage away from being unrecoverable. Observability and runbook coverage convert "the app is broken" into "the app is broken at step N — here is what to do."

**Independent Test**: Simulate each runbook scenario in a staging environment and confirm the documented steps recover service. Confirm that (a) backend logs include correlation IDs, (b) outbox failures and external-service failures surface in logs at a meaningful level, (c) frontend errors are routed to a configured sink, (d) database backup can be restored to a parallel instance and the app boots against it, (e) an admin lockout can be recovered via the documented out-of-band path.

**Acceptance Scenarios**:

1. **Given** SQL Server is unreachable, **When** the health endpoint is queried, **Then** it reports `unhealthy` with the database check failing and the API does not pretend to be ready.
2. **Given** Cloudinary returns 5xx for an upload, **When** an admin uploads a product image, **Then** the failure is logged with context, the admin sees a localized error, and the app continues to serve cached/already-uploaded images.
3. **Given** the SMTP host is down, **When** a status email is enqueued, **Then** the outbox retains it, retries with bounded backoff, and surfaces persistent failure in logs at warning/error level without crashing the host.
4. **Given** the frontend throws an unhandled error, **Then** the configured error tracking provider receives it and the user sees a calm localized fallback (not a blank screen).
5. **Given** a deploy regresses, **Then** the runbook documents the rollback path for both frontend (static host re-promote previous build) and backend (re-deploy previous artifact + verify migrations did not advance destructively).
6. **Given** the seeded admin account is locked out, **Then** the runbook documents the recovery path (e.g., temporary `Admin__SeedEmail/Admin__SeedPassword` re-bootstrap) and the path does not require database surgery.
7. **Given** a customer hits an error response, **Then** the message they see is localized to the active locale and free of technical jargon, stack frames, or English-only fallbacks in Arabic mode.

---

### User Story 5 — UX, i18n & Accessibility Parity Across Both Surfaces (Priority: P2)

Every buyer-facing and admin-facing screen ships in four states — (dark, RTL), (dark, LTR), (light, RTL), (light, LTR) — with full key parity, no hardcoded strings, RTL-safe layout for navigation/drawers/dropdowns/tables/forms/modals/empty/pagination/breadcrumbs/action menus, and HeroUI-first accessible components. Admin surfaces and storefront surfaces remain visually and behaviorally separate; an admin is never silently dropped into the buyer storefront, and buyers never see admin-only affordances. Loading uses skeletons; errors are calm; empty states are designed; forms have localized validation, keyboard support, and duplicate-submit protection.

**Why this priority**: This is what makes Dr Mirror feel like a *real* Egyptian premium medical-apparel store rather than a translated template. It is high impact for both conversion and operator efficiency, but only after security/correctness/deployment are in place — hence P2.

**Independent Test**: A reviewer walks each customer journey (browse → product → cart → checkout → proof → track) and each admin journey (proof queue → order detail → product CRUD → category CRUD → inquiries → users) in all four (theme × direction) states, with `i18n:check` passing and with screen-reader/keyboard navigation working on every interactive element.

**Acceptance Scenarios**:

1. **Given** any page in the SPA, **When** the locale is switched between Arabic and English, **Then** every visible string changes and no English string leaks into Arabic mode (and vice versa).
2. **Given** any RTL page with navigation, drawers, dropdowns, tables, modals, breadcrumbs, or pagination, **Then** layout direction, focus order, icon mirroring (directional only), and tabular numerics behave correctly in RTL.
3. **Given** any submit button on any form (login, register, address, checkout, proof upload, admin CRUD), **When** the user clicks it twice quickly, **Then** the second click is suppressed or the request is idempotent.
4. **Given** an admin signs in, **When** the post-login redirect resolves, **Then** the admin lands on the admin hub and is never silently routed into the public storefront experience.
5. **Given** a buyer signs in, **When** the post-login redirect resolves, **Then** no admin-only navigation, action, or affordance is visible anywhere.
6. **Given** a list page has zero results, **Then** an intentional empty state is shown — not a blank panel and not a spinner that never resolves.
7. **Given** a list page is loading initial data, **Then** a skeleton appropriate to the layout is shown, not a generic centered spinner.
8. **Given** a query fails, **Then** an inline error state with a retry affordance is shown, localized, and not a raw exception message.
9. **Given** a product detail page, **Then** images use the documented aspect ratio, alt text, lazy loading, and graceful fallback for missing images.
10. **Given** checkout is on an Instapay/Wallet method, **Then** the UI communicates the proof-upload requirement before submit; on COD it explicitly does not.

---

### User Story 6 — CI, Caching, Scaling Readiness & Performance Hygiene (Priority: P3)

Every pull request runs backend build/test, frontend build/test, TypeScript compile, lint where rules exist, and i18n parity in CI without production secrets. The backend remains stateless except for SQL Server and external storage so future horizontal scaling is not blocked. The email outbox lease prevents duplicate sends across instances. Catalog reads cache safely; cart/auth/admin/order data never cache unsafely. Lists paginate, slow queries are indexed, and product/category images use CDN delivery with production cache headers. Caching and CDN behavior do not leak locale or theme across requests.

**Why this priority**: Necessary to operate the project at scale and to prevent silent regressions, but lower blast radius than security/correctness/deployment/UX.

**Independent Test**: A pull request opened against `main` must trigger CI; CI must pass on a clean tree and fail on a deliberate regression (broken test, missing translation key, type error, lint violation where rules apply). A load-style integration scenario must demonstrate that the API serves catalog pages with safe caching headers and does not over-cache admin or order data, and that the outbox does not double-send when the lease is contended.

**Acceptance Scenarios**:

1. **Given** a pull request opens against `main`, **Then** CI runs: backend `dotnet restore/build/test`, frontend `npm ci`/`npm run build`/`npm test`, TypeScript compile, lint (where configured), and `npm run i18n:check`.
2. **Given** CI runs, **Then** no production secret is required; SQL Server integration tests run only when an opt-in connection string is provided as an org/repo secret.
3. **Given** two backend instances are running, **When** outbox messages exist, **Then** each message is dispatched exactly once thanks to lease-based claim (preserved from M8).
4. **Given** catalog read endpoints are queried, **Then** safe response cache headers are present where appropriate; cart, checkout, auth, admin, order status, and payment-proof endpoints never carry cacheable headers.
5. **Given** admin product/category/image edits occur, **Then** SPA client-side caches and any CDN caches are invalidated for the affected entries.
6. **Given** admin list pages (orders, products, users, inquiries), **Then** results paginate, indexes back the common sort/filter columns, and lists remain usable at realistic catalog/order volumes.
7. **Given** product images, **Then** they are served from CDN with production cache headers and lazy-loaded in the SPA.

---

### Edge Cases

- **Disabled-user race**: a user is disabled while holding a still-valid access token mid-request. Outcome: the in-flight request completes if already authorized, but the next request and any refresh attempt are rejected.
- **Cross-site cookie behavior**: when `Auth__UseCrossSiteCookies=true`, refresh-token cookies must work across origins in production (Vercel SPA + MonsterASP.NET API) without losing CSRF protection.
- **Cart merge on login**: an authenticated user with an existing server cart signs in from a device that has a guest cart. Outcome: deterministic merge per existing behavior, with no item duplication and no silent quantity loss (Phase 2 cart-merge recovery preserved).
- **Last admin guard**: an admin attempts to disable, demote, or delete the last remaining admin. Outcome: rejected with a localized error.
- **Stale proof guard**: an order in `PendingPaymentReview` already has a proof; the buyer attempts to upload another. Outcome: documented guard fires; admin queue is not double-counted.
- **COD vs Instapay path mismatch**: a buyer submits a checkout with `paymentMethod=COD` but a proof attached, or `paymentMethod=Instapay` with no proof. Outcome: server enforces correct rule regardless of frontend state.
- **Cancellation reason fix**: order cancellation persists the reason field correctly (Phase 2 fix preserved).
- **Address default constraint**: M5 partial-unique-index ensures at most one default address per user; UI never lets the user end in zero defaults silently.
- **Payment-proof file directly requested via static path**: blocked at middleware before static-files (preserved).
- **Inquiries spam**: a public submitter floods the inquiry form. Outcome: rate-limited by the configured policy with ProblemDetails-shaped 429 and `Retry-After`.
- **Outbox duplicate sends across instances**: prevented by M8 lease; verified by a multi-instance test or a contention-style unit test.
- **Concurrent stock decrement**: two checkouts vs. one unit — exactly one succeeds.
- **Order number guess**: a customer trying random order numbers cannot enumerate other customers' orders.
- **Locale/theme cross-contamination via cache**: response/CDN cache keys must not strip the locale or theme such that one user's Arabic page is served to another expecting English.
- **Browser back after order placed**: re-submit must not create a duplicate order; idempotency on order creation is observable.
- **Empty CORS origins in production**: app refuses to start (preserved).
- **`Admin__SeedPassword` not set**: seeder generates and logs a strong random password once at warning level (preserved).
- **Local file storage on a host without persistence**: spec must warn and the deployment runbook must require Cloudinary (or equivalent) for any private asset in production.
- **Network slowness**: SPA shows skeletons and never a permanently-spinning page.

## Requirements *(mandatory)*

### Functional Requirements — Layer 1: Frontend

- **FR-F1**: The SPA MUST default to Arabic (RTL) and offer a persisted toggle to English (LTR); persisted theme (dark default) MUST behave the same way.
- **FR-F2**: Every user-visible string MUST come from the i18n key system; `npm run i18n:check` MUST pass with zero missing or orphan keys across the 11 documented namespaces.
- **FR-F3**: RTL-safe layout MUST be verified for navigation, drawers, dropdowns, tables, forms, modals, empty states, pagination, breadcrumbs, and action menus on both customer and admin surfaces.
- **FR-F4**: Layouts MUST be responsive at the following Tailwind-default breakpoints with no horizontal overflow at any of them: **`sm` 640 px, `md` 768 px, `lg` 1024 px, `xl` 1280 px, `2xl` 1536 px**. Mobile-first base styles (< 640 px) MUST also work. The five breakpoints MUST be re-enumerated in `docs/PROJECT_MAP.md` as the canonical reference.
- **FR-F5**: Both dark and light themes MUST achieve WCAG 2.1 AA contrast for body and secondary text and MUST render all 11 namespaces correctly in both locales.
- **FR-F6**: Buyer pages MUST NOT expose admin-only affordances; admin pages MUST be visually and functionally isolated from the storefront.
- **FR-F7**: Admin users MUST be routed to the admin hub on sign-in; buyers MUST be routed to the storefront or the page they came from. Neither audience MUST be silently dropped into the other surface.
- **FR-F8**: Forms (login, register, address, checkout, proof upload, admin CRUD, inquiries) MUST localize validation messages, support keyboard navigation, manage focus on submit/error, and prevent duplicate submission.
- **FR-F9**: Product images MUST use a consistent aspect ratio, alt text, lazy loading, and a graceful fallback for missing images.
- **FR-F10**: Checkout MUST communicate the payment rule for each method (COD = no proof, Instapay/Wallet = proof required) before the buyer submits.
- **FR-F11**: List loading MUST use layout-appropriate skeletons; queries that fail MUST show inline localized error states with a retry affordance.
- **FR-F12**: HeroUI components MUST be used in place of raw controls when a HeroUI equivalent exists; no second UI system MUST be introduced.

### Functional Requirements — Layer 2: APIs & Backend Logic

- **FR-A1**: Every endpoint MUST belong to a vertical feature slice with explicit ownership, validation, authorization policy, and at least one integration test.
- **FR-A2**: Every error response MUST conform to RFC 7807 ProblemDetails, including a `traceId` extension (preserved).
- **FR-A3**: Backend MUST NOT trust frontend-only validation; server-side validation MUST exist for every mutation endpoint.
- **FR-A4**: Checkout endpoint MUST enforce: COD requires no proof; Instapay/Wallet require proof; proof approve/reject is admin-only; order lifecycle transitions are valid moves from the current state.
- **FR-A5**: Inventory and variant stock mutations MUST be concurrency-safe (row-level concurrency token or equivalent), and a parallel-checkout test MUST demonstrate no oversell.
- **FR-A6**: Order creation MUST be idempotent against double-submit (cart-id or client-supplied idempotency key) and MUST produce a unique order number through the `OrderCounter` mechanism.
- **FR-A7**: Cart behavior MUST be deterministic for guest, session, and authenticated flows as currently designed; cart-merge MUST not duplicate items.
- **FR-A8**: Admin catalog CRUD endpoints MUST strictly validate product, category, variant, and image inputs.
- **FR-A9**: Inquiry submission endpoint MUST be rate-limited and MUST be manageable from the admin inquiry inbox.
- **FR-A10**: All public, buyer, and admin endpoints MUST return predictable, documented status codes; missing endpoint tests for discovered gaps MUST be added.

### Functional Requirements — Layer 3: Database & Storage

- **FR-D1**: SQL Server MUST remain the production database; no destructive schema changes MUST occur unless explicitly justified and migration-safe.
- **FR-D2**: Indexes MUST exist for catalog browsing (category/sort columns), slug lookup, order lookup (by number and by owning user), admin lists (orders/products/users/inquiries), payment-proof lookup, and outbox processing claim columns.
- **FR-D3**: Unique constraints MUST exist where business identity requires them (e.g., product slug, category slug, email, order number).
- **FR-D4**: EGP money fields MUST be configured with a precision/scale that prevents drift across DB → API → SPA → DB round-trips.
- **FR-D5**: Foreign-key relationships, required fields, and delete behaviors MUST be set to preserve referential integrity.
- **FR-D6**: Payment-proof files MUST be private and MUST never be served by public static-file middleware (preserved); access MUST require authentication and ownership.
- **FR-D7**: Product images MAY be public, optimized, and CDN-backed.
- **FR-D8**: Production critical private assets MUST NOT rely on local-disk storage unless the host guarantees persistence and backup; deployment documentation MUST steer production toward Cloudinary or equivalent.
- **FR-D9**: Backup and restore MUST be documented to meet **RPO ≤ 1 hour** and **RTO ≤ 2 hours** for the production database. The documented procedure MUST include backup frequency (hourly or finer), retention window, the restore command/path on the chosen host, and a periodic restore-drill cadence (at minimum once per quarter) to prove the documented RTO is real.
- **FR-D10**: A migration safety policy MUST be documented: forward-only, additive, with destructive steps gated by an explicit justification in the migration file.
- **FR-D11 (Data Retention)**: Dr Mirror MUST follow this retention policy:
  - **Orders and order items**: retained indefinitely (supports buyer order history, accounting, and dispute resolution).
  - **Buyer addresses**: retained indefinitely; the buyer MUST be able to delete any of their own non-default, inactive (not referenced by an open order) address entries at any time. Deletion MUST remove the row, not soft-delete.
  - **Shipping address snapshots on orders**: retained with the parent order (denormalized; not affected by buyer address-book deletion).
  - **Payment-proof files**: the binary file MUST be automatically purged from storage **2 years after the parent order reaches a terminal state** (`Delivered` or `Cancelled`). The `PaymentProof` row MAY be retained (with the file reference cleared) for audit purposes; the system MUST handle a missing-file read as a graceful 410-class response with localized messaging.
  - **Email outbox messages**: dispatched messages MUST be archived or purged on a documented cadence (e.g., 90 days) to keep the table bounded.
  - **Logs**: per FR-O5 (rotation already preserved); host-level retention documented per FR-O5.
  - **PII in logs**: never written (per FR-O4); the retention policy applies to *records*, not log lines.
  - A background job or scheduled task MUST implement the 2-year payment-proof purge; the purge MUST be observable in logs and idempotent.

### Functional Requirements — Layer 4: Auth & Permissions

- **FR-S1**: ASP.NET Identity + JWT MUST remain the auth mechanism with no cookie auth scheme registered for protected APIs (preserved).
- **FR-S2**: Refresh-token rotation MUST be enforced; refresh-token reuse MUST be detected and invalidate the session.
- **FR-S3**: Disabled users MUST be rejected on the next authenticated request and MUST be unable to refresh tokens.
- **FR-S4**: Admin role MUST be enforced on the backend for every admin endpoint; frontend route guards MUST be in addition to, not in place of, backend checks.
- **FR-S5**: Buyer/customer data (orders, addresses, payment proofs, cart) MUST be scoped to the owning user at the backend.
- **FR-S6**: Users MUST NOT be able to escalate role or alter admin-only fields via any endpoint, including profile-edit endpoints (binding/whitelist enforcement).
- **FR-S7**: Login, register, refresh, and logout MUST be covered by integration tests.
- **FR-S8**: When refresh-token cookies are enabled cross-site, they MUST be `Secure`, `SameSite=None`, `HttpOnly`, and bound to the API origin.
- **FR-S9**: A last-admin guard MUST prevent the system from ending up with zero admins (preserved).

### Functional Requirements — Layer 5: Hosting & Deployment

- **FR-H1**: Frontend deployment MUST work on Vercel-class static hosting using the documented `VITE_API_BASE_URL` contract.
- **FR-H2**: Backend deployment MUST work on MonsterASP.NET-class ASP.NET hosting with all required environment variables documented in `README.md` and validated at startup.
- **FR-H3**: Production CORS allowlist MUST be explicit, non-wildcard with credentials, and validated to be non-empty at startup (preserved).
- **FR-H4**: Production MUST fail-early on missing or invalid critical configuration: `Jwt__Secret`, connection string, `Cors__AllowedOrigins`, `FileStorage__*` (when provider is cloudinary), `Email__*` (when provider is mailkit).
- **FR-H5**: No secrets MUST be committed to the repository; `.gitignore` MUST cover `appsettings.Development.json`, `appsettings.Local.json`, `.env*`, `wwwroot/uploads/`, and `logs/`.
- **FR-H6**: Development setup MUST remain simple: clone → install → run, with seeded data in Development only.
- **FR-H7**: Deployment steps MUST be reproducible by a second operator following only `README.md` and `docs/PROJECT_MAP.md` (the latter to be created).
- **FR-H8**: Static assets, fonts, and product images MUST be served with production cache headers; self-hosted variable WOFF2 fonts MUST be preloaded.

### Functional Requirements — Layer 6: Cloud & Compute

- **FR-C1**: Cloudinary (or equivalent media storage) configuration MUST be validated at startup when selected; failures MUST be logged with context.
- **FR-C2**: SMTP/MailKit configuration MUST be validated at startup when selected; outbox MUST tolerate transient SMTP failures with bounded retry (preserved).
- **FR-C3**: Background services MUST NOT crash the host on transient errors; persistent failure MUST surface in logs at warning/error level.
- **FR-C4**: External service calls (Cloudinary, SMTP) MUST have defined timeouts and bounded retries.
- **FR-C5**: The backend MUST be stateless apart from SQL Server and external storage so that horizontal scaling is not blocked.
- **FR-C6**: Any state held in memory (e.g., rate-limit counters) MUST be documented as single-instance scope; if scale to multiple instances becomes required, the spec lists the migration path (no implementation in this feature).

### Functional Requirements — Layer 7: CI/CD & Version Control

- **FR-CI1**: A CI workflow MUST exist in `.github/workflows/` on **GitHub Actions** and MUST run on every pull request against `main` and on every push to `main`.
- **FR-CI2**: The CI workflow MUST run, in order or in parallel where safe: backend `dotnet restore` → `dotnet build` → `dotnet test`; frontend `npm ci` → `npm run build` → `npm test` → `npm run i18n:check`; lint where rules apply.
- **FR-CI3**: SQL Server integration tests MUST run only when the opt-in `DRMIRROR_TEST_SQL_CONNECTION` GitHub Actions secret is provided; default CI MUST not require it. When the secret is absent, the SQL-integration step MUST be skipped cleanly (not failed).
- **FR-CI4**: CI MUST NOT require production secrets. Test runs MUST be deterministic; flaky tests MUST be quarantined or fixed, not retried silently.
- **FR-CI5**: A branching/release rule set MUST be documented: feature branches → PR → CI green → merge to `main`. No force-push to `main` without an explicit reason.
- **FR-CI6**: Lockfiles (`package-lock.json`) and SDK pin (`global.json` if present, otherwise `<TargetFramework>` in the csproj) MUST be respected.
- **FR-CI7**: Generated outputs (`bin/`, `obj/`, `dist/`, `node_modules/`, logs) and sensitive files MUST NOT be committable; `.gitignore` MUST enforce this.

### Functional Requirements — Layer 8: Security & Access Boundaries

- **FR-SEC1**: Every user-owned record MUST be protected by a server-enforced ownership check at the endpoint level.
- **FR-SEC2**: Admin/customer boundaries MUST have integration tests covering negative cases (buyer JWT on admin endpoint, anonymous on protected endpoint, admin JWT used to access another tenant's data).
- **FR-SEC3**: Payment-proof files MUST require authenticated, authorized access via the dedicated endpoint and MUST be blocked from static-file middleware (preserved).
- **FR-SEC4**: *(Canonical statement merged into [FR-O4](#functional-requirements--layer-12-error-tracking--logs) — logs MUST never include passwords, secrets, tokens, raw file contents, or full payment-proof images. The audit/enforcement task lives with FR-O4 to avoid duplicate verification work; this entry exists as a security-layer cross-reference only.)*
- **FR-SEC5**: File uploads MUST validate size, extension, MIME type, and resolved storage path (no traversal). For **payment-proof uploads**: maximum size **5 MB** per file; allowed types **JPEG (`image/jpeg`), PNG (`image/png`), and PDF (`application/pdf`)** only. Validation MUST be enforced server-side; the frontend file picker SHOULD pre-filter and the UI MUST surface a localized error if the user selects an oversized or wrong-type file. Other upload paths (product images, etc.) MUST declare their own size/MIME limits in the plan.
- **FR-SEC6**: CORS MUST NOT use wildcard origins when credentials are allowed.
- **FR-SEC7**: Public endpoints MUST NOT expose internal fields (timestamps used for concurrency tokens, internal IDs that are not slugs/numbers, secrets, soft-delete flags) beyond what the contract requires.
- **FR-SEC8**: Production error responses MUST omit stack traces and implementation hints; ProblemDetails MUST be the only shape.
- **FR-SEC9**: New security tests MUST cover at minimum: order ownership, payment-proof access (positive and negative), admin role enforcement on every admin endpoint, disabled-user token rejection, refresh-token reuse detection, role-escalation prevention through profile edit.
- **FR-SEC10**: A threat model MUST be documented for checkout, payment-proof review, admin catalog editing, and user-role management, listing the trust boundaries, threats, and mitigations.

### Functional Requirements — Layer 9: Rate Limiting

- **FR-RL1**: Existing named rate-limit policies MUST be preserved; coverage MUST include login, register, refresh, public inquiry submission, admin APIs (defense-in-depth), and proof upload.
- **FR-RL2**: Rate-limit responses MUST be ProblemDetails-shaped 429 with `Retry-After` where applicable.
- **FR-RL3**: The SPA MUST present rate-limit failures cleanly with localized messaging; no raw 429 text MUST be shown to users.
- **FR-RL4**: Integration tests MUST cover 429 behavior and `Retry-After` semantics for at least login, register, inquiry submission, and proof upload.
- **FR-RL5**: A configuration knob MUST exist (or be documented as already existing) to relax limits in tests without changing production defaults.

### Functional Requirements — Layer 10: Caching & CDN

- **FR-CA1**: React Query caches MUST be configured per feature with explicit `staleTime`/`gcTime`; defaults MUST NOT cache cart, checkout, auth, admin order detail, or payment-proof status unsafely.
- **FR-CA2**: Catalog/category/product reads MAY cache safely on the client; cache MUST be invalidated after admin product/category/image edits.
- **FR-CA3**: Public product images MUST be served via CDN with production cache headers; self-hosted fonts MUST be cached aggressively.
- **FR-CA4**: API responses MUST only set `Cache-Control` headers where safe; private endpoints MUST set `Cache-Control: no-store`.
- **FR-CA5**: CDN/cache keys MUST not strip locale or theme such that one user's content is served to another.

### Functional Requirements — Layer 11: Load Balancing & Scaling

- **FR-LB1**: The backend MUST remain stateless except for SQL Server and external storage so horizontal scaling is not blocked.
- **FR-LB2**: Refresh-token storage MUST live in SQL Server (preserved), not in single-server memory.
- **FR-LB3**: File storage MUST work across instances (Cloudinary or equivalent in production).
- **FR-LB4**: Email outbox processing MUST avoid duplicate sends across instances via the M8 lease (preserved); a contention test MUST demonstrate this property.
- **FR-LB5**: SQL Server connection pooling MUST be efficient; retry-on-failure MUST be configured (preserved).
- **FR-LB6**: Admin list pagination MUST be present and indexed; product/order list endpoints MUST page server-side, not client-side.
- **FR-LB7**: Storefront catalog read endpoints MUST meet **p95 ≤ 500 ms server response time** for `GET /api/catalog/products` (list, with filters/pagination) and `GET /api/catalog/products/{slug}` (product detail), measured warm-cache on the production MonsterASP.NET-class single-instance setup. Cold-start and DB-warmup requests are excluded from the p95 window. Failure to meet this target MUST be treated as a measurable regression — typically traceable to a missing index, over-fetching, N+1 query, or bad pagination — and resolved before merge.

### Functional Requirements — Layer 12: Error Tracking & Logs

- **FR-O1**: Serilog structured logging with correlation-id enrichment MUST be preserved.
- **FR-O2**: Frontend errors MUST be captured by **Sentry (cloud)** as the production error tracking sink. The integration MUST include source-map upload during frontend build, release tagging, environment tagging (production / staging), and PII scrubbing for emails, addresses, and any payment-proof references. Sentry DSN MUST be provided via build-time environment variable (`VITE_SENTRY_DSN` or equivalent) and MUST be absent or no-op in development. Errors caught by the existing `ErrorBoundary` MUST be forwarded to Sentry without losing the calm localized fallback shown to the user.
- **FR-O3**: Backend MUST log, with appropriate level, at least: validation failures, auth failures, payment-proof failures, email send failures, external-service failures, and admin actions that change orders, proofs, stock, or roles.
- **FR-O4**: Logs MUST never include passwords, secrets, tokens, raw file contents, or full payment-proof images.
- **FR-O5**: Log files MUST rotate (preserved: 50 MB / 30-day retention); host-level retention MUST be documented.
- **FR-O6**: Customer-facing error copy MUST be calm, localized, non-technical, and consistent across surfaces.
- **FR-O7**: Admin-side audit logging MUST record actor, action, target, and timestamp for order transitions, proof approve/reject, stock changes, and role changes. Audit entries MUST be **retained indefinitely** (no purge job — low volume, high investigative value). Each entry MUST include: `actorUserId`, `actionType` (enum), `targetEntityType`, `targetEntityId`, `timestampUtc`, `previousStatus` and `newStatus` where applicable, and the `correlationId` from the originating request. Audit entries MUST NOT contain file contents, secrets, passwords, tokens, raw payment-proof bytes, or other raw sensitive payloads. The audit table MUST be append-only at the application layer (no update/delete endpoints).

### Functional Requirements — Layer 13: Availability & Recovery

- **FR-R1**: The health endpoint MUST be upgraded from a static `ok` to a real readiness check that verifies database connectivity and at least one critical service (storage provider reachable, outbox processor running). It MUST distinguish liveness from readiness.
- **FR-R2**: Database backup and restore MUST meet **RPO ≤ 1 hour** and **RTO ≤ 2 hours**, documented with frequency, retention, and a periodically-tested restore procedure (drill cadence at minimum quarterly).
- **FR-R3**: A runbook MUST exist documenting recovery steps for: API down, database unavailable, Cloudinary/storage failure, SMTP failure, frontend deploy issue, CORS/env misconfiguration, admin lockout.
- **FR-R4**: Email outbox retry/recovery (preserved) MUST be observable in logs and recoverable manually if a message is permanently failing.
- **FR-R5**: Customers MUST never be charged twice or asked to upload proof twice due to a refresh or retry; order creation MUST be idempotent as in FR-A6.
- **FR-R6**: The SPA MUST handle backend downtime gracefully with a localized banner; queries MUST retry with sensible backoff where safe.
- **FR-R7**: A documented rollback path MUST exist for both frontend (re-promote previous static build) and backend (re-deploy previous artifact; verify migrations did not advance destructively).
- **FR-R8**: Dr Mirror targets a **99.5% monthly uptime SLO** for the production storefront and admin API (≈ 3.6 hours of allowed downtime per calendar month, scheduled maintenance windows announced in advance excluded). The runbook (FR-R3), health endpoint (FR-R1), and monitoring stack MUST collectively make this target measurable: uptime MUST be computed from synthetic checks against the readiness endpoint at a documented cadence (recommended: 1-minute interval), and any month that breaches the budget MUST be reviewed in a brief post-mortem.

### Key Entities *(preserve current model unchanged)*

- **User**: Identity user with roles (`Admin`, customer). Owns: BuyerAddress, Cart, Order, PaymentProof (via Order), Inquiry (optional). Has RefreshToken.
- **RefreshToken**: Persisted server-side; rotation-enforced; reuse detected.
- **BuyerAddress**: Address book entry; at most one default per user (M5 partial unique index).
- **ShippingAddress**: Snapshot of address at order time.
- **Cart, CartItem**: Guest/session/authenticated cart; merge on login is deterministic.
- **Category, Product, ProductImage, ProductVariant**: Catalog tree; variants are the Size × Colour matrix with stock.
- **Order, OrderItem**: Eight-state lifecycle; unique order number via OrderCounter.
- **OrderCounter**: Generates unique order numbers safely under concurrency.
- **PaymentMethod**: COD, Instapay, Wallet (Egyptian market).
- **PaymentProof**: Private file (image/PDF); ownership and admin approval are server-enforced.
- **Inquiry**: Public contact form submission; admin-managed; responded-audit (M7).
- **EmailOutboxMessage**: Durable email queue with lease-based claim (M8) for multi-instance safety.

## Security & Access-Control Requirements

(See **Layer 8: Security & Access Boundaries** above for FRs.) In summary:

- Ownership-checked endpoints for every user-owned record (orders, addresses, payment proofs, cart).
- Backend role enforcement on every admin endpoint, validated by tests.
- Private payment-proof file streaming through a single authenticated, ownership-checked endpoint; static-file middleware MUST NOT serve `/uploads/payment-proofs`.
- Disabled-user token rejection and refresh-token reuse detection.
- Role-escalation prevention via input whitelisting on profile/account update endpoints.
- File-upload validation (size/extension/MIME/path) and absence of path traversal.
- CORS that is explicit, allowlisted, and non-wildcard with credentials in production.
- Logs that never carry secrets, tokens, passwords, or private file contents.
- Production error responses that are ProblemDetails-only, with no stack traces.
- A documented threat model for checkout, proof review, catalog editing, and role management.

## Data & Storage Requirements

(See **Layer 3** for FRs.) Cross-cutting points:

- SQL Server stays the production database; migrations stay forward-only and additive.
- Indexes back catalog browsing, slug lookup, order lookup, admin lists, payment-proof lookup, outbox claim.
- Unique constraints back product slug, category slug, email, order number.
- EGP money fields are configured for precision suitable for currency without drift.
- Foreign keys, required fields, and delete behaviors preserve referential integrity.
- Payment-proof files stay private and are never reachable through static-file middleware.
- Product images may be public via CDN; private assets in production must not depend on local disk.
- Backup, restore, retention, and DR procedure are documented (operator-meetable targets).

## UX, i18n & Accessibility Requirements

(See **Layer 1** for FRs.) Cross-cutting points:

- Four-state shipping baseline: (dark, RTL), (dark, LTR), (light, RTL), (light, LTR).
- WCAG 2.1 AA contrast and full keyboard reachability with visible focus rings.
- Logical CSS only; directional icons mirror in RTL, symbolic icons do not.
- Western numerics (`numberingSystem: 'latn'`), tabular on prices/tables/counters.
- Skeleton-based loading, intentional empty states, retry-capable error states.
- Form validation localized, keyboard-friendly, focus-managed, and protected against duplicate submit.
- Storefront vs. admin separation preserved in chrome and density.
- `npm run i18n:check` zero-missing-keys enforced in CI.
- `prefers-reduced-motion` respected; no parallax, scroll-jacking, autoplay, page-load animations, or "AI assistant" aesthetic (per PRODUCT.md anti-references).

## Observability & Operations Requirements

(See **Layer 12 & 13** for FRs.) Cross-cutting points:

- Structured logs with correlation IDs (preserved).
- Frontend error tracking provider configured (open question OQ-1).
- Backend logs cover validation, auth, payment-proof, email, external-service, and admin actions.
- Logs never include secrets, tokens, or private content.
- Host-level log retention documented in addition to in-file retention.
- Real readiness health endpoint distinguishing liveness from readiness.
- Customer-facing error copy is calm, localized, and non-technical.
- A documented runbook covers the seven failure scenarios.
- Admin actions are audit-logged.

## Testing Requirements

- **T-1**: All existing tests in `backend/tests/DrMirror.Tests` MUST continue to pass.
- **T-2**: New integration tests MUST cover every Layer 8 security/access scenario listed (ownership, admin enforcement, payment-proof access positive/negative, disabled user, refresh reuse, role escalation).
- **T-3**: New concurrency/correctness tests MUST cover Layer 2/3 scenarios (parallel checkout, double-submit, stock decrement vs. checkout, money round-trip, order counter under concurrency).
- **T-4**: Frontend test suite MUST continue to pass; new tests MUST be added for the four-state rendering of at least one representative page per surface (storefront product detail, admin order detail).
- **T-5**: A `npm run i18n:check` step MUST run in CI and MUST fail on missing keys.
- **T-6**: A lint step MUST run in CI where ESLint rules are configured.
- **T-7**: SQL Server integration tests MUST remain opt-in; default `dotnet test` MUST run entirely in-memory.
- **T-8**: Tests MUST be deterministic; no real network calls in deterministic frontend tests.
- **T-9**: Rate-limit tests MUST cover at least login, register, inquiry submission, and proof upload.
- **T-10**: A multi-instance contention test MUST demonstrate the outbox lease prevents duplicate sends.

## Deployment & Rollback Requirements

- **DR-1**: `README.md` + `docs/PROJECT_MAP.md` (to be created) MUST be sufficient for a second operator to deploy from a clean clone.
- **DR-2**: Production startup MUST fail-fast on missing critical configuration with precise, actionable messages.
- **DR-3**: Frontend rollback MUST be a re-promote of the previous static build on the host; the runbook documents how.
- **DR-4**: Backend rollback MUST be a re-deploy of the previous artifact; if migrations advanced, the runbook documents the recovery path (forward-only migrations make rollback a forward-fix in most cases).
- **DR-5**: A documented smoke check (health endpoint healthy, admin login works, Arabic catalog renders, end-to-end order placement) MUST exist for post-deploy verification.
- **DR-6**: Secrets MUST be provisioned out-of-band (host environment, secret manager); none MUST be checked in.

## Acceptance Criteria

- **AC-1**: Repository inspection by a second engineer confirms that every concrete weakness called out in **CS-9** has either been fixed or is explicitly deferred with rationale in a follow-up task.
- **AC-2**: The full test suite (backend + frontend) passes locally and in CI on `main`; CI runs on every pull request against `main` and blocks merge on red.
- **AC-3**: All new security/access-boundary integration tests pass; cross-actor, role-escalation, disabled-user, refresh-reuse, and payment-proof-access negative tests all return the documented response.
- **AC-4**: A new operator, given only `README.md` and `docs/PROJECT_MAP.md`, can deploy Dr Mirror to production-class hosting and pass the documented smoke check on first try (validated by a dry-run walkthrough).
- **AC-5**: The runbook covers all seven failure scenarios with concrete steps; each step is validated against staging.
- **AC-6**: `npm run i18n:check` passes; every page renders correctly in all four (theme × direction) states; WCAG 2.1 AA contrast is verified for body and secondary text in both themes.
- **AC-7**: Health endpoint reports `unhealthy` when SQL Server is unreachable and `healthy` otherwise; readiness/liveness are distinguishable.
- **AC-8**: No production secret is required to run CI; no secret is present in the repository (`git log -p` audit clean).
- **AC-9**: Concurrency tests demonstrate no oversell on parallel checkout of a 1-stock variant and no duplicate order on double-submit.
- **AC-10**: Frontend error tracking sink receives a deliberately-thrown error in a staging build; backend external-service failure (e.g., Cloudinary 5xx simulated) is observable in logs at the documented level.
- **AC-11**: Admin actions that mutate orders, proofs, stock, or roles produce an append-only audit-log entry with `actorUserId`, `actionType`, `targetEntityType`, `targetEntityId`, `timestampUtc`, `previousStatus`/`newStatus` where applicable, and `correlationId`; entries are retained indefinitely and contain no secrets, file content, or raw sensitive payloads (per FR-O7).
- **AC-12**: Business behavior is unchanged: the eight-state order lifecycle, COD/Instapay/Wallet proof rules, and proof approve/reject admin flow behave bit-for-bit as before this feature.

## Open Questions

*All three open questions were resolved during the `/speckit.specify` clarification round and are recorded here as locked decisions:*

- **OQ-1 — RESOLVED**: Frontend error tracking provider is **Sentry (cloud)**. See FR-O2 for the integration requirements (source-map upload, release/environment tagging, PII scrubbing, build-time DSN, ErrorBoundary forwarding).
- **OQ-2 — RESOLVED**: Production database backup/restore targets are **RPO ≤ 1 hour, RTO ≤ 2 hours**. See FR-D9 and FR-R2 for the documented procedure, retention, and quarterly restore-drill cadence.
- **OQ-3 — RESOLVED**: CI runner is **GitHub Actions**. See FR-CI1–FR-CI3 for the workflow contract (PR + push to `main`, backend restore/build/test, frontend install/build/test, TypeScript build, i18n parity, lint where configured, SQL integration tests gated on `DRMIRROR_TEST_SQL_CONNECTION` secret).

## Assumptions

- **A-1**: The hosting target is Vercel-class static hosting for the SPA and MonsterASP.NET-class ASP.NET hosting for the API, as stated in `README.md` and the input prompt; the spec stays portable to any equivalent host.
- **A-2**: SQL Server is provisioned by the host on a tier that supports hourly-or-finer backups so the RPO ≤ 1 h / RTO ≤ 2 h target (OQ-2 RESOLVED) is achievable. If the chosen production tier cannot meet this, the deployment runbook MUST surface the gap before go-live.
- **A-3**: Cloudinary is the production media store unless operator chooses an equivalent CDN-backed object storage; the `IFileStorageService` abstraction allows substitution.
- **A-4**: SMTP for production email is provided by a real provider (e.g., Gmail SMTP, Mailgun, SendGrid); `MailKitEmailSender` already supports any RFC-compliant SMTP server.
- **A-5**: Existing rate-limit policy values are tuned for current traffic and only need test coverage and ProblemDetails parity; tuning new values is out of scope for this feature.
- **A-6**: The eight-state order lifecycle, the COD/Instapay/Wallet proof rules, and the proof approve/reject admin flow are correct as currently implemented and MUST NOT change.
- **A-7**: HeroUI v3 + Tailwind v4 + Lucide remain the only UI/component/icon systems; no second design system is introduced.
- **A-8**: i18n parity tooling (`npm run i18n:check`) already gates the 11 namespaces and remains the authoritative parity check.
- **A-9**: The existing `IFileStorageService`/`IEmailSender` abstractions are sufficient and do not need replacement to deliver this feature.
- **A-10**: Egyptian-market payment options (COD, Instapay, Wallet) remain the only supported payment flows in v1; integrating a real online card processor is out of scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A second operator (not the original author) can deploy Dr Mirror from a clean clone to a production-class environment in under 2 hours and pass the documented smoke check on first try.
- **SC-002**: The full backend + frontend test suites pass in CI in under 10 minutes on a standard GitHub-Actions-class runner.
- **SC-003**: Zero high-severity security or correctness regressions are introduced by this feature; existing tests pass at 100% and all new security/concurrency tests pass.
- **SC-004**: Production deploys block at startup on any of the 5 documented critical-configuration misconfigurations, in 0 seconds (immediate fail) rather than at first failing request.
- **SC-005**: All 11 i18n namespaces achieve 100% key parity across Arabic and English; `npm run i18n:check` exits zero on every CI run.
- **SC-006**: Every screen in the customer and admin surfaces passes a visual review in all 4 (theme × direction) states; WCAG 2.1 AA contrast is verified for body and secondary text.
- **SC-007**: 100% of admin endpoints have backend role enforcement verified by at least one negative-case integration test.
- **SC-008**: 100% of user-owned record endpoints have ownership enforcement verified by at least one cross-actor negative-case integration test.
- **SC-009**: A 1-stock variant under 10 parallel checkout attempts yields exactly 1 successful order and 9 clean failures with no oversell.
- **SC-010**: A double-submit of the same order placement yields exactly 1 order in the database, never 2.
- **SC-011**: Operator confidence (subjective, captured in a brief after-action review post-deploy): the operator can recover from each of the 7 documented runbook scenarios without paging the original author.
- **SC-012**: Customer-facing error copy is localized in 100% of error paths; zero raw English strings appear in Arabic mode and zero raw stack traces appear in any production error response.
- **SC-013**: Storefront catalog browse meets **p95 ≤ 500 ms server response time** for product list and product detail endpoints under warm-cache conditions on the production single-instance host (per FR-LB7).
- **SC-014**: Production storefront and admin API meet **99.5% monthly uptime** measured by 1-minute synthetic readiness checks (per FR-R8), with any breaching month producing a documented post-mortem.
- **SC-015**: Data retention is enforced: 100% of payment-proof files for orders that reached a terminal state more than 2 years ago are purged from storage, while their parent orders and shipping-address snapshots remain intact and viewable (per FR-D11).
