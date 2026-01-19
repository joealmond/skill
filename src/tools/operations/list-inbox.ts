import * as path from 'path';
import * as fs from 'fs/promises';
import { ListInboxSchema } from '../schemas.js';
import { parseFrontmatter } from '../utils/markdown-utils.js';

export async function listInbox(args: Record<string, unknown>, workspacePath: string) {
  const { type } = ListInboxSchema.parse(args);

  const items: Array<{
    type: 'spec' | 'adr';
    file: string;
    title: string;
    priority: string;
    created: string | null;
  }> = [];

  if (type === 'all' || type === 'specs') {
    const specsDir = path.join(workspacePath, 'docs', 'specs', 'ACTIVE');
    try {
      const files = await fs.readdir(specsDir);
      for (const file of files.filter(f => f.endsWith('.md') && f !== 'README.md')) {
        try {
          const content = await fs.readFile(path.join(specsDir, file), 'utf-8');
          const fm = parseFrontmatter(content);
          const titleMatch = content.match(/^#\s+(?:Spec:\s*)?(.+)$/m);
          items.push({
            type: 'spec',
            file: `docs/specs/ACTIVE/${file}`,
            title: titleMatch ? titleMatch[1].trim() : file.replace('.md', ''),
            priority: fm.priority || 'P2',
            created: fm.created || null,
          });
        } catch {
          // skip
        }
      }
    } catch {
      // directory doesn't exist
    }
  }

  if (type === 'all' || type === 'adrs') {
    const adrDir = path.join(workspacePath, 'docs', 'adr');
    try {
      const files = await fs.readdir(adrDir);
      for (const file of files.filter(f => f.endsWith('.md') && !['INDEX.md', 'TEMPLATE.md'].includes(f))) {
        try {
          const content = await fs.readFile(path.join(adrDir, file), 'utf-8');
          const fm = parseFrontmatter(content);
          if (fm.status === 'draft' || fm.status === 'proposed') {
            const titleMatch = content.match(/^#\s+(?:ADR:\s*)?(.+)$/m);
            items.push({
              type: 'adr',
              file: `docs/adr/${file}`,
              title: titleMatch ? titleMatch[1].trim() : file.replace('.md', ''),
              priority: fm.priority || 'P2',
              created: fm.created || null,
            });
          }
        } catch {
          // skip
        }
      }
    } catch {
      // directory doesn't exist
    }
  }

  items.sort((a, b) => a.priority.localeCompare(b.priority));

  return {
    success: true,
    count: items.length,
    items,
    message: `Found ${items.length} items in inbox`,
  };
}
