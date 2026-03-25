# Better Auth

Use Better Auth for authentication (session, OAuth, credentials). Configure server-side; use client SDK in the app.

## Conventions

- Server config: single auth instance (e.g. `lib/auth` or `src/lib/auth.ts`) with plugins (e.g. `tanstackStartCookies` for TanStack Start)
- Mount handler at a dedicated route (e.g. `/api/auth/[...all]` or `/api/auth/$`)
- Use `auth.api.getSession({ headers })` in server middleware; use client `getSession()` in components
- Protect routes via middleware or loader checks; redirect unauthenticated users to login

## Review

- Secrets and auth config must never be exposed to client bundles
- Session handling must use httpOnly cookies where applicable
