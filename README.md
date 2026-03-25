# Discord Crypto Tracker Bot

Discord bot for tracking crypto coins by market cap and daily growth. Built with discord.js v14, TypeScript, and Node.js 20+.

## Features

- Real-time coin prices via **Bybit** + full market data via **CoinMarketCap**
- Per-guild watchlists
- Price and market cap alerts with cooldown
- Auto-discovery of top gainers with target market cap tracking

## Commands

### `/ping`
Health check.

---

### `/coin`
Price, market cap, and 24h change for a coin.

| Param | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | Yes | Coin symbol |

**Example:** `/coin symbol:btc`

---

### `/top`
Top coins ranked by market cap.

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | `10` | Number of coins to show (1–25) |

**Example:** `/top limit:20`

---

### `/movers`
Top gainers and losers by 24h price change.

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | choice | No | `both` | `gainers` / `losers` / `both` |
| `limit` | integer | No | `5` | Coins per category (1–10) |

**Example:** `/movers type:gainers limit:10`

---

### `/watch-add`
Add a coin to the guild watchlist.

| Param | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | Yes | Coin symbol |

**Example:** `/watch-add symbol:eth`

---

### `/watch-remove`
Remove a coin from the guild watchlist.

| Param | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | Yes | Coin symbol |

**Example:** `/watch-remove symbol:eth`

---

### `/watch-list`
View all watchlist coins with live prices.

---

### `/alert-add`
Create an alert that fires when price or market cap crosses a threshold.

| Param | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | Yes | Coin symbol |
| `metric` | choice | Yes | `price` or `market_cap` |
| `condition` | choice | Yes | `above` or `below` |
| `threshold` | number | Yes | Threshold value in USD |

**Example:** `/alert-add symbol:btc metric:price condition:above threshold:100000`

---

### `/alert-list`
View all active alerts in the guild.

---

### `/candidate-list`
View coins being tracked for target market cap.

---

### `/scan`
Find coins within a market cap range. Only shows coins listed on Bybit. Market cap data from CoinMarketCap (scans top 500).

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `min_cap` | number | Yes | — | Minimum market cap in USD |
| `max_cap` | number | Yes | — | Maximum market cap in USD |
| `limit` | integer | No | `10` | Max results to show (1–25) |

**Example:** `/scan min_cap:70000000 max_cap:100000000`
→ Finds Bybit-listed coins with market cap between $70M and $100M.

---

### `/candidate-remove`
Remove a candidate from tracking.

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Candidate ID (shown in `/candidate-list`) |

**Example:** `/candidate-remove id:abc123`

## Setup

### 1. Prerequisites

- Node.js 20+
- A Discord application with bot token — [Discord Developer Portal](https://discord.com/developers/applications)
- CoinMarketCap API key — [coinmarketcap.com/api](https://coinmarketcap.com/api/) (free tier works)
- Bybit API key (optional, enables real-time price enrichment)

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_GUILD_ID=your_guild_id          # optional: for instant dev registration
COINMARKETCAP_API_KEY=your_cmc_key
BYBIT_API_KEY=your_bybit_key            # optional
```

### 4. Register slash commands

```bash
yarn register
```

Run this once after setup, and again whenever you add or change commands.
With `DISCORD_GUILD_ID` set: instant registration to that guild.
Without it: global registration (~1 hour propagation).

### 5. Run

```bash
yarn dev      # development (hot reload)
yarn build && yarn start   # production
```

## Automated Jobs

| Schedule | Job |
|---|---|
| Every 5 min | Check alerts and send Discord notifications |
| Every 6 hours | Refresh market data for tracked candidates |
| Daily 8am UTC | Scan top gainers and auto-add new candidates |

Set `CANDIDATE_ALERT_CHANNEL_ID` in `.env` to enable candidate notifications.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DISCORD_TOKEN` | Yes | — | Bot token |
| `DISCORD_CLIENT_ID` | Yes | — | Application ID |
| `DISCORD_GUILD_ID` | No | — | Guild ID for dev command registration |
| `COINMARKETCAP_API_KEY` | Yes | — | CMC API key |
| `BYBIT_API_KEY` | No | — | Bybit API key for real-time prices |
| `ALERT_COOLDOWN_MINUTES` | No | `60` | Minutes between repeated alert notifications |
| `CANDIDATE_ALERT_CHANNEL_ID` | No | — | Channel for candidate hit/discovery notifications |
| `CANDIDATE_TARGET_MARKET_CAP` | No | `1000000000` | Target market cap ($1B) for candidates |
| `CANDIDATE_TRACKING_DAYS` | No | `7` | Days to track a candidate before expiry |
| `CANDIDATE_MIN_CHANGE_24H` | No | `10` | Minimum 24h % change to qualify as a candidate |
| `CANDIDATE_SCAN_SIZE` | No | `100` | Number of top gainers to scan daily |

## Data Storage

All data is stored locally in `src/data/` as JSON files — no database required.

## License

MIT
