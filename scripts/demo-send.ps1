param(
  [Parameter(Mandatory = $true)]
  [string]$Channel,
  [string]$Timezone = 'UTC',
  [string]$OpenClawHome,
  [switch]$SkipPreflight,
  [switch]$Confirm
)

$ErrorActionPreference = 'Stop'

if (-not $Confirm) {
  throw 'Pass -Confirm to enable real send.'
}

if ($OpenClawHome) {
  $env:OPENCLAW_HOME = $OpenClawHome
}

if ($SkipPreflight) {
  $env:CLAWPILOT_SKIP_PREFLIGHT = '1'
}

Write-Host "[clawpilot] Running send demo path to $Channel ..."
node bin/cli.js install --yes --timezone $Timezone --channel $Channel --on-existing update
node bin/cli.js run --command morning --timezone $Timezone --channel $Channel
Write-Host '[clawpilot] Send demo completed.'
