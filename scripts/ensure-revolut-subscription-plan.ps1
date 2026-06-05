# Creates Clarivo Pro monthly subscription plan in Revolut and prints env vars.
# Reads REVOLUT_MERCHANT_API_SECRET from .env.local
#
# Usage:
#   .\scripts\ensure-revolut-subscription-plan.ps1          # flat per-seat plan
#   .\scripts\ensure-revolut-subscription-plan.ps1 -Metered # usage-based (recommended)

param(
  [switch]$Metered
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.local"

if (-not (Test-Path $envFile)) {
  Write-Error ".env.local not found at: $envFile"
}

$secret = $null
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -match '^\s*#' -or $line -eq "") { return }
  if ($line -match '^REVOLUT_MERCHANT_API_SECRET\s*=\s*(.*)$') {
    $value = $matches[1].Trim().Trim('"').Trim("'")
    if ($value) { $secret = $value }
  }
}

if (-not $secret) {
  Write-Error "REVOLUT_MERCHANT_API_SECRET not found in .env.local"
}

$priceLine = Get-Content $envFile -Encoding UTF8 | Where-Object {
  $_ -match '^PRICE_PER_LICENSE_GBP\s*='
}
$unitPence = 50
if ($priceLine -match '=\s*([0-9.]+)') {
  $gbp = [double]$matches[1]
  $unitPence = [int][Math]::Round($gbp * 100)
}

$apiVersion = "2026-04-20"
$headers = @{
  Authorization = "Bearer $secret"
  "Revolut-Api-Version" = $apiVersion
  "Content-Type" = "application/json"
}

if ($Metered) {
  $body = @{
    name = "Clarivo Pro"
    variations = @(
      @{
        phases = @(
          @{
            ordinal = 1
            cycle_duration = "P1M"
            subscription_items = @(
              @{
                name = "Clarivo Pro license"
                type = "usage"
                unit = "license"
                code = "clarivo_license"
                amount = $unitPence
                currency = "GBP"
                usage_aggregation_method = "latest"
              }
            )
          }
        )
      }
    )
  } | ConvertTo-Json -Depth 10 -Compress

  Write-Host "Creating Revolut metered subscription plan (GBP $unitPence pence per license / month)..." -ForegroundColor Cyan
}
else {
  $body = @{
    name = "Clarivo Pro"
    variations = @(
      @{
        phases = @(
          @{
            ordinal = 1
            cycle_duration = "P1M"
            subscription_items = @(
              @{
                name = "Clarivo Pro license"
                type = "flat"
                unit = "license"
                quantity = 1
                amount = $unitPence
                currency = "GBP"
              }
            )
          }
        )
      }
    )
  } | ConvertTo-Json -Depth 10 -Compress

  Write-Host "Creating Revolut flat subscription plan (GBP $unitPence pence per license / month)..." -ForegroundColor Cyan
}

try {
  $plan = Invoke-RestMethod `
    -Method POST `
    -Uri "https://merchant.revolut.com/api/subscription-plans" `
    -Headers $headers `
    -Body $body
}
catch {
  $detail = $_.ErrorDetails.Message
  if ($detail) { Write-Error "Revolut API error: $detail" }
  throw
}

$variationId = $plan.variations[0].id
$item = $plan.variations[0].phases[0].subscription_items[0]

Write-Host ""
Write-Host "Subscription plan created." -ForegroundColor Green
Write-Host "Plan ID: $($plan.id)"
Write-Host ""
Write-Host "Add these lines to .env.local (and Vercel):" -ForegroundColor Yellow
Write-Host "REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID=$variationId"
if ($Metered) {
  Write-Host "REVOLUT_SUBSCRIPTION_USAGE_ITEM_CODE=$($item.code)"
  Write-Host "# Remove REVOLUT_SUBSCRIPTION_LICENSE_ITEM_ID when using metered billing"
}
else {
  Write-Host "REVOLUT_SUBSCRIPTION_LICENSE_ITEM_ID=$($item.id)"
  Write-Host "# Remove REVOLUT_SUBSCRIPTION_USAGE_ITEM_CODE when using flat billing"
}
Write-Host "REVOLUT_SUBSCRIPTIONS_API_VERSION=$apiVersion"
Write-Host ""
Write-Host "Re-run scripts/register-revolut-webhook.ps1 to add subscription webhook events." -ForegroundColor Yellow
Write-Host ""
Write-Host "Go-live: set PRICE_PER_LICENSE_GBP=99.99 in Vercel, re-run this script for a new plan, update plan env IDs." -ForegroundColor Yellow
