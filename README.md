# Chat Automation v0.1.0 (VS Code Extension)

Extension tự động gửi tin nhắn vào VS Code Chat với:
- 📂 **Nhận diện workspace** - Mỗi project có bộ tin nhắn riêng
- 📝 **Quản lý nhiều tin nhắn** - Danh sách tin nhắn với drag & drop
- ⏱️ **Delay tùy chỉnh** - Mỗi tin nhắn có delay riêng (2s, 500ms, 1m, ...)
- 🚀 **Gửi hàng loạt** - Gửi tất cả tin nhắn với progress bar + cancel
- ⏰ **Lịch lặp lại** - Tự động gửi mỗi X phút/giờ

## 🚀 Cài đặt nhanh (cho người dùng mới)

### Tự động hoàn toàn (Khuyên dùng):
```powershell
.\install.ps1
```

Script sẽ tự động:
- ✅ Kiểm tra yêu cầu (Node.js, VS Code)
- ✅ Cài đặt dependencies
- ✅ Cài đặt VSCE
- ✅ Compile code
- ✅ Build thành .vsix
- ✅ Cài vào VS Code

### Thủ công:
```bash
# 1. Cài dependencies
npm install

# 2. Cài VSCE (nếu chưa có)
npm install -g @vscode/vsce

# 3. Build và cài
npm run build
code --install-extension chat-automation-0.0.1.vsix
```

## ✨ Tính năng

- 🎨 **Giao diện đẹp**: Webview với textarea hỗ trợ nhiều dòng
- ⌨️ **Phím tắt**: Ctrl+Enter để gửi nhanh
- 🚀 **Tự động**: Tạo chat mới và gửi tin nhắn tự động
- 🎯 **Dễ dùng**: Mở Command Palette (Ctrl+Shift+P) → gõ "Chat Automation"

## 📦 Cài đặt

```bash
code --install-extension chat-automation-0.0.1.vsix
```

Hoặc: Extensions → `...` → Install from VSIX...

## 🛠️ Development

### Cài đặt dependencies
```bash
npm install
```

### Compile
```bash
npm run compile
```

### Test extension
Nhấn `F5` để mở Extension Development Host

### Build thành .vsix

**Cách 1: Dùng script tự động**
```powershell
.\build.ps1
```

**Cách 2: Dùng npm script**
```bash
npm run build
# hoặc
npm run package
```

**Cách 3: Thủ công**
```bash
npm run compile
vsce package --allow-missing-repository --no-yarn
```

## 📝 Quy trình làm việc

Sau khi chỉnh sửa code:
1. Chỉ cần chạy: `.\build.ps1` hoặc `npm run build`
2. File `.vsix` sẽ được tạo tự động
3. Cài đặt lại extension để test

## 🎯 Sử dụng

1. Mở Command Palette: `Ctrl+Shift+P`
2. Gõ: "Chat Automation: New chat + send"
3. Nhập tin nhắn trong giao diện (hỗ trợ nhiều dòng)
4. Nhấn "Gửi" hoặc `Ctrl+Enter`

> **Lưu ý**: Extension sử dụng các command nội bộ của VS Code, có thể khác nhau giữa các phiên bản.

## � Tài liệu bổ sung

- **[SETUP.md](SETUP.md)** - Hướng dẫn chi tiết setup và phát triển
- **[install.ps1](install.ps1)** - Script tự động cài đặt
- **[build.ps1](build.ps1)** - Script tự động build

## 🔄 Workflow cho người mới

```powershell
# Lần đầu setup (chỉ 1 lần)
.\install.ps1

# Sau khi sửa code
.\build.ps1
code --install-extension chat-automation-0.0.1.vsix

# Reload VS Code: Ctrl+Shift+P → "Reload Window"
```

## 👨‍💻 Development Workflow

**QUAN TRỌNG:** Sau khi sửa code, LUÔN phải build và reinstall:

### Cách nhanh nhất (khuyên dùng):
```powershell
.\rebuild.ps1
```

### Hoặc chạy từng bước:
```powershell
# 1. Compile TypeScript
npm run compile

# 2. Package thành .vsix
vsce package --out chat-automation.vsix --no-dependencies

# 3. Install vào VS Code
code --install-extension chat-automation.vsix --force

# 4. Reload VS Code để áp dụng
# Ctrl+Shift+P → "Reload Window"
```

### Testing:
- **F5**: Launch Extension Development Host
- **Ctrl+R**: Reload Extension Host
- Mở panel: Click "Chat Auto" ở Status Bar

📖 Chi tiết xem [.github/copilot-instructions.md](.github/copilot-instructions.md)

## 📄 License

MIT

MIT
