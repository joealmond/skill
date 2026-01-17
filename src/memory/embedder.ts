import * as vscode from 'vscode';

/**
 * Embedder - Generate embeddings for text
 * 
 * Tries VS Code's built-in embeddings first, falls back to
 * @xenova/transformers with lazy loading.
 */

// Lazy-loaded transformer
let pipeline: any;
let extractor: any;

export class Embedder {
    private dimensions = 384; // all-MiniLM-L6-v2 dimensions
    private initialized = false;
    private useVscode = true;
    
    /**
     * Initialize the embedder
     * Tries VS Code first, then falls back to Xenova
     */
    async ensureInitialized(): Promise<void> {
        if (this.initialized) return;
        
        // Try VS Code embeddings API first (if available)
        try {
            // Note: VS Code embeddings API may not be available yet
            // This is a placeholder for when it becomes available
            this.useVscode = true;
            this.initialized = true;
            console.log('Embedder: Using VS Code embeddings');
            return;
        } catch {
            // Fall through to Xenova
        }
        
        // Lazy load Xenova transformers
        try {
            if (!pipeline) {
                const transformers = await import('@xenova/transformers');
                pipeline = transformers.pipeline;
            }
            
            console.log('Embedder: Loading all-MiniLM-L6-v2...');
            extractor = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2',
                { quantized: true }
            );
            
            this.useVscode = false;
            this.initialized = true;
            console.log('Embedder: Xenova model loaded');
        } catch (error) {
            console.error('Embedder: Failed to initialize', error);
            throw new Error('Could not initialize embedding model');
        }
    }
    
    /**
     * Generate embedding for a single text
     */
    async embed(text: string): Promise<number[]> {
        await this.ensureInitialized();
        
        // Truncate long texts
        const maxLength = 512;
        const truncated = text.length > maxLength 
            ? text.substring(0, maxLength) 
            : text;
        
        if (this.useVscode) {
            // Use VS Code embeddings when available
            return this.embedWithVscode(truncated);
        } else {
            // Use Xenova
            return this.embedWithXenova(truncated);
        }
    }
    
    /**
     * Generate embeddings for multiple texts (batched)
     */
    async embedBatch(texts: string[]): Promise<number[][]> {
        await this.ensureInitialized();
        
        const maxLength = 512;
        const truncated = texts.map(t => 
            t.length > maxLength ? t.substring(0, maxLength) : t
        );
        
        if (this.useVscode) {
            // VS Code may support batch in the future
            return Promise.all(truncated.map(t => this.embedWithVscode(t)));
        } else {
            // Xenova batch processing
            return this.embedBatchWithXenova(truncated);
        }
    }
    
    /**
     * VS Code embeddings (placeholder for future API)
     */
    private async embedWithVscode(text: string): Promise<number[]> {
        // TODO: Use vscode.lm.computeEmbeddings when available
        // For now, fall back to Xenova
        if (!extractor) {
            await this.initXenova();
        }
        return this.embedWithXenova(text);
    }
    
    /**
     * Initialize Xenova on demand
     */
    private async initXenova(): Promise<void> {
        if (!pipeline) {
            const transformers = await import('@xenova/transformers');
            pipeline = transformers.pipeline;
        }
        
        if (!extractor) {
            extractor = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2',
                { quantized: true }
            );
        }
    }
    
    /**
     * Generate embedding with Xenova
     */
    private async embedWithXenova(text: string): Promise<number[]> {
        const output = await extractor(text, {
            pooling: 'mean',
            normalize: true
        });
        
        return Array.from(output.data as Float32Array);
    }
    
    /**
     * Batch embedding with Xenova
     */
    private async embedBatchWithXenova(texts: string[]): Promise<number[][]> {
        const results: number[][] = [];
        
        // Process in small batches to avoid memory issues
        const batchSize = 10;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const embeddings = await Promise.all(
                batch.map(t => this.embedWithXenova(t))
            );
            results.push(...embeddings);
        }
        
        return results;
    }
    
    /**
     * Get embedding dimensions
     */
    getDimensions(): number {
        return this.dimensions;
    }
    
    /**
     * Compute cosine similarity between two embeddings
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Embeddings must have same dimensions');
        }
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

// Singleton instance
let embedderInstance: Embedder | undefined;

export function getEmbedder(): Embedder {
    if (!embedderInstance) {
        embedderInstance = new Embedder();
    }
    return embedderInstance;
}
