#Requires -Version 5.1
<#
.SYNOPSIS
  Installs (first run) and starts POS Boutique: FastAPI + Vite UI.

.PARAMETER InstallOnly
  Only install dependencies and .env files; do not start servers.

.PARAMETER Lan
  Bind API to 0.0.0.0 and run Vite with --host (other PCs on LAN).

.PARAMETER SkipRuntimeInstall
  Do not try winget to install Python or Node; fail if they are missing.

.PARAMETER ApiPort
  Port for the FastAPI server (default 8090).

.PARAMETER UiPort
  Port for the Vite dev server (default 8089).

.PARAMETER Background
  Run API and UI without console windows. Logs: logs/api.*.log and logs/ui.*.log ; PIDs: logs/api.pid, logs/ui.pid.
  Stop with: .\scripts\stop-local.ps1 (or stop-local.bat).

.EXAMPLE
  .\scripts\start-local.ps1
.EXAMPLE
  .\scripts\start-local.ps1 -InstallOnly
.EXAMPLE
  .\scripts\start-local.ps1 -Lan
.EXAMPLE
  .\scripts\start-local.ps1 -ApiPort 8843 -UiPort 9321
.EXAMPLE
  .\scripts\start-local.ps1 -Background
#>
param(
  [switch]$InstallOnly,
  [switch]$Lan,
  [switch]$SkipRuntimeInstall,
  [switch]$Background,
  [ValidateRange(1, 65535)]
  [int]$ApiPort = 8090,
  [ValidateRange(1, 65535)]
  [int]$UiPort = 8089
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $RepoRoot 'backend'
$Frontend = Join-Path $RepoRoot 'frontend'

# Resolved after Ensure-* (full path to python.exe preferred)
$script:PythonExe = $null
$script:NpmExe = $null

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-SessionPath {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

function Test-WingetAvailable {
  return [bool](Get-Command winget -ErrorAction SilentlyContinue)
}

function Invoke-WingetInstall {
  param(
    [Parameter(Mandatory)][string]$PackageId,
    [Parameter(Mandatory)][string]$DisplayName
  )
  if (-not (Test-WingetAvailable)) {
    return $false
  }
  Write-Host "Installing $DisplayName via winget (UAC may appear)..." -ForegroundColor Yellow
  $wingetArgs = @(
    'install', '-e', '--id', $PackageId,
    '--accept-package-agreements', '--accept-source-agreements',
    '--disable-interactivity'
  )
  $p = Start-Process -FilePath 'winget' -ArgumentList $wingetArgs -Wait -PassThru -NoNewWindow
  $code = $p.ExitCode
  # 0 = OK; common "no applicable update" / already-present codes vary by winget version
  if ($code -ne 0) {
    Write-Host "winget reported exit code $code (checking if $DisplayName is already usable)..." -ForegroundColor DarkYellow
  }
  return $true
}

function Test-PythonInterpreter {
  param([string]$Candidate)
  if (-not $Candidate) { return $false }
  if (-not (Test-Path -LiteralPath $Candidate)) { return $false }
  try {
    $ver = & $Candidate --version 2>&1
    return ($LASTEXITCODE -eq 0 -and "$ver" -match 'Python (\d+)\.(\d+)')
  } catch {
    return $false
 }
}

function Find-PythonInCommonPaths {
  $pf86 = ${env:ProgramFiles(x86)}
  $roots = @(
    "$env:LOCALAPPDATA\Programs\Python",
    "${env:ProgramFiles}\Python312",
    "${env:ProgramFiles}\Python313",
    "${env:ProgramFiles}\Python311",
    "$pf86\Python312-32"
  )
  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $candidates = @(
      (Join-Path $root 'python.exe'),
      (Join-Path $root 'Python312\python.exe'),
      (Join-Path $root 'Python313\python.exe'),
      (Join-Path $root 'Python311\python.exe')
    )
    foreach ($exe in $candidates) {
      if (Test-PythonInterpreter $exe) { return $exe }
    }
    $found = Get-ChildItem -Path $root -Filter 'python.exe' -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '\\WindowsApps\\' } |
      Select-Object -First 1
    if ($found -and (Test-PythonInterpreter $found.FullName)) { return $found.FullName }
  }
  return $null
}

function Resolve-PythonExecutable {
  Refresh-SessionPath

  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -notmatch 'WindowsApps') {
    if (Test-PythonInterpreter $cmd.Source) { return $cmd.Source }
  }

  $fromDisk = Find-PythonInCommonPaths
  if ($fromDisk) { return $fromDisk }

  if (Test-Command 'py') {
    try {
      $resolved = & py -3 -c "import sys; print(sys.executable)" 2>$null
      if ($resolved -and (Test-PythonInterpreter $resolved.Trim())) { return $resolved.Trim() }
    } catch { }
  }

  return $null
}

function Ensure-PythonRuntime {
  $py = Resolve-PythonExecutable
  if ($py) {
    $script:PythonExe = $py
    Write-Host "Using Python: $py" -ForegroundColor DarkGray
    return
  }

  if ($SkipRuntimeInstall) {
    Write-Error "Python 3 not found. Install from https://www.python.org/ (enable 'Add to PATH') or run without -SkipRuntimeInstall."
  }

  if (-not (Test-WingetAvailable)) {
    Write-Error @"
Python 3 not found, and winget is not available on this PC.
Install Python 3 from https://www.python.org/downloads/ (check 'Add python.exe to PATH'),
or install Node from https://nodejs.org/ , then run this script again.
"@
  }

  $null = Invoke-WingetInstall -PackageId 'Python.Python.3.12' -DisplayName 'Python 3.12'
  Start-Sleep -Seconds 2
  Refresh-SessionPath

  $py = Resolve-PythonExecutable
  if ($py) {
    $script:PythonExe = $py
    Write-Host "Using Python: $py" -ForegroundColor DarkGray
    return
  }

  Write-Error @"
Python 3 still not found after winget install. Close this terminal, open a new PowerShell, and run the script again
so PATH updates apply. Or install Python manually from https://www.python.org/downloads/
"@
}

function Test-NpmWorks {
  param([string]$Candidate)
  if (-not $Candidate) { return $false }
  try {
    $null = & $Candidate --version 2>&1
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Find-NpmInCommonPaths {
  $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
  if ($npmCmd -and (Test-NpmWorks $npmCmd.Source)) { return $npmCmd.Source }

  $roots = @(
    "${env:ProgramFiles}\nodejs\npm.cmd",
    "${env:ProgramFiles(x86)}\nodejs\npm.cmd",
    "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
  )
  foreach ($p in $roots) {
    if (Test-Path -LiteralPath $p) {
      if (Test-NpmWorks $p) { return $p }
    }
  }
  return $null
}

function Resolve-NpmExecutable {
  Refresh-SessionPath
  $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
  if ($npmCmd) {
    $dir = Split-Path -Parent $npmCmd.Source
    $cmdShim = Join-Path $dir 'npm.cmd'
    if ((Test-Path -LiteralPath $cmdShim) -and (Test-NpmWorks $cmdShim)) {
      return $cmdShim
    }
    if (Test-NpmWorks $npmCmd.Source) { return $npmCmd.Source }
  }
  return Find-NpmInCommonPaths
}

function Ensure-NodeRuntime {
  $npm = Resolve-NpmExecutable
  if ($npm) {
    $script:NpmExe = $npm
    Write-Host "Using npm: $npm" -ForegroundColor DarkGray
    return
  }

  if ($SkipRuntimeInstall) {
    Write-Error "npm not found. Install Node.js LTS from https://nodejs.org/ or run without -SkipRuntimeInstall."
  }

  if (-not (Test-WingetAvailable)) {
    Write-Error @"
npm not found, and winget is not available.
Install Node.js LTS from https://nodejs.org/ , then run this script again.
"@
  }

  $null = Invoke-WingetInstall -PackageId 'OpenJS.NodeJS.LTS' -DisplayName 'Node.js LTS'
  Start-Sleep -Seconds 2
  Refresh-SessionPath

  $npm = Resolve-NpmExecutable
  if ($npm) {
    $script:NpmExe = $npm
    Write-Host "Using npm: $npm" -ForegroundColor DarkGray
    return
  }

  Write-Error @"
npm still not found after winget install. Close this terminal, open a new PowerShell, and run the script again.
Or install Node.js manually from https://nodejs.org/
"@
}

Write-Host "POS Boutique - project folder: $RepoRoot" -ForegroundColor Cyan

Ensure-PythonRuntime
Ensure-NodeRuntime

# --- Backend ---
Push-Location $Backend
try {
  if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
      Copy-Item '.env.example' '.env'
      Write-Host "Created backend\.env from .env.example" -ForegroundColor Green
    }
  }

  if (-not (Test-Path '.venv\Scripts\python.exe')) {
    Write-Host "Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    & $script:PythonExe -m venv .venv
  }

  $py = Join-Path $Backend '.venv\Scripts\python.exe'
  Write-Host "Installing backend dependencies (pip)..." -ForegroundColor Yellow
  & $py -m pip install --upgrade pip | Out-Null
  & $py -m pip install -r requirements.txt

  if ($InstallOnly) {
    Write-Host "InstallOnly: backend ready." -ForegroundColor Green
  }
}
finally {
  Pop-Location
}

# --- Frontend ---
Push-Location $Frontend
try {
  if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
      Copy-Item '.env.example' '.env'
      Write-Host "Created frontend\.env from .env.example" -ForegroundColor Green
    }
  }

  Write-Host "Installing frontend dependencies (npm)..." -ForegroundColor Yellow
  & $script:NpmExe install

  if ($InstallOnly) {
    Write-Host "InstallOnly: frontend ready." -ForegroundColor Green
    Write-Host "Run again without -InstallOnly to start the servers." -ForegroundColor Cyan
    exit 0
  }
}
finally {
  Pop-Location
}

if ($ApiPort -eq $UiPort) {
  Write-Error "ApiPort and UiPort must be different (both are $ApiPort)."
}

$uvicornHost = if ($Lan) { '0.0.0.0' } else { '127.0.0.1' }
$viteTail = if ($Lan) { " -- --host --port $UiPort" } else { " -- --port $UiPort" }

# Browser on this PC talks to the API; override Vite env so the SPA matches ApiPort.
$viteApiBase = "http://127.0.0.1:$ApiPort"

$npmLaunch = $script:NpmExe

$backendCmd = @"
Set-Location -LiteralPath '$Backend'
& '.\.venv\Scripts\Activate.ps1'
Write-Host 'API: http://${uvicornHost}:$ApiPort  (Ctrl+C to stop)' -ForegroundColor Cyan
python -m uvicorn src.server:app --reload --host $uvicornHost --port $ApiPort
"@

$frontendCmd = @"
Set-Location -LiteralPath '$Frontend'
`$env:VITE_API_BASE_URL = '$viteApiBase'
Write-Host ('UI: open http://localhost:$UiPort (API base: ' + `$env:VITE_API_BASE_URL + ')') -ForegroundColor Cyan
& '$npmLaunch' run dev$viteTail
"@

if ($ApiPort -ne 8090 -or $UiPort -ne 8089) {
  Write-Host "Custom ports: ensure backend/.env CORS_ORIGINS includes http://localhost:$UiPort (and your LAN URL if using -Lan)." -ForegroundColor Yellow
}

if ($Background) {
  $LogDir = Join-Path $RepoRoot 'logs'
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
  $apiOut = Join-Path $LogDir 'api.stdout.log'
  $apiErr = Join-Path $LogDir 'api.stderr.log'
  $uiOut = Join-Path $LogDir 'ui.stdout.log'
  $uiErr = Join-Path $LogDir 'ui.stderr.log'
  $pyVenv = Join-Path $Backend '.venv\Scripts\python.exe'
  $uiRunner = Join-Path $LogDir 'run-ui-background.ps1'

  $uiScriptLines = @(
    "`$env:VITE_API_BASE_URL = '$viteApiBase'"
    "Set-Location -LiteralPath '$Frontend'"
    "& '$npmLaunch' run dev$viteTail"
  )
  Set-Content -LiteralPath $uiRunner -Value $uiScriptLines -Encoding UTF8

  Write-Host "Starting API on port $ApiPort and UI on port $UiPort in background (no windows)..." -ForegroundColor Green
  Write-Host "Logs: $apiOut , $apiErr | $uiOut , $uiErr" -ForegroundColor DarkGray
  Write-Host "Stop: .\scripts\stop-local.ps1 -ApiPort $ApiPort -UiPort $UiPort" -ForegroundColor Cyan

  $uvicornArgs = @(
    '-m', 'uvicorn', 'src.server:app', '--reload',
    "--host=$uvicornHost", "--port=$ApiPort"
  )
  $pApi = Start-Process -FilePath $pyVenv -ArgumentList $uvicornArgs `
    -WorkingDirectory $Backend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr
  $pApi.Id | Set-Content -LiteralPath (Join-Path $LogDir 'api.pid') -Encoding ASCII

  Start-Sleep -Milliseconds 500

  # One argument string: array form breaks -File when $uiRunner contains spaces (e.g. "Ralph DUMERA Ressources").
  $uiPsArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$uiRunner`""
  $pUi = Start-Process -FilePath 'powershell.exe' -ArgumentList $uiPsArgs `
    -WorkingDirectory $Frontend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $uiOut -RedirectStandardError $uiErr
  $pUi.Id | Set-Content -LiteralPath (Join-Path $LogDir 'ui.pid') -Encoding ASCII

  Write-Host ""
  Write-Host "API: http://${uvicornHost}:$ApiPort  |  UI: http://localhost:$UiPort" -ForegroundColor Green
  Write-Host "Done (background). Use stop-local when finished." -ForegroundColor Cyan
  if ($Lan) {
    Write-Host "Lan mode: add UI origin to CORS_ORIGINS; other PCs need VITE_API_BASE_URL=http://<this-pc-ip>:$ApiPort" -ForegroundColor Yellow
  }
  exit 0
}

Write-Host "Starting API on port $ApiPort and UI on port $UiPort (two windows)..." -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit', '-NoProfile', '-Command', $backendCmd
Start-Sleep -Milliseconds 400
Start-Process powershell -ArgumentList '-NoExit', '-NoProfile', '-Command', $frontendCmd

Write-Host ""
Write-Host "Done. Close each PowerShell window to stop that service." -ForegroundColor Cyan
if ($Lan) {
  Write-Host "Lan mode: use this PC IP to reach API and Vite from the network." -ForegroundColor Yellow
  Write-Host "Add the UI origin to CORS_ORIGINS in backend/.env (e.g. http://192.168.x.x:$UiPort)" -ForegroundColor Yellow
  Write-Host "Other PCs may need VITE_API_BASE_URL=http://<this-pc-ip>:$ApiPort in frontend/.env (build or dev)." -ForegroundColor Yellow
}
