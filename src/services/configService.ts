/**
 * Config Service - Quản lý cấu hình tin nhắn cho mỗi workspace
 */

import * as vscode from 'vscode';
import { MessageConfig, ScheduleConfig, createMessage, createIntervalSchedule, createTimeBasedSchedule } from '../types';

const MESSAGES_KEY = 'chatAutomation.messages';
const SCHEDULE_KEY = 'chatAutomation.schedule'; // Old single schedule (deprecated)
const SCHEDULES_KEY = 'chatAutomation.schedules'; // New multiple schedules

let _context: vscode.ExtensionContext | null = null;

/**
 * Khởi tạo service với context
 */
export function initConfigService(context: vscode.ExtensionContext): void {
    _context = context;
}

/**
 * Lấy workspaceState
 */
function getState(): vscode.Memento {
    if (!_context) {
        throw new Error('ConfigService not initialized. Call initConfigService first.');
    }
    return _context.workspaceState;
}

// ===================== MESSAGES =====================

/**
 * Lấy danh sách tin nhắn
 */
export function getMessages(): MessageConfig[] {
    return getState().get<MessageConfig[]>(MESSAGES_KEY, []);
}

/**
 * Lưu danh sách tin nhắn
 */
export async function saveMessages(messages: MessageConfig[]): Promise<void> {
    await getState().update(MESSAGES_KEY, messages);
}

/**
 * Thêm tin nhắn mới
 */
export async function addMessage(text: string, delayMs: number = 2000): Promise<MessageConfig> {
    const messages = getMessages();
    const newMessage = createMessage(text, delayMs);
    messages.push(newMessage);
    await saveMessages(messages);
    return newMessage;
}

/**
 * Cập nhật tin nhắn
 */
export async function updateMessage(id: string, updates: Partial<MessageConfig>): Promise<boolean> {
    const messages = getMessages();
    const index = messages.findIndex(m => m.id === id);

    if (index === -1) {
        return false;
    }

    messages[index] = { ...messages[index], ...updates };
    await saveMessages(messages);
    return true;
}

/**
 * Xóa tin nhắn
 */
export async function deleteMessage(id: string): Promise<boolean> {
    const messages = getMessages();
    const filtered = messages.filter(m => m.id !== id);

    if (filtered.length === messages.length) {
        return false;
    }

    await saveMessages(filtered);
    return true;
}

/**
 * Sắp xếp lại tin nhắn
 */
export async function reorderMessages(ids: string[]): Promise<void> {
    const messages = getMessages();
    const messageMap = new Map(messages.map(m => [m.id, m]));

    const reordered: MessageConfig[] = [];
    for (const id of ids) {
        const msg = messageMap.get(id);
        if (msg) {
            reordered.push(msg);
        }
    }

    // Thêm các tin nhắn không có trong ids vào cuối
    for (const msg of messages) {
        if (!ids.includes(msg.id)) {
            reordered.push(msg);
        }
    }

    await saveMessages(reordered);
}

/**
 * Toggle enable/disable tin nhắn
 */
export async function toggleMessage(id: string): Promise<boolean> {
    const messages = getMessages();
    const msg = messages.find(m => m.id === id);

    if (!msg) {
        return false;
    }

    return updateMessage(id, { enabled: !msg.enabled });
}

/**
 * Lấy các tin nhắn được bật
 */
export function getEnabledMessages(): MessageConfig[] {
    return getMessages().filter(m => m.enabled);
}

/**
 * Xóa tất cả tin nhắn
 */
export async function clearMessages(): Promise<void> {
    await saveMessages([]);
}

// ===================== SCHEDULE (MULTIPLE) =====================

/**
 * Migration: Convert old single schedule to new array format
 */
function migrateOldSchedule(): void {
    const oldSchedule = getState().get<ScheduleConfig | null>(SCHEDULE_KEY, null);
    const existingSchedules = getState().get<ScheduleConfig[] | undefined>(SCHEDULES_KEY, undefined);

    // Nếu đã có schedules mới, không cần migrate
    if (existingSchedules !== undefined) {
        return;
    }

    // Nếu có old schedule và có intervalMs, convert sang array format
    if (oldSchedule && oldSchedule.intervalMs) {
        const migrated = createIntervalSchedule(
            'Lịch mặc định',
            oldSchedule.intervalMs,
            oldSchedule.enabled
        );
        migrated.nextRunTimestamp = oldSchedule.nextRunTimestamp;
        migrated.lastRunTimestamp = oldSchedule.lastRunTimestamp;

        getState().update(SCHEDULES_KEY, [migrated]);
        getState().update(SCHEDULE_KEY, undefined); // Clear old key
    } else {
        // Không có gì, init empty array
        getState().update(SCHEDULES_KEY, []);
    }
}

/**
 * Lấy danh sách tất cả lịch
 */
export function getSchedules(): ScheduleConfig[] {
    migrateOldSchedule();
    return getState().get<ScheduleConfig[]>(SCHEDULES_KEY, []);
}

/**
 * Lưu danh sách lịch
 */
export async function saveSchedules(schedules: ScheduleConfig[]): Promise<void> {
    await getState().update(SCHEDULES_KEY, schedules);
}

/**
 * Thêm lịch mới (interval type)
 */
export async function addIntervalSchedule(name: string, intervalMs: number): Promise<ScheduleConfig> {
    const schedules = getSchedules();
    const newSchedule = createIntervalSchedule(name, intervalMs, true);
    schedules.push(newSchedule);
    await saveSchedules(schedules);
    return newSchedule;
}

/**
 * Thêm lịch mới (time-based type)
 */
export async function addTimeBasedSchedule(name: string, times: string[]): Promise<ScheduleConfig> {
    const schedules = getSchedules();
    const newSchedule = createTimeBasedSchedule(name, times, true);
    schedules.push(newSchedule);
    await saveSchedules(schedules);
    return newSchedule;
}

/**
 * Cập nhật lịch
 */
export async function updateSchedule(id: string, updates: Partial<ScheduleConfig>): Promise<boolean> {
    const schedules = getSchedules();
    const index = schedules.findIndex(s => s.id === id);

    if (index === -1) {
        return false;
    }

    schedules[index] = { ...schedules[index], ...updates };
    await saveSchedules(schedules);
    return true;
}

/**
 * Xóa lịch
 */
export async function deleteSchedule(id: string): Promise<boolean> {
    const schedules = getSchedules();
    const filtered = schedules.filter(s => s.id !== id);

    if (filtered.length === schedules.length) {
        return false;
    }

    await saveSchedules(filtered);
    return true;
}

/**
 * Toggle enable/disable lịch
 */
export async function toggleSchedule(id: string): Promise<boolean> {
    const schedules = getSchedules();
    const schedule = schedules.find(s => s.id === id);

    if (!schedule) {
        return false;
    }

    return updateSchedule(id, { enabled: !schedule.enabled });
}

/**
 * Lấy các lịch đang được bật
 */
export function getEnabledSchedules(): ScheduleConfig[] {
    return getSchedules().filter(s => s.enabled);
}

/**
 * Xóa tất cả lịch
 */
export async function clearSchedules(): Promise<void> {
    await saveSchedules([]);
}

/**
 * Cập nhật timestamp lần chạy cuối cho một lịch
 */
export async function updateScheduleLastRun(id: string): Promise<void> {
    const schedule = getSchedules().find(s => s.id === id);
    if (schedule) {
        await updateSchedule(id, {
            lastRunTimestamp: Date.now(),
        });
    }
}

// ===================== LEGACY (for backward compatibility) =====================

/**
 * @deprecated Use getSchedules() instead
 * Lấy cấu hình schedule (legacy - trả về schedule đầu tiên)
 */
export function getSchedule(): ScheduleConfig | null {
    const schedules = getSchedules();
    return schedules.length > 0 ? schedules[0] : null;
}

/**
 * @deprecated Use saveSchedules() or updateSchedule() instead
 * Lưu cấu hình schedule (legacy - update schedule đầu tiên hoặc tạo mới)
 */
export async function saveSchedule(schedule: ScheduleConfig | null): Promise<void> {
    const schedules = getSchedules();

    if (schedule === null) {
        // Clear all schedules
        await saveSchedules([]);
        return;
    }

    if (schedules.length > 0) {
        // Update first schedule
        await updateSchedule(schedules[0].id, schedule);
    } else {
        // Create new schedule
        await saveSchedules([schedule]);
    }
}

/**
 * @deprecated Use addIntervalSchedule() instead
 * Tạo/cập nhật schedule (legacy)
 */
export async function setSchedule(intervalMs: number, enabled: boolean = true): Promise<ScheduleConfig> {
    const schedules = getSchedules();

    if (schedules.length > 0) {
        // Update first schedule
        const schedule = schedules[0];
        await updateSchedule(schedule.id, {
            enabled,
            intervalMs,
            nextRunTimestamp: enabled ? Date.now() + intervalMs : undefined,
        });
        return getSchedules()[0];
    } else {
        // Create new schedule
        return await addIntervalSchedule('Lịch mặc định', intervalMs);
    }
}

/**
 * @deprecated Use toggleSchedule(id) instead
 * Bật/tắt schedule (legacy - toggle schedule đầu tiên)
 */
export async function toggleScheduleLegacy(): Promise<boolean> {
    const schedule = getSchedule();
    if (!schedule) {
        return false;
    }

    const newEnabled = !schedule.enabled;
    await updateSchedule(schedule.id, {
        enabled: newEnabled,
        nextRunTimestamp: newEnabled && schedule.intervalMs ? Date.now() + schedule.intervalMs : undefined,
    });
    return newEnabled;
}

/**
 * @deprecated Use clearSchedules() instead
 * Xóa schedule (legacy)
 */
export async function clearSchedule(): Promise<void> {
    await clearSchedules();
}

/**
 * @deprecated Use updateScheduleLastRun(id) instead
 * Cập nhật timestamp lần chạy cuối (legacy - update schedule đầu tiên)
 */
export async function updateLastRun(): Promise<void> {
    const schedule = getSchedule();
    if (schedule && schedule.intervalMs) {
        await updateSchedule(schedule.id, {
            lastRunTimestamp: Date.now(),
            nextRunTimestamp: Date.now() + schedule.intervalMs,
        });
    }
}
