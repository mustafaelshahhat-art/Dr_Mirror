<#
.SYNOPSIS
    Pre-deploy production-secrets gate. Calls into the same
    `ProdSecretsValidator` the API runs at boot so CI cannot drift from
    runtime behaviour.

.DESCRIPTION
    Sets `ASPNETCORE_ENVIRONMENT=Production` so the API code path that
    invokes the validator is exercised, then runs the API with the
    `--validate-prod-secrets` argument. The Program.cs early-exit branch
    runs the validator against environment variables, prints success on
    stdout and exits 0; on validation failure it prints the aggregated
    list of missing keys to stderr and exits 1.

.PARAMETER ApiProject
    Path to the DrMirror.Api.csproj. Defaults to the repo-relative location.

.EXAMPLE
    pwsh -File backend/scripts/verify-prod-secrets.ps1
#>

[CmdletBinding()]
param(
    [string]$ApiProject = (Join-Path $PSScriptRoot '..\src\DrMirror.Api\DrMirror.Api.csproj')
)

$ErrorActionPreference = 'Stop'

$resolved = Resolve-Path -LiteralPath $ApiProject -ErrorAction Stop
$env:ASPNETCORE_ENVIRONMENT = 'Production'

# `dotnet run` returns the wrapped process exit code, so a non-zero from
# Program.cs's early-exit branch propagates correctly.
& dotnet run --project $resolved.Path --no-launch-profile -- --validate-prod-secrets
$code = $LASTEXITCODE
exit $code
