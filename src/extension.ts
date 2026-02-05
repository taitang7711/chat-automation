/**
 * Chat Automation Extension - Entry Point
 * 
 * Tự động gửi tin nhắn vào VS Code Chat với:
 * - Nhận diện workspace
 * - Quản lý nhiều tin nhắn theo project
 * - Gửi hàng loạt với delay tùy chỉnh
 * - Lịch lặp lại
 */

import * as vscode from 'vscode';
import * as configService from './services/configService';
import * as chatService from './services/chatService';
import * as scheduleService from './services/scheduleService';
import * as workspaceService from './services/workspaceService';
import * as panel from './webview/panel';

export function activate(context: vscode.ExtensionContext) {
  console.log('Chat Automation extension activated');

  // Khởi tạo services
  configService.initConfigService(context);
  scheduleService.initStatusBar(context);

  // Đăng ký commands
  const commands = [
    // Mở bảng điều khiển (command chính)
    vscode.commands.registerCommand('chatAutomation.openPanel', () => {
      panel.openPanel(context);
    }),

    // Alias cho command cũ
    vscode.commands.registerCommand('chatAutomation.run', () => {
      panel.openPanel(context);
    }),

    // Gửi tất cả tin nhắn
    vscode.commands.registerCommand('chatAutomation.sendAll', async () => {
      const messages = configService.getEnabledMessages();
      if (messages.length === 0) {
        vscode.window.showWarningMessage('Không có tin nhắn nào được bật.');
        return;
      }
      await chatService.sendBatch(messages);
      scheduleService.updateStatusBar();
    }),

    // Dừng gửi
    vscode.commands.registerCommand('chatAutomation.stop', () => {
      scheduleService.stopAll();
    }),

    // Thêm tin nhắn nhanh
    vscode.commands.registerCommand('chatAutomation.addMessage', async () => {
      const text = await vscode.window.showInputBox({
        prompt: 'Nhập nội dung tin nhắn',
        placeHolder: 'VD: Xin chào...',
      });

      if (!text) {
        return;
      }

      const delayStr = await vscode.window.showInputBox({
        prompt: 'Delay trước khi gửi (VD: 2s, 500ms, 1m)',
        value: '2s',
      });

      const delayMs = delayStr ? parseDelayString(delayStr) : 2000;
      await configService.addMessage(text, delayMs);
      scheduleService.updateStatusBar();
      vscode.window.showInformationMessage('Đã thêm tin nhắn.');
    }),

    // Bắt đầu lịch
    vscode.commands.registerCommand('chatAutomation.startSchedule', async () => {
      const schedule = configService.getSchedule();
      
      if (schedule) {
        await scheduleService.startSchedule();
      } else {
        const input = await vscode.window.showInputBox({
          prompt: 'Nhập thời gian lặp lại (VD: 30m, 1h, 5m)',
          value: '30m',
        });

        if (!input) {
          return;
        }

        const intervalMs = parseDelayString(input);
        await scheduleService.startSchedule(intervalMs);
      }
    }),

    // Dừng lịch
    vscode.commands.registerCommand('chatAutomation.stopSchedule', () => {
      scheduleService.stopSchedule();
    }),
  ];

  // Đăng ký tất cả commands
  context.subscriptions.push(...commands);

  // Resume schedule nếu có
  scheduleService.resumeSchedule();

  // Log workspace info
  const workspace = workspaceService.getCurrentWorkspace();
  if (workspace) {
    console.log(`Chat Automation: Workspace "${workspace.name}" at ${workspace.path}`);
  }
}

export function deactivate() {
  // Cleanup
  scheduleService.stopSchedule();
  panel.closePanel();
  console.log('Chat Automation extension deactivated');
}

/**
 * Parse delay string thành milliseconds
 */
function parseDelayString(input: string): number {
  const match = input.trim().match(/^([\d.]+)\s*(ms|s|m|h)?$/i);
  if (!match) {
    return 2000;
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 's').toLowerCase();

  switch (unit) {
    case 'ms':
      return Math.round(value);
    case 's':
      return Math.round(value * 1000);
    case 'm':
      return Math.round(value * 60000);
    case 'h':
      return Math.round(value * 3600000);
    default:
      return Math.round(value * 1000);
  }
}
