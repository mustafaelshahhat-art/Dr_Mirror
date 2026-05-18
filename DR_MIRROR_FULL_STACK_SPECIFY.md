# Dr Mirror — Full-Stack Production Reality Spec Prompt

Use this file with:

```text
/speckit.specify
```

Then paste the full prompt below.

---

## Prompt

Create a comprehensive Spec Kit specification for hardening and completing **Dr Mirror** as a real production full-stack e-commerce platform, not a prototype, not a frontend-only polish pass, and not a narrow bug-fix task.

Dr Mirror is an Egyptian medical uniforms e-commerce store for scrubs, lab coats, surgical headwear, and medical footwear. Arabic RTL is the primary experience, English is a complete second locale, prices are in EGP, and supported payment flows must match the Egyptian market: Cash on Delivery, Instapay, and mobile wallets.

The goal is to produce a project-wide production improvement specification where:

- Anything already implemented correctly must be preserved.
- Anything implemented but weak, inconsistent, incomplete, or fragile must be improved.
- Anything missing from a real production full-stack application must be added.
- Any bug, UX issue, security gap, permission leak, deployment gap, test gap, or reliability weakness discovered during repository analysis must be addressed.
- The work must cover the entire project: frontend, backend, database, auth, security, hosting, deployment, observability, scaling, and recovery.
- The output must be a clear, testable specification only. Do not implement code in this step.

Use the existing repository as the source of truth. Before writing the final spec, inspect the current architecture, project structure, domain model, API slices, frontend routes, auth flow, database schema, storage flow, payment proof flow, tests, configuration, deployment assumptions, and existing documentation.

The current architecture must be preserved unless the spec explicitly justifies a safer improvement:

- Backend: .NET 10, ASP.NET Core Minimal APIs, vertical slices under feature folders, EF Core, SQL Server, ASP.NET Identity + JWT, Serilog, MailKit, Cloudinary/local storage provider switching.
- Frontend: React 19, TypeScript, Vite, HeroUI, Tailwind CSS v4, i18next, React Query, React Router, dark-first theming, light/dark support, persisted user theme, Arabic RTL parity.
- Hosting target: frontend on Vercel, backend on MonsterASP.NET or equivalent ASP.NET hosting.
- Database target: SQL Server.
- File storage target: local in development, Cloudinary or production-grade external storage in production.
- Existing business behavior must not be silently changed.

## Production Reality Layers

The specification must be organized around these layers and must produce concrete requirements for each one.

### 1. Frontend

Audit and specify improvements for the complete customer and admin frontend.

Requirements must include:

- Arabic RTL as the primary user experience.
- English as a complete second locale.
- Full i18n key parity and no hardcoded user-facing strings outside the locale system unless explicitly justified.
- RTL-safe layout behavior for navigation, drawers, dropdowns, tables, forms, modals, empty states, pagination, breadcrumbs, and action menus.
- Responsive behavior for mobile, tablet, laptop, and desktop.
- Dark and light theme parity.
- Accessible HeroUI-first components where possible.
- No raw controls when a project-approved component exists.
- Clear loading states using skeletons where appropriate, not generic spinners everywhere.
- Strong empty states, error states, retry states, and offline/slow-network states.
- Consistent product cards, catalog filters, product detail pages, cart, checkout, order tracking, address book, inquiries, login/register, and admin dashboard pages.
- Buyer/customer pages must never expose admin-only affordances.
- Admin pages must be visually and functionally isolated from the storefront.
- Admin users must not be sent into the public storefront experience when their intended destination is admin work.
- Forms must have robust validation, localized error text, keyboard support, focus handling, and submit protection against duplicate actions.
- Product images must use proper aspect ratios, lazy loading, alt text, and graceful fallbacks.
- Checkout must clearly communicate payment rules:
  - COD does not require payment proof.
  - Instapay/mobile wallet flows require proof upload.
- No design change should make the website look AI-generated, generic, or template-like. The result must feel like a real premium Egyptian medical apparel storefront.

### 2. APIs & Backend Logic

Audit and specify improvements for all backend features and API behavior.

Requirements must include:

- Preserve the vertical-slice Minimal API style.
- Every endpoint must have clear ownership, validation, authorization, error behavior, and test coverage.
- Keep RFC 7807 ProblemDetails as the standard error contract.
- Ensure API responses are localized or frontend-localizable where appropriate.
- Checkout logic must preserve business rules:
  - COD orders do not require payment proof.
  - Instapay/mobile wallet orders require proof.
  - Payment proof approval/rejection belongs to admin flow only.
- Order lifecycle must be explicit, safe, and tested.
- Inventory and product variant stock must remain consistent under concurrent checkout/admin updates.
- Cart behavior must be deterministic for guest/session/authenticated flows as currently designed.
- Admin catalog CRUD must validate product/category/variant/image data strictly.
- Inquiries must be spam-resistant and admin-manageable.
- Email sending must remain durable through the outbox/background-processing pattern.
- Backend must never trust frontend-only validation.
- All public, buyer, and admin endpoints must return predictable status codes.
- Add missing endpoint tests for discovered gaps.

### 3. Database & Storage

Audit and specify improvements for SQL Server persistence, EF Core configuration, migrations, and file storage.

Requirements must include:

- Preserve SQL Server as the production database.
- Preserve EF Core migrations and avoid destructive schema changes unless explicitly justified and migration-safe.
- Ensure all important tables have appropriate indexes for catalog browsing, slug lookup, order lookup, user ownership, admin lists, payment proof lookup, and email outbox processing.
- Ensure unique constraints exist where business identity requires uniqueness.
- Ensure decimal/money fields are configured safely for EGP pricing.
- Ensure stock and order mutations are concurrency-safe.
- Ensure data integrity through foreign keys, required fields, delete behavior, and domain constraints.
- Payment proof files must remain private and must never be served through public static file middleware.
- Product images may be public, optimized, and CDN-backed.
- Production storage must not depend on local disk for critical private assets unless the host guarantees persistence and backups.
- Cloudinary or equivalent production storage must be configured safely.
- Document backup, restore, and migration procedures.

### 4. Auth & Permissions

Audit and specify improvements for authentication, authorization, session handling, roles, and route protection.

Requirements must include:

- Preserve ASP.NET Identity + JWT.
- Preserve secure refresh-token/session behavior.
- Access tokens must be validated against disabled users and token invalidation rules.
- Role boundaries must be enforced on the backend, not only in the frontend.
- Admin-only routes and APIs must require the Admin role.
- Buyer/customer order data must be scoped to the owning user.
- Admin access must not bypass safety checks unnecessarily.
- Users must not be able to escalate roles or alter admin-only fields.
- Public-only routes, protected routes, customer routes, and admin routes must behave consistently.
- Disabled users must be unable to continue using old tokens.
- Login/register/refresh/logout behavior must be tested.
- Any cookie behavior used for refresh tokens must be safe for cross-origin production deployment.
- Security-sensitive auth decisions must have integration tests.

### 5. Hosting & Deployment

Audit and specify improvements for the real deployment path.

Requirements must include:

- Frontend deployment must support Vercel or equivalent static hosting.
- Backend deployment must support MonsterASP.NET or equivalent ASP.NET hosting.
- Production environment variables must be complete and documented.
- CORS must be explicit and production-safe.
- `VITE_API_BASE_URL` must correctly target the production API.
- Backend health checks must verify more than process uptime where appropriate.
- Production must fail early on missing critical configuration.
- No secrets may be committed.
- Development setup must remain simple and documented.
- Deployment steps must be reproducible.
- Static assets, fonts, and product images must be optimized for production.
- Environment-specific behavior must be explicit: development, test, production.

### 6. Cloud & Compute

Audit and specify improvements for external services and runtime infrastructure.

Requirements must include:

- Cloudinary or equivalent media storage must be production-ready.
- SMTP/MailKit configuration must be production-ready.
- Email outbox processing must tolerate transient failures.
- Runtime services must avoid hidden local-machine assumptions.
- Background services must not crash the whole app silently.
- Any third-party service failure must degrade gracefully where possible.
- Timeouts, retries, and error handling must be defined for external calls.
- Production runtime must be stateless where practical so it can scale horizontally later.
- If current hosting does not support horizontal scaling, the spec must still prepare the codebase to avoid blocking it later.

### 7. CI/CD & Version Control

Audit and specify improvements for repository hygiene, automated checks, and release safety.

Requirements must include:

- If CI/CD workflows already exist, improve them without breaking the project.
- If CI/CD workflows are absent or incomplete, specify adding GitHub Actions or equivalent.
- Required checks should include:
  - Backend restore/build/test.
  - Frontend install/build/test.
  - TypeScript compilation.
  - i18n key parity check.
  - Linting where project rules exist.
  - Optional SQL Server integration tests only when the required connection string is explicitly provided.
- CI must not require production secrets.
- Test runs must be deterministic.
- Pull requests must be small enough to review.
- Branching, commit, and release rules must protect production behavior.
- Lockfiles and SDK/runtime versions must be respected.
- No generated or sensitive files should be committed accidentally.

### 8. Security & RLS / Access Boundaries

Treat “RLS” here as row-level ownership and access-boundary enforcement, whether implemented at the database layer, the application layer, or both.

Requirements must include:

- Every user-owned record must be protected by ownership checks.
- Admin/customer boundaries must be explicit and tested.
- Payment proof files must require authenticated, authorized access.
- Admin APIs must require backend role checks.
- Sensitive logs must avoid passwords, tokens, raw secrets, and private file contents.
- File uploads must validate size, extension, MIME type, and storage path safety.
- CORS must not use wildcard credentials in production.
- Public endpoints must not expose private fields.
- Error responses must not leak stack traces or implementation secrets in production.
- Add security tests for order ownership, payment proof access, admin access, disabled-user token rejection, and role escalation prevention.
- Threat-model checkout, payment proof review, admin catalog editing, and user-role management.

### 9. Rate Limiting

Audit and specify improvements for abuse protection.

Requirements must include:

- Preserve and test existing named rate-limit policies where present.
- Login and register must remain strictly rate-limited.
- Token refresh must be rate-limited without breaking normal SPA behavior.
- Public inquiry submission must be protected against spam.
- Admin APIs must have defense-in-depth rate limits.
- Rate limit responses must use the same ProblemDetails error contract as other API errors.
- Frontend must present rate-limit failures cleanly and locally.
- Add tests for 429 behavior and Retry-After where applicable.
- Identify any additional endpoint that needs rate limiting, such as proof upload or checkout, without hurting legitimate buyers.

### 10. Caching & CDN

Audit and specify improvements for performance without stale or unsafe data.

Requirements must include:

- React Query caching must be intentional per feature.
- Catalog/category/product reads should use safe caching behavior.
- Cart, checkout, auth, admin, order status, and payment proof data must not be cached unsafely.
- Public product images should use CDN/image optimization where possible.
- Static fonts and assets should have production cache headers.
- API responses should only use cache headers where safe.
- Cache invalidation must be considered after admin product/category/image changes.
- Avoid over-caching Arabic/English or theme-specific content incorrectly.
- Vercel/static hosting and Cloudinary/CDN behavior must be aligned.

### 11. Load Balancing & Scaling

Audit and specify improvements to make the application scalable without over-engineering.

Requirements must include:

- Backend should remain stateless except for SQL Server and external storage.
- No critical production behavior should depend on single-server local memory.
- Refresh/session behavior must work correctly if the API is horizontally scaled later.
- File storage must work across instances.
- Background email outbox processing must avoid duplicate sends if multiple instances are introduced.
- SQL Server connection usage must be efficient and resilient.
- Slow queries and admin list pagination must be reviewed.
- Large product catalogs, order queues, and image sets must remain usable.
- Add pagination, filtering, and indexing where missing.
- Scaling improvements must not introduce unnecessary infrastructure complexity for the current project size.

### 12. Error Tracking & Logs

Audit and specify improvements for observability.

Requirements must include:

- Preserve Serilog structured logging.
- Preserve correlation IDs or request tracing where present.
- Add or improve frontend error boundaries where needed.
- Define how production frontend errors are tracked.
- Define how backend exceptions, validation failures, auth failures, payment-proof failures, and email failures are logged.
- Logs must be useful for debugging without exposing sensitive data.
- Production logs must have rotation/retention.
- Admin/customer actions that affect orders, payment proofs, product stock, or roles should be auditable.
- External service failures must be observable.
- Error copy shown to users must be calm, localized, and non-technical.

### 13. Availability & Recovery

Audit and specify improvements for uptime, resilience, and operational recovery.

Requirements must include:

- Health checks must cover API, database connectivity, and critical service readiness where practical.
- Database backup and restore process must be documented.
- Recovery from failed deployment must be considered.
- Email outbox retry/recovery must be preserved and improved if needed.
- Payment proof storage recovery must be considered.
- Admin order workflow must not lose data during transient failures.
- Users must not be charged or asked for proof twice due to retry/refresh issues.
- Checkout should avoid duplicate order creation from double submit/retry.
- Frontend must handle API downtime gracefully.
- Define a minimum production runbook for common failures:
  - API down.
  - Database unavailable.
  - Cloudinary/storage failure.
  - SMTP failure.
  - Vercel/frontend deploy issue.
  - CORS/env misconfiguration.
  - Admin locked out.

## Cross-Layer Constraints

The specification must enforce these rules:

- Do not change production business behavior unless explicitly required.
- Do not remove working features.
- Do not weaken security for convenience.
- Do not bypass backend authorization because frontend guards exist.
- Do not break Arabic RTL or English locale parity.
- Do not introduce a new design system if the existing HeroUI/Tailwind system can be hardened.
- Do not replace the architecture with a different stack.
- Do not add unnecessary dependencies.
- Do not add real network calls to deterministic frontend tests.
- Do not make SQL Server integration tests mandatory for normal local test runs.
- Do not commit secrets, local environment files, generated logs, or uploaded private files.
- Prefer small, reviewable tasks grouped by layer.
- Every requirement must be testable or verifiable.

## Required Spec Output

Generate the Spec Kit specification with the following sections:

1. Feature name: “Full-Stack Production Reality Hardening”
2. Problem statement.
3. Goals.
4. Non-goals.
5. Current-state assumptions discovered from the repository.
6. Functional requirements grouped by the 13 production reality layers.
7. Security and access-control requirements.
8. Data and storage requirements.
9. UX/i18n/accessibility requirements.
10. Observability and operations requirements.
11. Testing requirements.
12. Deployment and rollback requirements.
13. Acceptance criteria.
14. Open questions only where the repository does not provide enough evidence.

The final spec must be suitable for the next Spec Kit steps:

```text
/speckit.clarify
/speckit.plan
/speckit.tasks
/speckit.analyze
/speckit.implement
```

Do not produce implementation code in this step. Produce a precise project-wide specification that can drive a complete remediation plan for the whole Dr Mirror project.
