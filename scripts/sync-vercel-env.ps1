#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
# sync-vercel-env.ps1  –  Wipe ALL Vercel env vars and re-push from .env
# ─────────────────────────────────────────────────────────────────────────────
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectDir = Split-Path $PSScriptRoot -Parent
Push-Location $projectDir

# ── Step 1: Remove every existing env var ────────────────────────────────────
Write-Host "`n>>> STEP 1: Removing ALL existing Vercel env vars …" -ForegroundColor Yellow

$envList = vercel env ls 2>&1 | Out-String
# Parse env var names (lines that start with whitespace then a var name)
$existing = @()
foreach ($line in ($envList -split "`n")) {
    if ($line -match '^\s+([A-Z_][A-Z0-9_]+)\s+Encrypted\s+(Production|Preview|Development|Production, Preview, Development|Production, Preview|Production, Development|Preview, Development)') {
        $varName = $Matches[1]
        $envStr  = $Matches[2]
        # Map environment names to vercel flags
        foreach ($e in ($envStr -split ',\s*')) {
            $flag = switch ($e.Trim()) {
                'Production'  { 'production' }
                'Preview'     { 'preview' }
                'Development' { 'development' }
            }
            if ($flag) {
                $existing += @{ Name = $varName; Env = $flag }
            }
        }
    }
}

Write-Host "  Found $($existing.Count) env-var entries to remove." -ForegroundColor Cyan

foreach ($entry in $existing) {
    Write-Host "  Removing $($entry.Name) [$($entry.Env)] …" -ForegroundColor DarkGray
    echo "y" | vercel env rm $entry.Name $entry.Env 2>&1 | Out-Null
}

Write-Host "  Done removing." -ForegroundColor Green

# ── Step 2: Re-add from .env ─────────────────────────────────────────────────
Write-Host "`n>>> STEP 2: Pushing env vars to Vercel (production + preview + development) …" -ForegroundColor Yellow

# Read .env, skip blanks & comments
$envFile = Get-Content (Join-Path $projectDir '.env') |
    Where-Object { $_ -match '^[A-Z_]' } |
    ForEach-Object {
        $parts = $_ -split '=', 2
        @{ Key = $parts[0].Trim(); Value = $parts[1].Trim() }
    }

# Production overrides
$prodOverrides = @{
    'APP_URL'         = 'https://bank-deal.vercel.app'
    'VITE_SITE_URL'   = 'https://bank-deal.vercel.app'
    'CORS_ALLOWED_ORIGINS' = 'https://bank-deal.vercel.app'
    'NODE_ENV'        = 'production'
    'VITE_ALLOW_DIALER_SIMULATION' = 'false'
}

$count = 0
foreach ($kv in $envFile) {
    $key = $kv.Key
    $val = $kv.Value

    # Skip empty values for optional vars (rate limits with defaults are fine to skip)
    # But always push core vars even if empty
    $coreVars = @(
        'SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY',
        'VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY',
        'STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET',
        'ANTHROPIC_API_KEY','SENDGRID_API_KEY'
    )

    if ([string]::IsNullOrWhiteSpace($val) -and $key -notin $coreVars) {
        continue
    }

    # Apply production overrides
    $prodVal = if ($prodOverrides.ContainsKey($key)) { $prodOverrides[$key] } else { $val }

    # Push to all three environments
    foreach ($env in @('production', 'preview', 'development')) {
        $pushVal = if ($env -eq 'production') { $prodVal } else { $val }
        Write-Host "  $key → $env" -ForegroundColor DarkGray
        $pushVal | vercel env add $key $env 2>&1 | Out-Null
    }
    $count++
}

Write-Host "`n>>> Done! Pushed $count env vars to all environments." -ForegroundColor Green
Write-Host ">>> Run 'vercel --prod' to redeploy with the new env vars.`n" -ForegroundColor Cyan

Pop-Location
