import * as path from 'path';
import * as fs from 'fs/promises';
import { ReadSpecSchema } from '../schemas.js';
import { parseFrontmatter, extractSection, parseChecklist, parseFilesList } from '../utils/markdown-utils.js';

export async function readSpec(args: Record<string, unknown>, workspacePath: string) {
  const { specName } = ReadSpecSchema.parse(args);
  const fileName = specName.endsWith('.md') ? specName : `${specName}.md`;
  const specPath = path.join(workspacePath, 'docs', 'specs', 'ACTIVE', fileName);

  let content: string;
  try {
    content = await fs.readFile(specPath, 'utf-8');
  } catch {
    return { success: false, message: `Spec not found: ${fileName}` };
  }

  const frontmatter = parseFrontmatter(content);
  const titleMatch = content.match(/^#\s+(?:Spec:\s*)?(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');

  const goalSection = extractSection(content, 'Goal') ?? extractSection(content, 'Summary');
  const requirementsSection = extractSection(content, 'Requirements');
  const filesSection = extractSection(content, 'Files to Modify');
  const dodSection = extractSection(content, 'Definition of Done');

  const requirements = requirementsSection ? parseChecklist(requirementsSection) : [];
  const filesToModify = filesSection ? parseFilesList(filesSection) : [];
  const definitionOfDone = dodSection ? parseChecklist(dodSection) : [];

  return {
    success: true,
    specName: fileName,
    title,
    priority: frontmatter.priority || 'P2',
    status: frontmatter.status || 'active',
    created: frontmatter.created || null,
    goal: goalSection ? goalSection.trim() : '',
    requirements,
    filesToModify,
    definitionOfDone,
    isComplete: definitionOfDone.length > 0 && definitionOfDone.every(item => item.done),
  };
}
