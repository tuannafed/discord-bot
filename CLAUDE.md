# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Run with tsx watch (hot reload)
yarn build        # Compile TypeScript to dist/
yarn start        # Run compiled JS (production)
yarn register     # Register slash commands to Discord (run after adding/changing commands)
npx tsc --noEmit  # Type-check without emitting files
```

## Architecture

Single long-running Node.js process. All dependencies are wired in [src/app.ts](src/app.ts) and passed down via constructor injection — no global singletons outside of the command module initializers.

### Dependency flow

```
app.ts
  → Repositories (JsonDb wrappers over src/data/*.json)
  → CryptoDataProvider (aggregator: CMC base + Bybit price enrichment, with TTL in-memory cache)
  → Services (consume repositories + CryptoDataProvider)
  → Commands (initialized via init() calls in commands/index.ts)
  → Events (ready, interaction-create)
  → PollingService (cron jobs, needs discord.js Client to send messages)
```

### Data provider layer

- **`providers/crypto-provider.interface.ts`** — `CryptoProvider` interface (getMarketData, getTopCoins, getTopGainers, getCoinList)
- **`providers/coinmarketcap.provider.ts`** — Full implementation using CMC API. Primary source for market cap, rank, 24h change, coin listing.
- **`providers/bybit.provider.ts`** — Partial implementation using Bybit spot tickers. Only overrides `currentPrice` (no market cap data).
- **`providers/crypto-data.provider.ts`** — Aggregator: fetches from CMC as base, merges Bybit real-time prices. Has in-memory TTL cache (15s price, 60s market data, 1h coin list).

### Key design decisions

- **Storage**: Plain JSON files in `src/data/` via `JsonDb<T>` — reads full file on every operation, writes atomically.
- **coinId field**: Stored as `symbol.toLowerCase()` throughout (watchlist, alert, candidate). CMC uses symbol-based lookups, not internal IDs.
- **Command init pattern**: Each command file exports `init(service)` + `data` + `execute`. The `buildCommands()` in `commands/index.ts` calls all `init()` functions and returns a `Map<name, Command>`.
- **Polling jobs** (in `polling.service.ts`):
  - Every 5 min — alert check
  - Every 6 hours — candidate market data refresh
  - Daily 8am UTC — candidate discovery (top gainers scan)

### Adding a new slash command

1. Create `src/commands/<name>.ts` — export `data`, `execute`, and optionally `init()`
2. Import and wire it in `src/commands/index.ts` (`buildCommands` + `getCommandBuilders`)
3. Run `yarn register` to push the new command to Discord

## Environment variables

Copy `.env.example` to `.env`. Required: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `COINMARKETCAP_API_KEY`. Set `DISCORD_GUILD_ID` for instant guild-scoped registration during development (omit for global registration which takes ~1 hour). `BYBIT_API_KEY` is optional but enables real-time price enrichment.
