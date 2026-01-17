/**
 * Download Tree-sitter WASM grammars
 * 
 * This script runs after npm install to download the required
 * tree-sitter grammar files for JavaScript and TypeScript.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GRAMMARS = [
    {
        name: 'tree-sitter-javascript.wasm',
        url: 'https://unpkg.com/tree-sitter-javascript@0.21.4/tree-sitter-javascript.wasm'
    },
    {
        name: 'tree-sitter-typescript.wasm', 
        url: 'https://unpkg.com/tree-sitter-typescript@0.21.2/tree-sitter-typescript.wasm'
    }
];

const DEST_DIR = path.join(__dirname, '..', '.doc-architect', 'parsers');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle redirect
                https.get(response.headers.location, (res) => {
                    res.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', reject);
            } else if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => {}); // Delete incomplete file
            reject(err);
        });
    });
}

async function main() {
    // Create destination directory
    if (!fs.existsSync(DEST_DIR)) {
        fs.mkdirSync(DEST_DIR, { recursive: true });
    }
    
    console.log('Downloading tree-sitter grammars...');
    
    for (const grammar of GRAMMARS) {
        const destPath = path.join(DEST_DIR, grammar.name);
        
        if (fs.existsSync(destPath)) {
            console.log(`  ✓ ${grammar.name} (already exists)`);
            continue;
        }
        
        try {
            console.log(`  ↓ ${grammar.name}...`);
            await downloadFile(grammar.url, destPath);
            console.log(`  ✓ ${grammar.name}`);
        } catch (error) {
            console.error(`  ✗ ${grammar.name}: ${error.message}`);
            // Don't fail the install, grammars can be downloaded later
        }
    }
    
    console.log('Done!');
}

main().catch(console.error);
