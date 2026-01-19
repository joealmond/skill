import * as path from 'path';
import * as fs from 'fs/promises';
import { QueryDocsSchema } from '../schemas.js';
import { findFiles, safeReadText } from '../utils/file-utils.js';
import { loadIndex } from '../utils/index-store.js';

const INDEXABLE_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx', '.md'];
const MAX_FILES_SCANNED = 250;
const MAX_FILE_BYTES = 1_000_000; // 1 MB
const MAX_MATCH_LINES = 3;

export async function queryDocs(args: Record<string, unknown>, workspacePath: string) {
  const { query, limit, filter } = QueryDocsSchema.parse(args);
  const queryLower = query.toLowerCase();

  const extensions = filter === 'code'
    ? ['.ts', '.js', '.tsx', '.jsx']
    : filter === 'docs'
      ? ['.md']
      : INDEXABLE_EXTENSIONS;

  const indexed = await loadIndex(workspacePath);
  const indexedFiles = indexed?.files
    ? indexed.files.map(f => path.join(workspacePath, f.file))
    : null;

  const files = indexedFiles ?? await findFiles(workspacePath, extensions);
  const results: Array<{ file: string; matches: string[] }> = [];

  for (const file of files.slice(0, MAX_FILES_SCANNED)) {
    try {
      const stats = await fs.stat(file);
      if (stats.size > MAX_FILE_BYTES) continue;
    } catch {
      continue;
    }

    const content = await safeReadText(file);
    if (!content) continue;

    if (content.toLowerCase().includes(queryLower)) {
      const lines = content.split('\n');
      const matchingLines = lines
        .filter(line => line.toLowerCase().includes(queryLower))
        .slice(0, MAX_MATCH_LINES);

      if (matchingLines.length > 0) {
        results.push({
          file: path.relative(workspacePath, file),
          matches: matchingLines,
        });
      }
    }

    if (results.length >= limit) break;
  }

  return {
    success: true,
    query,
    results,
    message: `Found ${results.length} files matching "${query}"`,
  };
}
