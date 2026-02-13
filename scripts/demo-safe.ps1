param(
  [string]$Timezone = 'UTC',
  [string]$OpenClawHome,
  [switch]$SkipPreflight
)

$ErrorActionPreference = 'Stop'

if ($OpenClawHome) {
  $env:OPENCLAW_HOME = $OpenClawHome
}

if ($SkipPreflight) {
  $env:CLAWPILOT_SKIP_PREFLIGHT = '1'
}

Write-Host '[clawpilot] Running safe demo path (dry-run only)...'
node bin/cli.js install --yes --timezone $Timezone --on-existing update
node bin/cli.js run --command morning --dry-run --timezone $Timezone
Write-Host '[clawpilot] Safe demo completed.'
