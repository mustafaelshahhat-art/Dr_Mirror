# Tasks: Full-Stack Production Reality Hardening

**Input**: Design documents from `specs/003-production-reality-hardening/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Included — the spec requires new test coverage (T-1 through T-10, US-1…US-6 independent-test sections, AC-1…AC-12). Tests are first-class deliverables.

**Organization**: Tasks are grouped by user story so each P1 story can ship as an independent slice; P2/P3 follow.

**Format**: `[ID] [P?] [Story] Description (FR/spec refs)`
- `[P]` — can run in parallel with sibling `[P]` tasks (different files, no dependencies).
- `[Story]` — US1 / US2 / US3 / US4 / US5 / US6 (or `Foundation` / `Setup` / `Polish`).
- Every task lists the affected paths and a **Verify** line.

**Architectural guardrails (apply to every task)**:
- Preserve vertical-slice backend + feature-folder frontend (Principle V).
- Preserve admin/customer boundary; never weaken backend role/ownership checks (Principles I, III).
- Preserve COD vs Instapay/Wallet proof rules; never silently change them (Principle IV).
- Preserve Arabic RTL as primary + English LTR parity; new strings go to both `ar/*.json` and `en/*.json` (Principle II).
- Preserve payment-proof privacy: never route proof files through static-file middleware (Principle III, IV).
- Migrations are additive only.

---

## Phase 1 — Setup (Shared Infrastructure)

**Purpose**: Add the scaffolding the rest of the work needs (CI skeleton, frontend Sentry dependency, doc placeholders). No business behavior touched.

- [X] **T001** [Setup] Add `.github/workflows/ci.yml` skeleton (jobs `backend` on `windows-latest`, `frontend` on `ubuntu-latest`, both `if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main'`, concurrency group keyed on `github.ref`). No steps inside yet. *(FR-CI1)*
  **Verify**: `gh workflow list` shows `ci`; opening a draft PR triggers the empty workflow and it succeeds with both jobs reporting no-op.

- [X] **T002** [P] [Setup] Add `frontend/.nvmrc` pinning current LTS Node version. *(FR-CI6)*
  **Verify**: `node --version` inside frontend matches the file.

- [X] **T003** [P] [Setup] Add `@sentry/react` and `@sentry/vite-plugin` to `frontend/package.json` dependencies (regenerate `package-lock.json`). *(FR-O2)*
  **Verify**: `npm ci --prefix frontend` succeeds; the two packages appear in `package-lock.json`.

- [X] **T004** [P] [Setup] Create empty placeholder docs so links resolve early: `docs/PROJECT_MAP.md`, `docs/DEPLOY.md`, `docs/RUNBOOK.md`, `docs/BACKUP_RESTORE.md`, `docs/THREAT_MODEL.md` (each with title + one-line intent). *(FR-H7, FR-R3, FR-SEC10)*
  **Verify**: `git ls-files docs/` lists all five plus the existing `REDESIGN_AUDIT.md`.

- [X] **T005** [P] [Setup] Add new locale namespaces' top-level keys (empty objects allowed for now): `errors.json`, extend `admin.json` with `audit` key tree, in both `frontend/src/locales/ar/` and `frontend/src/locales/en/`. *(FR-F2, Principle II)*
  **Verify**: `npm run i18n:check --prefix frontend` is green.

---

## Phase 2 — Foundational (Blocks All User Stories)

**Purpose**: Database migration, audit writer, idempotency table, health-check framework, retention service plumbing, Sentry initialization. Until this phase is green nothing else can land.

### Database & domain

- [X] **T006** [Foundation] Add `Domain/Entities/AdminAuditLogEntry.cs` per `data-model.md` §3.1 (Id, ActorUserId, ActionType, TargetEntityType, TargetEntityId, PreviousStatus, NewStatus, CorrelationId, TimestampUtc). No constructors that allow mutation post-creation. *(FR-O7, data-model §3.1)*
  **Verify**: `dotnet build backend/src/DrMirror.Api` succeeds.

- [X] **T007** [Foundation] Add `Domain/Entities/OrderIdempotencyKey.cs` per `data-model.md` §3.2. *(FR-A6, R-2)*
  **Verify**: `dotnet build` succeeds.

- [X] **T008** [Foundation] Add `Infrastructure/Persistence/Configurations/AdminAuditLogEntryConfig.cs` (PK, FK to AspNetUsers, the three indexes from data-model §3.1). Register in `AppDbContext.OnModelCreating`. *(data-model §3.1)*
  **Verify**: `dotnet build` succeeds.

- [X] **T009** [Foundation] Add `Infrastructure/Persistence/Configurations/OrderIdempotencyKeyConfig.cs` (PK on Key, FKs to Orders and AspNetUsers with cascade, index `(UserId, CreatedAtUtc DESC)`). Register in `AppDbContext`. *(data-model §3.2)*
  **Verify**: `dotnet build` succeeds.

- [X] **T010** [Foundation] Add `FilePurgedAtUtc datetime2(7) NULL` to `Domain/Entities/PaymentProof.cs` and configure it in the existing `PaymentProofConfig` (no index). *(FR-D11, data-model §2.1)*
  **Verify**: `dotnet build` succeeds.

- [X] **T011** [Foundation] Verify `ProductVariant` has a `RowVersion` (timestamp) concurrency token configured. If absent, add `RowVersion byte[]` property + `.IsRowVersion()` config. *(FR-A5, R-1)*
  **Verify**: `dotnet build` succeeds; `AppDbContextModelSnapshot` reflects the property.

- [X] **T012** [Foundation] Create EF Core migration `M9_AdminAuditLog` covering: new `AdminAuditLogEntries` table, new `OrderIdempotencyKeys` table, `PaymentProof.FilePurgedAtUtc` column, filtered index `IX_Order_StatusTerminal_UpdatedAt` on `Order(Status, UpdatedAtUtc) WHERE Status IN ('Delivered','Cancelled')`, `RowVersion` on `ProductVariant` if T011 added it. **Additive only — no drops, no required-field changes.** *(R-20, Principle V)*
  **Verify**: `dotnet ef migrations script --idempotent` against a clean DB applies cleanly; round-trip `dotnet ef database update` against a fresh LocalDB succeeds.

### Audit writer (cross-cutting infrastructure)

- [X] **T013** [Foundation] Add `Shared/Auditing/IAdminAuditWriter.cs` with the `WriteAsync(...)` signature from `contracts/audit-log.md`. *(FR-O7, R-6)*
  **Verify**: interface compiles; not yet referenced anywhere.

- [X] **T014** [Foundation] Add `Shared/Auditing/AdminAuditWriter.cs` (Scoped). Pulls ActorUserId from `IHttpContextAccessor.User`, CorrelationId from `Activity.Current?.RootId ?? HttpContext.TraceIdentifier`, TimestampUtc from `TimeProvider.System.GetUtcNow()`. Append `AdminAuditLogEntry` to `AppDbContext` (no `SaveChangesAsync` — caller's transaction commits it). *(R-6)*
  **Verify**: unit test asserts row appended to `AppDbContext.AdminAuditLogEntries` and not yet persisted (caller controls SaveChanges).

- [X] **T015** [Foundation] Register `IAdminAuditWriter` + `IHttpContextAccessor` + `TimeProvider.System` in `Infrastructure/Extensions/AdminAuditServiceExtension.cs` (new file). Call from `Program.cs` in `AddApplicationServices()` chain. *(R-6)*
  **Verify**: `dotnet build` succeeds; DI resolution works in a smoke test.

### Health check framework

- [X] **T016** [Foundation] Add `Microsoft.AspNetCore.Diagnostics.HealthChecks` + `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore` NuGet packages to `DrMirror.Api.csproj`. *(FR-R1, R-8)*
  **Verify**: `dotnet restore` clean; packages appear in `obj/project.assets.json`.

- [X] **T017** [Foundation] Add `Shared/HealthChecks/SqlServerHealthCheck.cs` (cheap `SELECT 1` against `AppDbContext`, 2 s timeout). *(R-8, contracts/health.md)*
  **Verify**: stop SQL → check fails; restart SQL → check Healthy.

- [X] **T018** [P] [Foundation] Add `Shared/HealthChecks/FileStorageHealthCheck.cs` (delegates to `IFileStorageService` — Local: write-and-read tiny temp file; Cloudinary: HEAD on API root). *(R-8)*
  **Verify**: with `FileStorage__Provider=local`, simulate read-only `wwwroot/uploads` → Unhealthy; restore → Healthy.

- [X] **T019** [P] [Foundation] Add `Shared/HealthChecks/OutboxHealthCheck.cs` (count stuck-older-than-1h messages; thresholds via `HealthChecks__OutboxStuckThreshold`). *(R-8)*
  **Verify**: seed > 100 stuck outbox rows → Unhealthy.

- [X] **T020** [Foundation] Register health checks in `Program.cs`: `AddHealthChecks().AddCheck<SqlServerHealthCheck>("sqlserver").AddCheck<FileStorageHealthCheck>("filestorage").AddCheck<OutboxHealthCheck>("outbox")`. Map `/api/health/live`, `/api/health/ready`, retain alias `/api/health` → ready. Set `ResponseWriter` to the JSON shape in `contracts/health.md`. *(FR-R1, contracts/health.md)*
  **Verify**: `curl /api/health/live` 200; `curl /api/health/ready` 200 with three checks visible.

### Retention background service

- [X] **T021** [Foundation] Add `BackgroundServices/PaymentProofRetentionPurgeService.cs` (BackgroundService, daily tick, configurable interval). Scans `PaymentProof` where parent `Order.Status IN (Delivered, Cancelled)` AND `Order.UpdatedAtUtc < UtcNow.AddYears(-2)` AND `FileReference IS NOT NULL`. Calls `IFileStorageService.DeleteAsync` then sets `FileReference = null; FilePurgedAtUtc = UtcNow`. *(FR-D11, R-7)*
  **Verify**: with seeded old terminal order, run a single tick → file deleted, `FilePurgedAtUtc` set, log entry written.

- [X] **T022** [Foundation] Register `PaymentProofRetentionPurgeService` as a hosted service in `Program.cs`. Honor a feature flag (`Retention__EnableProofPurge`, default `true` in Production, `false` in Development unless explicitly enabled). *(FR-D11)*
  **Verify**: dev boot does not run the purge; production boot logs "PaymentProofRetentionPurgeService started".

### Frontend Sentry init

- [X] **T023** [Foundation] Add `frontend/src/shared/lib/sentry.ts` exporting `initSentry()` that reads `import.meta.env.VITE_SENTRY_DSN`, `MODE`, `VITE_APP_RELEASE`; no-ops on empty DSN; sets `tracesSampleRate: 0`; `beforeSend` drops PII (email/phone/address* keys, Authorization headers, proof URL fragments). *(FR-O2, R-10)*
  **Verify**: with empty DSN, no network calls in dev; with test DSN, `Sentry.captureMessage` reaches Sentry.

- [X] **T024** [Foundation] Call `initSentry()` at the top of `frontend/src/main.tsx` before React renders. *(FR-O2)*
  **Verify**: dev boot logs no Sentry warnings; deliberate error throws still show ErrorBoundary UI.

- [X] **T025** [Foundation] Wire `frontend/src/shared/components/ErrorBoundary.tsx` to call `Sentry.captureException(error, { contexts: { react: { componentStack } } })` inside `componentDidCatch`. Preserve the calm localized fallback UI. *(FR-O2)*
  **Verify**: existing `ErrorBoundary.test.tsx` still passes; new test mock asserts Sentry.captureException called.

### Configure Vite Sentry plugin

- [X] **T026** [Foundation] Add `@sentry/vite-plugin` to `frontend/vite.config.ts` guarded by `process.env.SENTRY_AUTH_TOKEN`. Upload source maps and tag the release with `VITE_APP_RELEASE` or the git SHA. *(R-10)*
  **Verify**: `npm run build` without `SENTRY_AUTH_TOKEN` succeeds without uploading; with it set in CI, source maps upload.

**Checkpoint**: All Foundation tasks complete → user-story phases (P1 first) can begin in parallel.

---

## Phase 3 — User Story 1: Production-Safe Access Boundaries (P1) 🎯 MVP

**Goal**: Every record/file/admin action reachable only by the entitled actor. Buyer↔buyer isolation, role enforcement on backend, payment-proof privacy, disabled-user token rejection, refresh-token reuse detection, role-escalation prevention.

**Independent Test**: Run the extended `backend/tests/DrMirror.Tests/Security/*` suite end-to-end; every negative-case scenario returns the documented status code and no leak.

### Tests first (failing) — write before implementation

- [X] **T027** [P] [US1] Add `backend/tests/DrMirror.Tests/Security/Ownership/OrderOwnershipTests.cs`: buyer A reads buyer B's order by guessing the order number → 404 ProblemDetails, body contains no order fields. *(FR-SEC1, US-1 AC-1)*
  **Verify**: test exists and fails (red) before T034.

- [X] **T028** [P] [US1] Add `backend/tests/DrMirror.Tests/Security/ProofFileAccess/ProofFileAccessTests.cs`: (a) anonymous GET `/uploads/payment-proofs/...` → 401; (b) non-owner buyer hits `/api/orders/{n}/proof/{id}/file` → 404; (c) owner → 200 stream; (d) admin → 200 stream. *(FR-SEC3, US-1 AC-2/3)*
  **Verify**: test exists and fails (where appropriate) before T035.

- [X] **T029** [P] [US1] Add `backend/tests/DrMirror.Tests/Security/DisabledUser/DisabledUserTokenTests.cs`: user disabled mid-session; next protected request with prior JWT → 401; refresh-token attempt → 401. *(FR-S3, US-1 AC-4)*
  **Verify**: red before T036–T037.

- [X] **T030** [P] [US1] Add `backend/tests/DrMirror.Tests/Security/RoleEnforcement/AdminEndpointRoleTests.cs`: every endpoint mapped in `Features/Admin/*Endpoints.cs` called with a buyer JWT → 403 ProblemDetails (no implementation-detail leak). Use reflection or a hand-curated list to assert ≥ N endpoints covered. *(FR-S4, FR-SEC2, US-1 AC-5)*
  **Verify**: red where any endpoint lacks `RequireAuthorization("AdminOnly")`.

- [X] **T031** [P] [US1] Add `backend/tests/DrMirror.Tests/Security/RoleEscalation/ProfileEditEscalationTests.cs`: buyer submits `PUT /api/users/me` with `roles: ["Admin"]`, `isDisabled: false`, `email: "x"` → response ignores those fields; DB row unchanged for those fields. *(FR-S6, US-1 AC-6)*
  **Verify**: red until T038.

- [X] **T032** [P] [US1] Add `backend/tests/DrMirror.Tests/Security/RefreshReuse/RefreshReuseTests.cs`: present a refresh token that has `RevokedAt` set → 401 + token family fully revoked (no chain member can refresh). *(FR-S2)*
  **Verify**: red until T039.

- [X] **T033** [P] [US1] Add `frontend/src/features/auth/auth-redirect.test.tsx`: signed-in admin lands on `/admin`; signed-in buyer lands on `/` (or `redirect` query target); buyer attempting `/admin/users` is bounced with the forbidden banner. *(FR-F7, US-1 AC of US-5 4/5)*
  **Verify**: `npm test --prefix frontend` shows red until T044.

### Implementation

- [X] **T034** [US1] Implement / verify ownership checks on every endpoint in `Features/Orders/*Endpoints.cs` and `Features/Addresses/*Endpoints.cs` so they filter `WHERE UserId = currentUserId` before returning; choose 404 ProblemDetails on miss (no existence leak). *(FR-SEC1, FR-S5)*
  **Verify**: T027 turns green.

- [X] **T035** [US1] Audit `Features/Orders/GetPaymentProofFile`: confirm static-file middleware short-circuit in `Program.cs` blocks `/uploads/payment-proofs/*` and the proof endpoint enforces (a) auth, (b) owner-or-admin, (c) returns 404 (not 403) for non-owner. *(FR-SEC3, IV constitution)*
  **Verify**: T028 green.

- [X] **T036** [US1] In `Infrastructure/Identity/JwtBearerSetup` (or equivalent), add a SecurityStamp claim to issued JWTs; in token validation, compare claim value to live `User.SecurityStamp` and reject on mismatch. *(FR-S3, R-3)*
  **Verify**: T029 partially green (post-disable rejection works).

- [X] **T037** [US1] In `Features/Admin/Users/DisableUser`: call `UserManager.UpdateSecurityStampAsync(user)` and set `IsDisabled = true` inside one transaction; emit `AdminAuditLogEntry` (`User.Disable`). Mirror for `EnableUser`. *(FR-S3, FR-O7)*
  **Verify**: T029 fully green.

- [X] **T038** [US1] In `Features/Auth/Me` / profile-update endpoint, replace any direct entity binding with an explicit DTO `UpdateMeRequest { DisplayName, Phone, PreferredLocale }`. Add FluentValidation rules; ignore extra JSON keys (System.Text.Json default behavior — verify, do not weaken). *(FR-S6, R-from-spec)*
  **Verify**: T031 green.

- [X] **T039** [US1] In `Features/Auth/Refresh`: detect presented refresh token where `RevokedAt IS NOT NULL` → revoke all tokens in the family (traverse `ReplacedByTokenId` or `FamilyId`); return 401 ProblemDetails. *(FR-S2, contracts/api-changes.md §5)*
  **Verify**: T032 green.

- [X] **T040** [US1] Audit every endpoint in `Features/Admin/*Endpoints.cs`: confirm `.RequireAuthorization("AdminOnly")` (or equivalent role policy) is applied. Add where missing. *(FR-S4, FR-SEC2)*
  **Verify**: T030 green.

- [X] **T041** [US1] Confirm `Cors__AllowedOrigins` + `AllowCredentials` + cross-site cookie (`Secure; HttpOnly; SameSite=None; Path=/`) behavior when `Auth__UseCrossSiteCookies=true`. Add integration test `backend/tests/DrMirror.Tests/Security/CookieAttributesTests.cs`. *(FR-S8, R-12)*
  **Verify**: test asserts the cookie header attributes against a configured WebApplicationFactory.

- [X] **T042** [P] [US1] Add backend audit-writer calls inside the same transaction as: order status change (`Features/Admin/Orders`), proof approve (`Features/Admin/Payments/Approve`), proof reject (`Features/Admin/Payments/Reject`), stock adjust (`Features/Admin/Catalog/*` where stock mutates), product/category CRUD, user role change. *(FR-O7, AC-11)*
  **Verify**: integration tests `Admin/Audit/AuditWriterTests` assert one audit row per mutation, with correct fields.

- [X] **T043** [P] [US1] Frontend: confirm `frontend/src/shared/lib/forbidden-store.ts` flags admin endpoints on 403 and `Header.tsx`/`ForbiddenBanner.tsx` render the localized message in both locales. *(FR-F6)*
  **Verify**: existing `Header.test.tsx`/`ForbiddenBanner.test.tsx` pass; no admin-only navigation appears for buyer-role tokens.

- [X] **T044** [US1] Frontend: update post-login routing in `frontend/src/features/auth/` so admin users land on `/admin` by default, buyers on `/` or `redirect` query target. *(FR-F7, R-17)*
  **Verify**: T033 green.

**Checkpoint**: US1 fully testable — security boundary suite green; admin endpoints role-enforced; payment-proof file privacy preserved; disabled-user / refresh-reuse / role-escalation negative cases all return documented codes.

---

## Phase 4 — User Story 2: Reliable Checkout & Inventory Under Pressure (P1)

**Goal**: Two parallel checkouts of last-stock variant — exactly one wins; double-submit — exactly one order; admin stock change vs in-flight checkout — no oversell; payment-proof stale guard preserved; EGP money round-trip exact.

**Independent Test**: New concurrency / idempotency tests in `backend/tests/DrMirror.Tests/Checkout/`.

### Tests first

- [X] **T045** [P] [US2] Add `backend/tests/DrMirror.Tests/Checkout/Concurrency/ParallelCheckoutTests.cs`: variant with stock = 1, 10 parallel `POST /api/checkout/orders` for two distinct buyers → exactly 1 success + 9 out-of-stock ProblemDetails; final stock = 0. *(FR-A5, AC-9, SC-009)*
  **Verify**: red until T050.

- [X] **T046** [P] [US2] Add `backend/tests/DrMirror.Tests/Checkout/Idempotency/IdempotencyKeyTests.cs`: same buyer + same `X-Idempotency-Key` twice → same order returned both times; DB has 1 order. Same key from a different buyer → 409 ProblemDetails. *(FR-A6, AC-10, SC-010, contracts/api-changes.md §1)*
  **Verify**: red until T051.

- [X] **T047** [P] [US2] Add `backend/tests/DrMirror.Tests/Checkout/MoneyRoundTripTests.cs`: order with line price `1234.56 EGP` → fetched via API → bytes match in DB → SPA-shaped DTO matches. Cover edge values (0.01, 9999.99). *(FR-D4)*
  **Verify**: red until T052.

- [X] **T048** [P] [US2] Add `backend/tests/DrMirror.Tests/Orders/ProofValidation/ProofUploadValidationTests.cs`: 6 MB file → 413; `.exe` renamed to `.jpg` → 415 (magic-bytes); valid 4 MB JPEG → 200. *(FR-SEC5, R-5)*
  **Verify**: red until T054–T055.

- [X] **T049** [P] [US2] Add `frontend/src/features/orders/ProofUpload.test.tsx`: file picker rejects 6 MB selection client-side with localized error in `ar` and `en`; file picker rejects `.exe`. *(FR-F8)*
  **Verify**: red until T056.

### Implementation

- [X] **T050** [US2] In `Features/Checkout/CreateOrder/Handler.cs`: wrap stock-decrement + order insert + counter increment in a single EF Core transaction with retry-on-`DbUpdateConcurrencyException` (max 3 retries, tiny exponential backoff). Confirm `ProductVariant.RowVersion` enforcement. *(FR-A5, R-1)*
  **Verify**: T045 green; existing checkout tests still pass.

- [X] **T051** [US2] In `Features/Checkout/CreateOrder/Endpoint.cs`: accept `X-Idempotency-Key` header; insert/lookup against `OrderIdempotencyKeys` in the same transaction as order creation; behavior per `contracts/api-changes.md` §1. *(FR-A6, R-2)*
  **Verify**: T046 green.

- [X] **T052** [US2] Audit EF Core configuration: every money-typed property on `Order`, `OrderItem`, `Product`, `ProductVariant`, `PaymentMethod` uses `HasColumnType("decimal(18,2)")` (or the existing project standard). Backfill via `Infrastructure/Persistence/Configurations` if any are missing. **Schema change only if a column was wrong** — verify safe via `dotnet ef migrations add` dry-run; if the project standard is already in place, ship as a no-op verification task. *(FR-D4)*
  **Verify**: T047 green.

- [X] **T053** [P] [US2] Verify stale-proof guard: parent order in `PendingPaymentReview` already has an active proof → new upload attempt rejected by existing guard (already in repo per memory). Extend test if not yet present. *(spec edge-cases, IV constitution)*
  **Verify**: test in `backend/tests/DrMirror.Tests/Orders/StaleProofGuardTests.cs` green.

- [X] **T054** [US2] In `Features/Orders/UploadPaymentProof/Endpoint.cs`: enforce `Content-Length ≤ 5 MiB` → 413 ProblemDetails. *(FR-SEC5, contracts §2)*
  **Verify**: T048 partially green (size case).

- [X] **T055** [US2] In the same handler: enforce declared `Content-Type ∈ {image/jpeg, image/png, application/pdf}` AND verify magic bytes of first 16 bytes of the upload stream; mismatch → 415. *(FR-SEC5, R-5)*
  **Verify**: T048 fully green.

- [X] **T056** [US2] Frontend `frontend/src/features/orders/ProofUploadForm.tsx`: set `accept=".jpg,.jpeg,.png,.pdf"`; client-side size check; localized error messages from `orders.json` / `errors.json` in both locales. *(FR-F8)*
  **Verify**: T049 green; manual upload of 6 MB file shows the localized error before any network call.

- [X] **T057** [P] [US2] Frontend `frontend/src/features/checkout/CheckoutReviewPage.tsx`: generate a per-session `X-Idempotency-Key` (UUID v4) and attach to the order-creation request via `shared/lib/api-client.ts`. Disable the submit button while in-flight. *(FR-A6, FR-F8)*
  **Verify**: clicking submit twice quickly produces exactly one network request; backend has one order.

**Checkpoint**: US2 fully testable — parallel checkout proves no oversell, double-submit produces exactly one order, money round-trips exact, proof uploads enforce 5 MB / JPEG-PNG-PDF.

---

## Phase 5 — User Story 3: Production-Real Deployment & Configuration (P1)

**Goal**: A second operator can deploy end-to-end from `README` + `docs/`; startup fail-fast on missing critical config; secrets never in repo; documented smoke check.

### Tests first

- [X] **T058** [P] [US3] Add `backend/tests/DrMirror.Tests/Startup/StartupValidationTests.cs`: boot the API in a Production-like host with each of the documented critical configs missing in turn (`Jwt__Secret`, `ConnectionStrings__Default`, `Cors__AllowedOrigins`, `FileStorage__Cloudinary*` when provider=cloudinary, `Email__Smtp*` when provider=mailkit). Each must throw `InvalidOperationException` with a message naming the missing key. *(FR-H4)*
  **Verify**: red until T060.

### Implementation

- [X] **T059** [P] [US3] Extend `.gitignore` to cover `appsettings.Development.json`, `appsettings.Local.json`, `.env*`, `wwwroot/uploads/`, `logs/` (any missing). *(FR-H5)*
  **Verify**: `git check-ignore` returns those paths.

- [X] **T060** [US3] In `Program.cs`, extend the existing Production fail-fast block to cover: `Jwt__Secret` (≥ 64 chars), `FileStorage__Cloudinary{CloudName,ApiKey,ApiSecret}` when provider=cloudinary, `Email__{FromAddress,SmtpHost,SmtpPort,SmtpUsername,SmtpPassword}` when provider=mailkit. Each failure throws a precise `InvalidOperationException`. *(FR-H4, R-18)*
  **Verify**: T058 green.

- [X] **T061** [P] [US3] Write `docs/PROJECT_MAP.md` (architecture overview, slice map, environments, env vars index, link tree to the four siblings). *(FR-H7, R-15)*
  **Verify**: README links resolve; doc renders cleanly on GitHub.

- [X] **T062** [P] [US3] Write `docs/DEPLOY.md` covering Vercel frontend deploy, MonsterASP.NET backend deploy, env-var checklist, migration step, smoke check (the one from `quickstart.md` §5). *(FR-H1, FR-H2, FR-H6, FR-H7)*
  **Verify**: a second operator can deploy to staging from this doc alone.

- [X] **T063** [P] [US3] Update `README.md` to link `docs/PROJECT_MAP.md` (resolving the existing dangling reference) and the four new docs. *(FR-H7)*
  **Verify**: all README links resolve.

- [X] **T064** [P] [US3] Update `backend/src/DrMirror.Api/appsettings.Example.json` to include placeholder keys for any new settings (`HealthChecks__OutboxStuckThreshold`, `Retention__EnableProofPurge`, `Retention__ProofPurgeIntervalHours`). *(FR-H4, FR-H7)*
  **Verify**: `dotnet run` with this file as base + user-secrets boots successfully.

- [X] **T065** [US3] Verify production error responses contain no stack traces. In `Program.cs`, confirm `UseExceptionHandler` + ProblemDetails do not include `exception.stackTrace` or implementation-internal field names in production. Add `backend/tests/DrMirror.Tests/Infrastructure/ProductionErrorShapeTests.cs`. *(FR-SEC8, US-3 AC-7)*
  **Verify**: test asserts no `stackTrace` / `exception` keys in any error response under Production-env factory.

**Checkpoint**: US3 fully testable — new operator dry-run validates DEPLOY.md, startup fail-fast tests green, no secrets committed, env-var index complete.

---

## Phase 6 — User Story 4: Observability, Recovery & Operational Runbook (P2)

**Goal**: When something fails, an operator can diagnose, recover, and follow a documented runbook. Background services degrade visibly. Frontend errors captured. Customer error copy calm + localized.

### Tests first

- [X] **T066** [P] [US4] Add `backend/tests/DrMirror.Tests/HealthChecks/Readiness/ReadinessHealthTests.cs`: DB down → `/api/health/ready` returns 503 with `sqlserver: Unhealthy`. *(FR-R1, US-4 AC-1, AC-7)*
  **Verify**: red until T020 took effect; if Phase 2 done, the test wires up here.

- [X] **T067** [P] [US4] Add `backend/tests/DrMirror.Tests/Email/OutboxContentionTests.cs`: two `EmailOutboxProcessor` instances racing on the same queue dispatch each message exactly once (lease behavior). *(FR-LB4, R-9, AC of US-6)*
  **Verify**: red until existing M8 lease behavior validated.

- [X] **T068** [P] [US4] Add `backend/tests/DrMirror.Tests/RateLimit/ProblemDetailsRateLimitTests.cs`: trigger 429 on login + register + inquiry + proof upload — response is ProblemDetails-shaped with `Retry-After` header where the policy provides it. *(FR-RL2, FR-RL4)*
  **Verify**: red until T070.

### Implementation

- [X] **T069** [P] [US4] Write `docs/RUNBOOK.md` covering scenarios S1–S7 per `contracts/runbook.md`. *(FR-R3)*
  **Verify**: each of the seven scenarios contains Symptoms / First-line check / Likely causes / Recovery steps / Verification / Follow-up.

- [X] **T070** [US4] In `Program.cs` or the rate-limiter middleware, register a `OnRejected` handler that writes ProblemDetails + `Retry-After` for 429 responses. *(FR-RL2)*
  **Verify**: T068 green.

- [X] **T071** [P] [US4] In `Infrastructure/Email/EmailOutboxProcessor.cs`: confirm persistent-failure logging at Warning when a message exceeds N retries; confirm the host does not crash on transient failure. Add `Email/OutboxFailureLoggingTests.cs`. *(FR-O3, FR-C3)*
  **Verify**: simulated MailKit throw → log captured at Warning, host still running.

- [X] **T072** [P] [US4] Frontend `frontend/src/shared/components/QueryErrorState.tsx`: confirm copy is localized in both locales and includes retry CTA; extend tests to cover both locales. *(FR-F11, FR-O6)*
  **Verify**: `npm test --prefix frontend` covers `ar` + `en` snapshots.

- [X] **T073** [P] [US4] Frontend: add a global downtime banner that appears when an API call fails with network-level error or 503; localized; uses existing `ContactSupportLink`. *(FR-R6)*
  **Verify**: stop the backend, refresh the SPA, banner visible in both locales.

- [X] **T074** [P] [US4] Write `docs/BACKUP_RESTORE.md`: procedure for hourly backup, retention window, restore command on MonsterASP.NET-class host, quarterly drill cadence. RPO ≤ 1 h, RTO ≤ 2 h. *(FR-D9, FR-R2)*
  **Verify**: a dry-run restore drill against staging completes within RTO.

- [X] **T075** [P] [US4] Write `docs/THREAT_MODEL.md`: STRIDE-style threats for checkout, payment-proof review, admin catalog editing, user-role management; list trust boundaries and mitigations. *(FR-SEC10)*
  **Verify**: doc reviewed for completeness against `spec.md` §Security & Access-Control Requirements.

- [X] **T076** [P] [US4] Add admin audit query endpoints `GET /api/admin/audit` and `GET /api/admin/audit/{id}` in `Features/Admin/Audit/AuditQueryEndpoints.cs`, with pagination + filters per `contracts/audit-log.md`. Backend integration tests in `backend/tests/DrMirror.Tests/Admin/Audit/AuditQueryTests.cs`. *(FR-O7, contracts/audit-log.md)*
  **Verify**: integration tests green; admin-only enforcement asserted.

- [X] **T077** [P] [US4] Build `frontend/src/features/admin/audit/AuditLogPage.tsx` + supporting hooks; add nav entry to `adminNav.ts`. Localized strings in `admin.json` audit subtree. *(FR-O7)*
  **Verify**: page renders newest-first; filters wire to query params; deep-link to target entity works.

- [X] **T078** [US4] Add `backend/tests/DrMirror.Tests/Retention/ProofPurge/ProofPurgeServiceTests.cs`: seed an old terminal order with a proof; run a single tick; assert `FilePurgedAtUtc` set, file gone, parent order intact. *(FR-D11, SC-015)*
  **Verify**: test green; service idempotent on second tick.

**Checkpoint**: US4 fully testable — readiness probe + runbook + audit log + retention purge + 429 ProblemDetails + outbox contention all verified.

---

## Phase 7 — User Story 5: UX, i18n & Accessibility Parity (P2)

**Goal**: Every page renders correctly in all four (theme × direction) states. Skeletons, empty states, error retry states. Duplicate-submit guards. Localized validation. WCAG AA contrast.

### Tests / checks first

- [X] **T079** [P] [US5] Re-run `npm run i18n:check --prefix frontend` and resolve any missing keys introduced by US1–US4 work. Add CI-level guard via T086. *(FR-F2, Principle II)*
  **Verify**: i18n:check exits zero.

- [X] **T080** [P] [US5] Add `frontend/src/features/catalog/ProductDetail.fourstate.test.tsx`: render product detail in (dark, RTL), (dark, LTR), (light, RTL), (light, LTR); assert layout direction, alt text presence, focus order. *(FR-F1, FR-F3, FR-F5, FR-F9)*
  **Verify**: red until UI passes; green afterward.

- [X] **T081** [P] [US5] Add `frontend/src/features/admin/AdminOrderDetail.fourstate.test.tsx`: same four-state coverage for the admin order detail page. *(FR-F3, FR-F6)*
  **Verify**: green.

### Implementation

- [X] **T082** [P] [US5] Audit list pages (`features/catalog/CatalogPage`, `features/orders/MyOrdersPage`, `features/admin/Admin*Page`) and confirm: loading uses `Skeleton`; error uses `QueryErrorState` with retry; empty uses a shared `EmptyState` component (introduce one in `shared/components/EmptyState.tsx` if absent). *(FR-F11)*
  **Verify**: every list page shows the three intentional states; visual screenshots reviewed in all four (theme × direction) combos.

- [X] **T083** [P] [US5] Audit forms (login, register, address, checkout, proof upload, admin CRUD, inquiry): localized validation messages, keyboard navigation, focus management on submit/error, **submit-button disabled while in-flight**. *(FR-F8)*
  **Verify**: each form click-twice test produces exactly one request.

- [X] **T084** [P] [US5] Audit product detail page: aspect ratio, alt text from product/variant data, lazy loading via `loading="lazy"`, fallback image when missing. *(FR-F9)*
  **Verify**: visual review + DOM assert in `ProductDetail.fourstate.test.tsx`.

- [X] **T085** [P] [US5] Audit checkout: localized text differentiates COD ("No proof required") from Instapay/Wallet ("Upload proof to confirm"). No business rule change. *(FR-F10, IV constitution)*
  **Verify**: visual review + assertion in `CheckoutPaymentStep.test.tsx`.

**Checkpoint**: US5 fully testable — all surfaces pass four-state visual review, i18n parity green, forms guarded against duplicate submit, COD/Instapay copy explicit.

---

## Phase 8 — User Story 6: CI, Caching, Scaling Readiness & Performance (P3)

**Goal**: CI runs on every PR; backend stateless except SQL+storage; outbox lease verified under contention; catalog reads cached safely with `Vary: Accept-Language`; admin/cart/auth never cached unsafely; admin list pagination indexed.

### CI

- [X] **T086** [US6] Add CI polish on top of the Phase-1 workflow body (see **T099**). T086 covers only the **Phase-8 add-ons** to `.github/workflows/ci.yml`:
  - Conditional `npm run lint --prefix frontend` step (skipped if no `lint` script is defined).
  - Conditional opt-in perf-smoke job that runs `dotnet test` with `DRMIRROR_PERF_SMOKE=1` filter when the workflow is dispatched manually with that input.
  - Sentry release-tag + source-map upload step on `push` to `main` only (see **T109** for env-var wiring).
  *(FR-CI7 add-ons; main contract delivered by T099 — FR-CI1–CI6)*
  **Verify**: lint step skips cleanly when absent, runs when present; perf job appears only on `workflow_dispatch` with the input set; Sentry source-map upload runs only on `push: main` with `SENTRY_AUTH_TOKEN` available.

### Caching & headers

- [X] **T087** [P] [US6] Add response cache headers in catalog endpoints (`GET /api/catalog/products`, `GET /api/catalog/products/{slug}`, `GET /api/catalog/categories`): `Cache-Control: public, max-age=60, stale-while-revalidate=300`, `Vary: Accept-Language`. *(FR-CA2, FR-CA3, FR-CA5, R-14)*
  **Verify**: `curl -i` confirms headers; integration test asserts presence.

- [X] **T088** [P] [US6] Confirm `Cache-Control: private, no-store` (or `no-store`) on all `/api/orders/*`, `/api/cart/*`, `/api/addresses/*`, `/api/auth/*`, `/api/admin/*`, `/api/health/*`. Add `Infrastructure/CacheHeadersTests.cs`. *(FR-CA4)*
  **Verify**: test green.

- [X] **T089** [P] [US6] In React Query defaults (`frontend/src/main.tsx` or query-client setup), set per-feature `staleTime`/`gcTime` per `research.md` §R-14. Invalidate catalog queries on admin product/category/image mutations. *(FR-CA1, FR-CA2)*
  **Verify**: changing a product as admin causes the storefront query cache to invalidate on next subscriber.

### Scaling readiness

- [X] **T090** [P] [US6] Index audit & migration if needed: confirm/add `Product(CategoryId, IsActive, CreatedAtUtc DESC)`, `Order(UserId, CreatedAtUtc DESC)`, `Order(Status, CreatedAtUtc DESC)`. If any are missing, ship as **additive** migration `M10_IndexAudit`. *(FR-LB6, FR-D2, R-13)*
  **Verify**: query plans for catalog list and admin order list use the new index; p95 measurement on warm-cache local run ≤ 500 ms (FR-LB7).

- [X] **T091** [P] [US6] Add backend perf smoke test `backend/tests/DrMirror.Tests/Catalog/CatalogPerfSmokeTests.cs`: warm-cache catalog list + product detail server response time recorded; assert p95 ≤ 500 ms over a small N (e.g., 50 calls). Opt-in via env var `DRMIRROR_PERF_SMOKE=1` so it does not slow regular CI. *(FR-LB7, SC-013)*
  **Verify**: opt-in run green locally and on a staging host.

- [X] **T092** [P] [US6] Confirm pagination + max page size on every admin list endpoint (`/api/admin/orders`, `/api/admin/products`, `/api/admin/users`, `/api/admin/inquiries`, `/api/admin/audit`). Document max page size = 100. *(FR-LB6)*
  **Verify**: integration tests cover `pageSize > 100` → clamped or 400.

**Checkpoint**: US6 fully testable — CI green on PRs, catalog cached and `Vary`-safe, admin/cart/auth `no-store`, indexes back the hot paths, perf smoke confirms p95 ≤ 500 ms.

---

## Phase 9 — Polish & Cross-Cutting Acceptance

**Purpose**: Final checks that span stories, plus the documented post-deploy validations.

- [X] **T093** [P] [Polish] Run `quickstart.md` §3 locally end-to-end (proof validation, idempotency, access boundaries, health readiness, audit log, Sentry). Capture results in `specs/003-production-reality-hardening/QUICKSTART_LOG.md` (gitignored or transient). *(quickstart §3)*
  **Verify**: every checklist item ticked.

- [X] **T094** [P] [Polish] Run `quickstart.md` §6 — operator runbook drill (S1–S7) against staging without consulting the original author. Patch RUNBOOK.md for any improvisation needed. *(AC-5)*
  **Verify**: all seven scenarios resolved using only `docs/RUNBOOK.md`.

- [X] **T095** [P] [Polish] Run `quickstart.md` §7 — backup/restore drill: take a backup, restore to a parallel DB, point a sandbox API at it, measure restore time. *(AC-4, FR-D9)*
  **Verify**: restore time ≤ 2 hours; ready endpoint Healthy on the drill DB.

- [X] **T096** [Polish] Run frontend visual review of every page in all 4 (theme × direction) states on a staging build with Sentry pointing at the staging project. *(FR-F1–F12, AC-6)*
  **Verify**: screenshots captured; any visual regression filed as a follow-up issue, not a blocker unless WCAG AA contrast or layout breakage.

- [X] **T097** [Polish] Final consistency sweep: every FR in `spec.md` has at least one task above (or is explicitly preserved-as-is via an existing test). Update this file with `(verified-preserved)` notes if so. *(AC-1)*
  **Verify**: traceability matrix in `tasks.md` covers FR-F1…F12, FR-A1…A10, FR-D1…D11, FR-S1…S9, FR-H1…H8, FR-C1…C6, FR-CI1…CI7, FR-SEC1…SEC10, FR-RL1…RL5, FR-CA1…CA5, FR-LB1…LB7, FR-O1…O7, FR-R1…R8.

- [X] **T098** [Polish] Pre-merge review against `.specify/memory/constitution.md` v1.0.0. Confirm no Principle I–IV (NON-NEGOTIABLE) drift. Note Principles V–VII evidence in PR description. *(constitution §Governance / Compliance review)*
  **Verify**: PR description names the principles touched; reviewer signs off.

---

---

## Phase 1.5 — Analyze Remediation Additions (T099–T117)

**Purpose**: Close gaps identified by `/speckit-analyze`. These tasks add coverage for FRs the original task set under-specified or missed. Most belong logically to **Phase 1 / Phase 2**; some are scoped to the user story they support. The phase tag in each task indicates effective ordering.

### High-severity additions (block P1)

- [X] **T099** [Setup/CI — Phase 1, replaces deferred T086 body] Fill out the CI workflow body in `.github/workflows/ci.yml` **before any P1 implementation begins** so security/concurrency tests added in Phases 3–5 actually gate merges:
  - `backend` job (`windows-latest`): `actions/checkout@v4` → `actions/setup-dotnet@v4` (10.0.x) → `dotnet restore backend/DrMirror.slnx` → `dotnet build --configuration Release --no-restore` → `dotnet test --configuration Release --no-build --logger "trx;LogFileName=test_results.trx"`. Conditional re-run with SQL filter when `secrets.DRMIRROR_TEST_SQL_CONNECTION` is set; skipped cleanly otherwise.
  - `frontend` job (`ubuntu-latest`): `actions/checkout@v4` → `actions/setup-node@v4` with `.nvmrc` → `npm ci --prefix frontend` → `npm run build --prefix frontend` (TypeScript + Vite) → `npm test --prefix frontend -- --run` → `npm run i18n:check --prefix frontend`.
  - Triggers: `pull_request` against `main` + `push` to `main`. Concurrency group keyed on `github.ref` cancels older runs.
  *(H1 fix; FR-CI1–CI6, FR-CI7 partial, R-11)*
  **Verify**: Open a PR with a deliberately failing test → CI red. Open a clean PR → both jobs green inside ≤ 10 min (SC-002). Absent `DRMIRROR_TEST_SQL_CONNECTION` → SQL step skipped, not failed.

- [X] **T100** [P] [Setup/Docs — Phase 1] Document branching and release rules in `docs/PROJECT_MAP.md`: feature branches off `main`, PR-with-green-CI required before merge, no force-push to `main` without explicit reason, conventional commit prefix optional, release tagging convention. *(H2 fix; FR-CI5)*
  **Verify**: Section exists in PROJECT_MAP.md and is referenced from README; a new contributor can follow it without ambiguity.

- [X] **T101** [Foundation/Security — Phase 2] Audit Serilog configuration for secret/PII leakage and add enforcement:
  - Review every `Log.{Information,Warning,Error}(...)` template in `Features/Auth/*`, `Features/Admin/*`, `Features/Checkout/*`, `Features/Orders/UploadPaymentProof/*` for any `{Password}`, `{Token}`, `{Secret}`, `{Authorization}`, full-body, or full-file-path interpolation.
  - Register a Serilog `Destructure.ByTransforming<HttpRequest>` (or equivalent) that scrubs `Authorization`, `Cookie`, and `X-Idempotency-Key` headers; add a `Filter.ByExcluding` for any log event whose properties contain `password`/`secret`/`token`/`apiKey` (case-insensitive).
  - Add `backend/tests/DrMirror.Tests/Observability/LogSecretScrubbingTests.cs`: simulate an auth flow and a proof upload; assert no captured log line contains the secret/payload.
  *(H3 fix; FR-O4, FR-SEC4 cross-reference)*
  **Verify**: Test green; manual `dotnet run` with sample login produces zero log lines containing the password.

- [X] **T102** [P] [US2/Admin — Phase 4] Add `backend/tests/DrMirror.Tests/Admin/Catalog/AdminCatalogValidationTests.cs` covering negative cases for Product/Category/Variant/Image create+update:
  - Empty/whitespace slug → 400.
  - Duplicate slug → 409 (unique constraint).
  - Negative or zero price → 400.
  - Negative stock → 400.
  - Missing required category for product → 400.
  - Image upload exceeding declared size cap → 413.
  - Image upload of wrong MIME → 415 (magic-bytes check, mirrored from T055 for product images if not already in place).
  *(H4 fix; FR-A8)*
  **Verify**: All negative cases return the documented ProblemDetails status; happy-path admin CRUD still green.

- [X] **T103** [Foundation/Resilience — Phase 2] Add timeouts and bounded retries to all external service calls:
  - `Infrastructure/Storage/CloudinaryFileStorageService`: configure a typed `HttpClient` (or Cloudinary SDK option) with a **10 s** total timeout and a Polly retry policy (3 attempts, exponential backoff jitter). On exhaustion, throw a typed `ExternalServiceUnavailableException`.
  - `Infrastructure/Email/MailKitEmailSender`: set `SmtpClient.Timeout = 15_000` for connect and send; the outbox already retries (M8), but ensure persistent-failure logging fires at Warning level after N attempts.
  - Add `backend/tests/DrMirror.Tests/Infrastructure/ExternalServiceTimeoutTests.cs` using a slow test double to confirm timeout fires and translates to a clean ProblemDetails (where invoked synchronously) or a logged failure (where async).
  *(H5 fix; FR-C4)*
  **Verify**: Test green; manual fault injection (Cloudinary unreachable) returns a localized 503 to admin without crashing the host.

### Medium-severity additions

- [X] **T104** [P] [US5/Frontend — Phase 7] Add `frontend/src/shared/lib/api-client.rate-limit.test.tsx`: simulate a 429 ProblemDetails response with `Retry-After` and assert the SPA renders the localized rate-limit toast (or inline message) in both `ar` and `en` locales. *(M1 fix; FR-RL3)*
  **Verify**: Test green in both locale snapshots; no raw English "Too Many Requests" leaks into Arabic mode.

- [X] **T105** [P] [Setup/Docs — Phase 1] Add the canonical breakpoint enumeration (`sm 640, md 768, lg 1024, xl 1280, 2xl 1536`) to `docs/PROJECT_MAP.md` and reference it from the design tokens section. *(M2 fix; FR-F4)*
  **Verify**: Section exists; visual review of representative pages confirms no horizontal overflow at any breakpoint.

- [X] **T106** [P] [Setup — Phase 1] Verify `frontend/scripts/i18n-check.ts` enumerates locale namespaces dynamically (reads filenames in `locales/ar/` and compares to `locales/en/`). If the namespace list is hard-coded, update the script to read directories. Confirm the new `errors.json` namespace introduced by T005 is detected. *(M3 fix; FR-F2)*
  **Verify**: `npm run i18n:check --prefix frontend` continues to pass after adding/removing a namespace file; `git diff` of the script shows dynamic enumeration.

- [X] **T107** [P] [Foundation — Phase 2] Audit migration `M9_AdminAuditLog` after T012 generation: confirm it contains all six index/column additions enumerated in `data-model.md` §2.2 + §2.3 + §3.* (admin audit table, idempotency table, `FilePurgedAtUtc`, three Order/Product indexes, `RowVersion` if T011 added it). For any index already present from a prior migration, the M9 `Up()` MUST be a safe no-op. **There is no M10.** *(M4 fix; data-model §2.2/§2.3, research §R-20)*
  **Verify**: `dotnet ef migrations script` against a fresh DB shows all six indexes; against a DB with prior partial indexes shows no-op for already-present ones.

- [X] **T108** [P] [US4/Backend — Phase 6] Implement EmailOutboxMessage 90-day archival/purge:
  - Either extend `EmailOutboxProcessor` with a daily archive step OR add a dedicated `EmailOutboxRetentionService : BackgroundService` that purges/archives rows where `DispatchedUtc IS NOT NULL AND DispatchedUtc < UtcNow.AddDays(-90)`.
  - Configurable via `Retention__OutboxRetentionDays` (default 90).
  - Test: `backend/tests/DrMirror.Tests/Email/OutboxRetentionTests.cs` seeds an old dispatched row, runs a tick, asserts row purged.
  *(M6 fix; FR-D11)*
  **Verify**: Test green; production `EmailOutboxMessage` row count stays bounded over time.

- [X] **T109** [P] [CI/Sentry — Phase 8] Wire Sentry build-time env vars into the CI production build:
  - On `push: main` (or release tag), the frontend job sets `VITE_SENTRY_DSN` (from `secrets.SENTRY_DSN`), `VITE_APP_RELEASE` (from `${{ github.sha }}` or release tag), and `SENTRY_AUTH_TOKEN` (from `secrets.SENTRY_AUTH_TOKEN`).
  - Source-maps upload via `@sentry/vite-plugin` happens automatically when those vars are set (per T026).
  - On `pull_request`, the vars stay empty so no Sentry events fire from PR builds.
  *(M7 fix; FR-O2 production path)*
  **Verify**: A push to `main` produces a Sentry release with source maps attached; a PR build produces no Sentry release.

### Low-severity additions

- [X] **T110** [P] [Polish/Docs — Phase 9] Add a "UI System Discipline" subsection to `docs/PROJECT_MAP.md` listing the review-time rule: HeroUI v3 components only; no second design system; no raw HTML controls when a HeroUI equivalent exists; Lucide is the only icon set. *(L1 fix; FR-F12)*
  **Verify**: Section exists; cited from CONTRIBUTING-style guidance in README.

- [X] **T111** [P] [US5 — Phase 7, optional] Add an `axe-core` Vitest integration that runs against rendered snapshots of: storefront product detail, checkout review, admin order detail, admin product edit. Fail the test on any WCAG 2.1 AA violation. *(L2 fix; FR-F5)*
  **Verify**: `npm test --prefix frontend` includes the axe assertion suite; deliberate contrast regression fails the test.

- [X] **T112** [P] [US3 — Phase 5, optional] Add an opt-in CI guard `npm run check:endpoint-tests` (or a small script in `backend/tests/`) that enumerates every endpoint mapped in `Features/*Endpoints.cs` and asserts at least one matching integration test by name pattern. Run only on `workflow_dispatch` initially. *(L4 fix; FR-A1)*
  **Verify**: Script exists; deliberate "remove a test for endpoint X" causes it to fail.

- [X] **T113** [P] [Setup — Phase 1] Add `backend/global.json` pinning the exact .NET 10 SDK version currently in use, so dev and CI cannot drift. *(L5 fix; FR-CI6)*
  **Verify**: `dotnet --list-sdks` matches the pinned version; CI `setup-dotnet@v4` honors the file.

- [X] **T114** [P] [US3/Docs — Phase 5] In `docs/DEPLOY.md`, add a "Post-deploy synthetic monitor setup" section documenting how to point a 1-minute synthetic check (e.g., BetterStack, UptimeRobot, or the host's built-in monitor) at `/api/health/ready`, with alert thresholds (3 consecutive failures = page; single `Unhealthy` = page; `Degraded` for ≥ 5 min = notify). *(L6 fix; FR-R8)*
  **Verify**: Section exists; an operator can configure the monitor end-to-end from the doc alone.

- [X] **T115** [P] [US1 — Phase 3] Audit `backend/tests/DrMirror.Tests/Identity/` (and adjacent Auth tests) and confirm explicit coverage for: login (success + invalid password + locked + disabled), register (success + duplicate email + weak password), refresh (success + reuse detection — already T032), logout (success + token invalidation). Add tests for any missing branch. *(L7 fix; FR-S7)*
  **Verify**: Coverage matrix recorded in test class summary; every branch named above has a green test.

- [X] **T116** [P] [US3/Docs — Phase 5] Add a "Migration Safety Policy" section to `docs/PROJECT_MAP.md`: forward-only, additive, no required-field additions to existing rows without a default, destructive steps gated by explicit justification in the migration file + user authorization. *(L8 fix; FR-D10)*
  **Verify**: Section exists; referenced in the PR template (or PROJECT_MAP.md) as a checklist item.

- [X] **T117** [P] [US6/Docs — Phase 8] In `docs/DEPLOY.md`, add a "Staging performance smoke check" step: before promoting to production, run `DRMIRROR_PERF_SMOKE=1 dotnet test` against staging-hosted API and confirm p95 ≤ 500 ms for catalog list and product detail. *(L9 fix; FR-LB7, SC-013)*
  **Verify**: DEPLOY.md step exists; an operator can execute it from the doc.

**Checkpoint (Phase 1.5)**: All HIGH gaps closed before P1 begins; MEDIUM/LOW gaps closed alongside their parent phase. Re-run `/speckit-analyze` to confirm coverage moves to ≥ 95% strict-explicit.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no deps. **Must also complete T099 (CI body), T100, T105, T106, T113 from Phase 1.5 before P1 starts** so CI gates merges from the very first P1 task.
- **Phase 1.5 (Analyze Remediation)**: T099–T117. Each task carries its own effective-phase tag; HIGH-severity (T099–T103) lands inside Phase 1 / Phase 2; MEDIUM (T104–T109) inside the parent user-story phase; LOW (T110–T117) inside the parent phase or Phase 9. No new global blocker beyond the HIGH set.
- **Phase 2 (Foundation)**: depends on Phase 1. **Blocks every user story** — migration M9, audit writer, idempotency table, health checks, retention service, Sentry init, secret-scrubbing audit (T101), external-service timeouts (T103) are all consumed downstream.
- **Phase 3 (US1, P1)**: starts after Phase 2.
- **Phase 4 (US2, P1)**: starts after Phase 2; independent of US1 (different files / different test folders) so US1 and US2 can run in parallel with two developers.
- **Phase 5 (US3, P1)**: starts after Phase 2; mostly independent of US1/US2.
- **Phase 6 (US4, P2)**: starts after Phase 2; some tasks (audit query endpoints, runbook) depend on Phase 2 audit writer; can largely run alongside US1–US3.
- **Phase 7 (US5, P2)**: starts after Phase 2; touches frontend mostly independent of US1–US4 (with i18n keys added by other stories merged in).
- **Phase 8 (US6, P3)**: starts after Phase 2 but CI workflow (T086) benefits from having other tests in place to actually exercise; can land at any point after T001.
- **Phase 9 (Polish)**: depends on all user stories complete.

### Within each story

- Tests are written **first** (red) before their corresponding implementation tasks.
- Models / EF configs / migrations before services that use them (handled in Phase 2).
- Services before endpoints that call them.
- Backend behavior before frontend wiring.
- Both locales for any new user-visible string before the merge.

### Parallel opportunities

- **All `[P]` tasks** in Phase 1 (Setup) can run in parallel after T001.
- **Within Phase 2 (Foundation)**, `[P]`-marked tasks (T010, T011, T018, T019, T021, T022, T023, T024, T025, T026) can run in parallel where they touch different files.
- **Across Phases 3–8**, story phases can run in parallel by different developers; the [P] tags within each story phase apply to its own internal parallelism.

---

## Parallel Example: Phase 3 (US1) Tests

```text
# All US1 tests can be written together (all [P], different files):
Task: "T027 — backend/tests/.../Security/Ownership/OrderOwnershipTests.cs"
Task: "T028 — backend/tests/.../Security/ProofFileAccess/ProofFileAccessTests.cs"
Task: "T029 — backend/tests/.../Security/DisabledUser/DisabledUserTokenTests.cs"
Task: "T030 — backend/tests/.../Security/RoleEnforcement/AdminEndpointRoleTests.cs"
Task: "T031 — backend/tests/.../Security/RoleEscalation/ProfileEditEscalationTests.cs"
Task: "T032 — backend/tests/.../Security/RefreshReuse/RefreshReuseTests.cs"
Task: "T033 — frontend/src/features/auth/auth-redirect.test.tsx"
```

Once all are red, implementation tasks T034–T044 can run; many of them are independent and `[P]`-eligible.

---

## Implementation Strategy

### MVP First (the three P1 stories)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundation — **critical**, blocks everything).
3. Complete Phase 3 (US1 — Access boundaries). Validate.
4. Complete Phase 4 (US2 — Checkout & inventory). Validate.
5. Complete Phase 5 (US3 — Deployment). Validate via staging smoke.
6. **STOP and consider P1 deployable.** A real production Dr Mirror at this point has secure boundaries, safe checkout, and a real deploy path.

### Incremental Delivery After P1

7. Phase 6 (US4 — Observability + runbook) → staging.
8. Phase 7 (US5 — UX/i18n/a11y parity) → staging.
9. Phase 8 (US6 — CI/caching/scaling) → staging.
10. Phase 9 (Polish) → release.

### Parallel Team Strategy

With three developers post-Foundation:
- Dev A: US1 (T027–T044).
- Dev B: US2 (T045–T057).
- Dev C: US3 (T058–T065).
- After P1 stories converge: split US4–US6 the same way.

---

## Notes

- `[P]` = different files, no dependency on a sibling.
- Every task must end with at least one **Verify** check; no task is "done" without one.
- Commit at task or logical-group granularity; the optional `after_*` git hook can do the per-skill commit.
- **No business-behavior change**: every checkout/order/proof/cancellation behavior MUST remain bit-for-bit identical to current — covered by AC-12.
- **No locale regression**: every PR must keep `npm run i18n:check` green (enforced by T086 in CI).
- Avoid: vague tasks, same-file conflicts marked `[P]`, cross-story dependencies that break independent testing.
