# Convention Resolution

Use this skill whenever the project has `.claude/conductor/project-conventions.md`.

## Goal

Resolve the project-specific architecture and implementation conventions before writing design output, code plans, or review feedback.

## Resolution Steps

1. Read `.claude/conductor/project-conventions.md`.
2. Load every skill path listed under `## Required Patterns`.
3. Keep only the rules relevant to the current layer:
   - frontend: folder contract, state/data pattern, permission-aware UI
   - backend: response contract, module layout, typed API compatibility
   - integrator: client adapter shape, cache strategy, contract verification
   - reviewer: forbidden patterns, folder contract, override precedence
4. Apply precedence:
   `Optional Overrides` → `Project Conventions` → referenced skills → generic project docs.
5. Write a short `### Convention Resolution` section into the active track before the rest of the output.

## Required Track Summary

Each `Convention Resolution` section should list:

- selected archetype
- relevant required patterns
- folder contract applied to this layer
- forbidden patterns checked
- overrides used or `none`
- non-applicable rules, if any

## Guardrails

- Never invent conventions that are not declared in the manifest or referenced skills.
- Do not apply a global default state library if the manifest selects another pattern.
- If the manifest is incomplete, surface the missing convention explicitly instead of guessing.
- Keep convention notes short and operational; they are a decision record, not a long essay.
