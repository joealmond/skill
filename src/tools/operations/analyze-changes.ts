import * as path from 'path';
import * as fs from 'fs/promises';
import { AnalyzeChangesSchema } from '../schemas.js';
import { findFiles } from '../utils/file-utils.js';
import { gitDiffNameStatus } from '../utils/git-utils.js';

export async function analyzeChanges(args: Record<string, unknown>, workspacePath: string) {
  const { since } = AnalyzeChangesSchema.parse(args);
  const ref = since || 'HEAD~1';

  const changedFiles: Array<{ file: string; changeType: string; affectedDocs: string[] }> = [];

  const gitOutput = await gitDiffNameStatus(workspacePath, ref);
  if (gitOutput) {
    const lines = gitOutput.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const [status, file] = line.split('\t');
      if (!file) continue;

      const changeType = status === 'A' ? 'added' : status === 'D' ? 'deleted' : status === 'M' ? 'modified' : 'renamed';
      const affectedDocs = mapFileToAffectedDocs(file);
      changedFiles.push({ file, changeType, affectedDocs });
    }

    return {
      success: true,
      method: 'git',
      ref,
      changedFiles,
      summary: {
        total: changedFiles.length,
        added: changedFiles.filter(f => f.changeType === 'added').length,
        modified: changedFiles.filter(f => f.changeType === 'modified').length,
        deleted: changedFiles.filter(f => f.changeType === 'deleted').length,
      },
      message: `Found ${changedFiles.length} changed files since ${ref}`,
    };
  }

  const files = await findFiles(workspacePath, ['.ts', '.js', '.tsx', '.jsx', '.md']);
  const now = Date.now();
  const recentFiles: Array<{ file: string; changeType: string; affectedDocs: string[] }> = [];

  for (const file of files) {
    try {
      const stats = await fs.stat(file);
      const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);
      if (ageHours < 24) {
        const relPath = path.relative(workspacePath, file);
        recentFiles.push({
          file: relPath,
          changeType: 'modified',
          affectedDocs: mapFileToAffectedDocs(relPath),
        });
      }
    } catch {
      // Skip
    }
  }

  return {
    success: true,
    method: 'mtime',
    changedFiles: recentFiles,
    summary: { total: recentFiles.length, modified: recentFiles.length },
    message: `Found ${recentFiles.length} recently modified files (last 24h)`,
  };
}

function mapFileToAffectedDocs(filePath: string): string[] {
  const docs: string[] = [];
  if (filePath.startsWith('src/')) {
    docs.push('README.md');
    if (filePath.includes('tools')) docs.push('docs/README.md');
  }
  if (filePath.endsWith('.md') && filePath.includes('specs/')) {
    docs.push('docs/CHANGELOG.md');
  }
  return docs;
}
