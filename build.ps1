#!/usr/bin/env pwsh
# Script build, uninstall, install extension

Write-Host "Building Chat Automation Extension..." -ForegroundColor Cyan

# Uninstall old version
Write-Host "`nUninstalling old version..." -ForegroundColor Yellow
code --uninstall-extension local.chat-automation
Start-Sleep -Milliseconds 500

# Compile TypeScript
Write-Host "`nCompiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compile failed!" -ForegroundColor Red
    exit 1
}

# Package to VSIX
Write-Host "`nPackaging to VSIX..." -ForegroundColor Yellow
$answer = "y" | vsce package --allow-missing-repository --no-yarn
if ($LASTEXITCODE -ne 0) {
    Write-Host "Package failed!" -ForegroundColor Red
    exit 1
}

# Install new version
Write-Host "`nInstalling new version..." -ForegroundColor Yellow
code --install-extension chat-automation-0.0.1.vsix --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "Install failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nBuild and install completed!" -ForegroundColor Green
Write-Host "File: chat-automation-0.0.1.vsix" -ForegroundColor Green
Write-Host "`nRestart VS Code or reload window!" -ForegroundColor Yellow
Write-Host "Command: Developer: Reload Window (Ctrl+R)" -ForegroundColor Cyan
