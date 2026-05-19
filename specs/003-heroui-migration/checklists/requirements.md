# Specification Quality Checklist: HeroUI v3 Full Migration

**Purpose**: Validate specification completeness and quality before proceeding to planning and implementation. Re-validated against the revised specification artifacts.

**Created**: 2025-05-19
**Revised**: 2026-05-19 (HeroUI v3 anatomy alignment pass)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) beyond the bound technology stack — spec references HeroUI v3 export names + dot-notation compound parts as the binding contract.
- [x] Focused on user value (theme inheritance, accessibility, RTL parity, consistent UX) and business needs (visual coherence, maintainability).
- [x] Written for technical reviewers and operator stakeholders (the migration is a developer-facing refactor; spec readability remains accessible to non-technical reviewers).
- [x] All mandatory sections completed.

## Requirement Completeness

- [x] No `[NEEDS CLARIFICATION]` markers remain.
- [x] Requirements are testable and unambiguous.
- [x] Success criteria are measurable (build, tests, i18n, lint, grep gates, visual matrix).
- [x] Success criteria reference verifiable artefacts (CLI gate exit codes, grep results, screenshot matrix per surface).
- [x] All acceptance scenarios are defined.
- [x] Edge cases are identified (missing HeroUI primitives → Approved Composition Component or registered exception; file-input → Exception 3; navigable card pattern; confirm/destroy modal split).
- [x] Scope is clearly bounded (frontend-only refactor; no backend / DB / API / route changes).
- [x] Dependencies and assumptions identified (provider-chain audit, baseline metrics, exception removals).

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria via user stories or per-batch tasks.
- [x] Exceptions are explicitly documented (`Snippet` wrapper = Exception 2; native `<input type="file">` = Exception 3). Former Exception 1 (RAC `role="radio"`) is **removed**; the four files migrate to `ToggleButtonGroup` in Phase 12b.
- [x] Each exception's same-file justification comment satisfies acceptance criterion 5 (rejected-primitive trail naming the specific HeroUI v3 primitive(s) considered and the concrete rejection reason).
- [x] Migration is scoped as refactoring — no new features, no new pages, no new endpoints, no business-logic changes.
- [x] Build / test / i18n:check / lint / SC-009 visual matrix / extended grep-gate criteria defined as per-batch gates.
- [x] RTL / i18n / accessibility / theme parity preservation explicitly required (FR-011, FR-013; SC-005, SC-007, SC-009).

## HeroUI v3 Anatomy Compliance

- [x] All v2-era component names are replaced with v3 equivalents (or referenced only as "do-not-use" callouts):
  - `CardBody` / `CardHeader` / `CardFooter` named exports → `Card.Header` / `Card.Title` / `Card.Description` / `Card.Content` / `Card.Footer` (dot-notation compound).
  - `TableHeader` / `TableColumn` / `TableBody` / `TableRow` / `TableCell` named exports → `Table.ScrollContainer` / `Table.Header` / `Table.Column` / `Table.Body` / `Table.Row` / `Table.Cell`.
  - `Textarea` (lowercase) → `TextArea` (capital A).
  - `Divider` → `Separator`.
  - `Navbar` → Approved Composition Component (no v3 export).
  - `EmptyState` → Approved Composition Component (no v3 export).
  - `Alert.Icon` → `Alert.Indicator`.
  - `<Card isPressable>` → v3-canonical navigable card pattern.
  - `<Spinner label="…">` → sibling `<span className="sr-only">` for SR text.
  - `<Skeleton><div /></Skeleton>` → self-closing `<Skeleton className="…" animationType="…" />`.
  - `BreadcrumbsItem` → `Breadcrumbs.Item`.
  - `LinkButton` → deleted; consumers use `<Button as={Link}>`.
  - `PaginationBar` → deleted; consumers use `PaginationControls` shim.
- [x] `data-model.md` ships an authoritative **HeroUI v3 Component Anatomy (Appendix)** (sections A.1–A.25) and every task cites it.
- [x] HeroUI v3 primitives that the original draft ignored are addressed: `Badge` (anchored counters, FR-005b), `Toolbar` (FR-010a), `Typography` (FR-010b), `AlertDialog` (FR-010c), `Toast` (FR-010d), `Fieldset` (FR-010e), `InputGroup` (FR-010f), `InputOTP` (FR-010g), `Surface` (Header composition).

## Source-of-Truth Coverage

- [x] **All interactive controls** use HeroUI v3 primitives where an equivalent exists (FR-017). Raw HTML controls and non-HeroUI third-party UI primitives only permitted via the exceptions register.
- [x] **App-specific composition wrappers** are thin compositions over HeroUI primitives + Lucide icons (FR-018). Future shell / layout / section / feature wrappers automatically permitted provided they satisfy the FR-018 contract.
- [x] **Theme source of truth** (FR-019): HeroUI v3 CSS-variable layer + `tailwind-variants` extending HeroUI variants; new tokens added only as overrides in `frontend/src/styles/globals.css`. No parallel Tailwind `theme.extend` token system.
- [x] **Animation source of truth** (FR-020): HeroUI v3 primitive motion / `Custom Animations` slots / CSS transitions extending HeroUI motion tokens. Direct `framer-motion` imports in app code forbidden; per-batch grep gate enforces it. Page-load animations / parallax / scroll-jacking / autoplay carousels remain forbidden per Constitution Principle VIII.

## Exception Trail Coverage

- [x] Each registered exception's same-file justification comment names the specific HeroUI v3 primitive(s) considered and the concrete rejection reason (criterion 5).
- [x] Each exception has a sunset condition documented.
- [x] Sunset re-evaluation cadence is defined (every HeroUI v3 minor-version bump).
- [x] Anti-exception examples are listed (13 patterns explicitly rejected as exceptions in `contracts/exceptions-register.md`).

## Per-Task Acceptance Gate Coverage

- [x] Every UI task names the HeroUI primitive(s) used and cites the relevant Anatomy Appendix section.
- [x] Every UI task cites the mapping row from `data-model.md` Element → Export Mapping.
- [x] Every UI task enumerates props / variants / state attributes set.
- [x] Every UI task lists new i18n keys (or "None").
- [x] Every batch ends with the four CLI gates (build / test / i18n:check / lint).
- [x] Every batch ends with the **SC-009 Visual Verification Matrix** task (`-vm` suffix).
- [x] Every batch ends with the per-batch grep gate (raw primitives + extended drift gates).

## Visual Verification Matrix Coverage (SC-009)

- [x] Every modified surface MUST pass: en LTR + ar RTL × light + dark × 375 / 768 / 1280 px + keyboard reachability + visible focus rings + Escape close (where applicable) + idle / loading / disabled / error / empty states + no horizontal overflow + no mirrored imbalance.
- [x] PR description MUST include the per-surface matrix table (`quickstart.md` § Visual Verification Matrix).
- [x] Failures block the batch.

## Extended Grep Gate Coverage

- [x] Raw `<button>` (excluding documented exceptions) returns zero.
- [x] Raw `<a href="/…">` for in-app routing returns zero.
- [x] Raw `<input>` (excluding Exception 3 `type="file"`) / `<select>` / `<textarea>` returns zero.
- [x] Raw `<table>` / `<dialog>` / `<hr>` returns zero.
- [x] Raw `<nav>` / `<header>` / `<footer>` outside Approved Composition Components returns zero.
- [x] Direct `framer-motion` imports in app code returns zero.
- [x] Emoji glyphs in `.tsx` files return zero (manual visual review).
- [x] Hand-styled `<h1>` / `<h2>` / `<h3>` / `<p>` patterns post-`Typography` migration return zero in modified files.
- [x] `type="file"` returns only Exception 3 files.
- [x] `role="radio"` returns zero after Phase 12b lands.
- [x] Imports of deleted local primitives (`LinkButton`, `PaginationBar`) return zero after their batches land.
- [x] Banned v2 names (`CardBody` / `CardHeader` / `CardFooter` / `TableHeader` / … / `Divider` / `Navbar` / `EmptyState` / `Alert.Icon` / `BreadcrumbsItem`) return zero in implementation.
- [x] `Textarea` (lowercase, case-sensitive) returns zero.
- [x] `isPressable` returns zero.
- [x] `<Spinner[^>]*label=` returns zero.

## Cross-File Consistency

- [x] `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `quickstart.md`, `checklists/requirements.md`, `contracts/exceptions-register.md` are mutually consistent on:
  - Number of exceptions: **2** (Snippet + native `<input type="file">`); former Exception 1 removed.
  - Number of deleted files: **2** (`LinkButton.tsx`, `PaginationBar.tsx`).
  - Number of phases: **13** (Setup, Foundational, US1–US10, Phase 12b RAC sunset, Polish).
  - The Anatomy Appendix is cited as the binding reference.
  - The Approved Composition Components contract is cited consistently.
  - The provider-chain audit and shared-shim audit are sequenced in Phase 2 (Foundational).

## Specification Summary

| Metric | Value |
|--------|-------|
| User Stories | 10 + Phase 12b (RAC sunset) + Phase 13 (Polish) |
| Functional Requirements | 22 (FR-001–FR-016 + FR-005a/b split + FR-010a–g + FR-017–FR-020) |
| Success Criteria | 11 (SC-001–SC-011) |
| Edge Cases | 6 |
| Accepted Exceptions | 2 (`Snippet` Exception 2, native `<input type="file">` Exception 3) |
| Removed Exceptions | 1 (former Exception 1 RAC `role="radio"` → migrated to `ToggleButtonGroup` in Phase 12b) |
| Approved Composition Components | 19+ (the canonical list lives in `data-model.md` § Approved Composition Components; new wrappers are auto-permitted under FR-018) |
| Anatomy Appendix sections | 25 (A.1–A.25) |
| Banned v2 names | 13 (CardBody / CardHeader / CardFooter / TableHeader / TableColumn / TableBody / TableRow / TableCell / Textarea (lowercase) / Divider / Navbar / EmptyState / Alert.Icon, plus `<Card isPressable>`, `<Spinner label>`, `BreadcrumbsItem`, `LinkButton`, `PaginationBar` listed in the data-model Banned v2 Names section) |
| Per-batch verification gates | 6 (build / test / i18n:check / lint / SC-009 visual matrix / extended grep gate) |
| `[NEEDS CLARIFICATION]` markers | 0 |
