# Tool Index

Quick reference for all Language Model Tools provided by Doc-Architect.

---

## index_codebase

**Purpose**: Build or refresh the semantic index of the codebase.

**When to use**: 
- First time setup
- After major code changes
- When search results seem outdated

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `scope` | string | No | Folder path to index (default: workspace root) |
| `incremental` | boolean | No | Only index changed files (default: true) |

**Example**:
```
Index the src folder
```

---

## query_docs

**Purpose**: Semantic search across code and documentation.

**When to use**:
- Finding related code/docs
- Checking what documentation exists
- Locating where something is documented

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Natural language search query |
| `topK` | number | No | Number of results (default: 10) |
| `filter` | string | No | File type filter: "code", "docs", or "all" |

**Example**:
```
Find documentation about authentication
```

---

## write_file

**Purpose**: Create or update a documentation file.

**When to use**:
- Creating new documentation
- Updating existing docs
- Generating gallery files

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Relative path for the file |
| `content` | string | Yes | File content (Markdown) |
| `createDirs` | boolean | No | Create parent directories (default: true) |

**Example**:
```
Write updated README to docs/API.md
```

---

## check_staleness

**Purpose**: Analyze documentation for potential staleness.

**When to use**:
- Audit documentation health
- Find docs that need updating
- Pre-release documentation review

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | No | Specific file or folder to check |
| `threshold` | number | No | Similarity threshold 0-1 (default: 0.85) |

**Returns**: Staleness report with affected files and severity.

**Example**:
```
Check if docs folder has stale documentation
```

---

## run_ralph_loop

**Purpose**: Start autonomous task processing from PROGRESS.md.

**When to use**:
- Batch documentation updates
- Automated maintenance runs
- Processing task backlogs

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `maxIterations` | number | No | Max tasks to process (default: 10) |
| `dryRun` | boolean | No | Preview without executing (default: false) |

**Safety**: Automatically stops on errors or after max iterations.

**Example**:
```
Run Ralph to process pending documentation tasks
```

---

## move_spec

**Purpose**: Move a specification between ACTIVE and DONE folders.

**When to use**:
- Completing a feature specification
- Archiving implemented specs

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `specName` | string | Yes | Name of the spec file (without path) |
| `direction` | string | Yes | "to_done" or "to_active" |

**Example**:
```
Move spec auth-system to done
```

---

## append_changelog

**Purpose**: Add an entry to CHANGELOG.md.

**When to use**:
- After completing a feature
- Recording breaking changes
- Version releases

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `version` | string | Yes | Version string or "Unreleased" |
| `category` | string | Yes | Added, Changed, Deprecated, Removed, Fixed, Security |
| `entry` | string | Yes | The changelog entry text |

**Example**:
```
Add changelog entry: Added new authentication system
```

---

## Quick Reference Card

| Tool | One-liner |
|------|-----------|
| `index_codebase` | Build semantic search index |
| `query_docs` | Search code and docs |
| `write_file` | Create/update documentation |
| `check_staleness` | Find outdated docs |
| `run_ralph_loop` | Auto-process PROGRESS.md |
| `move_spec` | Archive completed specs |
| `append_changelog` | Update CHANGELOG.md |
