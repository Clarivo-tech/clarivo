# Registers Clarivo production webhook with Revolut Merchant API.
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

$body = @{
  url = $webhookUrl
  events = @(
    "ORDER_COMPLETED",
    "ORDER_AUTHORISED",
    "ORDER_PAYMENT_FAILED",
    "ORDER_PAYMENT_DECLINED"
  )
} | ConvertTo-Json -Compress

$headers = @{
  Authorization = "Bearer $secret"
  "Revolut-Api-Version" = "2024-09-01"
  "Content-Type" = "application/json"
}

Write-Host "Creating Revolut webhook for: $webhookUrl" -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod `
    -Method POST `
    -Uri "https://merchant.revolut.com/api/1.0/webhooks" `
    -Headers $headers `
    -Body $body
}
catch {
  $detail = $_.ErrorDetails.Message
  if ($detail) {
    Write-Error "Revolut API error: $detail"
  }
  throw
}

Write-Host ""
Write-Host "Webhook created successfully." -ForegroundColor Green
Write-Host "Webhook ID: $($response.id)"
Write-Host ""
Write-Host "Add this line to .env.local:" -ForegroundColor Yellow
Write-Host "REVOLUT_WEBHOOK_SIGNING_SECRET=$($response.signing_secret)"
Write-Host ""
Write-Host "Then restart npm run dev (and add the same vars in Vercel)." -ForegroundColor Yellow
