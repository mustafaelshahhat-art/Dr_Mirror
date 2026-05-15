# API Contract

**Feature**: 002-production-ecommerce-complete  
**Scope**: REST API surface — existing endpoints, error contract, and invariants

All errors follow RFC 7807 `ProblemDetails`. All timestamps are ISO-8601 UTC. All monetary values are decimal (SAR). All IDs are Guid strings.

---

## Auth — `/api/auth`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/register` | None | `{ fullName, email, password }` | `201 { id, fullName, email, roles[] }` |
| POST | `/login` | None | `{ email, password }` | `200 TokenDto` + httpOnly refresh cookie |
| POST | `/refresh` | httpOnly cookie | — | `200 TokenDto` (rotated cookie) |
| POST | `/logout` | Bearer | — | `204` (cookie cleared) |
| GET | `/me` | Bearer | — | `200 UserDto` |

`TokenDto`: `{ accessToken: string, expiresAt: string }`

---

## Catalog — `/api/catalog` (public)

| Method | Path | Auth | Query Params | Response |
|---|---|---|---|---|
| GET | `/categories` | None | — | `200 CategoryDto[]` |
| GET | `/products` | None | `categoryId, q, gender, size, color, minPrice, maxPrice, sort, page, pageSize` | `200 PagedResult<ProductSummaryDto>` |
| GET | `/products/:slug` | None | — | `200 ProductDetailDto` |

`sort` values: `Newest`, `PriceAsc`, `PriceDesc`  
`PagedResult<T>`: `{ items: T[], page, pageSize, totalCount, totalPages }`

---

## Cart — `/api/cart` (Bearer required)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/` | — | `200 CartDto` |
| POST | `/items` | `{ productVariantId, quantity }` | `200 CartDto` |
| PUT | `/items/:id` | `{ quantity }` | `200 CartDto` |
| DELETE | `/items/:id` | — | `200 CartDto` |
| DELETE | `/` | — | `200 CartDto` (empty) |
| POST | `/merge` | `{ items: [{ productVariantId, quantity }] }` | `200 CartDto` |

---

## Orders — `/api/orders` (Bearer + ownership)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/` | — | `200 OrderSummaryDto[]` |
| GET | `/:orderNumber` | — | `200 OrderDetailDto` |
| POST | `/:orderNumber/cancel` | — | `200 OrderDetailDto` |
| POST | `/:orderNumber/proof` | `multipart/form-data { file }` | `200 OrderDetailDto` |

---

## Checkout — `/api/checkout` (Bearer required)

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/` | `CheckoutRequest` | `200 OrderDetailDto` |

`CheckoutRequest`: `{ paymentMethodId, recipientName, phone, governorate, city, streetAddress, floor?, apartment?, landmark?, notes? }`

---

## Addresses — `/api/addresses` (Bearer required)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/` | — | `200 AddressDto[]` |
| POST | `/` | `CreateAddressRequest` | `201 AddressDto` |
| PUT | `/:id` | `UpdateAddressRequest` | `200 AddressDto` |
| DELETE | `/:id` | — | `204` |

*(Address book is a separate saved-address model; checkout uses inline capture.)*

---

## Admin — `/api/admin/*` (Bearer + Role=Admin, rate-limited)

### Orders
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/orders/` | `status?, page?, pageSize?` | `200 OrderSummaryDto[]` |
| GET | `/orders/:orderNumber` | — | `200 OrderDetailDto` |
| POST | `/orders/:orderNumber/transition` | `{ toStatus, reason? }` | `200 OrderDetailDto` |
| POST | `/orders/:orderNumber/proof/:proofId/approve` | `{ reviewNote? }` | `200 OrderDetailDto` |
| POST | `/orders/:orderNumber/proof/:proofId/reject` | `{ reviewNote }` | `200 OrderDetailDto` |

### Catalog — Categories
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/categories/` | — | `200 CategoryDto[]` |
| POST | `/categories/` | `CreateCategoryRequest` | `201 CategoryDto` |
| PUT | `/categories/:id` | `UpdateCategoryRequest` | `200 CategoryDto` |
| DELETE | `/categories/:id` | — | `204` |

### Catalog — Products
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/products/` | `page?, pageSize?, q?` | `200 PagedResult<AdminProductSummaryDto>` |
| POST | `/products/` | `CreateProductRequest` | `201 AdminProductDto` |
| GET | `/products/:id` | — | `200 AdminProductDto` |
| PUT | `/products/:id` | `UpdateProductRequest` | `200 AdminProductDto` |
| DELETE | `/products/:id` | — | `204` |
| POST | `/products/:id/variants` | `CreateVariantRequest` | `201 ProductVariantDto` |
| PUT | `/products/:id/variants/:variantId` | `UpdateVariantRequest` | `200 ProductVariantDto` |
| DELETE | `/products/:id/variants/:variantId` | — | `204` |
| POST | `/products/:id/images` | `multipart/form-data { file }` | `201 ProductImageDto` |
| DELETE | `/products/:id/images/:imageId` | — | `204` |

### Payment Methods
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/payment-methods/` | — | `200 PaymentMethodDto[]` |
| POST | `/payment-methods/` | `CreatePaymentMethodRequest` | `201 PaymentMethodDto` |
| PUT | `/payment-methods/:id` | `UpdatePaymentMethodRequest` | `200 PaymentMethodDto` |

### Inquiries
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/inquiries/` | `isRead?, page?, pageSize?` | `200 PagedResult<InquiryDto>` |
| POST | `/inquiries/:id/read` | — | `200 InquiryDto` |

### Users
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/users/` | `q?, page?, pageSize?` | `200 AdminUserDto[]` |
| PATCH | `/users/:userId/roles` | `{ roles: string[] }` | `200 AdminUserDto` |

---

## Error Contract

All errors: `application/problem+json` with `{ type, title, status, detail?, errors? }`

| Status | Meaning |
|---|---|
| 400 | Validation failure — `errors` map present |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but insufficient role |
| 404 | Resource not found |
| 409 | State conflict (invalid state transition, already reviewed proof) |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
