# Doc-Architect Documentation

Welcome to the Doc-Architect documentation system. This folder contains all project documentation organized by type.

## 📁 Structure

```
docs/
├── README.md           # This file
├── CHANGELOG.md        # Version history
├── GLOSSARY.md         # Project terminology
├── specs/              # Feature specifications
│   ├── ACTIVE/         # Specs in progress
│   ├── DONE/           # Completed specs
│   └── TEMPLATE.md     # Spec template
├── adr/                # Architecture Decision Records
│   ├── INDEX.md        # ADR listing
│   └── TEMPLATE.md     # ADR template
└── gallery/            # Generated documentation
    └── INDEX.md        # Gallery index
```

## 🚀 Quick Links

- [Changelog](./CHANGELOG.md) - What's new
- [Glossary](./GLOSSARY.md) - Project terminology
- [Active Specs](./specs/ACTIVE/) - Current work
- [Architecture Decisions](./adr/INDEX.md) - Why we built it this way
- [Documentation Gallery](./gallery/INDEX.md) - Generated docs

## 📝 Contributing Documentation

### Creating a Spec
1. Copy `specs/TEMPLATE.md` to `specs/ACTIVE/SPEC-XXX-name.md`
2. Fill in the template
3. When complete, use `@doc-architect` to move to DONE

### Creating an ADR
1. Copy `adr/TEMPLATE.md` to `adr/ADR-XXX-title.md`
2. Fill in the decision details
3. Update `adr/INDEX.md`

### Using Doc-Architect Agent
- Type `@doc-architect` in VS Code chat for documentation help
- Use `/update-readme` for quick README updates
- Use `/generate-architecture` for diagrams
