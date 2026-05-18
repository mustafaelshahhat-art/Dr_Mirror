# Phase 0 — Research: Code Quality & Reliability Hardening Pass

The spec had four open clarifications; all were resolved in the `/speckit-clarify` session (2026-05-18) and reflected in spec.md. This Phase 0 captures the remaining technical unknowns — questions about **what the codebase already does** — that needed answers before the plan could be made concrete.

---

## R1 — Outbox terminal state: does it already exist?

**Decision**: Yes. `OutboxMessageStatus.Failed = 2` is already defined in `backend/src/DrMirror.Api/Domain/Entities/EmailOutboxMessage.cs:3`, and `EmailOutboxProcessor.cs:93-101` already transitions a message to `Failed` after `msg.Attempts >= maxAttempts`. The claim query at line 49 correctly filters `m.Attempts < maxAttempts`, so failed messages are not re-claimed. **No database migration is required** for the terminal state.

**Rationale**: The spec's "Scope (out)" line "Only one migration is expected … adds the terminal state" turns out to overestimate the work — the state has been wired since the M6_EmailOutbox migration. The actual deltas this pass needs:

1. `maxAttempts` is currently a hardcoded `const int maxAttempts = 10` at `EmailOutboxProcessor.cs:44`. FR-006 requires it to be runtime-configurable. → bind to `EmailOptions.MaxAttempts` (new property, default `7`).
2. The exponential backoff at `EmailOutboxProcessor.cs:108-109` is unbounded `Math.Pow(4, attempts) * 30s`. FR-005 requires a 7-day ceiling. → wrap the computed delay in `Math.Min(maxBackoff, computed)` where `maxBackoff` is bound to `EmailOptions.MaxBackoff` (new property, default `TimeSpan.FromDays(7)`).
3. The Where clause at line 49 hardcodes the old constant; replace with the options-bound value.

**Alternatives considered**:
- *Add a new `Failed` value to the enum* — already there; would be a no-op.
- *Add a "DeadLettered" status distinct from `Failed`* — gratuitous; `Failed` already means "terminal, do not re-claim".
- *Wire a new `OutboxOptions` class instead of extending `EmailOptions`* — splits options across two classes for one feature; one class is simpler and matches existing convention.

---

## R2 — Toast primitive: what is available, and what is currently wired?

**Decision**: HeroUI v3 ships an accessible toast primitive (`ToastProvider` + `addToast` function). It is **not currently wired** in `frontend/src/app/providers.tsx`. Plan to add it inside the existing provider chain, between `<LocaleScope>` and `<DirectionSync>`, so toasts inherit the active locale and direction.

**Rationale**: Grep for `ToastProvider`, `addToast`, or `@heroui/toast` under `frontend/src/app/` returned zero results, confirming nothing today renders toasts at the app level. The single hit for the literal word "toast" in feature code (`ProductMasterForm.tsx`) is a passing reference in a comment, not a wired component. HeroUI's toast is built on React Aria primitives and renders with `role="status"` / `aria-live`, satisfying Constitution VI without extra ARIA plumbing.

**Alternatives considered**:
- *Hand-roll a toast component using framer-motion (already a dependency)* — duplicates an accessible primitive that ships with HeroUI; adds maintenance burden.
- *Use a third-party (`react-hot-toast`, `sonner`)* — adds a dependency for capability we already pay for.
- *Inline banners instead of toasts* — explicitly rejected in `/speckit-clarify` Q1.

---

## R3 — vitest-axe: is the harness ready?

**Decision**: Yes, fully. `frontend/src/test/axe.ts` re-exports `axe` and `configureAxe` from `vitest-axe`, `frontend/src/test/setup.ts` runs as Vitest's setup file, and `frontend/src/test/axe.test.tsx` already demonstrates the assertion shape. Several feature tests (e.g. `Snippet.test.tsx`) already consume the helper. The eight new a11y tests can adopt the existing pattern with zero infrastructure work.

**Rationale**: vitest-axe is at `^0.1.0` in `package.json` with an existing TypeScript ambient declaration at `frontend/src/test/vitest-axe.d.ts`. No additional setup, no Vitest config changes, no new dev-deps.

**Alternatives considered**:
- *Switch to `jest-axe`* — vitest-axe is the project's chosen integration; no reason to migrate.
- *Run axe in a real browser via Playwright* — explicitly forbidden by `CLAUDE.md` repo boundary and spec FR-023.

---

## R4 — Existing ProblemDetails responses: what error signals must the map handle?

**Decision**: The error-signal mapping module (`api-error-map.ts`) keys on `(httpStatus, problemDetails.title)` and falls back on `(httpStatus, problemDetails.type)` when `title` is absent. The initial inventory of mapped signals — covering every distinct ProblemDetails title currently emitted by mutation endpoints — is:

| HTTP | Title | Translation key |
|---|---|---|
| 400 | "Validation failed" | `errors.toast.validation` |
| 401 | (any / absent) | `errors.toast.signedOut` |
| 403 | "Forbidden" | `errors.toast.forbidden` |
| 404 | "Order not found" | `errors.toast.orderNotFound` |
| 404 | "Proof not found" | `errors.toast.proofNotFound` |
| 404 | "Inquiry not found" | `errors.toast.inquiryNotFound` |
| 404 | "Address not found" | `errors.toast.addressNotFound` |
| 409 | "Address in use" | `errors.toast.addressInUse` |
| 409 | "Idempotency conflict" | `errors.toast.idempotencyConflict` |
| 409 | "Order state conflict" | `errors.toast.orderStateConflict` |
| 410 | (any) | `errors.toast.proofPurged` |
| 413 | (any) | `errors.toast.fileTooLarge` |
| 415 | (any) | `errors.toast.fileTypeUnsupported` |
| 422 | (any) | `errors.toast.validation` |
| 429 | (any) | `errors.toast.rateLimited` |
| 5xx | (any) | `errors.toast.serverError` |

Anything not in the table falls back to `errors.toast.generic`. Both `ar/errors.json` and `en/errors.json` get the `toast.*` keys per FR-024.

**Rationale**: The list was derived by grepping `Results.Problem(title:` across the API. The 17 signals above cover all current mutation responses in the seven covered feature areas. The map is conservatively typed — adding a new signal later is a one-file change per FR-010a.

**Alternatives considered**:
- *Map only by HTTP status (ignore title)* — loses specificity: "order not found" vs. "proof not found" are useful distinctions for the user.
- *Require the backend to add an `errorCode` extension to ProblemDetails* — that's an API contract change, forbidden by FR-021.

---

## R5 — Enforcing the "no inline cache-key tuples" rule

**Decision**: Two ESLint rules guard the convention:

1. A `no-restricted-syntax` rule on `CallExpression[callee.object.name='queryClient']` and on `useQuery`/`useMutation` arguments that targets array literals where every element is a string literal — these are flagged with the message "Use the keys module".
2. The query-keys module is the only file with an `// eslint-disable-next-line` for that rule, scoped to its own definitions.

This catches both inline tuples in feature code and accidental re-introduction during refactors.

**Rationale**: Static rules are cheaper and more reliable than a grep in CI. They run in `npm run lint` (already the gate per spec). A typo in a key reference becomes a TS error because the keys module returns typed `as const` tuples (FR-016).

**Alternatives considered**:
- *Grep-only check in a custom script* — runs only when explicitly invoked; easy to bypass.
- *Custom ESLint plugin* — overkill for two rules; `no-restricted-syntax` is built-in.

---

## R6 — Test fixtures for signed-in buyer vs. signed-in admin in frontend tests

**Decision**: Reuse the existing render helpers under `frontend/src/test/` (e.g. patterns used in `CheckoutPage.test.tsx`). Each a11y test wraps the page-under-test in a minimal `QueryClient` + `AuthProvider` + `I18nextProvider` chain with the auth context seeded to the buyer or admin role. Fixture seeding mocks the API via MSW handlers if MSW is wired; otherwise via `setQueryData` priming.

**Rationale**: The existing CheckoutPage test demonstrates the pattern. No new test infrastructure is needed; the a11y tests are render-and-assert, not API-coupled.

**Alternatives considered**:
- *Hit the real API* — pointless for an axe assertion; slower; adds backend coupling.
- *New shared `renderWithProviders` helper* — would be welcome as a refactor but is out of scope for this hardening pass (no new abstractions per spec).

---

## R7 — Proof-retention service: how does it currently consume `DeleteAsync`?

**Decision**: `PaymentProofRetentionPurgeService` (under `backend/src/DrMirror.Api/BackgroundServices/`) calls `IFileStorageService.DeleteAsync(fileKey, ct)` per row, then sets `proof.FilePurgedAtUtc = DateTimeOffset.UtcNow` and saves. After this pass, `DeleteAsync` will throw on non-"file missing" failures; the retention service wraps each per-row delete in `try`/`catch (Exception ex)`, logs at warning with the file key + reason, and **skips the `FilePurgedAtUtc` assignment for that row**. The row remains unpurged and is naturally re-claimed by the next scheduled run because its eligibility query (`FilePurgedAtUtc == null && ...`) still matches.

**Rationale**: The single-loop, single-DB-context-per-row pattern means a failure in one row does not abort the batch (handles the "Retention job partial success" edge case in spec). `FileNotFoundException` is treated as success (the file is already gone; mark purged).

**Alternatives considered**:
- *Add a `FilePurgeFailedAtUtc` column* — over-engineers for this pass; the structured log + the unchanged `FilePurgedAtUtc=null` is enough signal. Schema change is out of scope.
- *A `PurgeFailureCount` field* — same reasoning. If repeated failures become a problem in practice, that can ship later as a separate feature.

---

## R8 — How are existing mutations exposing errors today?

**Decision**: Three patterns coexist and will all be replaced by the helper:

- *Local `serverError` state in the page component* (e.g. `CheckoutPage.tsx`, `LoginPage.tsx`).
- *Reading `err.response?.data` without `isAxiosError` narrowing* (e.g. `AdminProofReview.tsx`).
- *Silent failure with only TanStack Query's `isError` exposed and no user-facing surface* (some cart mutations).

After the sweep, all three patterns are gone in the covered feature areas: each mutation registers `onError: useApiErrorToast()` (the hook returns a callback) and any locally rendered error UI is removed. Form-field-level validation errors from `react-hook-form` + `zod` remain untouched per FR-013a.

**Rationale**: The clarification session resolved that toast is the right surface; collapsing the three patterns into one is precisely the consistency goal.

**Alternatives considered**:
- *Keep local `serverError` state alongside the toast for screens that show it inline today* — produces double notifications, violates the spec's "single shared mechanism".

---

## Outstanding items

None. All technical unknowns are resolved; the plan and the upcoming tasks file can be written entirely from the answers above plus the spec.
