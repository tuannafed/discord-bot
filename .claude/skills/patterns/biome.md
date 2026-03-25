# Biome

Use Biome for linting and formatting (replace ESLint + Prettier where adopted).

## Conventions

- Config: `biome.json` or `biome.jsonc` at project root
- Run: `biome check .` (lint + format check), `biome check --write .` (fix)
- CI: run `biome ci` for check-only
- Ignore patterns and overrides per project; keep rules consistent across the repo

## Review

- Do not mix Biome and ESLint/Prettier on the same paths without explicit justification
- Format and lint must pass before merge
