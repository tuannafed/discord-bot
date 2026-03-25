# Archetype: TanStack Start Feature SaaS

Neutral archetype for a feature-driven full-stack app built with TanStack Start (file-based routing, server functions, Vite).

## Use When

- The app uses TanStack Start (or similar TanStack Router + React Start) instead of Next.js
- Routes live in `src/routes/` with file-based conventions
- Server logic is in `createServerFn()` or API route `server.handlers`
- Features are organized by domain with shared UI and lib

## Architecture Shape

- `src/routes/` — file-based routes (`__root.tsx`, `_layout.tsx`, `index.tsx`, `posts.$postId.tsx`, etc.)
- `src/features/<feature>/` or `src/modules/<feature>/` — feature UI, server functions, hooks, TanStack Query, Zustand stores, table definitions
- `src/components/ui/` — generic UI primitives
- `src/lib/` — shared infra: auth, API helpers, utilities
- Router and Query Client are set up in a single router entry (e.g. `router.tsx`); context includes `queryClient` for SSR

## Conventions

- Prefer feature/domain modules over type-based folders
- Keep business logic in server functions or feature modules, not inline in route files
- Route files delegate to feature entrypoints; loaders use `createServerFn()` for server data
- Shared components stay generic and reusable

## Common Output Expectations

- Frontend plans identify route tree and which routes use which features
- Server functions and API routes are named and grouped by feature
- TanStack Query keys and TanStack Table usage are colocated with features
- Integrator plans wire server functions and API routes to features without leaking implementation into route files
