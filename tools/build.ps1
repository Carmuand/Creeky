<#
.SYNOPSIS
    Build the Creeky release executable with PyInstaller and optionally install it.
.DESCRIPTION
    Builds the React frontend, then packages app/desktop/main.py with
    PyInstaller in one-folder mode: a Creeky.exe next to its _internal
    folder, without a console window and with the application icon. The
    frontend build is bundled as data so the window loads it from disk.
    The output is written to build/Creeky.

    When the build finishes the script asks whether to install the
    application in a folder of your choice or leave it where it was
    built, and whether to create a desktop shortcut. The shortcut points
    to the installed copy when there is one, otherwise to the build
    output, and replaces an existing Creeky shortcut.
.PARAMETER SkipFrontend
    Skip the frontend build and reuse the existing app/dist output.
.PARAMETER Console
    Keep the console window, useful to read the logs of a failing build.
.PARAMETER Clean
    Remove the previous build output and the PyInstaller cache first.
.PARAMETER InstallDir
    Folder to install the application into, skipping that question. A
    folder not named Creeky receives a Creeky subfolder.
.PARAMETER Shortcut
    Create the desktop shortcut without asking.
.PARAMETER NoShortcut
    Do not create the desktop shortcut and do not ask.
.PARAMETER NoPrompt
    Never ask questions: keep the build where it is unless -InstallDir is
    given, and create a shortcut only with -Shortcut.
.EXAMPLE
    .\tools\build.ps1
.EXAMPLE
    .\tools\build.ps1 -SkipFrontend -InstallDir "D:\Apps" -Shortcut
.EXAMPLE
    .\tools\build.ps1 -NoPrompt
#>
[CmdletBinding()]
param(
    [switch]$SkipFrontend,
    [switch]$Console,
    [switch]$Clean,
    [string]$InstallDir = "",
    [switch]$Shortcut,
    [switch]$NoShortcut,
    [switch]$NoPrompt
)

$ErrorActionPreference = "Stop"

$AppName = "Creeky"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$AppDir = Join-Path $RepoRoot "app"
$EntryPoint = Join-Path $AppDir "desktop\main.py"
$FrontendDist = Join-Path $AppDir "dist"
$IconPath = Join-Path $AppDir "public\assets\app\DevLogo.ico"
$BuildDir = Join-Path $RepoRoot "build"
$WorkDir = Join-Path $BuildDir "work"
$OutputDir = Join-Path $BuildDir $AppName
$ExecutableName = "$AppName.exe"
$Executable = Join-Path $OutputDir $ExecutableName
$RequiredModules = @("PyInstaller", "webview", "pystray", "sqlalchemy", "keyring", "desktop_notifier", "cryptography", "requests", "bs4")

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Host ""
    Write-Host "Build failed: $Message" -ForegroundColor Red
    exit 1
}

function Resolve-Python() {
    foreach ($candidate in @((Join-Path $RepoRoot "venv\Scripts\python.exe"), (Join-Path $AppDir "venv\Scripts\python.exe"))) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    $command = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $command) { Fail "No Python interpreter found (checked venv and PATH)" }
    return $command.Source
}

function Read-AppVersion() {
    $package = Get-Content -LiteralPath (Join-Path $AppDir "package.json") -Raw | ConvertFrom-Json
    return [string]$package.version
}

function Read-YesNo([string]$Question, [bool]$Default) {
    $hint = if ($Default) { "[Y/n]" } else { "[y/N]" }
    while ($true) {
        $answer = (Read-Host "$Question $hint").Trim().ToLowerInvariant()
        if ($answer -eq "") { return $Default }
        if ($answer -in @("y", "yes", "s", "si")) { return $true }
        if ($answer -in @("n", "no")) { return $false }
        Write-Host "Please answer y or n." -ForegroundColor Yellow
    }
}

function Resolve-InstallTarget([string]$Path) {
    $expanded = [System.Environment]::ExpandEnvironmentVariables($Path.Trim().Trim('"'))
    if (-not [System.IO.Path]::IsPathRooted($expanded)) {
        $expanded = Join-Path (Get-Location).Path $expanded
    }
    $full = [System.IO.Path]::GetFullPath($expanded)
    if ((Split-Path -Leaf $full) -ne $AppName) {
        $full = Join-Path $full $AppName
    }
    return $full
}

function Install-Application([string]$Target) {
    if ($Target.TrimEnd('\') -eq $OutputDir.TrimEnd('\')) {
        Write-Host "The install folder is the build output; nothing to copy."
        return $OutputDir
    }
    if (Test-Path -LiteralPath $Target) {
        $existing = @(Get-ChildItem -LiteralPath $Target -Force)
        $isPreviousInstall = Test-Path -LiteralPath (Join-Path $Target $ExecutableName)
        if ($existing.Count -gt 0 -and -not $isPreviousInstall) {
            Fail "Install folder is not empty and is not a previous $AppName install: $Target"
        }
        if ($isPreviousInstall) {
            Write-Host "Replacing the previous install in $Target"
            try {
                Remove-Item -LiteralPath $Target -Recurse -Force
            }
            catch {
                Fail "Could not replace $Target. Close $AppName if it is running and try again. ($($_.Exception.Message))"
            }
        }
    }
    New-Item -ItemType Directory -Path $Target -Force | Out-Null
    Copy-Item -Path (Join-Path $OutputDir "*") -Destination $Target -Recurse -Force
    if (-not (Test-Path -LiteralPath (Join-Path $Target $ExecutableName))) {
        Fail "Install did not produce $ExecutableName in $Target"
    }
    Write-Host "Installed in $Target" -ForegroundColor Green
    return $Target
}

function New-DesktopShortcut([string]$TargetDir) {
    $desktop = [System.Environment]::GetFolderPath("Desktop")
    $linkPath = Join-Path $desktop "$AppName.lnk"
    if (Test-Path -LiteralPath $linkPath) {
        Remove-Item -LiteralPath $linkPath -Force
        Write-Host "Replaced the existing shortcut."
    }
    $targetExe = Join-Path $TargetDir $ExecutableName
    $shell = New-Object -ComObject WScript.Shell
    $link = $shell.CreateShortcut($linkPath)
    $link.TargetPath = $targetExe
    $link.WorkingDirectory = $TargetDir
    $link.IconLocation = "$targetExe,0"
    $link.Description = $AppName
    $link.Save()
    Write-Host "Shortcut created: $linkPath -> $targetExe" -ForegroundColor Green
}

Write-Step "Checking prerequisites"
$python = Resolve-Python
Write-Host "Python: $python"
foreach ($module in $RequiredModules) {
    & $python -c "import $module" 2>$null
    if ($LASTEXITCODE -ne 0) { Fail "Python module '$module' is missing for $python (pip install -r app\requirements.txt)" }
}
if (-not (Test-Path -LiteralPath $EntryPoint)) { Fail "Entry point not found: $EntryPoint" }
if (-not (Test-Path -LiteralPath $IconPath)) { Fail "Application icon not found: $IconPath" }
if (-not $SkipFrontend) {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($null -eq $npm) { Fail "npm is required for the frontend build (or use -SkipFrontend)" }
}
if ($Shortcut -and $NoShortcut) { Fail "-Shortcut and -NoShortcut cannot be used together" }
$version = Read-AppVersion
Write-Host "Version: $version | Console: $(if ($Console) { 'shown' } else { 'hidden' })"

if ($Clean -and (Test-Path -LiteralPath $BuildDir)) {
    Write-Step "Removing the previous build output"
    Remove-Item -LiteralPath $BuildDir -Recurse -Force
}

if (-not $SkipFrontend) {
    Write-Step "Building the frontend"
    if (-not (Test-Path -LiteralPath (Join-Path $AppDir "node_modules"))) {
        & npm --prefix $AppDir install
        if ($LASTEXITCODE -ne 0) { Fail "npm install failed" }
    }
    & npm --prefix $AppDir run build
    if ($LASTEXITCODE -ne 0) { Fail "npm run build failed" }
}
if (-not (Test-Path -LiteralPath (Join-Path $FrontendDist "index.html"))) {
    Fail "Frontend output missing: $FrontendDist\index.html (build it or drop -SkipFrontend)"
}

Write-Step "Packaging with PyInstaller"
if (-not (Test-Path -LiteralPath $BuildDir)) {
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}
$pyinstallerArgs = @(
    "--noconfirm",
    "--onedir",
    "--name", $AppName,
    "--icon", $IconPath,
    "--paths", $AppDir,
    "--distpath", $BuildDir,
    "--workpath", $WorkDir,
    "--specpath", $BuildDir,
    "--add-data", "$FrontendDist;dist",
    "--collect-submodules", "desktop",
    "--collect-submodules", "pystray",
    "--collect-submodules", "desktop_notifier",
    "--collect-data", "desktop_notifier",
    "--collect-submodules", "winrt",
    "--collect-submodules", "keyring.backends",
    "--copy-metadata", "keyring",
    "--hidden-import", "sqlalchemy.dialects.sqlite"
)
if ($Clean) { $pyinstallerArgs += "--clean" }
if ($Console) { $pyinstallerArgs += "--console" } else { $pyinstallerArgs += "--windowed" }
$pyinstallerArgs += $EntryPoint

& $python -m PyInstaller @pyinstallerArgs
if ($LASTEXITCODE -ne 0) { Fail "PyInstaller failed" }
if (-not (Test-Path -LiteralPath $Executable)) { Fail "Expected output missing: $Executable" }

$bundledIndex = Join-Path $OutputDir "_internal\dist\index.html"
if (-not (Test-Path -LiteralPath $bundledIndex)) { Fail "Frontend was not bundled: $bundledIndex" }

Write-Host ""
Write-Host "Build succeeded: $Executable" -ForegroundColor Green

Write-Step "Install"
$finalDir = $OutputDir
$installPath = $InstallDir
if ([string]::IsNullOrWhiteSpace($installPath) -and -not $NoPrompt) {
    Write-Host "The application is ready in $OutputDir"
    $installPath = Read-Host "Type a folder to install it into, or press Enter to leave it where it was built"
}
if (-not [string]::IsNullOrWhiteSpace($installPath)) {
    $finalDir = Install-Application (Resolve-InstallTarget $installPath)
} else {
    Write-Host "Left in the build output: $OutputDir"
}

$createShortcut = [bool]$Shortcut
if (-not $Shortcut -and -not $NoShortcut -and -not $NoPrompt) {
    $createShortcut = Read-YesNo "Create a desktop shortcut pointing to $finalDir?" $true
}
if ($createShortcut) {
    New-DesktopShortcut $finalDir
}

Write-Host ""
Write-Host "Done: $(Join-Path $finalDir $ExecutableName)" -ForegroundColor Green
