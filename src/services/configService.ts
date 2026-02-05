/**
 * Config Service - Quản lý cấu hình tin nhắn cho mỗi workspace
 */

import * as vscode from 'vscode';
import { MessageConfig, ScheduleConfig, createMessage } from '../types';

const MESSAGES_KEY = 'chatAutomation.messages';
const SCHEDULE_KEY = 'chatAutomation.schedule';

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

// ===================== SCHEDULE =====================

/**
 * Lấy cấu hình schedule
 */
export function getSchedule(): ScheduleConfig | null {
    return getState().get<ScheduleConfig | null>(SCHEDULE_KEY, null);
}

/**
 * Lưu cấu hình schedule
 */
export async function saveSchedule(schedule: ScheduleConfig | null): Promise<void> {
    await getState().update(SCHEDULE_KEY, schedule);
}

/**
 * Tạo/cập nhật schedule
 */
export async function setSchedule(intervalMs: number, enabled: boolean = true): Promise<ScheduleConfig> {
    const schedule: ScheduleConfig = {
        enabled,
        intervalMs,
        nextRunTimestamp: enabled ? Date.now() + intervalMs : undefined,
    };
    await saveSchedule(schedule);
    return schedule;
}

/**
 * Bật/tắt schedule
 */
export async function toggleSchedule(): Promise<boolean> {
    const schedule = getSchedule();
    if (!schedule) {
        return false;
    }

    schedule.enabled = !schedule.enabled;
    if (schedule.enabled) {
        schedule.nextRunTimestamp = Date.now() + schedule.intervalMs;
    } else {
        schedule.nextRunTimestamp = undefined;
    }

    await saveSchedule(schedule);
    return schedule.enabled;
}

/**
 * Xóa schedule
 */
export async function clearSchedule(): Promise<void> {
    await saveSchedule(null);
}

/**
 * Cập nhật timestamp lần chạy cuối
 */
export async function updateLastRun(): Promise<void> {
    const schedule = getSchedule();
    if (schedule) {
        schedule.lastRunTimestamp = Date.now();
        schedule.nextRunTimestamp = Date.now() + schedule.intervalMs;
        await saveSchedule(schedule);
    }
}
