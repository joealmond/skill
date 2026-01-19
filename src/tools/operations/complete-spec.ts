import * as path from 'path';
import * as fs from 'fs/promises';
import { CompleteSpecSchema } from '../schemas.js';
import { appendChangelog } from './append-changelog.js';
import { generateAdr } from './generate-adr.js';
import { indexCodebase } from './index-codebase.js';
import { gitDiffNameOnly } from '../utils/git-utils.js';
import {
  ensureFrontmatter,
  updateFrontmatterValue,
  ensureChecklistSection,
  ensureFilesSection,
  parseFrontmatter,
} from '../utils/markdown-utils.js';

export async function completeSpec(args: Record<string, unknown>, workspacePath: string) {
  const { specName, changelogEntry, createAdr, adrContext } = CompleteSpecSchema.parse(args);

  const fileName = specName.endsWith('.md') ? specName : `${specName}.md`;
  const activePath = path.join(workspacePath, 'docs', 'specs', 'ACTIVE', fileName);
  const donePath = path.join(workspacePath, 'docs', 'specs', 'DONE', fileName);

  const toISODate = (d: Date) => d.toISOString().split('T')[0];
  const isISODate = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value !== 'YYYY-MM-DD';
  const today = new Date();
  const todayISO = toISODate(today);
  const yesterdayISO = toISODate(new Date(today.getTime() - 24 * 60 * 60 * 1000));

  let specContent: string;
  let specTitle = specName;
  try {
    specContent = await fs.readFile(activePath, 'utf-8');
    const titleMatch = specContent.match(/^#\s+(?:Spec:\s*)?(.+)$/m);
    if (titleMatch) specTitle = titleMatch[1].trim();
  } catch {
    return { success: false, message: `Spec not found: ${fileName}` };
  }

  const actions: string[] = [];

  specContent = ensureFrontmatter(specContent);

  let modifiedFiles: string[] = [];
  const gitOutput = await gitDiffNameOnly(workspacePath);
  if (gitOutput) {
    modifiedFiles = gitOutput.split('\n').filter(f => f && !f.includes('specs/') && !f.includes('adr/'));
  }

  const fm = parseFrontmatter(specContent);

  let created = isISODate(fm.created) ? fm.created : yesterdayISO;
  let updated = todayISO;
  if (created === updated) created = yesterdayISO;
  const completed = fm.completed && fm.completed !== 'YYYY-MM-DD' ? fm.completed : todayISO;
  const priority = fm.priority || 'P1';
  const status = 'done';

  specContent = updateFrontmatterValue(specContent, 'completed', completed);
  specContent = updateFrontmatterValue(specContent, 'priority', priority);
  specContent = updateFrontmatterValue(specContent, 'created', created);
  specContent = updateFrontmatterValue(specContent, 'updated', updated);
  if (/status:\s*\w+/.test(specContent)) {
    specContent = specContent.replace(/status:\s*\w+/, `status: ${status}`);
  } else {
    specContent = specContent.replace(/^---\n/, `---\nstatus: ${status}\n`);
  }
  specContent = ensureChecklistSection(specContent, 'Requirements', 'Auto-completed requirement');
  specContent = ensureChecklistSection(specContent, 'Definition of Done', 'Auto-completed DoD item');
  specContent = ensureFilesSection(specContent, modifiedFiles);

  const entry = changelogEntry || `Completed: ${specTitle}`;
  await appendChangelog({ category: 'Added', entry }, workspacePath);
  actions.push(`Changelog: "${entry}"`);

  if (createAdr) {
    const adrResult = await generateAdr({
      title: specTitle,
      context: adrContext || `Implementation of spec: ${specTitle}`,
      decision: `Implemented ${specTitle} as specified.`,
      consequences: 'See spec for details.',
      priority: priority,
    }, workspacePath);
    actions.push(`ADR: ${(adrResult as { fileName: string }).fileName}`);
  }

  try {
    const docSlug = specName.replace('.md', '').toLowerCase().replace(/\s+/g, '-');
    const docPath = path.join(workspacePath, 'docs', 'features', `${docSlug}.md`);

    try {
      await fs.stat(docPath);
    } catch {
      const docContent = `# ${specTitle}

## Overview

${specTitle} implementation.

## Usage

See [spec](../specs/DONE/${fileName}) for details.
`;
      await fs.mkdir(path.dirname(docPath), { recursive: true });
      await fs.writeFile(docPath, docContent, 'utf-8');
      actions.push('Documentation created');
    }
  } catch {
    // Skip
  }

  try {
    await indexCodebase({ force: true }, workspacePath);
    actions.push('Codebase indexed');
  } catch {
    // Skip
  }

  await fs.mkdir(path.dirname(donePath), { recursive: true });
  await fs.writeFile(donePath, specContent, 'utf-8');
  try {
    await fs.unlink(activePath);
  } catch {
    // Already moved
  }
  actions.push('Moved to DONE');

  return {
    success: true,
    specName: fileName,
    title: specTitle,
    actions,
    message: `Completed spec: ${specTitle}`,
  };
}
