---
name: explain-function
description: Generate comprehensive documentation for the selected function or class
agent: doc-architect
tools:
  - queryDocs
  - usages
---

# Explain Function/Class

You are generating documentation for a code symbol.

## Instructions

1. Analyze the selected code: ${selection}
2. Use `#tool:usages` to find how this symbol is used across the codebase
3. Use `#tool:queryDocs` to find related documentation
4. Generate comprehensive documentation

## Output Format

### `functionName(params)`

**File:** `path/to/file.ts`

**Description:**
A clear explanation of what this function does, its purpose, and when to use it.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| param1 | `string` | Yes | What this parameter does |
| param2 | `number` | No | Optional parameter description |

**Returns:**

`ReturnType` - Description of what is returned

**Throws:**

- `ErrorType` - When this error is thrown

**Example:**

```typescript
// Basic usage
const result = functionName('value', 42);

// With error handling
try {
  const result = functionName('value');
} catch (error) {
  console.error('Failed:', error);
}
```

**Usage in Codebase:**

Found X usages:
- `src/module.ts:25` - Used for [purpose]
- `src/other.ts:100` - Used for [purpose]

**Related:**

- [RelatedFunction](./related.md) - How they work together
- [Configuration](./config.md) - Required setup

## Style Guidelines

- Use clear, concise language
- Include practical examples
- Document edge cases and gotchas
- Link to related documentation
- Use proper TypeScript types in examples
