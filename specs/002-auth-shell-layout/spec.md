# Feature Specification: Auth Shell Layout

**Feature Branch**: `002-auth-shell-layout`

**Created**: 2026-05-19

**Status**: Clarified

**Input**: User description: "Update the authentication UI as a shared AuthShell, not only the login page. The Dr. Mirror logo, Home/Back to store action, language toggle, and theme toggle must be part of a reusable auth layout used by all auth pages."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Auth Experience (Priority: P1)

A visitor navigating between the Login and Register pages sees the same branded header with the Dr. Mirror logo, a Home/Back to store link, language toggle, and theme toggle — without the chrome re-mounting or flickering between routes. Each page renders only its own form content inside a shared layout shell.

**Why this priority**: Core requirement — the entire feature exists to eliminate duplicated header/logo code and deliver a single cohesive authentication surface.

**Independent Test**: Navigate between /login and /register; verify that the header (logo, Home link, LangSwitcher, ThemeToggle) remains constant while only the form area transitions.

**Acceptance Scenarios**:

1. **Given** a visitor on /login, **When** they view the page, **Then** the header shows the Dr. Mirror logo, a Home link, a language toggle, and a theme toggle — all rendered by the shared AuthShell, not the LoginPage itself.
2. **Given** a visitor on /register, **When** they view the page, **Then** the same header elements appear, rendered by the shared AuthShell.
3. **Given** a visitor on /login, **When** they click the link to /register, **Then** only the form content area updates; the header does not re-render.

---

### User Story 2 - Logo Adapts to LTR and RTL (Priority: P1)

An Arabic-speaking user switches the language to Arabic. The logo and header elements reflow correctly for RTL without overlapping or misalignment. Conversely, switching to English produces a balanced LTR layout.

**Why this priority**: The product is Arabic-first and RTL correctness is mandatory from day one.

**Independent Test**: Toggle language between Arabic and English on any auth page and verify the logo placement and header alignment are visually balanced in both directions.

**Acceptance Scenarios**:

1. **Given** the language is Arabic (RTL), **When** the auth page renders, **Then** the logo is positioned at the inline-start edge and action buttons at the inline-end edge.
2. **Given** the language is English (LTR), **When** the auth page renders, **Then** the layout mirrors correctly with logo at inline-start and actions at inline-end.
3. **Given** any viewport width (mobile, tablet, desktop), **When** the auth page renders in either direction, **Then** the logo and controls never overlap or clip.

---

### User Story 3 - Home/Back to Store Navigation (Priority: P2)

A visitor on any auth page wants to return to the storefront without logging in. They click the Home/Back to store link in the header and are taken to the catalog root.

**Why this priority**: Provides an escape hatch so visitors never feel trapped on auth screens.

**Independent Test**: On /login and /register, click the Home link and verify navigation to the store root (/).

**Acceptance Scenarios**:

1. **Given** a visitor on /login, **When** they click the Home/Back to store link, **Then** they are navigated to the store root path.
2. **Given** a visitor on /register, **When** they click the Home/Back to store link, **Then** they are navigated to the store root path.

---

### User Story 4 - Responsive Logo & Header Balance (Priority: P2)

On mobile (< 640px), tablet (640–1024px), and desktop (> 1024px) the auth shell header remains visually balanced. The logo is legible, the controls are accessible, and nothing overflows.

**Why this priority**: The majority of Egyptian e-commerce users access from mobile devices; responsive correctness is essential.

**Independent Test**: Resize the viewport across breakpoints and verify no overflow, truncation, or misalignment.

**Acceptance Scenarios**:

1. **Given** a mobile viewport, **When** the auth page renders, **Then** the logo and header actions fit within a single row without wrapping.
2. **Given** a desktop viewport, **When** the auth page renders, **Then** the header uses available space proportionally without feeling sparse or cramped.

---

### Edge Cases

- What happens when the logo image fails to load? The app name text should serve as fallback.
- How does the header behave when both language and theme toggles are pressed in rapid succession? State should be independent and not conflict.
- What if a future auth page (e.g., forgot password) is added later? The AuthShell should accept arbitrary children without modification.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a single shared AuthShell layout component that wraps all public-only authentication routes (/login, /register, and any future auth pages).
- **FR-002**: AuthShell MUST render the Dr. Mirror logo as a linked group containing the favicon SVG icon mark plus the localized app name text wordmark (`t('appName')`). The icon MUST be small, vertically aligned, and not visually dominant. The text wordmark MUST be readable and consistent with the current `appName` translation. In LTR the icon precedes the text; in RTL the group remains visually balanced (flexbox natural order). The entire group MUST link to the store root (`/`). If the SVG fails to load, the text wordmark alone MUST preserve brand legibility. The logo group MUST render correctly in both light and dark modes.
- **FR-003**: AuthShell MUST render a language toggle (LangSwitcher) and a theme toggle (ThemeToggle) in the header.
- **FR-004**: AuthShell MUST use logical CSS properties exclusively (ms-*, me-*, ps-*, pe-*, text-start, text-end) to support both LTR and RTL without layout-specific overrides.
- **FR-005**: Each auth page (LoginPage, RegisterPage) MUST render only its own form content; header/logo/controls MUST NOT be duplicated inside individual pages.
- **FR-006**: AuthShell MUST be integrated as a layout route in the router so child pages render via an Outlet or equivalent slot without remounting the shell on navigation.
- **FR-007**: All existing authentication logic, form validation (Zod schemas), API calls, and post-auth navigation MUST remain unchanged.
- **FR-008**: The logo placement MUST be visually balanced and non-overlapping at mobile (< 640px), tablet (640–1024px), and desktop (> 1024px) viewport widths.
- **FR-009**: AuthShell MUST use HeroUI v3 components (Card, CardBody, CardHeader, Button, Link) where appropriate for interactive elements.
- **FR-010**: The auth form area MUST be wrapped in a HeroUI `<Card>` component providing subtle visual containment — background differentiation, border, border-radius, and soft elevation. The card MUST NOT appear as a heavy modal; the aesthetic MUST be premium and minimal, aligned with Dr. Mirror brand. The card MUST render correctly in both light and dark modes with inputs clearly visible. Card width MUST be controlled (~420–480px on desktop); on mobile it MUST use comfortable side padding without cramped spacing. Existing form logic, validation, routing, and submit behavior MUST be preserved.
- **FR-011**: All new or changed UI strings MUST have entries in both `locales/ar/*.json` and `locales/en/*.json`.

### Key Entities

- **AuthShell**: Reusable layout component responsible for the branded header (logo, Home link, LangSwitcher, ThemeToggle) and a content slot for child auth pages.
- **AuthCard**: Existing card wrapper for form content (title, subtitle, children, footer). May be retained for the inner form area or merged into AuthShell depending on implementation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero duplicated header/logo/toggle markup across auth page components — only the AuthShell renders the shared chrome.
- **SC-002**: Navigating between /login and /register does not remount or re-render the shared header elements (verifiable via React DevTools highlight or absence of flicker).
- **SC-003**: Auth pages render correctly in both RTL (Arabic) and LTR (English) with no overlapping, clipping, or misaligned elements across all breakpoints.
- **SC-004**: The Home/Back to store link is present and functional on every auth page.
- **SC-005**: All existing tests pass without modification (ProtectedRoute tests, auth-redirect tests, post-auth destination tests).
- **SC-006**: `npm run i18n:check` passes with no missing keys.
- **SC-007**: `npm run build` produces no TypeScript or lint errors.

## Assumptions

- No Forgot Password or Reset Password pages currently exist in the codebase; the spec covers only the two existing auth pages (Login, Register). The AuthShell design should accommodate future auth pages without code changes.
- The Dr. Mirror logo is rendered as the existing `/favicon.svg` icon mark paired with the localized `t('appName')` text wordmark. No separate dedicated logo asset is required.
- The existing `AuthCard` component can be refactored or superseded by AuthShell without breaking any other consumers, since it is only imported by LoginPage and RegisterPage.
- The storefront root path is `/` — the Home link navigates there.
- HeroUI v3 is already installed and configured in the project.
