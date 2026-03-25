# Pattern: Permission-Aware UI

Design UI and navigation so permission checks are modular, typed, and reusable.

## Core Rule

Permission decisions should flow through shared helpers, hooks, or capability maps instead of repeated inline role checks.

## Responsibilities

- Shared permission helpers translate identity/capabilities into UI decisions
- Feature components ask for capabilities, not raw role strings
- Reviewers treat duplicated permission logic as a maintainability and correctness risk

## Rules

- Prefer capability-oriented checks such as `canEditProject` over `role === 'admin'`
- Keep permission utilities in a shared location such as `src/lib/permissions`
- Hide or disable UI based on capabilities consistently across routes and components
- Pair permission-aware UI decisions with backend authorization checks; frontend gating is not security on its own

## Review Signals

- Good: permissions are declared once and reused across modules
- Warning: scattered inline checks with inconsistent behavior between screens
