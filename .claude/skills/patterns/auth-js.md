# Auth.js (NextAuth)

Use Auth.js for authentication in Next.js (credentials, OAuth, adapters). App Router route handlers and middleware.

## Conventions

- Configure in `auth.ts` (or `auth.config.ts`) with providers and adapter
- Route handler: `app/api/auth/[...nextauth]/route.ts` (or equivalent)
- Use `getServerSession()` in server components and API routes; use `useSession()` in client components
- Protect routes via middleware or server checks; redirect to sign-in when unauthenticated

## Review

- `AUTH_SECRET` must be set and never committed
- Session strategy (JWT vs database) and adapter choice must match project setup
