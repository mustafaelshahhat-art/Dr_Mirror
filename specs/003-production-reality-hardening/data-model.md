# Phase 1 — Data Model

**Feature**: Full-Stack Production Reality Hardening
**Branch**: `003-production-reality-hardening`
**Date**: 2026-05-17

This document describes the entity model **after** this feature lands. Everything not explicitly marked "new" or "changed" is **preserved unchanged** (Principle V — no destructive migrations, no silent business-behavior changes).

The schema delta is shipped as EF Core migration `M9_AdminAuditLog` (additive only — see research.md §R-20).

---

## 1. Entities Preserved Unchanged

These remain as currently defined in `backend/src/DrMirror.Api/Domain/Entities/`:

- `User` (ASP.NET Identity user; existing `IsDisabled` flag, `SecurityStamp`).
- `RefreshToken` — rotation already supported.
- `BuyerAddress` — M5 default-constraint preserved.
- `ShippingAddress` — order-time snapshot.
- `Cart`, `CartItem` — guest/session/authenticated; merge-on-login preserved.
- `Category`, `Product`, `ProductImage`, `ProductVariant` — catalog tree, Size × Colour matrix.
- `Order`, `OrderItem` — eight-state lifecycle.
- `OrderCounter` — unique order-number generator (M3_2a1 identity fix preserved).
- `PaymentMethod` — COD / Instapay / Wallet.
- `Inquiry` — public form + M7 responded-audit.
- `EmailOutboxMessage` — M8 lease-based claim preserved.

---

## 2. Entities Changed (Additive Columns Only)

### 2.1 `PaymentProof` — add file-purge tracking

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `FilePurgedAtUtc` | `datetime2(7)` | YES | NULL | **NEW.** Set by `PaymentProofRetentionPurgeService` after the binary file is deleted from storage. `NULL` means file still present (or never purged). |

**Behavior**: When `FilePurgedAtUtc IS NOT NULL`, the `GetPaymentProofFile` endpoint returns 410 ProblemDetails with localized copy ("File no longer available — order was completed more than 2 years ago"). The row itself remains for audit (retain admin's approve/reject decision, timestamps, who reviewed).

**Index**: none required for purge scan — the scan joins on `Order.UpdatedAtUtc` covered by the new index in §2.2.

---

### 2.2 `Order` — add purge-scan index and hot-path indexes

| Index | Columns | Type | Notes |
|---|---|---|---|
| `IX_Order_StatusTerminal_UpdatedAt` | `(Status, UpdatedAtUtc)` | non-clustered, filtered (`WHERE Status IN ('Delivered', 'Cancelled')`) | **NEW.** Supports the retention scan: "find orders that reached a terminal state ≥ 2 years ago". Filtered index keeps it tiny (only terminal orders). |
| `IX_Order_UserId_CreatedAtUtc` | `(UserId, CreatedAtUtc DESC)` | non-clustered | **NEW (verify-or-add).** Supports the buyer's "my orders" list. Audit M9 to confirm presence; add if missing. |
| `IX_Order_Status_CreatedAtUtc` | `(Status, CreatedAtUtc DESC)` | non-clustered | **NEW (verify-or-add).** Supports the admin order queue filtering by status. Audit M9 to confirm presence; add if missing. |

No column added.

### 2.3 `Product` — add browse-path index

| Index | Columns | Type | Notes |
|---|---|---|---|
| `IX_Product_CategoryId_IsActive_CreatedAtUtc` | `(CategoryId, IsActive, CreatedAtUtc DESC)` | non-clustered | **NEW (verify-or-add).** Supports the storefront catalog browse path (category page + sort-by-newest). Audit M9 to confirm presence; add if missing. Required for FR-LB7 p95 ≤ 500 ms. |

All three additions land in **M9** (no separate M10). M9 is therefore the single named migration carrying every additive schema change in this feature.

---

### 2.4 `User` — verify, not change

`User.IsDisabled` (or equivalent) and `SecurityStamp` already exist on the Identity user. No schema change. New behavior is enforced in the JWT validation pipeline (see contracts/api-changes.md §Auth).

---

## 3. Entities Added (NEW)

### 3.1 `AdminAuditLogEntry`

Records every admin-side mutation that affects orders, payment proofs, stock, or roles.

**Table**: `AdminAuditLogEntries`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Id` | `bigint identity` | NO | PK. Append-only. |
| `ActorUserId` | `nvarchar(450)` | NO | FK → `AspNetUsers.Id`. The admin who performed the action. |
| `ActionType` | `nvarchar(64)` | NO | Enum-as-string. Allowed values: `Order.StatusChange`, `Order.Cancel`, `PaymentProof.Approve`, `PaymentProof.Reject`, `Stock.Adjust`, `Product.Create`, `Product.Update`, `Product.Delete`, `Category.Create`, `Category.Update`, `Category.Delete`, `User.RoleChange`, `User.Disable`, `User.Enable`, `Inquiry.Respond`. Persisted as string for forward-compat. |
| `TargetEntityType` | `nvarchar(64)` | NO | E.g. `Order`, `PaymentProof`, `ProductVariant`, `User`, `Inquiry`. |
| `TargetEntityId` | `nvarchar(64)` | NO | Stringified ID (handles `int`, `Guid`, `OrderNumber` uniformly). |
| `PreviousStatus` | `nvarchar(64)` | YES | Filled for status-changing actions only. |
| `NewStatus` | `nvarchar(64)` | YES | Filled for status-changing actions only. |
| `CorrelationId` | `nvarchar(64)` | YES | From the existing CorrelationId enricher in Serilog. |
| `TimestampUtc` | `datetime2(7)` | NO | UTC; set by `TimeProvider`, not `GETUTCDATE()`, so it is mockable in tests. |

**Indexes**:
- `IX_AdminAudit_TimestampUtc` on `(TimestampUtc DESC)` — supports the default "recent activity" admin view.
- `IX_AdminAudit_Target` on `(TargetEntityType, TargetEntityId, TimestampUtc DESC)` — supports "show history for this order/user/etc.".
- `IX_AdminAudit_Actor` on `(ActorUserId, TimestampUtc DESC)` — supports "show actions by this admin".

**Constraints**:
- FK `ActorUserId → AspNetUsers.Id` with `ON DELETE NO ACTION` (audit must survive even if the actor is later removed — though deletion of admins is itself an audited action).
- No update/delete endpoints exposed; append-only at the application layer.

**Forbidden contents** (enforced by code review, no DB constraint):
- No file contents.
- No secrets, passwords, tokens.
- No raw multipart bodies.
- No customer payment-proof bytes.

**Retention**: Indefinite (per FR-O7). No purge job.

**Validation rules**:
- `ActionType` must be one of the enumerated strings; service layer enforces.
- `TargetEntityId` must be non-empty.
- `TimestampUtc` must be UTC (Kind = Utc); EF Core configuration converts on read/write.

---

### 3.2 `OrderIdempotencyKey`

Supports the `X-Idempotency-Key` checkout header (research §R-2).

**Table**: `OrderIdempotencyKeys`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `Key` | `uniqueidentifier` | NO | PK. Client-generated UUID v4. |
| `OrderId` | `int` | NO | FK → `Orders.Id`. The order this key produced. |
| `UserId` | `nvarchar(450)` | NO | FK → `AspNetUsers.Id`. The owner; second-submit must match. |
| `CreatedAtUtc` | `datetime2(7)` | NO | For optional cleanup (keys older than 24 h MAY be purged; not blocking for v1). |

**Indexes**:
- `PK_OrderIdempotencyKeys` on `Key` (clustered).
- `IX_OrderIdempotencyKeys_UserId_CreatedAt` on `(UserId, CreatedAtUtc DESC)` — supports optional cleanup scan; small table, low maintenance cost.

**Constraints**:
- FK `OrderId → Orders.Id` with `ON DELETE CASCADE` — if an order is hard-deleted (shouldn't happen, but for FK integrity), the idempotency record goes with it.
- FK `UserId → AspNetUsers.Id` with `ON DELETE CASCADE`.

**Behavior**:
- On `POST /api/checkout/orders` with `X-Idempotency-Key: <uuid>`:
  - If key exists and `UserId` matches the authenticated user → return the existing order (200 OK with the canonical order DTO).
  - If key exists and `UserId` differs → 409 ProblemDetails (collision; client should generate a new key).
  - If key absent in DB → proceed to create the order, then insert the row in the same transaction.
- On `POST` without the header → backwards-compat: order is created (no idempotency guard). The frontend will always send the header after this feature lands; backward-compat exists only so older clients (e.g., from a partial deploy) keep working.

---

## 4. Validation Rules (Cross-Cutting)

These rules are enforced at the API layer (FluentValidation in the relevant feature slice):

- **Order creation** (`Features/Checkout/CreateOrder`):
  - For `paymentMethod = COD`: payment proof field MUST be absent / null.
  - For `paymentMethod ∈ {Instapay, Wallet}`: payment proof requirement enforced post-creation via the existing flow.
  - All line totals re-computed server-side from current `ProductVariant.Price`; client-supplied totals discarded.
  - Stock decrement happens inside the same transaction as `Order` + `OrderItem` insert + `OrderCounter` increment.
  - Concurrency: `ProductVariant.RowVersion` checked; on conflict, retry up to 3 times.

- **Payment proof upload** (`Features/Orders/UploadPaymentProof`):
  - `Content-Length` ≤ 5 × 1024 × 1024 bytes; else 413.
  - Declared `Content-Type` ∈ {`image/jpeg`, `image/png`, `application/pdf`}; else 415.
  - First 16 bytes match the declared type's magic-bytes signature; else 415.
  - Parent order must belong to the authenticated user; else 404 (no existence leak).
  - Parent order must be in a state that accepts a proof (not yet `Paid`/`Delivered`/`Cancelled`); else 409.
  - Existing stale-proof guard preserved.

- **User profile update**:
  - Whitelist of bindable fields: `DisplayName`, `Phone`, `PreferredLocale`. `Roles`, `IsDisabled`, `EmailConfirmed`, `Email`, `Id` are NOT bindable from this endpoint.
  - Any presence of admin-only fields in the request body is silently dropped; response confirms only allowed changes.

- **Admin role change** (`Features/Admin/Users`):
  - Cannot demote/disable/delete the last active admin (existing last-admin guard preserved).
  - Action emits `AdminAuditLogEntry` with `ActionType = User.RoleChange | User.Disable | User.Enable`.

---

## 5. State Transitions

### 5.1 Order Lifecycle (PRESERVED — no change)

```text
                ┌──────────────────────┐
                │  Pending (created)   │
                └──┬───────────────────┘
                   │
       paymentMethod = COD
                   │                              paymentMethod ∈ {Instapay, Wallet}
                   ▼                                                  │
              ┌──────────┐                                            ▼
              │ Confirmed │                            ┌──────────────────────────┐
              └─────┬─────┘                            │ PendingPaymentReview      │
                    │                                  │  (proof uploaded)          │
                    │                                  └─────┬──────────┬──────────┘
                    │                                  approve│          │reject
                    │                                        ▼          ▼
                    │                                   ┌────────┐  back to Pending
                    │                                   │  Paid   │
                    │                                   └────┬────┘
                    ▼                                        ▼
                ┌──────────┐                            ┌──────────┐
                │ Preparing │ ◄──────────────────────── │ Preparing │
                └────┬─────┘                            └──────────┘
                     ▼
                ┌─────────┐
                │ Shipped  │
                └────┬─────┘
                     ▼
                ┌──────────┐
                │ Delivered │  (terminal)
                └──────────┘
       Cancellation valid from Pending / Confirmed / PendingPaymentReview / Paid / Preparing
                             ┌──────────┐
                             │ Cancelled │  (terminal)
                             └──────────┘
```

Each transition emits an `AdminAuditLogEntry` when performed by an admin (customer-driven cancellation also audited but with the customer as the actor in a future enhancement; v1 records the operator when the operator is the admin).

### 5.2 Payment Proof Lifecycle (PRESERVED + purge addition)

```text
  Uploaded ──► Approved ──► (parent Order reaches terminal state) ──► [2 years pass] ──► FilePurgedAtUtc set, file deleted
            └► Rejected ──► (buyer re-uploads via stale-proof guard) ──► ...
```

The proof *row* remains forever (audit value); only the binary file is purged.

---

## 6. Relationships Summary

```text
User ──< Order ──< OrderItem
     │       │
     │       ├── OrderIdempotencyKey  (exactly one per successfully-created order; multiple keys for the same order are impossible by construction at the application layer)
     │       └── PaymentProof  (0..N proofs per order; only one active)
     │
     ├── BuyerAddress  (M5: at most one default)
     ├── Cart ──< CartItem
     └── RefreshToken

User ──< AdminAuditLogEntry  (actor)
Order, PaymentProof, ProductVariant, Inquiry, User ──< AdminAuditLogEntry  (target via TargetEntityType + TargetEntityId; no FK because target type is polymorphic)

Category ──< Product ──< ProductVariant
                      └< ProductImage

OrderCounter  (singleton — generates OrderNumber)
PaymentMethod  (reference data: COD / Instapay / Wallet)
Inquiry  (standalone)
EmailOutboxMessage  (standalone; lease-claimed)
```

---

## 7. Data Retention Summary (per FR-D11)

| Entity | Retention | Mechanism |
|---|---|---|
| `Order`, `OrderItem`, `ShippingAddress` (snapshot) | Indefinite | None — kept forever for order history, accounting, dispute resolution. |
| `BuyerAddress` | Indefinite, with buyer-initiated delete for non-default, non-referenced rows | Existing CRUD; row deletion (not soft-delete). |
| `PaymentProof` *row* | Indefinite | Kept for audit (admin review history). |
| `PaymentProof` *file* | 2 years after parent order reaches a terminal state | `PaymentProofRetentionPurgeService` background job. |
| `EmailOutboxMessage` | 90 days after dispatch | Existing outbox cleanup (or extend if absent) — covered by FR-D11. |
| `AdminAuditLogEntry` | Indefinite | None. |
| `Cart`, `CartItem` | Until cleared by user or order placement | Existing behavior. |
| `Inquiry` | Indefinite | Existing behavior. |
| `RefreshToken` | Until rotation/revocation, then archived/cleaned | Existing behavior. |
| Serilog log files | 30 days rolling, 50 MB cap per day | Existing config (preserved). |
| Sentry events | Per Sentry plan retention (provider-managed) | External. |
