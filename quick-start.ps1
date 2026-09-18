<#
.SYNOPSIS
    MatsyaMitra Quick-Start Script for Everyday Development.
.DESCRIPTION
    Launches PostgreSQL, the FastAPI backend (with hot-reload), and the Metro bundler,
    then instantly opens the already-installed MatsyaMitra app on the Android emulator.
    Bypasses the slow Gradle build cycle for lightning-fast (5-10 second) startup.
.EXAMPLE
    .\quick-start.ps1
    .\quick-start.ps1 -Rebuild
#>

[CmdletBinding()]
param(
    [switch]$Rebuild,
    [switch]$SkipEmulator
)

$ErrorActionPreference = 'Stop'

# ==============================================================================
# Helper Functions: Console Formatting
# ==============================================================================

function Write-StepOk {
    param([string]$Message)
    Write-Host "[OK] " -ForegroundColor Green -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-StepInfo {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor Cyan -NoNewline
    Write-Host $Message -ForegroundColor Gray
}

function Write-StepWarn {
    param([string]$Message)
    Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message -ForegroundColor Yellow
}

function Write-StepError {
    param(
        [string]$Message,
        [string]$Remediation = ""
    )
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message -ForegroundColor Red
    if ($Remediation) {
        Write-Host ""
        Write-Host "How to fix this:" -ForegroundColor Cyan
        Write-Host $Remediation -ForegroundColor Gray
        Write-Host ""
    }
    exit 1
}

function Test-PortListening {
    param(
        [string]$Hostname = "localhost",
        [int]$Port = 8000,
        [int]$TimeoutMs = 1000
    )
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect($Hostname, $Port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        if ($success -and $tcp.Connected) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    }
    catch {
        return $false
    }
}

# ==============================================================================
# Banner
# ==============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          MATSYAMITRA QUICK START (DEV MODE)               " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Fast launch without Gradle recompilation.                 " -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ==============================================================================
# 0. Project Root Resolution
# ==============================================================================

$ProjectRoot = $PSScriptRoot
if ([string]::IsNullOrEmpty($ProjectRoot)) {
    $ProjectRoot = (Get-Location).Path
}
Set-Location -LiteralPath $ProjectRoot
Write-StepOk "Project root: $ProjectRoot"

# ==============================================================================
# 1. Android SDK & ADB Detection
# ==============================================================================

function Find-AndroidSdk {
    $candidates = [System.Collections.Generic.List[string]]::new()
    if ($env:ANDROID_HOME) { $candidates.Add($env:ANDROID_HOME) }
    if ($env:ANDROID_SDK_ROOT) { $candidates.Add($env:ANDROID_SDK_ROOT) }
    if ($env:LOCALAPPDATA) { $candidates.Add((Join-Path $env:LOCALAPPDATA "Android\Sdk")) }
    if ($env:ProgramFiles) { $candidates.Add((Join-Path $env:ProgramFiles "Android\Sdk")) }
    if (${env:ProgramFiles(x86)}) { $candidates.Add((Join-Path ${env:ProgramFiles(x86)} "Android\Sdk")) }

    $uniqueCandidates = $candidates | Select-Object -Unique
    foreach ($cand in $uniqueCandidates) {
        if ($cand -and (Test-Path $cand)) {
            if ((Test-Path (Join-Path $cand "platform-tools")) -or (Test-Path (Join-Path $cand "emulator"))) {
                return $cand
            }
        }
    }
    return $null
}

$androidSdkPath = Find-AndroidSdk
if ($null -eq $androidSdkPath) {
    Write-StepError "Android SDK not found." "Please ensure Android Studio is installed and %LOCALAPPDATA%\Android\Sdk exists."
}

$env:ANDROID_HOME = $androidSdkPath
$env:ANDROID_SDK_ROOT = $androidSdkPath

$platformTools = Join-Path $androidSdkPath "platform-tools"
if ((Test-Path $platformTools) -and ($env:PATH -notlike "*$platformTools*")) {
    $env:PATH = "$platformTools;$env:PATH"
}
$adbExe = Join-Path $platformTools "adb.exe"

# ==============================================================================
# 2. Android Device / Emulator Check
# ==============================================================================

function Get-ConnectedAndroidDevices {
    param([string]$AdbPath)
    $devices = @()
    try {
        $lines = & $AdbPath devices 2>$null
        foreach ($line in $lines) {
            $trimmed = $line.Trim()
            if ($trimmed -match '^([^\s]+)\s+device$') {
                $devices += $matches[1]
            }
        }
    }
    catch {}
    return $devices
}

$connectedDevices = @(Get-ConnectedAndroidDevices -AdbPath $adbExe)

if ($connectedDevices.Count -gt 0) {
    Write-StepOk "Android device active ($($connectedDevices[0]))"
}
else {
    Write-StepInfo "No Android device/emulator online. Launching emulator..."
    $emulatorExe = Join-Path $androidSdkPath "emulator\emulator.exe"
    if (Test-Path $emulatorExe) {
        $avdOutput = & $emulatorExe -list-avds 2>$null
        $avdList = @()
        if ($avdOutput) {
            $avdList = $avdOutput | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
        }
        if ($avdList.Count -gt 0) {
            $chosenAvd = $avdList[0]
            foreach ($avd in $avdList) {
                if ($avd -match 'Pixel_6' -or $avd -match 'pixel.*6') {
                    $chosenAvd = $avd
                    break
                }
            }
            Write-StepInfo "Booting AVD '$chosenAvd'..."
            Start-Process -FilePath $emulatorExe -ArgumentList "-avd", "$chosenAvd" -WindowStyle Normal

            $startTime = [System.DateTime]::UtcNow
            $bootTimeoutSeconds = 90
            while (([System.DateTime]::UtcNow - $startTime).TotalSeconds -lt $bootTimeoutSeconds) {
                Start-Sleep -Seconds 3
                $devices = @(Get-ConnectedAndroidDevices -AdbPath $adbExe)
                if ($devices.Count -gt 0) {
                    $bootCompleted = (& $adbExe shell getprop sys.boot_completed 2>$null)
                    if ($bootCompleted -and $bootCompleted.Trim() -eq "1") {
                        break
                    }
                }
            }
            Write-StepOk "Android emulator online ('$chosenAvd')"
        }
        else {
            Write-StepWarn "No AVD found. Connect a device via USB or start emulator manually."
        }
    }
}

# Reverse ports for emulator communication with PC localhost
try {
    & $adbExe reverse tcp:8081 tcp:8081 2>$null | Out-Null
    & $adbExe reverse tcp:8000 tcp:8000 2>$null | Out-Null
    Write-StepOk "ADB port reverse active (8081:Metro, 8000:Backend)"
}
catch {}


# ==============================================================================
# 3. PostgreSQL Service Check
# ==============================================================================

$pgRunning = Test-PortListening -Hostname "localhost" -Port 5432 -TimeoutMs 1000
if (-not $pgRunning) {
    $pgServices = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgServices) {
        foreach ($svc in $pgServices) {
            Write-StepInfo "Starting PostgreSQL service '$($svc.Name)'..."
            try {
                Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            }
            catch {}
        }
        $pgRunning = Test-PortListening -Hostname "localhost" -Port 5432 -TimeoutMs 1500
    }
}

if ($pgRunning) {
    Write-StepOk "PostgreSQL running (port 5432)"
}
else {
    Write-StepWarn "PostgreSQL is not responding on port 5432. Backend may encounter DB errors."
}

# ==============================================================================
# 4. Load .env Environment
# ==============================================================================

$envFile = Join-Path $ProjectRoot ".env"
if (Test-Path $envFile) {
    try {
        Get-Content $envFile | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#")) {
                $eqIdx = $line.IndexOf("=")
                if ($eqIdx -gt 0) {
                    $k = $line.Substring(0, $eqIdx).Trim()
                    $v = $line.Substring($eqIdx + 1).Trim().Trim('"').Trim("'")
                    if (-not [string]::IsNullOrEmpty($k) -and [string]::IsNullOrEmpty([System.Environment]::GetEnvironmentVariable($k))) {
                        [System.Environment]::SetEnvironmentVariable($k, $v, [System.EnvironmentVariableTarget]::Process)
                    }
                }
            }
        }
    }
    catch {}
}

if ([string]::IsNullOrEmpty($env:MATSYAMITRA_DATABASE_URL) -and -not [string]::IsNullOrEmpty($env:DATABASE_URL)) {
    $env:MATSYAMITRA_DATABASE_URL = $env:DATABASE_URL
}

# ==============================================================================
# 5. FastAPI Backend (with Hot Reload)
# ==============================================================================

function Test-BackendHealth {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($response -and ($response.status -eq "ok" -or $response.database_status)) {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

if (Test-BackendHealth) {
    Write-StepOk "Backend active (http://localhost:8000)"
}
else {
    Write-StepInfo "Starting FastAPI backend (with auto-reload enabled)..."

    $backendLaunchCode = @"
`$host.UI.RawUI.WindowTitle = 'MatsyaMitra Backend API (FastAPI)'
Set-Location -LiteralPath '$ProjectRoot'
`$env:MATSYAMITRA_DATABASE_URL = '$($env:MATSYAMITRA_DATABASE_URL)'
`$env:MATSYAMITRA_API_RELOAD = 'true'
python run_api.py
"@
    $backendEncoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($backendLaunchCode))
    Start-Process powershell.exe -ArgumentList "-NoExit", "-EncodedCommand", $backendEncoded

    $backendTimeout = 15
    $startTime = [System.DateTime]::UtcNow
    $backendReady = $false

    while (([System.DateTime]::UtcNow - $startTime).TotalSeconds -lt $backendTimeout) {
        Start-Sleep -Seconds 1
        if (Test-BackendHealth) {
            $backendReady = $true
            break
        }
    }

    if ($backendReady) {
        Write-StepOk "Backend started (http://localhost:8000)"
    }
    else {
        Write-StepWarn "Backend window opened, but health check not responding yet. Check Backend terminal."
    }
}

# ==============================================================================
# 6. Metro Bundler Check & Launch
# ==============================================================================

function Test-MetroHealth {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8081/status" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response -and $response.Content -match 'packager-status:running') {
            return $true
        }
        return (Test-PortListening -Hostname "127.0.0.1" -Port 8081 -TimeoutMs 500)
    }
    catch {
        return (Test-PortListening -Hostname "127.0.0.1" -Port 8081 -TimeoutMs 500)
    }
}

if (Test-MetroHealth) {
    Write-StepOk "Metro Bundler active (http://localhost:8081)"
}
else {
    Write-StepInfo "Starting Metro bundler on port 8081..."

    $metroLaunchCode = @"
`$host.UI.RawUI.WindowTitle = 'MatsyaMitra Metro Bundler'
Set-Location -LiteralPath '$ProjectRoot'
npm start -- --port 8081
"@
    $metroEncoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($metroLaunchCode))
    Start-Process powershell.exe -ArgumentList "-NoExit", "-EncodedCommand", $metroEncoded

    $metroTimeout = 15
    $startTime = [System.DateTime]::UtcNow
    $metroReady = $false

    while (([System.DateTime]::UtcNow - $startTime).TotalSeconds -lt $metroTimeout) {
        Start-Sleep -Seconds 1
        if (Test-MetroHealth) {
            $metroReady = $true
            break
        }
    }

    if ($metroReady) {
        Write-StepOk "Metro Bundler started (http://localhost:8081)"
    }
    else {
        Write-StepWarn "Metro Bundler window opened, proceeding..."
    }
}

# ==============================================================================
# 7. Launch MatsyaMitra App on Device
# ==============================================================================

Write-Host ""
$appPackage = "com.matsyamitra"
$mainActivity = "com.matsyamitra/.MainActivity"

$connectedDevices = Get-ConnectedAndroidDevices -AdbPath $adbExe
if ($connectedDevices.Count -eq 0) {
    Write-StepWarn "No device detected. Metro and Backend are ready; connect your device or start emulator to test."
}
else {
    # Check if user requested a full rebuild or if the app is not yet installed
    $isInstalled = $false
    try {
        $pkgCheck = & $adbExe shell pm list packages $appPackage 2>$null
        if ($pkgCheck -and $pkgCheck -match $appPackage) {
            $isInstalled = $true
        }
    }
    catch {}

    if ($Rebuild) {
        Write-StepInfo "-Rebuild requested. Running Gradle build & install..."
        $env:PORT = "8081"
        npx react-native run-android --no-packager --port 8081
    }
    elseif (-not $isInstalled) {
        Write-StepWarn "App '$appPackage' is not yet installed on this device."
        Write-StepInfo "Performing initial installation via Gradle (this only happens once)..."
        $env:PORT = "8081"
        npx react-native run-android --no-packager --port 8081
    }
    else {
        Write-StepInfo "Launching MatsyaMitra immediately (bypassing Gradle build)..."
        & $adbExe shell am force-stop $appPackage 2>$null | Out-Null
        Start-Sleep -Milliseconds 250
        & $adbExe shell am start -n $mainActivity 2>$null | Out-Null
        Write-StepOk "MatsyaMitra app launched on device!"
    }
}

# ==============================================================================
# Summary Banner
# ==============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "           MATSYAMITRA IS READY FOR DEVELOPMENT!           " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Backend API   : http://localhost:8000  (Docs: http://localhost:8000/docs)" -ForegroundColor White
Write-Host "  Metro Bundler : http://localhost:8081" -ForegroundColor White
Write-Host "  Fast Refresh  : ACTIVE (save any .tsx/.ts file to auto-update in <1s)" -ForegroundColor White
Write-Host "  Manual Reload : Press 'R' twice in emulator" -ForegroundColor White
Write-Host "  Full Rebuild  : Run '.\quick-start.ps1 -Rebuild' if you edit android/ files" -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
