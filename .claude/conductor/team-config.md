# Team Config: API Only

**Stack:** NestJS or FastAPI + PostgreSQL

## Agent Pipeline

```
BA → DB Engineer → Backend Dev → API Designer → Code Reviewer
```

## Agent Responsibilities

| Order | Agent | Phase Key | Input | Output |
|-------|-------|-----------|-------|--------|
| 1 | BA | `ba` | CLAUDE.md + product.md | Spec, user stories, AC |
| 2 | DB Engineer | `db` | BA spec | Schema, migrations, indexes |
| 3 | Backend Dev | `backend` | DB schema | Business logic, services, controllers |
| 4 | API Designer | `api-design` | Backend code | OpenAPI spec, docs, contract |
| 5 | Code Reviewer | `review` | All above | Issues list, approval |

## Slash Commands

```
/agent-team init "<feature>"      → BA (creates track)
/agent-team db <track-id>         → DB Engineer
/agent-team backend <track-id>    → Backend Dev
/agent-team api-design <track-id> → API Designer
/agent-team review <track-id>     → Code Reviewer
/agent-team status                → Track summary
```

## Agent Prompts

- BA: `~/Projects/AI/claude-agent-team/templates/agent-prompts/ba.md`
- DB Engineer: `~/Projects/AI/claude-agent-team/templates/agent-prompts/db-engineer.md`
- Backend (NestJS): `~/Projects/AI/claude-agent-team/templates/agent-prompts/backend-nestjs.md`
- Backend (FastAPI): `~/Projects/AI/claude-agent-team/templates/agent-prompts/backend-fastapi.md`
- API Designer: `~/Projects/AI/claude-agent-team/templates/agent-prompts/api-designer.md`
- Code Reviewer: `~/Projects/AI/claude-agent-team/templates/agent-prompts/code-reviewer.md`

## Quality Gates

- BA acceptance criteria must be complete before DB starts
- Schema reviewed before backend implementation
- OpenAPI spec must be validated (no breaking changes if existing API)
