---

description: "Task list for WhatsApp Outbox Reliability Refactor"
---

# Tasks: WhatsApp Outbox Reliability Refactor

**Input**: Design documents from `/specs/021-whatsapp-outbox-refactor/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Existing test updates are included (required by FR-025/SC-006). No new test files unless noted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in every description

---

## Phase 1: Setup (New Exception Types)

**Purpose**: Create the two new exception classes that all backend error-classification work depends on. No behavioral logic — just type declarations.

- [ ] T001 [P] Create `WhatsAppPermanentFailureException.cs` in `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppPermanentFailureException.cs` — sealed class with `string Reason` property as shown in data-model.md
- [ ] T002 [P] Create `WhatsAppTransientFailureException.cs` in `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppTransientFailureException.cs` — sealed class with `string Reason` property as shown in data-model.md

**Checkpoint**: Two new exception types exist and compile. All other backend phases can begin.

---

## Phase 2: Foundational (Sidecar Structured Error Body)

**Purpose**: Update the sidecar `/send-message` route to return structured JSON error responses. This is the contract boundary that the C# client (US1) and circuit breaker (US3) both depend on.

**⚠️ CRITICAL**: No user story backend work can begin until this phase is complete — the C# client parses this body.

- [ ] T003 Add `respondWithError` helper to `whatsapp-service/src/routes/send.js` and update all non-success responses to return `{ success: false, error: "<reason>", retryable: true|false }` per contract (FR-009 – FR-012): HTTP 400 → `retryable: false`; HTTP 429/500/503 → `retryable: true`; HTTP 200 success → `{ success: true }`. Do NOT add circuit-breaker logic yet (that is US3 / Phase 5).

**Checkpoint**: The sidecar always returns a structured JSON body on every send outcome. Backend error classification (US1) can now begin.

---

## Phase 3: User Story 1 — Transient failures retry, permanent failures stop immediately (Priority: P1) 🎯 MVP

**Goal**: The C# backend correctly classifies sidecar responses: permanent failures (`retryable: false`) mark the message Failed immediately; transient failures (`retryable: true`, parse failures, timeouts) re-queue with exponential backoff.

**Independent Test**: Simulate a sidecar 400 response and verify the outbox message reaches Final Failed after one processing cycle; simulate a sidecar 503 response and verify the message stays Pending after the same cycle. Run `dotnet test` after this phase.

- [ ] T004 [US1] Update `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppServiceClient.cs`: add private `SidecarErrorDto(bool Success, string? Error, bool Retryable)` record; in `SendAsync()`, on non-2xx response attempt `ReadFromJsonAsync<SidecarErrorDto>()` (best-effort); throw `WhatsAppPermanentFailureException` when `Retryable == false`; throw `WhatsAppTransientFailureException` otherwise (including parse failure); remove old `EnsureSuccessStatusCode()` and `HttpStatusCode.ServiceUnavailable` special case
- [ ] T005 [US1] Update `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppMessageDispatcher.cs`: change the `catch (OperationCanceledException) when (!ct.IsCancellationRequested)` block to `throw new WhatsAppTransientFailureException("sidecar_timeout")` instead of calling `MarkFailed` (FR-004)
- [ ] T006 [US1] Update `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppOutboxProcessor.cs`: replace the single `catch (Exception ex)` block with three ordered catches as specified in data-model.md — (1) `catch (WhatsAppPermanentFailureException ex)` → mark Failed immediately; (2) `catch (WhatsAppTransientFailureException ex)` → Pending+backoff, with `ex.Reason == "circuit_open"` decrementing `msg.Attempts` by 1 before computing backoff (FR-006a); (3) `catch (Exception ex)` → preserve existing behavior (FR-008)

**Checkpoint**: User Story 1 is fully functional. A 400 sidecar response permanently fails the message; a 503 or timeout re-queues it. `dotnet test` should pass (idempotency-key tests will fail until US4 is complete).

---

## Phase 4: User Story 2 — Admin confirms before bulk-retrying all failed messages (Priority: P2)

**Goal**: Clicking "Retry All Failed" on the admin dashboard opens an AlertDialog showing the count of failed messages before any bulk retry is issued.

**Independent Test**: Open the WhatsApp status page with failed messages; click "Retry All Failed"; verify the confirmation dialog appears with the correct count, and that clicking Cancel issues no retry.

- [ ] T007 [P] [US2] Add `admin.whatsapp.retryAll.confirm.*` i18n keys (title, body with `{{count}}`, cancel, confirm) to `public/locales/ar/translation.json` using Arabic translations from quickstart.md
- [ ] T008 [P] [US2] Add `admin.whatsapp.retryAll.confirm.*` i18n keys (title, body with `{{count}}`, cancel, confirm) to `public/locales/en/translation.json` using English translations from quickstart.md
- [ ] T009 [US2] Update `frontend/src/features/admin/AdminWhatsAppStatusPage.tsx`: wrap the "Retry All Failed" button in an AlertDialog (HeroUI v3) that shows the count from `status.counts.failed` and the i18n keys from T007/T008; only issue the bulk-retry mutation on explicit confirmation (depends on T007, T008)

**Checkpoint**: User Story 2 is fully functional. `npm run i18n:check` must pass after T007 and T008.

---

## Phase 5: User Story 3 — Sidecar circuit breaker prevents cascade failures (Priority: P2)

**Goal**: After 3 consecutive non-rate-limit, non-validation sidecar failures, the sidecar rejects new sends with HTTP 503 `{ error: "circuit_open", retryable: true }` for 60 seconds.

**Independent Test**: Simulate 3 consecutive non-400/non-429 sidecar errors; verify the 4th send attempt is rejected with `circuit_open` within 60 seconds; verify a successful send resets the counter.

- [ ] T010 [US3] Create `whatsapp-service/src/services/circuitBreaker.js` with `CircuitBreaker` class (threshold=3, cooldownMs=60_000) using the private-field implementation from data-model.md — `isOpen()`, `recordSuccess()`, `recordFailure()` methods
- [ ] T011 [US3] Update `whatsapp-service/src/server.js` to import `CircuitBreaker` from `./services/circuitBreaker.js`, instantiate one singleton, and pass it to `registerSendRoutes()` (depends on T010)
- [ ] T012 [US3] Update `whatsapp-service/src/routes/send.js` `/send-message` handler to check `circuitBreaker.isOpen()` at the top and return `{ success: false, error: 'circuit_open', retryable: true }` with HTTP 503 if open; call `circuitBreaker.recordSuccess()` on send success; call `circuitBreaker.recordFailure()` only for non-400, non-429 errors (depends on T010, T011)

**Checkpoint**: User Story 3 is fully functional. The C# backend's T006 circuit-open handling (already in place) correctly exempts these from MaxAttempts.

---

## Phase 6: User Story 4 — Retry attempts are traceable to their origin (Priority: P3)

**Goal**: Every retry child's idempotency key follows `{original.IdempotencyKey}:retry:{childId:N}`, enabling log-based traceability.

**Independent Test**: Retry a failed message; verify the child's idempotency key starts with the original message's business key followed by `:retry:` and a 32-char hex GUID.

- [ ] T013 [US4] Update `CreateChild` static method in `backend/src/DrMirror.Api/Features/Admin/WhatsApp/RetryWhatsAppAttempt/RetryWhatsAppAttemptEndpoint.cs`: generate `childId = Guid.NewGuid()` first; set `Id = childId`; set `IdempotencyKey = $"{original.IdempotencyKey}:retry:{childId:N}"`. `RetryAllFailedWhatsAppEndpoint.cs` inherits the fix via `CreateChild`.
- [ ] T014 [P] [US4] Update `backend/tests/DrMirror.Tests/WhatsApp/RetryWhatsAppAttemptTests.cs` to assert the child's idempotency key starts with `original.IdempotencyKey + ":retry:"` and ends with a 32-char hex string (not the old `retry:{original.Id}:{ticks}` format)
- [ ] T015 [P] [US4] Update `backend/tests/DrMirror.Tests/WhatsApp/RetryAllFailedWhatsAppTests.cs` to assert the same new key format for all child messages created in bulk retry

**Checkpoint**: User Story 4 is fully functional. `dotnet test` should now pass for all three WhatsApp test files (SC-006).

---

## Phase 7: User Story 5 — Admin dashboard reports sidecar health without extra network calls (Priority: P3)

**Goal**: `GET /api/admin/whatsapp/status` includes `sidecarHealth` (isHealthy, lastCheckedAt, errorMessage) sourced from a cached value written by `WhatsAppSidecarMonitor` — no live `/health` call at status-page load.

**Independent Test**: Stop the sidecar; wait one monitor cycle (60s); call the status endpoint; verify `sidecarHealth.isHealthy` is `false` and `errorMessage` is non-null, with no timeout on the status call itself.

- [ ] T016 [US5] Create `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppHealthCache.cs` with `SidecarHealthResult(bool IsHealthy, DateTimeOffset LastCheckedAt, string? ErrorMessage)` record, `IWhatsAppHealthCache` interface, and `WhatsAppHealthCache` implementation using `volatile` field as shown in data-model.md
- [ ] T017 [US5] Register `WhatsAppHealthCache` as `IWhatsAppHealthCache` singleton in `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppServiceExtensions.cs` — must be registered before `AddHostedService<WhatsAppSidecarMonitor>()` (depends on T016)
- [ ] T018 [P] [US5] Update `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppSidecarMonitor.cs` to inject `IWhatsAppHealthCache healthCache` in constructor and call `healthCache.Update(new SidecarHealthResult(healthy, DateTimeOffset.UtcNow, errorMessage))` after every `HealthAsync()` call (depends on T016, T017)
- [ ] T019 [P] [US5] Update `backend/src/DrMirror.Api/Features/Admin/WhatsApp/GetWhatsAppStatus/GetWhatsAppStatusEndpoint.cs` to inject `IWhatsAppHealthCache healthCache` and map `healthCache.Latest` to a `SidecarHealthDto` in the response (null if not yet populated); remove any live `/health` call from this endpoint (depends on T016, T017)
- [ ] T020 [P] [US5] Add `SidecarHealthDto` interface and `sidecarHealth: SidecarHealthDto | null` field to `WhatsAppStatusDto` in `frontend/src/features/admin/types.ts` per contracts/backend-status-api.md

**Checkpoint**: User Story 5 is fully functional. The status page loads without a live sidecar call and shows cached health state.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Remaining functional requirements that are standalone and don't block any user story.

- [ ] T021 [P] Add `int? PayloadVersion = 1` to the `MessagePayload` record in `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppOutboxHelper.cs` (FR-017, informational-only, no behavior change, no migration required)
- [ ] T022 [P] Refactor `backend/src/DrMirror.Api/Infrastructure/WhatsApp/WhatsAppMessageTemplates.cs` internals to use `static readonly Dictionary<(string, string), string>` keyed by `(eventType, status)` per Decision 7 in research.md — public method signatures unchanged
- [ ] T023 [P] Add JSDoc comment to `whatsapp-service/src/templates/messages.js` stating that the C# backend is the source of truth for Arabic message content (FR-019)
- [ ] T024 [P] Add `logger.warn('DEPRECATED: /send-template is not called by the outbox flow…')` at the top of the `/send-template` handler in `whatsapp-service/src/routes/send.js` (FR-020)
- [ ] T025 Run `dotnet test` in `backend/` and confirm all WhatsApp tests pass (SC-006, FR-025)
- [ ] T026 Run `npm run build` in `frontend/` and confirm zero TypeScript errors (SC-007, FR-026)
- [ ] T027 Run `npm run i18n:check` in `frontend/` and confirm all locale keys present in both `ar/` and `en/` (FR-026, constitution check)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001 and T002 are parallel
- **Foundational (Phase 2)**: No dependencies — can run in parallel with Phase 1
- **US1 (Phase 3)**: Depends on Phase 1 (exception types) and Phase 2 (sidecar structured body) both complete
- **US2 (Phase 4)**: Independent of all other user stories — can start any time
- **US3 (Phase 5)**: Independent of Phase 3 backend changes; sidecar-only until T011/T012
- **US4 (Phase 6)**: Independent — no dependencies on US1–US3
- **US5 (Phase 7)**: Independent — no dependencies on US1–US4
- **Polish (Phase 8)**: T021–T024 can run any time; T025–T027 must run after all implementation phases complete

### User Story Dependencies

- **US1 (P1)**: Requires Phase 1 + Phase 2 complete; no other story dependencies
- **US2 (P2)**: Fully independent; T009 depends on T007 and T008 (i18n keys must exist first)
- **US3 (P2)**: Fully independent of backend stories; T011/T012 depend on T010
- **US4 (P3)**: Fully independent; T014 and T015 can be done in parallel
- **US5 (P3)**: T018 and T019 both depend on T016 + T017; T020 is fully independent

### Within Each User Story

- US1: T004 → T005 → T006 (sequential: client throws, dispatcher rethrows, processor catches)
- US2: T007 + T008 in parallel → T009
- US3: T010 → T011 → T012 (sequential: class, wiring, route integration)
- US4: T013 → T014 + T015 in parallel
- US5: T016 → T017 → T018 + T019 in parallel (T020 anytime)

### Parallel Opportunities

- T001 + T002 (Phase 1): different files
- T007 + T008 (US2): different locale files
- T014 + T015 (US4): different test files
- T018 + T019 (US5): different files, both depend on T016+T017
- T021 + T022 + T023 + T024 (Polish): all different files
- T025 + T026 + T027 (Polish validation): all independent

---

## Parallel Example: US5

```
# Once T016 and T017 are done, launch in parallel:
Task: T018 — Update WhatsAppSidecarMonitor.cs
Task: T019 — Update GetWhatsAppStatusEndpoint.cs
Task: T020 — Update frontend/src/features/admin/types.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003) — **blocks US1**
3. Complete Phase 3: US1 (T004 → T005 → T006)
4. **STOP and VALIDATE**: Run `dotnet test` and confirm error-classification behavior
5. Deploy/demo the core reliability fix

### Incremental Delivery

1. Setup + Foundational (T001–T003) → Foundation ready
2. US1 (T004–T006) → Transient/permanent classification live → **Deploy (MVP)**
3. US2 (T007–T009) → Bulk-retry confirmation live → Deploy
4. US3 (T010–T012) → Sidecar circuit breaker live → Deploy
5. US4 (T013–T015) → Idempotency traceability live → Deploy
6. US5 (T016–T020) → Cached health in status page → Deploy
7. Polish (T021–T027) → Templates, deprecation, validation

### Parallel Team Strategy

With multiple developers:

1. Dev A: Phase 1 + Phase 2 + US1 (core reliability, P1)
2. Dev B: US2 (frontend, independent)
3. Dev C: US3 (sidecar circuit breaker, independent)
4. Merge US1 + US2 + US3, then proceed to US4 + US5 + Polish

---

## Notes

- [P] tasks operate on different files — safe to run concurrently
- [Story] label maps each task to its user story for traceability
- `parentMessageId` MUST remain in `WhatsAppAttemptDto` (FR-024) — do not remove it
- No EF Core migrations, no new npm/NuGet packages (FR-026, FR-027)
- Add i18n keys to **both** locales simultaneously — `npm run i18n:check` is a CI gate
- The circuit-open attempt decrement in T006 (FR-006a) is correct even though the circuit breaker (US3) may not be deployed yet — the `ex.Reason == "circuit_open"` branch simply won't trigger until US3 is live
