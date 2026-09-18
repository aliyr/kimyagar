$ErrorActionPreference = 'Stop'

$javaRoot = Join-Path $env:LOCALAPPDATA 'Java'
$jdk21 = Get-ChildItem $javaRoot -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'jdk-21*' -and (Test-Path (Join-Path $_.FullName 'bin\java.exe')) } |
  Sort-Object Name -Descending |
  Select-Object -First 1
$javaHome = if ($jdk21) {
  $jdk21.FullName
} elseif ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  $env:JAVA_HOME
} else {
  throw "JDK 21 not found under $javaRoot"
}
$androidHome = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
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
Write-Host "Using JAVA_HOME=$javaHome"
& .\gradlew.bat assembleDebug --no-daemon "-Dorg.gradle.java.home=$javaHome"
if ($LASTEXITCODE -ne 0) { throw "gradlew assembleDebug failed" }

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$built = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$dest = Join-Path $outDir 'kimiagar-debug.apk'
Copy-Item $built $dest -Force
Write-Host "APK ready: $dest"
Get-Item $dest | Format-List FullName, Length, LastWriteTime
