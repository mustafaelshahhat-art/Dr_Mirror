# Phase 0 — Research

**Feature**: Full-Stack Production Reality Hardening
**Branch**: `003-production-reality-hardening`
**Date**: 2026-05-17

All technical decisions needed to plan implementation are recorded below. The spec already resolved 3 open questions (Sentry / RPO≤1h-RTO≤2h / GitHub Actions) and 5 clarifications (5 MB JPEG-PNG-PDF / p95 ≤ 500 ms / 99.5% / retention 2y proof + indefinite orders+audit). What remains is *how* each requirement is met without changing the architecture.

Format per item: **Decision / Rationale / Alternatives considered**.

---

## R-1 — Concurrency Control for Stock Decrement & Order Counter

**Decision**: Use SQL-level row versioning (`xmin`-style `rowversion` / `timestamp` column) on `ProductVariant.Stock` + `OrderCounter.Value` as the optimistic concurrency token, with `EF Core` `[ConcurrencyCheck]`/`.IsRowVersion()`. On conflict, retry the operation up to 3 times with a tiny exponential backoff inside the request. Wrap order creation + stock decrement + counter increment in a single EF Core transaction with `IsolationLevel.ReadCommitted` (the SQL Server default). M4b migration already introduced a concurrency token on `ProductVariant` — extend coverage if any spec endpoint touches stock without it.

**Rationale**: SQL Server `rowversion` is the lowest-overhead, lock-free way to detect lost updates and is already standard in EF Core. Optimistic + retry yields the documented behavior in AC-9 (10 parallel checkouts → exactly 1 success + 9 clean failures) without holding pessimistic locks across the request, which would create contention storms under burst traffic. The transaction boundary keeps order/counter/stock consistent.

**Alternatives considered**:
- *Pessimistic locking (`SELECT ... WITH (UPDLOCK, ROWLOCK)`)*: simpler reasoning, but contention scales badly under bursts and risks deadlocks across order/variant/counter rows.
- *Application-level distributed lock (e.g., Redis lock)*: introduces a new infrastructure dependency, conflicts with the "stateless apart from SQL Server + external storage" constraint.
- *Sequence object for order counter*: viable, but the project already has an `OrderCounter` entity (M3_2a1 migration fixed its identity); keeping the existing model and adding concurrency tokens is less invasive.

---

## R-2 — Checkout Idempotency (Double-Submit Protection)

**Decision**: Add an `X-Idempotency-Key` HTTP header to `POST /api/checkout/orders`. The frontend generates a per-cart UUID v4 the first time the user opens the review step and reuses it for any retry. The backend persists the key with the order via a new lightweight `OrderIdempotencyKey` table (`Key uniqueidentifier PK`, `OrderId int FK`, `UserId Guid`, `CreatedAtUtc datetime2`). On a second request with the same key from the same user, return the existing order instead of creating a new one. Keys older than 24 h MAY be reaped by the retention job (optional follow-up; not blocking).

**Rationale**: Idempotency keys are the industry-standard fix for double-submit; the spec requires deterministic single-order outcome (AC-10, SC-010, FR-A6). A separate small table keeps `Order` clean and avoids changing the order shape. UUID v4 from the client is sufficient — Dr Mirror does not need cryptographic uniqueness guarantees here because the key is scoped to a user.

**Alternatives considered**:
- *Hash the cart contents + user ID + timestamp window*: rejected — fragile if the cart changes between retries.
- *Reject the second submit on the client only*: rejected — backend must enforce per FR-A3 ("backend must never trust frontend-only validation").
- *Use the cart ID as the idempotency key*: rejected — a cart can be re-used for multiple legitimate orders over its lifetime; key must be per-attempt.

---

## R-3 — Disabled-User Token Rejection

**Decision**: Add a `SecurityStamp`-style check to the JWT validation pipeline. ASP.NET Identity already maintains `IdentityUser.SecurityStamp`; embed it (or a derived short hash) as a JWT claim at issuance, and at validation time compare against the current value from the DB. When an admin disables a user (or changes their role), bump the security stamp via `UserManager.UpdateSecurityStampAsync`; existing tokens are then rejected on the next request. Refresh-token validation already loads the user; extend it to short-circuit on `IsDisabled = true`.

**Rationale**: This is the documented Identity pattern and the spec requires it (FR-S3, AC-2/3 of US-1). Token-stamp comparison costs one extra DB read per authenticated request; combined with EF Core change-tracking and connection pooling, this is well within budget (p95 ≤ 500 ms for catalog still leaves ample headroom for protected calls).

**Alternatives considered**:
- *Short-lived access tokens with no stamp*: rejected — even a 5-min window is unacceptable for a disabled-user post-incident.
- *Server-side session store keyed by JWT jti*: rejected — adds a new state layer; conflicts with "stateless apart from SQL Server" constraint.
- *Distributed cache for stamp*: deferred — direct DB read is acceptable at v1 traffic, and trivially upgradable later.

---

## R-4 — Refresh-Token Rotation & Reuse Detection

**Decision**: Existing `RefreshToken` entity already supports rotation. Add an integration test for reuse detection (presenting an already-used refresh token must invalidate the family). Implementation pattern: on refresh, mark the presented token as `RevokedAt`, issue a new one, and chain via `ReplacedByTokenId`. If a token with `RevokedAt IS NOT NULL` is presented again, mark *every* refresh token in that chain (same `FamilyId` / via traversal) as revoked and force re-login.

**Rationale**: Standard OAuth2 refresh-token family pattern. The spec requires it (FR-S2). The data model likely already supports it; this research entry confirms the pattern, the tests prove it.

**Alternatives considered**:
- *Single-use refresh tokens without family invalidation*: rejected — does not detect compromise.
- *JWT-only with no refresh*: rejected — UX cost of frequent re-auth is too high.

---

## R-5 — Payment-Proof File Validation (5 MB / JPEG-PNG-PDF)

**Decision**: Validate three things server-side on `POST /api/orders/{orderNumber}/proof`:
1. `Content-Length` ≤ 5 MiB (5 × 1024 × 1024); reject with 413 ProblemDetails before reading the body.
2. Declared `Content-Type` ∈ {`image/jpeg`, `image/png`, `application/pdf`}; reject with 415 ProblemDetails otherwise.
3. Magic-bytes sniff of the first 16 bytes; reject if the actual byte signature does not match the declared type (`FF D8 FF` for JPEG, `89 50 4E 47 0D 0A 1A 0A` for PNG, `25 50 44 46` for PDF). This catches MIME spoofing.

Frontend: pre-filter the `<input type="file">` accept attribute, pre-check file size in the picker handler, and surface localized errors using existing `orders.json`/`errors.json` namespaces. Pre-checks are UX-only; server is authoritative.

**Rationale**: Three-layer defense (length / declared MIME / magic bytes) is the standard pattern and addresses FR-SEC5. Magic-bytes sniff is cheap (read 16 bytes from the stream) and prevents the classic spoofed-extension attack. 413/415 are the correct status codes for these failures.

**Alternatives considered**:
- *Trust the multipart `Content-Type` only*: rejected — easily forged.
- *Run full antivirus scan*: deferred — out of scope for v1 unless a host-level scanner is provided; size + MIME + magic-bytes give the documented bar.
- *Re-encode images to strip EXIF*: deferred — useful but not required by the spec; revisit if PII review demands it.

---

## R-6 — Admin Audit Log Writer

**Decision**: Introduce `IAdminAuditWriter` with one method `WriteAsync(AuditAction action, AuditTarget target, AuditContext ctx)`; backed by `AdminAuditWriter` (Scoped). Each admin-side mutation endpoint calls it inside the same EF Core transaction that performs the mutation, so the audit row and the business mutation commit together. The writer pulls `actorUserId` from `HttpContext.User`, `correlationId` from the existing CorrelationId enricher, `timestampUtc` from `TimeProvider`, and emits a row into `AdminAuditLogEntry`. The table is append-only at the application layer (no update/delete endpoints exposed); DB-level locking is unnecessary because writes are append.

**Rationale**: FR-O7 requires actor/action/target/timestamp + correlationId + prev/new status, indefinitely retained. Co-locating the write inside the same transaction as the mutation ensures the audit log can never disagree with the business state. Scoped lifetime matches `AppDbContext`.

**Alternatives considered**:
- *EF interceptor / SaveChanges hook that auto-audits anything*: rejected — too magical; misses domain semantics (e.g., "order state transition from X to Y"); risks logging routine reads.
- *Separate audit micro-service*: rejected — over-engineering for v1.
- *Serilog-only audit (no table)*: rejected — log search across years is slow; FR-O7 implies a structured queryable store.

---

## R-7 — Payment-Proof Retention Purge Job (2 Years Post-Terminal)

**Decision**: Add `PaymentProofRetentionPurgeService : BackgroundService` that wakes daily (configurable via `Retention__ProofPurgeIntervalHours`, default 24). On each tick:
1. Query `PaymentProof` rows where the parent `Order.UpdatedAtUtc` (when the order entered a terminal state — `Delivered` or `Cancelled`) is ≥ 2 years ago AND `FileReference IS NOT NULL`.
2. For each, call `IFileStorageService.DeleteAsync(reference)`, then clear `FileReference` on the row and stamp `FilePurgedAtUtc`.
3. Log each purge at Information level (no file content, just IDs); aggregate stats per tick at Information level.

Behavior is idempotent: missing storage objects are tolerated. If the parent order moves out of terminal state somehow (shouldn't happen — terminal is terminal), no replay logic; the row stays purged.

**Rationale**: FR-D11 mandates 2-year purge of files but allows the `PaymentProof` row to remain for audit. A scheduled background service is the simplest correct implementation; it lives in the existing `BackgroundServices/` pattern alongside `EmailOutboxProcessor`. Daily cadence is sufficient — the retention boundary is 2 years; granular precision is unnecessary.

**Alternatives considered**:
- *Cloudinary auto-expiry / S3 lifecycle*: rejected — couples retention to a specific storage provider; the file storage abstraction would have to leak provider semantics. We may *additionally* set Cloudinary tags for ops convenience.
- *Sync purge on order terminal transition + 2y timer*: rejected — Hangfire/Quartz dependency for a feature that can run as a simple `BackgroundService`.
- *Manual admin-triggered purge*: rejected — defeats the "automatic" requirement in FR-D11.

---

## R-8 — Health Endpoint Upgrade (Liveness vs. Readiness)

**Decision**: Replace the static `MapGet("/api/health", ...)` with the ASP.NET Core HealthChecks framework:
- `GET /api/health/live` → cheap liveness probe (always returns 200 if the process is up). For host platform restart probes.
- `GET /api/health/ready` → readiness probe that runs registered health checks:
  - `SqlServerHealthCheck` (executes `SELECT 1` against `AppDbContext` with a 2 s timeout).
  - `FileStorageHealthCheck` (provider-specific; for Cloudinary, a HEAD against the API root with a 2 s timeout; for Local, a write-and-read of a temp file under `wwwroot/uploads`).
  - `OutboxHealthCheck` (queries `EmailOutboxMessage` for unprocessed-older-than-1-hour count; warns if > 0, fails if > threshold).
- Response uses ProblemDetails-shaped JSON with a `checks` array; backwards-compat `GET /api/health` MAY be retained as an alias for `/health/ready` to avoid breaking external monitors.

**Rationale**: FR-R1 requires distinguishing liveness from readiness and verifying real dependencies. Standard ASP.NET Core HealthChecks is the documented pattern, supports the readiness/liveness split natively, and is free of new dependencies. 1-minute synthetic checks (FR-R8) can then hit `/ready` and feed the 99.5% SLO measurement.

**Alternatives considered**:
- *Roll our own JSON endpoint*: rejected — re-implements what ASP.NET Core ships and loses the standard `/healthz` shape monitors expect.
- *Always return 200 from `/api/health`*: rejected — the current behavior, fails the requirement.

---

## R-9 — Multi-Instance Outbox Lease (Already Present — Verify)

**Decision**: M8 already introduced lease-based claim on `EmailOutboxMessage`. The plan adds a contention-style test that spins up two `EmailOutboxProcessor` instances in the same xUnit fixture (different scoped dependencies) and asserts each message is dispatched exactly once. No code change unless the test reveals a gap.

**Rationale**: FR-LB4 / AC of US-6 require demonstrated single-dispatch under contention. The test is cheap and locks in the behavior.

**Alternatives considered**:
- *External queue (Azure Service Bus, RabbitMQ)*: rejected — adds infrastructure; outbox-on-table is sufficient for v1 traffic.

---

## R-10 — Sentry Frontend Integration

**Decision**: Add `@sentry/react` dependency. Initialize in `src/shared/lib/sentry.ts` with:
- DSN from `import.meta.env.VITE_SENTRY_DSN` (no-op when empty).
- `environment` from `import.meta.env.MODE` (dev/preview/production).
- `release` set at build time from `VITE_APP_RELEASE` or the git SHA captured in CI.
- `tracesSampleRate: 0` (no performance traces in v1 — keeps cost predictable).
- `beforeSend` hook that scrubs PII: drops `email`, `phone`, `address*` from breadcrumbs, scrubs `Authorization` headers and any payment-proof URL fragments.
- `ErrorBoundary` integration: `Sentry.captureException(error)` inside the existing `ErrorBoundary.componentDidCatch`, preserving the calm localized fallback.

Vite plugin `@sentry/vite-plugin` uploads source maps during `npm run build` when `SENTRY_AUTH_TOKEN` is set; CI configures this on the production build job.

**Rationale**: FR-O2 names Sentry explicitly. The integration uses Sentry's React 19-compatible SDK (post-version 8.x) and respects the spec's PII scrubbing and ErrorBoundary requirements. No-op-when-empty makes development frictionless.

**Alternatives considered**:
- *Self-host Sentry / GlitchTip*: rejected — Q1 chose Sentry cloud.
- *Console-log errors to backend*: rejected — duplicates Sentry, no UI, no triage.

---

## R-11 — GitHub Actions Workflow

**Decision**: Single `ci.yml` workflow with two parallel jobs:

**Job `backend`** (Windows runner to match the .NET 10 MonsterASP.NET production target):
- `actions/checkout@v4`
- `actions/setup-dotnet@v4` with `dotnet-version: '10.0.x'`
- `dotnet restore backend/DrMirror.slnx`
- `dotnet build backend/DrMirror.slnx --no-restore --configuration Release`
- `dotnet test backend/DrMirror.slnx --no-build --configuration Release --logger "trx;LogFileName=test_results.trx"`
- Optional: if `DRMIRROR_TEST_SQL_CONNECTION` secret is present, set env var and re-run with SQL filter. Skipped cleanly otherwise.

**Job `frontend`** (Ubuntu runner; faster, sufficient for Vite/TypeScript):
- `actions/checkout@v4`
- `actions/setup-node@v4` with `node-version-file: 'frontend/.nvmrc'` (added if absent) or `'lts/*'` as fallback.
- `npm ci --prefix frontend`
- `npm run build --prefix frontend` (TypeScript compile + Vite build)
- `npm test --prefix frontend -- --run`
- `npm run i18n:check --prefix frontend`
- `npm run lint --prefix frontend` (if a `lint` script exists; conditional)

**Triggers**: `pull_request` against `main` + `push` to `main`. Concurrency group cancels older runs of the same PR.

**Rationale**: Matches FR-CI1–CI7 + Q3 decision. Windows runner for backend is the safest match to MonsterASP.NET's Windows host (avoids subtle filesystem-case or path issues). Two separate jobs maximize parallelism within the ≤ 10 minute target.

**Alternatives considered**:
- *Single ubuntu-latest job for everything*: rejected — adds Windows-vs-Linux drift risk for the production target.
- *Self-hosted runner*: rejected — overhead not justified at v1.
- *Three jobs (backend, frontend, integration)*: rejected — splits trivially small frontend work across runners with no speedup.

---

## R-12 — CORS / Cross-Site Refresh Cookies in Production

**Decision**: Keep the existing allowlist pattern. When `Auth__UseCrossSiteCookies=true`, the refresh-token cookie MUST be set with `Secure; HttpOnly; SameSite=None; Path=/; Domain=<api-domain>`. The CORS policy MUST `AllowCredentials()` for the configured origins (already does). A new integration test asserts the cookie attributes against a deployed-style configuration. CSRF concern is mitigated because (a) refresh-token endpoint is the only state-changing endpoint that reads the cookie, (b) the endpoint requires a matching `Authorization` bearer or, on first refresh, a one-time anti-CSRF token round-trip from the auth/me flow.

**Rationale**: FR-S8 + FR-H3 + spec edge-case "cross-site cookie behavior". This is the standard SPA-on-Vercel + API-on-different-domain pattern.

**Alternatives considered**:
- *Same-origin everything (subdomain trick)*: rejected — requires DNS coordination the spec does not impose.
- *LocalStorage refresh tokens*: rejected — XSS exposure.

---

## R-13 — Indexing & Pagination Strategy (Catalog p95 ≤ 500 ms)

**Decision**: Audit existing indexes against the documented hot paths. Confirm or add:
- `Category(Slug)` — UNIQUE (likely present).
- `Product(Slug)` — UNIQUE (likely present).
- `Product(CategoryId, IsActive, CreatedAtUtc DESC)` — non-clustered, supports category browse + sort-by-newest.
- `ProductVariant(ProductId)` — clustered or included key supporting variant fetch.
- `Order(UserId, CreatedAtUtc DESC)` — supports "my orders" buyer view.
- `Order(OrderNumber)` — UNIQUE.
- `Order(Status, CreatedAtUtc DESC)` — admin queue filtering.
- `PaymentProof(OrderId)` — exists; verify.
- `EmailOutboxMessage(NextAttemptUtc, ClaimedUntilUtc)` — supports lease scan.
- `AdminAuditLogEntry(TimestampUtc DESC)` + `(TargetEntityType, TargetEntityId, TimestampUtc DESC)`.

All list endpoints take `page` + `pageSize` with a documented max page size (50); paged via `Skip/Take` on indexed orderings. Catalog list response shape stays unchanged.

**Rationale**: FR-LB6/LB7 + SC-013. Index audit + targeted additions are the standard route to a sub-500 ms p95 on a single-instance host.

**Alternatives considered**:
- *Add a read replica*: rejected — multi-instance infrastructure is out of scope.
- *Materialized views*: rejected — premature; index audit is cheaper and reversible.
- *Switch to keyset pagination*: deferred — Skip/Take is fine at v1 catalog sizes; revisit if p95 misses.

---

## R-14 — Cache Strategy

**Decision**:
- **Public catalog reads** (`GET /api/catalog/products`, `GET /api/catalog/products/{slug}`, `GET /api/catalog/categories`): set `Cache-Control: public, max-age=60, stale-while-revalidate=300` and `Vary: Accept-Language`. CDN-cacheable at Vercel-edge if proxied; React Query `staleTime: 60_000`.
- **Authenticated buyer endpoints** (orders, cart, addresses, proof status): `Cache-Control: private, no-store`. React Query `staleTime: 0` for order status; longer for less-volatile resources (e.g., address book at `staleTime: 30_000`).
- **Admin endpoints**: `Cache-Control: no-store`. React Query mutation `onSuccess` invalidates relevant queries.
- **Static assets** (fonts, images via Vite/Vercel): immutable `max-age=31536000` via hashed filenames; product images via Cloudinary's CDN with its built-in caching.

`Vary: Accept-Language` ensures locale separation; theme is client-side only, so no cache concern.

**Rationale**: FR-CA1–CA5. Catalog is the only safe-to-cache surface; everything authenticated must be `no-store`.

**Alternatives considered**:
- *ETag/If-None-Match on catalog*: deferred — useful but adds backend complexity; basic `max-age` + SWR is enough at v1.
- *Server-side response cache (in-memory)*: rejected — conflicts with stateless constraint.

---

## R-15 — Documentation Strategy

**Decision**: Create five new docs (and update `README.md` to link them):
- `docs/PROJECT_MAP.md` — architectural overview pointed to by README; satisfies the README's existing dangling link.
- `docs/DEPLOY.md` — step-by-step production deploy + smoke check.
- `docs/RUNBOOK.md` — 7-scenario operational runbook (API down, DB unavailable, Cloudinary failure, SMTP failure, frontend deploy issue, CORS/env misconfig, admin lockout).
- `docs/BACKUP_RESTORE.md` — RPO ≤ 1 h / RTO ≤ 2 h procedure, retention, quarterly drill cadence.
- `docs/THREAT_MODEL.md` — STRIDE-style model for checkout, payment-proof review, admin catalog editing, user-role management.

**Rationale**: FR-H7, FR-R2/R3, FR-SEC10. README is the entry point; PROJECT_MAP.md is the deeper map; the specialized docs are linked from PROJECT_MAP.md.

**Alternatives considered**:
- *One mega-doc*: rejected — operators reading at 02:00 need a focused runbook, not a tome.
- *Wiki / external site*: rejected — docs must live in the repo for the second-operator scenario.

---

## R-16 — Frontend Skeleton/Empty/Error Pattern

**Decision**: Standardize on three building blocks already in `frontend/src/shared/components/`:
- `Skeleton` — used for list loading; component-per-page-shape (CatalogListSkeleton, OrdersListSkeleton, etc.) extending the base.
- `QueryErrorState` — used for failed queries; takes a retry callback; locale-aware copy from `errors.json`.
- New `EmptyState` component (HeroUI-styled) — for zero-result lists, with optional CTA.

Convention: every React Query consumer in a list page renders `Skeleton` while `isPending`, `QueryErrorState` while `isError`, `EmptyState` if data is empty, and the list otherwise. Codified in a lint-style review checklist (no automation needed for v1).

**Rationale**: FR-F11. Existing primitives + one new component reach parity with the spec.

**Alternatives considered**:
- *Compose into a `<QueryView>` HOC*: deferred — premature abstraction at v1.

---

## R-17 — Admin/Buyer Surface Separation on Login

**Decision**: Update the post-login redirect logic in `frontend/src/features/auth` to inspect the user's roles on the `auth/me` response and route admins to `/admin` (the existing admin hub) by default. Buyers continue to land on the home page or the `redirect` query-param target. A buyer hitting `/admin/*` is redirected to home + 403 banner via the existing `forbidden-store`. An admin hitting a buyer-only page works fine — they remain admins everywhere — but the *default* destination is the admin hub.

**Rationale**: FR-F7 + spec US-5 scenarios 4–5. Small behavior fix; no business behavior change.

**Alternatives considered**:
- *Hard-block admins from the storefront*: rejected — admins occasionally need to verify the storefront looks right; this is operationally useful.

---

## R-18 — Startup Validation (Fail-Fast)

**Decision**: Extend the existing CORS-allowlist check in `Program.cs` to also fail-fast in Production on:
- `Jwt__Secret` missing or shorter than 64 chars (matches the user-secrets minimum already implied).
- `ConnectionStrings__Default` missing (already enforced).
- `FileStorage__Provider=cloudinary` with any of `CloudName/ApiKey/ApiSecret` missing.
- `Email__Provider=mailkit` with any of `FromAddress/SmtpHost/SmtpPort/SmtpUsername/SmtpPassword` missing.

Each failure throws `InvalidOperationException` with a precise message naming the missing key. Development/Test environments are unaffected.

**Rationale**: FR-H4. Matches the existing CORS check pattern; minimal new code.

**Alternatives considered**:
- *Options-pattern `IValidateOptions<T>`*: viable, but the existing pattern is hand-rolled and consistent; keeping it consistent is more valuable than refactoring during a hardening pass.

---

## R-19 — Test Coverage Plan (Mapped to Spec FRs)

**Decision**: New / extended test folders and what they cover:

| Test folder (new or extended) | Covers FR / AC |
|---|---|
| `backend/tests/DrMirror.Tests/Security/Ownership` | FR-SEC1, FR-S5, US-1 AC-1, AC-3 |
| `backend/tests/DrMirror.Tests/Security/RoleEnforcement` | FR-SEC2, FR-S4, US-1 AC-5 |
| `backend/tests/DrMirror.Tests/Security/DisabledUser` | FR-S3, US-1 AC-4 |
| `backend/tests/DrMirror.Tests/Security/RefreshReuse` | FR-S2 |
| `backend/tests/DrMirror.Tests/Security/RoleEscalation` | FR-S6, US-1 AC-6 |
| `backend/tests/DrMirror.Tests/Security/ProofFileAccess` | FR-SEC3, US-1 AC-2 |
| `backend/tests/DrMirror.Tests/Checkout/Concurrency` | FR-A5, AC-9, SC-009 |
| `backend/tests/DrMirror.Tests/Checkout/Idempotency` | FR-A6, AC-10, SC-010 |
| `backend/tests/DrMirror.Tests/Orders/ProofValidation` | FR-SEC5 (5 MB / JPEG/PNG/PDF) |
| `backend/tests/DrMirror.Tests/Admin/Audit` | FR-O7, AC-11 |
| `backend/tests/DrMirror.Tests/Retention/ProofPurge` | FR-D11, SC-015 |
| `backend/tests/DrMirror.Tests/HealthChecks/Readiness` | FR-R1, AC-7 |
| `backend/tests/DrMirror.Tests/RateLimit/ProblemDetails429` | FR-RL2, FR-RL4 |
| `backend/tests/DrMirror.Tests/Email/OutboxContention` | FR-LB4 |
| `frontend/src/features/checkout/*.test.tsx` (extended) | FR-A6 frontend half, FR-F8 |
| `frontend/src/features/orders/ProofUpload.test.tsx` (new) | FR-SEC5 frontend pre-check |
| `frontend/src/shared/components/ErrorBoundary.test.tsx` (extended) | FR-O2 Sentry forward |

**Rationale**: Each FR/AC has a defined test home. Matches T-1–T-10.

**Alternatives considered**:
- *Flat folder*: rejected — the directory taxonomy makes "which test covers which requirement" navigable.

---

## R-20 — Migration M9 Naming & Sequencing

**Decision**: New migration named `M9_AdminAuditLog` is the **single** named migration carrying every additive schema change in this feature. It adds:
- `AdminAuditLogEntry` table (see `data-model.md` §3.1).
- `OrderIdempotencyKey` table (see `data-model.md` §3.2).
- `FilePurgedAtUtc` column (nullable `datetime2`) on `PaymentProof` (data-model §2.1).
- Filtered index `IX_Order_StatusTerminal_UpdatedAt` for the retention scan (data-model §2.2).
- Non-clustered index `IX_Order_UserId_CreatedAtUtc` for "my orders" (verify-or-add).
- Non-clustered index `IX_Order_Status_CreatedAtUtc` for admin queue (verify-or-add).
- Non-clustered index `IX_Product_CategoryId_IsActive_CreatedAtUtc` for catalog browse (verify-or-add, required for FR-LB7).
- `RowVersion` (`timestamp`) on `ProductVariant` if T011 audit finds it missing.

There is **no M10**. If an index already exists from a prior migration, the M9 migration emits a no-op for that index; the audit task confirms presence either way.

Naming follows the `M{N}_{Description}` convention (M3_2a, M4b, M5, M6, M7, M8 precedent). Strictly additive: no column drops, no required-field additions to existing rows without a default.

**Rationale**: Principle V — migrations additive and meaningfully named.

**Alternatives considered**:
- *Two migrations (one per table)*: rejected — both ship together; one named migration is clearer in the history.

---

## Open Items Remaining for Phase 1 / Tasks

None. All decisions sufficient to drive `/speckit-tasks`.
