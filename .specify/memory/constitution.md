<!--
SYNC IMPACT REPORT
Version change: TEMPLATE (placeholders) → 1.0.0
Bump rationale: Initial ratification — no prior versioned constitution existed; template
placeholders are being filled with concrete project principles for the first time.

Modified principles: N/A (initial ratification)

Added sections:
  - Core Principles (I–V)
  - Security & Operational Standards
  - Development Workflow & Quality Gates
  - Governance

Removed sections: N/A

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check section enumerated against
       principles I–V (was an empty placeholder).
  - ⚠ .specify/templates/spec-template.md — pending: Success Criteria block should explicitly
       require RTL parity + bilingual coverage on user-visible outcomes. Not blocking; deferred.
  - ⚠ .specify/templates/tasks-template.md — pending: UI-touching task groups should reference
       the 4-state matrix and bilingual locale files as standard sub-tasks. Not blocking; deferred.
  - ⚠ README.md — pending optional cross-link to .specify/memory/constitution.md from the
       "Before doing any work" preface.

Follow-up TODOs: None. Ratification and last-amended dates set to 2026-05-15.
-->

# Dr_Mirror Constitution

## Core Principles

### I. Arabic-First, RTL Parity (NON-NEGOTIABLE)

Arabic (`ar`) is the primary locale; English (`en`) ships alongside it. Every screen MUST render
correctly in all four states: `(dark, rtl)`, `(dark, ltr)`, `(light, rtl)`, `(light, ltr)`. New
code MUST use logical CSS properties only — `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`,
`text-end`. The literals `left`, `right`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`,
`text-right` are forbidden in new code. Directional icons (arrows, chevrons, back/send) MUST
mirror in RTL; symbolic icons (search, settings, user, gear) MUST NOT. Numerics use Western
digits (`numberingSystem: 'latn'`) and `tabular-nums` in tables, dashboards, prices, and
counters.

**Rationale:** The store serves an Arabic-first market; RTL must be a first-class axis, not a
retrofit. Four-state parity protects against the silent regressions that creep in when only one
direction or one theme is tested.

### II. Domain Discipline — Medical Apparel Only

The product domain is medical scrubs and uniforms — scrub tops, scrub pants, lab coats, surgical
headwear, and medical footwear. Equipment, refurbished devices, spare parts, surplus inventory,
and any other non-apparel commerce concept are out of scope. All naming, copy, SEO, taxonomy,
and feature framing MUST align with apparel/fashion commerce. Schema or UI additions that imply
non-apparel commerce (e.g., `Condition`, `RefurbishmentGrade`, "spare parts") require a
constitution amendment before implementation.

**Rationale:** Domain drift dilutes brand identity and produces incoherent UX. A locked scope
keeps catalog, search, merchandising, and admin tooling aligned with the apparel buyer.

### III. Vertical Slices & Single Source of Truth

Backend code lives in a single ASP.NET Core 10 project (`DrMirror.Api`) with vertical slices
under `/Features/<SliceName>`. Domain entities live under `/Domain/Entities` (one aggregate per
file). Infrastructure adapters live under `/Infrastructure` (Persistence, Identity, Storage,
Email, Jobs). Cross-cutting code lives under `/Shared`. Frontend features mirror backend slices
under `/src/features/<SliceName>` with shared primitives under `/src/shared`. `PROJECT_MAP.md`
is the canonical architecture record and MUST be updated at the close of every milestone;
conflicts between code and `PROJECT_MAP.md` are resolved by updating whichever is wrong, never
by tolerating divergence. EF Core Migrations are the only mechanism for schema changes.

**Rationale:** Vertical slices keep feature work cohesive and reduce coupling across the
codebase. A single authoritative map prevents contributors from re-deriving architecture from
code on every onboarding.

### IV. Design Discipline — Linear / Vercel / Stripe / Notion Bar

UI work MUST match the rigor of Linear, Vercel Dashboard, Stripe, and Notion — borrowing their
discipline, not their layouts. `DESIGN_PRINCIPLES.md` is the binding UI rulebook and is required
reading before any UI change. Non-negotiable rules: at most 2 levels of card nesting; at most 3
font weights per page; one accent hue per page (HeroUI `primary`); the 4 px Tailwind spacing
grid (no arbitrary `[Npx]` values without justification); elevation by lightness, not shadow,
in dark mode; `prefers-reduced-motion` respected; Lucide-react icons only; no glows, neon,
glassmorphism, parallax, scroll-jacking, or autoplay animations. Every UI PR MUST pass the
pre-merge checklist in `DESIGN_PRINCIPLES.md` §10.

**Rationale:** Visual discipline is the most visible signal of product quality. Hard rules
prevent the slow drift toward generic-SaaS aesthetics that a "feels off" review cannot catch
reliably.

### V. Milestone-Driven Delivery with Binary Acceptance

Execution follows the M0 → M10 roadmap recorded in `PROJECT_MAP.md` and the architectural plan.
Each milestone has a single binary acceptance check; the milestone is not "done" until that
check passes end-to-end. Open items are tracked in the `[ORPHANS & PENDING]` section of
`PROJECT_MAP.md` and resolved per milestone — never silently dropped. Cross-milestone refactors
require either a new milestone entry or an explicit `[ARCHITECTURE NOTES]` entry justifying the
deviation.

**Rationale:** Binary acceptance forces real integration validation and prevents partial
features from accumulating as "almost done." The orphans list keeps deferred decisions visible
so they survive context switches between milestones.

## Security & Operational Standards

Secrets MUST NEVER be committed. Local development uses .NET user-secrets for `Jwt:Secret` and
`Admin:SeedPassword`; deployed environments use environment variables. When `Admin:SeedPassword`
is unset, the seeder generates a strong random password on first boot and logs it once at WARN
— production deploys MUST capture that output.

**Authentication:** ASP.NET Identity (`AddIdentityCore<User>`) + JWT Bearer is the sole API auth
scheme. Access tokens are 15 minutes; refresh tokens are 14 days, rotated on every use, hashed
at rest (SHA-256), and carried in an httpOnly cookie scoped to `Path=/api/auth`. Refresh-token
reuse triggers cascade revocation of every outstanding session for that user. Admin endpoints
are gated by `RequireRole(Admin)` on the backend and `<AdminRoute />` on the SPA.

**Error contract:** all API errors are returned as RFC 7807 `ProblemDetails`. File uploads
validate MIME against an allow-list and enforce `MaxFileSizeBytes`; on-disk extensions MUST be
derived from the validated content-type, never from `originalFileName`. Static files for
`/uploads` are mounted before auth middleware, but URLs include unguessable GUIDs and are only
emitted in responses that already require auth + ownership or admin role.

**Resilience:** SQL Server connections use `EnableRetryOnFailure()`; user-initiated
`BeginTransactionAsync` is forbidden unless wrapped in `ExecutionStrategy.ExecuteAsync`. Email
sending is queued via Coravel `IQueue` + `IInvocable` jobs; status-change emails carry
event-time payloads so rapid state transitions don't collapse multiple notifications into the
final-state subject line.

**Migrations:** EF Core auto-migration on startup is permitted in `Development` only;
production migrations are an explicit deployment step.

## Development Workflow & Quality Gates

**Pre-merge UI checklist** (mirrors `DESIGN_PRINCIPLES.md` §10): the 4-state matrix verified, no
hard-coded directionality, ≤ 2 levels of card nesting, ≤ 3 distinct font weights, `tabular-nums`
on numeric columns, `prefers-reduced-motion` respected, Lucide-only iconography, no missing
translation keys, no missing `alt` text, no console errors.

**Localization:** every user-visible string MUST exist in both
`frontend/src/locales/ar/<namespace>.json` and `frontend/src/locales/en/<namespace>.json`.
Missing keys block merge. Locale-aware formatting goes through centralized helpers — currency
via `frontend/src/shared/lib/format.ts`, dates via the `dayjs` helper. Inline locale logic in
components is forbidden.

**Backend invariants:** the order state machine (`OrderStateMachine`) is the only legal writer
to `Order.Status`; bypassing it requires a constitution amendment. Stock decrement and cart
mutations rely on the implicit `SaveChangesAsync` transaction — reintroducing
`BeginTransactionAsync` requires `ExecutionStrategy.ExecuteAsync` wrapping. Order numbers go
through `OrderNumberGenerator`; multi-instance deployment requires swapping to a SQL Server
`SEQUENCE` before scale-out.

**Tests:** `tests/DrMirror.Tests` (xUnit) covers the order state machine, cart merge semantics,
payment-method seeding, and any other invariant whose violation has historical or domain cost.
New invariants ship with the test that protects them.

**Migrations:** every model change ships with the corresponding EF Core migration in the same
PR. The migration name MUST describe the change (`AddOrderCounter`, not `Update1`).

## Governance

This constitution supersedes ad-hoc practices. Where it conflicts with `PROJECT_MAP.md`,
`DESIGN_PRINCIPLES.md`, `README.md`, or `AGENTS.md`, the constitution wins and the other
document is updated to match.

**Amendment procedure:**

1. A pull request updates `.specify/memory/constitution.md` and bumps the version per the
   semver policy below.
2. The PR description includes a written rationale and a Sync Impact Report at the top of the
   constitution file as an HTML comment.
3. Dependent templates (`.specify/templates/*.md`) and runtime guidance docs (`PROJECT_MAP.md`,
   `DESIGN_PRINCIPLES.md`, `README.md`) are synced in the same PR where principles overlap.
4. The repository owner approves the PR.

**Versioning policy (semver):**

- **MAJOR** — backward-incompatible governance changes or principle removal/redefinition.
- **MINOR** — a new principle or materially expanded guidance.
- **PATCH** — clarifications, wording, typo fixes, non-semantic refinements.

**Compliance review:** every `plan.md` MUST include a Constitution Check section that
explicitly addresses each principle. Deviations MUST be recorded in the Complexity Tracking
table with the justification and the simpler alternative rejected. Reviewers reject PRs that
introduce unjustified deviations.

Runtime guidance docs (`PROJECT_MAP.md`, `DESIGN_PRINCIPLES.md`, `README.md`, `AGENTS.md`)
remain the day-to-day reference; this constitution is the source of authority where they
disagree.

**Version**: 1.0.0 | **Ratified**: 2026-05-15 | **Last Amended**: 2026-05-15
