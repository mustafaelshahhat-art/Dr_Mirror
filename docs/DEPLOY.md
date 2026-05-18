# Deploy guide

This document records the operational gates and required secrets for deploying Dr_Mirror to production.

## Dependency Audit Gates

The CI workflow (`.github/workflows/ci.yml`) fails any PR that introduces a `high` or `critical` vulnerability on either side of the stack.

### Backend gate

Runs in the `backend` job:

```pwsh
dotnet list backend/DrMirror.slnx package --vulnerable --include-transitive --format json > backend-vuln.json
pwsh -File backend/scripts/check-vulns.ps1 -InputPath backend-vuln.json -Severity high
```

`check-vulns.ps1` exits non-zero if any reported advisory has severity at or above the `-Severity` threshold (default `high`). A `check-vulns.Tests.ps1` smoke test feeds known fixtures and asserts the expected exit codes on every CI run.

### Frontend gate

Runs in the `frontend` job:

```bash
npm --prefix frontend audit --audit-level=high --omit=dev
```

`--omit=dev` keeps the gate focused on production dependencies. Vulnerabilities in dev-only tooling do not ship to users and are tracked separately.

### Emergency override procedure

When a high-severity advisory is published with no upstream fix and the impact is contained, an override is permitted for at most one CI cycle:

1. The PR description **must** link to the advisory.
2. The PR description **must** state the planned remediation (fork, pin, or wait-for-upstream) and the date by which the override expires.
3. Temporarily raise the threshold for *that* PR only by passing `-Severity critical` to `check-vulns.ps1` (or `--audit-level=critical` to `npm audit`) via a one-line workflow change in the same PR.
4. Revert the threshold in a follow-up PR within the stated window. A green CI run on `main` with the default `high` threshold confirms the override has been retired.

Overrides for `critical` advisories are not permitted under any circumstance.

## Pre-Deploy Secrets Validation

The release-target CI build runs `ProdSecretsValidator` against the CI environment variables before any deploy step. It validates the same keys `Program.cs` validates at boot, but earlier — so a release with a missing `Jwt:Secret` fails the build rather than crashing the API on first start.

### Required secrets (production)

The validator fails when any of these are missing, empty, or fail the additional invariant check.

| Key | Invariant |
| --- | --- |
| `ConnectionStrings:Default` | Non-empty. |
| `Jwt:Secret` | Non-empty AND ≥ 64 characters. |
| `Cors:AllowedOrigins:0` | At least one origin is configured. |
| `FileStorage:CloudinaryCloudName` | Required when `FileStorage:Provider` is `cloudinary`. |
| `FileStorage:CloudinaryApiKey` | Required when `FileStorage:Provider` is `cloudinary`. |
| `FileStorage:CloudinaryApiSecret` | Required when `FileStorage:Provider` is `cloudinary`. |
| `Email:FromAddress` | Required when `Email:Provider` is `mailkit`. |
| `Email:SmtpHost` | Required when `Email:Provider` is `mailkit`. |
| `Email:SmtpPort` | Required when `Email:Provider` is `mailkit`. |
| `Email:SmtpUsername` | Required when `Email:Provider` is `mailkit`. |
| `Email:SmtpPassword` | Required when `Email:Provider` is `mailkit`. |

The CI step invokes `backend/scripts/verify-prod-secrets.ps1`, which builds the same `IConfiguration` shape `Program.cs` builds at runtime, then calls `ProdSecretsValidator.Validate(...)`. On failure the script lists every missing key in one aggregated error message and exits non-zero.
