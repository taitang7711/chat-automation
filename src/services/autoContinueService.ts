/**
 * Auto-Continue Service
 * 
 * Inject script vào DevTools Console để:
 * - Tự động mở Sessions Sidebar
 * - Tìm sessions cần attention (unread/in-progress)
 * - Switch giữa sessions
 * - Click Continue/Allow buttons
 * 
 * NOTE: VS Code extension API không cho phép trực tiếp thao tác DOM của chat UI,
 * nên phải dùng inject script approach.
 */

import * as vscode from 'vscode';
import { getInjectScript } from './injectScript';

/** Status bar item */
let statusBarItem: vscode.StatusBarItem | undefined;

/** Track if script has been copied and instructed */
let scriptCopied = false;

/** Track if DevTools has been opened */
let devToolsOpened = false;

/**
 * Initialize Auto-Continue service
 */
export function initAutoContinue(context: vscode.ExtensionContext): void {
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99
    );
    statusBarItem.command = 'chatAutomation.toggleAutoContinue';
    context.subscriptions.push(statusBarItem);

    updateStatusBar();
}

/**
 * Update status bar display
 */
function updateStatusBar(): void {
    if (!statusBarItem) {
        return;
    }

    if (scriptCopied) {
        statusBarItem.text = '$(check) Auto-Continue Ready';
        statusBarItem.tooltip =
            '✅ Script đã copy vào clipboard!\n\n' +
            (devToolsOpened ? '✅ DevTools đã mở\n' : '⚠️ DevTools chưa mở\n') +
            '\n📋 Bước tiếp:\n' +
            '1. Vào tab Console trong DevTools\n' +
            '2. Paste (Ctrl+V) và Enter\n' +
            '3. Script sẽ tự động:\n' +
            '   • Mở Sessions Sidebar\n' +
            '   • Tìm sessions unread/in-progress\n' +
            '   • Switch và click Continue/Allow\n\n' +
            'Click để copy lại';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = '$(debug-start) Auto-Continue';
        statusBarItem.tooltip = 'Tự động xử lý sessions\n\nClick để bắt đầu';
        statusBarItem.backgroundColor = undefined;
    }

    statusBarItem.show();
}

/**
 * Get current state (for UI)
 */
export function getState(): { isRunning: boolean; continueCount: number } {
    return {
        isRunning: scriptCopied,
        continueCount: 0, // Will be tracked by inject script
    };
}

/**
 * Set polling interval (config for inject script)
 */
export function setPollingInterval(_intervalMs: number): void {
    // No-op - interval is configured in inject script
    // Can be enhanced to regenerate script with custom interval
}

/**
 * Copy inject script and auto-open DevTools
 */
export async function start(): Promise<void> {
    const script = getInjectScript();

    // Step 1: Copy script to clipboard
    await vscode.env.clipboard.writeText(script);
    scriptCopied = true;

    // Step 2: Try to open DevTools
    try {
        await vscode.commands.executeCommand('workbench.action.toggleDevTools');
        devToolsOpened = true;
    } catch (error) {
        console.warn('[AutoContinue] Could not open DevTools:', error);
    }

    updateStatusBar();

    // Step 3: Show instructions
    const action = await vscode.window.showInformationMessage(
        '✅ Đã copy script và mở DevTools!\n\n' +
        '📋 Bước tiếp theo:\n' +
        '1. Chuyển sang tab Console trong DevTools\n' +
        '2. Paste (Ctrl+V) và Enter\n\n' +
        '🔄 Script sẽ tự động:\n' +
        '• Mở Sessions Sidebar\n' +
        '• Tìm sessions unread/in-progress  \n' +
        '• Click Continue/Allow mỗi 3 giây\n\n' +
        '⏹️ Để dừng: gõ window.stopAutoContinue()',
        { modal: false },
        'OK',
        'Copy lại Script'
    );

    if (action === 'Copy lại Script') {
        await start(); // Recursive call to copy again
    }
}

/**
 * Stop - show instructions to stop inject script
 */
export function stop(): void {
    scriptCopied = false;
    devToolsOpened = false;
    updateStatusBar();

    vscode.window.showInformationMessage(
        '⏹️ Để dừng Auto-Continue:\n\n' +
        '1. Mở DevTools Console\n' +
        '2. Gõ: window.stopAutoContinue()\n' +
        '3. Hoặc reload VS Code',
        { modal: false },
        'OK'
    );
}

/**
 * Toggle - copy script and open DevTools
 */
export async function toggle(): Promise<void> {
    if (scriptCopied) {
        stop();
    } else {
        await start();
    }
}

/**
 * Reset state
 */
export function resetStats(): void {
    scriptCopied = false;
    devToolsOpened = false;
    updateStatusBar();
}
