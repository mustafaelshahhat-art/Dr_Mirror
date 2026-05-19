# Research: Auth Shell Layout

**Feature**: Auth Shell Layout
**Date**: 2026-05-19

## Research Questions

### 1. Router-Level Layout Pattern in react-router-dom v7

**Decision**: Use a parent `<Route element={<AuthShell />}>` that wraps all public auth child routes, with `<Outlet />` rendering the active page.

**Rationale**: React Router v7 supports layout routes natively — a Route with an `element` but no `path` acts as a layout, re-rendering only the Outlet content when children change. This prevents shell remount and keeps header state (theme, language) stable.

**Alternatives considered**:
- **Wrapper component per page** (current `AuthCard` approach): Causes full remount on navigation; duplicates chrome across pages. Rejected.
- **Context-based conditional rendering**: Overly complex for a layout concern. Rejected.

### 2. Logo Asset Strategy

**Decision**: Render the logo as a linked group: `favicon.svg` icon mark (small, aligned, not dominant) + localized `t('appName')` text wordmark beside it. The group links to `/`. If the SVG fails, the text wordmark alone preserves legibility.

**Rationale**: Clarified with stakeholder — Option B chosen. The icon provides brand recognition while text ensures legibility at all sizes and graceful degradation. Works in both light/dark modes and RTL/LTR via flexbox natural order.

**Alternatives rejected**:
- **Icon-only (Option A)**: Lacks legibility at small sizes and has no text fallback.
- **Text-only (Option C)**: Current approach — functional but lacks visual identity.

### 3. Home/Back to Store Link Semantics

**Decision**: The logo itself acts as the Home link (wrapping it in a `<Link to="/">`), plus a subtle text link "Back to store" below or beside it for discoverability.

**Rationale**: Logo-as-home-link is a universal web convention and satisfies the requirement without consuming extra header space. A secondary text link ensures discoverability for users who don't know the convention.

**Alternatives considered**:
- **Separate Home icon button**: Adds visual noise in a minimal auth header. Rejected.
- **Logo only (no text link)**: May not be discoverable for all users. Rejected as sole mechanism.

### 4. AuthCard vs AuthShell Separation of Concerns

**Decision**: Keep `AuthCard` as an inner container using HeroUI `<Card>` / `<CardBody>` / `<CardHeader>` — providing subtle visual containment (background, border, radius, soft elevation). Introduce `AuthShell` as the outer router-level layout (header with logo/toggles, centered main area, Outlet). Card width ~420–480px on desktop; comfortable padding on mobile.

**Rationale**: Clarified with stakeholder — Option A chosen. A HeroUI Card gives the form area polished visual separation from the page background. Premium and minimal aesthetic, not flashy. Works in both light/dark modes.

**Alternatives rejected**:
- **Plain unstyled container (Option B)**: Form floats on background with no visual containment — feels unfinished.
- **Merge everything into AuthShell**: Monolithic; rejected.
- **Remove AuthCard entirely**: Each page re-implements styling; rejected.

### 5. RTL Logo Placement

**Decision**: Use `justify-between` with logical properties (no `ml`/`mr`). Logo at `inline-start`, action buttons at `inline-end`. Flexbox auto-flips with `dir="rtl"`.

**Rationale**: Tailwind's flexbox utilities combined with the document's `dir` attribute handle RTL/LTR flipping automatically when using `justify-between`. No direction-specific code needed.

**Alternatives considered**:
- **Explicit RTL conditional classes**: Unnecessary complexity. Rejected.
- **CSS `direction` override per element**: Fragile and non-standard. Rejected.

## Summary

All research questions resolved. No NEEDS CLARIFICATION items remain. The implementation path is:
1. Create `AuthShell` as a layout route component with header (logo-link + toggles) and `<Outlet />`.
2. Refactor `AuthCard` to remove header chrome (it was moved to AuthShell).
3. Update `router.tsx` to nest auth routes under AuthShell.
4. Add i18n keys for "Back to store" in both locales.
