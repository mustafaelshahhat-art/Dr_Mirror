<#
.SYNOPSIS
    Smoke test for check-vulns.ps1. Feeds two fixtures and asserts the
    expected exit codes. Invoked from CI but not from `dotnet test`.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$checkVulns = Join-Path $scriptRoot 'check-vulns.ps1'
$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("check-vulns-tests-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

function Write-Json {
    param([string]$Path, [object]$Object)
    $json = $Object | ConvertTo-Json -Depth 8
    Set-Content -LiteralPath $Path -Value $json -Encoding utf8
}

$cleanFixture = @{
    projects = @(@{
        path = 'demo.csproj'
        frameworks = @(@{
            framework = 'net10.0'
            topLevelPackages = @()
            transitivePackages = @()
        })
    })
}
$cleanPath = Join-Path $tmpDir 'clean.json'
Write-Json -Path $cleanPath -Object $cleanFixture

$highFixture = @{
    projects = @(@{
        path = 'demo.csproj'
        frameworks = @(@{
            framework = 'net10.0'
            topLevelPackages = @(@{
                id = 'Some.Package'
                resolvedVersion = '1.2.3'
                vulnerabilities = @(@{
                    severity = 'High'
                    advisoryurl = 'https://example/advisory'
                })
            })
            transitivePackages = @()
        })
    })
}
$highPath = Join-Path $tmpDir 'high.json'
Write-Json -Path $highPath -Object $highFixture

$failures = 0
function Assert-ExitCode {
    param([int]$Expected, [int]$Actual, [string]$Case)
    if ($Expected -eq $Actual) {
        Write-Host "PASS: $Case (exit=$Actual)"
    } else {
        Write-Host "FAIL: $Case — expected exit=$Expected, got exit=$Actual"
        $script:failures++
    }
}

# Clean fixture — exits 0.
& pwsh -NoProfile -File $checkVulns -InputPath $cleanPath -Severity high *> $null
Assert-ExitCode -Expected 0 -Actual $LASTEXITCODE -Case 'clean fixture exits 0'

# High fixture — exits non-zero (1).
& pwsh -NoProfile -File $checkVulns -InputPath $highPath -Severity high *> $null
Assert-ExitCode -Expected 1 -Actual $LASTEXITCODE -Case 'high fixture exits 1'

# High fixture with Severity=critical — exits 0 because nothing crosses the threshold.
& pwsh -NoProfile -File $checkVulns -InputPath $highPath -Severity critical *> $null
Assert-ExitCode -Expected 0 -Actual $LASTEXITCODE -Case 'high fixture below critical threshold exits 0'

Remove-Item -Recurse -Force $tmpDir | Out-Null

if ($failures -gt 0) {
    Write-Host "check-vulns.Tests.ps1: $failures failure(s)."
    exit 1
}
Write-Host "check-vulns.Tests.ps1: all cases passed."
exit 0
