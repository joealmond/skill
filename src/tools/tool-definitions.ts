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
  {
    name: 'implement_feature',
    description: 'ONE-SHOT feature implementation: read spec, implement code, create docs, ADR, changelog, index, and run ralph loop. Automates the complete workflow.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specName: { type: 'string', description: 'Name of the spec to implement' },
        createAdr: { type: 'boolean', description: 'Create ADR for architectural decisions (default: true)' },
        autoRunRalph: { type: 'boolean', description: 'Automatically run ralph loop after completion (default: true)' },
      },
      required: ['specName'],
    },
  },
];
