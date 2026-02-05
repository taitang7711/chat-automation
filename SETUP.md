# 🚀 Hướng dẫn Setup và Build Extension

## 📋 Yêu cầu

- Node.js (v16 trở lên)
- VS Code
- Git (tùy chọn)

## 🔧 Setup lần đầu

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cài đặt VSCE (chỉ cần 1 lần)
```bash
npm install -g @vscode/vsce
```

## 🛠️ Quy trình phát triển

### Sau khi sửa code:

**Cách 1: Dùng script tự động (Khuyên dùng)**
```powershell
.\build.ps1
```

**Cách 2: Dùng npm**
```bash
npm run build
```

**Cách 3: Từng bước thủ công**
```bash
# Compile TypeScript
npm run compile

# Build thành .vsix
vsce package --allow-missing-repository --no-yarn
```

## 📦 Cài đặt Extension

### Sau khi build xong, cài vào VS Code:
```bash
code --install-extension chat-automation-0.0.1.vsix
```

### Hoặc cài thủ công:
1. Mở VS Code
2. Vào Extensions (Ctrl+Shift+X)
3. Click `...` → "Install from VSIX..."
4. Chọn file `chat-automation-0.0.1.vsix`

## 🔄 Quy trình hoàn chỉnh (từ sửa code → cài đặt)

```powershell
# 1. Sửa code trong src/extension.ts
# 2. Build
.\build.ps1

# 3. Cài đặt (ghi đè phiên bản cũ)
code --install-extension chat-automation-0.0.1.vsix

# 4. Reload VS Code
# Ctrl+Shift+P → "Developer: Reload Window"
```

## 🧪 Test Extension

### Trong Development Mode:
```bash
# 1. Compile
npm run compile

# 2. Nhấn F5 trong VS Code
# Extension Development Host sẽ mở
```

### Test phiên bản đã build:
```bash
# 1. Build và cài
.\build.ps1
code --install-extension chat-automation-0.0.1.vsix

# 2. Reload Window
# 3. Test: Ctrl+Shift+P → "Chat Automation"
```

## 📝 Cấu trúc Project

```
chat-automation/
├── src/
│   └── extension.ts          # Code chính
├── out/                       # Compiled JS (tự động tạo)
├── package.json              # Config extension
├── tsconfig.json             # TypeScript config
├── build.ps1                 # Script build tự động
├── README.md                 # Hướng dẫn chính
└── SETUP.md                  # File này
```

## ⚡ Quick Commands

| Lệnh | Chức năng |
|------|-----------|
| `npm install` | Cài dependencies |
| `npm run compile` | Compile TypeScript |
| `npm run build` | Build thành .vsix |
| `.\build.ps1` | Build tự động (PowerShell) |
| `code --install-extension *.vsix` | Cài extension |
| `F5` | Test trong Dev Mode |

## 🎯 Sử dụng Extension

1. **Ctrl+Shift+P** (Command Palette)
2. Gõ: **"Chat Automation"**
3. Nhập tin nhắn trong giao diện
4. **Gửi** hoặc **Ctrl+Enter**

## 🐛 Troubleshooting

### Extension không hiện trong Command Palette?
- Reload Window: Ctrl+Shift+P → "Developer: Reload Window"
- Hoặc restart VS Code

### Build lỗi?
```bash
# Xóa cache và build lại
rm -r out/
npm run compile
```

### Cài extension lỗi?
- Gỡ phiên bản cũ trước:
  - Extensions → Tìm "Chat Automation" → Uninstall
- Cài lại: `code --install-extension chat-automation-0.0.1.vsix`

## 📚 Tài liệu thêm

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)

---

**Made with ❤️ for VS Code automation**
