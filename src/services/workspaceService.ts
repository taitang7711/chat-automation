/**
 * Workspace Service - Xử lý thông tin workspace
 */

import * as vscode from 'vscode';

export interface WorkspaceInfo {
  path: string;
  name: string;
  uri: vscode.Uri;
}

/**
 * Lấy thông tin workspace hiện tại
 */
export function getCurrentWorkspace(): WorkspaceInfo | null {
  const folders = vscode.workspace.workspaceFolders;
  
  if (!folders || folders.length === 0) {
    return null;
  }
  
  const folder = folders[0];
  
  return {
    path: folder.uri.fsPath,
    name: folder.name,
    uri: folder.uri,
  };
}

/**
 * Lấy tên workspace để hiển thị
 */
export function getWorkspaceName(): string {
  const workspace = getCurrentWorkspace();
  return workspace?.name || 'No workspace';
}

/**
 * Kiểm tra có workspace đang mở không
 */
export function hasWorkspace(): boolean {
  return getCurrentWorkspace() !== null;
}

/**
 * Lấy đường dẫn workspace
 */
export function getWorkspacePath(): string | null {
  return getCurrentWorkspace()?.path || null;
}
