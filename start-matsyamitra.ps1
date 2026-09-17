<#
.SYNOPSIS
    MatsyaMitra One-Command Startup Script for Windows PowerShell.
.DESCRIPTION
    Automates prerequisite verification, environment configuration, database checks,
    Android emulator launch, FastAPI backend server startup, Metro bundler startup,
    and Android application launch in a single command.
    Fully portable across Windows development machines without hardcoded user paths.
.EXAMPLE
    .\start-matsyamitra.ps1
#>

# Requires PowerShell 5.1 or later
# Set strict error behavior while handling expected non-fatal probes gracefully
$ErrorActionPreference = 'Stop'

# ==============================================================================
# Helper Functions: Console Formatting & Diagnostics
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
    } catch {
        return $false
    }
}

function Get-ExecutableVersionStderr {
    param([string]$ExecutablePath, [string]$Arguments = "-version")
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $ExecutablePath
        $psi.Arguments = $Arguments
        $psi.UseShellExecute = $false
        $psi.RedirectStandardError = $true
        $psi.RedirectStandardOutput = $true
        $psi.CreateNoWindow = $true
        $proc = [System.Diagnostics.Process]::Start($psi)
        $stderr = $proc.StandardError.ReadToEnd()
        $stdout = $proc.StandardOutput.ReadToEnd()
        $proc.WaitForExit(4000)
        return "$stdout $stderr".Trim()
    } catch {
        return $null
    }
}

# ==============================================================================
# Banner
# ==============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "             MATSYAMITRA STARTUP AUTOMATION                " -ForegroundColor Cyan
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
# 1. Java 17 Detection & Environment Setup
# ==============================================================================

function Find-Jdk17 {
    $candidates = [System.Collections.Generic.List[string]]::new()

    if ($env:JAVA_HOME) {
        $candidates.Add($env:JAVA_HOME)
    }

    $cmdJava = Get-Command java -ErrorAction SilentlyContinue
    if ($cmdJava -and $cmdJava.Source) {
        $parent1 = Split-Path -Parent $cmdJava.Source
        $parent2 = Split-Path -Parent $parent1
        if ($parent2) { $candidates.Add($parent2) }
    }

    $searchRoots = @(
        "$env:ProgramFiles\Java",
        "$env:ProgramFiles\Eclipse Adoptium",
        "$env:ProgramFiles\Microsoft",
        "$env:ProgramFiles\Amazon Corretto",
        "$env:ProgramFiles\Zulu",
        "$env:ProgramFiles\BellSoft",
        "$env:ProgramFiles\Android\Android Studio\jbr",
        "${env:ProgramFiles(x86)}\Java",
        "$env:LOCALAPPDATA\Programs\Eclipse Adoptium",
        "$env:LOCALAPPDATA\Programs\Common\Java"
    )

    foreach ($root in $searchRoots) {
        if ($root -and (Test-Path $root)) {
            $candidates.Add($root)
            try {
                Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                    $candidates.Add($_.FullName)
                }
            } catch {}
        }
    }

    $uniqueCandidates = $candidates | Select-Object -Unique

    foreach ($cand in $uniqueCandidates) {
        if (-not (Test-Path $cand)) { continue }

        $javaExe = Join-Path $cand "bin\java.exe"
        if (Test-Path $javaExe) {
            $versionInfo = Get-ExecutableVersionStderr -ExecutablePath $javaExe -Arguments "-version"
            if ($versionInfo -match '(?:version\s+"17|\b17\.\d+)') {
                return @{
                    JdkPath = $cand
                    JavaExe = $javaExe
                    Version = $versionInfo
                }
            }
        }
    }

    return $null
}

$jdk17 = Find-Jdk17
if ($null -eq $jdk17) {
    Write-StepError "JDK 17 not found." @"
MatsyaMitra React Native Android builds require OpenJDK 17 or Oracle JDK 17.

To install JDK 17 on Windows:
  1. Run in PowerShell:
     winget install EclipseAdoptium.Temurin.17.JDK
  2. Or download Eclipse Temurin JDK 17 from: https://adoptium.net/temurin/releases/?version=17
  3. Ensure JAVA_HOME points to your JDK 17 installation folder.
"@
}

$env:JAVA_HOME = $jdk17.JdkPath
if ($env:PATH -notlike "*$($jdk17.JdkPath)\bin*") {
    $env:PATH = "$($jdk17.JdkPath)\bin;$env:PATH"
}
Write-StepOk "Java 17 ($($jdk17.JdkPath))"

# ==============================================================================
# 2. Android SDK Detection & PATH Configuration
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
            $hasPlatformTools = Test-Path (Join-Path $cand "platform-tools")
            $hasEmulator = Test-Path (Join-Path $cand "emulator")
            $hasPlatforms = Test-Path (Join-Path $cand "platforms")
            if ($hasPlatformTools -or $hasEmulator -or $hasPlatforms) {
                return $cand
            }
        }
    }
    return $null
}

$androidSdkPath = Find-AndroidSdk
if ($null -eq $androidSdkPath) {
    Write-StepError "Android SDK not found." @"
The Android SDK was not detected in standard locations or ANDROID_HOME.

To resolve:
  1. Install Android Studio: https://developer.android.com/studio
  2. Open Android Studio -> SDK Manager -> Install Android SDK Platform 34 and Command-line Tools.
  3. Set ANDROID_HOME in your environment or ensure it is installed at:
     %LOCALAPPDATA%\Android\Sdk
"@
}

$env:ANDROID_HOME = $androidSdkPath
$env:ANDROID_SDK_ROOT = $androidSdkPath

if ([string]::IsNullOrEmpty($env:ANDROID_AVD_HOME) -and (Test-Path "E:\Android\avd")) {
    $env:ANDROID_AVD_HOME = "E:\Android\avd"
}

$sdkBins = @(
    (Join-Path $androidSdkPath "platform-tools"),
    (Join-Path $androidSdkPath "emulator"),
    (Join-Path $androidSdkPath "cmdline-tools\latest\bin"),
    (Join-Path $androidSdkPath "cmdline-tools\bin"),
    (Join-Path $androidSdkPath "tools\bin"),
    (Join-Path $androidSdkPath "tools")
)

foreach ($binDir in $sdkBins) {
    if ((Test-Path $binDir) -and ($env:PATH -notlike "*$binDir*")) {
        $env:PATH = "$binDir;$env:PATH"
    }
}

$adbExe = Join-Path $androidSdkPath "platform-tools\adb.exe"
if (-not (Test-Path $adbExe)) {
    Write-StepError "Android platform-tools (adb.exe) not found." @"
Please install Android SDK Platform-Tools via Android Studio SDK Manager.
Target path: $androidSdkPath\platform-tools
"@
}

Write-StepOk "Android SDK ($androidSdkPath)"

# ==============================================================================
# 3. Android Device & Emulator Management
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
    } catch {}
    return $devices
}

$connectedDevices = Get-ConnectedAndroidDevices -AdbPath $adbExe

if ($connectedDevices.Count -gt 0) {
    Write-StepOk "Android device (active: $($connectedDevices[0]))"
} else {
    Write-StepInfo "No running Android device detected. Checking available AVDs..."

    $emulatorExe = Join-Path $androidSdkPath "emulator\emulator.exe"
    if (-not (Test-Path $emulatorExe)) {
        Write-StepError "Android emulator executable not found." @"
Please install the Android Emulator component from Android Studio SDK Manager.
Target path: $androidSdkPath\emulator\emulator.exe
"@
    }

    $avdOutput = & $emulatorExe -list-avds 2>$null
    $avdList = @()
    if ($avdOutput) {
        $avdList = $avdOutput | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    }

    if ($avdList.Count -eq 0) {
        Write-StepError "No Android Virtual Devices (AVD) found." @"
No AVD is configured on this system.

To create an Android Emulator:
  1. Open Android Studio -> Virtual Device Manager -> Create Device.
  2. Choose Pixel 6 (or any standard phone) with Android 13/14 (API 33/34).
  3. Re-run .\start-matsyamitra.ps1
"@
    }

    # Prefer Pixel_6 if present; otherwise use the first available AVD
    $chosenAvd = $avdList[0]
    foreach ($avd in $avdList) {
        if ($avd -match 'Pixel_6' -or $avd -match 'pixel.*6') {
            $chosenAvd = $avd
            break
        }
    }

    Write-StepInfo "Launching Android Virtual Device '$chosenAvd'..."
    Start-Process -FilePath $emulatorExe -ArgumentList "-avd", "$chosenAvd" -WindowStyle Normal

    # Poll until device is attached and booted
    $bootTimeoutSeconds = 120
    $startTime = [System.DateTime]::UtcNow
    $isBooted = $false

    while (([System.DateTime]::UtcNow - $startTime).TotalSeconds -lt $bootTimeoutSeconds) {
        Start-Sleep -Seconds 3
        $devices = Get-ConnectedAndroidDevices -AdbPath $adbExe
        if ($devices.Count -gt 0) {
            # Check boot completion status
            $bootCompleted = (& $adbExe shell getprop sys.boot_completed 2>$null)
            if ($bootCompleted -and $bootCompleted.Trim() -eq "1") {
                $isBooted = $true
                break
            }
        }
    }

    if (-not $isBooted) {
        # Check if adb at least reports the device online even if prop polling timed out
        $devices = Get-ConnectedAndroidDevices -AdbPath $adbExe
        if ($devices.Count -eq 0) {
            Write-StepError "Android emulator '$chosenAvd' did not boot within $bootTimeoutSeconds seconds." @"
Please check Android Studio emulator settings or start the emulator manually before running this script.
"@
        }
    }

    Write-StepOk "Android device (emulator '$chosenAvd' is online and ready)"
}

# ==============================================================================
# 4. PostgreSQL Service & Database Verification
# ==============================================================================

$pgServiceRunning = $false
$pgServices = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue

if ($pgServices) {
    foreach ($svc in $pgServices) {
        if ($svc.Status -ne 'Running') {
            Write-StepInfo "PostgreSQL service '$($svc.Name)' is stopped. Attempting to start service..."
            try {
                Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                $svc.Refresh()
            } catch {}
        }
        if ($svc.Status -eq 'Running') {
            $pgServiceRunning = $true
            break
        }
    }
}

$pgPortOpen = Test-PortListening -Hostname "localhost" -Port 5432 -TimeoutMs 1500

if ($pgServiceRunning -or $pgPortOpen) {
    Write-StepOk "PostgreSQL (service is active and accepting connections)"
} else {
    Write-StepError "PostgreSQL service is not running or port 5432 is unreachable." @"
MatsyaMitra requires PostgreSQL 16 to persist and query oceanographic observations.

To resolve:
  1. If PostgreSQL is installed, start the Windows Service 'postgresql-x64-16' in Services (services.msc).
  2. Or download and install PostgreSQL 16 for Windows: https://www.postgresql.org/download/windows/
  3. Ensure PostgreSQL is listening on port 5432.
"@
}

# ==============================================================================
# 5. Database Configuration Loader (.env / MATSYAMITRA_DATABASE_URL)
# ==============================================================================

# Parse local .env file if present
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
    } catch {}
}

if ([string]::IsNullOrEmpty($env:MATSYAMITRA_DATABASE_URL) -and -not [string]::IsNullOrEmpty($env:DATABASE_URL)) {
    $env:MATSYAMITRA_DATABASE_URL = $env:DATABASE_URL
}

if ([string]::IsNullOrEmpty($env:MATSYAMITRA_DATABASE_URL)) {
    Write-StepError "MATSYAMITRA_DATABASE_URL environment variable is missing." @"
MatsyaMitra backend needs a database connection URL.

To configure your local connection:
  1. Create a '.env' file in the project root ($ProjectRoot\.env)
  2. Add the following line with your local PostgreSQL credentials:
     MATSYAMITRA_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/matsyamitra
  3. Alternatively, set the environment variable in your session:
     `$env:MATSYAMITRA_DATABASE_URL = 'postgresql://postgres:YOUR_PASSWORD@localhost:5432/matsyamitra'

Note: Never commit your .env file or database passwords to source control.
"@
}

Write-StepOk "Database configuration (MATSYAMITRA_DATABASE_URL is set)"

# ==============================================================================
# 6. Dependency Verification (Node & Python)
# ==============================================================================

# Check Node modules
$nodeModulesDir = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $nodeModulesDir)) {
    Write-StepInfo "Node dependencies (node_modules) not found. Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-StepError "npm install failed." "Please verify your Node.js installation and internet connection."
    }
}
Write-StepOk "Node dependencies"

# Check Python environment
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($null -eq $pythonCmd) {
    Write-StepError "Python interpreter not found in PATH." @"
Python 3.10+ is required to run the MatsyaMitra FastAPI backend.

To install Python on Windows:
  1. Run: winget install Python.Python.3.11
  2. Or download from: https://www.python.org/downloads/
  3. Ensure 'Add python.exe to PATH' is selected during installation.
"@
}

# Verify required Python packages for run_api.py
$pyCheckScript = "import fastapi, uvicorn, sqlalchemy, psycopg2; print('OK')"
$pyCheckResult = & python -c $pyCheckScript 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-StepError "Required Python dependencies are missing in your Python environment." @"
Please install the required Python packages for analytics and API backend:
  pip install -r analytics/requirements.txt
"@
}
Write-StepOk "Python dependencies"

# ==============================================================================
# 7. FastAPI Backend Startup & Health Probe
# ==============================================================================

function Test-BackendHealth {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
        if ($response -and ($response.status -eq "ok" -or $response.database_status)) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

if (Test-BackendHealth) {
    Write-StepOk "Backend (already active on http://localhost:8000)"
} else {
    Write-StepInfo "Starting MatsyaMitra FastAPI backend in a dedicated window..."

    $backendLaunchCode = @"
`$host.UI.RawUI.WindowTitle = 'MatsyaMitra Backend API (FastAPI)'
Set-Location -LiteralPath '$ProjectRoot'
`$env:MATSYAMITRA_DATABASE_URL = '$($env:MATSYAMITRA_DATABASE_URL)'
python run_api.py
"@
    $backendEncoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($backendLaunchCode))
    Start-Process powershell.exe -ArgumentList "-NoExit", "-EncodedCommand", $backendEncoded

    $backendTimeout = 30
    $startTime = [System.DateTime]::UtcNow
    $backendHealthy = $false

    while (([System.DateTime]::UtcNow - $startTime).TotalSeconds -lt $backendTimeout) {
        Start-Sleep -Seconds 1
        if (Test-BackendHealth) {
            $backendHealthy = $true
            break
        }
    }

    if (-not $backendHealthy) {
        Write-StepError "FastAPI backend failed to respond at http://localhost:8000/api/v1/health within $backendTimeout seconds." @"
Check the opened 'MatsyaMitra Backend API' PowerShell window for Python traceback or database connection errors.
"@
    }

    Write-StepOk "Backend (started and healthy on http://localhost:8000)"
}

# ==============================================================================
# 8. Metro Bundler Startup & Health Probe
# ==============================================================================

function Test-MetroHealth {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8081/status" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($response -and $response.Content -match 'packager-status:running') {
            return $true
        }
        return (Test-PortListening -Hostname "127.0.0.1" -Port 8081 -TimeoutMs 1000)
    } catch {
        return (Test-PortListening -Hostname "127.0.0.1" -Port 8081 -TimeoutMs 1000)
    }
}

if (Test-MetroHealth) {
    Write-StepOk "Metro (already running on http://localhost:8081)"
} else {
    Write-StepInfo "Starting Metro bundler on port 8081 in a dedicated window..."

    $metroLaunchCode = @"
`$host.UI.RawUI.WindowTitle = 'MatsyaMitra Metro Bundler'
Set-Location -LiteralPath '$ProjectRoot'
npm start -- --port 8081
"@
    $metroEncoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($metroLaunchCode))
    Start-Process powershell.exe -ArgumentList "-NoExit", "-EncodedCommand", $metroEncoded

    $metroTimeout = 30
    $startTime = [System.DateTime]::UtcNow
    $metroHealthy = $false

    while (([System.DateTime]::UtcNow - $startTime).TotalSeconds -lt $metroTimeout) {
        Start-Sleep -Seconds 1
        if (Test-MetroHealth) {
            $metroHealthy = $true
            break
        }
    }

    if (-not $metroHealthy) {
        Write-StepError "Metro bundler failed to start on port 8081 within $metroTimeout seconds." @"
Check the opened 'MatsyaMitra Metro Bundler' PowerShell window for Metro or node errors.
"@
    }

    Write-StepOk "Metro (ready on http://localhost:8081)"
}

# ==============================================================================
# 9. Build and Launch MatsyaMitra Android Application
# ==============================================================================

Write-Host ""
Write-StepInfo "Building and launching MatsyaMitra on Android device..."
Write-Host ""

$env:PORT = "8081"
npx react-native run-android --no-packager --port 8081

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-StepOk "MatsyaMitra (application built and launched successfully!)"
    Write-Host ""
    Write-Host "All systems operational:" -ForegroundColor Green
    Write-Host "  - Fast API Backend : http://localhost:8000 (docs at http://localhost:8000/docs)" -ForegroundColor Gray
    Write-Host "  - Metro Bundler    : http://localhost:8081" -ForegroundColor Gray
    Write-Host "  - PostgreSQL       : localhost:5432" -ForegroundColor Gray
    Write-Host "  - Target Device    : Connected Android device / AVD" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-StepError "react-native run-android returned error code $LASTEXITCODE." @"
Review the build output above for Gradle or compilation errors.
Ensure that your Android emulator/device is connected and unlocked.
"@
}
