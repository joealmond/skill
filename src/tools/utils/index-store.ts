import * as path from 'path';
import * as fs from 'fs/promises';
import { readJsonIfExists, ensureDir, writeJson } from './file-utils.js';

export type IndexEntry = {
  file: string;
  mtimeMs: number;
  size: number;
};

export type IndexStore = {
  indexedAt: string;
  root: string;
  files: IndexEntry[];
};

export function getIndexPath(workspacePath: string) {
  return path.join(workspacePath, '.doc-architect', 'index.json');
}

export async function loadIndex(workspacePath: string): Promise<IndexStore | null> {
  return readJsonIfExists<IndexStore>(getIndexPath(workspacePath));
}

export async function saveIndex(workspacePath: string, index: IndexStore) {
  const indexPath = getIndexPath(workspacePath);
  await ensureDir(path.dirname(indexPath));
  await writeJson(indexPath, index);
}

export async function ensureIndexDir(workspacePath: string) {
  const indexPath = getIndexPath(workspacePath);
  await ensureDir(path.dirname(indexPath));
  try {
    await fs.access(indexPath);
  } catch {
    // ok
  }
}
