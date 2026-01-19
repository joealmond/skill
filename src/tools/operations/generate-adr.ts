import * as path from 'path';
import * as fs from 'fs/promises';
import { GenerateAdrSchema } from '../schemas.js';

export async function generateAdr(args: Record<string, unknown>, workspacePath: string) {
  const { title, context, decision, consequences, priority } = GenerateAdrSchema.parse(args);
  const adrDir = path.join(workspacePath, 'docs', 'adr');

  let nextNum = 1;
  try {
    const files = await fs.readdir(adrDir);
    const adrFiles = files.filter(f => /^\d{4}-/.test(f));
    if (adrFiles.length > 0) {
      const nums = adrFiles.map(f => parseInt(f.slice(0, 4), 10)).filter(n => !isNaN(n));
      nextNum = Math.max(...nums) + 1;
    }
  } catch {
    await fs.mkdir(adrDir, { recursive: true });
  }

  const adrNum = String(nextNum).padStart(4, '0');
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `${adrNum}-${slug}.md`;
  const filePath = path.join(adrDir, fileName);
  const today = new Date().toISOString().split('T')[0];

  const content = `---
priority: ${priority}
created: ${today}
status: accepted
---

# ADR: ${title}

## Context

${context}

## Decision

${decision}

## Consequences

${consequences}
`;

  await fs.writeFile(filePath, content, 'utf-8');

  const indexPath = path.join(adrDir, 'INDEX.md');
  try {
    let indexContent = await fs.readFile(indexPath, 'utf-8');
    const newEntry = `| [${adrNum}](${fileName}) | ${title} | accepted | ${today} |`;
    if (indexContent.includes('| --- |')) {
      indexContent = indexContent.trimEnd() + '\n' + newEntry + '\n';
      await fs.writeFile(indexPath, indexContent, 'utf-8');
    }
  } catch {
    // INDEX.md doesn't exist
  }

  return {
    success: true,
    adrNumber: adrNum,
    fileName,
    path: `docs/adr/${fileName}`,
    message: `Created ADR ${adrNum}: ${title}`,
  };
}
