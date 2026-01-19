import * as path from 'path';
import * as fs from 'fs/promises';
import { CheckStalenessSchema } from '../schemas.js';
import { findFiles } from '../utils/file-utils.js';

export async function checkStaleness(args: Record<string, unknown>, workspacePath: string) {
  const { path: checkPath, threshold } = CheckStalenessSchema.parse(args);
  const targetPath = checkPath ? path.join(workspacePath, checkPath) : path.join(workspacePath, 'docs');

  const docFiles = await findFiles(targetPath, ['.md']);
  const items: Array<{ file: string; status: string; age: number }> = [];
  const now = Date.now();

  for (const file of docFiles) {
    try {
      const stats = await fs.stat(file);
      const ageMs = now - stats.mtimeMs;
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

      let status = 'healthy';
      if (ageDays > 90) status = 'critical';
      else if (ageDays > 30) status = 'warning';

      items.push({
        file: path.relative(workspacePath, file),
        status,
        age: ageDays,
      });
    } catch {
      // Skip
    }
  }

  const critical = items.filter(i => i.status === 'critical').length;
  const warning = items.filter(i => i.status === 'warning').length;

  return {
    success: true,
    overall: critical > 0 ? 'critical' : warning > 0 ? 'warning' : 'healthy',
    summary: { total: items.length, healthy: items.length - critical - warning, warning, critical },
    items,
    message: `Checked ${items.length} docs: ${critical} critical, ${warning} warnings (threshold ${threshold})`,
  };
}
