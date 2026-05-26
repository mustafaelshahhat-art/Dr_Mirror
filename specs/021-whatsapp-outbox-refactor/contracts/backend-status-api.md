# Contract: Backend WhatsApp Status API

**Route**: `GET /api/admin/whatsapp/status`  
**Auth**: Admin JWT (HttpOnly cookie)  
**Consumer**: `AdminWhatsAppStatusPage.tsx` (React frontend)

---

## Response

**Status**: 200

```json
{
  "connectionState": "connected",
  "qrRequired": false,
  "lastSentAt": "2026-05-26T10:30:00Z",
  "lastError": null,
  "counts": {
    "sent": 142,
    "failed": 3,
    "skipped": 7,
    "retrying": 1
  },
  "sidecarHealth": {
    "isHealthy": true,
    "lastCheckedAt": "2026-05-26T10:28:00Z",
    "errorMessage": null
  }
}
```

### `sidecarHealth` field (new — FR-021)

Sourced from `IWhatsAppHealthCache.Latest` (set by `WhatsAppSidecarMonitor` every 60s). The status endpoint does **not** make a live `GET /health` call to the sidecar.

| Field | Type | Description |
|-------|------|-------------|
| `isHealthy` | `bool` | `true` if last health check succeeded |
| `lastCheckedAt` | `DateTimeOffset` | UTC timestamp of the last health check |
| `errorMessage` | `string?` | Non-null if last check failed; contains exception message |

If no health check has completed yet (monitor not yet run), `sidecarHealth` is `null`.

### `connectionState` values

| Value | Meaning |
|-------|---------|
| `connected` | Sidecar is connected to WhatsApp |
| `qr_required` | Waiting for QR scan |
| `auth_failed` | Auth credentials rejected |
| `disconnected` | Intentionally disconnected |
| `initializing` | Sidecar is starting up |
| `configuration_error` | Bad configuration |
| `disabled` | WhatsApp integration disabled in config |

---

## TypeScript Type Extension

The existing `WhatsAppStatusDto` in `frontend/src/features/admin/types.ts` gains:

```typescript
export interface SidecarHealthDto {
  isHealthy: boolean;
  lastCheckedAt: string;
  errorMessage: string | null;
}

export interface WhatsAppStatusDto {
  connectionState: string;
  qrRequired: boolean;
  lastSentAt: string | null;
  lastError: string | null;
  counts: WhatsAppStatusCountsDto;
  sidecarHealth: SidecarHealthDto | null;  // NEW
}
```
