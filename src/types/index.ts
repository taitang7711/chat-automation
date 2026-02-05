/**
 * Chat Automation - Type Definitions
 */

/** Cấu hình một tin nhắn */
export interface MessageConfig {
  /** ID duy nhất */
  id: string;
  /** Nội dung tin nhắn (có thể nhiều dòng) */
  text: string;
  /** Thời gian delay trước khi gửi (milliseconds) */
  delayMs: number;
  /** Bật/tắt tin nhắn này */
  enabled: boolean;
  /** Thời gian tạo */
  createdAt: number;
}

/** Cấu hình lịch lặp lại */
export interface ScheduleConfig {
  /** Bật/tắt lịch */
  enabled: boolean;
  /** Thời gian lặp lại (milliseconds) */
  intervalMs: number;
  /** Timestamp lần chạy tiếp theo */
  nextRunTimestamp?: number;
  /** Timestamp lần chạy cuối */
  lastRunTimestamp?: number;
}

/** Cấu hình project */
export interface ProjectConfig {
  /** Đường dẫn thư mục */
  projectPath: string;
  /** Tên project */
  projectName: string;
  /** Danh sách tin nhắn */
  messages: MessageConfig[];
  /** Cấu hình lịch lặp */
  schedule: ScheduleConfig | null;
}

/** Trạng thái gửi tin nhắn */
export interface SendState {
  /** Đang gửi? */
  isSending: boolean;
  /** Index tin nhắn hiện tại */
  currentIndex: number;
  /** Tổng số tin nhắn */
  totalMessages: number;
  /** Có thể hủy? */
  cancellationToken: { cancelled: boolean };
}

/** Trạng thái schedule */
export interface ScheduleState {
  /** Đang chạy schedule? */
  isRunning: boolean;
  /** Timer ID */
  timerId?: NodeJS.Timeout;
  /** Interval ID */
  intervalId?: NodeJS.Timeout;
}

/** Message từ Webview */
export interface WebviewMessage {
  command: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}

/** Tạo ID ngẫu nhiên */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/** Tạo tin nhắn mới với default values */
export function createMessage(text: string, delayMs: number = 2000): MessageConfig {
  return {
    id: generateId(),
    text,
    delayMs,
    enabled: true,
    createdAt: Date.now(),
  };
}

/** Format milliseconds thành chuỗi dễ đọc */
export function formatDelay(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}m`;
  }
  return `${(ms / 3600000).toFixed(1)}h`;
}

/** Parse thời gian từ input (hỗ trợ s, m, h suffix) */
export function parseDelay(input: string): number {
  const match = input.trim().match(/^([\d.]+)\s*(ms|s|m|h)?$/i);
  if (!match) {
    return 2000; // default 2 seconds
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
