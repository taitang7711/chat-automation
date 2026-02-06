/**
 * Inject Script for Auto-Continue/Allow
 * Copy this script to DevTools Console (Ctrl+Shift+I) to run
 */

export const INJECT_SCRIPT = `
(function() {
    // Configuration
    const CONFIG = {
        pollInterval: 3000,      // Check every 3 seconds
        logEnabled: true,        // Show logs in console
        autoOpenSidebar: true,   // Auto-open sessions sidebar
        version: '2.0.0'
    };

    // Selectors
    const SELECTORS = {
        // Buttons in chat input area
        continueButton: 'a.monaco-button.small.monaco-text-button',
        
        // Sessions sidebar toggle
        sidebarToggle: '.codicon-layout-sidebar-right-off, .codicon-layout-sidebar-right',
        
        // Sessions container
        sessionsContainer: '.agent-sessions-container',
        sessionItem: '.agent-session-item',
        
        // Session icons
        inProgressIcon: '.codicon-session-in-progress',
        unreadIcon: '.codicon-circle-filled',
        completedIcon: '.codicon-circle-small-filled',
        errorIcon: '.codicon-error',
        
        // Status badge (for quick check)
        statusBadge: '.agent-status-badge',
        activeCount: '.agent-status-badge-section.active .agent-status-text',
        unreadCount: '.agent-status-badge-section.unread .agent-status-text'
    };

    // State
    let running = true;
    let sidebarOpened = false;
    let stats = {
        continueClicks: 0,
        allowClicks: 0,
        sessionSwitches: 0,
        checksPerformed: 0,
        sidebarToggles: 0
    };

    // Logging helper
    function log(message, type = 'info') {
        if (!CONFIG.logEnabled) return;
        const prefix = '[AutoContinue]';
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(\`%c\${prefix} [\${timestamp}] ✅ \${message}\`, 'color: #4CAF50; font-weight: bold');
                break;
            case 'action':
                console.log(\`%c\${prefix} [\${timestamp}] 🔄 \${message}\`, 'color: #2196F3; font-weight: bold');
                break;
            case 'warning':
                console.log(\`%c\${prefix} [\${timestamp}] ⚠️ \${message}\`, 'color: #FF9800; font-weight: bold');
                break;
            case 'error':
                console.log(\`%c\${prefix} [\${timestamp}] ❌ \${message}\`, 'color: #F44336; font-weight: bold');
                break;
            default:
                console.log(\`\${prefix} [\${timestamp}] \${message}\`);
        }
    }

    // Open sessions sidebar if not already open
    function ensureSidebarOpen() {
        // Check if sidebar is already visible
        const container = document.querySelector(SELECTORS.sessionsContainer);
        if (container && container.offsetParent !== null) {
            if (!sidebarOpened) {
                log('Sessions sidebar already open', 'info');
                sidebarOpened = true;
            }
            return true;
        }
        
        // Try to find and click toggle button
        const toggleButtons = document.querySelectorAll(SELECTORS.sidebarToggle);
        for (const btn of toggleButtons) {
            if (btn.offsetParent !== null) { // Visible
                log('Opening sessions sidebar...', 'action');
                btn.click();
                stats.sidebarToggles++;
                sidebarOpened = true;
                log('Sidebar toggled!', 'success');
                return true;
            }
        }
        
        log('Could not find sidebar toggle button', 'warning');
        return false;
    }

    // Find and click Continue/Allow button
    function findAndClickButton() {
        const buttons = document.querySelectorAll(SELECTORS.continueButton);
        
        for (const button of buttons) {
            const text = button.textContent?.trim().toLowerCase() || '';
            
            // Check for Continue button
            if (text === 'continue') {
                log('Found Continue button - clicking...', 'action');
                button.click();
                stats.continueClicks++;
                log(\`Continue clicked! (Total: \${stats.continueClicks})\`, 'success');
                return true;
            }
            
            // Check for Allow button
            if (text === 'allow' || text.includes('allow')) {
                log('Found Allow button - clicking...', 'action');
                button.click();
                stats.allowClicks++;
                log(\`Allow clicked! (Total: \${stats.allowClicks})\`, 'success');
                return true;
            }
        }
        
        return false;
    }

    // Find sessions that need attention (in-progress or unread)
    function findPendingSessions() {
        const sessions = document.querySelectorAll(SELECTORS.sessionItem);
        const pendingSessions = [];
        
        sessions.forEach((session, index) => {
            const hasInProgress = session.querySelector(SELECTORS.inProgressIcon);
            const hasUnread = session.querySelector(SELECTORS.unreadIcon);
            
            if (hasInProgress) {
                pendingSessions.push({ element: session, type: 'in-progress', index });
            } else if (hasUnread) {
                pendingSessions.push({ element: session, type: 'unread', index });
            }
        });
        
        return pendingSessions;
    }

    // Get current session status from badge
    function getStatusFromBadge() {
        const activeCount = document.querySelector(SELECTORS.activeCount);
        const unreadCount = document.querySelector(SELECTORS.unreadCount);
        
        return {
            active: activeCount ? parseInt(activeCount.textContent || '0') : 0,
            unread: unreadCount ? parseInt(unreadCount.textContent || '0') : 0
        };
    }

    // Switch to a pending session
    function switchToSession(sessionInfo) {
        log(\`Switching to \${sessionInfo.type} session (index: \${sessionInfo.index})...\`, 'action');
        sessionInfo.element.click();
        stats.sessionSwitches++;
        log(\`Session switched! (Total switches: \${stats.sessionSwitches})\`, 'success');
        return true;
    }

    // Main check function
    function performCheck() {
        if (!running) return;
        
        stats.checksPerformed++;
        
        // Step 1: Ensure sidebar is open (for session checking)
        if (CONFIG.autoOpenSidebar) {
            ensureSidebarOpen();
        }
        
        // Step 2: Try to click Continue/Allow in current view
        const buttonClicked = findAndClickButton();
        
        if (!buttonClicked) {
            // No button found, check if we need to switch session
            const status = getStatusFromBadge();
            
            if (status.active > 0 || status.unread > 0) {
                // Find pending sessions
                const pendingSessions = findPendingSessions();
                
                if (pendingSessions.length > 0) {
                    // Prioritize in-progress over unread
                    const inProgressSession = pendingSessions.find(s => s.type === 'in-progress');
                    if (inProgressSession) {
                        switchToSession(inProgressSession);
                    } else {
                        // Switch to first unread
                        switchToSession(pendingSessions[0]);
                    }
                } else {
                    log('No pending sessions found despite badge count', 'warning');
                }
            }
        }
    }

    // Start the auto-continue loop
    function start() {
        log(\`AutoContinue v\${CONFIG.version} started!\`, 'success');
        log(\`Config: Poll every \${CONFIG.pollInterval/1000}s, Auto-open sidebar: \${CONFIG.autoOpenSidebar}\`, 'info');
        log(\`Type window.stopAutoContinue() to stop.\`, 'info');
        
        running = true;
        
        // Immediate first check
        performCheck();
        
        // Set up interval
        window._autoContinueInterval = setInterval(() => {
            if (running) {
                performCheck();
            }
        }, CONFIG.pollInterval);
    }

    // Stop function
    function stop() {
        running = false;
        if (window._autoContinueInterval) {
            clearInterval(window._autoContinueInterval);
            window._autoContinueInterval = null;
        }
        log('AutoContinue stopped!', 'warning');
        log(\`📊 Stats:\`, 'info');
        log(\`  • Continue: \${stats.continueClicks}\`, 'info');
        log(\`  • Allow: \${stats.allowClicks}\`, 'info');
        log(\`  • Session switches: \${stats.sessionSwitches}\`, 'info');
        log(\`  • Sidebar toggles: \${stats.sidebarToggles}\`, 'info');
        log(\`  • Checks: \${stats.checksPerformed}\`, 'info');
    }

    // Expose control functions globally
    window.stopAutoContinue = stop;
    window.startAutoContinue = start;
    window.getAutoContinueStats = () => stats;

    // Clear any previous instance
    if (window._autoContinueInterval) {
        clearInterval(window._autoContinueInterval);
        log('Stopped previous AutoContinue instance', 'warning');
    }

    // Start!
    start();
})();
`;

/**
 * Get the inject script as a string
 */
export function getInjectScript(): string {
    return INJECT_SCRIPT.trim();
}
