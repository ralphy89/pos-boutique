#Requires -Version 5.1
<#
.SYNOPSIS
  Stops POS Boutique processes started with start-local.ps1 -Background.

.PARAMETER ApiPort
  Default 8000; used if PID files are missing.

.PARAMETER UiPort
  Default 5173; used if PID files are missing.
#>
param(
  [int]$ApiPort = 8000,
  [int]$UiPort = 5173
)

$ErrorActionPreference = 'SilentlyContinue'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $RepoRoot 'logs'

function Stop-ByPidFile($Name) {
  $f = Join-Path $LogDir $Name
  if (-not (Test-Path -LiteralPath $f)) { return $false }
  $raw = (Get-Content -LiteralPath $f -Raw).Trim()
  if (-not $raw) { Remove-Item -LiteralPath $f -Force; return $false }
  $id = 0
  if (-not [int]::TryParse($raw, [ref]$id)) { Remove-Item -LiteralPath $f -Force; return $false }
  $p = Get-Process -Id $id -ErrorAction SilentlyContinue
  if ($p) {
    Stop-Process -Id $id -Force
    Write-Host "Stopped process $id ($Name)." -ForegroundColor Green
  }
  Remove-Item -LiteralPath $f -Force
  return $true
}

function Stop-ByLocalPort($Port) {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $owning = $c.OwningProcess
    if ($owning -lt 1) { continue }
    Stop-Process -Id $owning -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped listener on port $Port (PID $owning)." -ForegroundColor Green
  }
}

Write-Host "POS Boutique - stopping background services..." -ForegroundColor Cyan

$null = Stop-ByPidFile 'api.pid'
$null = Stop-ByPidFile 'ui.pid'

Stop-ByLocalPort $ApiPort
Stop-ByLocalPort $UiPort

Write-Host "Done." -ForegroundColor Cyan
