---
name: update-readme
description: Update the project README based on recent code changes
agent: doc-architect
tools:
  - indexCodebase
  - queryDocs
  - writeDoc
  - appendChangelog
---

# Update README Prompt

You are updating the project README.md based on recent changes.

## Instructions

1. First, index the codebase if needed using `#tool:indexCodebase`
2. Query for recent changes and current project structure using `#tool:queryDocs`
3. Read the current README.md
4. Analyze what sections need updates:
   - Project description
   - Installation instructions
   - Usage examples
   - API documentation
   - Contributing guidelines
5. Draft the updated README
6. Use `#tool:writeDoc` to save changes
7. Add a changelog entry using `#tool:appendChangelog`

## README Structure Template

```markdown
# Project Name

Brief description of what this project does.

## Features

- Feature 1
- Feature 2

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`typescript
// Example code
\`\`\`

## API Reference

### Function/Class Name

Description and parameters.

## Contributing

How to contribute to this project.

## License

License information.
```

## User Input

The user will provide context about what changed: ${input:changes:What changes should be reflected in the README?}
