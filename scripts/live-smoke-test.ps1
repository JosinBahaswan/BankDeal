param(
  [string]$BaseUrl = "https://dealbank.vercel.app"
)

function Read-EnvValue([string]$key) {
  $line = Get-Content ".env" | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { return "" }
  return ($line -split "=",2)[1].Trim()
}

function Invoke-Smoke {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    $Body
  )

  $status = -1
  $snippet = ""
  try {
    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 10
      $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -Body $json -ContentType "application/json" -UseBasicParsing
    } else {
      $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -UseBasicParsing
    }
    $status = [int]$resp.StatusCode
    $snippet = [string]$resp.Content
  } catch {
    $r = $_.Exception.Response
    if ($r) {
      $status = [int]$r.StatusCode.value__
      try {
        $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
        $snippet = $reader.ReadToEnd()
        $reader.Close()
      } catch {
        $snippet = $_.Exception.Message
      }
    } else {
      $snippet = $_.Exception.Message
    }
  }

  $snippet = ($snippet -replace "`r|`n", " ")
  if ($snippet.Length -gt 180) { $snippet = $snippet.Substring(0, 180) }
  Write-Output ("{0} => {1} | {2}" -f $Name, $status, $snippet)
}

Write-Output "=== PUBLIC / BASIC ==="
Invoke-Smoke -Name "Landing" -Method "GET" -Url "$BaseUrl/" -Headers @{} -Body $null
Invoke-Smoke -Name "TermsQuery" -Method "GET" -Url "$BaseUrl/?screen=terms" -Headers @{} -Body $null
Invoke-Smoke -Name "PrivacyQuery" -Method "GET" -Url "$BaseUrl/?screen=privacy" -Headers @{} -Body $null
Invoke-Smoke -Name "LeadListings_GET_NoAuth" -Method "GET" -Url "$BaseUrl/api/lead-listings" -Headers @{} -Body $null

Write-Output "=== API METHOD / AUTH GUARD ==="
Invoke-Smoke -Name "CreateCheckout_GET" -Method "GET" -Url "$BaseUrl/api/create-checkout" -Headers @{} -Body $null
Invoke-Smoke -Name "CreateCheckout_POST_Empty" -Method "POST" -Url "$BaseUrl/api/create-checkout" -Headers @{} -Body @{}
Invoke-Smoke -Name "ConfirmCheckout_GET" -Method "GET" -Url "$BaseUrl/api/confirm-checkout" -Headers @{} -Body $null
Invoke-Smoke -Name "ConfirmCheckout_POST_Empty" -Method "POST" -Url "$BaseUrl/api/confirm-checkout" -Headers @{} -Body @{}
Invoke-Smoke -Name "ConnectAccount_GET_NoAuth" -Method "GET" -Url "$BaseUrl/api/stripe-connect-account-link" -Headers @{} -Body $null
Invoke-Smoke -Name "EscrowCreate_POST_NoAuth" -Method "POST" -Url "$BaseUrl/api/stripe-escrow-create" -Headers @{} -Body @{}
Invoke-Smoke -Name "EscrowRelease_POST_NoAuth" -Method "POST" -Url "$BaseUrl/api/stripe-escrow-release" -Headers @{} -Body @{}
Invoke-Smoke -Name "TwilioToken_GET_NoAuth" -Method "GET" -Url "$BaseUrl/api/twilio-access-token" -Headers @{} -Body $null
Invoke-Smoke -Name "ConnectWebhook_POST_NoSig" -Method "POST" -Url "$BaseUrl/api/stripe-connect-webhook" -Headers @{} -Body @{}
Invoke-Smoke -Name "BillingWebhook_POST_NoSig" -Method "POST" -Url "$BaseUrl/api/stripe-webhook" -Headers @{} -Body @{}

Write-Output "=== AUTHENTICATED CHECKS ==="
$supabaseUrl = Read-EnvValue "VITE_SUPABASE_URL"
$anonKey = Read-EnvValue "VITE_SUPABASE_ANON_KEY"

$seedAccounts = @(
  @{ email = "aria@dealbank.local"; password = "DealBank2025!" },
  @{ email = "admin@dealbank.local"; password = "DealBank2025!" },
  @{ email = "admin@dealbank.io"; password = "DealBank2025!" }
)

$authData = $null
foreach ($acct in $seedAccounts) {
  try {
    $authResp = Invoke-RestMethod -Method POST -Uri "$supabaseUrl/auth/v1/token?grant_type=password" -Headers @{ "apikey" = $anonKey; "Content-Type" = "application/json" } -Body (@{ email = $acct.email; password = $acct.password } | ConvertTo-Json)
    if ($authResp.access_token) {
      $authData = @{ token = [string]$authResp.access_token; userId = [string]$authResp.user.id; email = [string]$acct.email }
      Write-Output ("SeedLogin => 200 | logged in as {0}" -f $acct.email)
      break
    }
  } catch {
    continue
  }
}

if ($null -eq $authData) {
  Write-Output "SeedLogin => FAIL | unable to authenticate seeded users on this Supabase project"
} else {
  $authHeaders = @{ "Authorization" = ("Bearer {0}" -f $authData.token) }

  Invoke-Smoke -Name "CreateCheckout_POST_Auth" -Method "POST" -Url "$BaseUrl/api/create-checkout" -Headers $authHeaders -Body @{
    userId = $authData.userId
    email = $authData.email
    mode = "subscription"
    priceId = "price_1TN3ee0WZ7DKKyr2cqPe3nxi"
    source = "dealmaker_gate"
    context = @{ successPath = "/" }
  }

  Invoke-Smoke -Name "ConfirmCheckout_POST_FakeSession_Auth" -Method "POST" -Url "$BaseUrl/api/confirm-checkout" -Headers $authHeaders -Body @{
    sessionId = "cs_test_fake_session"
    userId = $authData.userId
  }

  Invoke-Smoke -Name "ConnectAccount_POST_Auth" -Method "POST" -Url "$BaseUrl/api/stripe-connect-account-link" -Headers $authHeaders -Body @{
    returnPath = "/?connect=return"
    refreshPath = "/?connect=refresh"
    country = "US"
    accountType = "express"
  }

  Invoke-Smoke -Name "TwilioToken_GET_Auth" -Method "GET" -Url "$BaseUrl/api/twilio-access-token" -Headers $authHeaders -Body $null

  Invoke-Smoke -Name "EscrowCreate_POST_Auth_DummyBeneficiary" -Method "POST" -Url "$BaseUrl/api/stripe-escrow-create" -Headers $authHeaders -Body @{
    beneficiaryUserId = "11111111-1111-4111-8111-111111111111"
    amount = 10
    currency = "usd"
    platformFeeRate = 1.5
    title = "Smoke Test Escrow"
    memo = "Dummy beneficiary should fail safely"
  }

  Invoke-Smoke -Name "EscrowRelease_POST_Auth_DummyEscrow" -Method "POST" -Url "$BaseUrl/api/stripe-escrow-release" -Headers $authHeaders -Body @{
    escrowId = "11111111-1111-4111-8111-111111111111"
    releaseNotes = "Smoke test"
    closeReference = "SMOKE-TEST"
  }
}
