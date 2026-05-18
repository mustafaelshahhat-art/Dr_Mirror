# Feature Specification: Audit Fix Pass

**Feature Branch**: `001-audit-fix-pass`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "Fix all 9 issues identified in audit-report.md without skipping any"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend Middleware & Services Corrections (Priority: P1)

A developer deploys the backend to production. Cache-control headers are correctly applied to catalog responses before the response body is written, enabling browser and CDN caching as designed. Background services accurately log purge counts and purge all terminal-state outbox rows, providing operators with trustworthy observability data.

**Why this priority**: Dead middleware (F-001) directly affects production caching behavior and CDN performance. Inaccurate purge logging (F-003) misleads operators. These are correctness issues in the running system.

**Independent Test**: Can be verified by running the backend test suite after fixes, plus manual inspection of cache-control headers on catalog responses and accurate purge-count logging.

**Acceptance Scenarios**:

1. **Given** a catalog endpoint response, **When** the response is served, **Then** the `Cache-Control` and `Vary` headers are present and correctly set before the response body is committed.
2. **Given** the EmailOutboxRetentionService runs a purge cycle, **When** there are rows in both `Sent` and `Failed` terminal states older than the retention cutoff, **Then** both `Sent` and `Failed` rows are deleted.
3. **Given** the PaymentProofRetentionPurgeService runs a purge cycle and some file deletions fail, **When** the cycle completes, **Then** the logged purge count reflects only the number of successfully purged files, not the total batch size.
4. **Given** a payment proof upload request, **When** `file.OpenReadStream()` is called, **Then** the stream is deterministically disposed even if an exception occurs before the existing `using` declaration at line 114.

---

### User Story 2 - Admin Forms Convention Compliance (Priority: P1)

An admin user fills out a category, product, variant, or payment-method form in the admin dashboard. Every form validates input against a Zod schema via react-hook-form before submission, displays field-level error messages using HeroUI `isInvalid` and `errorMessage` props, and marks required fields with `isRequired` so assistive technology announces them correctly.

**Why this priority**: Multiple admin forms violate the project's mandatory react-hook-form + Zod convention (F-005) and lack `aria-required` (F-007). This is a Medium-severity convention violation affecting data integrity and accessibility simultaneously.

**Independent Test**: Can be verified by submitting each admin form with invalid or missing data and confirming schema-driven error messages appear, and by screen-reader audit confirming required fields are announced.

**Acceptance Scenarios**:

1. **Given** the `AddressForm` component, **When** a user submits with empty required fields, **Then** Zod-driven validation errors appear inline on each invalid field.
2. **Given** the `AdminCategoriesPage` category form, **When** a user submits with empty required fields, **Then** Zod-driven validation errors appear inline on each invalid field.
3. **Given** the `ProductMasterForm` component, **When** a user submits with empty required fields, **Then** Zod-driven validation errors appear inline on each invalid field.
4. **Given** the `ProductVariantsSection` variant form, **When** a user submits with missing required fields, **Then** Zod-driven validation errors appear inline on each invalid field.
5. **Given** the `PaymentMethodForm` component, **When** a user submits with empty required fields, **Then** Zod-driven validation errors appear inline on each invalid field.
6. **Given** any of the above forms rendered in a screen reader, **When** focus reaches a mandatory field, **Then** the screen reader announces the field as required via `aria-required="true"`.

---

### User Story 3 - Skip-Link Accessibility (Priority: P2)

A keyboard-only user visits any page on the storefront or admin dashboard. They press Tab once and a "Skip to main content" link becomes visible. Activating it moves focus directly to the main content area, bypassing the full header and navigation.

**Why this priority**: WCAG 2.1 Level A criterion 2.4.1 (Bypass Blocks) is a baseline accessibility requirement. Both Layout and AdminLayout lack this feature (F-006).

**Independent Test**: Can be verified by tabbing on any storefront or admin page and confirming the skip-link appears on first Tab press, then confirming focus jumps to the main landmark on activation.

**Acceptance Scenarios**:

1. **Given** a storefront page rendered with `Layout`, **When** the user presses Tab, **Then** a visible "Skip to main content" link appears as the first focusable element.
2. **Given** the user activates the skip-link, **When** focus moves, **Then** the browser focus lands on the `<main>` element with `id="main-content"` and `tabIndex={-1}`.
3. **Given** an admin page rendered with `AdminLayout`, **When** the user presses Tab, **Then** a visible "Skip to main content" link appears as the first focusable element, with the same behavior as the storefront layout.

---

### User Story 4 - CI & Lint Hardening (Priority: P3)

A developer pushes a commit that accidentally removes the lint script from `package.json`. The CI pipeline fails the lint step explicitly rather than silently passing. Additionally, common JSX accessibility anti-patterns (missing alt text, invalid ARIA roles) are now flagged at lint time by `eslint-plugin-jsx-a11y`.

**Why this priority**: These are Low-severity preventive improvements. The fragile CI guard (F-008) could silently disable linting in a future refactor. Missing `jsx-a11y` (F-009) allows accessibility regressions to pass static analysis.

**Independent Test**: Can be verified by removing the lint script locally and confirming CI would fail, and by introducing an `<img>` without `alt` and confirming ESLint flags it.

**Acceptance Scenarios**:

1. **Given** the CI workflow lint step, **When** the lint script is present, **Then** linting runs and reports results normally.
2. **Given** the CI workflow lint step, **When** the lint script is missing from `package.json`, **Then** the step fails with a non-zero exit code instead of silently passing.
3. **Given** a JSX file with an `<img>` tag missing the `alt` attribute, **When** ESLint runs, **Then** `eslint-plugin-jsx-a11y` reports a violation.

---

### Edge Cases

- What happens when a cache-control header is set on a non-cacheable endpoint (e.g., POST /checkout)? Only GET catalog endpoints should receive cache headers.
- What happens when the EmailOutboxRetentionService encounters a `Failed` row whose `LastAttemptAt` is null? The query should handle null gracefully or treat it as eligible for purge.
- What happens when all variant form fields are optional? The form should still validate via Zod schema with optional fields, not crash.
- What happens when the skip-link is activated but the `<main>` element is not yet rendered (e.g., loading state)? Focus should not break; fallback to document body or top of page.
- What happens when `eslint-plugin-jsx-a11y` conflicts with existing HeroUI component patterns? Rules that produce false positives on HeroUI wrappers should be selectively disabled with documented comments.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST set `Cache-Control` and `Vary` response headers on GET catalog endpoints using `Response.OnStarting` or an endpoint filter, ensuring headers are applied before the response body is committed. (Fixes F-001)
- **FR-002**: The `EmailOutboxRetentionService` MUST purge rows in both `Sent` and `Failed` terminal states when their respective timestamps (`DeliveredAt` for Sent, `LastAttemptAt` for Failed) exceed the retention cutoff. (Fixes F-002)
- **FR-003**: The `PaymentProofRetentionPurgeService` MUST log the actual count of successfully purged files, not the total batch size. (Fixes F-003)
- **FR-004**: The `UploadPaymentProofEndpoint` MUST deterministically dispose the `file.OpenReadStream()` stream via a `using` declaration or `try/finally`, even if an exception occurs before the existing disposal point. (Fixes F-004)
- **FR-005**: All admin forms (`AddressForm`, `AdminCategoriesPage` category modal, `ProductMasterForm`, `ProductVariantsSection` variant form, `PaymentMethodForm`) MUST use react-hook-form with `zodResolver` for state management and validation. Raw `useState` for form field state is prohibited. (Fixes F-005)
- **FR-006**: Both `Layout` and `AdminLayout` MUST render a visually-hidden skip-link as the first focusable element that jumps focus to the `<main>` landmark element. The main element MUST have `id="main-content"` and `tabIndex={-1}`. (Fixes F-006)
- **FR-007**: All mandatory fields in the refactored admin forms MUST use HeroUI's `isRequired` prop, which sets `aria-required="true"` automatically. (Fixes F-007)
- **FR-008**: The CI lint step MUST invoke `npm run lint` directly without a conditional existence check, so that a missing script causes an explicit pipeline failure. (Fixes F-008)
- **FR-009**: The frontend MUST include `eslint-plugin-jsx-a11y` as a dev dependency with its recommended rule-set integrated into the flat ESLint config. (Fixes F-009)

### Key Entities *(include if feature involves data)*

- **EmailOutboxMessage**: Has a `Status` field (Sent, Failed, Pending) and timestamps `DeliveredAt`, `LastAttemptAt`. Purge logic targets terminal states.
- **PaymentProof**: Has `FilePurgedAtUtc`. Purge service deletes associated Cloudinary files and stamps this field.
- **Admin Forms**: AddressForm, AdminCategoriesPage (category modal), ProductMasterForm, ProductVariantsSection (variant form), PaymentMethodForm — each needs a Zod schema and react-hook-form integration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `Cache-Control: public, max-age=…` header is present on all GET catalog endpoint responses (verifiable via `curl -I`).
- **SC-002**: After a retention purge cycle with both Sent and Failed terminal rows older than the cutoff, zero such rows remain in the `EmailOutboxMessages` table.
- **SC-003**: The PaymentProofRetentionPurgeService log entry for purged count matches the actual number of successfully deleted files (verifiable in structured logs).
- **SC-004**: The `UploadPaymentProofEndpoint` stream is wrapped in a `using` declaration at the point of creation, confirmed by code inspection.
- **SC-005**: All five admin forms pass validation tests — submitting with empty required fields shows Zod-driven inline errors; no `useState` calls remain for form field state.
- **SC-006**: Pressing Tab on any page with `Layout` or `AdminLayout` reveals a skip-link as the first focusable element; activating it moves focus to `#main-content`.
- **SC-007**: All mandatory form fields render with `aria-required="true"` in the DOM, confirmed by accessibility audit or DOM inspection.
- **SC-008**: Removing the `lint` script from `package.json` and running the CI lint step results in a non-zero exit code.
- **SC-009**: Running `npm run lint` after adding `eslint-plugin-jsx-a11y` reports zero new violations on the existing codebase (or any violations are resolved).
- **SC-010**: All existing backend tests (`dotnet test`) and frontend tests (`npm test`) continue to pass after all fixes.

## Assumptions

- The existing `SecurityHeadersMiddleware` already demonstrates the correct `Response.OnStarting` pattern that can be reused for cache-control headers.
- The `EmailOutboxMessage` entity already has a `LastAttemptAt` property (introduced in spec 005) that can be used as the purge timestamp for Failed rows.
- HeroUI v3 `Input`/`TextField`/`Select` components support `isRequired`, `isInvalid`, and `errorMessage` props for react-hook-form integration.
- The skip-link i18n keys (`skipToContent` or similar) need to be added to both `ar/*.json` and `en/*.json` locale files.
- `eslint-plugin-jsx-a11y` recommended rules are compatible with the project's flat ESLint config format and do not produce false positives on standard HeroUI components.
- No new npm dependencies are needed beyond `eslint-plugin-jsx-a11y` (dev dependency). `react-hook-form`, `zod`, and `@hookform/resolvers` are already installed.
