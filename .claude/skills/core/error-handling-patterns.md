# Skill: Error Handling Patterns

**Used by:** Backend NestJS, Backend FastAPI, Integrator, Code Reviewer.

---

## Error Hierarchy

Define a clear error taxonomy per domain:

```typescript
// NestJS — throw framework exceptions
import { NotFoundException, ConflictException, BadRequestException,
         ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

// When to throw what:
throw new NotFoundException('User not found');            // 404
throw new ConflictException('Email already registered'); // 409
throw new BadRequestException('Invalid input');          // 400
throw new ForbiddenException('Access denied');           // 403
throw new UnprocessableEntityException('Cannot cancel a shipped order'); // 422
```

```python
# FastAPI
from fastapi import HTTPException, status

raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cannot cancel shipped order")
```

---

## Consistent Error Envelope

Every error response must follow this shape (from api-contract.md):

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "details": [{ "field": "id", "message": "No user with this ID" }]
  }
}
```

**Error codes** (SCREAMING_SNAKE_CASE):
```
VALIDATION_ERROR   → 400 (input failed schema validation)
UNAUTHORIZED       → 401 (no/invalid token)
FORBIDDEN          → 403 (valid token, wrong role/ownership)
NOT_FOUND          → 404 (resource doesn't exist)
ALREADY_EXISTS     → 409 (unique constraint violated)
UNPROCESSABLE      → 422 (valid input, business rule violated)
RATE_LIMIT_EXCEEDED → 429
INTERNAL_ERROR     → 500 (catch-all)
```

---

## NestJS Global Exception Filter

```typescript
// src/common/filters/all-exceptions.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

const STATUS_TO_CODE: Record<number, string> = {
  400: 'VALIDATION_ERROR', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN',
  404: 'NOT_FOUND', 409: 'ALREADY_EXISTS', 422: 'UNPROCESSABLE',
  429: 'RATE_LIMIT_EXCEEDED',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message = typeof res === 'string' ? res : (res as any).message;

      response.status(status).json({
        success: false,
        error: {
          code: STATUS_TO_CODE[status] ?? 'ERROR',
          message: Array.isArray(message) ? message[0] : message,
          details: Array.isArray(message)
            ? message.map((m: string) => ({ message: m }))
            : undefined,
        },
      });
    } else {
      // Log unexpected errors (never expose details to client)
      console.error('[Unhandled Error]', exception);
      response.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }
  }
}
```

---

## Frontend Error Handling

```typescript
// lib/api/client.ts — axios interceptor
import axios from 'axios';
import type { ErrorResponse } from '@/types/api';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to extract error message from API response
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data as ErrorResponse;
    return data.error?.message ?? 'An unexpected error occurred';
  }
  return 'Network error — please check your connection';
}
```

---

## React Query Error Handling

```typescript
// Centralized error handling via onError callback
const createUser = useMutation({
  mutationFn: api.users.create,
  onError: (error) => {
    const message = getErrorMessage(error);
    toast.error(message); // or show inline error
  },
});

// Component level — handle specific error codes
const { data, error } = useUser(id);

if (error) {
  const apiError = (error as AxiosError<ErrorResponse>).response?.data?.error;
  if (apiError?.code === 'NOT_FOUND') return <NotFound />;
  return <ErrorMessage message={apiError?.message ?? 'Failed to load user'} />;
}
```

---

## Error Logging

```typescript
// NestJS — log unexpected errors only (not HttpExceptions)
// HttpExceptions are expected application behavior, not bugs

// ✅ Log this (unexpected)
console.error('[Unhandled Error]', exception);

// ❌ Don't log this (expected, controlled)
throw new NotFoundException('User not found');

// Python equivalent
import logging
logger = logging.getLogger(__name__)

# ✅ Log unexpected errors
except Exception as e:
    logger.exception("Unexpected error in create_user: %s", str(e))
    raise HTTPException(status_code=500, detail="Internal server error")

# ❌ Don't log HTTPException (expected)
raise HTTPException(status_code=404, detail="User not found")
```

---

## Validation Error Format

```typescript
// NestJS — class-validator produces array of messages
// Global ValidationPipe transforms them to our envelope format:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email must be an email",
    "details": [
      { "field": "email", "message": "email must be an email" },
      { "field": "name", "message": "name must be longer than 2 characters" }
    ]
  }
}
```

---

## Code Review: Error Handling Checklist

```
[ ] All endpoints have consistent error envelope (success: false, error.code, error.message)
[ ] No raw exception messages exposed to clients in production
[ ] Unexpected errors logged server-side (not just client-visible)
[ ] 4xx errors (expected) NOT logged as errors — only 5xx
[ ] Frontend handles 401 globally (token expiry redirect)
[ ] Field-level validation errors include details array
[ ] Business rule violations use 422, not 400
```
