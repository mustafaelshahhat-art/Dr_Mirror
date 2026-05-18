# Project Map

Dr Mirror is a production e-commerce platform for Egyptian medical uniforms. This map orients contributors to the stack, repository layout, environments, and operating documents.

## Architecture Overview

- Backend: .NET 10 ASP.NET Core Minimal APIs under `backend/src/DrMirror.Api`, organized by vertical slices in `Features/`.
- Frontend: React 19 + Vite under `frontend/src`, organized by feature folders with shared UI and API utilities in `shared/`.
- Data: SQL Server through EF Core migrations; migrations are additive and live under `Infrastructure/Persistence/Migrations/`.
- Storage: Cloudinary in production, local `wwwroot/uploads` in development. Payment proofs are private and only streamed through authenticated endpoints.
- Operations: GitHub Actions CI, Serilog logs, Sentry frontend error capture, health probes, and documented deployment/runbook procedures.

## Slice Map

- `Features/Auth`: login, refresh, profile, user token boundaries.
- `Features/Catalog`: public product/category browsing.
- `Features/Checkout`: order creation, stock decrement, idempotency.
- `Features/Orders`: buyer order history and payment-proof upload/access.
- `Features/Admin/*`: operator workflows for orders, proofs, catalog, users, inquiries, and audit logs.
- `Shared/*`: cross-cutting infrastructure such as auditing, health checks, validation, slugs, and rate limiting.

## Environments

- Development: user-secrets for backend secrets, Vite dev server, local file storage unless overridden.
- Staging: production-like API + SQL Server + storage, used for smoke checks, runbook drills, and backup/restore drills.
- Production: MonsterASP.NET-class backend, Vercel-class frontend, SQL Server, Cloudinary, SMTP, synthetic readiness monitor.

## Environment Variables Index

- `ConnectionStrings__Default`: SQL Server connection string.
- `Jwt__Issuer`, `Jwt__Audience`, `Jwt__Secret`: JWT settings; `Jwt__Secret` must be at least 64 characters in Production.
- `Cors__AllowedOrigins__0`: allowed frontend origin.
- `Auth__UseCrossSiteCookies`: enables production cross-site refresh-cookie attributes.
- `FileStorage__Provider`: `local` or `cloudinary`.
- `FileStorage__CloudinaryCloudName`, `FileStorage__CloudinaryApiKey`, `FileStorage__CloudinaryApiSecret`: required when Cloudinary is active.
- `Email__Provider`: `logonly` or `mailkit`.
- `Email__FromAddress`, `Email__SmtpHost`, `Email__SmtpPort`, `Email__SmtpUsername`, `Email__SmtpPassword`: required when MailKit is active.
- `HealthChecks__OutboxStuckThreshold`: readiness threshold for stuck email outbox messages.
- `Retention__EnableProofPurge`, `Retention__ProofPurgeIntervalHours`, `Retention__OutboxRetentionDays`: retention service controls.
- `VITE_API_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_APP_RELEASE`: frontend build-time settings.

## Branching And Release Rules

- Branch from `main` for feature work.
- Open a pull request before merge; CI must be green before merge.
- Do not force-push to `main` without explicit maintainer approval and a written reason.
- Conventional commit prefixes are optional, but commit messages should name the user-visible or operational change.
- Tag releases as `vYYYY.MM.DD[-n]` or with the product release version used by the deployment record.

## Design Tokens And Breakpoints

- Canonical responsive breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.
- Use logical spacing and positioning for RTL/LTR parity.
- Preserve Arabic-first dark-mode defaults while keeping full light-mode parity.

## Migration Safety Policy

- Migrations are forward-only and additive by default.
- Do not add required columns to existing rows without a safe default and backfill plan.
- Destructive steps require explicit justification in the migration file and explicit user authorization.
- Schema changes that affect user-visible data must document recovery or rollback expectations.

## UI System Discipline

- HeroUI v3 is the only component system.
- Do not add a second design system.
- Prefer HeroUI controls over raw HTML controls when an equivalent exists.
- Lucide is the only icon set.

## Link Tree

- [Deployment](./DEPLOY.md)
- [Runbook](./RUNBOOK.md)
- [Backup and Restore](./BACKUP_RESTORE.md)
- [Threat Model](./THREAT_MODEL.md)
- [Redesign Audit](./REDESIGN_AUDIT.md)
