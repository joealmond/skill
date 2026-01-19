import * as fs from 'fs/promises';
import * as path from 'path';

const DEFAULT_IGNORED_DIRS = new Set(['node_modules', '.git', 'out', 'dist', '.doc-architect']);

export async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentPath: string) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (!DEFAULT_IGNORED_DIRS.has(entry.name)) {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  await walk(dir);
  return results;
}

export function resolveWorkspacePath(workspacePath: string, relativePath: string) {
  if (path.isAbsolute(relativePath)) {
    throw new Error('Path must be relative to the workspace root');
  }

  const absolutePath = path.resolve(workspacePath, relativePath);
  const relativeFromWorkspace = path.relative(workspacePath, absolutePath);

  if (relativeFromWorkspace === '' || (!relativeFromWorkspace.startsWith('..') && !path.isAbsolute(relativeFromWorkspace))) {
    return { absolutePath, relativePath: relativeFromWorkspace || relativePath };
  }

  throw new Error('Path escapes the workspace root');
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeJson(filePath: string, data: unknown) {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function safeReadText(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
