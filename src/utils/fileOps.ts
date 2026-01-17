import * as vscode from 'vscode';
import * as path from 'path';

/**
 * File Operations Utility
 * 
 * Common file system operations using vscode.workspace.fs
 */

/**
 * Read a file as text
 */
export async function readFile(uri: vscode.Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(bytes);
}

/**
 * Write text to a file
 */
export async function writeFile(uri: vscode.Uri, content: string): Promise<void> {
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
}

/**
 * Check if a file exists
 */
export async function fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensure a directory exists
 */
export async function ensureDir(uri: vscode.Uri): Promise<void> {
    try {
        await vscode.workspace.fs.createDirectory(uri);
    } catch {
        // Directory might already exist
    }
}

/**
 * Get workspace-relative path
 */
export function getRelativePath(absolutePath: string): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return absolutePath;
    }
    
    return path.relative(workspaceFolder.uri.fsPath, absolutePath);
}

/**
 * Get absolute path from workspace-relative path
 */
export function getAbsolutePath(relativePath: string): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return relativePath;
    }
    
    return path.isAbsolute(relativePath)
        ? relativePath
        : path.join(workspaceFolder.uri.fsPath, relativePath);
}

/**
 * List files matching a pattern
 */
export async function findFiles(
    include: string,
    exclude?: string
): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(include, exclude);
}

/**
 * Get file modification time
 */
export async function getModifiedTime(uri: vscode.Uri): Promise<number> {
    const stat = await vscode.workspace.fs.stat(uri);
    return stat.mtime;
}

/**
 * Copy a file
 */
export async function copyFile(source: vscode.Uri, target: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.copy(source, target, { overwrite: true });
}

/**
 * Move/rename a file
 */
export async function moveFile(source: vscode.Uri, target: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.rename(source, target, { overwrite: false });
}

/**
 * Delete a file
 */
export async function deleteFile(uri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.delete(uri, { useTrash: true });
}

/**
 * Read JSON file
 */
export async function readJson<T>(uri: vscode.Uri): Promise<T> {
    const content = await readFile(uri);
    return JSON.parse(content);
}

/**
 * Write JSON file
 */
export async function writeJson(uri: vscode.Uri, data: unknown, pretty = true): Promise<void> {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await writeFile(uri, content);
}
