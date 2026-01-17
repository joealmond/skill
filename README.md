# Doc-Architect

> 🏗️ Self-Healing Documentation Engine for VS Code

Doc-Architect is a VS Code Agent Skill that uses AI to detect stale documentation, autonomously update docs, and maintain a living knowledge base that evolves with your code.

---

## ✨ Features

- **🔍 Semantic Search** - Find related code and docs using AI embeddings
- **🩺 Staleness Detection** - Automatically detect documentation drift
- **🤖 Autonomous Updates** - Ralph loop processes tasks from PROGRESS.md
- **📋 Spec Lifecycle** - Manage feature specifications (ACTIVE → DONE)
- **📝 Auto Changelog** - Append entries following Keep a Changelog format
- **🏛️ ADR Support** - Architecture Decision Records with templates
- **🎨 Doc Gallery** - Generate diagrams and API references

---

## 🚀 Quick Start

### Installation

1. **Clone or copy this project** to your workspace

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run compile
   ```

4. **Install in VS Code**:
   - Press `F5` to launch Extension Development Host, or
   - Package with `vsce package` and install the `.vsix`

5. **Start using agents**:
   ```
   @doc-architect help
   @doc-guardian check docs health
   @doc-ralph run tasks
   ```

### First Run

On first use, Doc-Architect will:
1. Download tree-sitter WASM parsers (for code parsing)
2. Download embedding model (if using @xenova/transformers)
3. Create the vector database in extension storage

This only happens once.

---

## 🤖 Agents

Doc-Architect provides three specialized agents:

### @doc-architect (Main Agent)
Full documentation capabilities - search, write, update.

```
@doc-architect update the README to reflect recent API changes
@doc-architect find documentation about authentication
@doc-architect move spec user-auth to done
```

### @doc-guardian (Read-Only Auditor)
Staleness detection without file modifications.

```
@doc-guardian check docs health
@doc-guardian is docs/API.md up to date?
@doc-guardian generate health report
```

### @doc-ralph (Autopilot)
Autonomous task processing from PROGRESS.md.

```
@doc-ralph run pending tasks
@doc-ralph process P0 tasks only
@doc-ralph dry run
```

---

## 🛠️ Tools

| Tool | Description | Agent Access |
|------|-------------|--------------|
| `index_codebase` | Build semantic search index | architect, ralph |
| `query_docs` | Search code and documentation | all |
| `write_file` | Create/update documentation | architect, ralph |
| `check_staleness` | Analyze docs for drift | all |
| `run_ralph_loop` | Process PROGRESS.md tasks | ralph |
| `move_spec` | Move specs ACTIVE↔DONE | architect |
| `append_changelog` | Add changelog entries | architect, ralph |

See [.doc-architect/TOOL_INDEX.md](.doc-architect/TOOL_INDEX.md) for full schemas.

---

## 📁 Project Structure

```
.
├── .github/
│   ├── agents/                    # Custom agent definitions
│   │   ├── doc-architect.agent.md # Main agent
│   │   ├── doc-guardian.agent.md  # Read-only auditor
│   │   └── doc-ralph.agent.md     # Autopilot loop
│   └── prompts/                   # Reusable prompts
│       ├── update-readme.prompt.md
│       ├── generate-architecture.prompt.md
│       └── explain-function.prompt.md
├── .doc-architect/
│   ├── config.json               # Configuration
│   ├── TOOL_INDEX.md             # Tool documentation
│   └── vectors/                  # Vector database (auto-created)
├── docs/
│   ├── README.md                 # Documentation root
│   ├── CHANGELOG.md              # Version history
│   ├── GLOSSARY.md               # Project terminology
│   ├── specs/
│   │   ├── TEMPLATE.md           # Spec template
│   │   ├── ACTIVE/               # In-progress specs
│   │   └── DONE/                 # Completed specs
│   ├── adr/
│   │   ├── INDEX.md              # ADR index
│   │   ├── TEMPLATE.md           # ADR template
│   │   └── 0001-*.md             # Decision records
│   └── gallery/
│       └── INDEX.md              # Generated docs index
├── src/
│   ├── extension.ts              # Extension entry point
│   ├── memory/
│   │   ├── vectorDb.ts           # Vectra wrapper
│   │   ├── embedder.ts           # Embedding generation
│   │   ├── indexer.ts            # Code/doc indexer
│   │   ├── parser.ts             # Tree-sitter parsing
│   │   └── linter.ts             # Staleness detection
│   ├── tools/
│   │   ├── indexCodebase.ts      # Index tool
│   │   ├── queryDocs.ts          # Search tool
│   │   ├── writeFile.ts          # Write tool
│   │   ├── checkStaleness.ts     # Staleness tool
│   │   ├── runRalphLoop.ts       # Ralph tool
│   │   ├── moveSpec.ts           # Spec tool
│   │   └── appendChangelog.ts    # Changelog tool
│   └── utils/
│       └── fileOps.ts            # File utilities
├── PROGRESS.md                   # Task list for Ralph
├── package.json                  # Extension manifest
└── tsconfig.json                 # TypeScript config
```

---

## 📄 File Reference

### Agent Files (`.github/agents/`)

| File | Purpose |
|------|---------|
| [doc-architect.agent.md](.github/agents/doc-architect.agent.md) | Main agent with full read/write access to all tools |
| [doc-guardian.agent.md](.github/agents/doc-guardian.agent.md) | Read-only agent for auditing documentation health |
| [doc-ralph.agent.md](.github/agents/doc-ralph.agent.md) | Autopilot agent that processes PROGRESS.md |

### Prompt Files (`.github/prompts/`)

| File | Purpose | Usage |
|------|---------|-------|
| [update-readme.prompt.md](.github/prompts/update-readme.prompt.md) | Update README files | `/update-readme` |
| [generate-architecture.prompt.md](.github/prompts/generate-architecture.prompt.md) | Generate Mermaid diagrams | `/generate-architecture` |
| [explain-function.prompt.md](.github/prompts/explain-function.prompt.md) | Document selected code | `/explain-function` |

### Documentation Files (`docs/`)

| File | Purpose |
|------|---------|
| [docs/README.md](docs/README.md) | Documentation home |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Version history (Keep a Changelog) |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Project terminology |
| [docs/specs/TEMPLATE.md](docs/specs/TEMPLATE.md) | Specification template |
| [docs/adr/INDEX.md](docs/adr/INDEX.md) | ADR index |
| [docs/adr/TEMPLATE.md](docs/adr/TEMPLATE.md) | ADR template |
| [docs/gallery/INDEX.md](docs/gallery/INDEX.md) | Generated docs index |

### Configuration (`.doc-architect/`)

| File | Purpose |
|------|---------|
| [config.json](.doc-architect/config.json) | All settings (indexing, embeddings, staleness, etc.) |
| [TOOL_INDEX.md](.doc-architect/TOOL_INDEX.md) | Tool documentation with parameters |

---

## ⚙️ Configuration

Edit `.doc-architect/config.json`:

```json
{
  "indexing": {
    "include": ["src/**/*.ts", "docs/**/*.md"],
    "exclude": ["node_modules/**", "dist/**"]
  },
  "staleness": {
    "threshold": 0.85,
    "severity": {
      "critical": 0.5,
      "warning": 0.7
    }
  },
  "ralph": {
    "maxIterations": 10,
    "taskTimeout": 30000
  }
}
```

---

## 📋 Workflows

### Updating Documentation

```
@doc-architect index the codebase
@doc-architect find docs mentioning UserService
@doc-architect update docs/API.md to reflect changes in UserService
```

### Checking Documentation Health

```
@doc-guardian check docs health
@doc-guardian what docs are stale?
```

### Processing Tasks

1. Add tasks to `PROGRESS.md`:
   ```markdown
   - [ ] [P0] Fix broken links in README
   - [ ] [P1] Update API documentation
   ```

2. Run Ralph:
   ```
   @doc-ralph process pending tasks
   ```

### Creating a New Spec

1. Copy `docs/specs/TEMPLATE.md` to `docs/specs/ACTIVE/my-feature.md`
2. Fill out the spec
3. When complete:
   ```
   @doc-architect move spec my-feature to done
   ```

### Recording an Architecture Decision

1. Copy `docs/adr/TEMPLATE.md` to `docs/adr/XXXX-title.md`
2. Fill out the decision
3. Add to `docs/adr/INDEX.md`

---

## 🔒 Safety Features

- **Max Iterations**: Ralph stops after 10 tasks (configurable)
- **Task Timeout**: Individual tasks timeout after 30s
- **Stuck Detection**: Tasks failing 3 times are skipped
- **Confirmation Prompts**: Destructive operations require approval
- **Dry Run Mode**: Preview changes before applying

---

## 🧪 Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Launch Extension Host
# Press F5 in VS Code
```

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vectra | 0.12.3 | Local file-based vector database |
| web-tree-sitter | 0.26.3 | WASM-based code parsing |
| @xenova/transformers | 2.17.2 | Local embedding generation (optional) |

---

## 🗺️ Roadmap

- [ ] VS Code native embeddings (when API available)
- [ ] More language grammars (Python, Go, Rust)
- [ ] Git integration for change detection
- [ ] Custom prompt templates
- [ ] MCP server integration

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- [Vectra](https://github.com/Stevenic/vectra) - Local vector database
- [Tree-sitter](https://tree-sitter.github.io/) - Code parsing
- [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js) - Local embeddings
