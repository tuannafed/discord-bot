# Skills Manifest

Quick reference: which skills each agent reads. **Directory structure:** see `README.md` in the same folder.

---

## Folder map

| Location | Purpose |
|----------|---------|
| **core/** | Required for all projects: API contract, security, testing, git, error handling |
| **framework/** | By tech stack: typescript, database, nestjs, fastapi, nextjs |
| **domain/** | Copy only when used: chrome-extension, prompt-engineering, rag-architecture |
| **shared/** | Convention resolution — all convention-aware agents read this |
| **archetypes/** | Project shape: nextjs-feature, nextjs-workspace, tanstack-start-feature |
| **patterns/** | Implementation patterns: folder, state, API client, lib — project selects via `project-conventions.md` |

---

## Shared / Archetypes / Patterns

- **shared/**: workflow helpers that all convention-aware agents read (`convention-resolution.md`)
- **archetypes/**: neutral structural conventions for project shapes
- **patterns/**: focused implementation patterns; project picks which ones via `project-conventions.md` → Required Patterns

## Convention-Aware Skills

| Skill Path | BA | DB | NestJS | FastAPI | Frontend | Integrator | Reviewer |
|-----------|----|----|--------|---------|----------|------------|----------|
| `shared/convention-resolution.md` | | | ✅ | ✅ | ✅ | ✅ | ✅ |
| `archetypes/nextjs-feature.md` | | | | | ✅ | ✅ | ✅ |
| `archetypes/nextjs-workspace-modular.md` | | | | | ✅ | ✅ | ✅ |
| `archetypes/tanstack-start-feature.md` | | | | | ✅ | ✅ | ✅ |
| `patterns/feature-folder-architecture.md` | | | ✅ | ✅ | ✅ | ✅ | ✅ |
| `patterns/react-query-zustand.md` | | | | | ✅ | ✅ | ✅ |
| `patterns/rtk-query-standard.md` | | | | | ✅ | ✅ | ✅ |
| `patterns/typed-api-client-standard.md` | | | ✅ | ✅ | ✅ | ✅ | ✅ |
| `patterns/permission-aware-ui.md` | | | | | ✅ | ✅ | ✅ |
| `patterns/tanstack-start.md` | | | | | ✅ | ✅ | ✅ |
| `patterns/tanstack-start-query-table-zustand.md` | | | | | ✅ | ✅ | ✅ |

## Core Skill → Agent Matrix

| Skill | BA | DB | NestJS | FastAPI | Frontend | Integrator | Reviewer |
|-------|----|----|--------|---------|----------|------------|----------|
| `core/api-contract` | ✅ | | ✅ | ✅ | ✅ | ✅ | |
| `core/security-baseline` | | | ✅ | ✅ | | | ✅ |
| `core/testing-strategy` | | | ✅ | ✅ | ✅ | | ✅ |
| `core/git-workflow` | | | ✅ | ✅ | ✅ | ✅ | |
| `core/error-handling-patterns` | | | ✅ | ✅ | | ✅ | ✅ |
| `framework/typescript` | | | ✅ | | ✅ | | ✅ |
| `framework/database` | | ✅ | | | | | ✅ |
| `framework/nestjs` | | | ✅ | | | | ✅ |
| `framework/fastapi` | | | | ✅ | | | ✅ |
| `framework/nextjs` | | | | | ✅ | ✅ | ✅ |

## Domain Skills (copy only for relevant projects)

| Skill | When to copy | Agents |
|-------|-------------|--------|
| `domain/chrome-extension-mv3` | Chrome extension projects | chrome-ext, code-reviewer |
| `domain/prompt-engineering` | AI/LLM projects | ai-engineer |
| `domain/rag-architecture` | RAG/chatbot projects | ai-engineer |

## Optional lib skills (in `patterns/`, copied with folder)

Libs chosen at init (RTK Query, TanStack Query, zustand, tanstack-table, better-auth, auth-js) and default frontend libs (shadcn, biome, react-hook-form, zod) live in `patterns/` and are copied when `copy_skill_directory("patterns")` runs.

`patterns/react-query.md` covers standalone TanStack Query (without Zustand pairing).

## Convention Presets

| Preset file | Framework | Data/state |
|-------------|-----------|------------|
| `nextjs-feature` | Next.js App Router | React Query + Zustand |
| `tanstack-feature` | TanStack Start | TanStack Query + Table + Zustand |
| `nextjs-workspace` | Next.js App Router | RTK Query |

Each preset writes `.claude/conductor/project-conventions.md` and references neutral archetype/pattern skills. Local project overrides in that manifest take precedence over the preset defaults.
