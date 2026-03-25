# Skill: Security Baseline

**Used by:** Backend agents (when implementing endpoints), Code Reviewer (when auditing).

---

## Input Validation (Every Endpoint)

```
✅ Validate all user-controlled inputs at the boundary
✅ Whitelist allowed fields — reject unknown fields
✅ Type-check and range-check all values
✅ Sanitize strings before storage (strip HTML unless rich text)
✅ Validate file uploads: extension, MIME type, max size
```

**Never trust:**
- Request body fields
- Query parameters
- Path parameters
- HTTP headers (User-Agent, Referer, X-Forwarded-For)
- Uploaded file names

---

## Authentication & Authorization

```
✅ All non-public routes require valid JWT
✅ JWT secret minimum 256 bits, stored in env (not code)
✅ JWT expiry: access token 15min, refresh token 7days
✅ Verify resource ownership: user can only access own data
✅ Role-based checks before sensitive operations
✅ Refresh token rotation on every use
```

**Checklist per endpoint:**
1. Is this route public or protected?
2. What role is required?
3. Does the user own the resource they're accessing?

---

## SQL Injection Prevention

```
✅ ALWAYS use parameterized queries / ORM methods
✅ NEVER concatenate user input into SQL strings
✅ Use prepared statements for raw queries
```

```typescript
// ❌ NEVER
`SELECT * FROM users WHERE email = '${email}'`

// ✅ ALWAYS
db.query('SELECT * FROM users WHERE email = $1', [email])
// or ORM: User.findOne({ where: { email } })
```

---

## XSS Prevention

```
✅ Escape all user-provided content before rendering in HTML
✅ Use framework's built-in escaping (React, Angular auto-escape JSX)
✅ Set Content-Security-Policy header
✅ Never use dangerouslySetInnerHTML / innerHTML with user data
✅ Sanitize rich text with a whitelist library (DOMPurify)
```

---

## Secrets Management

```
✅ No hardcoded secrets (API keys, passwords, tokens) in source code
✅ All secrets via environment variables
✅ .env files in .gitignore
✅ Validate required env vars at startup
✅ Rotate any accidentally committed secret immediately
```

**Env var validation at startup (example):**
```typescript
const required = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}
```

---

## Headers

Always set these response headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

---

## Rate Limiting

```
✅ Auth endpoints: 5 requests/minute per IP
✅ API endpoints: 100 requests/minute per user
✅ Return 429 with Retry-After header when exceeded
```

---

## OWASP Top 10 Quick Check (for Code Review)

| # | Risk | Check |
|---|------|-------|
| A01 | Broken Access Control | Resource ownership verified? |
| A02 | Cryptographic Failures | Sensitive data encrypted at rest? |
| A03 | Injection | Parameterized queries used? |
| A04 | Insecure Design | Business logic tested for abuse cases? |
| A05 | Security Misconfiguration | Default credentials changed? Debug off in prod? |
| A06 | Vulnerable Components | Dependencies up to date? |
| A07 | Auth Failures | JWT expiry set? Token rotation? |
| A08 | Data Integrity | File uploads validated? |
| A09 | Logging Failures | Errors logged (without sensitive data)? |
| A10 | SSRF | External URLs validated before fetch? |
