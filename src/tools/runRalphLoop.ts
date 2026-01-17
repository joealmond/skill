import * as vscode from 'vscode';
import * as path from 'path';

/**
 * RunRalphLoopTool - Language Model Tool for autonomous task processing
 * 
 * Reads PROGRESS.md and processes pending tasks with safety limits.
 */

interface RunRalphLoopInput {
    maxIterations?: number;
    dryRun?: boolean;
}

interface Task {
    id: string;
    text: string;
    priority: 'P0' | 'P1' | 'P2';
    line: number;
}

interface RunRalphLoopResult {
    success: boolean;
    processed: number;
    remaining: number;
    tasks: Array<{
        id: string;
        text: string;
        status: 'completed' | 'failed' | 'skipped';
        error?: string;
    }>;
    message: string;
}

export class RunRalphLoopTool implements vscode.LanguageModelTool<RunRalphLoopInput> {
    readonly name = 'doc-architect_run_ralph_loop';
    
    // Safety limits
    private readonly MAX_ITERATIONS = 10;
    private readonly TASK_TIMEOUT = 30000; // 30 seconds
    private readonly MAX_RETRIES = 3;
    
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<RunRalphLoopInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { maxIterations = this.MAX_ITERATIONS, dryRun = false } = options.input;
        
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }
            
            const progressPath = path.join(workspaceFolder.uri.fsPath, 'PROGRESS.md');
            const progressUri = vscode.Uri.file(progressPath);
            
            // Read PROGRESS.md
            let content: string;
            try {
                const bytes = await vscode.workspace.fs.readFile(progressUri);
                content = new TextDecoder().decode(bytes);
            } catch {
                throw new Error('PROGRESS.md not found. Create it with pending tasks first.');
            }
            
            // Parse tasks
            const tasks = this.parseTasks(content);
            const pendingTasks = tasks.filter(t => !this.isCompleted(content, t.line));
            
            if (pendingTasks.length === 0) {
                const response: RunRalphLoopResult = {
                    success: true,
                    processed: 0,
                    remaining: 0,
                    tasks: [],
                    message: '✅ All tasks are complete!'
                };
                
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
                ]);
            }
            
            // Sort by priority
            pendingTasks.sort((a, b) => {
                const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
            
            // Limit iterations
            const tasksToProcess = pendingTasks.slice(0, Math.min(maxIterations, this.MAX_ITERATIONS));
            
            if (dryRun) {
                const response: RunRalphLoopResult = {
                    success: true,
                    processed: 0,
                    remaining: pendingTasks.length,
                    tasks: tasksToProcess.map(t => ({
                        id: t.id,
                        text: t.text,
                        status: 'skipped' as const
                    })),
                    message: `Dry run: Would process ${tasksToProcess.length} tasks`
                };
                
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
                ]);
            }
            
            // Note: Actual task execution would be handled by the agent
            // This tool returns the task list for the agent to process
            const response: RunRalphLoopResult = {
                success: true,
                processed: 0,
                remaining: pendingTasks.length,
                tasks: tasksToProcess.map(t => ({
                    id: t.id,
                    text: t.text,
                    status: 'skipped' as const // Agent will update these
                })),
                message: `Found ${tasksToProcess.length} tasks to process. Agent should execute each task and mark complete.`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        } catch (error) {
            const response: RunRalphLoopResult = {
                success: false,
                processed: 0,
                remaining: 0,
                tasks: [],
                message: `Ralph loop failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        }
    }
    
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<RunRalphLoopInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { maxIterations = this.MAX_ITERATIONS, dryRun = false } = options.input;
        
        return {
            invocationMessage: dryRun 
                ? 'Previewing pending tasks...'
                : `Starting Ralph loop (max ${maxIterations} iterations)...`,
            confirmationMessages: dryRun ? undefined : {
                title: 'Run Ralph Loop',
                message: new vscode.MarkdownString(
                    `This will autonomously process up to **${maxIterations}** tasks from PROGRESS.md. Continue?`
                )
            }
        };
    }
    
    /**
     * Parse tasks from PROGRESS.md
     */
    private parseTasks(content: string): Task[] {
        const tasks: Task[] = [];
        const lines = content.split('\n');
        
        // Match patterns:
        // - [ ] Task description
        // - [ ] [P0] Task description
        // - [ ] P0: Task description
        const taskPattern = /^- \[ \]\s*(?:\[?(P[012])\]?:?\s*)?(.+)$/;
        
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(taskPattern);
            if (match) {
                const priority = (match[1] as 'P0' | 'P1' | 'P2') || 'P2';
                const text = match[2].trim();
                
                tasks.push({
                    id: `task-${i + 1}`,
                    text,
                    priority,
                    line: i
                });
            }
        }
        
        return tasks;
    }
    
    /**
     * Check if a task line is completed
     */
    private isCompleted(content: string, line: number): boolean {
        const lines = content.split('\n');
        if (line >= lines.length) return false;
        
        return lines[line].startsWith('- [x]') || lines[line].startsWith('- [X]');
    }
}
