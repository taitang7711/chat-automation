#!/usr/bin/env pwsh
# Script tự động setup và cài đặt extension

Write-Host "🚀 Chat Automation Extension - Auto Setup & Install" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Check Node.js
Write-Host "`n📋 Checking requirements..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js: $(node --version)" -ForegroundColor Green

# Check VS Code
if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Host "❌ VS Code not found! Please install VS Code first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ VS Code: Found" -ForegroundColor Green

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Check VSCE
Write-Host "`n🔧 Checking VSCE..." -ForegroundColor Yellow
if (-not (Get-Command vsce -ErrorAction SilentlyContinue)) {
    Write-Host "Installing VSCE globally..." -ForegroundColor Yellow
    npm install -g @vscode/vsce
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install VSCE!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ VSCE ready" -ForegroundColor Green

# Compile
Write-Host "`n🔨 Compiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Compile failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Compiled successfully" -ForegroundColor Green

# Package
Write-Host "`n📦 Packaging to VSIX..." -ForegroundColor Yellow
$null = "y`ny" | vsce package --allow-missing-repository --no-yarn 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Package failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Package created" -ForegroundColor Green

# Install
Write-Host "`n📥 Installing extension to VS Code..." -ForegroundColor Yellow
code --install-extension chat-automation-0.0.1.vsix
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Install may have issues, but file is ready" -ForegroundColor Yellow
} else {
    Write-Host "✓ Extension installed" -ForegroundColor Green
}

# Summary
Write-Host "`n" + "=" * 60 -ForegroundColor Gray
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 File created: chat-automation-0.0.1.vsix" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 How to use:" -ForegroundColor Yellow
Write-Host "  1. Reload VS Code window (Ctrl+Shift+P → Reload Window)" -ForegroundColor White
Write-Host "  2. Open Command Palette (Ctrl+Shift+P)" -ForegroundColor White
Write-Host "  3. Type: 'Chat Automation'" -ForegroundColor White
Write-Host "  4. Enter your message and press Send" -ForegroundColor White
Write-Host ""
Write-Host "📝 For more info: See README.md or SETUP.md" -ForegroundColor Gray
Write-Host "=" * 60 -ForegroundColor Gray
