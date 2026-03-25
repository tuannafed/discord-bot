# Skill: Git Workflow

**Used by:** All agents when committing changes.

---

## Commit Message Format

```
<type>(<scope>): <short description>

[optional body: explain WHY, not WHAT]

[optional footer: track reference]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither adds feature nor fixes bug |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Build process, dependency updates, config |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Examples

```bash
feat(auth): add JWT refresh token rotation

Tokens are now rotated on every refresh to prevent replay attacks.
Old refresh tokens are immediately invalidated.

track-003

---

fix(users): resolve N+1 query on user list endpoint

Added eager loading for `orders` relation.
Reduces queries from N+1 to 2.

---

test(auth): add integration tests for token expiry edge cases

---

chore: update TypeScript to 5.4.0
```

### Rules
- Subject line max 72 characters
- Use imperative mood: "add", "fix", "update" (not "added", "fixed")
- No period at the end of subject
- Explain WHY in body, not WHAT (the diff shows what)

---

## Branch Naming

```
feature/<slug>        # new feature
fix/<slug>            # bug fix
refactor/<slug>       # refactoring
test/<slug>           # adding tests only
docs/<slug>           # docs only
chore/<slug>          # tooling, deps

# Examples:
feature/user-authentication
fix/order-total-calculation
refactor/payment-service-split
```

---

## Track-Based Commit Flow

For each track, commits should be granular and traceable:

```bash
# DB phase
git commit -m "feat(db): add users and sessions tables (track-NNN)"

# Backend phase
git commit -m "feat(auth): implement login/logout endpoints (track-NNN)"
git commit -m "test(auth): add integration tests for auth endpoints (track-NNN)"

# Frontend phase
git commit -m "feat(ui): add login form with validation (track-NNN)"

# Checkpoint commits (via /checkpoint command)
git commit -m "checkpoint: backend-done (track-NNN)"
```

---

## PR Format

```markdown
## Summary
- What this PR does (1-3 bullets)
- Why it's needed

## Track
track-NNN — [track title]

## Changes
- feat: [description]
- fix: [description]

## Test Plan
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual test: [specific scenario]

## Screenshots (if UI changes)
```

---

## Pre-Commit Checklist

Before committing:
```
[ ] No console.log / debug statements
[ ] No hardcoded secrets or API keys
[ ] Tests pass locally
[ ] No TODO comments left unresolved
[ ] Staged only the files relevant to this commit
```
