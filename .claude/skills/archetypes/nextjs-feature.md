# Archetype: Next.js Feature SaaS

Neutral archetype for a feature-driven web product built with Next.js App Router.

## Use When

- The app is organized around user-facing product features
- Routes should stay thin and compose feature modules
- Shared UI and infrastructure need clear separation from feature code

## Architecture Shape

- `app/` handles routing, layouts, and route-level loading/error boundaries
- `src/features/<feature>/` owns the feature's UI, API adapters, hooks, schemas, tests
- `src/components/ui/` contains generic UI primitives
- `src/lib/` contains shared infrastructure such as API client, auth, permissions

## Conventions

- Prefer feature modules over type-based folders
- Keep business logic close to the owning feature
- Route files delegate to feature entrypoints rather than implementing logic directly
- Shared components must stay generic and reusable

## Common Output Expectations

- Frontend plans identify feature entrypoints and route composition
- Backend plans align API modules and DTO names with feature ownership
- Integrator plans wire feature APIs without leaking implementation details into routes
