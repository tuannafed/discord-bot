# Zustand

Use Zustand for client-side UI state (modals, filters, workflow state). Do not use for server/cache state — use TanStack Query or RTK Query for that.

## Conventions

- Stores: small, feature-scoped (e.g. `useFeatureStore`); avoid a single global store for all UI state
- Do not duplicate server entities in Zustand; sync from API via Query and keep only UI state in store
- Use slices or multiple small stores rather than one large store
- Persist only when needed (e.g. `persist` middleware for preferences)

## Review

- Good: modal open/close, column visibility, wizard step; Bad: copying list data from API into store
