import * as vscode from 'vscode';
import { Indexer } from '../memory/indexer';

/**
 * IndexCodebaseTool - Language Model Tool for building the semantic index
 * 
 * Builds or refreshes the semantic index of the codebase for search.
 */

interface IndexCodebaseInput {
    scope?: string;
    incremental?: boolean;
}

interface IndexCodebaseResult {
    success: boolean;
    indexed: number;
    skipped: number;
    errors: number;
    message: string;
}

export class IndexCodebaseTool implements vscode.LanguageModelTool<IndexCodebaseInput> {
    readonly name = 'doc-architect_index_codebase';
    private indexer: Indexer;
    
    constructor(indexer: Indexer) {
        this.indexer = indexer;
    }
    
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IndexCodebaseInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { scope, incremental = true } = options.input;
        
        try {
            let result;
            
            if (scope) {
                // Index specific folder
                const scopeUri = vscode.Uri.file(scope);
                const files = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(scopeUri, '**/*'),
                    '**/node_modules/**'
                );
                result = await this.indexer.indexIncremental(files);
            } else {
                // Full workspace index
                result = await this.indexer.indexWorkspace();
            }
            
            const response: IndexCodebaseResult = {
                success: true,
                indexed: result.indexed,
                skipped: result.skipped ?? 0,
                errors: result.errors,
                message: `Successfully indexed ${result.indexed} chunks. ${result.errors} errors.`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        } catch (error) {
            const response: IndexCodebaseResult = {
                success: false,
                indexed: 0,
                skipped: 0,
                errors: 1,
                message: `Indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        }
    }
    
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IndexCodebaseInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const { scope } = options.input;
        
        return {
            invocationMessage: scope 
                ? `Indexing ${scope}...`
                : 'Indexing entire workspace...'
        };
    }
}
