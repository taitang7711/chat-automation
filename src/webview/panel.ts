/**
 * Webview Panel - Giao diện quản lý tin nhắn
 */

import * as vscode from 'vscode';
import { MessageConfig, WebviewMessage, formatDelay, parseDelay } from '../types';
import * as configService from '../services/configService';
import * as workspaceService from '../services/workspaceService';
import * as chatService from '../services/chatService';
import * as scheduleService from '../services/scheduleService';

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
  const schedule = configService.getSchedule();
  const scheduleState = scheduleService.getScheduleState();
  const sendState = chatService.getSendState();

  panel.webview.postMessage({
    command: 'refresh',
    payload: {
      workspace: workspace ? { name: workspace.name, path: workspace.path } : null,
      messages,
      schedule,
      scheduleRunning: scheduleState.isRunning,
      isSending: sendState.isSending,
      sendProgress: sendState,
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
      await configService.deleteMessage(id);
      refreshPanel();
      scheduleService.updateStatusBar();
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
      scheduleService.stopSchedule();
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

    case 'refresh': {
      refreshPanel();
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
        <div class="empty-state" id="emptyState">
          <div class="empty-state-icon">📭</div>
          <div>Chưa có tin nhắn nào</div>
          <div style="font-size: 11px; margin-top: 4px;">Nhấn "Thêm tin nhắn" để bắt đầu</div>
        </div>
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
    
    <!-- Schedule -->
    <div class="section">
      <div class="section-title">⏰ Lịch lặp lại</div>
      <div class="schedule-row">
        <span>Gửi mỗi</span>
        <input type="number" class="schedule-input" id="scheduleValue" value="30" min="1">
        <select class="schedule-select" id="scheduleUnit">
          <option value="1000">giây</option>
          <option value="60000" selected>phút</option>
          <option value="3600000">giờ</option>
        </select>
        <div class="schedule-status" id="scheduleStatus">Chưa bật</div>
      </div>
      <div class="actions-bar" style="margin-top: 12px;">
        <button class="btn-primary" id="startScheduleBtn" onclick="startSchedule()">▶️ Bắt đầu lịch</button>
        <button class="btn-secondary" id="stopScheduleBtn" onclick="stopSchedule()" style="display: none;">⏹️ Dừng lịch</button>
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
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    let state = {
      workspace: null,
      messages: [],
      schedule: null,
      scheduleRunning: false,
      isSending: false,
      sendProgress: null,
      editingId: null,
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
      renderSchedule();
      renderActions();
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
      const empty = document.getElementById('emptyState');
      const count = document.getElementById('messageCount');
      const clearBtn = document.getElementById('clearAllBtn');
      
      console.log('renderMessages - state.messages:', state.messages);
      console.log('renderMessages - messages length:', state.messages.length);
      
      const enabledCount = state.messages.filter(m => m.enabled).length;
      count.textContent = '(' + enabledCount + '/' + state.messages.length + ' đang bật)';
      
      if (state.messages.length === 0) {
        empty.style.display = 'block';
        clearBtn.style.display = 'none';
        list.innerHTML = '';
        list.appendChild(empty);
        return;
      }
      
      empty.style.display = 'none';
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
      
      console.log('renderMessages - htmlParts count:', htmlParts.length);
      const finalHTML = htmlParts.join('');
      console.log('renderMessages - finalHTML length:', finalHTML.length);
      
      list.innerHTML = finalHTML;
      
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
        alert('Vui lòng nhập nội dung tin nhắn');
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
        alert('Vui lòng nhập nội dung tin nhắn');
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
      if (confirm('Xóa tin nhắn này?')) {
        vscode.postMessage({ command: 'deleteMessage', payload: { id } });
      }
    }
    
    function clearAllMessages() {
      vscode.postMessage({ command: 'clearAllMessages' });
    }
    
    // ============ Schedule ============
    
    function renderSchedule() {
      const status = document.getElementById('scheduleStatus');
      const startBtn = document.getElementById('startScheduleBtn');
      const stopBtn = document.getElementById('stopScheduleBtn');
      const valueInput = document.getElementById('scheduleValue');
      const unitSelect = document.getElementById('scheduleUnit');
      
      if (state.scheduleRunning && state.schedule) {
        status.textContent = '🟢 Đang chạy - Gửi mỗi ' + formatDelay(state.schedule.intervalMs);
        status.className = 'schedule-status running';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
      } else {
        status.textContent = 'Chưa bật';
        status.className = 'schedule-status';
        startBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
      }
      
      if (state.schedule) {
        const ms = state.schedule.intervalMs;
        if (ms >= 3600000) {
          valueInput.value = ms / 3600000;
          unitSelect.value = '3600000';
        } else if (ms >= 60000) {
          valueInput.value = ms / 60000;
          unitSelect.value = '60000';
        } else {
          valueInput.value = ms / 1000;
          unitSelect.value = '1000';
        }
      }
    }
    
    function startSchedule() {
      const value = parseFloat(document.getElementById('scheduleValue').value) || 30;
      const unit = parseInt(document.getElementById('scheduleUnit').value);
      const intervalMs = value * unit;
      
      vscode.postMessage({ command: 'startSchedule', payload: { intervalMs } });
    }
    
    function stopSchedule() {
      vscode.postMessage({ command: 'stopSchedule' });
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
