# Pattern: Feature Folder Architecture

Use feature-oriented folders as the default structure for application code.

## Core Rule

Code should be grouped by feature or module ownership first, not by file type alone.

## Expected Layout

- `src/features/<feature>/components`
- `src/features/<feature>/api`
- `src/features/<feature>/hooks`
- `src/features/<feature>/schemas`
- `src/features/<feature>/store` when local feature state exists
- `src/features/<feature>/tests`

## Rules

- Route files should import feature entrypoints; they should not own business logic
- Shared libraries belong in `src/lib` only when multiple features use them
- Shared UI belongs in `src/components` only when it is feature-agnostic
- Avoid duplicating the same feature across multiple root folders

## Review Signals

- Good: one feature folder explains the full implementation surface
- Warning: feature logic spread between `app/`, `components/`, and `hooks/` with no owner
