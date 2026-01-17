import * as vscode from 'vscode';
import * as path from 'path';

/**
 * WriteFileTool - Language Model Tool for creating/updating files
 * 
 * Writes content to documentation files using vscode.workspace.fs
 */

interface WriteFileInput {
    path: string;
    content: string;
    createDirs?: boolean;
}

interface WriteFileResult {
    success: boolean;
    path: string;
    message: string;
}

export class WriteFileTool implements vscode.LanguageModelTool<WriteFileInput> {
    readonly name = 'doc-architect_write_file';
    
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<WriteFileInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { path: filePath, content, createDirs = true } = options.input;
        
        try {
            // Resolve path relative to workspace
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }
            
            const absolutePath = path.isAbsolute(filePath)
                ? filePath
                : path.join(workspaceFolder.uri.fsPath, filePath);
            
            const fileUri = vscode.Uri.file(absolutePath);
            
            // Create parent directories if needed
            if (createDirs) {
                const dirUri = vscode.Uri.file(path.dirname(absolutePath));
                try {
                    await vscode.workspace.fs.createDirectory(dirUri);
                } catch {
                    // Directory might already exist
                }
            }
            
            // Write file
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
            
            const response: WriteFileResult = {
                success: true,
                path: absolutePath,
                message: `Successfully wrote ${content.length} characters to ${filePath}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        } catch (error) {
            const response: WriteFileResult = {
                success: false,
                path: filePath,
                message: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        }
    }
    
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<WriteFileInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: `Writing to ${options.input.path}...`,
            confirmationMessages: {
                title: 'Write File',
                message: new vscode.MarkdownString(
                    `This will write ${options.input.content.length} characters to \`${options.input.path}\``
                )
            }
        };
    }
}
