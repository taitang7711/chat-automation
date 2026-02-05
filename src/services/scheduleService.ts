/**
 * Schedule Service - Quản lý lịch gửi tin nhắn định kỳ
 */

import * as vscode from 'vscode';
import { ScheduleState } from '../types';
import * as configService from './configService';
import * as chatService from './chatService';
import { formatDelay } from '../types';

// ============ TIME UTILITIES ============

/**
 * Validate time format HH:MM
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

/**
 * Parse time string "HH:MM" to {hour, minute}
 */
export function parseTime(time: string): { hour: number; minute: number } | null {
  if (!isValidTimeFormat(time)) {
    return null;
  }

  const [hourStr, minuteStr] = time.split(':');
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
  };
}

/**
 * Calculate next run timestamp from array of times ["HH:MM", ...]
 * Returns timestamp of the next occurrence
 */
export function calculateNextRun(times: string[]): number {
  if (times.length === 0) {
    return Date.now() + 60000; // Default 1 minute from now
  }

  const now = new Date();
  const currentTime = now.getTime();

  // Convert all times to timestamps for today
  const todayTimestamps: number[] = [];
  const tomorrowTimestamps: number[] = [];

  for (const timeStr of times) {
    const parsed = parseTime(timeStr);
    if (!parsed) {
      continue;
    }

    // Today
    const todayDate = new Date(now);
    todayDate.setHours(parsed.hour, parsed.minute, 0, 0);
    const todayTs = todayDate.getTime();

    if (todayTs > currentTime) {
      todayTimestamps.push(todayTs);
    }

    // Tomorrow
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    tomorrowDate.setHours(parsed.hour, parsed.minute, 0, 0);
    tomorrowTimestamps.push(tomorrowDate.getTime());
  }

  // Find earliest time
  const allTimestamps = [...todayTimestamps, ...tomorrowTimestamps];
  if (allTimestamps.length === 0) {
    return Date.now() + 60000; // Fallback
  }

  return Math.min(...allTimestamps);
}

/**
 * Format time array for display
 */
export function formatTimes(times: string[]): string {
  return times.join(', ');
}

// ============ SCHEDULE STATE ============

/**  Trạng thái của tất cả schedules đang chạy */
let scheduleStates: Map<string, ScheduleState> = new Map();

/** Legacy: Trạng thái schedule đầu tiên (for backward compatibility) */
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

  const schedules = configService.getSchedules();
  const messages = configService.getMessages();
  const enabledCount = messages.filter(m => m.enabled).length;
  const runningSchedules = Array.from(scheduleStates.keys()).length;
  const enabledSchedules = schedules.filter(s => s.enabled).length;

  if (runningSchedules > 0) {
    statusBarItem.text = `$(clock) Lịch: ${runningSchedules}/${schedules.length} đang chạy`;

    // Build tooltip with running schedules
    const runningNames = Array.from(scheduleStates.keys())
      .map(id => {
        const s = schedules.find(sch => sch.id === id);
        if (!s) return null;
        if (s.scheduleType === 'interval' && s.intervalMs) {
          return `• ${s.name}: Mỗi ${formatDelay(s.intervalMs)}`;
        } else if (s.scheduleType === 'time-based' && s.times) {
          return `• ${s.name}: Vào ${formatTimes(s.times)}`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');

    statusBarItem.tooltip = `Chat Automation\n${runningNames}\n\n${enabledCount} tin nhắn đang bật`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else if (chatService.isSending()) {
    const state = chatService.getSendState();
    statusBarItem.text = `$(sync~spin) Đang gửi ${state.currentIndex + 1}/${state.totalMessages}`;
    statusBarItem.tooltip = 'Đang gửi tin nhắn...';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    const scheduleInfo = enabledSchedules > 0 ? `, ${enabledSchedules} lịch` : '';
    statusBarItem.text = `$(comment-discussion) Chat Auto (${enabledCount}${scheduleInfo})`;
    statusBarItem.tooltip = `Chat Automation: ${enabledCount} tin nhắn đang bật${scheduleInfo ? ', ' + enabledSchedules + ' lịch enabled' : ''}\nClick để mở bảng điều khiển`;
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
  await stopSchedule();

  let schedule = configService.getSchedule();

  // Tạo schedule mới nếu có intervalMs
  if (intervalMs !== undefined) {
    schedule = await configService.setSchedule(intervalMs, true);
  } else if (!schedule) {
    vscode.window.showWarningMessage('Chưa cấu hình lịch. Vui lòng đặt thời gian lặp lại.');
    return false;
  } else if (schedule.scheduleType === 'interval' && !schedule.intervalMs) {
    vscode.window.showWarningMessage('Lịch interval không có intervalMs hợp lệ.');
    return false;
  } else {
    // Bật schedule hiện có (currently only support interval type in startSchedule)
    if (schedule.scheduleType === 'time-based') {
      vscode.window.showWarningMessage('Chưa hỗ trợ khởi động lịch time-based từ lệnh này. Vui lòng dùng UI.');
      return false;
    }

    schedule.enabled = true;
    schedule.nextRunTimestamp = Date.now() + (schedule.intervalMs || 0);
    await configService.saveSchedule(schedule);
  }

  // Chỉ hỗ trợ interval type trong function này
  if (!schedule.intervalMs) {
    vscode.window.showWarningMessage('Schedule không hợp lệ.');
    return false;
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
export async function stopSchedule(): Promise<void> {
  if (scheduleState.intervalId) {
    clearInterval(scheduleState.intervalId);
    scheduleState.intervalId = undefined;
  }

  if (scheduleState.timerId) {
    clearTimeout(scheduleState.timerId);
    scheduleState.timerId = undefined;
  }

  scheduleState.isRunning = false;

  // Update config to prevent auto-resume on reload
  const schedule = configService.getSchedule();
  if (schedule && schedule.enabled) {
    schedule.enabled = false;
    await configService.saveSchedule(schedule);
  }

  updateStatusBar();
}

/**
 * Dừng schedule và clear config
 */
export async function clearAndStopSchedule(): Promise<void> {
  await stopSchedule();
  await configService.clearSchedule();
  updateStatusBar();
  vscode.window.showInformationMessage('Đã dừng và xóa lịch.');
}

/**
 * Resume schedule khi extension activate
 */
export async function resumeSchedule(): Promise<void> {
  // Resume all enabled schedules
  await startAllEnabledSchedules();
}

/**
 * Dừng tất cả (gửi + schedule)
 */
export async function stopAll(): Promise<void> {
  chatService.cancelSending();
  await stopSchedule();
  vscode.window.showInformationMessage('Đã dừng tất cả.');
}

// ============ MULTI-SCHEDULE SUPPORT ============

/**
 * Thực hiện gửi cho một schedule cụ thể
 */
async function executeScheduledSendForSchedule(scheduleId: string): Promise<void> {
  const schedule = configService.getSchedules().find(s => s.id === scheduleId);

  if (!schedule?.enabled) {
    return;
  }

  const state = scheduleStates.get(scheduleId);
  if (!state?.isRunning) {
    return;
  }

  // Kiểm tra không gửi nếu đang gửi
  if (chatService.isSending()) {
    console.log(`Skipping scheduled send for ${schedule.name} - already sending`);
    return;
  }

  console.log(`Executing scheduled send for: ${schedule.name}`);

  try {
    await chatService.sendAllFromConfig();
    await configService.updateScheduleLastRun(scheduleId);
    updateStatusBar();
  } catch (error) {
    console.error(`Scheduled send error for ${schedule.name}:`, error);
  }
}

/**
 * Schedule next run for time-based schedule
 */
function scheduleNextTimeRun(scheduleId: string): void {
  const schedule = configService.getSchedules().find(s => s.id === scheduleId);

  if (!schedule || schedule.scheduleType !== 'time-based' || !schedule.times || schedule.times.length === 0) {
    return;
  }

  const nextRun = calculateNextRun(schedule.times);
  const delay = nextRun - Date.now();

  console.log(`Scheduling next run for ${schedule.name} at ${new Date(nextRun).toLocaleString()} (delay: ${delay}ms)`);

  const timerId = setTimeout(async () => {
    await executeScheduledSendForSchedule(scheduleId);

    // Re-schedule next run if still enabled
    const currentSchedule = configService.getSchedules().find(s => s.id === scheduleId);
    if (currentSchedule?.enabled) {
      scheduleNextTimeRun(scheduleId);
    }
  }, delay);

  scheduleStates.set(scheduleId, {
    isRunning: true,
    timerId,
    intervalId: undefined,
  });
}

/**
 * Bắt đầu một schedule cụ thể bằng ID
 */
export async function startScheduleById(scheduleId: string): Promise<boolean> {
  const schedule = configService.getSchedules().find(s => s.id === scheduleId);

  if (!schedule) {
    vscode.window.showWarningMessage('Không tìm thấy lịch.');
    return false;
  }

  // Dừng schedule này nếu đang chạy
  await stopScheduleById(scheduleId);

  // Enable schedule trong config
  await configService.updateSchedule(scheduleId, { enabled: true });

  if (schedule.scheduleType === 'interval') {
    if (!schedule.intervalMs) {
      vscode.window.showWarningMessage('Lịch interval không có intervalMs hợp lệ.');
      return false;
    }

    // Start interval
    const intervalId = setInterval(async () => {
      await executeScheduledSendForSchedule(scheduleId);
    }, schedule.intervalMs);

    scheduleStates.set(scheduleId, {
      isRunning: true,
      intervalId,
      timerId: undefined,
    });

    // Update legacy state if this is the first schedule
    const schedules = configService.getSchedules();
    if (schedules.length > 0 && schedules[0].id === scheduleId) {
      scheduleState.isRunning = true;
      scheduleState.intervalId = intervalId;
    }

    console.log(`Started interval schedule: ${schedule.name} (every ${formatDelay(schedule.intervalMs)})`);

  } else if (schedule.scheduleType === 'time-based') {
    if (!schedule.times || schedule.times.length === 0) {
      vscode.window.showWarningMessage('Lịch time-based không có times hợp lệ.');
      return false;
    }

    // Schedule next time run
    scheduleNextTimeRun(scheduleId);

    console.log(`Started time-based schedule: ${schedule.name} (times: ${formatTimes(schedule.times)})`);
  }

  updateStatusBar();
  return true;
}

/**
 * Dừng một schedule cụ thể bằng ID
 */
export async function stopScheduleById(scheduleId: string): Promise<void> {
  const state = scheduleStates.get(scheduleId);

  if (!state) {
    return;
  }

  // Clear timers
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }

  if (state.timerId) {
    clearTimeout(state.timerId);
  }

  // Remove from map
  scheduleStates.delete(scheduleId);

  // Update config
  await configService.updateSchedule(scheduleId, { enabled: false });

  // Update legacy state if needed
  const schedules = configService.getSchedules();
  if (schedules.length > 0 && schedules[0].id === scheduleId) {
    scheduleState.isRunning = false;
    scheduleState.intervalId = undefined;
    scheduleState.timerId = undefined;
  }

  updateStatusBar();
}

/**
 * Bắt đầu tất cả schedules đang enabled
 */
export async function startAllEnabledSchedules(): Promise<void> {
  const enabledSchedules = configService.getEnabledSchedules();

  for (const schedule of enabledSchedules) {
    await startScheduleById(schedule.id);
  }

  if (enabledSchedules.length > 0) {
    vscode.window.showInformationMessage(`Đã bắt đầu ${enabledSchedules.length} lịch.`);
  }
}

/**
 * Dừng tất cả schedules
 */
export async function stopAllSchedules(): Promise<void> {
  const scheduleIds = Array.from(scheduleStates.keys());

  for (const scheduleId of scheduleIds) {
    await stopScheduleById(scheduleId);
  }

  // Clear legacy state
  scheduleState.isRunning = false;
  scheduleState.intervalId = undefined;
  scheduleState.timerId = undefined;

  updateStatusBar();
}

/**
 * Toggle một schedule
 */
export async function toggleScheduleById(scheduleId: string): Promise<boolean> {
  const schedule = configService.getSchedules().find(s => s.id === scheduleId);

  if (!schedule) {
    return false;
  }

  if (schedule.enabled) {
    await stopScheduleById(scheduleId);
    return false;
  } else {
    await startScheduleById(scheduleId);
    return true;
  }
}

/**
 * Lấy trạng thái tất cả schedules
 */
export function getAllScheduleStates(): Map<string, ScheduleState> {
  return new Map(scheduleStates);
}
