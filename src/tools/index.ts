/**
 * Tool Definitions and Handler
 * 
 * MCP tool registry for Doc-Architect
 */

import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

// Tool input schemas
const IndexCodebaseSchema = z.object({
  scope: z.string().optional().describe('Folder path to index (default: workspace root)'),
  force: z.boolean().optional().default(false).describe('Re-index even if already indexed'),
});

const QueryDocsSchema = z.object({
  query: z.string().describe('Natural language search query'),
  limit: z.number().optional().default(10).describe('Maximum results to return'),
  filter: z.enum(['code', 'docs', 'all']).optional().default('all').describe('Filter by type'),
});

const WriteFileSchema = z.object({
  path: z.string().describe('Relative path to the file'),
  content: z.string().describe('Content to write'),
});

const CheckStalenessSchema = z.object({
  path: z.string().optional().describe('Specific path to check'),
  threshold: z.number().optional().default(0.85).describe('Similarity threshold'),
});

const RunRalphLoopSchema = z.object({
  maxIterations: z.number().optional().default(10).describe('Maximum tasks to process'),
  dryRun: z.boolean().optional().default(false).describe('Preview without executing'),
});

const MoveSpecSchema = z.object({
  specName: z.string().describe('Name of the spec file'),
  direction: z.enum(['to_done', 'to_active']).optional().default('to_done'),
});

const AppendChangelogSchema = z.object({
  version: z.string().optional().default('Unreleased').describe('Version section'),
  category: z.enum(['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']),
  entry: z.string().describe('Changelog entry text'),
});

const ReadSpecSchema = z.object({
  specName: z.string().describe('Name of the spec file (with or without .md)'),
});

const AnalyzeChangesSchema = z.object({
  since: z.string().optional().describe('Git ref to compare against (default: HEAD~1)'),
});

const GenerateAdrSchema = z.object({
  title: z.string().describe('Short title for the ADR'),
  context: z.string().describe('What is the issue motivating this decision?'),
  decision: z.string().describe('What was decided?'),
  consequences: z.string().describe('What are the implications?'),
  priority: z.enum(['P0', 'P1', 'P2']).optional().default('P1'),
});

const CompleteSpecSchema = z.object({
  specName: z.string().describe('Name of the spec file'),
  changelogEntry: z.string().optional().describe('Custom changelog entry (auto-generated if not provided)'),
  createAdr: z.boolean().optional().default(false).describe('Create an ADR for this change'),
  adrContext: z.string().optional().describe('Context for ADR if creating one'),
});

const ListInboxSchema = z.object({
  type: z.enum(['specs', 'adrs', 'all']).optional().default('all').describe('Filter by type'),
});

// Tool definitions for MCP
export const toolDefinitions = [
  {
    name: 'index_codebase',
    description: 'Build or refresh the semantic index of the codebase for search. Use this before querying to ensure the index is up to date.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        scope: { type: 'string', description: 'Folder path to index (default: workspace root)' },
        force: { type: 'boolean', description: 'Re-index even if already indexed' },
      },
    },
  },
  {
    name: 'query_docs',
    description: 'Semantic search across code and documentation. Returns relevant chunks with file locations and similarity scores.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'number', description: 'Maximum results (default: 10)' },
        filter: { type: 'string', enum: ['code', 'docs', 'all'], description: 'Filter by type' },
      },
      required: ['query'],
    },
  },
  {
    name: 'write_file',
    description: 'Create or update a documentation file. Use for writing markdown docs, updating README, etc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Relative file path to write' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'check_staleness',
    description: 'Analyze documentation for staleness by comparing against code. Returns a health report with severity levels.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Specific file or folder to check' },
        threshold: { type: 'number', description: 'Similarity threshold (default: 0.85)' },
      },
    },
  },
  {
    name: 'run_ralph_loop',
    description: 'Start autonomous task processing from PROGRESS.md. Reads pending tasks and returns them for execution.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        maxIterations: { type: 'number', description: 'Max tasks to process (default: 10)' },
        dryRun: { type: 'boolean', description: 'Preview without executing' },
      },
    },
  },
  {
    name: 'move_spec',
    description: 'Move a specification between ACTIVE and DONE folders after implementation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specName: { type: 'string', description: 'Name of the spec file' },
        direction: { type: 'string', enum: ['to_done', 'to_active'], description: 'Move direction' },
      },
      required: ['specName'],
    },
  },
  {
    name: 'append_changelog',
    description: 'Add an entry to CHANGELOG.md following Keep a Changelog format.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        version: { type: 'string', description: 'Version (default: Unreleased)' },
        category: { type: 'string', enum: ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'] },
        entry: { type: 'string', description: 'Changelog entry text' },
      },
      required: ['category', 'entry'],
    },
  },
  {
    name: 'read_spec',
    description: 'Parse a spec file from docs/specs/ACTIVE/ and extract structured requirements, files to modify, and definition of done.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specName: { type: 'string', description: 'Name of the spec file (with or without .md)' },
      },
      required: ['specName'],
    },
  },
  {
    name: 'analyze_changes',
    description: 'Analyze recent code changes using git diff or file modification times. Maps changes to affected documentation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        since: { type: 'string', description: 'Git ref to compare against (default: HEAD~1)' },
      },
    },
  },
  {
    name: 'generate_adr',
    description: 'Create an Architecture Decision Record in docs/adr/. Auto-numbers and updates INDEX.md.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Short title for the ADR' },
        context: { type: 'string', description: 'What is the issue motivating this decision?' },
        decision: { type: 'string', description: 'What was decided?' },
        consequences: { type: 'string', description: 'What are the implications?' },
        priority: { type: 'string', enum: ['P0', 'P1', 'P2'], description: 'Priority (default: P1)' },
      },
      required: ['title', 'context', 'decision', 'consequences'],
    },
  },
  {
    name: 'complete_spec',
    description: 'Complete a spec: add changelog entry, optionally create ADR, move spec to DONE. Full definition of done.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specName: { type: 'string', description: 'Name of the spec file' },
        changelogEntry: { type: 'string', description: 'Custom changelog entry (auto-generated if not provided)' },
        createAdr: { type: 'boolean', description: 'Create an ADR for this change' },
        adrContext: { type: 'string', description: 'Context for ADR if creating one' },
      },
      required: ['specName'],
    },
  },
  {
    name: 'list_inbox',
    description: 'List all items in ACTIVE folders (specs + ADRs) sorted by priority. Shows what needs work.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['specs', 'adrs', 'all'], description: 'Filter by type (default: all)' },
      },
    },
  },
];

// Tool handler
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  workspacePath: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    let result: unknown;

    switch (name) {
      case 'index_codebase':
        result = await indexCodebase(args, workspacePath);
        break;
      case 'query_docs':
        result = await queryDocs(args, workspacePath);
        break;
      case 'write_file':
        result = await writeFile(args, workspacePath);
        break;
      case 'check_staleness':
        result = await checkStaleness(args, workspacePath);
        break;
      case 'run_ralph_loop':
        result = await runRalphLoop(args, workspacePath);
        break;
      case 'move_spec':
        result = await moveSpec(args, workspacePath);
        break;
      case 'append_changelog':
        result = await appendChangelog(args, workspacePath);
        break;
      case 'read_spec':
        result = await readSpec(args, workspacePath);
        break;
      case 'analyze_changes':
        result = await analyzeChanges(args, workspacePath);
        break;
      case 'generate_adr':
        result = await generateAdr(args, workspacePath);
        break;
      case 'complete_spec':
        result = await completeSpec(args, workspacePath);
        break;
      case 'list_inbox':
        result = await listInbox(args, workspacePath);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, null, 2),
      }],
    };
  }
}

// Tool implementations

async function indexCodebase(args: Record<string, unknown>, workspacePath: string) {
  const { scope, force } = IndexCodebaseSchema.parse(args);
  const targetPath = scope ? path.join(workspacePath, scope) : workspacePath;
  
  // Find all indexable files
  const files = await findFiles(targetPath, ['.ts', '.js', '.tsx', '.jsx', '.md']);
  
  // For now, return file count (full vector indexing would go here)
  return {
    success: true,
    indexed: files.length,
    path: targetPath,
    message: `Indexed ${files.length} files from ${scope || 'workspace root'}`,
  };
}

async function queryDocs(args: Record<string, unknown>, workspacePath: string) {
  const { query, limit, filter } = QueryDocsSchema.parse(args);
  
  // Simple file-based search (vector search would go here)
  const files = await findFiles(workspacePath, filter === 'code' ? ['.ts', '.js'] : filter === 'docs' ? ['.md'] : ['.ts', '.js', '.md']);
  const results: Array<{ file: string; matches: string[] }> = [];
  
  const queryLower = query.toLowerCase();
  
  for (const file of files.slice(0, 50)) { // Limit for performance
    try {
      const content = await fs.readFile(file, 'utf-8');
      if (content.toLowerCase().includes(queryLower)) {
        const lines = content.split('\n');
        const matchingLines = lines
          .filter(line => line.toLowerCase().includes(queryLower))
          .slice(0, 3);
        
        if (matchingLines.length > 0) {
          results.push({
            file: path.relative(workspacePath, file),
            matches: matchingLines,
          });
        }
      }
    } catch {
      // Skip unreadable files
    }
    
    if (results.length >= limit) break;
  }
  
  return {
    success: true,
    query,
    results,
    message: `Found ${results.length} files matching "${query}"`,
  };
}

async function writeFile(args: Record<string, unknown>, workspacePath: string) {
  const { path: filePath, content } = WriteFileSchema.parse(args);
  const absolutePath = path.join(workspacePath, filePath);
  
  // Ensure directory exists
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  
  // Write file
  await fs.writeFile(absolutePath, content, 'utf-8');
  
  return {
    success: true,
    path: filePath,
    bytes: content.length,
    message: `Wrote ${content.length} bytes to ${filePath}`,
  };
}

async function checkStaleness(args: Record<string, unknown>, workspacePath: string) {
  const { path: checkPath, threshold } = CheckStalenessSchema.parse(args);
  const targetPath = checkPath ? path.join(workspacePath, checkPath) : path.join(workspacePath, 'docs');
  
  // Find doc files
  const docFiles = await findFiles(targetPath, ['.md']);
  
  // Simple staleness check based on file age (real implementation would use embeddings)
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
    message: `Checked ${items.length} docs: ${critical} critical, ${warning} warnings`,
  };
}

async function runRalphLoop(args: Record<string, unknown>, workspacePath: string) {
  const { maxIterations, dryRun } = RunRalphLoopSchema.parse(args);
  const progressPath = path.join(workspacePath, 'PROGRESS.md');
  
  let content: string;
  try {
    content = await fs.readFile(progressPath, 'utf-8');
  } catch {
    return {
      success: false,
      message: 'PROGRESS.md not found. Create it with pending tasks first.',
    };
  }
  
  // Parse tasks
  const taskPattern = /^- \[ \]\s*(?:\[?(P[012])\]?:?\s*)?(.+)$/gm;
  const tasks: Array<{ priority: string; text: string }> = [];
  let match;
  
  while ((match = taskPattern.exec(content)) !== null) {
    tasks.push({
      priority: match[1] || 'P2',
      text: match[2].trim(),
    });
  }
  
  // Sort by priority
  tasks.sort((a, b) => a.priority.localeCompare(b.priority));
  const tasksToProcess = tasks.slice(0, maxIterations);
  
  return {
    success: true,
    dryRun,
    totalPending: tasks.length,
    tasksToProcess: tasksToProcess.length,
    tasks: tasksToProcess,
    message: dryRun 
      ? `Would process ${tasksToProcess.length} tasks`
      : `Found ${tasksToProcess.length} tasks to process`,
  };
}

async function moveSpec(args: Record<string, unknown>, workspacePath: string) {
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

async function appendChangelog(args: Record<string, unknown>, workspacePath: string) {
  const { version, category, entry } = AppendChangelogSchema.parse(args);
  const changelogPath = path.join(workspacePath, 'docs', 'CHANGELOG.md');
  
  let content: string;
  try {
    content = await fs.readFile(changelogPath, 'utf-8');
  } catch {
    // Create new changelog
    content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

`;
  }
  
  const versionHeader = version === 'Unreleased' ? '## [Unreleased]' : `## [${version}]`;
  const categoryHeader = `### ${category}`;
  const entryLine = `- ${entry}`;
  
  // Find or create version section
  if (!content.includes(versionHeader)) {
    // Add new version after header
    const insertPos = content.indexOf('\n## ');
    if (insertPos > -1) {
      content = content.slice(0, insertPos) + `\n\n${versionHeader}\n` + content.slice(insertPos);
    } else {
      content += `\n${versionHeader}\n`;
    }
  }
  
  // Find version section and add category
  const versionIndex = content.indexOf(versionHeader);
  const nextVersionIndex = content.indexOf('\n## ', versionIndex + 1);
  const versionSection = nextVersionIndex > -1 
    ? content.slice(versionIndex, nextVersionIndex)
    : content.slice(versionIndex);
  
  let newVersionSection: string;
  if (versionSection.includes(categoryHeader)) {
    // Add entry after category header
    newVersionSection = versionSection.replace(
      categoryHeader,
      `${categoryHeader}\n${entryLine}`
    );
  } else {
    // Add category section
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

// =============================================================================
// NEW TOOLS: read_spec, analyze_changes, generate_adr, complete_spec, list_inbox
// =============================================================================

async function readSpec(args: Record<string, unknown>, workspacePath: string) {
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
  
  // Extract goal
  const goalMatch = content.match(/##\s*(?:Goal|Summary)\s*\n+([\s\S]*?)(?=\n##|$)/i);
  const goal = goalMatch ? goalMatch[1].trim() : '';
  
  // Extract requirements
  const requirements: Array<{ text: string; done: boolean }> = [];
  const reqMatch = content.match(/##\s*Requirements\s*\n+([\s\S]*?)(?=\n##|$)/i);
  if (reqMatch) {
    const reqPattern = /^-\s*\[([ xX])\]\s*(.+)$/gm;
    let match;
    while ((match = reqPattern.exec(reqMatch[1])) !== null) {
      requirements.push({ done: match[1].toLowerCase() === 'x', text: match[2].trim() });
    }
  }
  
  // Extract files to modify
  const filesToModify: Array<{ path: string; description: string }> = [];
  const filesMatch = content.match(/##\s*Files to Modify\s*\n+([\s\S]*?)(?=\n##|$)/i);
  if (filesMatch) {
    const filePattern = /^-\s*`([^`]+)`(?:\s*[-–]\s*(.+))?$/gm;
    let match;
    while ((match = filePattern.exec(filesMatch[1])) !== null) {
      filesToModify.push({ path: match[1], description: match[2]?.trim() || '' });
    }
  }
  
  // Extract definition of done
  const dod: Array<{ text: string; done: boolean }> = [];
  const dodMatch = content.match(/##\s*Definition of Done\s*\n+([\s\S]*?)(?=\n##|$)/i);
  if (dodMatch) {
    const dodPattern = /^-\s*\[([ xX])\]\s*(.+)$/gm;
    let match;
    while ((match = dodPattern.exec(dodMatch[1])) !== null) {
      dod.push({ done: match[1].toLowerCase() === 'x', text: match[2].trim() });
    }
  }
  
  return {
    success: true,
    specName: fileName,
    title,
    priority: frontmatter.priority || 'P2',
    status: frontmatter.status || 'active',
    created: frontmatter.created || null,
    goal,
    requirements,
    filesToModify,
    definitionOfDone: dod,
    isComplete: dod.length > 0 && dod.every(item => item.done),
  };
}

async function analyzeChanges(args: Record<string, unknown>, workspacePath: string) {
  const { since } = AnalyzeChangesSchema.parse(args);
  const ref = since || 'HEAD~1';
  
  const changedFiles: Array<{ file: string; changeType: string; affectedDocs: string[] }> = [];
  
  // Try git first
  try {
    const gitOutput = execSync(`git diff --name-status ${ref}`, {
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 5000,
    });
    
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
  } catch {
    // Fallback to file modification times (last 24h)
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
      } catch { /* skip */ }
    }
    
    return {
      success: true,
      method: 'mtime',
      changedFiles: recentFiles,
      summary: { total: recentFiles.length, modified: recentFiles.length },
      message: `Found ${recentFiles.length} recently modified files (last 24h)`,
    };
  }
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

async function generateAdr(args: Record<string, unknown>, workspacePath: string) {
  const { title, context, decision, consequences, priority } = GenerateAdrSchema.parse(args);
  const adrDir = path.join(workspacePath, 'docs', 'adr');
  
  // Find next ADR number
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
  
  // Update INDEX.md if exists
  const indexPath = path.join(adrDir, 'INDEX.md');
  try {
    let indexContent = await fs.readFile(indexPath, 'utf-8');
    const newEntry = `| [${adrNum}](${fileName}) | ${title} | accepted | ${today} |`;
    if (indexContent.includes('| --- |')) {
      indexContent = indexContent.trimEnd() + '\n' + newEntry + '\n';
      await fs.writeFile(indexPath, indexContent, 'utf-8');
    }
  } catch { /* INDEX.md doesn't exist */ }
  
  return {
    success: true,
    adrNumber: adrNum,
    fileName,
    path: `docs/adr/${fileName}`,
    message: `Created ADR ${adrNum}: ${title}`,
  };
}

async function completeSpec(args: Record<string, unknown>, workspacePath: string) {
  const { specName, changelogEntry, createAdr, adrContext } = CompleteSpecSchema.parse(args);
  
  const fileName = specName.endsWith('.md') ? specName : `${specName}.md`;
  const activePath = path.join(workspacePath, 'docs', 'specs', 'ACTIVE', fileName);
  const donePath = path.join(workspacePath, 'docs', 'specs', 'DONE', fileName);
  
  // Read spec to get title
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
  
  // 1. Add changelog entry
  const entry = changelogEntry || `Completed: ${specTitle}`;
  await appendChangelog({ category: 'Added', entry }, workspacePath);
  actions.push(`Changelog: "${entry}"`);
  
  // 2. Create ADR if requested
  let adrResult = null;
  if (createAdr) {
    adrResult = await generateAdr({
      title: specTitle,
      context: adrContext || `Implementation of spec: ${specTitle}`,
      decision: `Implemented ${specTitle} as specified.`,
      consequences: 'See spec for details.',
      priority: 'P1',
    }, workspacePath);
    actions.push(`ADR: ${(adrResult as { fileName: string }).fileName}`);
  }
  
  // 3. Update spec status and move to DONE
  const today = new Date().toISOString().split('T')[0];
  specContent = specContent.replace(/status:\s*\w+/, 'status: done');
  if (!specContent.includes('completed:')) {
    specContent = specContent.replace(/---\n/, `---\ncompleted: ${today}\n`);
  }
  
  await fs.mkdir(path.dirname(donePath), { recursive: true });
  await fs.writeFile(donePath, specContent, 'utf-8');
  await fs.unlink(activePath);
  actions.push(`Moved to DONE`);
  
  return {
    success: true,
    specName: fileName,
    title: specTitle,
    actions,
    message: `Completed spec: ${specTitle}`,
  };
}

async function listInbox(args: Record<string, unknown>, workspacePath: string) {
  const { type } = ListInboxSchema.parse(args);
  
  const items: Array<{
    type: 'spec' | 'adr';
    file: string;
    title: string;
    priority: string;
    created: string | null;
  }> = [];
  
  // List active specs
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
        } catch { /* skip */ }
      }
    } catch { /* directory doesn't exist */ }
  }
  
  // List draft ADRs
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
        } catch { /* skip */ }
      }
    } catch { /* directory doesn't exist */ }
  }
  
  items.sort((a, b) => a.priority.localeCompare(b.priority));
  
  return {
    success: true,
    count: items.length,
    items,
    message: `Found ${items.length} items in inbox`,
  };
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > -1) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

// Helper: Find files recursively
async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const results: string[] = [];
  
  async function walk(currentPath: string) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        // Skip common ignored directories
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'out', 'dist', '.doc-architect'].includes(entry.name)) {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }
  
  await walk(dir);
  return results;
}
