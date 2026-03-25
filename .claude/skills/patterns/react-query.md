# Skill: React Query Patterns

**Used by:** Frontend Next.js agent, Integrator.

---

## Setup

```typescript
// app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,       // 1 minute
        retry: 1,                    // retry once on failure
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## Query Keys Convention

```typescript
// lib/queryKeys.ts — centralize all query keys
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  orders: {
    all: ['orders'] as const,
    byUser: (userId: string) => [...queryKeys.orders.all, 'user', userId] as const,
  },
} as const;
```

---

## useQuery Hooks

```typescript
// lib/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(filters ?? {}),
    queryFn: () => api.users.list(filters),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => api.users.getById(id),
    enabled: !!id,  // don't run if id is empty
  });
}
```

---

## useMutation Hooks

```typescript
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => api.users.create(data),
    onSuccess: () => {
      // Invalidate list cache — triggers refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserInput) => api.users.update(id, data),
    onSuccess: (updatedUser) => {
      // Update cache directly — no refetch needed
      queryClient.setQueryData(queryKeys.users.detail(id), updatedUser);
      // Invalidate lists (order/count may have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}
```

---

## Component Usage

```typescript
'use client';

export function UserList() {
  const { data, isLoading, isError, error } = useUsers();
  const deleteUser = useDeleteUser();

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorMessage error={error} />;

  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>
          {user.name}
          <button
            onClick={() => deleteUser.mutate(user.id)}
            disabled={deleteUser.isPending}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CreateUserForm() {
  const createUser = useCreateUser();

  const handleSubmit = async (data: CreateUserInput) => {
    await createUser.mutateAsync(data);
    // navigate away or show success
  };

  return (
    <form>
      {createUser.isError && <ErrorMessage error={createUser.error} />}
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

---

## Optimistic Updates

```typescript
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.posts.update(id, { isFavorite }),

    onMutate: async ({ id, isFavorite }) => {
      // Cancel any in-flight refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(id) });

      // Snapshot current value
      const previous = queryClient.getQueryData(queryKeys.posts.detail(id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.posts.detail(id), (old: Post) => ({
        ...old,
        isFavorite,
      }));

      return { previous }; // rollback context
    },

    onError: (_, { id }, context) => {
      // Roll back on error
      queryClient.setQueryData(queryKeys.posts.detail(id), context?.previous);
    },

    onSettled: (_, __, { id }) => {
      // Always sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(id) });
    },
  });
}
```

---

## Prefetching (Server → Client)

```typescript
// app/users/page.tsx — Server Component
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

export default async function UsersPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.users.list({}),
    queryFn: () => fetchUsers(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />  {/* Client component — data already in cache */}
    </HydrationBoundary>
  );
}
```

---

## Code Review: React Query Checklist

```
[ ] Centralized query keys (no inline strings)
[ ] Hooks in lib/hooks/ not inside components
[ ] onSuccess invalidates relevant query keys
[ ] enabled: !!id pattern for conditional queries
[ ] isPending used for loading states (not isLoading)
[ ] mutateAsync used when awaiting result, mutate for fire-and-forget
[ ] No direct queryClient access from components (use hooks)
```
