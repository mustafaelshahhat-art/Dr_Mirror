# Feature Specification: Full-Stack Audit Fix Pass (May 2026)

**Feature Branch**: `008-audit-fix-pass`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "use @specs/007-code-audit/audit-report.md to fix all founded issuses in the fullstack audit dont skip any thing"

## Context

The May 2026 full-stack audit (spec 007, commit `b30a154`) closed with **9 open findings** — 3 Medium, 6 Low, 0 Critical/High. This feature is a non-negotiable remediation pass that resolves **every** finding (F-001 through F-009) so the codebase returns to a fully clean audit baseline. No finding is deferred, downgraded, or ignored.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operators get accurate operational signals and intended caching (Priority: P1)

The three Medium-severity findings degrade observable behavior that operators, browsers, and CDNs rely on: catalog responses never carry their intended caching directives (F-001), admin users entering catalog / address data through admin forms get no client-side schema validation and inconsistent error feedback (F-005), and keyboard-only users cannot bypass repeating header navigation on every page (F-006). Closing the three Mediums restores the experiences each audience already expects.

**Why this priority**: These are the highest-severity open findings in the report, each affecting a real user audience (storefront browsers and CDN caches, admin operators, keyboard / assistive-tech users). They block the audit from reaching a "zero Medium" baseline.

**Independent Test**: A reviewer can verify by (a) loading a catalog page and observing the `Cache-Control`/`Vary` headers on the JSON response, (b) submitting an admin catalog or address form with deliberately invalid input and observing field-level error messages without a network round-trip, and (c) loading any storefront and admin page with keyboard only, pressing `Tab` once, and confirming a visible "Skip to main content" affordance focuses and jumps to the page's main landmark.

**Acceptance Scenarios**:

1. **Given** a public catalog endpoint, **When** a client requests it, **Then** the response carries the intended public cache directives every time (not just when headers happen to flush before the body).
2. **Given** an admin user submits a category, product master, product variant, payment method, or address form with an invalid or missing required field, **When** the form is submitted, **Then** validation runs against a schema, fields that fail show inline error messages, and the submission is blocked until corrected.
3. **Given** a keyboard-only user lands on any storefront or admin page, **When** they press `Tab` from a fresh page load, **Then** the first focusable affordance is a "Skip to main content" link that, when activated, moves focus into the page's main landmark.

---

### User Story 2 — Background services, uploads, and CI gates behave correctly under edge cases (Priority: P2)

The six Low-severity findings are correctness, maintainability, and accessibility gaps in supporting systems: the email outbox never purges permanently-failed rows (F-002), the payment-proof purge service logs an inflated count when individual deletes fail (F-003), the proof-upload endpoint has a narrow exception window where a file stream is not deterministically disposed (F-004), required admin form fields do not announce their required state to assistive tech (F-007), the CI lint step silently skips if the lint script is removed (F-008), and the frontend lint configuration has no static a11y plugin to catch source-level violations (F-009). Closing these prevents slow data growth, false operational signals, future regressions, and accessibility drift.

**Why this priority**: Low severity but still in the audit punch-list. None of them produces a user-visible incident today, but each represents a latent quality, accessibility, or operational-trust gap that the audit explicitly flagged. The user directive is "fix all founded issuses … dont skip any thing."

**Independent Test**: A reviewer can verify by (a) confirming permanently-failed outbox rows older than the retention cutoff are removed by the next purge cycle, (b) inducing a file-delete failure during proof purge and confirming the log line reports only the successful count, (c) reading the updated upload endpoint and confirming the file stream is wrapped in a deterministic disposal pattern from the moment it is opened, (d) inspecting required admin form fields with an a11y inspector and observing `aria-required="true"`, (e) removing the `lint` script locally and confirming the CI step fails rather than silently passes, and (f) introducing a deliberate a11y violation (e.g., `<img>` with no `alt`) and confirming `npm run lint` reports it.

**Acceptance Scenarios**:

1. **Given** an outbox row in terminal failed state with a last-attempt timestamp older than the retention cutoff, **When** the retention service next runs, **Then** the row is deleted by the same query that prunes successfully-sent rows.
2. **Given** a batch of payment proofs is processed by the retention purge and one or more file deletes fail, **When** the service logs its completion, **Then** the reported "purged" count equals the number of rows whose file deletion actually succeeded.
3. **Given** an exception is thrown after a proof-upload request opens the form-file stream but before the existing `using` declaration is reached, **When** the request completes (success or failure), **Then** the stream has been deterministically disposed.
4. **Given** an admin form field is required, **When** an assistive-tech user lands on that field, **Then** the field is announced as required (via the HeroUI `isRequired` prop or an explicit `aria-required` attribute).
5. **Given** the frontend `lint` script is missing or fails, **When** CI runs, **Then** the lint step fails the pipeline rather than passing silently.
6. **Given** a static a11y violation is present in the source (e.g., interactive element with no keyboard handler, image with no alt), **When** the frontend lint runs locally or in CI, **Then** the violation is reported as a lint error or warning.

---

### Edge Cases

- A proof-purge batch where **every** file delete fails must log `0 purged` (not the batch size) and leave all rows un-purged.
- An outbox row that was retried up to the max-attempts cap and is now in failed state but **inside** the retention cutoff must not be purged early.
- The skip-link must remain reachable in both LTR (English) and RTL (Arabic) layouts and must respect the existing reduced-motion convention.
- Admin form refactors must preserve the existing submit / mutation behavior — no change to the network contract, only client-side validation and field-level error rendering.
- The cache-header fix must not over-cache authenticated endpoints (cart, orders, admin) — the intended directive only applies to public catalog reads.
- Removing the conditional guard from the CI lint step must not break local-dev workflows that legitimately lack the lint script in scratch branches; the change applies to the canonical CI workflow only.
- Adding `eslint-plugin-jsx-a11y` must not produce a flood of pre-existing violations that block merge; if any are surfaced, they are fixed in the same change set or explicitly waived with justification.

## Requirements *(mandatory)*

### Functional Requirements — Mediums (P1)

- **FR-001**: System MUST set the intended public `Cache-Control` and `Vary` headers on every applicable response before the response body is committed, so the directive is present on every catalog response — not only when headers happen to flush after the middleware runs. (Resolves F-001.)
- **FR-002**: Every admin and customer-facing form currently listed in F-005 MUST use the project's standard form pattern (react-hook-form + Zod schema) with field-level invalid-state and error-message rendering through HeroUI's form-aware props. The list of in-scope forms is the five files enumerated in F-005:
  - `frontend/src/features/addresses/components/AddressForm.tsx`
  - `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx`
  - `frontend/src/features/admin/catalog/components/ProductMasterForm.tsx`
  - `frontend/src/features/admin/catalog/components/ProductVariantsSection.tsx`
  - `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx`
- **FR-003**: Each storefront and admin layout MUST render a "Skip to main content" affordance as the first focusable element on the page. Activating it MUST move focus into a landmark element with a matching `id` and a programmatic-focus target. The affordance MUST be visually hidden by default and become visible on keyboard focus, in both LTR and RTL.

### Functional Requirements — Lows (P2)

- **FR-004**: The email-outbox retention service MUST also purge rows in the terminal failed state whose last-attempt timestamp is older than the same retention cutoff already used for sent rows. (Resolves F-002.)
- **FR-005**: The payment-proof retention purge service MUST track successful deletions in a dedicated counter and MUST log that counter — not the total batch size — as the "purged" count. (Resolves F-003.)
- **FR-006**: The proof-upload endpoint MUST ensure the request file stream is deterministically disposed along every exit path, including any exception thrown between stream open and the existing `using` declaration. (Resolves F-004.)
- **FR-007**: Every mandatory admin form field MUST communicate its required state to assistive technology, either via the HeroUI form-aware required prop (preferred, as a natural consequence of FR-002) or via an explicit `aria-required="true"` attribute. (Resolves F-007.)
- **FR-008**: The CI lint step MUST invoke the frontend lint script unconditionally so that a missing or renamed script fails the pipeline rather than silently passing. (Resolves F-008.)
- **FR-009**: The frontend lint configuration MUST include the recommended rule-set from `eslint-plugin-jsx-a11y`, integrated into the existing flat ESLint config. All violations surfaced by the plugin MUST be either fixed in this change set or recorded with an explicit, reviewer-justified disable comment. (Resolves F-009.)

### Functional Requirements — Audit Hygiene

- **FR-010**: Every finding F-001 through F-009 MUST be transitioned from `Open` to `Resolved` in the audit-report record, with a one-line evidence pointer (commit hash, file path, or test name) and the date of resolution.
- **FR-011**: The repository MUST pass the same verification commands the audit ran (frontend i18n parity check, frontend build, frontend tests, backend build, backend tests, npm audit, dotnet vulnerable-package list) after the change set.

### Key Entities *(include if feature involves data)*

- **EmailOutboxMessage**: Outbox row representing an email send attempt. Has a status (e.g., `Sent`, `Failed`) and timestamps (`DeliveredAt`, `LastAttemptAt`). After this change, both terminal statuses are subject to the same retention purge.
- **PaymentProof**: Row tracking an uploaded payment proof and its on-disk file. The purge service mutates a `FilePurgedAtUtc` field only when the file delete succeeds, and the log count must reflect that.
- **AuditFinding**: A row in the audit report (F-001 … F-009) with severity, category, location, and triage status. After this feature, every row is `Resolved`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the change set merges, **9 of 9** audit findings (F-001 … F-009) are marked `Resolved` in the audit report with evidence pointers. No finding is left `Open` or `Deferred`.
- **SC-002**: A repeat scan against the same rules used in spec 007 reports **zero net-new findings** introduced by the change set and **zero regressions** of resolved findings from prior specs (003–006).
- **SC-003**: Every public catalog response observed in a sampled trace carries the intended cache directives **100%** of the time (currently 0% in production paths due to F-001).
- **SC-004**: A keyboard-only user can reach the main content region of any storefront or admin page in **one keypress** (`Tab` → skip-link → `Enter`), down from the current "tab through every header item" baseline.
- **SC-005**: Every form listed in FR-002 blocks submission and renders field-level errors when given empty or invalid required input, with **zero** server round-trips for purely client-side validation failures.
- **SC-006**: The CI lint step **fails** rather than silently passes when its underlying script is missing or renamed. Verified by a one-time local check that intentionally renames the script and observes a red pipeline run.
- **SC-007**: All audit verification commands (i18n parity, frontend build, frontend tests, backend build, backend tests, vulnerability scans) return the same green status they did at the close of spec 007.

## Assumptions

- The remediation can be implemented entirely within the existing tech stack (.NET 10 minimal APIs, React 19 + HeroUI v3, react-hook-form + Zod, ESLint flat config); no new framework, library category, or service is needed beyond `eslint-plugin-jsx-a11y` as a dev dependency.
- The five forms enumerated in F-005 are the authoritative scope for the form-refactor work; no other admin / customer form is in scope unless surfaced by the `eslint-plugin-jsx-a11y` adoption or by re-running the audit's verification commands.
- Network contracts (request / response shapes, mutation endpoints) are **unchanged** by the form refactors — only client-side state management, validation, and error rendering are refactored.
- The audit report file at `specs/007-code-audit/audit-report.md` will be updated in-place to reflect resolution status, OR a parallel resolution log will live under `specs/008-audit-fix-pass/`. Either approach is acceptable so long as every finding's status is tracked and discoverable.
- Existing test suites (48 backend test classes, 53 frontend test files, vitest-axe a11y harness) are the authoritative regression net; this feature adds tests only where coverage is missing for the specific behaviors changed.
- The Constitution principle on RTL parity and reduced-motion discipline applies to every UI change in this pass, especially the skip-link.
