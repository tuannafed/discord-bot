# Pattern: RTK Query Standard

Use RTK Query as the project's server-state and request orchestration layer.

## Responsibilities

- RTK Query API slices own endpoint definitions, cache tags, and request status
- Redux slices own truly shared client state that is not already represented by RTK Query
- Components consume generated hooks/selectors from module-owned API slices

## Rules

- Do not introduce a second global server-state library alongside RTK Query
- Define cache tags deliberately and invalidate them on write operations
- Keep API slice files close to the owning module
- Use shared typed client helpers for base queries and response transformation
- Avoid route-level ad-hoc fetch helpers when an API slice already owns the endpoint

## Suggested Layout

- `src/store/index.ts`
- `src/modules/<area>/api/<area>-api.ts`
- `src/modules/<area>/state/<area>-slice.ts`

## Review Signals

- Good: hooks come from RTK Query slices and cache invalidation is explicit
- Warning: duplicate endpoints or duplicate caching logic across modules
