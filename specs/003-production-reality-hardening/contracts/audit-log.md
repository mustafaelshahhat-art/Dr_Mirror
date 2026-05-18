# Contract — Admin Audit Log

The admin audit log is an append-only record of every admin-side mutation that affects orders, payment proofs, stock, or user roles. It is queryable through admin-only endpoints and is **never** writable through the API (writes happen in-process via `IAdminAuditWriter`).

## Storage

Persisted in `AdminAuditLogEntries` (see `data-model.md` §3.1). Retention: indefinite (per FR-O7).

## Allowed `ActionType` values

| `ActionType` | Triggered by |
|---|---|
| `Order.StatusChange` | Admin advances or rejects an order through the eight-state lifecycle. |
| `Order.Cancel` | Admin cancels an order. |
| `PaymentProof.Approve` | Admin approves a proof. |
| `PaymentProof.Reject` | Admin rejects a proof. |
| `Stock.Adjust` | Admin changes a `ProductVariant.Stock` value. |
| `Product.Create` / `Product.Update` / `Product.Delete` | Admin catalog CRUD. |
| `Category.Create` / `Category.Update` / `Category.Delete` | Admin catalog CRUD. |
| `User.RoleChange` | Admin grants/revokes the Admin role. |
| `User.Disable` / `User.Enable` | Admin disables / re-enables a user. |
| `Inquiry.Respond` | Admin responds to an inquiry (M7 already records timestamp on Inquiry; this is the audit-log mirror). |

New types may be added in future migrations — clients **MUST** treat unknown values as opaque strings, not enums.

## Admin endpoints (NEW)

All require the Admin role (backend-enforced — `[Authorize(Roles = "Admin")]`).

### `GET /api/admin/audit`

Paged list, newest first.

Query parameters:
- `page` (default 1, min 1)
- `pageSize` (default 25, min 1, max 100)
- `actorUserId` (optional filter)
- `actionType` (optional filter; exact match)
- `targetType` (optional filter; e.g. `Order`)
- `targetId` (optional filter; combined with `targetType` for a per-entity history)
- `from`, `to` (optional UTC ISO-8601 bounds on `TimestampUtc`)

Response (200 OK):
```json
{
  "items": [
    {
      "id": 1024,
      "actorUserId": "8e1c...",
      "actorDisplayName": "Mostafa H.",
      "actionType": "PaymentProof.Approve",
      "targetEntityType": "PaymentProof",
      "targetEntityId": "47",
      "previousStatus": null,
      "newStatus": "Approved",
      "correlationId": "00-1a2b3c4d-...",
      "timestampUtc": "2026-05-17T11:23:45.1234567Z"
    }
  ],
  "total": 1024,
  "page": 1,
  "pageSize": 25
}
```

### `GET /api/admin/audit/{id}`

Fetch a single entry. 404 if not found.

## Internal writer interface

```csharp
public interface IAdminAuditWriter
{
    Task WriteAsync(
        string actionType,
        string targetEntityType,
        string targetEntityId,
        string? previousStatus,
        string? newStatus,
        CancellationToken cancellationToken);
}
```

Implementation is `Scoped`, reads `HttpContext.User`, correlation ID, and `TimeProvider`. Writes occur inside the same `AppDbContext` transaction as the underlying business mutation — audit and mutation either both commit or both roll back.

## Prohibited contents

Audit entries **MUST NOT** contain:
- File contents or any raw binary payloads.
- Secrets, passwords, JWTs, refresh tokens, API keys.
- Raw multipart bodies.
- Customer payment-proof image bytes.

Code review and the audit-writer tests enforce this; there is no automated DB-level constraint.

## Frontend surface (NEW)

New page: `frontend/src/features/admin/audit/AuditLogPage.tsx`. Defaults to newest-first; filters in the page header; clicking a `TargetEntityType + TargetEntityId` row deep-links to the relevant admin detail page (order, user, product). Localized strings live in `locales/{ar,en}/admin.json` under the new `audit.*` key tree.

## Rate limiting

Reads on `/api/admin/audit*` use the same admin-defense-in-depth rate-limit policy as other admin reads. No new policy needed.

## Test coverage (see research §R-19)

- `backend/tests/DrMirror.Tests/Admin/Audit/AuditWriterTests` — single-write, prohibited-content enforcement, transaction-rollback alignment.
- `backend/tests/DrMirror.Tests/Admin/Audit/AuditQueryTests` — pagination, filter, admin-only authorization, correlation-id propagation.
- `frontend/src/features/admin/audit/AuditLogPage.test.tsx` — empty / error / loaded states; filter wiring.
