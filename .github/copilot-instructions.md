# GitHub Copilot Instructions - Chat Automation Extension

## Development Workflow

### QUAN TRỌNG: Sau khi code xong LUÔN LUÔN phải:

1. **Build TypeScript:**
   ```bash
   npm run compile
   ```

2. **Package extension:**
   ```bash
   vsce package --out chat-automation.vsix --no-dependencies
   ```

3. **Install vào VS Code:**
   ```bash
   code --install-extension chat-automation.vsix --force
   ```

4. **Thông báo user reload:**
   - User cần reload VS Code để áp dụng: `Ctrl+Shift+P` → `Reload Window`

### Quick Command (All-in-one):
```powershell
npm run compile; if ($LASTEXITCODE -eq 0) { 
    vsce package --out chat-automation.vsix --no-dependencies 2>&1 | Out-Null
    code --install-extension chat-automation.vsix --force
    Write-Host "`n✅ Extension đã được build và cài lại!" -ForegroundColor Green
    Write-Host "🔄 Reload VS Code để áp dụng: Ctrl+Shift+P → Reload Window" -ForegroundColor Yellow
}
```

## Critical Rules

### 1. KHÔNG BAO GIỜ gửi Timeout/Timer objects qua webview postMessage
- ❌ **SAI:** `{ timerId: nodeTimeout, intervalId: nodeInterval }`
- ✅ **ĐÚNG:** `{ isRunning: boolean }` (chỉ gửi primitives/serializable data)

### 2. Testing Extension
- Luôn test trong Extension Development Host (F5) hoặc sau khi install
- Kiểm tra console output cho errors
- Verify tất cả features hoạt động sau khi refactor

### 3. File Structure
```
src/
├── extension.ts          # Entry point
├── types/index.ts        # Type definitions
├── services/
│   ├── chatService.ts    # Send messages
│   ├── configService.ts  # Storage (workspace state)
│   ├── scheduleService.ts # Multiple schedules runner
│   └── workspaceService.ts
└── webview/
    └── panel.ts          # UI (HTML + inline JS)
```

### 4. Schedule Architecture
- **Multiple schedules:** Map<scheduleId, ScheduleState>
- **Two types:** 'interval' | 'time-based'
- **Time-based:** Uses recursive setTimeout with calculateNextRun()
- **Interval:** Uses setInterval()

### 5. Data Flow
```
User Action (Webview) 
  → postMessage to Extension
  → configService (update storage)
  → scheduleService (start/stop timers)
  → refreshPanel()
  → postMessage back to Webview
  → render UI
```

## Common Tasks

### Add new schedule type:
1. Update `ScheduleType` in `src/types/index.ts`
2. Add handler in `scheduleService.startScheduleById()`
3. Update UI form in `panel.ts`
4. Add command handler in `handleWebviewMessage()`
5. **BUILD & REINSTALL**

### Fix UI bug:
1. Edit `src/webview/panel.ts` (HTML or JS)
2. **BUILD & REINSTALL**
3. Reload VS Code
4. Test in panel

### Update config schema:
1. Update interface in `src/types/index.ts`
2. Add migration in `configService.ts` if needed
3. Update all usages
4. **BUILD & REINSTALL**

---

**REMEMBER:** VS Code extensions are compiled code. Source changes don't apply until you BUILD, PACKAGE, INSTALL, and RELOAD! 🔄
