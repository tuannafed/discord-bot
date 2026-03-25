# Pattern: TanStack Start + Query + Table + Zustand

Use TanStack Query for server state, TanStack Table for tables, and Zustand for local client-side workflow state in TanStack Start apps.

## Responsibilities

- **TanStack Query:** API/data fetching, caching, revalidation, loading/error state for remote data; preload in route loaders when possible via `context.queryClient.ensureQueryData` or `fetchQuery`.
- **TanStack Table:** Column definitions, sorting, filtering, pagination for table UIs; table state (visibility, sort) can live in component state or Zustand when shared.
- **Zustand:** Local UI state, transient workflows, client-only selections, modal state — not for duplicating server entities unless documented (e.g. offline/editing).

## Rules

- Do not copy server entities into Zustand unless there is a documented offline/editing need
- Query hooks and query options live with the owning feature or route
- Query keys must be stable, explicit, and colocated with the feature API layer
- Table definitions use TanStack Table; data source is TanStack Query (hooks or loader data)
- Zustand stores stay small and purpose-specific
- Server data access: use `createServerFn()` in loaders; from client events use server functions or fetch to API routes (`server.handlers`)

## Suggested Layout

- `src/features/<feature>/api/` or `src/routes/...` — server functions, query options, hooks
- `src/features/<feature>/tables/` or next to feature — TanStack Table column defs and table components
- `src/features/<feature>/store/use-<feature>-store.ts` — Zustand store for local UI state

## Review Signals

- Good: remote data via Query; loaders use server functions; tables use TanStack Table with Query data; local UI state in Zustand only
- Warning: large mutable domain objects duplicated between Query cache and Zustand; server logic in route files without `createServerFn()`
