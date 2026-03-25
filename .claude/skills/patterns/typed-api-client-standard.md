# Pattern: Typed API Client Standard

Use a typed client boundary between UI/integration code and raw transport details.

## Core Rule

Client components, feature hooks, and integration code should call typed client functions or adapters, not raw transport primitives.

## Responsibilities

- Backend keeps stable request/response contracts and naming
- Integrator maps transport details into typed client functions or generated bindings
- Frontend features consume those typed functions via hooks or slices

## Rules

- Keep a clear API client entrypoint, usually under `src/lib/api/`
- Centralize auth headers, base URL, and common error normalization
- Expose typed request/response contracts close to the client boundary
- Avoid inline response shape transformations in page components
- If generated clients are used, wrap them only where project-specific behavior is needed

## Review Signals

- Good: transport concerns are isolated and components deal in typed domain-friendly inputs
- Warning: page components assemble URLs or parse raw response envelopes directly
