# Doc-Architect

> Spec-driven development and self-healing documentation — MCP Server

Doc-Architect is an MCP server for AI-powered spec-driven development and documentation management.

## Features

- **Spec-Driven Development** — Write specs, implement, complete with auto-docs
- **Documentation Management** — Changelog, ADRs, guides
- **Semantic Search** — Find code and docs
- **Staleness Detection** — Find outdated documentation
- **Portable** — Works with any MCP-compatible editor

## Quick Start

```bash
npm install
npm run build
```

VS Code will detect `mcp.json` and offer to enable the server.

## Agents

### @architect
Main agent for specs, coding, and documentation.

```
@architect what's in my inbox?
@architect read spec user-auth
@architect complete spec user-auth
```

### @docs
Documentation-only agent (no code changes).

```
@docs check docs health
@docs add changelog: Fixed login bug
```

## Tools (12 total)

| Tool | Description |
|------|-------------|
| `read_spec` | Parse spec from ACTIVE/ |
| `complete_spec` | Complete spec with docs |
| `list_inbox` | Show active specs/ADRs |
| `move_spec` | Move spec between ACTIVE/DONE |
| `generate_adr` | Create ADR |
| `append_changelog` | Add changelog entry |
| `analyze_changes` | Git diff or mtime analysis |
| `write_file` | Create/update files |
| `query_docs` | Search code and docs |
| `check_staleness` | Find outdated docs |
| `index_codebase` | Build search index |
| `run_ralph_loop` | Process PROGRESS.md tasks |

## Workflows

### Spec-Driven Development

1. Create spec in `docs/specs/ACTIVE/my-feature.md`
2. `@architect read spec my-feature`
3. Implement code
4. `@architect complete spec my-feature`

### Manual Coding + Docs

1. Write code
2. `@architect analyze changes`
3. `@architect add changelog: Added feature X`

## Project Structure

```
.github/agents/
  architect.agent.md    # Main agent
  docs.agent.md         # Docs-only agent
docs/
  specs/ACTIVE/         # In-progress specs
  specs/DONE/           # Completed specs
  adr/                  # Architecture decisions
  CHANGELOG.md
src/
  mcp-server.ts         # MCP entry point
  tools/index.ts        # All tools
mcp.json                # MCP config
```

## Development

```bash
npm install
npm run build
npm run watch
```

## License

MIT
