# ==============================================================================
# Blockchain-Enabled E-Tendering System - Unified Startup Script
# ==============================================================================
# This script starts all system components with one command:
#   1. Verifies prerequisites (Node.js, npm)
#   2. Installs any missing dependencies for root, server, and client
#   3. Compiles Solidity smart contracts via Hardhat
#   4. Starts local Hardhat blockchain node (Port 8545)
#   5. Deploys & seeds realistic tender datasets (Officer & Bidders)
#   6. Starts mock off-chain file storage server (Port 3001)
#   7. Starts Vite React frontend (Port 5173)
#   8. Launches your default web browser
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting Blockchain-Enabled E-Tendering MVP System...     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$RootDir = $PSScriptRoot
Set-Location $RootDir

# ------------------------------------------------------------------------------
# 1. Check Prerequisites
# ------------------------------------------------------------------------------
Write-Host "`n[1/7] Verifying prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[X] Error: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js v18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[X] Error: NPM is not installed or not in PATH." -ForegroundColor Red
    exit 1
}
$nodeVer = (node -v)
$npmVer = (npm -v)
Write-Host "  [OK] Found Node.js: $nodeVer" -ForegroundColor Green
Write-Host "  [OK] Found NPM:     v$npmVer" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 2. Check and Install Dependencies
# ------------------------------------------------------------------------------
Write-Host "`n[2/7] Checking dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "$RootDir\node_modules")) {
    Write-Host "  -> Installing root dependencies (Hardhat, Ethers)..." -ForegroundColor Gray
    npm install
} else {
    Write-Host "  [OK] Root dependencies installed" -ForegroundColor Green
}

if (-not (Test-Path "$RootDir\server\node_modules")) {
    Write-Host "  -> Installing storage server dependencies..." -ForegroundColor Gray
    npm --prefix server install
} else {
    Write-Host "  [OK] Storage server dependencies installed" -ForegroundColor Green
}

if (-not (Test-Path "$RootDir\client\node_modules")) {
    Write-Host "  -> Installing client frontend dependencies..." -ForegroundColor Gray
    npm --prefix client install
} else {
    Write-Host "  [OK] Frontend dependencies installed" -ForegroundColor Green
}

# Ensure server uploads directory exists
if (-not (Test-Path "$RootDir\server\uploads")) {
    New-Item -ItemType Directory -Path "$RootDir\server\uploads" -Force | Out-Null
}

# ------------------------------------------------------------------------------
# 3. Compile Smart Contracts
# ------------------------------------------------------------------------------
Write-Host "`n[3/7] Compiling Solidity smart contracts..." -ForegroundColor Yellow
npx hardhat compile
Write-Host "  [OK] Smart contracts compiled successfully" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 4. Start Local Hardhat Blockchain Node
# ------------------------------------------------------------------------------
Write-Host "`n[4/7] Checking local Hardhat blockchain node..." -ForegroundColor Yellow
$nodeListening = $false
try {
    $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 8545 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        $nodeListening = $true
        Write-Host "  [OK] Hardhat node is already running on port 8545" -ForegroundColor Green
    }
} catch {
    $nodeListening = $false
}

if (-not $nodeListening) {
    Write-Host "  -> Launching local Hardhat blockchain node in background..." -ForegroundColor Gray
    Start-Process -FilePath "npx.cmd" -ArgumentList "hardhat", "node" -WorkingDirectory $RootDir -WindowStyle Minimized
    
    # Wait for node to be ready (up to 20 seconds)
    $retries = 0
    while (-not $nodeListening -and $retries -lt 20) {
        Start-Sleep -Seconds 1
        $retries++
        try {
            $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 8545 -WarningAction SilentlyContinue
            if ($tcp.TcpTestSucceeded) {
                $nodeListening = $true
            }
        } catch {}
    }

    if (-not $nodeListening) {
        Write-Host "[X] Error: Timed out waiting for Hardhat node on port 8545." -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Hardhat node is online and ready (http://127.0.0.1:8545)" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 5. Deploy & Seed Smart Contracts
# ------------------------------------------------------------------------------
Write-Host "`n[5/7] Deploying ETendering contract and seeding sample data..." -ForegroundColor Yellow
npx hardhat run scripts/seed.js --network localhost
Write-Host "  [OK] Contract deployed and sample tenders seeded successfully" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 6. Start Storage Server (Port 3001)
# ------------------------------------------------------------------------------
Write-Host "`n[6/7] Starting storage server..." -ForegroundColor Yellow
$serverRunning = $false
try {
    $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 3001 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        $serverRunning = $true
        Write-Host "  [OK] Storage server is already running on port 3001" -ForegroundColor Green
    }
} catch {}

if (-not $serverRunning) {
    Write-Host "  -> Launching storage server on http://localhost:3001..." -ForegroundColor Gray
    Start-Process -FilePath "node.exe" -ArgumentList "server/server.js" -WorkingDirectory $RootDir -WindowStyle Minimized
    Start-Sleep -Seconds 1
    Write-Host "  [OK] Storage server running on http://localhost:3001" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 7. Start Frontend Client (Port 5173) & Open Browser
# ------------------------------------------------------------------------------
Write-Host "`n[7/7] Starting Vite React frontend..." -ForegroundColor Yellow
$clientRunning = $false
try {
    $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        $clientRunning = $true
        Write-Host "  [OK] Frontend is already running on port 5173" -ForegroundColor Green
    }
} catch {}

if (-not $clientRunning) {
    Write-Host "  -> Launching Vite frontend on http://localhost:5173..." -ForegroundColor Gray
    Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "$RootDir\client" -WindowStyle Minimized
    Start-Sleep -Seconds 2
}

# Open browser to application
Write-Host "`nOpening browser to http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  System is fully online and ready!                          " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  * Frontend UI:       http://localhost:5173" -ForegroundColor Cyan
Write-Host "  * Storage Server:    http://localhost:3001" -ForegroundColor Cyan
Write-Host "  * Blockchain RPC:    http://127.0.0.1:8545 (Chain ID: 31337)" -ForegroundColor Cyan
Write-Host "  * Built-in Switcher: Test Officer & Bidders with 1-click in navbar" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Green
