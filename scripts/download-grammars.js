/**
 * Download Tree-sitter WASM grammars (optional setup)
 * 
 * Tree-sitter grammars will be loaded at runtime from the web-tree-sitter package.
 * This script just creates the parsers directory for caching.
 * 
 * For manual download, you can build grammars from source:
 * https://tree-sitter.github.io/tree-sitter/creating-parsers#building-grammar-wasm-files
 */

const fs = require('fs');
const path = require('path');

// Grammars are loaded at runtime from web-tree-sitter or built from source
// Pre-downloading is not required - the extension handles this dynamically

const DEST_DIR = path.join(__dirname, '..', '.doc-architect', 'parsers');

async function main() {
    console.log('Tree-sitter setup...');
    
    // Create destination directory for future grammar caching
    if (!fs.existsSync(DEST_DIR)) {
        fs.mkdirSync(DEST_DIR, { recursive: true });
    }
    
    // Create marker file
    const markerPath = path.join(DEST_DIR, '.initialized');
    fs.writeFileSync(markerPath, new Date().toISOString());
    
    console.log('  ✓ Parser directory created');
    console.log('  ℹ Grammars will be loaded at runtime on first use');
    console.log('Done!');
}

main().catch(console.error);
