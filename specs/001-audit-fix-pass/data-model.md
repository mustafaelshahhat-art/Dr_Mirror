# Data Model: Audit Fix Pass

**Date**: 2026-05-19
**Branch**: `001-audit-fix-pass`

## Overview

No schema changes or new entities are required. All fixes operate on existing code paths and entities.

## Affected Entities

### EmailOutboxMessage (read-only — query change only)

| Field | Type | Relevance |
|-------|------|-----------|
| `Status` | `OutboxMessageStatus` (enum: Pending=0, Sent=1, Failed=2, Processing=3) | Purge query expanded to include `Failed` |
| `DeliveredAt` | `DateTimeOffset?` | Existing purge cutoff for `Sent` rows |
| `LastAttemptAt` | `DateTimeOffset?` | New purge cutoff for `Failed` rows |

**Change**: The `EmailOutboxRetentionService.PurgeOnceAsync` query filter is extended from:
```
Status == Sent AND DeliveredAt < cutoff
```
to:
```
(Status == Sent AND DeliveredAt < cutoff) OR (Status == Failed AND (LastAttemptAt == null OR LastAttemptAt < cutoff))
```

### PaymentProof (no change)

| Field | Type | Relevance |
|-------|------|-----------|
| `FilePurgedAtUtc` | `DateTimeOffset?` | Set on successful purge — logging fix only |

**Change**: None to the entity. Only the log message in `PaymentProofRetentionPurgeService` changes to report the actual count of successfully purged items.

## Frontend Form Schemas (new Zod schemas)

Each admin form gets a co-located Zod schema. No backend DTO changes.

### AddressFormSchema
- `label`: string, required, max 50
- `recipientName`: string, required, max 100
- `phone`: string, required, Egyptian phone regex
- `governorate`: string, required (from canonical slug list)
- `city`: string, required, max 100
- `streetAddress`: string, required, max 200
- `floor`: string, optional, max 20
- `apartment`: string, optional, max 20
- `landmark`: string, optional, max 200
- `notes`: string, optional, max 500
- `setDefault`: boolean

### CategoryFormSchema
- `nameAr`: string, required, max 120
- `nameEn`: string, required, max 120
- `displayOrder`: number, integer

### ProductMasterFormSchema
- `nameAr`: string, required, max 120
- `nameEn`: string, required, max 120
- `descriptionAr`: string, optional, max 2000
- `descriptionEn`: string, optional, max 2000
- `price`: number, positive
- `gender`: enum (Unisex, Male, Female)
- `material`: string, optional, max 100
- `brand`: string, optional, max 100
- `sku`: string, optional, max 50
- `categoryId`: string, required (UUID)

### VariantFormSchema
- `size`: string, required, max 20
- `colorName`: string, required, max 50
- `colorNameAr`: string, required, max 50
- `colorHex`: string, required, hex color regex
- `sku`: string, optional, max 50
- `stock`: number, integer, non-negative

### PaymentMethodFormSchema (create mode)
- `code`: string, required, max 32
- `kind`: enum (Cod, Instapay, Wallet, BankTransfer)
- `nameAr`: string, required, max 64
- `nameEn`: string, required, max 64
- `instructionsAr`: string, optional, max 500
- `instructionsEn`: string, optional, max 500
- `accountNumber`: string, optional, max 64
- `accountHolder`: string, optional, max 100
- `displayOrder`: number, integer

### PaymentMethodFormSchema (edit mode)
Same as create minus `code` and `kind` (immutable after creation).

## State Transitions

No order state machine changes. No new statuses.

## Migrations

None required.
