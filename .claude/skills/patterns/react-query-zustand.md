# Pattern: React Query + Zustand

Use React Query for server state and Zustand for local client-side workflow state.

## Responsibilities

- React Query: API requests, caching, revalidation, loading/error state for remote data
- Zustand: local UI state, transient workflows, client-only selections, modal state

## Rules

- Do not copy server entities into Zustand unless there is a documented offline/editing need
- Query hooks live with the owning feature or module
- Query keys must be stable, explicit, and colocated with the feature API layer
- Zustand stores should stay small and purpose-specific
- Components consume typed API functions through feature hooks, not raw `fetch`

## Suggested Layout

- `src/features/<feature>/api/client.ts`
- `src/features/<feature>/api/hooks.ts`
- `src/features/<feature>/store/use-<feature>-store.ts`

## Review Signals

- Good: remote data changes invalidate query keys and local UI state stays local
- Warning: large mutable domain objects duplicated between React Query cache and Zustand
