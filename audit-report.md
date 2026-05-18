# Audit Report — Dr_Mirror Full-Stack Code Audit

**Audit Date**: 2026-05-19
**Commit Audited**: b30a154b85379d3d68071f2e36afdc5263ac9e4c
**Branch**: 007-code-audit
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Auditor**: Cascade (AI pair-programmer)

**Result Summary**: Critical: 0 · High: 0 · Medium: 3 · Low: 6 · Info: 0 · Total: 9

## 1. Executive Summary

The Dr_Mirror codebase is in strong overall health. Security posture is solid — JWT + refresh-token rotation, rate-limiting, CORS allowlist, origin validation, security headers, payment-proof privacy, and production-secret validation are all properly implemented. The Egyptian-market e-commerce domain logic (idempotent checkout, concurrency-safe stock decrement, bounded email retries, FSM-guarded order transitions) demonstrates careful engineering.

**Key strengths:**
- Zero Critical or High findings.
- All 17 recommendations from prior audits (specs 003–006) are confirmed resolved.
- Logical CSS convention perfectly enforced (zero `ml-`/`mr-`/`text-left`/`text-right` violations).
- Comprehensive test suites: 48 backend test classes, 53 frontend test files, plus CI pipeline gates.
- HeroUI v3 adoption is consistent; i18n parity is enforced via automated check.

**Areas for improvement (3 Medium, 6 Low):**
- Cache-control middleware never applies headers (dead code) — Medium/Correctness.
- Admin forms bypass the mandatory react-hook-form + Zod convention — Medium/Convention.
- No skip-link on layouts — Medium/Accessibility.
- Minor operational/maintenance gaps in background services, CI, and linting.

## 2. Coverage Map

| Path | Layer | Rule Sets Applied | Findings | Notes |
|------|-------|-------------------|----------|-------|
| `backend/src/DrMirror.Api/Program.cs` | Backend | BestPractice, Constitution | 1 | Composition root; middleware pipeline |
| `backend/src/DrMirror.Api/BackgroundServices/` | Backend | BestPractice, Convention | 2 | Retention purge services |
| `backend/src/DrMirror.Api/Features/Orders/UploadPaymentProof/` | Backend | BestPractice | 1 | Proof upload endpoint |
| `backend/src/DrMirror.Api/Features/Auth/` | Backend | BestPractice, Constitution | 0 | Well-structured; token reuse detection |
| `backend/src/DrMirror.Api/Features/Checkout/` | Backend | BestPractice, Constitution | 0 | Idempotency + concurrency handled |
| `backend/src/DrMirror.Api/Features/Admin/` | Backend | BestPractice, Constitution | 0 | Role-gated, rate-limited, audit-logged |
| `backend/src/DrMirror.Api/Infrastructure/` | Backend | BestPractice, Convention | 0 | EF configs, email outbox, storage |
| `backend/src/DrMirror.Api/Shared/` | Backend | BestPractice, Constitution | 0 | Validators, rate-limit, health checks |
| `frontend/src/features/addresses/components/` | Frontend | Convention, Constitution | 0 | AddressForm also affected by F-005 |
| `frontend/src/features/admin/catalog/` | Frontend | Convention, Constitution, Accessibility | 2 | F-005, F-007 |
| `frontend/src/shared/components/Layout.tsx` | Frontend | Accessibility, Constitution | 1 | No skip-link |
| `frontend/src/features/admin/components/AdminLayout.tsx` | Frontend | Accessibility, Constitution | 0 | No skip-link (counted under Layout) |
| `frontend/src/app/router.tsx` | Frontend | BestPractice | 0 | Lazy loading, auth guards |
| `frontend/src/shared/lib/` | Frontend | BestPractice, Convention | 0 | API client, sentry, format, i18n |
| `frontend/src/styles/globals.css` | Frontend | Convention, Constitution | 0 | OKLCH palette, RTL, reduced-motion |
| `.github/workflows/ci.yml` | Cross-Cutting | BestPractice, Convention | 1 | Conditional lint step |
| `frontend/package.json` | Cross-Cutting | Accessibility | 1 | No jsx-a11y lint plugin |
| `backend/tests/DrMirror.Tests/` | Backend | TestCoverage | 0 | 48 test classes; concurrency, FSM, identity |
| `frontend/src/test/` | Frontend | TestCoverage | 0 | 53 test files; a11y regression suite |

## 3. Backend Findings

#### F-001 — Cache-control middleware is dead code

- **Severity**: Medium
- **Category**: Correctness
- **Rule**: Best practice — response headers must be set before the response is committed
- **Location**: `backend/src/DrMirror.Api/Program.cs:312-336`
- **Observation**: The inline middleware calls await next (line 314), then checks Response.HasStarted (line 316). For every JSON endpoint (catalog, orders, cart, etc.), the response body has already been written by the time control returns, so HasStarted is true and the branch that sets Cache-Control/Vary headers never executes.
- **Impact**: Catalog responses lack the intended public caching directive. Browser and CDN caching does not behave as designed.
- **Suggested Remediation**: Use Response.OnStarting (the same pattern used by SecurityHeadersMiddleware) or implement an endpoint filter to set cache headers before the response starts.
- **Triage**: Resolved

---

#### F-002 — EmailOutboxRetentionService never purges failed messages

- **Severity**: Low
- **Category**: Maintainability
- **Rule**: Best practice — background data purge should cover all terminal states
- **Location**: `backend/src/DrMirror.Api/BackgroundServices/EmailOutboxRetentionService.cs:49`
- **Observation**: The query filter only targets Sent messages with DeliveredAt older than the retention cutoff. Messages that reached the terminal Failed status (introduced per spec 005) are excluded and accumulate indefinitely.
- **Impact**: Slow unbounded growth of the EmailOutboxMessages table from permanently-failed rows. Low practical impact given low failure volume.
- **Suggested Remediation**: Extend the purge query to also delete Failed rows whose LastAttemptAt is older than the retention cutoff.
- **Triage**: Resolved

---

#### F-003 — PaymentProofRetentionPurgeService logs inaccurate purge count

- **Severity**: Low
- **Category**: Correctness
- **Rule**: Constitution §VII — Observability, Reliability & Recovery
- **Location**: `backend/src/DrMirror.Api/BackgroundServices/PaymentProofRetentionPurgeService.cs:85-88`
- **Observation**: On line 81, failed deletions execute continue, skipping the FilePurgedAtUtc assignment. However, the log at line 88 reports proofs.Count (total batch size) as the purged count, not the number that were actually processed.
- **Impact**: Operational dashboards and log alerts receive an inflated number of purged files.
- **Suggested Remediation**: Maintain a purgedCount counter that increments only on successful delete, and log that value instead of proofs.Count.
- **Triage**: Resolved

---

#### F-004 — Potential file stream leak on early exception in UploadPaymentProof

- **Severity**: Low
- **Category**: Correctness
- **Rule**: Best practice — IDisposable resources must be deterministically disposed
- **Location**: `backend/src/DrMirror.Api/Features/Orders/UploadPaymentProof/UploadPaymentProofEndpoint.cs:99-114`
- **Observation**: file.OpenReadStream() is captured at line 99. If an exception occurs between lines 99 and 114 (where it is wrapped into a using declaration), the stream is not disposed. The only explicit disposal path before line 114 is the magic-bytes failure branch (line 107).
- **Impact**: Extremely unlikely in practice but technically constitutes a resource leak path under adversarial or OOM conditions.
- **Suggested Remediation**: Declare the stream variable with a using declaration immediately at line 99, or wrap the intervening lines in a try/finally that disposes on failure.
- **Triage**: Resolved

## 4. Frontend Findings

#### F-005 — Multiple admin forms use raw useState instead of react-hook-form + Zod

- **Severity**: Medium
- **Category**: Convention
- **Rule**: CLAUDE.md → "react-hook-form + Zod on every form. Never useState for form state."
- **Locations**:
  - `frontend/src/features/addresses/components/AddressForm.tsx:36-48`
  - `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx:232-234`
  - `frontend/src/features/admin/catalog/components/ProductMasterForm.tsx:28-38`
  - `frontend/src/features/admin/catalog/components/ProductVariantsSection.tsx:152-157`
  - `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx:61-71`
- **Observation**: These forms manage all field state via individual useState hooks with manual onSubmit aggregation. No Zod schema is defined or validated at submit time. Login, Register, and Checkout properly use useForm with zodResolver.
- **Impact**: No client-side schema validation for admin data entry; inconsistent error UX; violates the established convention and invites further drift.
- **Suggested Remediation**: Create a Zod schema per form and refactor each to useForm with zodResolver. Use HeroUI isInvalid and errorMessage props for field-level feedback.
- **Triage**: Resolved

---

#### F-006 — No skip-link for keyboard navigation

- **Severity**: Medium
- **Category**: Accessibility
- **Rule**: Constitution §VI — keyboard navigation and focus management; WCAG 2.1 SC 2.4.1
- **Locations**:
  - `frontend/src/shared/components/Layout.tsx:1`
  - `frontend/src/features/admin/components/AdminLayout.tsx:1`
- **Observation**: Neither layout component renders a Skip to main content link. Keyboard-only users must tab through the full header and navigation on every page load.
- **Impact**: Reduced usability for keyboard and screen-reader users; fails WCAG 2.1 Level A criterion 2.4.1 (Bypass Blocks).
- **Suggested Remediation**: Add a visually-hidden anchor at the top of each layout that jumps to the main landmark, and ensure the main element has a matching id with tabIndex -1 for programmatic focus.
- **Triage**: Resolved — already implemented before spec `001-audit-fix-pass`; both storefront and admin layouts include skip-links.

---

#### F-007 — No aria-required on mandatory admin form fields

- **Severity**: Low
- **Category**: Accessibility
- **Rule**: Constitution §VI — accessibility; WCAG 1.3.1 (Info and Relationships)
- **Locations**:
  - `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx:250-278`
  - `frontend/src/features/admin/catalog/components/ProductVariantsSection.tsx:152-157`
  - `frontend/src/features/admin/catalog/components/payment-methods/PaymentMethodForm.tsx:61-71`
- **Observation**: Because these forms bypass HeroUI form-aware isRequired prop (which automatically sets aria-required) and use raw useState with manual TextField/Input, mandatory fields do not communicate their required status to assistive technology.
- **Impact**: Screen-reader users on the admin surface cannot identify which fields are required without trial and error.
- **Suggested Remediation**: When refactoring to react-hook-form (see F-005), use isRequired on each HeroUI field. Alternatively, add aria-required explicitly to all mandatory TextField wrappers.
- **Triage**: Resolved

## 5. Cross-Cutting Findings

#### F-008 — CI lint step uses fragile conditional guard

- **Severity**: Low
- **Category**: Convention
- **Rule**: Best practice — CI gates should fail explicitly, not silently skip
- **Location**: `.github/workflows/ci.yml:118-124`
- **Observation**: The lint step conditionally checks whether a lint script exists before running it. While the script IS currently defined, accidentally removing it in a future refactor would produce a silent pass rather than a pipeline failure.
- **Impact**: A future refactor that drops the lint script would silently disable CI linting.
- **Suggested Remediation**: Remove the conditional guard and invoke lint directly so that a missing script causes the step to fail. Alternatively use npm run --if-present combined with a separate assertion step.
- **Triage**: Resolved

---

#### F-009 — No eslint-plugin-jsx-a11y in frontend linting

- **Severity**: Low
- **Category**: Accessibility
- **Rule**: Constitution §VI — accessibility; static a11y analysis at lint time
- **Location**: `frontend/package.json:38-58`
- **Observation**: The ESLint config includes eslint-plugin-react-hooks and eslint-plugin-i18next but not eslint-plugin-jsx-a11y. Common accessibility violations (missing alt text, invalid ARIA roles, interactive elements without keyboard handlers) are not flagged at lint time.
- **Impact**: Accessibility regressions can enter the codebase without automated static detection. The a11y test suite (vitest-axe) catches render-time issues but not source-level patterns.
- **Suggested Remediation**: Add eslint-plugin-jsx-a11y to devDependencies and integrate its recommended rule-set into the flat ESLint config.
- **Triage**: Resolved

## 6. Resolved Prior Findings

All 17 verifiable recommendations from prior audit-related specs (003, 004, 005, 006) are confirmed resolved in the current codebase:

| Spec | Recommendation | Status | Evidence |
|------|---------------|--------|----------|
| 003 | Security headers middleware | ✅ Resolved | SecurityHeadersMiddleware — HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, CORP |
| 003 | ProblemDetails on all errors | ✅ Resolved | AddProblemDetails + UseExceptionHandler + UseStatusCodePages in Program.cs |
| 003 | Health endpoints with real checks | ✅ Resolved | SqlServerHealthCheck, FileStorageHealthCheck, OutboxHealthCheck registered |
| 003 | Payment-proof private file enforcement | ✅ Resolved | Static-file middleware blocks /uploads/payment-proofs (401); authenticated streaming endpoint |
| 003 | Startup validation for secrets | ✅ Resolved | ProdSecretsValidator.Validate at boot + CI pre-deploy gate |
| 003 | Seeder idempotency | ✅ Resolved | All seed methods check existence before insert |
| 003 | Concurrency-safe checkout | ✅ Resolved | RowVersion on ProductVariant + retry loop in CreateOrderEndpoint |
| 004 | Logical CSS only | ✅ Resolved | Zero matches for ml-/mr-/pl-/pr-/text-left/text-right |
| 004 | HeroUI v3 adoption | ✅ Resolved | All interactive elements use HeroUI; raw button only where justified with comment |
| 004 | Reduced-motion discipline | ✅ Resolved | @media (prefers-reduced-motion: reduce) + motion-safe: prefix |
| 005 | Proof-file delete observability | ✅ Resolved | PurgeService leaves row unpurged on failure, logs reason |
| 005 | Email outbox terminal failed state | ✅ Resolved | OutboxMessageStatus.Failed + max attempts cap |
| 005 | Centralized React Query keys | ✅ Resolved | queryKeys in shared/lib/query-keys.ts |
| 006 | Origin allowlist on refresh endpoint | ✅ Resolved | RequireTrustedOriginMiddleware before rate-limiter |
| 006 | Streaming payment proofs | ✅ Resolved | Results.Stream(stream, proof.ContentType) |
| 006 | Sentry scrubber handles circular refs | ✅ Resolved | WeakSet cycle detection in scrubObject |
| 006 | getSafeNextPath validation | ✅ Resolved | Decode + protocol-relative + scheme-relative checks |

## 7. Prioritized Punch-List

### Medium

- F-001 [Medium/Correctness] Cache-control middleware is dead code — `backend/src/DrMirror.Api/Program.cs:312`
- F-005 [Medium/Convention] Admin forms bypass react-hook-form + Zod — `frontend/src/features/admin/catalog/components/ProductMasterForm.tsx:28`
- F-006 [Medium/Accessibility] No skip-link for keyboard navigation — `frontend/src/shared/components/Layout.tsx:1`

### Low

- F-002 [Low/Maintainability] Outbox retention ignores Failed rows — `backend/src/DrMirror.Api/BackgroundServices/EmailOutboxRetentionService.cs:49`
- F-003 [Low/Correctness] Proof purge logs inaccurate count — `backend/src/DrMirror.Api/BackgroundServices/PaymentProofRetentionPurgeService.cs:88`
- F-004 [Low/Correctness] Potential file stream leak — `backend/src/DrMirror.Api/Features/Orders/UploadPaymentProof/UploadPaymentProofEndpoint.cs:99`
- F-007 [Low/Accessibility] Missing aria-required on admin fields — `frontend/src/features/admin/catalog/AdminCategoriesPage.tsx:250`
- F-008 [Low/Convention] CI lint step fragile guard — `.github/workflows/ci.yml:118`
- F-009 [Low/Accessibility] No jsx-a11y lint plugin — `frontend/package.json:38`

## 8. Appendices

### A. Verification Commands Executed

| Command | Result |
|---------|--------|
| npm --prefix frontend run i18n:check | Pass — all keys in parity |
| npm --prefix frontend run build | Pass — zero errors |
| npm --prefix frontend test -- --run | Pass — all tests green |
| dotnet build backend/src/DrMirror.Api/DrMirror.Api.csproj | Pass — zero warnings |
| dotnet test backend/tests/DrMirror.Tests/DrMirror.Tests.csproj | Pass — all tests green |
| npm --prefix frontend audit --json | Pass — 0 high/critical vulnerabilities |
| dotnet list backend/src/DrMirror.Api/DrMirror.Api.csproj package --vulnerable --include-transitive | Pass — no vulnerable packages |

### B. Rule Sources

- **Best practice**: Industry-standard patterns for .NET/React/SQL Server applications.
- **CLAUDE.md** (Project Convention): Logical CSS, HeroUI-only, react-hook-form + Zod, Lucide icons, formatCurrency, i18n parity.
- **Constitution** (.specify/memory/constitution.md): Eight principles governing Dr_Mirror development — security, RTL parity, accessibility, payment integrity, observability, UI discipline.

### C. Scope

In-scope files defined by git ls-files at commit b30a154. Exclusions per research.md:
- Migration Designer.cs files (auto-generated)
- node_modules/, bin/, obj/ (gitignored)
- specs/ (documentation, not source)
