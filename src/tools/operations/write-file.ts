import * as path from 'path';
import * as fs from 'fs/promises';
import { WriteFileSchema } from '../schemas.js';
import { resolveWorkspacePath, ensureDir } from '../utils/file-utils.js';

export async function writeFile(args: Record<string, unknown>, workspacePath: string) {
  const { path: filePath, content } = WriteFileSchema.parse(args);
  const { absolutePath, relativePath } = resolveWorkspacePath(workspacePath, filePath);

  await ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, content, 'utf-8');

  return {
    success: true,
    path: relativePath,
    bytes: content.length,
    message: `Wrote ${content.length} bytes to ${relativePath}`,
  };
}
