# Build Discord Coin Tracker Bot MVP

You are a senior TypeScript backend engineer.

Build a production-clean MVP Discord bot project with the following requirements.

## Goal

Create a Discord bot that helps track crypto coins by market cap and daily growth.

This is **Step 1 MVP**, so keep it lean, simple, and deployable.

The bot must support:

1. Query a coin by symbol
2. Show top coins by market cap
3. Maintain a watchlist
4. Add simple alerts
5. Support candidate tracking for coins that were strong recently but may hit target market cap later
6. Be deployable on Railway
7. Use local JSON storage for MVP
8. Use CoinGecko as data source
9. Use slash commands with discord.js

---

## Tech Stack

- Node.js 20+
- TypeScript
- discord.js
- axios
- dotenv
- node-cron
- zod
- lowdb or simple JSON file storage
- tsx for local dev
- tsc for build

---

## Project Constraints

- Keep architecture clean, modular, and easy to extend later
- Do NOT over-engineer
- No PostgreSQL
- No Redis
- No dashboard
- No auth system
- No Docker required for MVP
- Must run as a single long-running Node process
- Must be easy to deploy to Railway

---

## Functional Requirements

### 1. Slash commands

Implement these slash commands:

- `/ping`
- `/coin symbol:<string>`
- `/top limit:<number>`
- `/watch-add symbol:<string>`
- `/watch-remove symbol:<string>`
- `/watch-list`
- `/alert-add symbol:<string> metric:<market_cap|price> condition:<above|below> threshold:<number>`
- `/alert-list`
- `/candidate-list`

You may also add:

- `/candidate-remove symbol:<string>`

### 2. Coin lookup

For `/coin`:

- Resolve symbol into CoinGecko coin id
- Fetch current market data
- Return:
  - coin name
  - symbol
  - current price
  - market cap
  - market cap rank
  - 24h percentage change

### 3. Top coins

For `/top`:

- Fetch top coins by market cap
- default limit = 10
- support limit validation with sane max like 25

### 4. Watchlist

Store watchlist by Discord guild id.

Each watch item should include:

- guildId
- symbol
- coinId
- createdBy
- createdAt

### 5. Alerts

Store alert rules by guild id.

Each alert rule should include:

- id
- guildId
- channelId
- symbol
- coinId
- metric
- condition
- threshold
- lastTriggeredAt
- isActive
- createdBy
- createdAt

Add a polling job using node-cron:

- run every 5 minutes
- load alerts
- batch fetch relevant coins
- trigger message when rule matches
- apply cooldown to avoid spam

Use env config for cooldown minutes.

### 6. Candidate tracking

This is important.

Problem:
Some coins appear in daily top gainers but do not hit the target market cap immediately.
The next day they may no longer be in top gainers, but they still need to be tracked.

Implement a simple MVP candidate tracking system.

Create a daily discovery job:

- once per day
- fetch a list of coins that have strong recent growth
- for MVP, you may approximate this using CoinGecko market data sorted by market cap and filter by 24h change percentage descending if needed
- add candidate coins if:
  - market cap is below configured target cap
  - 24h change is positive and strong enough
  - not already tracked
- keep them in tracking for N days

Create a periodic candidate update job:

- every 6 hours
- load tracked candidates
- refresh current market cap and price
- if current market cap reaches target market cap:
  - mark candidate as hit_target
  - optionally send message to a configured channel
- if expired:
  - mark as expired

Candidate record fields:

- id
- guildId
- channelId
- symbol
- coinId
- name
- discoveredAt
- discoveredSource
- discoveredMarketCap
- discoveredPrice
- discoveredChange24h
- currentMarketCap
- currentPrice
- targetMarketCap
- trackingExpiresAt
- status: tracking | hit_target | expired
- lastCheckedAt

For MVP:

- use env variables for:
  - candidate target market cap
  - tracking window days
  - minimum 24h change threshold
  - candidate scan size

### 7. Storage

Use local JSON files under `src/data/` or `data/`.

Need repositories or storage services for:

- watchlists
- alerts
- candidates

Storage should be simple but abstracted enough to swap later.

---

## Architecture Requirements

Use a clean modular structure like this:

```text
src/
  app.ts
  config/
    env.ts
  commands/
    ping.ts
    coin.ts
    top.ts
    watch-add.ts
    watch-remove.ts
    watch-list.ts
    alert-add.ts
    alert-list.ts
    candidate-list.ts
    index.ts
  events/
    ready.ts
    interaction-create.ts
  services/
    coingecko.service.ts
    market.service.ts
    watchlist.service.ts
    alert.service.ts
    candidate.service.ts
    polling.service.ts
  repositories/
    json-db.ts
    watchlist.repository.ts
    alert.repository.ts
    candidate.repository.ts
  types/
    coin.ts
    watchlist.ts
    alert.ts
    candidate.ts
  utils/
    logger.ts
    format.ts
    time.ts
    symbol-resolver.ts
    ids.ts
  data/
    watchlists.json
    alerts.json
    candidates.json
scripts/
  register-commands.ts
```
