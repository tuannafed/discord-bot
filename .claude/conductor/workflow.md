# Workflow Rules: discord-bot

## Branch Strategy

- `main` — production-ready code only
- `develop` — integration branch
- `feature/track-NNN-<slug>` — one branch per track
- `fix/track-NNN-<slug>` — bug fix branches

## Track Lifecycle

```
pending → in-progress → review → done
                      ↘ blocked (with reason)
```

## Agent Handoff Protocol

1. Agent reads their **input section** from the track file
2. Agent performs work
3. Agent writes output to their **output section** in the track file
4. Agent updates `## Status` and `## Current Phase` in the track
5. Next agent is indicated in `## Next Step`

## Code Standards

- No `any` types in TypeScript
- All API endpoints must have input validation (Zod / Pydantic)
- Unit tests required for business logic
- E2E tests required for critical user flows
- No secrets in code — use env vars

## Review Gates

Before marking a track `done`:
- [ ] Code Reviewer has reviewed and approved
- [ ] Tests pass (unit + integration)
- [ ] No TypeScript errors
- [ ] PR description references track ID

## Commit Convention

```
<type>(track-NNN): <description>

Types: feat | fix | db | chore | docs | test | refactor
```

Example: `feat(track-001): add JWT auth endpoints`

## Definition of Done

- [ ] Feature works as specified in BA output (track spec section)
- [ ] Tests written and passing
- [ ] Code reviewed and approved
- [ ] Documentation updated if needed
- [ ] Track status set to `done`
