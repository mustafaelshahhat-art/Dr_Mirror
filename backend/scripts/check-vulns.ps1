<#
.SYNOPSIS
    Fail when `dotnet list package --vulnerable --include-transitive --format json`
    reports any advisory at or above the configured severity threshold.

.DESCRIPTION
    Consumes the JSON output produced by
        dotnet list <solution> package --vulnerable --include-transitive --format json
    and exits non-zero when any matching advisory is present. Used by CI as a
    PR gate; designed to also run locally against a captured JSON file.

.PARAMETER InputPath
    Path to a JSON file produced by `dotnet list ... --format json`. Required.

.PARAMETER Severity
    Minimum severity to fail on. One of: low, moderate, high, critical.
    Defaults to "high" — i.e. any high or critical advisory fails CI.

.EXAMPLE
    pwsh -File backend/scripts/check-vulns.ps1 -InputPath backend-vuln.json
    pwsh -File backend/scripts/check-vulns.ps1 -InputPath backend-vuln.json -Severity critical
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [ValidateSet('low', 'moderate', 'high', 'critical')]
    [string]$Severity = 'high'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $InputPath)) {
    Write-Error "Input file not found: $InputPath"
    exit 2
}

$severityRanks = @{
    'low' = 1
    'moderate' = 2
    'high' = 3
    'critical' = 4
}
$threshold = $severityRanks[$Severity]

try {
    $raw = Get-Content -LiteralPath $InputPath -Raw
    $report = $raw | ConvertFrom-Json -ErrorAction Stop
}
catch {
    Write-Error "Could not parse JSON from '$InputPath': $($_.Exception.Message)"
    exit 2
}

$findings = New-Object System.Collections.Generic.List[object]
foreach ($project in @($report.projects)) {
    foreach ($framework in @($project.frameworks)) {
        $vulnerableSources = @()
        if ($framework.topLevelPackages) {
            $vulnerableSources += $framework.topLevelPackages
        }
        if ($framework.transitivePackages) {
            $vulnerableSources += $framework.transitivePackages
        }

        foreach ($pkg in $vulnerableSources) {
            foreach ($vuln in @($pkg.vulnerabilities)) {
                $sev = $null
                if ($vuln.severity) { $sev = $vuln.severity.ToString().ToLowerInvariant() }
                if (-not $sev -or -not $severityRanks.ContainsKey($sev)) { continue }
                if ($severityRanks[$sev] -lt $threshold) { continue }
                $findings.Add([pscustomobject]@{
                    Project    = $project.path
                    Framework  = $framework.framework
                    Package    = $pkg.id
                    Version    = $pkg.resolvedVersion
                    Severity   = $sev
                    AdvisoryUrl = $vuln.advisoryurl
                })
            }
        }
    }
}

if ($findings.Count -eq 0) {
    Write-Host "check-vulns.ps1: no advisories at or above '$Severity'."
    exit 0
}

Write-Host "check-vulns.ps1: $($findings.Count) advisory finding(s) at or above '$Severity':"
$findings | Format-Table -AutoSize | Out-String | Write-Host
exit 1
