/**
 * Parser - Tree-sitter based code parsing
 * 
 * Extracts semantic chunks (functions, classes, etc.) from code
 * using tree-sitter WASM parsers.
 */

// Lazy-loaded parser
let Parser: any;
let parserInstance: any;
let languageCache: Map<string, any> = new Map();

export interface CodeChunk {
    type: 'function' | 'class' | 'method' | 'interface' | 'type' | 'variable' | 'import' | 'other';
    name?: string;
    text: string;
    startLine: number;
    endLine: number;
}

/**
 * Parse code into semantic chunks
 */
export async function parseCode(code: string, language: 'javascript' | 'typescript'): Promise<CodeChunk[]> {
    await ensureParser();
    
    const lang = await loadLanguage(language);
    parserInstance.setLanguage(lang);
    
    const tree = parserInstance.parse(code);
    const chunks: CodeChunk[] = [];
    
    // Walk the AST and extract top-level declarations
    walkNode(tree.rootNode, code, chunks);
    
    return chunks;
}

/**
 * Ensure tree-sitter parser is loaded
 */
async function ensureParser(): Promise<void> {
    if (parserInstance) return;
    
    try {
        const TreeSitter = await import('web-tree-sitter');
        await TreeSitter.default.init();
        Parser = TreeSitter.default;
        parserInstance = new Parser();
        console.log('Tree-sitter parser initialized');
    } catch (error) {
        console.error('Failed to initialize tree-sitter:', error);
        throw error;
    }
}

/**
 * Load a language grammar (lazy, cached)
 */
async function loadLanguage(language: 'javascript' | 'typescript'): Promise<any> {
    if (languageCache.has(language)) {
        return languageCache.get(language);
    }
    
    try {
        // Try to load from node_modules
        const wasmFile = language === 'typescript' 
            ? 'tree-sitter-typescript.wasm'
            : 'tree-sitter-javascript.wasm';
        
        // In VS Code extension context, we'd bundle these or download on first use
        const lang = await Parser.Language.load(wasmFile);
        languageCache.set(language, lang);
        return lang;
    } catch (error) {
        console.error(`Failed to load ${language} grammar:`, error);
        throw error;
    }
}

/**
 * Walk AST and extract chunks
 */
function walkNode(node: any, code: string, chunks: CodeChunk[]): void {
    const nodeType = node.type;
    
    // Top-level declarations we care about
    const declarationTypes: Record<string, CodeChunk['type']> = {
        'function_declaration': 'function',
        'function': 'function',
        'arrow_function': 'function',
        'class_declaration': 'class',
        'class': 'class',
        'method_definition': 'method',
        'interface_declaration': 'interface',
        'type_alias_declaration': 'type',
        'variable_declaration': 'variable',
        'lexical_declaration': 'variable',
        'import_statement': 'import',
        'export_statement': 'other',
    };
    
    if (declarationTypes[nodeType]) {
        const chunk = extractChunk(node, code, declarationTypes[nodeType]);
        if (chunk && chunk.text.trim().length > 10) {
            chunks.push(chunk);
        }
    }
    
    // Recurse into children (but not too deep for functions/classes)
    const shouldRecurse = !['function_declaration', 'class_declaration', 'arrow_function'].includes(nodeType);
    
    if (shouldRecurse) {
        for (let i = 0; i < node.childCount; i++) {
            walkNode(node.child(i), code, chunks);
        }
    }
}

/**
 * Extract chunk from AST node
 */
function extractChunk(node: any, code: string, type: CodeChunk['type']): CodeChunk | null {
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const text = code.substring(node.startIndex, node.endIndex);
    
    // Try to extract name
    let name: string | undefined;
    
    // Look for identifier child
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.type === 'identifier' || child.type === 'property_identifier') {
            name = code.substring(child.startIndex, child.endIndex);
            break;
        }
    }
    
    return {
        type,
        name,
        text,
        startLine,
        endLine
    };
}

/**
 * Check if tree-sitter is available
 */
export async function isParserAvailable(): Promise<boolean> {
    try {
        await ensureParser();
        return true;
    } catch {
        return false;
    }
}
