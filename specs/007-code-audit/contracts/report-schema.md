# Contract — Audit Report Schema

This is the **external interface** of the audit feature: the shape of `audit-report.md` that downstream commands (`/speckit-tasks`, `/speckit-implement`) and downstream readers (the maintainer, future audits) MUST be able to parse. Treat this file like an API contract — changes here are breaking changes.

## File location

```text
specs/007-code-audit/audit-report.md
```

Exactly one report file. Multiple report files are a contract violation.

## Top-of-file frontmatter (required)

The report MUST begin with this block, populated:

```markdown
# Audit Report — Dr_Mirror Full-Stack Code Audit

**Audit Date**: YYYY-MM-DD
**Commit Audited**: <40-char SHA>
**Branch**: 007-code-audit
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Auditor**: <human or model identifier>

**Result Summary**: Critical: N · High: N · Medium: N · Low: N · Info: N · Total: N
```

The `Result Summary` MUST equal the sum of findings in §3.3–§3.5.

## Required sections (in order)

The report has eight sections, in this exact order:

| # | Heading | Required? | Empty allowed? |
|---|---------|-----------|---------------|
| 1 | `## 1. Executive Summary` | Yes | No — minimum 3 paragraphs |
| 2 | `## 2. Coverage Map` | Yes | No — every folder from `plan.md` source-tree MUST appear |
| 3 | `## 3. Backend Findings` | Yes | Yes — may contain only `_No findings._` |
| 4 | `## 4. Frontend Findings` | Yes | Yes — may contain only `_No findings._` |
| 5 | `## 5. Cross-Cutting Findings` | Yes | Yes — may contain only `_No findings._` |
| 6 | `## 6. Resolved Prior Findings` | Yes | Yes — `_No prior specs to verify._` if none |
| 7 | `## 7. Prioritized Punch-List` | Yes | No if any F-NNN exists; otherwise `_No open findings._` |
| 8 | `## 8. Appendices` | Optional | — |

Section headings MUST be H2. Sub-groups inside §3–§5 use H3. Findings within sub-groups use H4 (`#### F-{nnn} — title`).

## Finding format (contract — locked)

Every finding MUST conform to this block, line for line:

```markdown
#### F-{nnn} — {short title}

- **Severity**: {Critical|High|Medium|Low|Info}
- **Category**: {Security|Correctness|Performance|Accessibility|Maintainability|Convention|Documentation|TestCoverage}
- **Rule**: {citation string}
- **Location**: `{path}:{line}` or `{path}:{start}-{end}`
- **Observation**: {1–4 sentences}
- **Impact**: {1–2 sentences}
- **Suggested Remediation**: {1–4 sentences, prose only — no code blocks}
- **Triage**: Open
```

For multi-location findings, replace the single `**Location**:` line with:

```markdown
- **Locations**:
  - `{path1}:{line}`
  - `{path2}:{line}`
```

### Field constraints

- `F-{nnn}`: zero-padded 3-digit integer, monotonically increasing, unique. Re-numbering across report regenerations is allowed.
- `Severity`: exact case, exactly one value from the enum.
- `Category`: exact case, exactly one value from the enum.
- `Rule`: free-form string but MUST begin with one of: `Constitution §`, `CLAUDE.md →`, or `Best practice —`.
- `Location` path: MUST be a path returned by `git ls-files` (verifiable). Use forward slashes regardless of OS.
- `Suggested Remediation`: prose only. **Code fences (` ``` `) and inline-code patches are forbidden in this field.** The audit names the fix; it does not write the fix.
- `Triage`: emitted as `Open` only. Other values reserved for maintainer post-edits.

## Coverage Map table (contract)

§2 contains exactly one markdown table with this header row, in this column order:

```markdown
| Path | Layer | Rule Sets Applied | Findings | Notes |
|------|-------|-------------------|----------|-------|
```

- `Path`: backtick-quoted, repo-relative, forward slashes, trailing slash for directories.
- `Layer`: one of `Backend | Frontend | Cross-Cutting | Docs`.
- `Rule Sets Applied`: comma-separated; cite documents not individual rules.
- `Findings`: integer ≥ 0.
- `Notes`: free-form, optional (use `—` for none).

A reader who counts the table's `Findings` column MUST get the same total as `Result Summary` in the frontmatter.

## Punch-List entry format (contract)

Each line in §7 is exactly:

```markdown
- F-{nnn} [{Severity}/{Category}] {short title} — `{path}:{line}`
```

Grouped under H3 sub-headings: `### Critical`, `### High`, `### Medium`, `### Low`, `### Info` (omit any group with zero entries).

## Invariants enforced by the contract

1. **One report file**. Glob `specs/007-code-audit/audit-report*.md` MUST match exactly one file.
2. **Section order is canonical**. Tools may parse by H2 heading position; reordering is breaking.
3. **Frontmatter totals match section totals**. Frontmatter `Result Summary` = `Σ`(findings in §3, §4, §5) per severity.
4. **No code patches anywhere**. Searching the report for triple-backtick blocks (outside §8 appendix transcripts) MUST find zero hits.
5. **All cited paths exist**. Every `Location` is in current `git ls-files`.
6. **No edits outside the spec folder**. After audit completion, `git diff --name-only` outside `specs/007-code-audit/` is empty.

## Versioning

This contract is **v1**. If a future audit feature needs to change the schema, it MUST be a new feature folder (e.g., `008-audit-v2`) and MUST document the migration. Silent breaking changes to this schema are forbidden.
