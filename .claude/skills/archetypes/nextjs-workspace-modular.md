# Archetype: Next.js Workspace Modular

Neutral archetype for a modular workspace application with area-specific modules and a shared shell.

## Use When

- The app has multiple workspace areas or operating contexts
- Navigation, permissions, and module boundaries matter more than simple page hierarchy
- Shared shell concerns should be distinct from module implementation

## Architecture Shape

- `app/(workspace)/` owns shells, layouts, and workspace route composition
- `src/modules/<area>/` owns area-specific screens, API integration, state, tests
- `src/components/` contains reusable UI and layout helpers
- `src/store/` owns Redux store setup and shared middleware
- `src/lib/` owns infrastructure such as API client and permission helpers

## Conventions

- Preserve clear boundaries between shell code and module code
- Modules own their screens, api slices, and selectors
- Shared shell components must not absorb area-specific business logic
- Permission handling should flow through reusable capability helpers

## Common Output Expectations

- Frontend plans identify workspace shell vs module ownership
- Backend plans align capability-oriented endpoints to module boundaries
- Integrator plans focus on RTK Query endpoints, tags, and typed adapters
