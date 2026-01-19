import * as path from 'path';
import * as fs from 'fs/promises';
import { AppendChangelogSchema } from '../schemas.js';

export async function appendChangelog(args: Record<string, unknown>, workspacePath: string) {
  const { version, category, entry } = AppendChangelogSchema.parse(args);
  const changelogPath = path.join(workspacePath, 'docs', 'CHANGELOG.md');

  let content: string;
  try {
    content = await fs.readFile(changelogPath, 'utf-8');
  } catch {
    content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

`;
  }

  const versionHeader = version === 'Unreleased' ? '## [Unreleased]' : `## [${version}]`;
  const categoryHeader = `### ${category}`;
  const entryLine = `- ${entry}`;

  if (!content.includes(versionHeader)) {
    const insertPos = content.indexOf('\n## ');
    if (insertPos > -1) {
      content = content.slice(0, insertPos) + `\n\n${versionHeader}\n` + content.slice(insertPos);
    } else {
      content += `\n${versionHeader}\n`;
    }
  }

  const versionIndex = content.indexOf(versionHeader);
  const nextVersionIndex = content.indexOf('\n## ', versionIndex + 1);
  const versionSection = nextVersionIndex > -1
    ? content.slice(versionIndex, nextVersionIndex)
    : content.slice(versionIndex);

  let newVersionSection: string;
  if (versionSection.includes(categoryHeader)) {
    newVersionSection = versionSection.replace(
      categoryHeader,
      `${categoryHeader}\n${entryLine}`
    );
  } else {
    newVersionSection = versionSection.replace(
      versionHeader,
      `${versionHeader}\n\n${categoryHeader}\n${entryLine}`
    );
  }

  content = content.replace(versionSection, newVersionSection);
  await fs.writeFile(changelogPath, content, 'utf-8');

  return {
    success: true,
    version,
    category,
    entry,
    message: `Added ${category} entry to ${version}`,
  };
}
