$ErrorActionPreference = "Stop"

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH

Write-Host "Running Expo Prebuild to sync changes..."
npx expo prebuild -p android --clean

Write-Host "Navigating to Android directory..."
Set-Location android

Write-Host "Starting Gradle build (assembleRelease)..."
.\gradlew assembleRelease

Write-Host "Done!"
