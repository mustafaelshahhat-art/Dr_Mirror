<#
.SYNOPSIS
  CI guard — enumerates every endpoint mapped in *Endpoints.cs / *Endpoint.cs
  and asserts at least one matching integration test by WithName or URL pattern.

  Designed for workflow_dispatch only: the check is opt-in and does not block
  ordinary PR CI.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File backend/tests/check-endpoint-coverage.ps1
#>

$SourceDir  = Resolve-Path "$PSScriptRoot/../src/DrMirror.Api"
$TestDir    = Resolve-Path "$PSScriptRoot/../tests/DrMirror.Tests"

Write-Host "--- Endpoint test-coverage guard (workflow_dispatch only) ---" -ForegroundColor Cyan
Write-Host "Source : $SourceDir"
Write-Host "Tests  : $TestDir"
Write-Host ""

function Join-Route {
    param([string]$Prefix, [string]$Suffix)
    $a = $Prefix.TrimEnd('/')
    $b = $Suffix.TrimStart('/')
    if ($a -eq "") { return "/$b" }
    return "$a/$b"
}

function Route-ToSearchPattern {
    <#
    .SYNOPSIS
      Convert a URL route like /api/orders/{orderNumber} into a regex
      that can match occurrences in test source code.
    #>
    param([string]$Route)
    $route = $Route.TrimEnd('/')
    if ([string]::IsNullOrEmpty($route)) { return "" }

    # Split into literal segments and count parameters
    $parts      = $route -split '\{[^}]+\}'
    $paramCount = ([regex]::Matches($route, '\{[^}]+\}')).Count

    $regexParts = @()
    for ($i = 0; $i -lt $parts.Count; $i++) {
        if ($parts[$i] -ne '') {
            $regexParts += [regex]::Escape($parts[$i])
        }
        # Place a wildcard between each literal segment, up to the param count
        if ($i -lt $paramCount) {
            $regexParts += '[^/"]+'
        }
    }

    if ($regexParts.Count -eq 0) { return "" }
    return ($regexParts -join '')
}

# ------------------------------------------------------------------------
# Step 1 — collect all .cs files
# ------------------------------------------------------------------------
$files = @(Get-ChildItem -LiteralPath $SourceDir -Filter "Program.cs")
$files += @(Get-ChildItem -LiteralPath "$SourceDir/Features" -Filter "*Endpoint*.cs" -Recurse)

# Identify which files are "extension definitions"
$isExtDef = @{}
foreach ($f in $files) {
    $content = Get-Content -LiteralPath $f.FullName -Raw
    if ($content -match 'static\s+RouteGroupBuilder\s+Map\w+\(this\s+RouteGroupBuilder') {
        $isExtDef[$f.FullName] = $true
    }
}

$orchestrators = $files | Where-Object { -not $isExtDef.ContainsKey($_.FullName) }

# ------------------------------------------------------------------------
# Step 2 — build extension method body map
# ------------------------------------------------------------------------
$extMethods = @{}
foreach ($f in $files) {
    $content = Get-Content -LiteralPath $f.FullName -Raw
    $lines   = $content -split "`r?`n"

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'static\s+RouteGroupBuilder\s+(Map\w+)\(this\s+RouteGroupBuilder') {
            $methodName = $matches[1]
            $body = @()
            $depth = 0
            $started = $false
            for ($j = $i; $j -lt $lines.Count; $j++) {
                $l = $lines[$j]
                if ($l -match '\{') { $depth++; $started = $true }
                if ($l -match '\}') { $depth-- }
                if ($started -and $depth -eq 0) { break }
                if ($started) { $body += $l }
            }
            $extMethods[$methodName] = @{ File = $f.FullName; Body = $body }
        }
    }
}

# ------------------------------------------------------------------------
# Step 3 — scan orchestrator files for endpoint registrations
# ------------------------------------------------------------------------
$endpoints = @{}

foreach ($f in $orchestrators) {
    $content = Get-Content -LiteralPath $f.FullName -Raw
    $lines   = $content -split "`r?`n"

    $groupPath = @{}
    $groupPath["app"] = ""

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]

        # Track MapGroup variable assignments
        if ($line -match '(?:var\s+)?(\w+)\s*=\s*(\w+)\.MapGroup\("([^"]+)"\)') {
            $varName     = $matches[1]
            $parentVar   = $matches[2]
            $prefix      = $matches[3]
            $parentPrefix = if ($groupPath.ContainsKey($parentVar)) { $groupPath[$parentVar] } else { "" }
            $groupPath[$varName] = Join-Route $parentPrefix $prefix
        }

        # A: Direct route verb registrations
        if ($line -match '(\w+)\.Map(Get|Post|Put|Delete|Patch)\("([^"]*)"') {
            $groupVar     = $matches[1]
            $httpMethod   = $matches[2]
            $routePattern = $matches[3]
            $prefix = if ($groupPath.ContainsKey($groupVar)) { $groupPath[$groupVar] } else { "" }
            $fullPath = Join-Route $prefix $routePattern

            $withName = $null
            for ($j = 1; $j -le 6 -and ($i + $j) -lt $lines.Count; $j++) {
                if ($lines[$i + $j] -match '\.WithName\("([^"]+)"\)') {
                    $withName = $matches[1]; break
                }
            }

            $dedupKey = if ($withName) { $withName } else { "$httpMethod|$fullPath" }
            if (-not $endpoints.ContainsKey($dedupKey)) {
                $endpoints[$dedupKey] = @{
                    File     = $f.FullName
                    Method   = $httpMethod
                    Route    = $fullPath
                    WithName = $withName
                }
            }
            continue
        }

        # B: MapHealthChecks
        if ($line -match '(\w+)\.MapHealthChecks\("([^"]+)"') {
            $groupVar     = $matches[1]
            $routePattern = $matches[2]
            $prefix = if ($groupPath.ContainsKey($groupVar)) { $groupPath[$groupVar] } else { "" }
            $fullPath = Join-Route $prefix $routePattern

            $withName = $null
            for ($j = 1; $j -le 6 -and ($i + $j) -lt $lines.Count; $j++) {
                if ($lines[$i + $j] -match '\.WithName\("([^"]+)"\)') {
                    $withName = $matches[1]; break
                }
            }

            $dedupKey = if ($withName) { $withName } else { "Health|$fullPath" }
            if (-not $endpoints.ContainsKey($dedupKey)) {
                $endpoints[$dedupKey] = @{
                    File     = $f.FullName
                    Method   = "Health"
                    Route    = $fullPath
                    WithName = $withName
                }
            }
            continue
        }

        # C: Extension method calls: groupVar.MapXxx()
        if ($line -match '(\w+)\.(Map[A-Z]\w+)\(\)') {
            $callerVar  = $matches[1]
            $methodName = $matches[2]
            if (-not $extMethods.ContainsKey($methodName)) { continue }

            $callerPrefix = if ($groupPath.ContainsKey($callerVar)) { $groupPath[$callerVar] } else { "" }

            foreach ($bl in $extMethods[$methodName].Body) {
                if ($bl -match 'group\.Map(Get|Post|Put|Delete|Patch)\("([^"]*)"') {
                    $httpMethod   = $matches[1]
                    $routePattern = $matches[2]
                    $fullPath     = Join-Route $callerPrefix $routePattern

                    $withName = $null
                    $idx = [Math]::Max(0, $extMethods[$methodName].Body.IndexOf($bl))
                    for ($k = $idx; $k -lt $extMethods[$methodName].Body.Count -and $k -lt $idx + 8; $k++) {
                        if ($extMethods[$methodName].Body[$k] -match '\.WithName\("([^"]+)"\)') {
                            $withName = $matches[1]; break
                        }
                    }

                    $dedupKey = if ($withName) { $withName } else { "$httpMethod|$fullPath" }
                    if (-not $endpoints.ContainsKey($dedupKey)) {
                        $endpoints[$dedupKey] = @{
                            File     = $extMethods[$methodName].File
                            Method   = $httpMethod
                            Route    = $fullPath
                            WithName = $withName
                        }
                    }
                }
            }
        }
    }
}

# Also scan Program.cs for root-level MapGet/MapPost that don't use a tracked
# group variable. These were already captured above via groupPath["app"] = "".

$allEndpoints = $endpoints.Values
Write-Host "Discovered $($allEndpoints.Count) unique endpoints." -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------
# Step 4 — collect test files
# ------------------------------------------------------------------------
$testFiles = @(Get-ChildItem -LiteralPath $TestDir -Filter "*.cs" -Recurse)

# ------------------------------------------------------------------------
# Step 5 — check coverage
# ------------------------------------------------------------------------
$covered  = 0
$notfound = @()

foreach ($ep in $allEndpoints) {
    $wn    = $ep["WithName"]
    $route = $ep["Route"]

    $found = $false

    foreach ($tf in $testFiles) {
        $content = Get-Content -LiteralPath $tf.FullName -Raw

        # 1 — Match by WithName literal
        if ($wn -and $content -match [regex]::Escape($wn)) {
            $found = $true; break
        }

        # 2 — Match by URL route
        if ($route -and -not $found) {
            $searchPat = Route-ToSearchPattern $route
            if ($searchPat -ne "" -and $content -match $searchPat) {
                $found = $true; break
            }
        }
    }

    if ($found) {
        $covered++
    } else {
        $routeInfo = if ($route) { $route } else { "(no route)" }
        $wnInfo    = if ($wn)    { $wn }    else { "(unnamed)" }
        $relFile   = $ep["File"] -replace [regex]::Escape($SourceDir), '...src'

        $notfound += $ep
        Write-Host "  MISSING  $wnInfo  ($routeInfo)  <- $relFile" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "--- Summary ---" -ForegroundColor Cyan
Write-Host "  Total endpoints : $($allEndpoints.Count)"
Write-Host "  Covered         : $covered"
Write-Host "  Missing         : $($notfound.Count)"

if ($notfound.Count -gt 0) {
    Write-Host ""
    Write-Host "FAIL - $($notfound.Count) endpoint(s) without matching test." -ForegroundColor Red
    Write-Host "  (This CI guard runs on workflow_dispatch only.)"
    exit 1
} else {
    Write-Host ""
    Write-Host "PASS - every endpoint has at least one matching test." -ForegroundColor Green
    exit 0
}
