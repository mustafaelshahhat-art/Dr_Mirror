<!--
  SYNC IMPACT REPORT
  Version change: [template] → 1.0.0
  Modified principles: N/A (initial population from template — no prior version existed)
  Added sections:
    - Core Principles (5 principles)
    - Technology Constraints
    - Development Workflow
    - Governance
  Removed sections: All template placeholder tokens replaced
  Templates requiring updates:
    ✅ .specify/templates/plan-template.md — Constitution Check gate already references constitution
       dynamically; no hardcoded principle names present; no changes required
    ✅ .specify/templates/spec-template.md — Generic template; aligned with Arabic-first and
       Egyptian market constraints via constitution reference at spec time; no changes required
    ✅ .specify/templates/tasks-template.md — Generic template; task types (observability, security,
       i18n) flow from plan.md which reads the constitution; no changes required
    ✅ .specify/templates/checklist-template.md — Generic template; no principle-specific
       hardcoding; no changes required
  Follow-up TODOs:
    - Ratification date set to 2026-05-26 (today). Confirm with project owner if an earlier
      date (e.g., original project creation date) is more appropriate.
-->

# Dr Mirror Constitution

## Core Principles

### I. Vertical Slice Architecture

The backend MUST be organized by domain feature vertical slices, not horizontal technical layers.
Each feature slice (e.g., `Auth`, `Catalog`, `Orders`) MUST encapsulate its own models, handlers,
and endpoints. Cross-cutting concerns (auditing, rate limiting, validation) MUST live in `Shared/`
and be applied via middleware or conventions — never duplicated inside feature slices.
No namespace or folder may exist solely for organizational purposes without concrete functional
responsibility.

**Rationale**: Vertical slices reduce coupling and allow features to be developed, reviewed, and
deployed independently. Horizontal layering creates artificial dependencies that slow iteration and
make feature isolation impossible.

### II. Arabic-First & Full RTL Parity

Arabic is the primary locale. Every UI component MUST render correctly in RTL layout.
Both `ar/` and `en/` locale files MUST maintain full key parity — no key present in one locale
may be absent from the other. The `npm run i18n:check` script enforces this gate and MUST pass
on every build. All user-facing copy defaults to Arabic; English is additive. Font loading MUST
cover both scripts: Satoshi for Latin characters, Alexandria for Arabic, both preloaded as WOFF2.

**Rationale**: The target market is Egypt. RTL failures or missing Arabic copy directly degrade
the primary user experience. Automated parity checks prevent silent regressions introduced during
feature development.

### III. Egyptian Market Compliance

All product pricing MUST be expressed in EGP. Accepted payment methods are limited to those
that operate in Egypt: Cash on Delivery, Instapay, and mobile wallets. No foreign payment rails
(Stripe, PayPal, credit card processors, etc.) may be introduced without an explicit product
decision. Checkout flows MUST accommodate the proof-upload pattern required for digital payments
in this market. The eight-state order lifecycle (and its proof approve/reject mechanism) is
non-negotiable infrastructure.

**Rationale**: Payment assumptions that do not match Egyptian banking reality cause checkout
abandonment and unresolvable order states. The proof-upload lifecycle exists because real-time
payment verification is not available for the target payment methods.

### IV. Security & Zero-Trust Secrets

Secrets MUST never enter source control. All sensitive configuration (JWT secret, DB connection
string, SMTP credentials, Cloudinary keys, admin seed password) MUST be supplied via environment
variables or .NET user-secrets — never as committed values in `appsettings.*.json` or `.env`.
JWTs MUST be issued via HttpOnly cookie. Rate limiting MUST be applied IP-keyed on all auth,
checkout, and proof-upload endpoints. Security controls (middleware, validators, hooks) MUST NOT
be bypassed or removed without documented justification and explicit approval.

**Rationale**: A breach of JWT secrets or admin credentials exposes all user accounts and order
data. The Egyptian market lacks fraud-recovery infrastructure equivalent to western markets;
prevention is the only viable strategy.

### V. Resilient & Observable Systems

Every deployment MUST expose `/api/health` (readiness: DB + storage + outbox) and
`/api/health/live` (liveness only). Transactional email MUST use the durable outbox pattern —
direct SMTP sends that bypass the outbox are prohibited. Serilog structured logging MUST capture
all order transitions, catalog mutations, and security events. Frontend errors MUST be tracked
via Sentry when `VITE_SENTRY_DSN` is configured. Background retention services MUST purge stale
proof files and processed outbox records on a configurable schedule.

**Rationale**: The order lifecycle spans hours to days (payment proof review). Silent failures
during this window — dropped emails, lost proof files, stuck outbox messages — are unrecoverable
without observability. Health checks are the minimum viable signal for production monitoring.

## Technology Constraints

The technology stack is fixed at the versions documented in `README.md`. Major version upgrades
for any core dependency (.NET, React, EF Core, HeroUI, Tailwind CSS) require explicit
architectural review before adoption. The following MUST NOT be changed without that review:

- **Backend runtime**: .NET 10, ASP.NET Core Minimal APIs; no alternative web frameworks
- **ORM**: EF Core with SQL Server; no alternative ORMs or raw ADO.NET beyond migrations
- **Auth**: ASP.NET Identity + JWT via HttpOnly cookie; no alternative auth libraries
- **Frontend framework**: React 19 with TypeScript; functional components only (no class components)
- **CSS**: Tailwind CSS v4 with OKLCH palette defined in `frontend/src/styles/globals.css`;
  no inline styles for theming; HeroUI v3 for component primitives
- **Hosting**: MonsterASP.NET (backend), Vercel (frontend); configuration that assumes a
  different deployment target requires explicit approval

## Development Workflow

- **EF Core migrations** MUST be generated for every model change via `dotnet ef migrations add`
  and reviewed before merge. Migrations apply automatically in Development; production database
  updates require explicit manual confirmation (`dotnet ef database update`).
- **Backend test suite** (`dotnet test`) MUST pass before any PR merges to `main`. Tests run
  in-memory by default; SQL Server integration tests require `DRMIRROR_TEST_SQL_CONNECTION`.
- **Frontend build gate**: `npm run build` (TypeScript + Vite) and `npm run i18n:check` (locale
  parity) MUST both pass. TypeScript errors are blocking — no `// @ts-ignore` suppressions
  without documented rationale.
- **No `--no-verify` commits.** Pre-commit hooks MUST NOT be bypassed without explicit user approval.
- **Feature branches** follow the `###-feature-name` naming convention used by speckit workflows.
- **No secrets in source control.** The `.env` file at repository root MUST remain gitignored;
  use `.env.example` to document required variables without values.

## Governance

This constitution supersedes all other development practices and conventions for Dr Mirror.
Amendments require:

1. A documented rationale for the change.
2. A semantic version bump: MAJOR for principle removal or redefinition that breaks existing
   assumptions; MINOR for a new principle or section; PATCH for clarification or wording fix.
3. Propagation of changes to affected templates (plan, spec, tasks) in the same commit.
4. Review of all open PRs for compliance with the updated wording before merge.

All pull requests and code reviews MUST verify compliance with the five Core Principles above.
Complexity that requires a deviation from a principle MUST be justified in the PR description;
the Complexity Tracking table in `plan.md` is the canonical record for justified exceptions.

See `CLAUDE.md` for runtime AI-agent development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-05-26 | **Last Amended**: 2026-05-26
