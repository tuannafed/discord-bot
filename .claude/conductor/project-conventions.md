# Project Conventions

Use this file to declare the neutral engineering conventions for this project.
Agents must treat it as the source of truth for architecture choices that can vary
between projects.

**Project:** discord-coin-tracker-bot
**Team type:** api-only (no traditional frontend — Discord is the UI layer)
**Preset:** discord-bot-node

---

## Selected Archetype

- Archetype ID: `discord-bot-node`
- Summary: Single long-running Node.js process using discord.js v14. No frontend framework. Discord slash commands serve as the UI layer. Business logic lives in services; data access in repository classes; external APIs wrapped in provider classes.
- Primary surfaces:
  - Frontend shell: Discord slash commands (not a web app)
  - Backend style: Service + Repository + Provider pattern with constructor injection
  - Integration boundary: `CryptoDataProvider` aggregates CMC + Bybit; repositories abstract JSON vs PostgreSQL storage

## Required Patterns

List each required skill path explicitly. Agents must load these files before proposing architecture or code.

- `.claude/skills/shared/convention-resolution.md`
- `.claude/skills/patterns/typed-api-client-standard.md`

## Forbidden Patterns

- Global singletons (all dependencies injected via constructor in `app.ts`)
- Mutating existing objects in place — always return new objects (immutability rule)
- Hardcoded API keys or secrets in source code
- Direct HTTP calls inside commands — route through providers/services
- Raw `pg` queries outside of `Pg*Repository` classes
- Ad-hoc folder layouts — new commands go in `src/commands/`, new services in `src/services/`, etc.

## Folder Contract

| Area | Required location | Notes |
|------|-------------------|-------|
| Entry point | `src/app.ts` | Wires all dependencies; only place for `new` calls |
| Commands | `src/commands/<name>.ts` | Export `data`, `execute`, optionally `init(service)` |
| Command registry | `src/commands/index.ts` | `buildCommands()` + `getCommandBuilders()` |
| Events | `src/events/<event-name>.ts` | One file per Discord event |
| Providers | `src/providers/` | External API wrappers; implement `CryptoProvider` interface |
| Services | `src/services/` | Business logic; consume repositories + providers |
| Repositories | `src/repositories/` | Data access; JSON variants default, Pg variants for PostgreSQL |
| DB client | `src/db/` | PostgreSQL pool + migration runner |
| Types | `src/types/` | Shared TypeScript interfaces/types |
| Utilities | `src/utils/` | Stateless helpers (format, logger, ids, time) |
| Config | `src/config/env.ts` | Zod-validated env schema — single source of truth for env vars |

## Agent Resolution Rule

1. Read this file before designing architecture, code, or review feedback.
2. Load every skill listed in `## Required Patterns`.
3. Apply precedence in this order:
   `Optional Overrides` → `Project Conventions` → referenced skills → generic project docs.
4. If a rule is not relevant to the current layer, mark it `not-applicable` in the track's `Convention Resolution` section instead of ignoring it silently.
5. Treat `Forbidden Patterns` as review failures unless an override explicitly allows them.

## Optional Overrides

### Frontend

- Not applicable — Discord is the UI layer, no web frontend

### Backend

- Response contract strategy: Discord `InteractionReply` messages formatted via `src/utils/format.ts`
- Module root: `src/services/`
- Dual storage: Default to JSON (`*Repository`), switch to PG (`Pg*Repository`) when `DATABASE_URL` is set

### Integrator

- Contract verification focus: Provider interface (`CryptoProvider`) — all services depend on the interface, not concrete implementations
- When `DATABASE_URL` is set, `app.ts` must route to `Pg*Repository` classes instead of JSON repositories

### Reviewer

- Convention compliance priority: Folder contract is blocking; naming conventions are warnings
- Any new command must be registered in `src/commands/index.ts` AND in the Discord API via `yarn register`
