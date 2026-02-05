# 🚀 Quick Start - Chat Automation

## Người dùng lần đầu

### Windows (PowerShell):
```powershell
# Setup và cài đặt tự động
.\install.ps1
```

### Sau khi cài xong:
1. Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Mở Command Palette: `Ctrl+Shift+P`
3. Gõ: "Chat Automation"
4. Nhập tin nhắn và nhấn Gửi

---

## Developer

### Lần đầu setup:
```bash
npm install
npm install -g @vscode/vsce
```

### Test trong Development Mode:
```bash
npm run compile
# Nhấn F5
```

### Build và cài:
```powershell
.\build.ps1
code --install-extension chat-automation-0.0.1.vsix
# Reload VS Code
```

---

## Quy trình làm việc

```
Sửa code → .\build.ps1 → Cài extension → Reload → Test
```

---

**Xem thêm: [README.md](README.md) | [SETUP.md](SETUP.md)**
