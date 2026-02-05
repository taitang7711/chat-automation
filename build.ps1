#!/usr/bin/env pwsh
# Script tự động build extension thành .vsix

Write-Host "🔨 Building Chat Automation Extension..." -ForegroundColor Cyan

# Compile TypeScript
Write-Host "`n📦 Compiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Compile failed!" -ForegroundColor Red
    exit 1
}

# Package to VSIX
Write-Host "`n📦 Packaging to VSIX..." -ForegroundColor Yellow
$answer = "y" | vsce package --allow-missing-repository --no-yarn
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Package failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Build completed successfully!" -ForegroundColor Green
Write-Host "📦 File: chat-automation-0.0.1.vsix" -ForegroundColor Green
Write-Host "`n💡 To install: code --install-extension chat-automation-0.0.1.vsix" -ForegroundColor Cyan
