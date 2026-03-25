# Skill: Testing Strategy

**Used by:** Backend agents (NestJS/FastAPI), Frontend agent (Next.js), Code Reviewer.

---

## Test Pyramid

```
        /\
       /  \   E2E Tests (few, slow, critical user flows)
      /----\
     /      \  Integration Tests (API + DB, medium)
    /--------\
   /          \ Unit Tests (many, fast, pure functions)
  /____________\
```

- **Unit**: Test functions/methods in isolation (mock dependencies)
- **Integration**: Test API endpoints end-to-end with real DB (test database)
- **E2E**: Test critical user flows in browser (Playwright)

**Coverage target: 80% minimum**

---

## Unit Test Structure (AAA Pattern)

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should return created user when valid input provided', async () => {
      // Arrange
      const input = { email: 'test@example.com', name: 'Test' };
      mockRepo.save.mockResolvedValue({ id: 'uuid-1', ...input });

      // Act
      const result = await service.createUser(input);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.email).toBe(input.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue({ id: 'existing' });

      // Act & Assert
      await expect(service.createUser({ email: 'exists@example.com' }))
        .rejects.toThrow(ConflictException);
    });
  });
});
```

---

## What to Test Per Layer

### Service / Business Logic (Unit)
```
✅ Happy path returns expected output
✅ Each error condition throws the right exception
✅ Edge cases: empty inputs, boundary values, nulls
✅ External dependencies are mocked (DB, cache, external APIs)
```

### API Endpoints (Integration)
```
✅ Returns correct HTTP status code
✅ Response body matches the API contract shape
✅ Auth required: 401 when no token
✅ Auth required: 403 when wrong role
✅ 400/422 for invalid inputs
✅ 404 for non-existent resources
✅ Actual DB state changed after write operations
```

### Frontend Components (Unit)
```
✅ Renders without crashing with required props
✅ User interactions trigger expected behavior
✅ Loading/error/empty states rendered correctly
✅ Form validation shows correct error messages
```

---

## Test Naming Convention

```
✓ should [do something] when [condition]
✓ should return [value] when [condition]
✓ should throw [error] when [condition]

Examples:
✓ should return user when valid id provided
✓ should throw NotFoundException when user not found
✓ should return 401 when request has no token
```

---

## NestJS Integration Test Example

```typescript
describe('POST /api/v1/users', () => {
  it('should create user and return 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@example.com', name: 'New User' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();

    // Verify DB state
    const user = await userRepo.findOne({ where: { email: 'new@example.com' } });
    expect(user).not.toBeNull();
  });

  it('should return 409 when email already exists', async () => {
    await userRepo.save({ email: 'exists@example.com', name: 'Existing' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'exists@example.com', name: 'Duplicate' })
      .expect(409);

    expect(res.body.error.code).toBe('ALREADY_EXISTS');
  });
});
```

---

## FastAPI Test Example

```python
def test_create_user_returns_201(client, auth_headers, db_session):
    # Arrange
    payload = {"email": "new@example.com", "name": "New User"}

    # Act
    response = client.post("/api/v1/users", json=payload, headers=auth_headers)

    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] is not None

    # Verify DB state
    user = db_session.query(User).filter_by(email="new@example.com").first()
    assert user is not None


def test_create_user_returns_409_when_email_exists(client, auth_headers, existing_user):
    payload = {"email": existing_user.email, "name": "Duplicate"}
    response = client.post("/api/v1/users", json=payload, headers=auth_headers)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ALREADY_EXISTS"
```

---

## Mocking Guidelines

```
✅ Mock external services (email, payment, third-party APIs)
✅ Mock the DB in unit tests; use real test DB in integration tests
✅ Use factories for test data (not hardcoded fixtures)
✅ Reset mocks between tests (beforeEach)
❌ Don't mock what you're testing
❌ Don't mock internal implementation details
```

---

## Code Review: Testing Checklist

```
[ ] Happy path covered
[ ] Error paths covered (each thrown exception has a test)
[ ] Auth/permission tests present on protected endpoints
[ ] Edge cases: empty list, null values, boundary inputs
[ ] No test depends on execution order
[ ] Tests clean up after themselves (no data leakage between tests)
[ ] Test names describe behavior, not implementation
```
