/**
 * Webview Panel - Giao diện quản lý tin nhắn
 */

import * as vscode from 'vscode';
import { MessageConfig, WebviewMessage, formatDelay, parseDelay } from '../types';
import * as configService from '../services/configService';
import * as workspaceService from '../services/workspaceService';
import * as chatService from '../services/chatService';
import * as scheduleService from '../services/scheduleService';
import * as autoContinueService from '../services/autoContinueService';

let panel: vscode.WebviewPanel | null = null;

/**
 * Mở hoặc focus panel
 */
export function openPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
  if (panel) {
    panel.reveal();
    refreshPanel();
    return panel;
  }

  panel = vscode.window.createWebviewPanel(
    'chatAutomationPanel',
    'Chat Automation',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getWebviewContent();

  // Xử lý message từ webview
  panel.webview.onDidReceiveMessage(
    async (message: WebviewMessage) => {
      await handleWebviewMessage(message);
    },
    undefined,
    context.subscriptions
  );

  // Cleanup khi đóng
  panel.onDidDispose(() => {
    panel = null;
  });

  // Gửi data ban đầu
  refreshPanel();

  return panel;
}

/**
 * Đóng panel
 */
export function closePanel(): void {
  if (panel) {
    panel.dispose();
    panel = null;
  }
}

/**
 * Refresh data trong panel
 */
export function refreshPanel(): void {
  if (!panel) {
    return;
  }

  const workspace = workspaceService.getCurrentWorkspace();
  const messages = configService.getMessages();
  const schedules = configService.getSchedules();
  const scheduleStates = scheduleService.getAllScheduleStates();
  const sendState = chatService.getSendState();
  const autoContinueState = autoContinueService.getState();

  panel.webview.postMessage({
    command: 'refresh',
    payload: {
      workspace: workspace ? { name: workspace.name, path: workspace.path } : null,
      messages,
      schedules,
      scheduleStates: Array.from(scheduleStates.entries()).map(([id, state]) => ({
        id,
        isRunning: state.isRunning
      })),
      isSending: sendState.isSending,
      sendProgress: sendState,
      autoContinue: autoContinueState,
    },
  });
}

/**
 * Xử lý message từ webview
 */
async function handleWebviewMessage(message: WebviewMessage): Promise<void> {
  switch (message.command) {
    case 'addMessage': {
      const { text, delayMs } = message.payload;
      await configService.addMessage(text, delayMs);
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'updateMessage': {
      const { id, text, delayMs, enabled } = message.payload;
      await configService.updateMessage(id, { text, delayMs, enabled });
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'deleteMessage': {
      const { id } = message.payload;
      const confirm = await vscode.window.showWarningMessage(
        'Xóa tin nhắn này?',
        { modal: true },
        'Xóa'
      );
      if (confirm === 'Xóa') {
        await configService.deleteMessage(id);
        refreshPanel();
        scheduleService.updateStatusBar();
      }
      break;
    }

    case 'toggleMessage': {
      const { id } = message.payload;
      await configService.toggleMessage(id);
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'reorderMessages': {
      const { ids } = message.payload;
      await configService.reorderMessages(ids);
      refreshPanel();
      break;
    }

    case 'sendAll': {
      await chatService.sendAllFromConfig();
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'stopSending': {
      chatService.cancelSending();
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'startSchedule': {
      const { intervalMs } = message.payload;
      await scheduleService.startSchedule(intervalMs);
      refreshPanel();
      break;
    }

    case 'stopSchedule': {
      await scheduleService.stopSchedule();
      refreshPanel();
      break;
    }

    case 'clearSchedule': {
      await scheduleService.clearAndStopSchedule();
      refreshPanel();
      break;
    }

    case 'clearAllMessages': {
      const confirm = await vscode.window.showWarningMessage(
        'Xóa tất cả tin nhắn?',
        { modal: true },
        'Xóa'
      );
      if (confirm === 'Xóa') {
        await configService.clearMessages();
        refreshPanel();
        scheduleService.updateStatusBar();
      }
      break;
    }

    // ============ SCHEDULE COMMANDS ============

    case 'addIntervalSchedule': {
      const { name, intervalMs } = message.payload;
      await configService.addIntervalSchedule(name, intervalMs);
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'addTimeBasedSchedule': {
      const { name, times } = message.payload;
      await configService.addTimeBasedSchedule(name, times);
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'updateSchedule': {
      const { id, updates } = message.payload;
      await configService.updateSchedule(id, updates);
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'deleteSchedule': {
      const { id } = message.payload;
      const confirm = await vscode.window.showWarningMessage(
        'Xóa lịch này?',
        { modal: true },
        'Xóa'
      );
      if (confirm === 'Xóa') {
        await scheduleService.stopScheduleById(id);
        await configService.deleteSchedule(id);
        refreshPanel();
        scheduleService.updateStatusBar();
      }
      break;
    }

    case 'toggleSchedule': {
      const { id } = message.payload;
      await scheduleService.toggleScheduleById(id);
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'startScheduleById': {
      const { id } = message.payload;
      await scheduleService.startScheduleById(id);
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'stopScheduleById': {
      const { id } = message.payload;
      await scheduleService.stopScheduleById(id);
      refreshPanel();
      scheduleService.updateStatusBar();
      break;
    }

    case 'clearAllSchedules': {
      const confirm = await vscode.window.showWarningMessage(
        'Xóa tất cả lịch?',
        { modal: true },
        'Xóa'
      );
      if (confirm === 'Xóa') {
        await scheduleService.stopAllSchedules();
        await configService.clearSchedules();
        refreshPanel();
        scheduleService.updateStatusBar();
      }
      break;
    }

    case 'refresh': {
      refreshPanel();
      break;
    }

    // ============ AUTO-CONTINUE COMMANDS ============

    case 'startAutoContinue': {
      await autoContinueService.start();
      refreshPanel();
      break;
    }

    case 'stopAutoContinue': {
      autoContinueService.stop();
      refreshPanel();
      break;
    }

    case 'resetAutoContinueStats': {
      autoContinueService.resetStats();
      refreshPanel();
      break;
    }

    case 'copyInjectScript': {
      // Legacy - redirect to start
      await autoContinueService.start();
      refreshPanel();
      break;
    }

    case 'openDevTools': {
      await vscode.commands.executeCommand('workbench.action.toggleDevTools');
      break;
    }
  }
}

/**
 * Tạo HTML content cho webview
 */
function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Automation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
      line-height: 1.5;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    
    /* Header */
    .header {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .workspace-info {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .workspace-path {
      font-family: var(--vscode-editor-font-family, monospace);
      word-break: break-all;
    }
    
    /* Section */
    .section {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* Message List */
    .message-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .message-item {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 12px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    
    .message-item.disabled {
      opacity: 0.5;
    }
    
    .message-item.editing {
      border-color: var(--vscode-focusBorder);
    }
    
    .message-number {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }
    
    .message-content {
      flex: 1;
      min-width: 0;
    }
    
    .message-text {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      margin-bottom: 8px;
      max-height: 100px;
      overflow-y: auto;
    }
    
    .message-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    
    .message-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    
    /* Buttons */
    button {
      padding: 6px 12px;
      font-size: 12px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
      transition: opacity 0.15s;
    }
    
    button:hover {
      opacity: 0.9;
    }
    
    button:active {
      opacity: 0.8;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    
    .btn-danger {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
    }
    
    .btn-icon {
      padding: 4px 8px;
      background: transparent;
      color: var(--vscode-foreground);
    }
    
    .btn-icon:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }
    
    /* Form */
    .form-group {
      margin-bottom: 12px;
    }
    
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    input, textarea, select {
      width: 100%;
      padding: 8px;
      font-size: 13px;
      font-family: inherit;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
    }
    
    input:focus, textarea:focus, select:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }
    
    textarea {
      min-height: 100px;
      resize: vertical;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    
    .form-row {
      display: flex;
      gap: 12px;
    }
    
    .form-row > * {
      flex: 1;
    }
    
    /* Add Message Form */
    .add-form {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    
    .add-form.visible {
      display: block;
    }
    
    /* Schedule */
    .schedule-row {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .schedule-input {
      width: 80px;
      text-align: center;
    }
    
    .schedule-select {
      width: 100px;
    }
    
    .schedule-status {
      flex: 1;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    
    .schedule-status.running {
      color: var(--vscode-charts-green);
    }
    
    /* Actions Bar */
    .actions-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--vscode-descriptionForeground);
    }
    
    .empty-state-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    
    /* Checkbox */
    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    
    .checkbox input {
      width: auto;
    }
    
    /* Progress */
    .progress-bar {
      height: 4px;
      background: var(--vscode-progressBar-background);
      border-radius: 2px;
      overflow: hidden;
      margin: 8px 0;
    }
    
    .progress-bar-fill {
      height: 100%;
      background: var(--vscode-button-background);
      transition: width 0.3s;
    }
    
    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }
    
    .status-badge.active {
      background: var(--vscode-testing-iconPassed);
      color: white;
    }
    
    .status-badge.inactive {
      background: var(--vscode-descriptionForeground);
      color: var(--vscode-editor-background);
    }

    /* Drag handle */
    .drag-handle {
      cursor: grab;
      color: var(--vscode-descriptionForeground);
      padding: 4px;
    }
    
    .drag-handle:hover {
      color: var(--vscode-foreground);
    }
    
    .message-item.dragging {
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>💬 Chat Automation</h1>
      <div class="workspace-info">
        <span id="workspaceName">Loading...</span>
        <div class="workspace-path" id="workspacePath"></div>
      </div>
    </div>
    
    <!-- Messages -->
    <div class="section">
      <div class="section-title">
        📝 Danh sách tin nhắn
        <span id="messageCount" style="font-weight: normal; color: var(--vscode-descriptionForeground);"></span>
      </div>
      
      <div class="message-list" id="messageList">
        <!-- Messages will be rendered here dynamically -->
      </div>
      
      <!-- Add Form -->
      <div class="add-form" id="addForm">
        <div class="form-group">
          <label class="form-label">Nội dung tin nhắn</label>
          <textarea id="newMessageText" placeholder="Nhập tin nhắn (có thể nhiều dòng)..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Delay trước khi gửi</label>
            <input type="text" id="newMessageDelay" value="2s" placeholder="VD: 2s, 500ms, 1m">
          </div>
        </div>
        <div class="actions-bar">
          <button class="btn-primary" onclick="saveNewMessage()">✓ Lưu</button>
          <button class="btn-secondary" onclick="hideAddForm()">✗ Hủy</button>
        </div>
      </div>
      
      <div class="actions-bar" style="margin-top: 12px;">
        <button class="btn-secondary" onclick="showAddForm()">+ Thêm tin nhắn</button>
        <button class="btn-secondary" id="clearAllBtn" onclick="clearAllMessages()">🗑️ Xóa tất cả</button>
      </div>
    </div>
    
    <!-- Schedules -->
    <div class="section">
      <div class="section-title">
        ⏰ Lịch gửi tự động
        <span id="scheduleCount" style="font-weight: normal; color: var(--vscode-descriptionForeground);"></span>
      </div>
      
      <div class="message-list" id="scheduleList">
        <!-- Schedules will be rendered here dynamically -->
      </div>
      
      <!-- Add Schedule Form -->
      <div class="add-form" id="addScheduleForm">
        <div class="form-group">
          <label class="form-label">Tên lịch</label>
          <input type="text" id="newScheduleName" placeholder="VD: Gửi buổi sáng">
        </div>
        <div class="form-group">
          <label class="form-label">Loại lịch</label>
          <select id="newScheduleType" onchange="toggleScheduleTypeForm()">
            <option value="interval">Lặp lại theo khoảng thời gian</option>
            <option value="time-based">Chạy vào giờ cụ thể</option>
          </select>
        </div>
        
        <!-- Interval Form -->
        <div id="intervalForm" class="form-row">
          <div class="form-group">
            <label class="form-label">Mỗi</label>
            <input type="number" id="intervalValue" value="30" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Đơn vị</label>
            <select id="intervalUnit">
              <option value="60000" selected>phút</option>
              <option value="3600000">giờ</option>
              <option value="86400000">ngày</option>
            </select>
          </div>
        </div>
        
        <!-- Time-Based Form -->
        <div id="timeBasedForm" class="form-group" style="display: none;">
          <label class="form-label">Giờ chạy (HH:MM, mỗi dòng một giờ)</label>
          <textarea id="scheduleTimes" placeholder="07:00\n12:00\n18:00" style="min-height: 80px;"></textarea>
          <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 4px;">
            Format 24h, VD: 07:00, 14:30, 22:00
          </div>
        </div>
        
        <div class="actions-bar">
          <button class="btn-primary" onclick="saveNewSchedule()">✓ Lưu lịch</button>
          <button class="btn-secondary" onclick="hideAddScheduleForm()">✗ Hủy</button>
        </div>
      </div>
      
      <div class="actions-bar" style="margin-top: 12px;">
        <button class="btn-primary" onclick="showAddScheduleForm()">+ Thêm lịch</button>
        <button class="btn-danger" id="clearAllSchedulesBtn" onclick="clearAllSchedules()" style="display: none;">🗑️ Xóa tất cả</button>
      </div>
    </div>
    
    <!-- Main Actions -->
    <div class="section">
      <div class="section-title">🚀 Hành động</div>
      <div class="actions-bar">
        <button class="btn-primary" id="sendAllBtn" onclick="sendAll()">▶️ Gửi tất cả ngay</button>
        <button class="btn-danger" id="stopBtn" onclick="stopSending()" style="display: none;">⏹️ Dừng gửi</button>
        <button class="btn-secondary" onclick="refresh()">🔄 Làm mới</button>
      </div>
      <div id="sendProgress" style="display: none; margin-top: 12px;">
        <div class="progress-bar">
          <div class="progress-bar-fill" id="progressFill" style="width: 0%"></div>
        </div>
        <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">
          Đang gửi <span id="progressText">0/0</span>
        </div>
      </div>
    </div>
    
    <!-- Auto-Continue Section -->
    <div class="section">
      <div class="section-title">🔄 Auto-Continue (Inject Script v2)</div>
      <p style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 12px;">
        Inject script để tự động: mở Sessions Sidebar, tìm sessions unread/in-progress, switch và click Continue/Allow.
      </p>
      
      <div class="actions-bar">
        <button class="btn-primary" id="autoContinueToggleBtn" onclick="toggleAutoContinue()">🚀 Bắt đầu (Auto-Setup)</button>
        <button class="btn-secondary" id="resetStatsBtn" onclick="resetAutoContinueStats()">🔄 Reset</button>
      </div>
      
      <div id="autoContinueStatus" style="margin-top: 12px;">
        <div id="autoContinueStatusText" style="font-size: 12px; color: var(--vscode-descriptionForeground);">
          Chưa setup
        </div>
      </div>
      
      <div style="margin-top: 16px; padding: 12px; background: var(--vscode-textBlockQuote-background); border-radius: 6px; font-size: 11px;">
        <strong>📌 Cách hoạt động (1-click setup):</strong>
        <ul style="margin: 8px 0 0 16px; padding: 0;">
          <li><strong>Click "Bắt đầu"</strong> → Auto copy script + mở DevTools</li>
          <li>Chuyển sang tab <strong>Console</strong> trong DevTools</li>
          <li><strong>Paste (Ctrl+V)</strong> và Enter → Done!</li>
          <li>Script sẽ tự động:
            <ul style="margin: 4px 0 0 16px;">
              <li>✅ Mở Sessions Sidebar</li>
              <li>✅ Tìm sessions unread/in-progress</li>
              <li>✅ Switch sessions và click Continue/Allow</li>
              <li>✅ Check mỗi 3 giây</li>
            </ul>
          </li>
          <li>Dừng: Gõ <code>window.stopAutoContinue()</code></li>
        </ul>
      </div>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    let state = {
      workspace: null,
      messages: [],
      schedules: [],
      scheduleStates: [],
      isSending: false,
      sendProgress: null,
      editingId: null,
      editingScheduleId: null,
      autoContinue: null,
    };
    
    // ============ State Management ============
    
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'refresh') {
        state = { ...state, ...message.payload };
        render();
      }
    });
    
    function render() {
      renderWorkspace();
      renderMessages();
      renderSchedules();
      renderActions();
      renderAutoContinue();
    }
    
    // ============ Workspace ============
    
    function renderWorkspace() {
      const el = document.getElementById('workspaceName');
      const pathEl = document.getElementById('workspacePath');
      
      if (state.workspace) {
        el.textContent = '📂 ' + state.workspace.name;
        pathEl.textContent = state.workspace.path;
      } else {
        el.textContent = '⚠️ Không có workspace';
        pathEl.textContent = 'Vui lòng mở một thư mục để sử dụng';
      }
    }
    
    // ============ Messages ============
    
    function renderMessages() {
      const list = document.getElementById('messageList');
      const count = document.getElementById('messageCount');
      const clearBtn = document.getElementById('clearAllBtn');
      
      const enabledCount = state.messages.filter(m => m.enabled).length;
      count.textContent = '(' + enabledCount + '/' + state.messages.length + ' đang bật)';
      
      if (state.messages.length === 0) {
        clearBtn.style.display = 'none';
        list.innerHTML = '<div class="empty-state">' +
          '<div class="empty-state-icon">📭</div>' +
          '<div>Chưa có tin nhắn nào</div>' +
          '<div style="font-size: 11px; margin-top: 4px;">Nhấn "Thêm tin nhắn" để bắt đầu</div>' +
        '</div>';
        return;
      }
      
      clearBtn.style.display = 'inline-flex';
      
      const htmlParts = state.messages.map((msg, index) => {
        const isEditing = state.editingId === msg.id;
        return '<div class="message-item ' + (!msg.enabled ? 'disabled' : '') + ' ' + (isEditing ? 'editing' : '') + '" data-id="' + msg.id + '">' +
          '<div class="drag-handle" draggable="true" title="Kéo để sắp xếp">⠿</div>' +
          '<div class="message-number">' + (index + 1) + '</div>' +
          '<div class="message-content">' +
            (isEditing ? renderEditForm(msg) : renderMessageView(msg)) +
          '</div>' +
          '<div class="message-actions">' +
            '<button class="btn-icon" onclick="toggleMessage(\\''+msg.id+'\\')\" title="' + (msg.enabled ? 'Tắt' : 'Bật') + '">' + (msg.enabled ? '✅' : '⬜') + '</button>' +
            (isEditing 
              ? '<button class="btn-icon" onclick="saveEdit(\\''+msg.id+'\\')\" title="Lưu">💾</button><button class="btn-icon" onclick="cancelEdit()" title="Hủy">❌</button>'
              : '<button class="btn-icon" onclick="editMessage(\\''+msg.id+'\\')\" title="Sửa">✏️</button>') +
            '<button class="btn-icon" onclick="deleteMessage(\\''+msg.id+'\\')\" title="Xóa">🗑️</button>' +
          '</div>' +
        '</div>';
      });
      
      list.innerHTML = htmlParts.join('');
      setupDragDrop();
    }
    
    function renderMessageView(msg) {
      return '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
        '<div class="message-meta">' +
          '<span>⏱️ Delay: ' + formatDelay(msg.delayMs) + '</span>' +
        '</div>';
    }
    
    function renderEditForm(msg) {
      return '<div class="form-group">' +
        '<textarea id="editText-' + msg.id + '">' + escapeHtml(msg.text) + '</textarea>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<input type="text" id="editDelay-' + msg.id + '" value="' + formatDelay(msg.delayMs) + '" placeholder="VD: 2s">' +
        '</div>' +
      '</div>';
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function formatDelay(ms) {
      if (ms < 1000) return ms + 'ms';
      if (ms < 60000) return (ms / 1000).toFixed(1).replace(/\\.0$/, '') + 's';
      if (ms < 3600000) return (ms / 60000).toFixed(1).replace(/\\.0$/, '') + 'm';
      return (ms / 3600000).toFixed(1).replace(/\\.0$/, '') + 'h';
    }
    
    function parseDelay(input) {
      const match = input.trim().match(/^([\\d.]+)\\s*(ms|s|m|h)?$/i);
      if (!match) return 2000;
      
      const value = parseFloat(match[1]);
      const unit = (match[2] || 's').toLowerCase();
      
      switch (unit) {
        case 'ms': return Math.round(value);
        case 's': return Math.round(value * 1000);
        case 'm': return Math.round(value * 60000);
        case 'h': return Math.round(value * 3600000);
        default: return Math.round(value * 1000);
      }
    }
    
    // ============ Drag & Drop ============
    
    function setupDragDrop() {
      const list = document.getElementById('messageList');
      const items = list.querySelectorAll('.message-item');
      let draggedItem = null;
      
      items.forEach(item => {
        const handle = item.querySelector('.drag-handle');
        
        handle.addEventListener('dragstart', e => {
          draggedItem = item;
          item.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });
        
        handle.addEventListener('dragend', () => {
          item.classList.remove('dragging');
          draggedItem = null;
          
          // Lấy thứ tự mới
          const newOrder = Array.from(list.querySelectorAll('.message-item')).map(el => el.dataset.id);
          vscode.postMessage({ command: 'reorderMessages', payload: { ids: newOrder } });
        });
        
        item.addEventListener('dragover', e => {
          e.preventDefault();
          if (!draggedItem || draggedItem === item) return;
          
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (e.clientY < midY) {
            list.insertBefore(draggedItem, item);
          } else {
            list.insertBefore(draggedItem, item.nextSibling);
          }
        });
      });
    }
    
    // ============ Message Actions ============
    
    function showAddForm() {
      document.getElementById('addForm').classList.add('visible');
      document.getElementById('newMessageText').focus();
    }
    
    function hideAddForm() {
      document.getElementById('addForm').classList.remove('visible');
      document.getElementById('newMessageText').value = '';
      document.getElementById('newMessageDelay').value = '2s';
    }
    
    function saveNewMessage() {
      const text = document.getElementById('newMessageText').value.trim();
      const delayStr = document.getElementById('newMessageDelay').value;
      
      if (!text) {
        const textarea = document.getElementById('newMessageText');
        textarea.style.borderColor = 'red';
        textarea.focus();
        setTimeout(() => { textarea.style.borderColor = ''; }, 2000);
        return;
      }
      
      const delayMs = parseDelay(delayStr);
      vscode.postMessage({ command: 'addMessage', payload: { text, delayMs } });
      hideAddForm();
    }
    
    function editMessage(id) {
      state.editingId = id;
      renderMessages();
      const textarea = document.getElementById('editText-' + id);
      if (textarea) textarea.focus();
    }
    
    function cancelEdit() {
      state.editingId = null;
      renderMessages();
    }
    
    function saveEdit(id) {
      const text = document.getElementById('editText-' + id).value.trim();
      const delayStr = document.getElementById('editDelay-' + id).value;
      
      if (!text) {
        const textarea = document.getElementById('editText-' + id);
        textarea.style.borderColor = 'red';
        textarea.focus();
        setTimeout(() => { textarea.style.borderColor = ''; }, 2000);
        return;
      }
      
      const delayMs = parseDelay(delayStr);
      vscode.postMessage({ command: 'updateMessage', payload: { id, text, delayMs } });
      state.editingId = null;
    }
    
    function toggleMessage(id) {
      vscode.postMessage({ command: 'toggleMessage', payload: { id } });
    }
    
    function deleteMessage(id) {
      vscode.postMessage({ command: 'deleteMessage', payload: { id } });
    }
    
    function clearAllMessages() {
      vscode.postMessage({ command: 'clearAllMessages' });
    }
    
    // ============ Schedule ============
    
    // ============ Schedules ============
    
    function renderSchedules() {
      const list = document.getElementById('scheduleList');
      const count = document.getElementById('scheduleCount');
      const clearBtn = document.getElementById('clearAllSchedulesBtn');
      
      const runningCount = state.scheduleStates.filter(s => s.isRunning).length;
      const enabledCount = state.schedules.filter(s => s.enabled).length;
      count.textContent = '(' + runningCount + '/' + state.schedules.length + ' đang chạy)';
      
      if (state.schedules.length === 0) {
        clearBtn.style.display = 'none';
        list.innerHTML = '<div class="empty-state">' +
          '<div class="empty-state-icon">📅</div>' +
          '<div>Chưa có lịch nào</div>' +
          '<div style="font-size: 11px; margin-top: 4px;">Nhấn "Thêm lịch" để bắt đầu</div>' +
        '</div>';
        return;
      }
      
      clearBtn.style.display = 'inline-flex';
      
      list.innerHTML = state.schedules.map((schedule, index) => {
        const isRunning = state.scheduleStates.some(s => s.id === schedule.id && s.isRunning);
        const isEditing = state.editingScheduleId === schedule.id;
        
        let scheduleInfo = '';
        if (schedule.scheduleType === 'interval' && schedule.intervalMs) {
          scheduleInfo = 'Mỗi ' + formatDelay(schedule.intervalMs);
        } else if (schedule.scheduleType === 'time-based' && schedule.times) {
          scheduleInfo = 'Vào ' + schedule.times.join(', ');
        }
        
        return '<div class="message-item ' + (!schedule.enabled ? 'disabled' : '') + '" data-id="' + schedule.id + '">' +
          '<div class="message-number">' + (index + 1) + '</div>' +
          '<div class="message-content">' +
            '<div class="message-text" style="font-weight: 500;">' + escapeHtml(schedule.name) + '</div>' +
            '<div class="message-meta">' +
              '<span>📅 ' + (schedule.scheduleType === 'interval' ? 'Lặp lại' : 'Giờ cố định') + '</span>' +
              '<span>⏱️ ' + scheduleInfo + '</span>' +
              (isRunning ? '<span style="color: var(--vscode-charts-green);">🟢 Đang chạy</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="message-actions">' +
            '<button class="btn-icon" onclick="toggleSchedule(\\''+schedule.id+'\\')\" title="' + (schedule.enabled ? 'Tắt' : 'Bật') + '">' + (schedule.enabled ? '✅' : '⬜') + '</button>' +
            (isRunning 
              ? '<button class="btn-icon" onclick="stopScheduleById(\\''+schedule.id+'\\')\" title="Dừng">⏹️</button>'
              : '<button class="btn-icon" onclick="startScheduleById(\\''+schedule.id+'\\')\" title="Chạy">▶️</button>') +
            '<button class="btn-icon" onclick="deleteSchedule(\\''+schedule.id+'\\')\" title="Xóa">🗑️</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    
    function showAddScheduleForm() {
      document.getElementById('addScheduleForm').classList.add('visible');
      document.getElementById('newScheduleName').focus();
    }
    
    function hideAddScheduleForm() {
      document.getElementById('addScheduleForm').classList.remove('visible');
      document.getElementById('newScheduleName').value = '';
      document.getElementById('intervalValue').value = '30';
      document.getElementById('intervalUnit').value = '60000';
      document.getElementById('scheduleTimes').value = '';
      document.getElementById('newScheduleType').value = 'interval';
      toggleScheduleTypeForm();
    }
    
    function toggleScheduleTypeForm() {
      const type = document.getElementById('newScheduleType').value;
      const intervalForm = document.getElementById('intervalForm');
      const timeBasedForm = document.getElementById('timeBasedForm');
      
      if (type === 'interval') {
        intervalForm.style.display = 'flex';
        timeBasedForm.style.display = 'none';
      } else {
        intervalForm.style.display = 'none';
        timeBasedForm.style.display = 'block';
      }
    }
    
    function saveNewSchedule() {
      const name = document.getElementById('newScheduleName').value.trim();
      const type = document.getElementById('newScheduleType').value;
      
      if (!name) {
        const input = document.getElementById('newScheduleName');
        input.style.borderColor = 'red';
        input.focus();
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
        return;
      }
      
      if (type === 'interval') {
        const value = parseFloat(document.getElementById('intervalValue').value) || 30;
        const unit = parseInt(document.getElementById('intervalUnit').value);
        const intervalMs = value * unit;
        
        vscode.postMessage({ 
          command: 'addIntervalSchedule', 
          payload: { name, intervalMs } 
        });
      } else {
        const timesText = document.getElementById('scheduleTimes').value.trim();
        if (!timesText) {
          const textarea = document.getElementById('scheduleTimes');
          textarea.style.borderColor = 'red';
          textarea.focus();
          setTimeout(() => { textarea.style.borderColor = ''; }, 2000);
          return;
        }
        
        const times = timesText.split('\\n').map(t => t.trim()).filter(t => t);
        
        // Validate time format
        const invalidTimes = times.filter(t => !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));
        if (invalidTimes.length > 0) {
          const textarea = document.getElementById('scheduleTimes');
          textarea.style.borderColor = 'red';
          textarea.focus();
          textarea.placeholder = 'Lỗi: ' + invalidTimes.join(', ') + ' - Format: HH:MM';
          setTimeout(() => { 
            textarea.style.borderColor = ''; 
            textarea.placeholder = '07:00\\n12:00\\n18:00';
          }, 3000);
          return;
        }
        
        vscode.postMessage({ 
          command: 'addTimeBasedSchedule', 
          payload: { name, times } 
        });
      }
      
      hideAddScheduleForm();
    }
    
    function toggleSchedule(id) {
      vscode.postMessage({ command: 'toggleSchedule', payload: { id } });
    }
    
    function startScheduleById(id) {
      vscode.postMessage({ command: 'startScheduleById', payload: { id } });
    }
    
    function stopScheduleById(id) {
      vscode.postMessage({ command: 'stopScheduleById', payload: { id } });
    }
    
    function deleteSchedule(id) {
      vscode.postMessage({ command: 'deleteSchedule', payload: { id } });
    }
    
    function clearAllSchedules() {
      vscode.postMessage({ command: 'clearAllSchedules' });
    }
    
    // ============ Actions ============
    
    function renderActions() {
      const sendBtn = document.getElementById('sendAllBtn');
      const stopBtn = document.getElementById('stopBtn');
      const progress = document.getElementById('sendProgress');
      
      if (state.isSending) {
        sendBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        progress.style.display = 'block';
        
        if (state.sendProgress) {
          const pct = ((state.sendProgress.currentIndex + 1) / state.sendProgress.totalMessages) * 100;
          document.getElementById('progressFill').style.width = pct + '%';
          document.getElementById('progressText').textContent = 
            (state.sendProgress.currentIndex + 1) + '/' + state.sendProgress.totalMessages;
        }
      } else {
        sendBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
        progress.style.display = 'none';
      }
      
      const enabledCount = state.messages.filter(m => m.enabled).length;
      sendBtn.disabled = enabledCount === 0;
      sendBtn.textContent = enabledCount > 0 
        ? '▶️ Gửi tất cả (' + enabledCount + ')' 
        : '▶️ Không có tin nhắn';
    }
    
    function sendAll() {
      vscode.postMessage({ command: 'sendAll' });
    }
    
    function stopSending() {
      vscode.postMessage({ command: 'stopSending' });
    }
    
    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }
    
    // ============ Auto-Continue ============
    
    function renderAutoContinue() {
      const statusText = document.getElementById('autoContinueStatusText');
      const toggleBtn = document.getElementById('autoContinueToggleBtn');
      
      if (state.autoContinue && state.autoContinue.isRunning) {
        statusText.innerHTML = '<span style="color: var(--vscode-terminal-ansiGreen);">Ready! Paste script in DevTools Console</span>';
        toggleBtn.textContent = '🔄 Copy Script lại';
        toggleBtn.className = 'btn-secondary';
      } else {
        statusText.innerHTML = '<span style="color: var(--vscode-descriptionForeground);">Chua setup</span>';
        toggleBtn.textContent = 'Bat dau (Auto-Setup)';
        toggleBtn.className = 'btn-primary';
      }
    }
    
    function toggleAutoContinue() {
      if (state.autoContinue && state.autoContinue.isRunning) {
        vscode.postMessage({ command: 'stopAutoContinue' });
      } else {
        vscode.postMessage({ command: 'startAutoContinue' });
      }
    }
    
    function resetAutoContinueStats() {
      vscode.postMessage({ command: 'resetAutoContinueStats' });
    }
    
    // Legacy functions (keep for compatibility)
    function copyInjectScript() {
      vscode.postMessage({ command: 'startAutoContinue' });
    }
    
    function openDevTools() {
      vscode.postMessage({ command: 'openDevTools' });
    }
    
    function startAutoContinue() {
      vscode.postMessage({ command: 'startAutoContinue' });
    }
    
    function stopAutoContinue() {
      vscode.postMessage({ command: 'stopAutoContinue' });
    }
    
    // ============ Init ============
    
    // Handle Ctrl+Enter in textarea
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') {
        const addForm = document.getElementById('addForm');
        if (addForm.classList.contains('visible')) {
          saveNewMessage();
        } else if (state.editingId) {
          saveEdit(state.editingId);
        }
      }
    });
    
    // Request initial data
    vscode.postMessage({ command: 'refresh' });
  </script>
</body>
</html>`;
}
