import { z } from 'zod';

export const IndexCodebaseSchema = z.object({
  scope: z.string().optional().describe('Folder path to index (default: workspace root)'),
  force: z.boolean().optional().default(false).describe('Re-index even if already indexed'),
});

export const QueryDocsSchema = z.object({
  query: z.string().describe('Natural language search query'),
  limit: z.number().optional().default(10).describe('Maximum results to return'),
  filter: z.enum(['code', 'docs', 'all']).optional().default('all').describe('Filter by type'),
});

export const WriteFileSchema = z.object({
  path: z.string().describe('Relative path to the file'),
  content: z.string().describe('Content to write'),
});

export const CheckStalenessSchema = z.object({
  path: z.string().optional().describe('Specific path to check'),
  threshold: z.number().optional().default(0.85).describe('Similarity threshold'),
});

export const RunRalphLoopSchema = z.object({
  maxIterations: z.number().optional().default(10).describe('Maximum tasks to process'),
  dryRun: z.boolean().optional().default(false).describe('Preview without executing'),
});

export const MoveSpecSchema = z.object({
  specName: z.string().describe('Name of the spec file'),
  direction: z.enum(['to_done', 'to_active']).optional().default('to_done'),
});

export const AppendChangelogSchema = z.object({
  version: z.string().optional().default('Unreleased').describe('Version section'),
  category: z.enum(['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']),
  entry: z.string().describe('Changelog entry text'),
});

export const ReadSpecSchema = z.object({
  specName: z.string().describe('Name of the spec file (with or without .md)'),
});

export const AnalyzeChangesSchema = z.object({
  since: z.string().optional().describe('Git ref to compare against (default: HEAD~1)'),
});

export const GenerateAdrSchema = z.object({
  title: z.string().describe('Short title for the ADR'),
  context: z.string().describe('What is the issue motivating this decision?'),
  decision: z.string().describe('What was decided?'),
  consequences: z.string().describe('What are the implications?'),
  priority: z.enum(['P0', 'P1', 'P2']).optional().default('P1'),
});

export const CompleteSpecSchema = z.object({
  specName: z.string().describe('Name of the spec file'),
  changelogEntry: z.string().optional().describe('Custom changelog entry (auto-generated if not provided)'),
  createAdr: z.boolean().optional().default(false).describe('Create an ADR for this change'),
  adrContext: z.string().optional().describe('Context for ADR if creating one'),
});

export const ListInboxSchema = z.object({
  type: z.enum(['specs', 'adrs', 'all']).optional().default('all').describe('Filter by type'),
});

export const ImplementFeatureSchema = z.object({
  specName: z.string().describe('Name of the spec to implement (feature name)'),
  createAdr: z.boolean().optional().default(true).describe('Create ADR for architectural decisions'),
  autoRunRalph: z.boolean().optional().default(true).describe('Automatically run ralph loop after'),
});
