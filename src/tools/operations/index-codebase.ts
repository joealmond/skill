import * as path from 'path';
import * as fs from 'fs/promises';
import { IndexCodebaseSchema } from '../schemas.js';
import { findFiles, resolveWorkspacePath } from '../utils/file-utils.js';
import { saveIndex } from '../utils/index-store.js';

const INDEXABLE_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx', '.md'];

export async function indexCodebase(args: Record<string, unknown>, workspacePath: string) {
  const { scope, force } = IndexCodebaseSchema.parse(args);
  const targetPath = scope ? resolveWorkspacePath(workspacePath, scope).absolutePath : workspacePath;

  const files = await findFiles(targetPath, INDEXABLE_EXTENSIONS);
  const entries = [] as Array<{ file: string; mtimeMs: number; size: number }>;

  for (const file of files) {
    try {
      const stats = await fs.stat(file);
      entries.push({
        file: path.relative(workspacePath, file),
        mtimeMs: stats.mtimeMs,
        size: stats.size,
      });
    } catch {
      // Skip unreadable files
    }
  }

  await saveIndex(workspacePath, {
    indexedAt: new Date().toISOString(),
    root: targetPath,
    files: entries,
  });

  return {
    success: true,
    indexed: entries.length,
    path: targetPath,
    message: `${force ? 'Re-indexed' : 'Indexed'} ${entries.length} files from ${scope || 'workspace root'}`,
  };
}
