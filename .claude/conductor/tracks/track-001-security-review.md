# Track: track-001-security-review

## Status
done

## Current Phase
backend

## Next Step
All High-severity fixes applied and verified (tsc --noEmit clean)

---

## Metadata

| Field | Value |
|-------|-------|
| Type | chore |
| Title | Security Review & Code Audit |
| Created | 2026-03-25 |
| Updated | 2026-03-25 |

---

## ⚙️ Backend Output

### Fixes Applied

All 4 High-severity issues resolved. `tsc --noEmit` passes with 0 errors.

| Issue | File(s) | Fix |
|-------|---------|-----|
| Missing `await` in alert-remove | `src/commands/alert-remove.ts:27` | Added `await` before `alertService.removeAlert()` |
| Cross-guild candidate deletion (command) | `src/commands/candidate-remove.ts` | Added `guildId` guard + passed `guildId` to service + made reply ephemeral |
| Cross-guild candidate deletion (service) | `src/services/candidate.service.ts:32` | Added `guildId` param; fetch-and-verify ownership before `repo.remove()` |
| Hardcoded `rejectUnauthorized: false` | `src/db/pg-client.ts:10`, `src/config/env.ts` | Added `DATABASE_SSL_REJECT_UNAUTHORIZED` env var (coerce boolean, default `true`) |
| No graceful shutdown | `src/app.ts`, `src/services/polling.service.ts`, `src/db/pg-client.ts` | Added `SIGTERM`/`SIGINT` handlers; `PollingService.stop()` stops cron tasks; `closePool()` drains PG pool |

---

## 📋 BA Output — Chore/Refactor Spec

### Objective

Perform a comprehensive security review and code quality audit of the entire `discord-coin-tracker-bot` codebase. No new features or behavior changes — output is a prioritized findings report and, where safe, direct fixes to critical/high issues.

### Scope

**All source files** in `src/`:

| Area | Files |
|------|-------|
| Config & env | `src/config/env.ts` |
| Providers | `src/providers/*.ts` |
| Services | `src/services/*.ts` |
| Repositories | `src/repositories/*.ts` (JSON + PG variants) |
| DB layer | `src/db/pg-client.ts` |
| Commands | `src/commands/*.ts` |
| Events | `src/events/*.ts` |
| Utils | `src/utils/*.ts` |
| Types | `src/types/*.ts` |
| Entry point | `src/app.ts` |

### Review Goals

1. **Security** — identify injection risks, secret leakage, input validation gaps, error leakage, auth gaps
2. **Code quality** — identify complexity, dead code, duplication, naming issues, convention violations
3. **Performance** — identify N+1 patterns, blocking ops, memory leaks, missing pagination
4. **Dependency safety** — check `package.json` for known-vulnerable or unnecessary deps
5. **Deployment safety** — assess migration safety, rollback risk, observability gaps

### Out of Scope

- No new features
- No refactoring beyond fixing critical/high security issues
- No test writing (note gaps but don't implement)

### Acceptance Criteria

- All Critical and High security issues identified and addressed or explicitly deferred with justification
- Report written to `## 🔍 Code Review` section of this track file
- `### Review Status` set to `approved` or `changes-requested`

---

## 🔍 Code Review

### Convention Resolution
- Archetype reviewed: `custom` (Node.js Discord bot, no frontend framework)
- Folder contract checked: `commands/`, `services/`, `repositories/`, `providers/`, `utils/`, `events/`, `types/`
- Forbidden patterns checked: global singletons, mutations, direct HTTP in commands
- Required patterns reviewed: constructor injection, command `data + execute + init()` pattern

---

### Needs Attention (9 issues)

#### High Severity

1. **[Security] `candidate-remove` has no guild isolation** — `src/commands/candidate-remove.ts:17-26`
   Any user in any server can delete any candidate by ID. Unlike `alert-remove`, no `guildId` check is performed. Combined with `CandidateService.removeCandidate` also lacking guild scoping, cross-guild deletion is possible.

2. **[Security] `CandidateService.removeCandidate` does not verify guild ownership** — `src/services/candidate.service.ts:32-34`
   Method signature is `removeCandidate(id)` with no `guildId` parameter. Fix: add `guildId` parameter and verify ownership before deletion.

3. **[Security/Bug] Missing `await` in `alert-remove.ts`** — `src/commands/alert-remove.ts:27`
   `alertService.removeAlert(id, guildId)` is not awaited. `removed` is always a truthy `Promise` object, so the command always replies "Alert removed" regardless of whether the alert exists or was actually deleted.

4. **[Security] SSL certificate verification disabled** — `src/db/pg-client.ts:10`
   `ssl: { rejectUnauthorized: false }` is hardcoded. Makes the DB connection vulnerable to MITM attacks. Gate behind an env var defaulting to `true`.

5. **[Deployment] No graceful shutdown handlers** — `src/app.ts` (absence)
   No `SIGTERM`/`SIGINT` handlers. On Railway deploys, the process is killed with active DB connections and in-flight cron jobs. PG pool connections leak; cron callbacks may fire against a half-torn-down state.

#### Medium Severity

6. **[Security] No per-guild limit on alerts or watchlist items** — `src/services/alert.service.ts:32`, `src/services/watchlist.service.ts:19`
   A user can create unlimited alerts, causing the 5-min polling job to make unbounded API calls. Enforce a cap (e.g., 50 alerts / 100 watchlist items per guild).

7. **[Security] API keys potentially logged in full Axios error objects** — `src/providers/coinmarketcap.provider.ts:80,104,130,147`
   `logger.error()` receives the full Axios error, which includes request headers containing `X-CMC_PRO_API_KEY`. Extract only `error.message`, `error.response?.status`, `error.response?.data` before logging.

8. **[Deployment] Inline migration with no versioning or rollback** — `src/db/pg-client.ts:16-63`
   `CREATE TABLE IF NOT EXISTS` DDL runs at every startup. Future schema changes (add column, add index) are invisible to this system. There is no migration version table and no rollback path. Adopt a versioned migration tool.

9. **[Security] `'global'` hardcoded as guildId for candidate discovery** — `src/services/polling.service.ts:138`
   Auto-discovered candidates are stored with `guildId = 'global'`, breaking the per-guild isolation model. Document whether this is intentional, or associate discoveries with a configured guild.

---

### Suggestions (12 items)

1. **[Quality] Extract `mapCmcCoin()` private method** (HIGH impact, LOW effort)
   The CmcCoinData→CoinMarketData mapping is copy-pasted 3× in `coinmarketcap.provider.ts:67-78, 92-103, 117-128`. Extract to a private method.

2. **[Quality] Extract `requireGuildId(interaction)` guard** (MED impact, LOW effort)
   7 command files contain identical guild-ID null check boilerplate. Extract to a shared utility.

3. **[Quality] Remove dead code** (LOW impact, LOW effort)
   - `src/providers/crypto-data.provider.ts:20` — `priceCache` field never written/read
   - `src/utils/format.ts:26` — `formatChangeEmoji` never imported
   - `src/services/coingecko.service.ts` — entire file is a deprecation comment, delete it
   - `src/repositories/json-db.ts` — `get()` method never used, remove it

4. **[Quality] Move repository interfaces out of service files** (MED impact, MED effort)
   `IAlertRepository`, `ICandidateRepository`, `IWatchlistRepository` are defined in service files. Move to `src/types/` or `src/repositories/`. Add `implements` clauses to Pg repositories for compile-time contract enforcement.

5. **[Quality] Global singletons violate project convention** (MED impact, MED effort)
   `src/utils/symbol-resolver.ts:3` and `src/db/pg-client.ts:4` use module-level mutable state. Move symbol cache into `CryptoDataProvider`; pass PG pool via constructor injection from `app.ts`.

6. **[Performance] Cache stampede on TTL expiry** (MED impact, MED effort)
   `crypto-data.provider.ts` — concurrent callers all trigger independent fetches on cache miss. Store the in-flight promise to coalesce requests.

7. **[Performance] N+1 kline fetches in `/movers`** (HIGH impact, HIGH effort)
   `bybit.provider.ts:117-155` fires ~300 sequential HTTP requests for non-24h timeframes. Consider a background pre-fetch job or reduce the symbol set to top-N by volume.

8. **[Performance] Synchronous file I/O blocks event loop** (MED impact, MED effort)
   `json-db.ts:28-31` uses `readFileSync`/`writeFileSync`. Switch to `fs.promises` async variants.

9. **[Quality] `buildPriceLines` and `buildCapLines` are near-identical** (LOW impact, LOW effort)
   `movers.ts:60-82` — parameterize into a single `buildLines(config)` function.

10. **[Quality] Redundant `bybitSet` when `bybitMap` already exists** (LOW impact, LOW effort)
    `crypto-data.provider.ts:125-126` — `Map.has()` replaces `Set.has()`. Remove `bybitSet`.

11. **[Tooling] No ESLint/Prettier configured** (MED impact, LOW effort)
    TypeScript strict mode passes cleanly (0 errors), but `noUnusedLocals`/`noUnusedParameters` are not enabled in `tsconfig.json`. Enable them; add ESLint for broader quality enforcement.

12. **[Tests] Zero test coverage** (HIGH impact, HIGH effort)
    No test runner, no test files. Highest-ROI tests to write first:
    1. `AlertService.removeAlert` — guild isolation (pure logic, trivial to mock)
    2. `PollingService.runAlertCheck` — trigger evaluation + cooldown boundary
    3. `CandidateService.runUpdateJob` — tracking→hit_target→expired transitions

---

### All Clear
- **Linter**: TypeScript strict mode — 0 errors. Only 1 unused variable (`PRICE_CACHE_TTL_MS` in `crypto-data.provider.ts:12`)
- **SQL Injection**: No issues — all Pg repositories use parameterized queries consistently
- **Hardcoded secrets**: None — all secrets loaded from env via dotenv + zod
- **Simplification**: Code is generally well-structured and appropriately simple for a Discord bot

---

### Verdict: Ready to Merge

All High-severity issues have been fixed and verified clean (`tsc --noEmit`). Remaining items (Medium/Suggestions) are deferred and do not block production use.

---

### Review Status
approved
