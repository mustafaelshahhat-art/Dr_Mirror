# Contract — Health Endpoints

Replaces the existing static `/api/health` with a liveness/readiness split using the ASP.NET Core HealthChecks framework.

## `GET /api/health/live`

**Purpose**: Liveness probe. Answers "is the process up and responding?"

**Behavior**: Always returns 200 if the request reaches the application. No dependency checks. No DB hit.

**Response**:
```json
{ "status": "Healthy" }
```

**Use**: Host platform restart probes (MonsterASP.NET, Kubernetes liveness, etc.). Should not flap based on external service health.

## `GET /api/health/ready`

**Purpose**: Readiness probe. Answers "can the application serve traffic right now?"

**Registered checks** (each timeboxed to 2 seconds; total budget ≤ 6 s):

| Name | What it checks | Failure mode |
|---|---|---|
| `sqlserver` | `SELECT 1` against `AppDbContext` | Returns `Unhealthy` on connection failure or query timeout. |
| `filestorage` | Provider-specific reachability. **Local**: write+read a tiny temp file under `wwwroot/uploads`. **Cloudinary**: HEAD request against the configured Cloudinary API root. | Returns `Degraded` on slow response, `Unhealthy` on outright failure. |
| `outbox` | Counts `EmailOutboxMessage` rows where `NextAttemptUtc < UtcNow - 1h` and `DispatchedUtc IS NULL`. | Returns `Degraded` if count > 0, `Unhealthy` if count > 100 (configurable via `HealthChecks__OutboxStuckThreshold`). |

**Aggregate status**:
- All checks `Healthy` → 200, body `status = "Healthy"`.
- At least one `Degraded`, none `Unhealthy` → 200, body `status = "Degraded"`.
- Any `Unhealthy` → 503, body `status = "Unhealthy"`.

**Response shape**:
```json
{
  "status": "Healthy",
  "checks": [
    {
      "name": "sqlserver",
      "status": "Healthy",
      "duration": "00:00:00.0123456",
      "description": null
    },
    {
      "name": "filestorage",
      "status": "Healthy",
      "duration": "00:00:00.0567890",
      "description": null
    },
    {
      "name": "outbox",
      "status": "Healthy",
      "duration": "00:00:00.0042000",
      "description": null
    }
  ]
}
```

**Cache headers**: `Cache-Control: no-store`.

**Auth**: Anonymous (probes don't carry credentials). No PII in the body; the failing-check `description` MUST NOT contain connection strings, secrets, or stack traces.

## `GET /api/health` (alias)

For backwards compatibility: same behavior and shape as `/api/health/ready`. External monitors pointed at `/api/health` continue to work.

## Synthetic monitoring (FR-R8)

Production uses a synthetic check (e.g., UptimeRobot, BetterStack, or the hosting platform's built-in monitor) targeting `/api/health/ready` at **1-minute intervals**. The SLO budget for the month is computed from the success rate of these checks.

Alert thresholds (operator decision; not in scope to implement here, but recommended in the runbook):
- 3 consecutive failures → page on-call.
- Any single response with `status = Unhealthy` → page on-call.
- `status = Degraded` for ≥ 5 minutes → notify (no page).
