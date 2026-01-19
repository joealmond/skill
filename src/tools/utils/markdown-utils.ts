export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > -1) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

export function ensureFrontmatter(content: string) {
  if (!/^---\n[\s\S]*?\n---\n/.test(content)) {
    return `---\n---\n${content}`;
  }
  return content;
}

export function updateFrontmatterValue(content: string, key: string, value: string) {
  const re = new RegExp(`${key}:\\s*[^\\n]+`);
  if (re.test(content)) return content.replace(re, `${key}: ${value}`);
  return content.replace(/^---\n/, `---\n${key}: ${value}\n`);
}

export function extractSection(content: string, heading: string) {
  const sectionRe = new RegExp(`##\\s*${heading}\\s*\\n+([\\s\\S]*?)(?=\\n##|\\n#|$)`, 'i');
  const match = content.match(sectionRe);
  return match ? match[1] : null;
}

export function parseChecklist(sectionContent: string) {
  const items: Array<{ text: string; done: boolean }> = [];
  const reqPattern = /^-\s*\[([ xX])\]\s*(.+)$/gm;
  let match;
  while ((match = reqPattern.exec(sectionContent)) !== null) {
    items.push({ done: match[1].toLowerCase() === 'x', text: match[2].trim() });
  }
  return items;
}

export function parseFilesList(sectionContent: string) {
  const filesToModify: Array<{ path: string; description: string }> = [];
  const filePattern = /^-\s*`([^`]+)`(?:\s*[-–]\s*(.+))?$/gm;
  let match;
  while ((match = filePattern.exec(sectionContent)) !== null) {
    filesToModify.push({ path: match[1], description: match[2]?.trim() || '' });
  }
  return filesToModify;
}

export function ensureChecklistSection(content: string, heading: string, defaultItem: string) {
  const sectionRe = new RegExp(`(## ${heading}\\n\\n)([\\s\\S]*?)(?=\\n## |\\n# |$)`);
  const match = content.match(sectionRe);
  if (!match) {
    const injected = `\n## ${heading}\n\n- [x] ${defaultItem}\n`;
    return content.trimEnd() + injected + '\n';
  }
  let body = match[2];
  const hadCheckbox = /- \[[ x]\]/.test(body);
  body = body.replace(/- \[ \]/g, '- [x]');
  if (!hadCheckbox) {
    body = body.trimEnd() + `\n- [x] ${defaultItem}\n`;
  }
  return content.replace(sectionRe, `${match[1]}${body}`);
}

export function ensureFilesSection(content: string, modifiedFiles: string[]) {
  const sectionRe = /(## Files to Modify\n\n)([\s\S]*?)(?=\n## |\n# |$)/;
  const match = content.match(sectionRe);
  const lines = modifiedFiles.length > 0
    ? modifiedFiles.map(f => `- \`${f}\` - implementation file`)
    : ['- `docs/CHANGELOG.md` - recorded by complete_spec'];
  const fileLines = lines.join('\n');

  if (!match) {
    return content.trimEnd() + `\n## Files to Modify\n\n${fileLines}\n\n`;
  }
  let body = match[2];
  const hasPath = /- `[^`]+`/.test(body);
  if (!hasPath) {
    body = body.trimEnd() + `\n${fileLines}\n`;
  } else if (modifiedFiles.length > 0) {
    for (const file of modifiedFiles) {
      if (!body.includes(`\`${file}\``)) {
        body = body.trimEnd() + `\n- \`${file}\` - implementation file\n`;
      }
    }
  }
  return content.replace(sectionRe, `${match[1]}${body}`);
}
