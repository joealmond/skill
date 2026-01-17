import { LocalIndex } from 'vectra';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * VectorDb - Local vector database using Vectra
 * 
 * Stores embeddings for code and documentation chunks.
 * File-based storage for zero-configuration setup.
 */

export interface VectorItem {
    id: string;
    text: string;
    metadata: {
        type: 'code' | 'docs';
        filePath: string;
        startLine: number;
        endLine: number;
        language?: string;
        symbolName?: string;
        lastModified: number;
    };
}

export interface SearchResult {
    item: VectorItem;
    score: number;
}

export class VectorDb {
    private index: LocalIndex | undefined;
    private storagePath: string;
    private initialized = false;
    
    constructor(storagePath: string) {
        this.storagePath = path.join(storagePath, 'vectors');
    }
    
    /**
     * Lazy initialization - only creates index when first needed
     */
    async ensureInitialized(): Promise<LocalIndex> {
        if (this.index && this.initialized) {
            return this.index;
        }
        
        // Ensure storage directory exists
        await fs.mkdir(this.storagePath, { recursive: true });
        
        this.index = new LocalIndex(this.storagePath);
        
        // Check if index exists, create if not
        if (!await this.index.isIndexCreated()) {
            await this.index.createIndex();
            console.log('Created new vector index at:', this.storagePath);
        }
        
        this.initialized = true;
        return this.index;
    }
    
    /**
     * Add or update an item in the vector database
     */
    async upsertItem(item: VectorItem, embedding: number[]): Promise<void> {
        const index = await this.ensureInitialized();
        
        // Check if item exists
        const existing = await index.getItem(item.id);
        
        if (existing) {
            await index.deleteItem(item.id);
        }
        
        await index.insertItem({
            id: item.id,
            vector: embedding,
            metadata: {
                text: item.text,
                ...item.metadata
            }
        });
    }
    
    /**
     * Batch upsert for efficiency during indexing
     */
    async upsertBatch(items: Array<{ item: VectorItem; embedding: number[] }>): Promise<void> {
        const index = await this.ensureInitialized();
        
        await index.beginUpdate();
        
        try {
            for (const { item, embedding } of items) {
                const existing = await index.getItem(item.id);
                if (existing) {
                    await index.deleteItem(item.id);
                }
                
                await index.insertItem({
                    id: item.id,
                    vector: embedding,
                    metadata: {
                        text: item.text,
                        ...item.metadata
                    }
                });
            }
            
            await index.endUpdate();
        } catch (error) {
            await index.cancelUpdate();
            throw error;
        }
    }
    
    /**
     * Semantic search using query embedding
     */
    async search(
        queryEmbedding: number[],
        options: {
            topK?: number;
            filter?: 'code' | 'docs' | 'all';
            minScore?: number;
        } = {}
    ): Promise<SearchResult[]> {
        const index = await this.ensureInitialized();
        const { topK = 10, filter = 'all', minScore = 0.5 } = options;
        
        const results = await index.queryItems(queryEmbedding, topK * 2); // Over-fetch for filtering
        
        return results
            .filter(r => {
                if (r.score < minScore) return false;
                if (filter !== 'all' && r.item.metadata.type !== filter) return false;
                return true;
            })
            .slice(0, topK)
            .map(r => ({
                item: {
                    id: r.item.id,
                    text: r.item.metadata.text as string,
                    metadata: {
                        type: r.item.metadata.type as 'code' | 'docs',
                        filePath: r.item.metadata.filePath as string,
                        startLine: r.item.metadata.startLine as number,
                        endLine: r.item.metadata.endLine as number,
                        language: r.item.metadata.language as string | undefined,
                        symbolName: r.item.metadata.symbolName as string | undefined,
                        lastModified: r.item.metadata.lastModified as number,
                    }
                },
                score: r.score
            }));
    }
    
    /**
     * Get item by ID
     */
    async getItem(id: string): Promise<VectorItem | undefined> {
        const index = await this.ensureInitialized();
        const result = await index.getItem(id);
        
        if (!result) return undefined;
        
        return {
            id: result.id,
            text: result.metadata.text as string,
            metadata: {
                type: result.metadata.type as 'code' | 'docs',
                filePath: result.metadata.filePath as string,
                startLine: result.metadata.startLine as number,
                endLine: result.metadata.endLine as number,
                language: result.metadata.language as string | undefined,
                symbolName: result.metadata.symbolName as string | undefined,
                lastModified: result.metadata.lastModified as number,
            }
        };
    }
    
    /**
     * Delete item by ID
     */
    async deleteItem(id: string): Promise<void> {
        const index = await this.ensureInitialized();
        await index.deleteItem(id);
    }
    
    /**
     * Get total item count
     */
    async getItemCount(): Promise<number> {
        const index = await this.ensureInitialized();
        const stats = await index.listItems();
        return stats.length;
    }
    
    /**
     * Clear all items (for full reindex)
     */
    async clear(): Promise<void> {
        const index = await this.ensureInitialized();
        await index.deleteIndex();
        await index.createIndex();
    }
    
    /**
     * Find items by file path (for incremental updates)
     */
    async findByFilePath(filePath: string): Promise<VectorItem[]> {
        const index = await this.ensureInitialized();
        const allItems = await index.listItems();
        
        return allItems
            .filter(item => item.metadata.filePath === filePath)
            .map(item => ({
                id: item.id,
                text: item.metadata.text as string,
                metadata: {
                    type: item.metadata.type as 'code' | 'docs',
                    filePath: item.metadata.filePath as string,
                    startLine: item.metadata.startLine as number,
                    endLine: item.metadata.endLine as number,
                    language: item.metadata.language as string | undefined,
                    symbolName: item.metadata.symbolName as string | undefined,
                    lastModified: item.metadata.lastModified as number,
                }
            }));
    }
    
    /**
     * Delete all items for a file path
     */
    async deleteByFilePath(filePath: string): Promise<void> {
        const items = await this.findByFilePath(filePath);
        const index = await this.ensureInitialized();
        
        for (const item of items) {
            await index.deleteItem(item.id);
        }
    }
}
