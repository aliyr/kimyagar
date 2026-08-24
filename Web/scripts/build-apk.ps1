$ErrorActionPreference = 'Stop'

$javaHome = Join-Path $env:LOCALAPPDATA 'Java\jdk-21.0.8+9'
$androidHome = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$webRoot = Split-Path $PSScriptRoot -Parent
$androidRoot = Join-Path $webRoot 'android'
$outDir = Join-Path $webRoot 'apk'

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
$env:Path = "$javaHome\bin;$androidHome\platform-tools;$androidHome\cmdline-tools\latest\bin;$env:Path"

if (-not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
  throw "JDK not found at $javaHome"
}
if (-not (Test-Path (Join-Path $androidHome 'platforms\android-36'))) {
  throw "Android SDK platform 36 missing under $androidHome"
}

Set-Location $androidRoot
& .\gradlew.bat assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) { throw "gradlew assembleDebug failed" }

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$built = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$dest = Join-Path $outDir 'kimiagar-debug.apk'
Copy-Item $built $dest -Force
Write-Host "APK ready: $dest"
Get-Item $dest | Format-List FullName, Length, LastWriteTime
