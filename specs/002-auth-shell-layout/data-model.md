# Data Model: Auth Shell Layout

**Feature**: Auth Shell Layout
**Date**: 2026-05-19

## Overview

This feature is purely a frontend UI refactor. No new entities, database tables, or API contracts are introduced. The "data" involved is limited to component props and i18n keys.

## Component Interfaces

### AuthShell (new)

Router-level layout component. No props — it reads context from React Router (`<Outlet />`), i18next, and next-themes.

**Renders**:
- Header: logo (linked to `/`), "Back to store" text link, LangSwitcher, ThemeToggle
- Main: centered content area with `<Outlet />`

**Children** (via Outlet): LoginPage, RegisterPage, future auth pages

---

### AuthCard (refactored)

Inner card component using HeroUI `<Card>` / `<CardBody>` / `<CardHeader>` for form-level presentation with subtle visual containment (background, border, radius, soft elevation).

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | yes | Page heading (e.g., "Sign In") |
| subtitle | string | no | Secondary text below title |
| children | ReactNode | yes | Form content slot |
| footer | ReactNode | no | Footer content (e.g., link to other auth page) |

**Visual constraints**:
- Width: ~420–480px max on desktop; full-width with comfortable padding on mobile
- Aesthetic: subtle, premium, minimal — not a heavy modal or flashy SaaS card
- Light/dark: must render correctly in both themes with inputs clearly visible

**Change from current**: The `AuthCard` no longer renders the full-page background, header with app name, LangSwitcher, or ThemeToggle. Those responsibilities move to `AuthShell`. The wrapper becomes a HeroUI Card with visual containment.

---

## i18n Keys (new)

| Key | ar | en |
|-----|----|----|
| `auth.backToStore` | العودة إلى المتجر | Back to store |

## State

No new global or local state. Theme and language state is managed by existing providers (next-themes, i18next). The AuthShell is stateless.
