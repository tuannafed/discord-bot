---
description: Create or verify named checkpoints tied to git history within a track
---

# /checkpoint — Workflow Checkpoint

Create a named checkpoint in the current track, or verify progress against one.

## Usage

`/checkpoint [create|verify|list] [name]`

---

## Create

`/checkpoint create <name>`

1. Create a git commit tagged as a checkpoint:
   ```bash
   git add -A && git commit -m "checkpoint: <name>"
   ```
2. Record in `.claude/conductor/checkpoints.log`:
   ```
   <ISO-date> | <name> | <git-short-sha> | <current-track>
   ```
3. Report:
   ```
   ✅ Checkpoint created: <name>
      SHA:   <short-sha>
      Track: <current-track-id>
   ```

---

## Verify

`/checkpoint verify <name>`

Compare current state to a previous checkpoint:

1. Read the SHA from `.claude/conductor/checkpoints.log`
2. Run `git diff <sha>..HEAD --stat`
3. Run tests and note pass/fail
4. Report:
   ```
   CHECKPOINT COMPARISON: <name>
   ═══════════════════════════════════
   Files changed : X
   Insertions    : +Y
   Deletions     : -Z
   Tests         : PASS / FAIL
   Build         : PASS / FAIL
   ```

---

## List

`/checkpoint list`

Read `.claude/conductor/checkpoints.log` and display as a table:

```
Name              SHA      Date        Track
──────────────────────────────────────────────
feature-start     a1b2c3d  2025-01-15  track-001
ba-done           d4e5f6g  2025-01-15  track-001
backend-done      h7i8j9k  2025-01-16  track-001
```

---

## Typical Workflow

```
Track created   → /checkpoint create "track-start"
BA phase done   → /checkpoint create "ba-done"
Backend done    → /checkpoint create "backend-done"
Ready for PR    → /checkpoint verify "track-start"
```

---

## Arguments

$ARGUMENTS:
- `create <name>` — Create named checkpoint (git commit + log entry)
- `verify <name>` — Compare current state to checkpoint
- `list`          — Show all checkpoints in `.claude/conductor/checkpoints.log`
