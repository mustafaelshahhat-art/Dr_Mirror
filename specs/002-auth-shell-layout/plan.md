# Implementation Plan: Auth Shell Layout

**Branch**: `002-auth-shell-layout` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-auth-shell-layout/spec.md`

## Summary

Refactor the existing `AuthCard` component into a router-level `AuthShell` layout that renders the Dr. Mirror logo (favicon SVG icon + localized text wordmark, linked to store root as Home/Back action), LangSwitcher, and ThemeToggle once — shared across all public auth routes (/login, /register). The form area is wrapped in a HeroUI `<Card>` with subtle visual containment (~420–480px on desktop). Child pages render via React Router `<Outlet>` so the shell never remounts on navigation. All existing auth logic, validation, and API calls remain unchanged.

## Technical Context

**Language/Version**: TypeScript ~6, React 19, Vite 8

**Primary Dependencies**: HeroUI v3, Tailwind CSS v4, react-router-dom v7, react-hook-form + Zod, i18next, next-themes, Lucide

**Storage**: N/A (frontend-only change)

**Testing**: Vitest (`npm test`)

**Target Platform**: Evergreen browsers (Chrome, Edge, Safari, Firefox) — desktop and mobile

**Project Type**: Web application (frontend layer only)

**Performance Goals**: No layout remount on auth route transitions; sub-100ms paint for shell chrome

**Constraints**: Logical CSS only (no physical direction); HeroUI-only components; Lucide-only icons; emerald accent only; both RTL and LTR must work at all breakpoints

**Scale/Scope**: 2 auth pages (Login, Register); 1 new layout component; 1 refactored component; ~7 files touched

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Full-Stack Production Reality | ✅ PASS | Frontend-only change; no backend/DB/API changes |
| II. Arabic-First Bilingual & RTL Parity | ✅ PASS | Logical CSS only; new strings in both ar/en; RTL logo placement tested |
| III. Security, Auth & Access Boundaries | ✅ PASS | No auth logic changes; PublicOnlyRoute guard preserved |
| IV. Egyptian Payment Integrity | ✅ N/A | No payment surface touched |
| V. Structural Integrity: Vertical Slices & Feature Folders | ✅ PASS | AuthShell lives in `features/auth/components/`; feature-folder discipline maintained |
| VI. Accessibility, Responsive & Theme Parity | ✅ PASS | Logo has alt text; Home link is keyboard-accessible; responsive at all breakpoints; both themes |
| VII. Observability, Reliability & Recovery | ✅ N/A | No backend/logging changes |
| VIII. UI System & Visual Discipline | ✅ PASS | HeroUI components; Lucide icons; logical CSS; one accent hue; no arbitrary values |

No violations — Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-auth-shell-layout/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── features/auth/
│   ├── components/
│   │   ├── AuthShell.tsx          # NEW — router-level layout (icon+text logo linked to /, Back to store, toggles, Outlet)
│   │   ├── AuthCard.tsx           # REFACTORED — HeroUI Card with subtle containment (~420–480px); title, subtitle, children, footer
│   │   └── FormField.tsx          # UNCHANGED
│   ├── LoginPage.tsx              # MODIFIED — remove AuthCard header props if any; renders inside AuthShell via Outlet
│   ├── RegisterPage.tsx           # MODIFIED — same
│   └── ...                        # Other auth files UNCHANGED
├── app/
│   └── router.tsx                 # MODIFIED — wrap PublicOnlyRoute children in AuthShell layout route
├── shared/components/
│   ├── LangSwitcher.tsx           # UNCHANGED
│   └── ThemeToggle.tsx            # UNCHANGED
└── locales/
    ├── ar/auth.json               # MODIFIED — add new i18n keys (backToStore, etc.)
    └── en/auth.json               # MODIFIED — add new i18n keys
```

**Structure Decision**: Frontend feature-folder structure. The `AuthShell` is co-located in `features/auth/components/` since it is auth-surface specific. Shared utility components (`LangSwitcher`, `ThemeToggle`) remain in `shared/components/`.
