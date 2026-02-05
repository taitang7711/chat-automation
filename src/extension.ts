import * as vscode from "vscode";

function createWebviewPanel(context: vscode.ExtensionContext): Promise<string | null> {
  return new Promise((resolve) => {
    const panel = vscode.window.createWebviewPanel(
      "chatInput",
      "Gửi tin nhắn vào Chat",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "send":
            panel.dispose();
            resolve(message.text);
            return;
          case "cancel":
            panel.dispose();
            resolve(null);
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });
}

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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h2 {
      margin-bottom: 15px;
      color: var(--vscode-editor-foreground);
      font-size: 18px;
      font-weight: 600;
    }
    textarea {
      width: 100%;
      min-height: 200px;
      padding: 12px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 14px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      resize: vertical;
      margin-bottom: 15px;
    }
    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }
    .buttons {
      display: flex;
      gap: 10px;
    }
    button {
      padding: 8px 20px;
      font-size: 13px;
      cursor: pointer;
      border: none;
      border-radius: 3px;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
    button:active {
      opacity: 0.8;
    }
    .send-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .send-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .cancel-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .cancel-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>📨 Nhập tin nhắn gửi vào Chat</h2>
    <p class="hint">Bạn có thể nhập nhiều dòng. Nhấn Ctrl+Enter để gửi nhanh.</p>
    <textarea id="messageInput" placeholder="Nhập tin nhắn của bạn...&#10;Có thể nhiều dòng..." autofocus>Xin chào</textarea>
    <div class="buttons">
      <button class="send-btn" onclick="sendMessage()">✓ Gửi</button>
      <button class="cancel-btn" onclick="cancel()">✗ Hủy</button>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const textarea = document.getElementById('messageInput');
    
    // Select default text
    textarea.select();
    
    // Ctrl+Enter to send
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        sendMessage();
      }
    });
    
    function sendMessage() {
      const text = textarea.value.trim();
      if (text) {
        vscode.postMessage({
          command: 'send',
          text: text
        });
      }
    }
    
    function cancel() {
      vscode.postMessage({
        command: 'cancel'
      });
    }
  </script>
</body>
</html>`;
}

export function activate(context: vscode.ExtensionContext) {
  // Tạo status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(comments) Chat Auto";
  statusBarItem.tooltip = "Chat Automation - Click to send message";
  statusBarItem.command = "chatAutomation.run";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Command để dừng auto-continue
  const stopCommand = vscode.commands.registerCommand("chatAutomation.stop", () => {
    statusBarItem.text = "$(comments) Chat Auto ⏹️";
    vscode.window.showInformationMessage("⏹️ Chat Automation stopped");
    setTimeout(() => {
      statusBarItem.text = "$(comments) Chat Auto";
    }, 2000);
  });

  const runCommand = vscode.commands.registerCommand("chatAutomation.run", async () => {
    const message = await createWebviewPanel(context);

    if (!message || !message.trim()) {
      return;
    }

    try {
      // Update status bar
      statusBarItem.text = "$(loading~spin) Sending...";

      // 1. Mở Chat panel và focus vào input
      await vscode.commands.executeCommand("workbench.action.chat.open");

      // 2. Đợi một chút để chat panel ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Type message vào input bằng command type
      await vscode.commands.executeCommand("type", { text: message });

      // 4. Đợi một chút
      await new Promise(resolve => setTimeout(resolve, 200));

      // 5. Submit chat bằng command
      await vscode.commands.executeCommand("workbench.action.chat.submit");

      statusBarItem.text = "$(check) Sent!";
      vscode.window.showInformationMessage("🚀 Đã gửi tin nhắn vào Chat!");

      // Reset status bar sau 2 giây
      setTimeout(() => {
        statusBarItem.text = "$(comments) Chat Auto";
      }, 2000);

    } catch (error) {
      statusBarItem.text = "$(error) Failed";
      vscode.window.showErrorMessage(`Lỗi: ${error}`);
      setTimeout(() => {
        statusBarItem.text = "$(comments) Chat Auto";
      }, 3000);
    }
  });

  context.subscriptions.push(runCommand, stopCommand);
}

export function deactivate() { }
