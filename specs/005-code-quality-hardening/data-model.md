# Phase 1 — Data Model: Code Quality & Reliability Hardening Pass

This pass introduces **zero schema changes**. Both entity-level "Key Entities" from the spec are pre-existing; the deltas are semantic (how existing fields are used and what state transitions mean), not structural.

---

## Entity 1 — `EmailOutboxMessage` (pre-existing)

**Source of truth**: `backend/src/DrMirror.Api/Domain/Entities/EmailOutboxMessage.cs`

**Existing fields** (unchanged by this pass):

| Field | Type | Role |
|---|---|---|
| `Id` | `Guid` | Primary key |
| `EventType` | `string` | Logical event name (e.g. `PaymentReviewNeeded`) |
| `Payload` | `string` | JSON-serialized event body |
| `Status` | `OutboxMessageStatus` | `Pending=0`, `Sent=1`, **`Failed=2`**, `Processing=3` |
| `Attempts` | `int` | Total dispatch attempts so far |
| `NextRetryAt` | `DateTimeOffset` | When the next claim is eligible |
| `CreatedAt` | `DateTimeOffset` | Enqueue time |
| `LastAttemptAt` | `DateTimeOffset?` | Most recent dispatch attempt |
| `DeliveredAt` | `DateTimeOffset?` | Set when transition to `Sent` |
| `LockedAt` | `DateTimeOffset?` | Lease start for in-flight processing |
| `LockedBy` | `string?` | Worker identifier holding the lease |
| `FailureReason` | `string?` | Last error message (overwritten each attempt) |
| `IdempotencyKey` | `string` | Caller-supplied de-dup key |

### Semantic changes in this pass

**State transitions** (visualized; arrows show what each transition does to other fields):

```text
Pending --(claim eligibility: NextRetryAt <= now, Attempts < MaxAttempts)--> Processing
       LockedAt := now, LockedBy := worker, Attempts := Attempts + 1, LastAttemptAt := now

Processing --(dispatch success)--> Sent
       DeliveredAt := now, LockedAt := null, LockedBy := null

Processing --(dispatch failure, Attempts < MaxAttempts)--> Pending
       FailureReason := ex.Message
       NextRetryAt := min(now + 4^Attempts * 30s, now + MaxBackoff)   ← clamp is new
       LockedAt := null, LockedBy := null

Processing --(dispatch failure, Attempts >= MaxAttempts)--> Failed   ← terminal
       FailureReason := ex.Message
       LockedAt := null, LockedBy := null
       (NextRetryAt is left at its previous value but is no longer consulted)

Processing --(lease expiry: LockedAt <= now - 5m)--> Pending
       (handled by the existing stale-lock recovery branch in the claim query)
```

**What's new**:
- `MaxAttempts` is now read from `EmailOptions.MaxAttempts` (default `7`) instead of the hardcoded `10`. See `data-model` note on `EmailOptions` below.
- The retry delay is now `min(4^Attempts * 30s, MaxBackoff)` where `MaxBackoff` is read from `EmailOptions.MaxBackoff` (default `TimeSpan.FromDays(7)`).
- The `Failed` state is now the operational terminal state, not just an enum value. Operators reading Serilog output will see `EmailOutbox: permanently failed {EventType} (id={Id}) after {Attempts} attempts` at `Error` level (already in place at `EmailOutboxProcessor.cs:98-100` — unchanged).

**Identity & uniqueness**: unchanged. `Id` is the primary key; the existing unique index on `IdempotencyKey` is unchanged.

**Migration**: **none**. The `Status` column already stores integer values; `Failed = 2` already round-trips correctly through EF Core.

---

## Entity 2 — `PaymentProof` retention row (pre-existing)

**Source of truth**: `backend/src/DrMirror.Api/Domain/Entities/PaymentProof.cs` (and order-aggregate code).

**Relevant existing fields** (unchanged by this pass):

| Field | Type | Role |
|---|---|---|
| `Id` | `Guid` | Primary key |
| `OrderId` | `Guid` | FK to the order |
| `FileKey` | `string` | Storage key (folder/filename) |
| `ContentType` | `string` | MIME |
| `UploadedAtUtc` | `DateTimeOffset` | Receipt time |
| `FilePurgedAtUtc` | `DateTimeOffset?` | **Set only when delete actually succeeded** ← semantic change |

### Semantic changes in this pass

`FilePurgedAtUtc` becomes a stronger guarantee:

| Outcome of `IFileStorageService.DeleteAsync(FileKey)` | New behavior |
|---|---|
| Returns normally | Set `FilePurgedAtUtc = now` |
| Throws `FileNotFoundException` (file was already gone) | Set `FilePurgedAtUtc = now` (treat as success) |
| Throws any other exception | **Leave `FilePurgedAtUtc = null`**, log warning at the retention-service layer with `FileKey` and the exception type, continue the batch |

The eligibility filter on the retention claim (`FilePurgedAtUtc == null && UploadedAtUtc < cutoff`) is unchanged, which means **a row whose delete failed is automatically re-claimed on the next run**. No new state column is needed.

**Migration**: **none**. The change is in the calling code, not the schema.

---

## `EmailOptions` (pre-existing options class — extended)

**Source of truth**: `backend/src/DrMirror.Api/Infrastructure/Email/EmailOptions.cs`.

### New properties

| Property | Type | Default | Configuration key |
|---|---|---|---|
| `MaxAttempts` | `int` | `7` | `Email:MaxAttempts` |
| `MaxBackoff` | `TimeSpan` | `TimeSpan.FromDays(7)` | `Email:MaxBackoff` |

Both bind from existing `Email` configuration via the existing `services.Configure<EmailOptions>(config.GetSection("Email"))` registration. Operators tune them at runtime by editing the configuration source (env var or `appsettings.{Environment}.json`) and restarting the worker — no migration, no code change. This satisfies FR-006.

**Validation**: `[Range(1, 100)]` on `MaxAttempts`; `MaxBackoff` validated as `> TimeSpan.Zero`. Invalid values fail-fast at boot per Constitution VII.

---

## Frontend "entities" (modules, not DB)

The frontend gains three named modules whose **identity** matters for the spec's "no inline" rules but which are not persistence entities:

### `frontend/src/shared/lib/api-error-map.ts`

Exports a single `apiErrorMap` constant — a typed record from `(httpStatus, title|type)` to a translation key. Cross-referenced by `useApiErrorToast`. Adding a new mapping is a one-line addition with no other file touched. The full initial inventory is in [research.md R4](./research.md#r4--existing-problemdetails-responses-what-error-signals-must-the-map-handle).

### `frontend/src/shared/lib/query-keys.ts`

Exports `queryKeys` — a namespaced factory whose returned tuples are `as const` so a typo is a TypeScript error rather than a runtime miss (satisfies FR-016).

```ts
// Sketch only; final shape lives in the implementation.
export const queryKeys = {
  cart: () => ['cart'] as const,
  catalog: {
    list: (filters: CatalogFilters) => ['catalog', 'list', filters] as const,
    detail: (slug: string) => ['catalog', 'detail', slug] as const,
  },
  orders: {
    list: () => ['orders', 'list'] as const,
    detail: (orderNumber: string) => ['orders', 'detail', orderNumber] as const,
  },
  admin: {
    orders: {
      list: (filters: AdminOrderFilters) => ['admin', 'orders', 'list', filters] as const,
      detail: (id: string) => ['admin', 'orders', 'detail', id] as const,
    },
    users: { list: () => ['admin', 'users', 'list'] as const },
  },
  inquiries: { list: () => ['inquiries', 'list'] as const },
  addresses: { list: () => ['addresses'] as const },
  appConfig: () => ['app-config'] as const,
} as const;
```

The exact key shape is preserved from current inline tuples wherever possible so that the migration is byte-equivalent at the cache layer (no spurious refetches on deploy).

### `frontend/src/shared/hooks/useApiErrorToast.ts`

Exports `useApiErrorToast()`, a hook returning an `(error: unknown) => void` callback. Internally:

1. Type-guards `error` (axios `isAxiosError`, then `Error`, then `unknown`).
2. Reads status + ProblemDetails `title` / `type`, looks up the translation key in `apiErrorMap`, or falls back to `errors.toast.generic`.
3. Calls HeroUI's `addToast({ title, color: 'danger' })` with the localized string.
4. Sends a Sentry breadcrumb with `{ category: 'api-error', status, title, type }` — the raw `.detail` is included in the breadcrumb only, never in the toast (FR-010b).
