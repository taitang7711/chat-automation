# Quick rebuild and reinstall script
# Run this after making changes to the extension

Write-Host "[BUILD] Building extension..." -ForegroundColor Cyan
npm run compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[PACKAGE] Packaging extension..." -ForegroundColor Cyan
vsce package --out chat-automation.vsix --no-dependencies

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Package failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[INSTALL] Installing extension..." -ForegroundColor Cyan
code --install-extension chat-automation.vsix --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Install failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Extension da duoc build va cai lai thanh cong!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] De ap dung changes:" -ForegroundColor Yellow
Write-Host "  => Nhan Ctrl+Shift+P" -ForegroundColor Cyan
Write-Host "  => Go 'Reload Window' va Enter" -ForegroundColor Cyan
Write-Host ""
