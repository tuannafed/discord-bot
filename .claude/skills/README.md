# Skills — Directory Structure

This directory contains **skills** (.md files) that agents read to follow project conventions and patterns. There are 6 layers:

---

## 1. Six main layers

```
.claude/skills/
├── MANIFEST.md          ← Map: which skill → which agent (read this first)
├── README.md            ← This file — explains the structure
│
├── core/                ← Required for all projects
│   ├── api-contract.md
│   ├── security-baseline.md
│   ├── testing-strategy.md
│   ├── git-workflow.md
│   └── error-handling-patterns.md
│
├── framework/           ← By tech stack
│   ├── typescript.md
│   ├── database.md
│   ├── nestjs.md
│   ├── fastapi.md
│   └── nextjs.md
│
├── domain/              ← Copy only when used (not default)
│   ├── chrome-extension-mv3.md
│   ├── prompt-engineering.md
│   └── rag-architecture.md
│
├── shared/              ← For all convention-aware agents
│   └── convention-resolution.md
│
├── archetypes/          ← Project shape: overall structure
│   ├── nextjs-feature.md
│   ├── nextjs-workspace-modular.md
│   └── tanstack-start-feature.md
│
└── patterns/            ← Implementation patterns: folder, state, API client, lib
    ├── feature-folder-architecture.md
    ├── react-query-zustand.md
    ├── tanstack-start-query-table-zustand.md
    ├── tanstack-start.md
    ├── typed-api-client-standard.md
    ├── react-query.md
    ├── rtk-query-standard.md
    ├── permission-aware-ui.md
    ├── shadcn.md, zod.md, biome.md, react-hook-form.md
    ├── zustand.md, tanstack-table.md
    ├── auth-js.md, better-auth.md
    └── ...
```

- **core/:** mandatory skills for most projects (API contract, security, testing, git, error handling).
- **framework/:** skills per tech stack (typescript, nestjs, fastapi, nextjs, database).
- **domain/:** specialized skills — copy only when the project actually uses them (Chrome extension, AI/LLM, RAG).
- **shared/:** shared rules (how to resolve conventions, write to track).
- **archetypes/:** "what kind of project" (feature, workspace modular, TanStack Start).
- **patterns/:** "how to implement" (folder, state, API client, permission, lib). Agents load these based on the **Required Patterns** list in `project-conventions.md`.

---

## 2. What to read when?

| You are... | Read first |
|------------|-----------|
| Finding out which agent uses which skill | `MANIFEST.md` (Core → Agent table, Convention-Aware, Domain) |
| Adjusting conventions for a project | `.claude/conductor/project-conventions.md` (in the project) — that file points to the archetype + patterns |
| Adding a new preset / pattern | Create a file in `archetypes/` or `patterns/`, then add it to the preset in `convention-presets/` and to MANIFEST |

---

## 3. "Agent reads skill" flow

1. **Conductor** (project): `project-conventions.md` selects **archetype** + **Required Patterns**.
2. Agent loads **shared/convention-resolution.md** + each skill in Required Patterns (from `archetypes/`, `patterns/`).
3. Agent also loads **core/** and **framework/** skills per the matrix in MANIFEST.

Per-agent details: see `docs/flow-frontend-agent.md` (frontend example) and MANIFEST.

---

## 4. Quick reference

- **core/:** api-contract, security-baseline, testing-strategy, git-workflow, error-handling-patterns.
- **framework/:** typescript, database, nestjs, fastapi, nextjs.
- **domain/:** chrome-extension-mv3, prompt-engineering, rag-architecture.
- **patterns/ (lib):** auth-js, better-auth, biome, shadcn, zustand, zod, react-hook-form, tanstack-table, react-query, tanstack-start.

Full list and agent ↔ skill table: **MANIFEST.md**.
