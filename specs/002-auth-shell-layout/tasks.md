# Tasks: Auth Shell Layout

**Input**: Design documents from `specs/002-auth-shell-layout/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted. Existing tests must continue to pass.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (i18n Keys)

**Purpose**: Add new translation keys required by subsequent implementation tasks

- [X] T001 [P] Add `backToStore` key to `frontend/src/locales/en/auth.json` with value "Back to store"
- [X] T002 [P] Add `backToStore` key to `frontend/src/locales/ar/auth.json` with value "العودة إلى المتجر"

---

## Phase 2: Foundational (AuthShell Component)

**Purpose**: Create the router-level layout component that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create `AuthShell` layout component in `frontend/src/features/auth/components/AuthShell.tsx` — renders header with: (1) logo group = favicon SVG icon (`/favicon.svg`, small, aligned, not dominant) + localized text wordmark `t('appName')` beside it, entire group wrapped in HeroUI `Link` (with `as={RouterLink}` from react-router-dom) navigating to `/`; icon uses `<img>` with alt text, text remains visible as fallback if SVG fails; (2) "Back to store" text link using `t('auth.backToStore')` via HeroUI `Link` with `as={RouterLink}`; (3) `LangSwitcher`; (4) `ThemeToggle`; body with centered `<Outlet />`; uses logical CSS only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `justify-between`); responsive header at all breakpoints; works in light/dark mode; RTL-safe via flexbox natural order; HeroUI components provide built-in focus ring handling for keyboard accessibility
- [X] T004 Refactor `AuthCard` in `frontend/src/features/auth/components/AuthCard.tsx` — remove the outer `min-h-svh` full-page wrapper, header bar (app name, LangSwitcher, ThemeToggle), and `<main>` centering; replace with HeroUI `<Card>` / `<CardBody>` / `<CardHeader>` providing subtle visual containment (background, border, radius, soft elevation); width ~420–480px max on desktop (`max-w-md` or similar), full-width with comfortable padding on mobile; retain title `<h1>`, optional subtitle, children slot, optional footer inside the card; aesthetic: premium, minimal, not flashy; works in both light/dark modes with inputs clearly visible; the component expects to be rendered inside AuthShell's centered area

**Checkpoint**: AuthShell and refactored AuthCard ready — page integration can begin

---

## Phase 3: User Story 1 — Consistent Auth Experience (Priority: P1) 🎯 MVP

**Goal**: All auth pages share one header shell; navigating between /login and /register does not remount the chrome.

**Independent Test**: Navigate between /login and /register — header (logo, Home link, toggles) stays constant; only form content swaps.

### Implementation for User Story 1

- [X] T005 [US1] Update `frontend/src/app/router.tsx` — nest the `PublicOnlyRoute` auth routes inside an `AuthShell` layout route so `/login` and `/register` render as children of AuthShell via `<Outlet />`; lazy-import AuthShell
- [X] T006 [US1] Update `frontend/src/features/auth/LoginPage.tsx` — replace `<AuthCard>` wrapper usage to only pass title, subtitle, children, footer (no header chrome); ensure the page renders correctly inside the new AuthShell + AuthCard structure
- [X] T007 [US1] Update `frontend/src/features/auth/RegisterPage.tsx` — same refactor as LoginPage: use the slimmed-down AuthCard for form content only

**Checkpoint**: US1 complete — /login and /register share a single persistent header

---

## Phase 4: User Story 2 — Logo Adapts to LTR and RTL (Priority: P1)

**Goal**: Logo and header elements reflow correctly in both RTL (Arabic) and LTR (English) without overlap or misalignment.

**Independent Test**: Toggle language on any auth page — header flips correctly; logo at inline-start, actions at inline-end.

### Implementation for User Story 2

- [X] T008 [US2] Verify and adjust `AuthShell` header in `frontend/src/features/auth/components/AuthShell.tsx` — confirm all spacing uses `ms-*`/`me-*`/`ps-*`/`pe-*` and `text-start`/`text-end`; no `ml-*`/`mr-*`/`pl-*`/`pr-*`; flexbox `justify-between` handles natural RTL flip; logo `alt` text uses `t('appName')`; test visual balance at mobile/tablet/desktop widths in both directions

**Checkpoint**: US2 complete — RTL/LTR parity confirmed

---

## Phase 5: User Story 3 — Home/Back to Store Navigation (Priority: P2)

**Goal**: Visitors can return to the storefront from any auth page via the Home link.

**Independent Test**: Click logo or "Back to store" link on /login and /register — navigates to `/`.

### Implementation for User Story 3

- [X] T009 [US3] Verify Home link behavior in `frontend/src/features/auth/components/AuthShell.tsx` — confirm logo `Link` and "Back to store" text `Link` both navigate to `/`; verify keyboard accessibility (focusable, Enter activates); confirm links work from both /login and /register without full page reload

**Checkpoint**: US3 complete — escape hatch to storefront confirmed

---

## Phase 6: User Story 4 — Responsive Logo & Header Balance (Priority: P2)

**Goal**: Auth shell header is visually balanced at mobile (<640px), tablet (640–1024px), and desktop (>1024px).

**Independent Test**: Resize viewport across breakpoints — no overflow, truncation, or misalignment.

### Implementation for User Story 4

- [X] T010 [US4] Review and tune responsive behavior in `frontend/src/features/auth/components/AuthShell.tsx` — ensure logo image has a constrained max size (e.g., `h-8` or `h-10`); header padding uses responsive utilities (`px-4 md:px-6`); action buttons don't wrap on small screens; logo text/image remains legible at all sizes; no arbitrary Tailwind values without justification comment

**Checkpoint**: US4 complete — responsive balance confirmed

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [X] T011 Run `npm --prefix frontend run i18n:check` and fix any missing key parity between ar/en
- [X] T012 Run `npm --prefix frontend run build` and confirm zero TypeScript/lint errors
- [X] T013 Run `npm --prefix frontend test` and confirm all existing tests pass without modification
- [X] T014 Verify AuthShell handles future auth pages gracefully — confirm that adding a new route under the AuthShell layout route (e.g., `/forgot-password`) would require zero changes to AuthShell itself

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (i18n keys used by AuthShell)
- **User Stories (Phase 3–6)**: All depend on Phase 2 (AuthShell + AuthCard refactor)
  - US1 (Phase 3) must complete first — it wires up the router
  - US2, US3, US4 (Phases 4–6) can proceed in parallel after US1
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 — establishes the router layout integration
- **US2 (P1)**: Depends on US1 — needs AuthShell already wired in router to test RTL
- **US3 (P2)**: Depends on US1 — needs AuthShell already rendering to verify links
- **US4 (P2)**: Depends on US1 — needs AuthShell already rendering to verify responsive

### Within Each User Story

- AuthShell component before router integration
- Router integration before page refactors
- Page refactors can run in parallel (LoginPage, RegisterPage)

### Parallel Opportunities

- T001, T002 can run in parallel (different locale files)
- T006, T007 can run in parallel after T005 (different page files)
- T008, T009, T010 target the same file (`AuthShell.tsx`) — run sequentially in practice to avoid merge conflicts

---

## Parallel Example: Phase 3 (User Story 1)

```text
# After T005 (router wired), launch page updates in parallel:
Task T006: "Update LoginPage in frontend/src/features/auth/LoginPage.tsx"
Task T007: "Update RegisterPage in frontend/src/features/auth/RegisterPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: i18n keys (T001–T002)
2. Complete Phase 2: AuthShell + AuthCard refactor (T003–T004)
3. Complete Phase 3: Router wiring + page updates (T005–T007)
4. **STOP and VALIDATE**: Both /login and /register render inside shared shell
5. Run build + tests to confirm nothing broke

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Add US1 (Phase 3) → Test → **MVP delivered**
3. Add US2 (Phase 4) → Verify RTL parity
4. Add US3 (Phase 5) → Verify Home navigation
5. Add US4 (Phase 6) → Verify responsive balance
6. Phase 7 → Final validation pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new dependencies need to be installed (HeroUI, Lucide, react-router-dom already present)
- The existing `ProtectedRoute.test.tsx` and `auth-redirect.test.tsx` must pass unchanged
- The `PublicOnlyRoute` guard remains in place — AuthShell does not bypass it
- Commit after each phase for clean rollback points
