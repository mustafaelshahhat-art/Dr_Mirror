# Screenshots — capture model & repo boundary

This directory holds UI/UX-pass screenshot deliverables (PNGs) and the per-phase capture checklists that drive them.

## Purpose

The UI/UX excellence pass (`specs/004-uiux-excellence-pass`) ships a per-phase visual-regression deliverable: each affected page/surface is captured in four states — `dark-rtl`, `dark-ltr`, `light-rtl`, `light-ltr`. PNGs land alongside their checklist under `docs/screenshots/uiux-pass/phase-<X>/`.

## External-capture model

Screenshot capture is performed by an **external local tool**, outside this repository. The external tool may internally use Playwright (or any other browser-automation framework) — that is its concern, not ours. This repository never installs, configures, or commits any browser-automation dependency.

## What MAY be committed

- The per-phase folder structure under `docs/screenshots/uiux-pass/phase-<X>/`.
- The per-phase `_capture-checklist.md` file (the source of truth for which surfaces × states to capture and what to name the PNG files).
- The captured PNG files themselves, named per the convention below.

## What MUST NOT be committed

- Any browser-automation package as a dependency: `playwright`, `@playwright/test`, `puppeteer`, `cypress`, `selenium-webdriver`, `webdriverio`, etc.
- Any browser-automation config: `playwright.config.*`, `cypress.config.*`, `wdio.conf.*`, etc.
- Any tool-generated artifact directories: `playwright-report/`, `test-results/`, `e2e/`, `*.spec.ts-snapshots/`, `*.test.ts-snapshots/`.
- Any lockfile delta (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) introduced by installing one of the above.
- Any runner script in `package.json` that invokes such a tool.

A defensive `.gitignore` guard at the repo root (see "Browser automation guard" section in `.gitignore`) prevents accidental commits of the generated artifacts, but the rule is broader than the ignore list: **do not add the dependency in the first place.**

## Directory layout

```
docs/screenshots/
├── README.md                                  ← this file
└── uiux-pass/
    ├── phase-A/_capture-checklist.md
    ├── phase-B/_capture-checklist.md
    ├── phase-C/_capture-checklist.md
    ├── phase-D/_capture-checklist.md
    ├── phase-E/_capture-checklist.md
    ├── phase-F/_capture-checklist.md
    ├── phase-G/_capture-checklist.md
    └── phase-H/_capture-checklist.md
```

Captured PNGs sit beside each phase's `_capture-checklist.md` (same folder).

## Filename convention

```
phase-<X>__<surface>__<theme>-<direction>.png
```

- `<X>` — phase letter, e.g. `A`, `B`, … `H`.
- `<surface>` — short kebab-case identifier for the page or component captured, e.g. `storefront-shell`, `audit-log-filters`, `product-images-section`.
- `<theme>` — `dark` or `light`.
- `<direction>` — `rtl` or `ltr`.

Examples (from existing phase-A/B checklists):
- `phase-A__storefront-shell__dark-rtl.png`
- `phase-B__audit-log-filters__light-ltr.png`

## Workflow per phase

1. Implement the phase per `specs/004-uiux-excellence-pass/plan.md`.
2. Finalize the surface rows in the phase's `_capture-checklist.md` (skeletons C–H ship with a `TBD` row that should be replaced when the phase begins).
3. Run the external capture tool against the routes/components listed, in all four states.
4. Drop the resulting PNGs alongside the checklist, named per the convention above.
5. Commit the PNGs using the message specified at the bottom of the checklist (e.g. `docs(ui): phase C screenshots`).
