# Implementation Plan: WhatsApp Outbox Reliability Refactor

**Branch**: `021-whatsapp-outbox-refactor` | **Date**: 2026-05-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/021-whatsapp-outbox-refactor/spec.md`

## Summary

Harden the existing WhatsApp outbox pattern across C# backend, Node.js sidecar, and React frontend: classify sidecar errors as permanent vs. transient, add a sidecar-side circuit breaker, cache sidecar health in the monitor, require confirmation before bulk-retry, and fix retry-child idempotency key format. No schema migrations; all changes are application-logic only.

## Technical Context

**Language/Version**: .NET 10 (C#), Node.js ≥20 (ES modules), TypeScript / React 19

**Primary Dependencies**: ASP.NET Core Minimal APIs, EF Core 9 (SQL Server), `@whiskeysockets/baileys` 7.0.0-rc13, Express 4, TanStack Query v5, HeroUI v3, Tailwind CSS v4

**Storage**: SQL Server (outbox table, no schema change); MongoDB (sidecar Baileys auth — unchanged); in-memory circuit breaker state (sidecar process lifetime)

**Testing**: xUnit + in-memory SQLite (backend); TypeScript build + `npm run i18n:check` (frontend)

**Target Platform**: MonsterASP.NET (backend), Vercel (frontend), self-hosted Node.js sidecar

**Project Type**: Web application — ASP.NET Core Minimal API backend + React SPA frontend + Node.js sidecar microservice

**Performance Goals**: Status page load ≤200ms (no live sidecar health call); outbox batch processes ≤20 messages every 30s

**Constraints**: No new EF Core migrations; no new npm/NuGet packages; circuit breaker in-memory only (resets on sidecar restart)

**Scale/Scope**: Small-scale Egyptian market deployment; outbox rarely exceeds hundreds of messages in flight

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Vertical Slice Architecture | ✅ PASS | All changes within existing `Infrastructure/WhatsApp/` and `Features/Admin/WhatsApp/` slices. No new horizontal layers. |
| II. Arabic-First & RTL Parity | ⚠️ ACTION REQUIRED | FR-022 adds a "Retry All Failed" confirmation dialog. New i18n keys must be added to **both** `ar/translation.json` and `en/translation.json`. `npm run i18n:check` is a gate — will fail if keys are missing in either locale. |
| III. Egyptian Market Compliance | ✅ N/A | No pricing, payment, or checkout changes. |
| IV. Security & Zero-Trust Secrets | ✅ PASS | No new secrets. Circuit breaker is in-memory. Existing `X-Internal-Api-Key` auth unchanged. |
| V. Resilient & Observable Systems | ✅ PASS | Transient/permanent error classification directly improves outbox reliability. Cached sidecar health improves status-page observability without adding coupling. |

**i18n action required**: Add keys under `admin.whatsapp.retryAll.confirm.*` (heading, body with count interpolation, cancel, confirm labels) to both locale files before the frontend task is done.

## Project Structure

### Documentation (this feature)

```text
specs/021-whatsapp-outbox-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities and changes
├── quickstart.md        # Implementation quick-reference
├── contracts/
│   ├── sidecar-send-api.md      # /send-message request + response contract
│   └── backend-status-api.md   # GET /admin/whatsapp/status response (with SidecarHealth)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code

```text
backend/
├── src/DrMirror.Api/
│   ├── Domain/Entities/
│   │   └── WhatsAppOutboxMessage.cs           # no entity-column change; PayloadVersion in JSON
│   └── Infrastructure/WhatsApp/
│       ├── WhatsAppServiceClient.cs            # CHANGE: parse structured error body; throw typed exceptions
│       ├── WhatsAppOutboxProcessor.cs          # CHANGE: catch typed exceptions; handle circuit-open attempt exemption
│       ├── WhatsAppMessageDispatcher.cs        # CHANGE: rethrow timeout as WhatsAppTransientFailureException
│       ├── WhatsAppSidecarMonitor.cs           # CHANGE: write to IWhatsAppHealthCache
│       ├── WhatsAppOutboxHelper.cs             # CHANGE: add PayloadVersion=1 to MessagePayload
│       ├── WhatsAppMessageTemplates.cs         # CHANGE: static lookup dictionary internally
│       ├── WhatsAppPermanentFailureException.cs  # NEW
│       ├── WhatsAppTransientFailureException.cs  # NEW
│       ├── WhatsAppHealthCache.cs              # NEW: IWhatsAppHealthCache + SidecarHealthResult
│       └── WhatsAppServiceExtensions.cs        # CHANGE: register WhatsAppHealthCache as singleton
│
│   └── Features/Admin/WhatsApp/
│       ├── GetWhatsAppStatus/
│       │   └── GetWhatsAppStatusEndpoint.cs    # CHANGE: read SidecarHealth from cache; expose in response
│       ├── RetryWhatsAppAttempt/
│       │   └── RetryWhatsAppAttemptEndpoint.cs # CHANGE: idempotency key format
│       └── RetryAllFailedWhatsApp/
│           └── RetryAllFailedWhatsAppEndpoint.cs # CHANGE: idempotency key format (via CreateChild)
│
└── tests/DrMirror.Tests/WhatsApp/
    ├── RetryWhatsAppAttemptTests.cs            # UPDATE: assert new key format
    └── RetryAllFailedWhatsAppTests.cs          # UPDATE: assert new key format

whatsapp-service/src/
├── services/
│   ├── whatsappClient.js                       # unchanged (send logic stays)
│   └── circuitBreaker.js                       # NEW: in-memory circuit breaker
├── routes/
│   └── send.js                                 # CHANGE: structured error body; circuit breaker integration
└── templates/
    └── messages.js                             # CHANGE: add deprecation comment

frontend/src/features/admin/
├── AdminWhatsAppStatusPage.tsx                 # CHANGE: add AlertDialog for retry-all confirmation
└── types.ts                                    # CHECK: parentMessageId must remain

public/locales/
├── ar/translation.json                         # ADD: admin.whatsapp.retryAll.confirm.* keys
└── en/translation.json                         # ADD: admin.whatsapp.retryAll.confirm.* keys
```

**Structure Decision**: Tri-component project (backend + frontend + sidecar). Changes are distributed across all three per vertical-slice principle — no new files violate the existing slice layout.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
