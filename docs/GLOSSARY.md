# Glossary

Project-specific terminology that Doc-Architect should understand and use consistently.

---

## A

### ADR (Architecture Decision Record)
A document that captures an important architectural decision made along with its context and consequences. Stored in `docs/adr/`.

### Agent
A VS Code custom agent (`.agent.md` file) that provides specialized AI behavior with specific tools and instructions.

---

## C

### Chunk
A semantic unit of code extracted by tree-sitter parsing. Typically a function, class, or module. Used as the unit for embedding and search.

---

## D

### Doc Rot
Documentation that has become outdated or inaccurate due to code changes. The primary problem Doc-Architect aims to solve.

### Drift Score
A numeric measure (0.0-1.0) of how similar a documentation chunk is to its associated code chunk. Lower scores indicate potential staleness.

---

## E

### Embedding
A vector representation of text that captures semantic meaning. Used for similarity search in the vector database.

---

## G

### Gallery
The `docs/gallery/` folder containing generated documentation files like API references, component docs, and diagrams.

---

## L

### Language Model Tool
A VS Code extension contribution that provides a function callable by Copilot during agent mode. Registered via `vscode.lm.registerTool()`.

---

## M

### MCP (Model Context Protocol)
A protocol for connecting AI models to external tools and data sources. Doc-Architect uses lazy MCP loading for optional integrations.

---

## P

### PROGRESS.md
The task file that Doc-Ralph reads to find pending documentation tasks. Uses checkbox format (`- [ ]` / `- [x]`).

### Prompt File
A reusable VS Code prompt (`.prompt.md` file) that can be invoked with `/` commands in chat.

---

## R

### Ralph Loop
The autonomous execution loop that processes PROGRESS.md tasks one by one with safety limits.

---

## S

### Spec (Specification)
A feature specification document in `docs/specs/`. Moves from ACTIVE to DONE when implemented.

### Staleness Threshold
The similarity score (default 0.85) below which documentation is considered potentially outdated.

---

## T

### Tree-sitter
A parser generator tool that produces fast, robust parsers. Used for AST-based code chunking.

### Tool Index
The `.doc-architect/TOOL_INDEX.md` file that maps tool names to their schemas for lazy loading.

---

## V

### Vectra
A local file-based vector database used for storing and querying embeddings.

---

<!-- Add new terms alphabetically -->
