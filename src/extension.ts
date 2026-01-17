import * as vscode from 'vscode';
import { IndexCodebaseTool } from './tools/indexCodebase';
import { QueryDocsTool } from './tools/queryDocs';
import { WriteFileTool } from './tools/writeFile';
import { CheckStalenessTool } from './tools/checkStaleness';
import { RunRalphLoopTool } from './tools/runRalphLoop';
import { MoveSpecTool } from './tools/moveSpec';
import { AppendChangelogTool } from './tools/appendChangelog';
import { VectorDb } from './memory/vectorDb';
import { Indexer } from './memory/indexer';

/**
 * Doc-Architect Extension
 * 
 * Provides Language Model Tools for self-healing documentation.
 * Works with custom agents defined in .github/agents/
 */

let vectorDb: VectorDb | undefined;
let indexer: Indexer | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Doc-Architect activating...');
    
    // Initialize shared services (lazy - actual init happens on first use)
    const storagePath = context.globalStorageUri.fsPath;
    vectorDb = new VectorDb(storagePath);
    indexer = new Indexer(vectorDb);
    
    // Register all Language Model Tools
    const tools = [
        new IndexCodebaseTool(indexer),
        new QueryDocsTool(vectorDb),
        new WriteFileTool(),
        new CheckStalenessTool(vectorDb),
        new RunRalphLoopTool(),
        new MoveSpecTool(),
        new AppendChangelogTool(),
    ];
    
    for (const tool of tools) {
        const disposable = vscode.lm.registerTool(tool.name, tool);
        context.subscriptions.push(disposable);
        console.log(`Registered tool: ${tool.name}`);
    }
    
    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(book) Doc-Architect';
    statusBarItem.tooltip = 'Doc-Architect: Self-healing documentation';
    statusBarItem.command = 'doc-architect.showStatus';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    
    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('doc-architect.showStatus', async () => {
            const indexed = await vectorDb?.getItemCount() ?? 0;
            vscode.window.showInformationMessage(
                `Doc-Architect: ${indexed} chunks indexed`
            );
        }),
        
        vscode.commands.registerCommand('doc-architect.reindex', async () => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Doc-Architect: Indexing codebase...',
                cancellable: true
            }, async (progress, token) => {
                await indexer?.indexWorkspace(progress, token);
            });
        })
    );
    
    console.log('Doc-Architect activated successfully');
}

export function deactivate() {
    console.log('Doc-Architect deactivated');
    vectorDb = undefined;
    indexer = undefined;
}
