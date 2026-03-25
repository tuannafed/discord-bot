# Tech Stack: discord-coin-tracker-bot

## Decided Stack

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| Runtime | Node.js | >=20 | LTS, native ESM, good Discord.js support |
| Language | TypeScript | ^5.3 | Type safety across services, repositories, providers |
| Bot framework | discord.js | ^14.14 | Official Discord API library; slash command support |
| Market data | CoinMarketCap API | v1 | Primary source for market cap, rank, 24h change |
| Price enrichment | Bybit REST API | v5 | Optional real-time price overlay on CMC data |
| Storage (primary) | JSON files via lowdb | ^7.0 | Zero-infra default; reads/writes `src/data/*.json` |
| Storage (optional) | PostgreSQL via pg | ^8.20 | Persistent storage when `DATABASE_URL` is set |
| Validation | zod | ^3.22 | Schema validation for env vars and external API responses |
| Scheduling | node-cron | ^3.0 | Polling jobs: alert check (5 min), data refresh (6 h), discovery (daily 8 am UTC) |
| HTTP client | axios | ^1.6 | CMC and Bybit API calls |
| Dev runner | tsx watch | ^4.7 | Hot-reload TypeScript during development |
| Build | tsc | ^5.3 | Compile to `dist/` for production |
| Package manager | yarn | — | Lockfile: yarn.lock |

## Architecture Decisions (ADRs)

### ADR-001: Dual storage — JSON files with optional PostgreSQL upgrade
- **Date:** project init
- **Decision:** Default storage is plain JSON files (`lowdb`); opt-in to PostgreSQL via `DATABASE_URL` env var, which activates `Pg*Repository` classes
- **Rationale:** Lowers barrier to entry (no DB setup required); allows cloud deployment with a real DB when needed
- **Consequences:** Two repository implementations for each entity (JSON + PG); must keep them in sync

### ADR-002: CoinMarketCap as base + Bybit price overlay
- **Date:** project init
- **Decision:** `CryptoDataProvider` fetches from CMC, then merges Bybit spot prices for real-time accuracy
- **Rationale:** CMC provides richer market data (rank, market cap, 24h change); Bybit provides fresher prices
- **Consequences:** If Bybit key is missing, prices fall back to CMC values — still functional but less real-time

### ADR-003: coinId stored as symbol.toLowerCase()
- **Date:** project init
- **Decision:** All entities store `coinId` as `symbol.toLowerCase()` (e.g. `"btc"`)
- **Rationale:** CMC uses symbol-based lookups; internal IDs are not stable across API versions
- **Consequences:** Symbol collisions theoretically possible but rare for tracked coins

## Coding Conventions

- **Language:** TypeScript / strict mode (`tsconfig.json`)
- **Formatter:** none configured (format manually or add Prettier)
- **Linter:** none configured (add ESLint if needed)
- **Test framework:** none yet (add Jest or Vitest)
- **Package manager:** yarn (v1 classic)
- **Module system:** ESM (`.js` imports with `import ... from '...'` — TypeScript compiles `.ts` → `.js`)
- **Naming:** camelCase for variables/functions, PascalCase for classes/types, kebab-case for filenames

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | Yes |
| `DISCORD_CLIENT_ID` | Discord application client ID | Yes |
| `DISCORD_GUILD_ID` | Guild ID for dev (instant registration) | No |
| `COINMARKETCAP_API_KEY` | CMC API key | Yes |
| `BYBIT_API_KEY` | Bybit API key (real-time price enrichment) | No |
| `DATABASE_URL` | PostgreSQL connection string (activates PG repos) | No |
| `DATA_DIR` | Override path for JSON data files | No |
| `ALERT_COOLDOWN_MINUTES` | Minutes between repeat alert triggers (default: 60) | No |
| `CANDIDATE_TARGET_MARKET_CAP` | Target market cap for candidates (default: 1B) | No |
| `CANDIDATE_TRACKING_DAYS` | How many days to track a candidate (default: 7) | No |
| `CANDIDATE_MIN_CHANGE_24H` | Min 24h % change to qualify as candidate (default: 10) | No |
| `CANDIDATE_SCAN_SIZE` | Number of top gainers to scan (default: 100) | No |
| `CANDIDATE_ALERT_CHANNEL_ID` | Channel for candidate discovery announcements | No |

## Folder Structure

```
src/
├── app.ts                    # Entry point — wires all dependencies
├── config/                   # Env parsing (zod schema)
├── commands/                 # Slash command handlers (data + execute + init)
├── events/                   # Discord event handlers (ready, interaction-create)
├── providers/                # External data providers (CMC, Bybit, aggregator)
├── services/                 # Business logic (market, watchlist, alert, candidate, polling)
├── repositories/             # Data access (JsonDb + Pg variants per entity)
├── db/                       # PostgreSQL client + migration runner
├── types/                    # Shared TypeScript types (coin, watchlist, alert, candidate)
└── utils/                    # Utilities (logger, format, time, ids, symbol-resolver)
```
