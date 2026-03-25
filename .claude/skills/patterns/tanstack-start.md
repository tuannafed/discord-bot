# TanStack Start

Full-stack React framework with SSR, server functions, file-based routing, and Vite. Use with TanStack Query, TanStack Table, and Zustand for data and UI state.

**Reference:** Content derived from [tanstack-start-skill](https://github.com/ferdousbhai/tanstack-start-skill).

## Project Setup

**New project:**
```bash
pnpm create cloudflare@latest my-app --framework=tanstack-start -y --no-deploy
```

## Critical Configuration

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),  // MUST come AFTER tanstackStart
  ],
})
```

### tsconfig.json

Do NOT enable `verbatimModuleSyntax` — it can leak server bundles into client bundles.

## Server Functions

**Critical:** Route loaders run on the server for initial SSR but on the **client** during navigation. Always wrap server code in `createServerFn()` so it runs server-side.

| Use Case | Solution |
|----------|----------|
| Server code in route loaders | `createServerFn()` |
| Server code from client event handlers | API routes (`server.handlers`) |
| Access Cloudflare bindings | `import { env } from 'cloudflare:workers'` |

```typescript
import { createServerFn } from '@tanstack/react-start'

export const getData = createServerFn().handler(async () => {
  return { data: process.env.SECRET }
})

// POST with validation
export const saveData = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => await db.save(data.id))
```

**API routes** (for client event handlers):

```tsx
// routes/api/users.ts
export const Route = createFileRoute('/api/users')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        return Response.json(await db.users.create(body))
      },
    },
  },
})
```

**Key APIs:** `createServerFn()`, `server.handlers`, `createMiddleware({ type: 'function' })`, `@tanstack/react-start/server`: `getRequestHeaders()`, `setResponseHeader()`, `getCookies()`.

## Routing (TanStack Router)

File-based routing in `src/routes/`:

| Pattern | Route |
|---------|-------|
| `index.tsx` | `/` |
| `posts.$postId.tsx` | `/posts/:postId` |
| `_layout.tsx` | Layout (no URL) |
| `__root.tsx` | Root layout (required) |

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const getPost = createServerFn().handler(async () => await db.post.findFirst())

export const Route = createFileRoute('/posts/$postId')({
  loader: ({ params }) => getPost({ data: params.postId }),
  component: () => {
    const post = Route.useLoaderData()
    return <h1>{post.title}</h1>
  },
})
```

## TanStack Query Integration

```bash
pnpm add @tanstack/react-query @tanstack/react-router-ssr-query
```

Preload in loaders, consume with `useSuspenseQuery`:

```tsx
loader: ({ context }) => context.queryClient.ensureQueryData(myQueryOptions)
```

Router context must include `queryClient`; use `setupRouterSsrQueryIntegration({ router, queryClient })` when creating the router.

## TanStack Table

Use `@tanstack/react-table` for tables: column definitions, sorting, filtering, pagination. Keep table state (column visibility, sort) in component or Zustand when shared across views. Server state stays in TanStack Query.

## Zustand

Use for local UI state, transient workflows, client-only selections, modal state. Do not duplicate server entities in Zustand unless there is a documented offline/editing need. Keep stores small and feature-scoped.

## Cloudflare Deployment

```bash
pnpm add -D @cloudflare/vite-plugin wrangler
```

- Add `cloudflare({ viteEnvironment: { name: 'ssr' } })` to Vite plugins.
- `wrangler`: `main: "@tanstack/react-start/server-entry"`, `compatibility_flags: ["nodejs_compat"]`.
- In server functions: `import { env } from 'cloudflare:workers'`.

## Conventions Summary

- **Data:** TanStack Query for server state; preload in route loaders when possible.
- **Tables:** TanStack Table for table UIs; query keys and data from Query.
- **Local state:** Zustand for UI/workflow state only.
- **Server logic:** Always behind `createServerFn()` or `server.handlers`.
