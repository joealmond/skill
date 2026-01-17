import * as vscode from 'vscode';
import { VectorDb } from '../memory/vectorDb';
import { Linter, StalenessReport } from '../memory/linter';

/**
 * CheckStalenessTool - Language Model Tool for staleness detection
 * 
 * Analyzes documentation for potential staleness by comparing
 * against code using semantic similarity.
 */

interface CheckStalenessInput {
    path?: string;
    threshold?: number;
}

interface CheckStalenessResult {
    success: boolean;
    report: StalenessReport | null;
    message: string;
}

export class CheckStalenessTool implements vscode.LanguageModelTool<CheckStalenessInput> {
    readonly name = 'doc-architect_check_staleness';
    private vectorDb: VectorDb;
    
    constructor(vectorDb: VectorDb) {
        this.vectorDb = vectorDb;
    }
    
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<CheckStalenessInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { path: checkPath, threshold } = options.input;
        
        try {
            const linter = new Linter(this.vectorDb, threshold ? {
                threshold,
                severity: {
                    critical: threshold * 0.6,
                    warning: threshold * 0.8,
                    info: threshold
                },
                ignorePaths: []
            } : undefined);
            
            const report = checkPath 
                ? await linter.checkPath(checkPath)
                : await linter.checkAll();
            
            const response: CheckStalenessResult = {
                success: true,
                report,
                message: this.formatReportSummary(report)
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        } catch (error) {
            const response: CheckStalenessResult = {
                success: false,
                report: null,
                message: `Staleness check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        }
    }
    
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<CheckStalenessInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: options.input.path
                ? `Checking staleness for ${options.input.path}...`
                : 'Checking all documentation for staleness...'
        };
    }
    
    private formatReportSummary(report: StalenessReport): string {
        const { overall, summary } = report;
        const statusEmoji = overall === 'healthy' ? '✅' : overall === 'warning' ? '⚠️' : '🚨';
        
        return `${statusEmoji} Documentation Health: ${overall.toUpperCase()}
- Total checked: ${summary.total}
- Healthy: ${summary.healthy}
- Warnings: ${summary.warning}
- Critical: ${summary.critical}`;
    }
}
