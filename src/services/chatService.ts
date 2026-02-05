/**
 * Chat Service - Gửi tin nhắn vào VS Code Chat
 */

import * as vscode from 'vscode';
import { MessageConfig, SendState } from '../types';

/** Trạng thái gửi hiện tại */
let sendState: SendState = {
  isSending: false,
  currentIndex: 0,
  totalMessages: 0,
  cancellationToken: { cancelled: false },
};

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Thực thi command và bắt lỗi
 */
async function tryCmd(command: string, ...args: unknown[]): Promise<boolean> {
  try {
    await vscode.commands.executeCommand(command, ...args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gửi một tin nhắn đơn lẻ
 */
export async function sendSingleMessage(text: string): Promise<boolean> {
  try {
    // 1. Tạo chat mới
    await (
      (await tryCmd('workbench.action.chat.newChat')) ||
      (await tryCmd('workbench.action.openChat')) ||
      (await tryCmd('workbench.action.chat.open'))
    );

    await delay(300);

    // 2. Mở Chat
    const opened =
      (await tryCmd('workbench.action.chat.open')) ||
      (await tryCmd('workbench.action.openChat'));

    if (!opened) {
      vscode.window.showWarningMessage('Không thể mở Chat.');
      return false;
    }

    await delay(200);

    // 3. Nhập tin nhắn
    await tryCmd('type', { text });

    await delay(200);

    // 4. Gửi
    const submitted =
      (await tryCmd('workbench.action.chat.submit')) ||
      (await tryCmd('chat.action.submit'));

    return submitted;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

/**
 * Lấy trạng thái gửi hiện tại
 */
export function getSendState(): SendState {
  return { ...sendState };
}

/**
 * Kiểm tra đang gửi?
 */
export function isSending(): boolean {
  return sendState.isSending;
}

/**
 * Hủy gửi
 */
export function cancelSending(): void {
  sendState.cancellationToken.cancelled = true;
}

/**
 * Gửi hàng loạt tin nhắn với progress
 */
export async function sendBatch(messages: MessageConfig[]): Promise<{ sent: number; total: number }> {
  const enabledMessages = messages.filter(m => m.enabled);
  
  if (enabledMessages.length === 0) {
    vscode.window.showWarningMessage('Không có tin nhắn nào được bật.');
    return { sent: 0, total: 0 };
  }

  // Reset state
  sendState = {
    isSending: true,
    currentIndex: 0,
    totalMessages: enabledMessages.length,
    cancellationToken: { cancelled: false },
  };

  let sentCount = 0;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Đang gửi tin nhắn',
        cancellable: true,
      },
      async (progress, token) => {
        // Đăng ký cancel
        token.onCancellationRequested(() => {
          sendState.cancellationToken.cancelled = true;
        });

        for (let i = 0; i < enabledMessages.length; i++) {
          // Kiểm tra hủy
          if (sendState.cancellationToken.cancelled) {
            vscode.window.showInformationMessage(`Đã dừng. Gửi được ${sentCount}/${enabledMessages.length} tin nhắn.`);
            break;
          }

          const msg = enabledMessages[i];
          sendState.currentIndex = i;

          // Cập nhật progress
          progress.report({
            increment: (100 / enabledMessages.length),
            message: `${i + 1}/${enabledMessages.length}: ${msg.text.substring(0, 30)}...`,
          });

          // Delay trước khi gửi
          if (msg.delayMs > 0) {
            // Delay với khả năng cancel
            const delayStep = 100; // Check cancel mỗi 100ms
            let waited = 0;
            while (waited < msg.delayMs && !sendState.cancellationToken.cancelled) {
              await delay(Math.min(delayStep, msg.delayMs - waited));
              waited += delayStep;
            }
          }

          if (sendState.cancellationToken.cancelled) {
            break;
          }

          // Gửi tin nhắn
          const success = await sendSingleMessage(msg.text);
          if (success) {
            sentCount++;
          }

          // Chờ một chút để Chat xử lý xong trước khi gửi tin tiếp
          await delay(1000);
        }
      }
    );
  } finally {
    sendState.isSending = false;
  }

  if (!sendState.cancellationToken.cancelled) {
    vscode.window.showInformationMessage(`✅ Đã gửi ${sentCount}/${enabledMessages.length} tin nhắn.`);
  }

  return { sent: sentCount, total: enabledMessages.length };
}

/**
 * Gửi tất cả tin nhắn từ config
 */
export async function sendAllFromConfig(): Promise<{ sent: number; total: number }> {
  // Import động để tránh circular dependency
  const { getMessages } = await import('./configService');
  const messages = getMessages();
  return sendBatch(messages);
}
