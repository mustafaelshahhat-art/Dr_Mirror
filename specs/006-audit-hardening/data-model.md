# Data Model — May 2026 Audit Hardening Pass

**Branch**: `006-audit-hardening` | **Date**: 2026-05-18

This feature is **hardening-only**: there are **no schema migrations**, **no new SQL tables**, and **no new SQL columns**. The "data model" deltas are limited to:

1. One new C# enum used on a response DTO.
2. One new typed configuration record bound from `appsettings.json` (no DB).
3. Two existing entities whose **invariants** (not schemas) tighten.

Each item is listed below with the entity name, the fields involved, the validation/invariant rule, and the persistence (or lack thereof).

---

## 1. `AddressSaveOutcome` (new C# enum, response-shape only)

**Kind**: C# enum + JSON wire type. No database persistence.

**Location**: `backend/src/DrMirror.Api/Features/Checkout/CreateOrder/AddressSaveOutcome.cs` (new file).

**Definition**:

```csharp
public enum AddressSaveOutcome
{
    NotRequested = 0,
    Saved = 1,
    SkippedBookFull = 2,
}
```

**Wire format**: serialised as `string` via `JsonStringEnumConverter` with `JsonNamingPolicy.SnakeCaseLower`, producing the exact values mandated by FR-017: `"not_requested"`, `"saved"`, `"skipped_book_full"`.

**Used by**:

- `CreateOrderResponse.AddressSaveOutcome` (new field — see §4).

**Invariants**:

- Every successful checkout response MUST carry exactly one value (never absent, never null).
- `Saved` MUST imply that a new `BuyerAddress` row was inserted in the same transaction as the order.
- `SkippedBookFull` MUST imply that the buyer's address-book row count was at the per-user cap at the moment of the order and `request.SaveAsNewAddress == true`.
- `NotRequested` MUST imply `request.SaveAsNewAddress == false`.

**Frontend mirror**: `frontend/src/features/checkout/api.ts` declares the matching TypeScript union `type AddressSaveOutcome = 'saved' | 'skipped_book_full' | 'not_requested'`.

---

## 2. `SecurityHeadersOptions` (new C# options record, configuration-only)

**Kind**: Strongly-typed configuration record. Bound from `Security:Headers:*`. No DB.

**Location**: `backend/src/DrMirror.Api/Shared/Http/SecurityHeadersOptions.cs` (new file).

**Definition**:

```csharp
public sealed class SecurityHeadersOptions
{
    public string HstsMaxAge { get; set; } = "31536000";
    public bool HstsIncludeSubDomains { get; set; } = true;
    public bool HstsPreload { get; set; } = false; // never true per Clarify Q2
    public string ContentTypeOptions { get; set; } = "nosniff";
    public string ReferrerPolicy { get; set; } = "strict-origin-when-cross-origin";
    public string FrameOptions { get; set; } = "DENY";
    public string CrossOriginResourcePolicy { get; set; } = "same-site";
    public bool EmitInDevelopment { get; set; } = true;
    public bool EmitHstsOnlyOverHttps { get; set; } = true;
}
```

**Invariants**:

- `HstsPreload` MUST remain `false` unless a constitutional amendment ratifies the production domain.
- Production HTTPS responses MUST carry the assembled `Strict-Transport-Security` header; non-HTTPS production responses MUST NOT (per RFC 6797 §7.2). Enforced via `EmitHstsOnlyOverHttps`.
- All five non-HSTS headers MUST appear on every response in every environment (dev, staging, prod).

**Used by**: `SecurityHeadersMiddleware`.

---

## 3. `Product` (existing entity, invariant change only)

**Kind**: Existing EF Core entity. **No schema change.**

**File**: `backend/src/DrMirror.Api/Domain/Entities/Product.cs` (unchanged).

**Field involved**: `IsPublished : bool`.

**Invariant strengthened**:

- Whenever `IsPublished` changes during an admin `Publish` or `Unpublish` action, an `AdminAuditLogEntry` MUST be written within the same `SaveChangesAsync` transaction, with `PreviousValue` set from the loaded entity's pre-mutation state (never a hardcoded string).
- Whenever `IsPublished` does **not** change (no-op publish/unpublish), **no** `AdminAuditLogEntry` row MAY be written for that action.

**Enforcement point**: `AdminProductsEndpoints.Publish` and `AdminProductsEndpoints.Unpublish` in `Features/Admin/Catalog/Products/`.

---

## 4. `CreateOrderResponse` (existing DTO, additive field)

**Kind**: Existing response record. **Additive change** (new non-nullable field).

**File**: `backend/src/DrMirror.Api/Features/Checkout/CreateOrder/CreateOrderResponse.cs` (modify).

**New field**:

```csharp
public AddressSaveOutcome AddressSaveOutcome { get; init; }
```

**Wire format addition**: `"addressSaveOutcome"` in the JSON body, one of the three string values defined in §1.

**Position**: appended to the response body; field ordering MUST NOT alter existing fields.

**Backward compatibility**: additive only — existing SPA clients (older bundle versions) that ignore unknown response fields continue to function unchanged. The new SPA bundle reads the field and conditionally renders the toast described in FR-018.

---

## 5. `AdminAuditLogEntry` (existing entity, content-correctness only)

**Kind**: Existing EF Core entity. **No schema change.**

**Fields involved**: `PreviousValue : string?`, `NewValue : string?`.

**Invariant strengthened**:

- For action types `"Product.Publish"` and `"Product.Unpublish"`, `PreviousValue` MUST be the actual string representation of the product's `IsPublished` state immediately before the mutation (`"true"` / `"false"` or the existing canonical strings).
- `NewValue` MUST be the post-mutation state.
- Rows are written only on real state changes (see §3 invariant).

**Enforcement point**: same call site as §3.

---

## 6. `RefreshOriginPolicy` (new in-memory decision object)

**Kind**: Internal classification result. **No persistence.**

**Location**: `backend/src/DrMirror.Api/Features/Auth/Refresh/RefreshOriginPolicy.cs` (new file, internal type).

**Definition (conceptual)**:

```csharp
internal enum RefreshOriginVerdict { Accept, Reject_MissingOrigin, Reject_UnknownOrigin }

internal static class RefreshOriginPolicy
{
    public static RefreshOriginVerdict Evaluate(string? originHeader, IReadOnlyCollection<string> allowlist) { ... }
}
```

**Invariants**:

- `Evaluate` MUST be a pure function (no side effects, no I/O) so it can be unit-tested without a `TestServer`.
- The allowlist is the same one consumed by the CORS policy; reading it from a divergent source is forbidden.
- `Accept` MUST be returned only on an exact case-insensitive scheme-and-host match (per RFC 6454).

**Used by**: the `RequireTrustedOrigin` endpoint filter on `/api/auth/refresh`.

---

## Relationships summary

```text
HTTP request
  │
  ├─ SecurityHeadersMiddleware ───→ SecurityHeadersOptions (config)
  │
  ├─ /api/auth/refresh
  │    └─ RequireTrustedOrigin filter ──→ RefreshOriginPolicy ──→ Accept | Reject
  │
  ├─ /api/checkout (POST)
  │    └─ CreateOrderEndpoint ──→ writes CreateOrderResponse.AddressSaveOutcome (enum)
  │
  ├─ /api/admin/products/{id}/publish | /unpublish
  │    └─ AdminProductsEndpoints ──→ Product.IsPublished
  │                              └─ (conditionally) AdminAuditLogEntry.PreviousValue/NewValue
  │
  └─ /api/orders/{orderId}/payment-proof
       └─ DownloadPaymentProofEndpoint ──→ IFileStorageService.OpenReadAsync ──→ Stream
```

No new SQL tables, columns, or migrations. The audit content-correctness changes are pure business-logic invariants enforced at the endpoint.
