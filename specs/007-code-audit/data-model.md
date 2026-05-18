# Phase 1 — Data Model: Audit Deliverable

The audit deliverable is plain Markdown. "Data model" here means the **structured shape** every Finding, Coverage-Map entry, and Report section MUST conform to, expressed as markdown schemas. There is no database, no API, no serialization concern.

## Entity 1 — Finding

A single discrete issue identified in the audit. Every finding in `audit-report.md` MUST conform to this shape:

```markdown
#### F-{nnn} — {short title}

- **Severity**: Critical | High | Medium | Low | Info
- **Category**: Security | Correctness | Performance | Accessibility | Maintainability | Convention | Documentation | TestCoverage
- **Rule**: {citation} — one of:
  - `Constitution §{I–VIII}` (e.g., `Constitution §III` for security/auth)
  - `CLAUDE.md → {section}` (e.g., `CLAUDE.md → Key Conventions → Logical CSS only`)
  - `Best practice — {framework} — {short rule name}` (e.g., `Best practice — EF Core — concurrency token`)
- **Location**: `{relative/path/from/repo/root}:{line-start}[-{line-end}]`
  - Multiple locations allowed: list each on its own bullet under a `**Locations**:` heading instead.
- **Observation**: 1–4 sentences describing what was found, in present tense, citing concrete code/identifiers.
- **Impact**: 1–2 sentences on why this matters (user-facing, security, maintainability, …).
- **Suggested Remediation**: 1–4 sentences in prose. **MUST NOT** include a code patch; the audit does not write code.
- **Triage**: `Open` (initial state). The maintainer may later flip to `Accepted | Disputed | Deferred` without re-running the audit (edge case from spec).

```

### Validation rules

1. **Identifier**: `F-001` … `F-NNN`, zero-padded to 3 digits, unique across the whole report. Numbering is per-report, not per-section.
2. **Severity / Category**: exactly one of each, drawn from the enums above. Empty or `N/A` is forbidden.
3. **Location**: every finding cites at least one path that exists in `git ls-files`. Line ranges are 1-indexed and inclusive.
4. **Rule citation**: any project-specific rule MUST point to its source document so a reader can verify the rule still applies.
5. **No code patches**: if the suggested remediation is more than ~4 sentences or starts to specify exact code, it has crept into implementation — split off into a follow-up `/speckit-plan` task instead.

### State transitions (post-audit, by maintainer)

```text
Open ──accept──▶ Accepted ──fixed in PR──▶ (removed from open list, recorded in next-cycle "Resolved prior findings")
  │
  ├──dispute──▶ Disputed (annotated with maintainer's rationale)
  │
  └──defer───▶ Deferred (annotated with target cycle)
```

The audit feature only emits findings in `Open` state. The maintainer manages transitions manually.

## Entity 2 — Coverage Map Entry

One row per audited folder. Proves comprehensiveness (SC-001).

```markdown
| Path | Layer | Rule Sets Applied | Findings | Notes |
|------|-------|-------------------|----------|-------|
| `backend/src/DrMirror.Api/Features/Auth/` | Backend | Constitution §III, CLAUDE.md backend, .NET best practice | 4 | — |
| `frontend/src/features/checkout/` | Frontend | Constitution §II/IV/VIII, CLAUDE.md frontend, React/a11y best practice | 7 | RTL + i18n parity checked |
| `frontend/src/locales/ar/` | Frontend | Constitution §II, i18n parity | 0 | `npm run i18n:check` passes |
```

### Validation rules

1. Every top-level source folder listed in `plan.md`'s "Source Code" section MUST appear (SC-001).
2. `Findings` is an integer count matching the actual number of F-NNN entries that cite this path.
3. Zero-finding rows MUST still be listed (FR-010, edge case "Zero-finding categories").

## Entity 3 — Report Section

The report has a fixed section order. Each section has a required structure.

### 3.1 Executive Summary (required)

A 3–6 paragraph prose section answering: *"If the maintainer reads only this, what do they need to know?"* Includes: top 3 Critical/High items by ID, build status, test status, dependency-vuln status, RTL/i18n status, prior-audit-resolution status. No tables, no findings detail.

### 3.2 Coverage Map (required)

A single markdown table conforming to Entity 2. Sorted backend → frontend → cross-cutting → docs.

### 3.3 Backend Findings (required, may have zero entries)

Findings whose Location starts with `backend/`. Sub-grouped by `Features/*`, `Domain/`, `Infrastructure/`, `BackgroundServices/`, `Shared/`, `tests/`. Within each group, sorted by Severity (Critical → Info) then by location.

### 3.4 Frontend Findings (required, may have zero entries)

Findings whose Location starts with `frontend/`. Sub-grouped by `features/*`, `shared/`, `app/`, `locales/`, `styles/`. Sorted as above.

### 3.5 Cross-Cutting Findings (required, may have zero entries)

Findings whose Location is a root config, `docs/`, dependency manifest, or that span multiple layers. Sub-grouped by: Dependencies, Secrets / Config, Repo Boundaries, Documentation Drift, CI / Scripts.

### 3.6 Resolved Prior Findings (required if any prior specs exist)

A bullet list of prior spec IDs (003, 004, 005, 006) whose recommendations have been **verified** as still in effect. Format:

```markdown
- **Spec 003 (Production Reality Hardening)** — Tasks 4–7 verified: startup validation present at `…:NN`, seeder idempotent at `…:NN`, last-admin guard present at `…:NN`, address default constraint at migration `…`.
```

If a prior recommendation is **not** verified in current code, it MUST appear as a Critical or High finding in the appropriate section above (not silently downgraded).

### 3.7 Prioritized Punch-List (required)

The flat list of all findings, grouped by Severity, sorted within each group by Category then ID. Each entry is one line: `F-NNN [Severity/Category] short title — location`. This is the section the maintainer hands to `/speckit-plan` for the next remediation cycle.

### 3.8 Appendices (optional)

- **A. Verification command transcripts** — stdout of each command from research.md Decision 6, captured verbatim.
- **B. Rule sources** — links/citations for any best-practice rule that isn't in `CLAUDE.md` or the constitution (e.g., "EF Core — concurrency token" → Microsoft docs URL).
- **C. Out-of-scope notes** — anything the auditor noticed but consciously did not file (e.g., spec wording in `specs/` that disagrees with current code — those are notes, not findings).

## Cardinality at a glance

| Entity | Cardinality | Storage |
|--------|-------------|---------|
| Report Section | Exactly 8 (3.1–3.8; 3.6/3.8 may degenerate to a single line stating "none") | `audit-report.md` |
| Coverage Map Entry | One per top-level audited folder (≥ 20 rows expected) | One row in §3.2 |
| Finding | Variable; one per discrete issue | Numbered F-001…F-NNN across §3.3–§3.5 |
