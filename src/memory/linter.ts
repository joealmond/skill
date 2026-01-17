import { VectorDb, SearchResult } from './vectorDb';
import { getEmbedder, Embedder } from './embedder';

/**
 * Linter - Check documentation for staleness
 * 
 * Compares documentation chunks against related code chunks
 * using semantic similarity to detect potential staleness.
 */

export interface StalenessReport {
    overall: 'healthy' | 'warning' | 'critical';
    score: number;
    items: StalenessItem[];
    summary: {
        total: number;
        healthy: number;
        warning: number;
        critical: number;
    };
}

export interface StalenessItem {
    docPath: string;
    docSection: string;
    severity: 'info' | 'warning' | 'critical';
    score: number;
    relatedCode: {
        path: string;
        symbol?: string;
        similarity: number;
    }[];
    suggestion: string;
}

export interface StalenessConfig {
    threshold: number;
    severity: {
        critical: number;
        warning: number;
        info: number;
    };
    ignorePaths: string[];
}

const DEFAULT_CONFIG: StalenessConfig = {
    threshold: 0.85,
    severity: {
        critical: 0.5,
        warning: 0.7,
        info: 0.85
    },
    ignorePaths: ['docs/gallery/**', 'CHANGELOG.md']
};

export class Linter {
    private vectorDb: VectorDb;
    private embedder: Embedder;
    private config: StalenessConfig;
    
    constructor(vectorDb: VectorDb, config?: Partial<StalenessConfig>) {
        this.vectorDb = vectorDb;
        this.embedder = getEmbedder();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    
    /**
     * Check all documentation for staleness
     */
    async checkAll(): Promise<StalenessReport> {
        const items: StalenessItem[] = [];
        
        // Get all doc items
        const docItems = await this.getDocItems();
        
        for (const doc of docItems) {
            if (this.shouldIgnore(doc.item.metadata.filePath)) {
                continue;
            }
            
            const item = await this.checkDocItem(doc);
            if (item) {
                items.push(item);
            }
        }
        
        return this.buildReport(items);
    }
    
    /**
     * Check a specific file or folder
     */
    async checkPath(path: string): Promise<StalenessReport> {
        const items: StalenessItem[] = [];
        
        // Get doc items matching path
        const docItems = await this.getDocItems();
        const filtered = docItems.filter(d => 
            d.item.metadata.filePath.includes(path)
        );
        
        for (const doc of filtered) {
            if (this.shouldIgnore(doc.item.metadata.filePath)) {
                continue;
            }
            
            const item = await this.checkDocItem(doc);
            if (item) {
                items.push(item);
            }
        }
        
        return this.buildReport(items);
    }
    
    /**
     * Check a single document item
     */
    private async checkDocItem(doc: SearchResult): Promise<StalenessItem | null> {
        // Search for related code
        const docEmbedding = await this.embedder.embed(doc.item.text);
        const relatedCode = await this.vectorDb.search(docEmbedding, {
            topK: 5,
            filter: 'code',
            minScore: 0.3
        });
        
        if (relatedCode.length === 0) {
            // No related code found - might be orphaned docs
            return {
                docPath: doc.item.metadata.filePath,
                docSection: doc.item.metadata.symbolName || 'Unknown section',
                severity: 'info',
                score: 0,
                relatedCode: [],
                suggestion: 'No related code found. This documentation may be orphaned or covering external topics.'
            };
        }
        
        // Calculate average similarity
        const avgSimilarity = relatedCode.reduce((sum, r) => sum + r.score, 0) / relatedCode.length;
        const maxSimilarity = Math.max(...relatedCode.map(r => r.score));
        
        // Determine severity
        const severity = this.getSeverity(maxSimilarity);
        
        if (severity === 'info' && maxSimilarity >= this.config.threshold) {
            // Documentation is up to date
            return null;
        }
        
        return {
            docPath: doc.item.metadata.filePath,
            docSection: doc.item.metadata.symbolName || 'Unknown section',
            severity,
            score: maxSimilarity,
            relatedCode: relatedCode.map(r => ({
                path: r.item.metadata.filePath,
                symbol: r.item.metadata.symbolName,
                similarity: r.score
            })),
            suggestion: this.getSuggestion(severity, relatedCode)
        };
    }
    
    /**
     * Get all documentation items from vector database
     */
    private async getDocItems(): Promise<SearchResult[]> {
        // Use a generic query to get all docs
        const queryEmbedding = await this.embedder.embed('documentation readme guide');
        
        return this.vectorDb.search(queryEmbedding, {
            topK: 1000, // Get all docs
            filter: 'docs',
            minScore: 0
        });
    }
    
    /**
     * Check if path should be ignored
     */
    private shouldIgnore(path: string): boolean {
        return this.config.ignorePaths.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
            return regex.test(path);
        });
    }
    
    /**
     * Determine severity based on similarity score
     */
    private getSeverity(score: number): 'info' | 'warning' | 'critical' {
        if (score < this.config.severity.critical) {
            return 'critical';
        } else if (score < this.config.severity.warning) {
            return 'warning';
        }
        return 'info';
    }
    
    /**
     * Generate suggestion based on severity
     */
    private getSuggestion(severity: 'info' | 'warning' | 'critical', relatedCode: SearchResult[]): string {
        const codeRefs = relatedCode
            .slice(0, 3)
            .map(r => r.item.metadata.symbolName || r.item.metadata.filePath)
            .join(', ');
        
        switch (severity) {
            case 'critical':
                return `Documentation appears significantly outdated. Review and update to match current implementation in: ${codeRefs}`;
            case 'warning':
                return `Documentation may need updates. Compare with: ${codeRefs}`;
            default:
                return `Minor drift detected. Consider reviewing: ${codeRefs}`;
        }
    }
    
    /**
     * Build the final report
     */
    private buildReport(items: StalenessItem[]): StalenessReport {
        const summary = {
            total: items.length,
            healthy: 0,
            warning: 0,
            critical: 0
        };
        
        for (const item of items) {
            switch (item.severity) {
                case 'critical':
                    summary.critical++;
                    break;
                case 'warning':
                    summary.warning++;
                    break;
                default:
                    summary.healthy++;
            }
        }
        
        // Calculate overall health
        let overall: 'healthy' | 'warning' | 'critical';
        let score: number;
        
        if (summary.critical > 0) {
            overall = 'critical';
            score = 1 - (summary.critical / summary.total);
        } else if (summary.warning > 0) {
            overall = 'warning';
            score = 1 - (summary.warning / summary.total) * 0.5;
        } else {
            overall = 'healthy';
            score = 1;
        }
        
        return {
            overall,
            score,
            items: items.filter(i => i.severity !== 'info' || i.score < this.config.threshold),
            summary
        };
    }
}
