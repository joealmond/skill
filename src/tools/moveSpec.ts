import * as vscode from 'vscode';
import * as path from 'path';

/**
 * MoveSpecTool - Language Model Tool for spec lifecycle management
 * 
 * Moves specifications between ACTIVE and DONE folders.
 */

interface MoveSpecInput {
    specName: string;
    direction: 'to_done' | 'to_active';
}

interface MoveSpecResult {
    success: boolean;
    from: string;
    to: string;
    message: string;
}

export class MoveSpecTool implements vscode.LanguageModelTool<MoveSpecInput> {
    readonly name = 'doc-architect_move_spec';
    
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<MoveSpecInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { specName, direction } = options.input;
        
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }
            
            const basePath = workspaceFolder.uri.fsPath;
            const activePath = path.join(basePath, 'docs', 'specs', 'ACTIVE');
            const donePath = path.join(basePath, 'docs', 'specs', 'DONE');
            
            // Ensure spec name has .md extension
            const fileName = specName.endsWith('.md') ? specName : `${specName}.md`;
            
            let fromPath: string;
            let toPath: string;
            
            if (direction === 'to_done') {
                fromPath = path.join(activePath, fileName);
                toPath = path.join(donePath, fileName);
            } else {
                fromPath = path.join(donePath, fileName);
                toPath = path.join(activePath, fileName);
            }
            
            const fromUri = vscode.Uri.file(fromPath);
            const toUri = vscode.Uri.file(toPath);
            
            // Check if source exists
            try {
                await vscode.workspace.fs.stat(fromUri);
            } catch {
                throw new Error(`Spec not found: ${fromPath}`);
            }
            
            // Move the file
            await vscode.workspace.fs.rename(fromUri, toUri, { overwrite: false });
            
            const response: MoveSpecResult = {
                success: true,
                from: fromPath,
                to: toPath,
                message: `Successfully moved ${fileName} ${direction === 'to_done' ? 'to DONE' : 'to ACTIVE'}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        } catch (error) {
            const response: MoveSpecResult = {
                success: false,
                from: '',
                to: '',
                message: `Failed to move spec: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        }
    }
    
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<MoveSpecInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { specName, direction } = options.input;
        
        return {
            invocationMessage: `Moving spec ${specName} ${direction === 'to_done' ? 'to DONE' : 'to ACTIVE'}...`,
            confirmationMessages: {
                title: 'Move Specification',
                message: new vscode.MarkdownString(
                    `Move \`${specName}\` ${direction === 'to_done' ? 'from ACTIVE to DONE' : 'from DONE to ACTIVE'}?`
                )
            }
        };
    }
}
