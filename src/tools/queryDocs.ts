import * as vscode from 'vscode';
import { VectorDb, SearchResult } from '../memory/vectorDb';
import { getEmbedder } from '../memory/embedder';

/**
 * QueryDocsTool - Language Model Tool for semantic search
 * 
 * Searches across code and documentation using semantic similarity.
 */

interface QueryDocsInput {
    query: string;
    topK?: number;
    filter?: 'code' | 'docs' | 'all';
}

interface QueryDocsResult {
    success: boolean;
    results: Array<{
        text: string;
        filePath: string;
        startLine: number;
        endLine: number;
        type: 'code' | 'docs';
        symbol?: string;
        score: number;
    }>;
    message: string;
}

export class QueryDocsTool implements vscode.LanguageModelTool<QueryDocsInput> {
    readonly name = 'doc-architect_query_docs';
    private vectorDb: VectorDb;
    
    constructor(vectorDb: VectorDb) {
        this.vectorDb = vectorDb;
    }
    
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<QueryDocsInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const { query, topK = 10, filter = 'all' } = options.input;
        
        try {
            // Generate query embedding
            const embedder = getEmbedder();
            const queryEmbedding = await embedder.embed(query);
            
            // Search vector database
            const results = await this.vectorDb.search(queryEmbedding, {
                topK,
                filter,
                minScore: 0.5
            });
            
            const response: QueryDocsResult = {
                success: true,
                results: results.map(r => ({
                    text: this.truncateText(r.item.text, 500),
                    filePath: r.item.metadata.filePath,
                    startLine: r.item.metadata.startLine,
                    endLine: r.item.metadata.endLine,
                    type: r.item.metadata.type,
                    symbol: r.item.metadata.symbolName,
                    score: Math.round(r.score * 100) / 100
                })),
                message: `Found ${results.length} results for "${query}"`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        } catch (error) {
            const response: QueryDocsResult = {
                success: false,
                results: [],
                message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(response, null, 2))
            ]);
        }
    }
    
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<QueryDocsInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: `Searching for "${options.input.query}"...`
        };
    }
    
    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }
}
