---
description: Extract reusable patterns from the current session and save to .claude/conductor/knowledge.md
---

# /learn — Extract Session Patterns

Analyze the current session for reusable patterns, fixes, or insights worth saving to the project knowledge base.

## When to Run

After solving a non-trivial problem — a tricky debugging session, an architectural decision, a workaround, or any insight that would save time next time.

## What to Look For

1. **Error patterns** — what broke, root cause, what fixed it
2. **Debugging techniques** — non-obvious steps or tool combinations that worked
3. **Workarounds** — library quirks, API limitations, version-specific fixes
4. **Architectural decisions** — conventions discovered, integration patterns, tradeoffs made

## Process

1. Review the current session for the most valuable insight
2. Draft a pattern entry using the format below
3. **Confirm with user before writing anything to disk**
4. Append to `.claude/conductor/knowledge.md` under a `## Learned` section:
   ```
   ## Learned — <YYYY-MM-DD>: <Pattern Name>
   ...
   ```
   Or save as a standalone note: `.claude/conductor/notes/<date>-<slug>.md`

## Output Format

```markdown
## Learned — <date>: <Pattern Name>

**Context:** <one line — when does this pattern apply?>

### Problem
<specific problem this solves>

### Solution
<the technique, fix, or pattern — be concrete>

### Example
<code snippet or command if applicable>
```

## Rules

- Don't extract trivial fixes (typos, obvious syntax errors, one-off API outages)
- One pattern per entry — keep it focused
- Confirm with user before writing to disk
- If the pattern is project-specific, save to `.claude/conductor/knowledge.md`
- If it's general (a language/framework trick), still save locally — the user can promote it later

## Arguments

$ARGUMENTS (optional): hint about what to focus on (e.g., "the auth bug fix", "the DB migration pattern")
