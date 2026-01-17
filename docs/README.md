# Doc-Architect Documentation

This folder contains all project documentation.

## Structure

```
docs/
├── README.md           # This file
├── CHANGELOG.md        # Version history
├── specs/              # Feature specifications
│   ├── ACTIVE/         # Specs in progress
│   ├── DONE/           # Completed specs
│   └── TEMPLATE.md     # Spec template
└── adr/                # Architecture Decision Records
    ├── INDEX.md        # ADR listing
    └── TEMPLATE.md     # ADR template
```

## Workflows

### Spec-Driven Development

1. Create spec: `docs/specs/ACTIVE/my-feature.md`
2. `@architect read spec my-feature`
3. Implement code
4. `@architect complete spec my-feature`

The `complete_spec` tool:
- Moves spec to DONE/
- Adds changelog entry
- Generates ADR if warranted

### Manual Coding + Docs

1. Write code
2. `@architect analyze changes`
3. `@architect add changelog: Added feature X`

## Using the Agents

### @architect
Full capabilities - specs, coding, documentation.

```
@architect what's in my inbox?
@architect read spec user-auth
@architect complete spec user-auth
```

### @docs
Documentation-only (no code changes).

```
@docs check docs health
@docs add changelog: Fixed login bug
```

## Templates

- [specs/TEMPLATE.md](specs/TEMPLATE.md) - Spec template with frontmatter
- [adr/TEMPLATE.md](adr/TEMPLATE.md) - ADR template with frontmatter
