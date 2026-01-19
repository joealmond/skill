import * as path from 'path';
import * as fs from 'fs/promises';
import { MoveSpecSchema } from '../schemas.js';

export async function moveSpec(args: Record<string, unknown>, workspacePath: string) {
  const { specName, direction } = MoveSpecSchema.parse(args);

  const fileName = specName.endsWith('.md') ? specName : `${specName}.md`;
  const activePath = path.join(workspacePath, 'docs', 'specs', 'ACTIVE');
  const donePath = path.join(workspacePath, 'docs', 'specs', 'DONE');

  const fromPath = direction === 'to_done'
    ? path.join(activePath, fileName)
    : path.join(donePath, fileName);
  const toPath = direction === 'to_done'
    ? path.join(donePath, fileName)
    : path.join(activePath, fileName);

  try {
    await fs.access(fromPath);
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.rename(fromPath, toPath);

    return {
      success: true,
      from: path.relative(workspacePath, fromPath),
      to: path.relative(workspacePath, toPath),
      message: `Moved ${fileName} ${direction === 'to_done' ? 'to DONE' : 'to ACTIVE'}`,
    };
  } catch {
    return {
      success: false,
      message: `Spec not found: ${fileName}`,
    };
  }
}
