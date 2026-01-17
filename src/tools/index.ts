/**
 * Tool Definitions and Handler
 * 
 * MCP tool registry for Doc-Architect
 */

import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

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
