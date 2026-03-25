# Knowledge Base — discord-bot

> Accumulated insights, pitfalls, and lessons from this project's tracks.
> Agents append here after each track. Reference track IDs for context.

---

## 💡 Core Insights

> High-value discoveries that save significant time or prevent major mistakes.

<!-- Example:
- Always define API contract before parallel execution — prevents integration mismatches (track-001)
- Confidence check ROI: 100 tokens spent → up to 50,000 tokens saved by avoiding wrong direction
-->

---

## 🐘 PostgreSQL

<!-- Example:
- Use `gen_random_uuid()` not `uuid_generate_v4()` — no extension required (track-001)
- JSONB indexes: use GIN, not B-tree for `@>` operator queries (track-003)
- `timestamptz` stored in UTC, displayed in session timezone — always use timestamptz (track-002)
-->

## 🟢 NestJS

<!-- Example:
- `class-transformer` must be enabled in main.ts: `app.useGlobalPipes(new ValidationPipe({ transform: true }))` (track-001)
- Circular dependency between modules: use `forwardRef(() => ModuleB)` in both (track-004)
- TypeORM `findOne` returns null (not undefined) — check `=== null` (track-002)
-->

## 🐍 FastAPI

<!-- Example:
- `AsyncSession` must be committed explicitly: `await session.commit()` before returning (track-001)
- Pydantic v2: use `model_config = ConfigDict(from_attributes=True)` instead of `class Config` (track-002)
-->

## ⚛️ Next.js / React

<!-- Example:
- Server Components cannot use `useState`/`useEffect` — mark interactive parts `'use client'` (track-001)
- `fetch()` in Server Components is automatically deduped — safe to call in multiple components (track-003)
- React Query `invalidateQueries` needs exact key match — use key factory pattern (track-002)
-->

## 🤖 AI / LLM

<!-- Example:
- temperature 0 for structured outputs, 0.7 for creative tasks (track-005)
- Streaming: use SSE, not WebSocket, for one-shot generations (track-005)
- Prompt caching: system prompts >1024 tokens qualify — prefix with `cache_control` (track-006)
-->

## 🧩 Chrome Extension (MV3)

<!-- Example:
- Service workers terminate after 30s idle — use `chrome.alarms` for long-running tasks (track-007)
- `chrome.storage.sync` has 8KB per-item limit — use `chrome.storage.local` for large data (track-007)
-->

---

## ⚠️ Pitfalls & Solutions

> Mistakes made + how they were fixed. Prevents repeating the same errors.

<!-- Format:
### Pitfall: <title>
**Problem**: What went wrong
**Solution**: What fixed it
**Prevention**: How to avoid it next time (track-NNN)
-->

---

## 🔧 Troubleshooting

> Specific errors with confirmed fixes.

<!-- Example:
### Error: `ECONNREFUSED 5432` on Docker startup
**Cause**: Postgres container not ready when app starts
**Fix**: Add `depends_on: db` + `healthcheck` in docker-compose.yml (track-002)
-->

---

## 🎓 Lessons Learned

> Bigger picture reflections after completing tracks.

<!-- Example:
- Lesson: Integration tests caught 3 bugs that unit tests missed — invest more in integration layer (track-005)
- Lesson: Frontend-first development caused 2 backend reworks — always finalize API contract first (track-003)
-->

---

## How to Update

When an agent discovers something worth saving:

```markdown
- [Lesson] (track-NNN)
```

For pitfalls/troubleshooting, use the structured format above.
Reference the track number so the original context can be found.
