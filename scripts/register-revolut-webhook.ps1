# Registers or updates Clarivo webhook with Revolut Merchant API.
# Reads REVOLUT_MERCHANT_API_SECRET from .env.local in the project root.

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
    if ($value) {
      $secret = $value
    }
  }
}

if (-not $secret) {
  Write-Host ""
  Write-Host "Could not read REVOLUT_MERCHANT_API_SECRET from .env.local" -ForegroundColor Red
  Write-Host "Add this exact line (no spaces around =), then save the file:" -ForegroundColor Yellow
  Write-Host "REVOLUT_MERCHANT_API_SECRET=sk_live_your_key_here"
  Write-Host ""
  exit 1
}

$webhookUrl = "https://clarivo-tech.com/api/webhooks/revolut"
if ($env:NEXT_PUBLIC_APP_URL) {
  $base = $env:NEXT_PUBLIC_APP_URL.TrimEnd("/")
  $webhookUrl = "$base/api/webhooks/revolut"
}

$events = @(
  "ORDER_COMPLETED",
  "ORDER_AUTHORISED",
  "ORDER_PAYMENT_FAILED",
  "ORDER_PAYMENT_DECLINED",
  "SUBSCRIPTION_INITIATED",
  "SUBSCRIPTION_OVERDUE",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_FINISHED"
)

$headers = @{
  Authorization = "Bearer $secret"
  "Revolut-Api-Version" = "2024-09-01"
  "Content-Type" = "application/json"
}

Write-Host "Configuring Revolut webhook for: $webhookUrl" -ForegroundColor Cyan

$list = Invoke-RestMethod `
  -Method GET `
  -Uri "https://merchant.revolut.com/api/1.0/webhooks" `
  -Headers $headers

$existing = $list | Where-Object { $_.url -eq $webhookUrl } | Select-Object -First 1

$body = @{
  url = $webhookUrl
  events = $events
} | ConvertTo-Json -Compress

try {
  if ($existing) {
    Write-Host "Updating existing webhook ($($existing.id))..." -ForegroundColor Cyan
    $response = Invoke-RestMethod `
      -Method PATCH `
      -Uri "https://merchant.revolut.com/api/webhooks/$($existing.id)" `
      -Headers $headers `
      -Body $body
  }
  else {
    Write-Host "Creating new webhook..." -ForegroundColor Cyan
    $response = Invoke-RestMethod `
      -Method POST `
      -Uri "https://merchant.revolut.com/api/1.0/webhooks" `
      -Headers $headers `
      -Body $body
  }
}
catch {
  $detail = $_.ErrorDetails.Message
  if ($detail) {
    Write-Error "Revolut API error: $detail"
  }
  throw
}

Write-Host ""
Write-Host "Webhook configured successfully." -ForegroundColor Green
Write-Host "Webhook ID: $($response.id)"
Write-Host "Events: $($response.events -join ', ')"
Write-Host ""

$currentSigning = $null
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  if ($_ -match '^REVOLUT_WEBHOOK_SIGNING_SECRET\s*=\s*(.*)$') {
    $currentSigning = $matches[1].Trim().Trim('"').Trim("'")
  }
}

if ($response.signing_secret -and $response.signing_secret -ne $currentSigning) {
  Write-Host "Update .env.local with the new signing secret:" -ForegroundColor Yellow
  Write-Host "REVOLUT_WEBHOOK_SIGNING_SECRET=$($response.signing_secret)"
  Write-Host ""
  Write-Host "Also update this value in Vercel, then redeploy." -ForegroundColor Yellow
}
else {
  Write-Host "Your existing REVOLUT_WEBHOOK_SIGNING_SECRET is still valid — no change needed." -ForegroundColor Green
}
