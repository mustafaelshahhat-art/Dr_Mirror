# backend/scripts

CI helper scripts invoked from `.github/workflows/ci.yml`. These are deliberately small PowerShell entry points so the same logic runs identically on a developer machine and in CI, with no driver-specific glue.

| Script | Purpose |
| --- | --- |
| `check-vulns.ps1` | Consumes `dotnet list package --vulnerable --include-transitive --format json` and fails the build when any advisory matches the configured severity threshold (default `high`). |
| `verify-prod-secrets.ps1` | Invokes the same `ProdSecretsValidator` the API runs at boot, so a release-target build fails when a required production secret is missing or malformed. |

All scripts must exit non-zero on validation failure; CI treats a zero exit as success.
