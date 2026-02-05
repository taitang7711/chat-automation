/**
 * Schedule Service - Quản lý lịch gửi tin nhắn định kỳ
 */

import * as vscode from 'vscode';
import { ScheduleState } from '../types';
import * as configService from './configService';
import * as chatService from './chatService';
import { formatDelay } from '../types';

/** Trạng thái schedule hiện tại */
let scheduleState: ScheduleState = {
  isRunning: false,
  timerId: undefined,
  intervalId: undefined,
};

/** Status bar item */
let statusBarItem: vscode.StatusBarItem | null = null;

/**
 * Khởi tạo status bar
 */
export function initStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'chatAutomation.openPanel';
  context.subscriptions.push(statusBarItem);
  updateStatusBar();
}

/**
 * Cập nhật status bar
 */
export function updateStatusBar(): void {
  if (!statusBarItem) {
    return;
  }

  const schedule = configService.getSchedule();
  const messages = configService.getMessages();
  const enabledCount = messages.filter(m => m.enabled).length;

  if (scheduleState.isRunning && schedule) {
    statusBarItem.text = `$(clock) Schedule: ${formatDelay(schedule.intervalMs)}`;
    statusBarItem.tooltip = `Chat Automation: Đang chạy lịch mỗi ${formatDelay(schedule.intervalMs)}\n${enabledCount} tin nhắn đang bật`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else if (chatService.isSending()) {
    const state = chatService.getSendState();
    statusBarItem.text = `$(sync~spin) Đang gửi ${state.currentIndex + 1}/${state.totalMessages}`;
    statusBarItem.tooltip = 'Đang gửi tin nhắn...';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    statusBarItem.text = `$(comment-discussion) Chat Auto (${enabledCount})`;
    statusBarItem.tooltip = `Chat Automation: ${enabledCount} tin nhắn đang bật\nClick để mở bảng điều khiển`;
    statusBarItem.backgroundColor = undefined;
  }

  statusBarItem.show();
}

/**
 * Lấy trạng thái schedule
 */
export function getScheduleState(): ScheduleState {
  return { ...scheduleState };
}

/**
 * Kiểm tra schedule đang chạy?
 */
export function isScheduleRunning(): boolean {
  return scheduleState.isRunning;
}

/**
 * Thực hiện một lần gửi scheduled
 */
async function executeScheduledSend(): Promise<void> {
  const schedule = configService.getSchedule();
  
  if (!schedule?.enabled || !scheduleState.isRunning) {
    return;
  }

  // Kiểm tra không gửi nếu đang gửi
  if (chatService.isSending()) {
    console.log('Skipping scheduled send - already sending');
    return;
  }

  console.log('Executing scheduled send...');
  
  try {
    await chatService.sendAllFromConfig();
    await configService.updateLastRun();
    updateStatusBar();
  } catch (error) {
    console.error('Scheduled send error:', error);
  }
}

/**
 * Bắt đầu schedule
 */
export async function startSchedule(intervalMs?: number): Promise<boolean> {
  // Dừng schedule cũ nếu có
  stopSchedule();

  let schedule = configService.getSchedule();
  
  // Tạo schedule mới nếu có intervalMs
  if (intervalMs !== undefined) {
    schedule = await configService.setSchedule(intervalMs, true);
  } else if (!schedule) {
    vscode.window.showWarningMessage('Chưa cấu hình lịch. Vui lòng đặt thời gian lặp lại.');
    return false;
  } else {
    // Bật schedule hiện có
    schedule.enabled = true;
    schedule.nextRunTimestamp = Date.now() + schedule.intervalMs;
    await configService.saveSchedule(schedule);
  }

  // Bắt đầu interval
  scheduleState.isRunning = true;
  scheduleState.intervalId = setInterval(async () => {
    await executeScheduledSend();
  }, schedule.intervalMs);

  updateStatusBar();
  vscode.window.showInformationMessage(`⏰ Đã bắt đầu lịch: Gửi mỗi ${formatDelay(schedule.intervalMs)}`);
  
  return true;
}

/**
 * Dừng schedule
 */
export function stopSchedule(): void {
  if (scheduleState.intervalId) {
    clearInterval(scheduleState.intervalId);
    scheduleState.intervalId = undefined;
  }
  
  if (scheduleState.timerId) {
    clearTimeout(scheduleState.timerId);
    scheduleState.timerId = undefined;
  }
  
  scheduleState.isRunning = false;
  updateStatusBar();
}

/**
 * Dừng schedule và clear config
 */
export async function clearAndStopSchedule(): Promise<void> {
  stopSchedule();
  await configService.clearSchedule();
  updateStatusBar();
  vscode.window.showInformationMessage('Đã dừng và xóa lịch.');
}

/**
 * Resume schedule khi extension activate
 */
export async function resumeSchedule(): Promise<void> {
  const schedule = configService.getSchedule();
  
  if (!schedule?.enabled) {
    return;
  }

  // Kiểm tra xem có cần chạy ngay không (nếu đã qua thời gian nextRun)
  const now = Date.now();
  const missedRun = schedule.nextRunTimestamp && now >= schedule.nextRunTimestamp;

  if (missedRun) {
    // Có lần chạy bị lỡ, hỏi user
    const choice = await vscode.window.showInformationMessage(
      `Schedule đã bị lỡ. Bạn muốn gửi ngay và tiếp tục lịch?`,
      'Gửi ngay',
      'Bỏ qua và tiếp tục',
      'Dừng lịch'
    );

    if (choice === 'Gửi ngay') {
      await startSchedule(schedule.intervalMs);
      await executeScheduledSend();
    } else if (choice === 'Bỏ qua và tiếp tục') {
      await startSchedule(schedule.intervalMs);
    } else {
      await clearAndStopSchedule();
    }
  } else {
    // Không bị lỡ, resume bình thường
    await startSchedule(schedule.intervalMs);
  }
}

/**
 * Dừng tất cả (gửi + schedule)
 */
export function stopAll(): void {
  chatService.cancelSending();
  stopSchedule();
  vscode.window.showInformationMessage('Đã dừng tất cả.');
}
