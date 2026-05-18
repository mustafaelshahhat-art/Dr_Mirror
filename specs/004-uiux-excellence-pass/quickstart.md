# Quickstart — UI/UX Excellence Pass

This is the operator runbook for executing the eight-phase pass. Run the pre-flight once. Then, for each phase, follow the same loop: edit → gate → commit → screenshot checklist.

All commands assume Windows PowerShell (the project's primary shell).

## Pre-flight (run ONCE before Phase A)

```powershell
cd D:\projects\Dr_Mirror\frontend
npm run build
npm run lint
npm run test
npm run i18n:check
```

Record the four output values in a one-line note at the top of the Phase A commit body. These are the **binding floor** for every later phase:

- Build: success / failure
- Lint: `<N> errors, <M> warnings`
- Test: `<P> passed / <Q> total`
- i18n:check: success / failure

Expected (from the brief): build success, 1 error / 60 warnings, 208 / 208, success. Recorded values bind, not the brief's.

## Per-phase loop

For each phase A → H:

1. **Edit** only the files named in the phase's "Files of record" row in `plan.md`.
2. **Run the gate** (PowerShell, repo root unless noted):

   ```powershell
   # from frontend/
   cd D:\projects\Dr_Mirror\frontend
   npm run build
   npm run lint        # must not exceed pre-flight baseline
   npm run test        # must equal pre-flight count
   npm run i18n:check  # ar/en parity

   # back to repo root for the four sweeps — all must return zero
   cd D:\projects\Dr_Mirror
   Get-ChildItem -Recurse frontend/src -Include *.tsx |
     Select-String -Pattern '\b(ml-\d|mr-\d|pl-\d|pr-\d|left-\d|right-\d)\b|text-left|text-right'
   Get-ChildItem -Recurse frontend/src -Include *.tsx |
     Select-String -Pattern 'text-\[\d+px\]'
   Get-ChildItem -Recurse frontend/src -Include *.tsx,*.ts |
     Select-String -Pattern '[\p{So}\p{Cs}]'
   Get-ChildItem -Recurse frontend/src -Include *.tsx |
     Select-String -Pattern 'border-l-4|border-r-4|backdrop-blur(?!-)|bg-clip-text|drop-shadow-\[|shadow-\[0_0'
   ```

   Allowed backdrop-blur exception: `frontend/src/shared/components/Header.tsx:31` only.

3. **Commit** with the phase's exact subject (Conventional-Commits) and a body listing files changed, gate results, and the screenshot-checklist directory path created in step 4.

4. **Create the screenshot checklist** at `docs/screenshots/uiux-pass/phase-<X>/_capture-checklist.md` enumerating each touched page in all four (theme × direction) states with the expected filename. The user captures the PNGs and commits them in a follow-up `docs(ui): phase <X> screenshots`.

## Commit subjects (verbatim)

```
feat(ui): UI/UX pass phase A — token + utility expansion
feat(ui): UI/UX pass phase B — raw HTML → HeroUI conversion
feat(ui): UI/UX pass phase C — HeroUI component uplift
feat(ui): UI/UX pass phase D — motion uplift
feat(ui): UI/UX pass phase E — container-query responsive
feat(ui): UI/UX pass phase F — form excellence
feat(ui): UI/UX pass phase G — a11y semantic uplift
chore(ui): UI/UX pass phase H — polish & micro-craft
```

## Stop-condition triggers (HALT and escalate)

- An adopted HeroUI component requires a user-facing i18n key not in both `ar.json` and `en.json`.
- A phase requires changing more than one route URL.
- A phase requires backend changes (API shape, schema, endpoints) to render correctly.
- A four-state screenshot reveals a regression that cannot be fixed within the phase's file scope.
- Lint count regresses (exceeds the pre-flight floor).
- Frontend test count drops below the pre-flight floor for any reason other than the documented CartLineRow test rewrite (Phase C item 6 — tests are replaced, not removed).

## Screenshot capture checklist template

Each `_capture-checklist.md` follows this shape:

```markdown
# Phase <X> screenshot checklist

Capture each of the rows below in all four states and save with the expected filename.

| Page / surface | dark-rtl | dark-ltr | light-rtl | light-ltr |
|----------------|----------|----------|-----------|-----------|
| <page name>    | `phase-<X>__<page>__dark-rtl.png` | `phase-<X>__<page>__dark-ltr.png` | `phase-<X>__<page>__light-rtl.png` | `phase-<X>__<page>__light-ltr.png` |
| …              | …        | …        | …         | …         |

Commit the PNGs as `docs(ui): phase <X> screenshots`.
```

## Done condition

The pass is complete when:

- All eight phase commits are on `004-uiux-excellence-pass`.
- The Phase H commit's gate is fully green (build, lint at-or-below pre-flight, tests at pre-flight count, i18n parity, four sweeps zero hits).
- The closing `## UI/UX Excellence Pass — Closing` section exists at the bottom of `docs/REDESIGN_AUDIT.md`.
- Eight `_capture-checklist.md` files exist under `docs/screenshots/uiux-pass/phase-*/`.
- README.md's Documentation-section code fence is closed.
