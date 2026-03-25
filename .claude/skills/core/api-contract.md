# Skill: API Contract Design

**Used by:** BA Agent (when writing API Contract section), Backend agents (when implementing endpoints), Frontend agent (when consuming APIs).

---

## REST Conventions

### URL Structure
```
GET    /resources              # list (paginated)
GET    /resources/:id          # single item
POST   /resources              # create
PATCH  /resources/:id          # partial update
PUT    /resources/:id          # full replace (rare)
DELETE /resources/:id          # delete

# Nested resources (max 2 levels deep)
GET    /resources/:id/children
POST   /resources/:id/children
```

### Naming Rules
- Plural nouns: `/users`, `/orders`, `/products`
- Kebab-case for multi-word: `/order-items`, `/user-profiles`
- No verbs in URLs — use HTTP method instead
- Version prefix: `/api/v1/...`

---

## Standard Response Envelope

### Success
```json
{
  "success": true,
  "data": { ... }          // single item
}

{
  "success": true,
  "data": [ ... ],         // list
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasNext": true
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [           // optional field-level errors
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

---

## HTTP Status Codes

| Status | When to use |
|--------|------------|
| 200 OK | Successful GET, PATCH, DELETE |
| 201 Created | Successful POST (include `Location` header) |
| 204 No Content | DELETE with no body |
| 400 Bad Request | Validation error, malformed body |
| 401 Unauthorized | Missing or invalid auth token |
| 403 Forbidden | Valid token, insufficient permissions |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | Duplicate resource (unique constraint) |
| 422 Unprocessable | Business logic violation (not validation) |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Unexpected server error |

---

## Error Code Conventions

Use `SCREAMING_SNAKE_CASE` domain-specific codes:
```
VALIDATION_ERROR         # Input failed validation
NOT_FOUND                # Resource doesn't exist
ALREADY_EXISTS           # Unique constraint violated
UNAUTHORIZED             # Auth required
FORBIDDEN                # Insufficient permissions
RATE_LIMIT_EXCEEDED      # Too many requests
INTERNAL_ERROR           # Catch-all for 500s
```

---

## API Contract Template (for BA Output)

```markdown
### POST /api/v1/{resource}

**Auth:** Required (Bearer token)
**Permissions:** {role}

**Request Body:**
| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| name      | string | Yes      | Max 100 chars |
| email     | string | Yes      | Valid email format |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "createdAt": "ISO-8601"
  }
}
```

**Errors:**
- 400 `VALIDATION_ERROR` — missing/invalid fields
- 409 `ALREADY_EXISTS` — email already registered
```

---

## Headers

Always include:
```
Content-Type: application/json
Authorization: Bearer <token>        # on protected routes
X-Request-ID: <uuid>                 # for tracing (optional)
```

Pagination via query params:
```
GET /api/v1/users?page=1&limit=20&sort=createdAt&order=desc
```
