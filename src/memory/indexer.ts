import * as vscode from 'vscode';
import * as path from 'path';
import { VectorDb, VectorItem } from './vectorDb';
import { getEmbedder } from './embedder';
import { parseCode, CodeChunk } from './parser';

/**
 * Indexer - Build and maintain the semantic index
 * 
 * Scans workspace files, chunks them, generates embeddings,
 * and stores in the vector database.
 */

interface IndexConfig {
    include: string[];
    exclude: string[];
    chunkSize: number;
    chunkOverlap: number;
}

const DEFAULT_CONFIG: IndexConfig = {
    include: [
        'src/**/*.{ts,js,tsx,jsx}',
        'docs/**/*.md',
        '*.md'
    ],
    exclude: [
        'node_modules/**',
        'dist/**',
        '*.min.js',
        '.git/**'
    ],
    chunkSize: 500,
    chunkOverlap: 50
};

export class Indexer {
    private vectorDb: VectorDb;
    private config: IndexConfig;
    
    constructor(vectorDb: VectorDb, config?: Partial<IndexConfig>) {
        this.vectorDb = vectorDb;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    
    /**
     * Index the entire workspace
     */
    async indexWorkspace(
        progress?: vscode.Progress<{ message?: string; increment?: number }>,
        token?: vscode.CancellationToken
    ): Promise<{ indexed: number; skipped: number; errors: number }> {
        const stats = { indexed: 0, skipped: 0, errors: 0 };
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return stats;
        }
        
        // Find all matching files
        const files = await this.findFiles();
        const total = files.length;
        
        progress?.report({ message: `Found ${total} files to index` });
        
        const embedder = getEmbedder();
        const batchSize = 10;
        let processed = 0;
        
        for (let i = 0; i < files.length; i += batchSize) {
            if (token?.isCancellationRequested) {
                break;
            }
            
            const batch = files.slice(i, i + batchSize);
            
            for (const file of batch) {
                try {
                    const result = await this.indexFile(file, embedder);
                    if (result.indexed > 0) {
                        stats.indexed += result.indexed;
                    } else {
                        stats.skipped++;
                    }
                } catch (error) {
                    console.error(`Error indexing ${file.fsPath}:`, error);
                    stats.errors++;
                }
                
                processed++;
            }
            
            progress?.report({
                message: `Indexed ${processed}/${total} files`,
                increment: (batchSize / total) * 100
            });
        }
        
        return stats;
    }
    
    /**
     * Index a single file
     */
    async indexFile(
        uri: vscode.Uri,
        embedder = getEmbedder()
    ): Promise<{ indexed: number }> {
        const content = await this.readFile(uri);
        if (!content) {
            return { indexed: 0 };
        }
        
        const filePath = uri.fsPath;
        const ext = path.extname(filePath).toLowerCase();
        const stat = await vscode.workspace.fs.stat(uri);
        
        // Determine file type
        const isCode = ['.ts', '.js', '.tsx', '.jsx'].includes(ext);
        const isDocs = ext === '.md';
        
        if (!isCode && !isDocs) {
            return { indexed: 0 };
        }
        
        // Delete existing chunks for this file
        await this.vectorDb.deleteByFilePath(filePath);
        
        // Chunk the content
        let chunks: VectorItem[];
        
        if (isCode) {
            chunks = await this.chunkCode(content, filePath, stat.mtime);
        } else {
            chunks = this.chunkMarkdown(content, filePath, stat.mtime);
        }
        
        if (chunks.length === 0) {
            return { indexed: 0 };
        }
        
        // Generate embeddings
        const texts = chunks.map(c => c.text);
        const embeddings = await embedder.embedBatch(texts);
        
        // Store in vector database
        const items = chunks.map((chunk, i) => ({
            item: chunk,
            embedding: embeddings[i]
        }));
        
        await this.vectorDb.upsertBatch(items);
        
        return { indexed: chunks.length };
    }
    
    /**
     * Incremental index - only process changed files
     */
    async indexIncremental(
        changedFiles: vscode.Uri[],
        progress?: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<{ indexed: number; errors: number }> {
        const stats = { indexed: 0, errors: 0 };
        const embedder = getEmbedder();
        
        for (let i = 0; i < changedFiles.length; i++) {
            const file = changedFiles[i];
            
            try {
                const result = await this.indexFile(file, embedder);
                stats.indexed += result.indexed;
            } catch (error) {
                console.error(`Error indexing ${file.fsPath}:`, error);
                stats.errors++;
            }
            
            progress?.report({
                message: `Indexed ${i + 1}/${changedFiles.length}`,
                increment: (1 / changedFiles.length) * 100
            });
        }
        
        return stats;
    }
    
    /**
     * Find all files matching include/exclude patterns
     */
    private async findFiles(): Promise<vscode.Uri[]> {
        const includePattern = `{${this.config.include.join(',')}}`;
        const excludePattern = `{${this.config.exclude.join(',')}}`;
        
        return vscode.workspace.findFiles(includePattern, excludePattern);
    }
    
    /**
     * Read file content
     */
    private async readFile(uri: vscode.Uri): Promise<string | undefined> {
        try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            return new TextDecoder().decode(bytes);
        } catch {
            return undefined;
        }
    }
    
    /**
     * Chunk code using tree-sitter (falls back to simple chunking)
     */
    private async chunkCode(
        content: string,
        filePath: string,
        lastModified: number
    ): Promise<VectorItem[]> {
        const ext = path.extname(filePath).toLowerCase();
        const language = ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript';
        
        try {
            // Try tree-sitter parsing
            const codeChunks = await parseCode(content, language);
            
            return codeChunks.map((chunk, i) => ({
                id: `${filePath}#${chunk.type}#${chunk.name || i}`,
                text: chunk.text,
                metadata: {
                    type: 'code' as const,
                    filePath,
                    startLine: chunk.startLine,
                    endLine: chunk.endLine,
                    language,
                    symbolName: chunk.name,
                    lastModified
                }
            }));
        } catch (error) {
            console.warn('Tree-sitter parsing failed, using simple chunking:', error);
            return this.simpleChunk(content, filePath, 'code', lastModified);
        }
    }
    
    /**
     * Chunk markdown by headers
     */
    private chunkMarkdown(
        content: string,
        filePath: string,
        lastModified: number
    ): VectorItem[] {
        const chunks: VectorItem[] = [];
        const lines = content.split('\n');
        
        let currentChunk: string[] = [];
        let currentHeader = '';
        let startLine = 1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
            
            if (headerMatch) {
                // Save previous chunk
                if (currentChunk.length > 0) {
                    chunks.push({
                        id: `${filePath}#${startLine}`,
                        text: currentChunk.join('\n'),
                        metadata: {
                            type: 'docs',
                            filePath,
                            startLine,
                            endLine: i,
                            symbolName: currentHeader,
                            lastModified
                        }
                    });
                }
                
                // Start new chunk
                currentHeader = headerMatch[2];
                currentChunk = [line];
                startLine = i + 1;
            } else {
                currentChunk.push(line);
            }
        }
        
        // Save final chunk
        if (currentChunk.length > 0) {
            chunks.push({
                id: `${filePath}#${startLine}`,
                text: currentChunk.join('\n'),
                metadata: {
                    type: 'docs',
                    filePath,
                    startLine,
                    endLine: lines.length,
                    symbolName: currentHeader,
                    lastModified
                }
            });
        }
        
        return chunks;
    }
    
    /**
     * Simple line-based chunking fallback
     */
    private simpleChunk(
        content: string,
        filePath: string,
        type: 'code' | 'docs',
        lastModified: number
    ): VectorItem[] {
        const chunks: VectorItem[] = [];
        const lines = content.split('\n');
        const { chunkSize, chunkOverlap } = this.config;
        
        for (let i = 0; i < lines.length; i += chunkSize - chunkOverlap) {
            const chunkLines = lines.slice(i, i + chunkSize);
            const text = chunkLines.join('\n');
            
            if (text.trim()) {
                chunks.push({
                    id: `${filePath}#${i + 1}`,
                    text,
                    metadata: {
                        type,
                        filePath,
                        startLine: i + 1,
                        endLine: Math.min(i + chunkSize, lines.length),
                        lastModified
                    }
                });
            }
        }
        
        return chunks;
    }
}
