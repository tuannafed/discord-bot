# Skill: TypeScript Patterns

**Used by:** Backend NestJS, Frontend Next.js, Code Reviewer.

---

## Strict Mode (Required)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Never use `any`** — use `unknown` for truly unknown types, then narrow:
```typescript
// ❌ NEVER
function parse(data: any) { return data.id; }

// ✅ ALWAYS
function parse(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'id' in data) {
    return String((data as { id: unknown }).id);
  }
  throw new Error('Invalid data shape');
}
```

---

## DTOs (Data Transfer Objects)

### NestJS — class-validator
```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  role?: string;
}
```

### Frontend / Shared — Zod
```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

---

## Response Types

Always define explicit response interfaces — never return raw DB entities:

```typescript
// ✅ API response shape
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO-8601
}

// ✅ Paginated list
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

// ✅ Single item
export interface DataResponse<T> {
  success: true;
  data: T;
}

// ✅ Error response
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
```

---

## Utility Types

Use built-in utility types instead of duplicate interfaces:

```typescript
// Pick subset of fields
type UserPublic = Pick<User, 'id' | 'email' | 'name'>;

// Omit sensitive fields
type UserSafe = Omit<User, 'passwordHash' | 'refreshToken'>;

// Make fields optional for PATCH
type UpdateUserDto = Partial<Pick<User, 'name' | 'email'>>;

// Require specific subset
type LoginCredentials = Required<Pick<User, 'email' | 'password'>>;
```

---

## Discriminated Unions

Use for result types (avoid throwing exceptions in pure functions):

```typescript
type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { success: false, error: 'Division by zero' };
  return { success: true, data: a / b };
}

// Usage — TypeScript narrows correctly
const result = divide(10, 2);
if (result.success) {
  console.log(result.data); // number
} else {
  console.error(result.error); // string
}
```

---

## Enums

Prefer string literal unions over TypeScript enums (tree-shakeable, serializable):

```typescript
// ❌ Avoid TypeScript enums
enum Role { ADMIN = 'ADMIN', USER = 'USER' }

// ✅ String literal union
type Role = 'ADMIN' | 'USER' | 'MODERATOR';

// ✅ If you need iteration, use const object
const ROLES = { ADMIN: 'ADMIN', USER: 'USER', MODERATOR: 'MODERATOR' } as const;
type Role = typeof ROLES[keyof typeof ROLES];
```

---

## Async Patterns

```typescript
// Always type Promise returns
async function getUser(id: string): Promise<UserResponse | null> {
  // ...
}

// Async error handling — use try/catch, not .catch() chains
async function handler(): Promise<void> {
  try {
    const user = await getUser(id);
    if (!user) throw new NotFoundException('User not found');
  } catch (err) {
    if (err instanceof NotFoundException) throw err;
    throw new InternalServerErrorException('Unexpected error');
  }
}
```

---

## Code Review: TypeScript Checklist

```
[ ] No `any` types — use `unknown` + narrowing
[ ] All DTOs validated (class-validator or Zod)
[ ] Response interfaces defined (not returning raw DB rows)
[ ] No type assertions (`as X`) without runtime check
[ ] Utility types used instead of duplicating interfaces
[ ] Async functions return Promise<T>, not Promise<any>
```
