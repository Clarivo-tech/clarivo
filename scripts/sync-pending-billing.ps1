# Fulfils the latest pending billing_payments row (e.g. after add-license checkout).
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.local"

Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -match '^\s*#' -or $line -eq "") { return }
  if ($line -match '^([^=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

Set-Location $projectRoot
npx tsx scripts/sync-pending-billing.ts
