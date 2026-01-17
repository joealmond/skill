# ADR-0001: Use Local Vector Database (Vectra)

> **Status**: 🟢 Accepted  
> **Date**: 2024-01-01  
> **Deciders**: Project team  

---

## Context

Doc-Architect needs to perform semantic search over code and documentation to detect staleness and enable intelligent querying. This requires a vector database to store and search embeddings.

Key requirements:
- Must work offline (no cloud dependencies)
- Must be zero-configuration (no Docker, no external services)
- Must be fast enough for real-time queries
- Must persist across VS Code sessions
- File-based storage for easy backup/versioning

---

## Decision

We will use **Vectra** (`vectra@0.12.3`) as our local vector database.

Vectra stores vectors in JSON files on disk, requiring no external processes or services. It provides cosine similarity search out of the box.

---

## Consequences

### Positive

- Zero configuration - just `npm install`
- Works completely offline
- File-based storage integrates with git
- Simple API with TypeScript support
- Fast enough for codebases up to ~50k chunks

### Negative

- Limited scalability for very large codebases (100k+ files)
- No built-in sharding or distribution
- JSON storage is not as space-efficient as binary formats

### Neutral

- Requires manual embedding generation (we use @xenova/transformers or VS Code embeddings)

---

## Alternatives Considered

### Alternative 1: ChromaDB

**Description**: Popular open-source embedding database

**Pros**:
- More features (filtering, metadata)
- Larger community

**Cons**:
- Requires Python runtime or Docker
- More complex setup

**Why rejected**: Violates zero-configuration requirement

### Alternative 2: Pinecone/Weaviate Cloud

**Description**: Cloud-hosted vector databases

**Pros**:
- Highly scalable
- Managed infrastructure

**Cons**:
- Requires internet connection
- Cost for larger usage
- Privacy concerns with code

**Why rejected**: Violates offline-first requirement

### Alternative 3: SQLite with vector extension

**Description**: Use sqlite-vec or similar

**Pros**:
- Battle-tested storage engine
- SQL query capabilities

**Cons**:
- Native bindings can be problematic in VS Code extensions
- More complex setup

**Why rejected**: Native binding issues in extension context

---

## References

- [Vectra npm package](https://www.npmjs.com/package/vectra)
- [VS Code extension best practices](https://code.visualstudio.com/api/references/extension-guidelines)
