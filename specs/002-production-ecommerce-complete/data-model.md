# Data Model: Production-Ready E-Commerce Platform

**Phase**: 1 — Design  
**Feature**: 002-production-ecommerce-complete  
**Date**: 2026-05-15

All entities below are already implemented in EF Core. This document serves as the canonical reference for the current schema and the changes needed for production-readiness.

---

## Existing Entities (Stable)

### User
`/Domain/Entities/User.cs` — ASP.NET Identity `IdentityUser`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | Identity PK |
| FullName | string | Required, max 100 |
| Email | string | Identity managed |
| RefreshTokens | List\<RefreshToken\> | Navigation |

**Roles:** `Admin`, `Buyer` — managed via `IdentityUserRole<Guid>`

---

### Product
`/Domain/Entities/Product.cs`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| NameAr | string | Required, max 200 |
| NameEn | string | Required, max 200 |
| DescriptionAr | string? | max 4000 |
| DescriptionEn | string? | max 4000 |
| Slug | string | Unique, ASCII kebab from NameEn |
| CategoryId | Guid | FK → Category |
| Gender | ProductGender | enum: Men=0, Women=1, Unisex=2 |
| Material | string? | max 200, free-form fabric composition |
| IsPublished | bool | Public visibility gate |
| CreatedAt | DateTimeOffset | |
| UpdatedAt | DateTimeOffset | |
| Category | Category | Nav |
| Images | List\<ProductImage\> | Nav, ordered by DisplayOrder |
| Variants | List\<ProductVariant\> | Nav |

**Visibility rule:** `IsPublished = true AND Category.IsActive = true`

---

### ProductVariant
`/Domain/Entities/ProductVariant.cs`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| ProductId | Guid | FK → Product |
| Size | string | max 16 — XS/S/M/L/XL/XXL/XXXL/OS or EU 36–46 |
| ColorName | string | English display name |
| ColorNameAr | string | Arabic display name |
| ColorHex | string | 7-char hex (#RRGGBB) |
| Sku | string | Unique, format: {ProductSku}-{Size}-{ColorSlug} |
| Price | decimal | Unit price at time of listing |
| Stock | int | Decremented on order, restocked on cancel |
| IsActive | bool | Public variant visibility gate |
| CreatedAt | DateTimeOffset | |
| UpdatedAt | DateTimeOffset | |

**Unique constraint:** `(ProductId, Size, ColorName)`

---

### Category
`/Domain/Entities/Category.cs`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| NameAr | string | Required, max 100 |
| NameEn | string | Required, max 100 |
| Slug | string | Unique, ASCII kebab |
| IsActive | bool | Visibility gate — inactive hides all products |
| DisplayOrder | int | Sort order in nav/filters |
| Products | List\<Product\> | Nav |

**Seeded categories (M2 baseline):** Scrub Tops, Scrub Pants, Lab Coats, Surgical Headwear, Medical Footwear.

---

### ProductImage
`/Domain/Entities/ProductImage.cs`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| ProductId | Guid | FK → Product |
| Url | string | Absolute HTTPS URL (picsum in dev, Cloudinary in prod) |
| CloudinaryPublicId | string? | Null in dev; set on M4 upload |
| DisplayOrder | int | Gallery ordering |
| IsPrimary | bool | Cover image for card thumbnails |

---

### Cart + CartItem
`/Domain/Entities/Cart.cs`, `/Domain/Entities/CartItem.cs`

| Cart Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| UserId | Guid | FK → User, unique |
| CreatedAt | DateTimeOffset | |
| UpdatedAt | DateTimeOffset | |
| Items | List\<CartItem\> | Nav |

| CartItem Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| CartId | Guid | FK → Cart |
| ProductVariantId | Guid | FK → ProductVariant |
| Quantity | int | Clamped to stock on merge |
| AddedAt | DateTimeOffset | |

**Unique constraint on CartItem:** `(CartId, ProductVariantId)`

---

### Order + OrderItem
`/Domain/Entities/Order.cs`, `/Domain/Entities/OrderItem.cs`

| Order Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| OrderNumber | string | `DM-{YYYY}-{NNNNNN}`, globally unique |
| BuyerUserId | Guid | FK → User |
| Status | OrderStatus | Enum, managed by OrderStateMachine |
| PaymentMethodId | Guid | FK → PaymentMethod |
| PaymentMethodName | string | Snapshot at creation |
| PaymentMethodKind | PaymentMethodKind | Snapshot (COD vs. proof-required) |
| SubTotal | decimal | Sum of line totals at creation |
| ShipRecipientName | string | Address snapshot |
| ShipPhone | string | Address snapshot |
| ShipGovernorate | string | Free-form in M3; enum in M4 |
| ShipCity | string | Address snapshot |
| ShipStreetAddress | string | Address snapshot |
| ShipFloor | string? | Optional |
| ShipApartment | string? | Optional |
| ShipLandmark | string? | Optional |
| ShipNotes | string? | Optional |
| CreatedAt | DateTimeOffset | |
| UpdatedAt | DateTimeOffset | |
| Items | List\<OrderItem\> | Nav |
| PaymentProofs | List\<PaymentProof\> | Nav |

**OrderStatus enum:** `Pending`, `Confirmed`, `PendingPaymentReview`, `Paid`, `Preparing`, `Shipped`, `Delivered`, `Cancelled`

| OrderItem Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| OrderId | Guid | FK → Order |
| ProductId | Guid | FK → Product (for link) |
| ProductVariantId | Guid | FK → ProductVariant |
| NameAr | string | Snapshot |
| NameEn | string | Snapshot |
| Size | string | Snapshot |
| ColorName | string | Snapshot |
| ColorNameAr | string | Snapshot |
| Sku | string | Snapshot |
| UnitPrice | decimal | Snapshot |
| Quantity | int | |

---

### PaymentProof
`/Domain/Entities/PaymentProof.cs`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| OrderId | Guid | FK → Order |
| FileUrl | string | Absolute URL |
| StoragePublicId | string? | Cloudinary public id (null in dev) |
| Status | PaymentProofStatus | Pending / Approved / Rejected |
| ReviewNote | string? | Required for rejection, optional for approval |
| ReviewedByUserId | Guid? | FK → User (admin) |
| ReviewedAt | DateTimeOffset? | |
| UploadedAt | DateTimeOffset | |

---

### PaymentMethod
`/Domain/Entities/PaymentMethod.cs`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| NameAr | string | |
| NameEn | string | |
| Kind | PaymentMethodKind | COD vs. BankTransfer (proof-required) |
| Instructions | string? | Shown to buyer on order detail |
| ReceivingAccount | string? | Bank account / Instapay handle |
| IsActive | bool | Hidden from checkout picker when false |
| DisplayOrder | int | |

---

### Inquiry
`/Domain/Entities/Inquiry.cs`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| SenderName | string | Required |
| SenderEmail | string | Required, validated |
| Message | string | Required |
| IsRead | bool | Admin toggles |
| CreatedAt | DateTimeOffset | |

---

### RefreshToken
`/Domain/Entities/RefreshToken.cs`

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| UserId | Guid | FK → User |
| TokenHash | string | SHA-256 of raw token |
| ExpiresAt | DateTimeOffset | 14 days from issue |
| RevokedAt | DateTimeOffset? | Set on rotation or cascade revoke |
| ReplacedByTokenHash | string? | Audit chain |
| CreatedAt | DateTimeOffset | |

---

### OrderCounter
`/Domain/Entities/OrderCounter.cs`

| Field | Type | Notes |
|---|---|---|
| Year | int | PK, `ValueGeneratedNever` |
| LastNumber | int | Incremented per order, serialised by SemaphoreSlim |

---

## State Transitions

### OrderStatus (via OrderStateMachine)

```
                    [Buyer]           [Admin/System]
Pending      ──────────────────────► PendingPaymentReview (proof upload)
             ─── Cancel (Buyer) ───► Cancelled
Confirmed    ─── Cancel (Buyer) ───► Cancelled  (COD only)
PendingPaymentReview ────────────► Paid (Admin approve)
             ────────────────────► Pending (Admin reject → re-upload)
Paid         ────────────────────► Preparing (Admin)
Preparing    ────────────────────► Shipped (Admin)
Shipped      ────────────────────► Delivered (Admin)
Delivered    [terminal]
Cancelled    [terminal]
```

COD: System transitions Pending → Confirmed immediately at checkout.

### PaymentProofStatus

```
Pending → Approved (Admin)
Pending → Rejected (Admin)
```

---

## Schema Gaps / Fixes Required

1. **`PaymentProof.ReviewNote`** — The field exists on the entity but a unit test shows it is not being persisted on rejection. Likely the endpoint does not set it before `SaveChangesAsync`. Requires investigation and fix.

2. **`Inquiry` email validation** — The `InquiryValidator` uses FluentValidation's default `.EmailAddress()` which accepts `missing@tld`. Must switch to `EmailValidationMode.AspNetCoreCompatible` to require a TLD with a dot.

3. **No schema migrations needed for this feature** — All entities are already migrated. Bug fixes are code-only.
