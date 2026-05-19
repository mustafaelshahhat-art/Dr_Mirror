# Quickstart: Auth Shell Layout

**Feature**: Auth Shell Layout
**Date**: 2026-05-19

## Prerequisites

- Node.js (see `.nvmrc`)
- Frontend dependencies installed: `npm --prefix frontend install`

## Development

```powershell
# Start dev server
npm --prefix frontend run dev
```

Navigate to `http://localhost:5173/login` or `/register` to see the auth shell in action.

## Verification

```powershell
# Type-check + lint
npm --prefix frontend run build

# Unit tests
npm --prefix frontend test

# i18n parity check
npm --prefix frontend run i18n:check
```

## Key Files

| File | Role |
|------|------|
| `frontend/src/features/auth/components/AuthShell.tsx` | New layout shell (logo, toggles, Outlet) |
| `frontend/src/features/auth/components/AuthCard.tsx` | Refactored inner card (form presentation only) |
| `frontend/src/app/router.tsx` | Route tree — auth routes nested under AuthShell |
| `frontend/src/locales/ar/auth.json` | Arabic auth strings |
| `frontend/src/locales/en/auth.json` | English auth strings |

## Testing Checklist

1. `/login` shows Dr. Mirror logo, Home link, LangSwitcher, ThemeToggle
2. `/register` shows the same header (no remount on navigation)
3. Toggle language → layout flips RTL ↔ LTR correctly
4. Toggle theme → light/dark applies instantly
5. Click logo or "Back to store" → navigates to `/`
6. Resize viewport → header remains balanced (mobile, tablet, desktop)
7. All existing auth flows (login, register, validation errors) work unchanged
