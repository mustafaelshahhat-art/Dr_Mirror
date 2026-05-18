# Phase 1 Pre-Flight Baseline

Use these values in the Phase A commit body.

| Check | Recorded value |
|-------|----------------|
| Build | PASS (`npm run build`) |
| Lint | PASS, 0 errors / 0 warnings (`npm run lint`) |
| Test | PASS, 208 passed / 208 total (`npm run test`) |
| i18n | PASS (`npm run i18n:check`) |

Notes:

- Vitest emitted existing jsdom canvas `getContext()` not-implemented warnings, but all test files and tests passed.
