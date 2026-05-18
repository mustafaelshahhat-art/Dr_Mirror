# Contract — Admin Publish / Unpublish Idempotency

**Branch**: `006-audit-hardening` | **Date**: 2026-05-18 | **Source**: spec FR-014, FR-015, FR-016 + clarify Q3

This contract specifies the behaviour of the admin publish/unpublish endpoints for both state-changing and no-op calls.

---

## Endpoints

- `POST /api/admin/products/{id}/publish`
- `POST /api/admin/products/{id}/unpublish`

Both require an admin token. Both are unchanged in route, method, request body (empty), and authorization rules.

---

## Decision matrix

| Endpoint | Pre-state | Post-state | Status | Body | Audit row written? |
|---|---|---|---|---|---|
| `publish` | `IsPublished = false` | `IsPublished = true` | `200 OK` | Product DTO (now published) | **Yes** — `previous="false"`, `new="true"` |
| `publish` | `IsPublished = true` | unchanged | `200 OK` | Product DTO (still published) | **No** |
| `unpublish` | `IsPublished = true` | `IsPublished = false` | `200 OK` | Product DTO (now unpublished) | **Yes** — `previous="true"`, `new="false"` |
| `unpublish` | `IsPublished = false` | unchanged | `200 OK` | Product DTO (still unpublished) | **No** |

The previous behaviour of writing an audit row with hardcoded `previous` strings (regardless of pre-state) is removed.

---

## Audit-row truthfulness

When an audit row **is** written, its fields MUST be populated as follows:

- `ActionType`: `"Product.Publish"` or `"Product.Unpublish"` (unchanged).
- `TargetEntityType`: `"Product"` (unchanged).
- `TargetEntityId`: `id` (unchanged).
- `PreviousValue`: the string representation of `Product.IsPublished` as loaded from the database immediately before mutation.
- `NewValue`: the string representation of `Product.IsPublished` after mutation.
- `ActorUserId`, `Timestamp`, `CorrelationId`: unchanged from existing implementation.

When an audit row is **not** written (no-op case), `SaveChangesAsync` is still called (to refresh the read DTO) but no `AdminAuditLogEntries.Add` is invoked.

---

## What does NOT change

- Route, method, authorization, response shape on real transitions.
- 404 behaviour when the product ID does not exist.
- 401/403 behaviour for missing/insufficient credentials.

---

## Verification

| Test | Setup | Expected status | Audit Δ |
|---|---|---|---|
| Publish draft | `IsPublished=false` | `200` | +1 row, `previous="false"` |
| Publish already-published | `IsPublished=true` | `200` | 0 rows |
| Unpublish published | `IsPublished=true` | `200` | +1 row, `previous="true"` |
| Unpublish already-draft | `IsPublished=false` | `200` | 0 rows |
| Publish missing product | id not found | `404` | 0 rows |
| Publish without admin | non-admin token | `403` | 0 rows |
