# Prints Clarivo subscription plan pricing as Revolut sees it (flat vs usage).
# Usage plans often show £0/month recurring until usage is reported.

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.local"

if (-not (Test-Path $envFile)) {
  Write-Error ".env.local not found"
}

$secret = $null
$variationId = $null
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -match '^REVOLUT_MERCHANT_API_SECRET\s*=\s*(.*)$') {
    $secret = $matches[1].Trim().Trim('"').Trim("'")
  }
  if ($line -match '^REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID\s*=\s*(.*)$') {
    $variationId = $matches[1].Trim().Trim('"').Trim("'")
  }
}

if (-not $secret) { Write-Error "REVOLUT_MERCHANT_API_SECRET missing" }
if (-not $variationId) { Write-Error "REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID missing" }

$headers = @{
  Authorization = "Bearer $secret"
  "Revolut-Api-Version" = "2026-04-20"
}

$found = $false
$pageToken = $null
do {
  $uri = "https://merchant.revolut.com/api/subscription-plans?limit=100"
  if ($pageToken) { $uri += "&page_token=$pageToken" }
  $res = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers
  foreach ($plan in $res.subscription_plans) {
    $variation = $plan.variations | Where-Object { $_.id -eq $variationId } | Select-Object -First 1
    if (-not $variation) { continue }
    $item = $variation.phases[0].subscription_items[0]
    $found = $true
    $gbp = [math]::Round($item.amount / 100, 2)
    Write-Host ""
    Write-Host "Plan: $($plan.name) ($($plan.id))" -ForegroundColor Green
    Write-Host "Variation: $($variation.id)"
    Write-Host "Item type: $($item.type)"
    Write-Host "Unit price: GBP $gbp / license / month ($($item.amount) pence)"
    if ($item.type -eq "usage") {
      Write-Host ""
      Write-Host "This is a USAGE (metered) plan." -ForegroundColor Yellow
      Write-Host "Revolut may show flat rate as GBP 0/month; billing is quantity x unit price per cycle."
      Write-Host "For a visible GBP 0.50/month flat rate, recreate without -Metered:"
      Write-Host "  .\scripts\ensure-revolut-subscription-plan.ps1"
    } else {
      Write-Host ""
      Write-Host "This is a FLAT per-seat plan." -ForegroundColor Green
      Write-Host "1 license = GBP $gbp/month; 5 licenses = GBP $([math]::Round($gbp * 5, 2))/month"
    }
    break
  }
  $pageToken = $res.next_page_token
} while (-not $found -and $pageToken)

if (-not $found) {
  Write-Error "Variation $variationId not found. Run ensure-revolut-subscription-plan.ps1 and update .env.local"
}
