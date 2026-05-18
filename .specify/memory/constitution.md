<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump type: MINOR (new principle added, expanded guidance).

Modified principles:
  - (unchanged) I–VII
  - (new) VIII. UI System & Visual Discipline

Added sections:
  - Principle VIII covering HeroUI-only, Lucide-only, form architecture,
    visual restraint rules, and no-browser-automation repo boundary.
  - Repo Boundaries subsection in Technology Stack.

Removed sections:
  - None.

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate now
    references eight principles; text-only gate, no template edit needed.
  - ✅ .specify/templates/spec-template.md — compatible; no edit required.
  - ✅ .specify/templates/tasks-template.md — compatible; no edit required.
  - ✅ AGENTS.md — already references constitution principles implicitly.

Follow-up TODOs:
  - None deferred. All placeholders resolved.
-->

# Dr Mirror Constitution

Dr Mirror is a production e-commerce platform for Egyptian medical uniforms
(scrubs, lab coats, surgical headwear, medical footwear). It is **not** a
prototype, demo, or frontend-only application. Every change — by any human or
AI contributor — MUST be evaluated against the full production stack: frontend,
APIs, backend logic, database, auth, storage, hosting, CI/CD, security, rate
limiting, caching, scaling, logging, and recovery.

This constitution governs all `/speckit-specify`, `/speckit-plan`,
`/speckit-tasks`, and `/speckit-implement` work. Rules marked NON-NEGOTIABLE
MUST NOT be relaxed without an explicit, written amendment to this document.

## Core Principles

### I. Full-Stack Production Reality (NON-NEGOTIABLE)

Every feature MUST be reasoned about across the complete production stack
before it is specified, planned, or implemented:

1. **Frontend** (React 19 + TypeScript + Vite + HeroUI + Tailwind v4 + i18next +
   React Query) — UX, state, error states, loading states, RTL/LTR parity,
   light/dark parity, responsive breakpoints.
2. **APIs & Backend Logic** (.NET 10, ASP.NET Core Minimal APIs, vertical
   slices, EF Core) — input validation, authorization, idempotency where
   relevant, error responses.
3. **Database & Storage** (SQL Server via EF Core; Cloudinary for image
   assets) — migrations, indexes, constraints, transactional consistency,
   referential integrity. Schema changes MUST ship as EF Core migrations.
4. **Auth & Permissions** (ASP.NET Identity + JWT) — role-based authorization,
   ownership checks (e.g., order ownership), admin/customer separation.
5. **Hosting & Deployment / Cloud & Compute** — configuration via environment
   variables or user-secrets; no localhost-only assumptions.
6. **CI/CD & Version Control** — every change MUST build cleanly, pass tests,
   and not break the deployment pipeline.
7. **Security & Access Boundaries** — CORS, CSRF where applicable, signed/
   gated access for private assets, principle of least privilege.
8. **Rate Limiting, Caching & CDN, Load Balancing & Scaling** — features that
   touch user-facing endpoints MUST consider rate limits and cacheability;
   destructive endpoints MUST NOT be cacheable.
9. **Error Tracking & Logs** (Serilog) — structured logs for security, payment,
   auth, and admin actions; no PII leakage into logs.
10. **Availability & Recovery** — features that mutate critical data
    (orders, payments, inventory, users) MUST be safe to retry and MUST NOT
    leave half-written state.

**Rule**: A spec, plan, or task that addresses only the UI layer (or only the
backend) for a feature that spans multiple layers is incomplete and MUST be
expanded before `/speckit-implement` is run.

**Rationale**: Dr Mirror serves real Egyptian customers with real EGP payments.
Partial fixes that look correct in the browser but corrupt data, weaken auth,
or break recovery are unacceptable.

### II. Arabic-First Bilingual & RTL Parity (NON-NEGOTIABLE)

Arabic (RTL) is the **primary** locale; English (LTR) is a **complete** second
locale. Every user-facing change MUST satisfy all of the following:

- All new user-facing strings MUST be added to both `ar` and `en` i18next
  translation resources. Hardcoded user-facing strings are forbidden.
- Layouts MUST work in both `dir="rtl"` and `dir="ltr"`. Use logical CSS
  properties (`ms-*`, `me-*`, `start`, `end`, `inset-inline-*`) — not `left`/
  `right` — unless an icon or asset is intentionally directional.
- Prices MUST be displayed in EGP using a locale-correct formatter; currency
  symbols and digit separators MUST behave correctly in Arabic.
- Dates, numbers, and pluralization MUST use the active locale's rules.
- Form inputs (including phone numbers, addresses, governorates) MUST accept
  Arabic input where users would naturally type Arabic.

**Rule**: A PR that adds an English-only string, a hardcoded string, or a
layout that breaks in RTL violates this principle and MUST be rejected.

**Rationale**: The Egyptian market is the primary audience. RTL is not a
"translation feature" — it is the default experience.

### III. Security, Auth & Access Boundaries (NON-NEGOTIABLE)

The following boundaries MUST NOT be weakened, bypassed, or "temporarily
disabled" by any change:

- **JWT authentication** is required for all non-public endpoints.
- **Role-based authorization** separates admin and customer surfaces. Customer
  tokens MUST NOT reach admin endpoints; admin endpoints MUST verify the role
  server-side (not only on the client).
- **Order ownership**: customers MAY only read/modify their own orders.
  Server-side ownership checks are mandatory; the URL/path parameter is never
  trusted alone.
- **Last-admin guard**: the system MUST refuse operations that would leave
  zero active admins (role removal, deletion, deactivation).
- **Payment-proof privacy**: payment-proof files (Instapay / wallet receipts)
  are private. They MUST be served only through an authenticated, ownership-
  checked endpoint. Direct public URLs to proof files are forbidden.
- **CORS** MUST be explicitly configured with an allowlist; `*` is forbidden
  for credentialed endpoints.
- **Secrets** (DB connection strings, JWT signing keys, Cloudinary keys,
  SMTP credentials, payment gateway credentials) MUST come from environment
  variables, user-secrets, or a managed secret store. Hardcoded secrets,
  committed `.env` files, or secrets in `appsettings.json` are forbidden.
- **Rate limiting** MUST be applied to authentication, password reset, and
  payment-proof upload endpoints.

**Rule**: Any spec/plan/task that proposes loosening one of these controls
MUST be paired with an explicit constitutional amendment.

**Rationale**: Auth, ownership, and proof privacy are the hard floor of
customer trust. Breaches here are not bugs — they are incidents.

### IV. Egyptian Payment Integrity (NON-NEGOTIABLE)

Dr Mirror's payment surface reflects the Egyptian market and MUST behave
consistently across the stack:

- Supported payment methods: **Cash on Delivery (COD)**, **Instapay**, and
  **mobile wallets** (e.g., Vodafone Cash, Orange Cash, Etisalat Cash,
  WE Pay). Prices are denominated in **EGP**.
- **COD** orders MUST NOT require a payment proof. The UI MUST NOT prompt for
  one; the backend MUST NOT reject the order for missing proof.
- **Instapay** and **wallet** orders MUST require a payment proof before the
  order can be marked paid. The backend MUST enforce this — frontend checks
  alone are insufficient.
- Payment-proof files MUST be stored privately (see Principle III) and served
  through an ownership-checked endpoint. Admins viewing proofs MUST be
  authenticated and their access MUST be logged.
- Stale or orphaned proofs (uploaded but not attached to a confirmed order)
  MUST be reaped on a defined schedule and MUST NOT remain reachable.
- Cancellations MUST capture a reason; the cancellation reason field MUST be
  consistent between frontend submission, API contract, and persisted row.
- Order totals, line totals, and payment amounts MUST be computed and verified
  server-side. Client-supplied totals are advisory only.

**Rule**: A change that conflates COD with proof-required flows, or that
exposes a payment-proof URL publicly, MUST be rejected.

**Rationale**: Payment rules are market-specific and trust-critical. Egyptian
customers expect COD to "just work" and proof-based flows to be private.

### V. Structural Integrity: Vertical Slices & Feature Folders

The repository's structure is part of the contract:

- **Backend**: vertical-slice architecture. New endpoints, validators,
  handlers, and DTOs for a feature MUST live in that feature's slice — not
  in a cross-cutting "controllers/" or "services/" bucket.
- **Frontend**: feature-based folders. New pages, hooks, queries, and
  components for a feature MUST be co-located under that feature.
- **EF Core migrations** MUST be additive and named meaningfully. Destructive
  migrations require an explicit migration plan and MUST preserve data unless
  the user has authorized data loss.
- **Public-facing API contracts** (paths, response shapes, status codes) MUST
  NOT be changed in a backward-incompatible way without a versioning plan.
- **No production behavior changes** unless the user explicitly requested
  them. A "cleanup" PR that incidentally changes a status code, response
  shape, or validation rule is out of scope and MUST be split.

**Rationale**: The vertical-slice and feature-folder discipline is what
makes this codebase navigable. Breaking it accumulates entropy quickly.

### VI. Accessibility, Responsive & Theme Parity

User-facing changes MUST preserve the platform's accessibility, responsive,
and theming guarantees:

- **Keyboard navigation**: all interactive controls MUST be reachable and
  operable via keyboard. Radiogroups, dropdowns, dialogs, and custom widgets
  MUST follow standard ARIA patterns.
- **Focus management**: visible focus rings MUST be preserved; Escape MUST
  close dismissible surfaces (modals, drawers, menus); focus MUST return to
  a sensible anchor on close.
- **Theme parity**: the platform is dark-first but ships full light support.
  Every component MUST render correctly in both themes. The user's theme
  preference MUST persist.
- **Responsive parity**: layouts MUST work across mobile, tablet, and desktop
  breakpoints in both RTL and LTR.
- **Color contrast** MUST meet WCAG AA for body text and interactive states.
- **Images** MUST have meaningful `alt` text (or empty `alt` if purely
  decorative).

**Rule**: A PR that introduces an inaccessible widget, a theme-broken
component, or a layout that collapses at a supported breakpoint MUST be fixed
before merge.

**Rationale**: Accessibility and theme parity were earned over multiple
iterations and are easy to silently regress.

### VII. Observability, Reliability & Recovery

Every feature MUST be operable in production:

- **Structured logging** (Serilog) MUST cover authentication events, admin
  actions, order state transitions, and payment-proof access. Logs MUST NOT
  contain raw passwords, JWTs, full card data, or other secrets.
- **Startup validation**: on boot, the application MUST fail fast and loudly
  if required configuration (DB connection, JWT key, Cloudinary credentials,
  SMTP settings) is missing or obviously invalid.
- **Seeding**: seed data MUST be idempotent and MUST NOT overwrite or
  duplicate existing production rows.
- **Outbox / background jobs** (e.g., email outbox) MUST use leases or
  equivalent mechanisms to tolerate restarts and avoid duplicate sends.
- **Backups & migrations**: schema migrations affecting user-visible data
  MUST be reversible in principle, or MUST document why they are not.
- **Health**: the API MUST expose a health endpoint suitable for the
  hosting platform's probes.

**Rationale**: A feature that works on a developer laptop but cannot be
diagnosed, restarted, or recovered in production is not done.

### VIII. UI System & Visual Discipline

The frontend visual system is governed by `DESIGN.md`. The following rules
are constitutional and MUST NOT be violated:

**Component system:**
- **HeroUI v3 is the only component library.** No raw `<button>`, `<input>`,
  `<select>`, `<dialog>`, or `<table>` when a HeroUI equivalent exists. No
  mixed UI libraries (no Chakra, MUI, Radix primitives, Headless UI, etc.).
- **Lucide is the only icon set.** No emoji in UI elements. No other icon
  libraries (no Heroicons, FontAwesome, Material Icons).

**Form architecture:**
- Every form MUST use **react-hook-form + Zod**. Form state via `useState`
  is forbidden. Validation runs on submit, then on-change after first error.

**Visual restraint:**
- **One accent hue per page** — emerald only. A second hue is forbidden.
- **Max 3 distinct font weights** per page.
- **Max 2 levels of card nesting.** Three is forbidden.
- **No glows, neon, glassmorphism, parallax, scroll-jacking, autoplay
  carousels, or page-load animations.**
- **No arbitrary Tailwind values** (`[Npx]`) without a justification comment
  on the same line.
- **Logical CSS only** (`ms-*`/`me-*`/`ps-*`/`pe-*`/`text-start`/`text-end`).
  Physical direction (`ml-*`/`mr-*`/`text-left`/`text-right`) is forbidden
  in new code.

**Currency & formatting:**
- All user-facing prices MUST use `formatCurrency()` from
  `shared/lib/format.ts`. Inline price formatting is forbidden.

**i18n enforcement:**
- Every new user-facing string MUST have entries in both `locales/ar/*.json`
  and `locales/en/*.json`. `npm run i18n:check` MUST pass.

**Rule**: A PR that introduces a non-HeroUI component, emoji icon, second
accent hue, or arbitrary Tailwind value without justification MUST be
rejected.

**Rationale**: The visual system was designed holistically in DESIGN.md.
Piecemeal deviation accumulates into incoherence faster than any other
category of tech debt.

## Technology Stack & Operational Constraints

The following stack is the source of truth. Replacing or supplementing any
component requires a constitutional amendment.

**Backend**
- Runtime: **.NET 10**
- Framework: **ASP.NET Core Minimal APIs**, vertical-slice architecture
- ORM: **EF Core** against **SQL Server**
- Identity: **ASP.NET Identity** with **JWT** bearer tokens
- Logging: **Serilog** (structured)
- Mail: **MailKit**
- Media: **Cloudinary** for image assets

**Frontend**
- **React 19** + **TypeScript** + **Vite**
- UI: **HeroUI** components + **Tailwind CSS v4**
- i18n: **i18next** with `ar` and `en` resources (Arabic = primary, RTL)
- Data: **React Query**
- Theming: **dark-first**, full **light** support, **persistent** user
  preference, full RTL/LTR parity

**Configuration & Secrets**
- Local dev: `dotnet user-secrets` for backend; `.env.local` (gitignored) for
  frontend. No secret values may be committed.
- Deployed environments: environment variables or a managed secret store.

**Cross-cutting**
- Currency: **EGP** everywhere user-facing prices appear.
- Locales: **`ar` (primary, RTL)** and **`en` (complete, LTR)**.
- Browser support: current evergreen Chrome, Edge, Safari, Firefox on
  desktop and mobile.

**Repo Boundaries**
- **No browser automation in this repository.** Playwright, Puppeteer,
  Cypress, Selenium, or any browser-automation dependency, config, runner
  script, or lockfile entry MUST NOT be added. Screenshot capture is
  performed by an external tool outside the repo.
- **No mixed UI libraries.** Only HeroUI v3 components are permitted.
- **No mixed icon sets.** Only Lucide icons are permitted.

## Development Workflow & Quality Gates

Every feature MUST pass through these gates, in order, before merge:

1. **Specification gate** (`/speckit-specify`): the spec MUST describe user
   value in plain language, name affected stack layers (frontend, API, DB,
   auth, etc.), and define **testable**, measurable success criteria. Specs
   that say only "improve X" without a measurable outcome are rejected.

2. **Clarification gate** (`/speckit-clarify`): underspecified items
   (auth model, data retention, RTL behavior, payment-method scope,
   role boundaries) MUST be resolved or explicitly deferred with rationale.

3. **Planning gate** (`/speckit-plan`): the plan MUST include a
   **Constitution Check** that evaluates the feature against each of the
   eight principles above. Any violation requires either a redesign or a
   recorded justification in the plan's Complexity Tracking section.

4. **Task generation gate** (`/speckit-tasks`): tasks MUST be organized to
   preserve vertical-slice / feature-folder structure (Principle V) and MUST
   cover, where applicable:
   - Frontend UX (both locales, both themes, both directions).
   - Backend validation + authorization.
   - Database migration + indexes/constraints.
   - Tests proportional to risk (unit for pure logic, integration for cross-
     layer flows; integration tests MUST hit a real database, not mocks).
   - Logging additions.
   - Deployment / configuration impact.
   - Rollback or recovery behavior.

5. **Implementation gate** (`/speckit-implement`): no production behavior may
   be changed unless explicitly requested. Implementations MUST preserve the
   vertical-slice backend and feature-folder frontend structures.

6. **Pre-merge review**: the diff MUST be reviewed against this constitution.
   PR descriptions SHOULD cite the principles affected by the change.

**Test-discipline note**: Tests are not optional for changes that touch
auth, payments, or order ownership. Integration tests in those areas MUST
exercise the real database via EF Core migrations — not mocked context.

**Destructive-action note**: Any plan that includes data deletion, schema
loss, or breaking API change requires explicit user authorization and a
documented rollback path.

## Governance

**Supremacy.** This constitution supersedes ad-hoc preferences, transient
chat instructions, and prior unwritten conventions. Where a `/speckit-*`
command, template, or skill conflicts with this document, the constitution
wins and the template/skill MUST be updated.

**Amendments.** Changes to this constitution require:

1. A written proposal (PR description or issue) stating the principle to add,
   modify, or remove and the rationale.
2. Explicit owner approval (the repository's maintainer).
3. A version bump per the policy below and an updated **Last Amended** date.
4. A Sync Impact Report (HTML comment at the top of this file) listing
   template/doc files that need follow-up.

**Versioning policy** (semantic):

- **MAJOR**: removal or backward-incompatible redefinition of a principle or
  governance rule (e.g., dropping a NON-NEGOTIABLE item).
- **MINOR**: a new principle/section is added, or an existing principle is
  materially expanded.
- **PATCH**: clarifications, wording fixes, non-semantic refinements.

**Compliance review.** Every PR description SHOULD note which principles the
change touches. Reviewers MUST flag drift from Principles I–IV
(NON-NEGOTIABLE) as blocking. Drift from Principles V–VIII SHOULD be flagged
and resolved before merge unless explicitly deferred.

**Runtime guidance.** Day-to-day project guidance lives in `AGENTS.md` and
in the current `specs/<feature>/plan.md`. Those documents MUST defer to this
constitution where they overlap.

**Version**: 1.1.0 | **Ratified**: 2026-05-17 | **Last Amended**: 2026-05-18
