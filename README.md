# Discord Crypto Tracker Bot

Discord bot for tracking crypto coins by market cap and daily growth. Built with discord.js v14, TypeScript, and Node.js 20+.

## Features

- Real-time coin prices via **Bybit** + full market data via **CoinMarketCap**
- Per-guild watchlists
- Price and market cap alerts with cooldown
- Auto-discovery of top gainers with target market cap tracking
- Multi-timeframe price & cap change for individual coins (`/coin`) and movers (`/movers`)
- **Group trading** — call kèo, theo dõi ai đang theo kèo nào, tính P&L% realtime khi TP/CL

## Commands

### `/ping`
Health check.

---

### `/coin`
Price, market cap, rank, change over a chosen timeframe, and supply info for a coin.

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `symbol` | string | Yes | — | Coin symbol (e.g. `btc`, `eth`) |
| `timeframe` | choice | No | *(CMC 24h)* | `15 minutes` / `1 hour` / `4 hours` / `24 hours` |

**Examples:**
```
/coin symbol:btc
/coin symbol:eth timeframe:1 hour
```

**Output (with timeframe):**
```
Price    : $0.3970
Prev 1h  : $0.3800
Price 1h : ▲ +4.47%

MCap     : $176.8M
Prev 1h  : $169.2M
Cap  1h  : ▲ +4.47%

Rank     : #145
Circ.    : 450.0M
Total    : 500.0M
Max      : ∞
```

> **Note:** `15m / 1h / 4h` fetch kline data from Bybit (~2–5s). Default (no timeframe) uses CoinMarketCap 24h data.

---

### `/top`
Top coins ranked by market cap (Bybit-listed only).

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | `10` | Number of coins to show (1–25) |

**Example:** `/top limit:20`

---

### `/movers`
Top gainers and losers ranked by price or market cap change over a chosen timeframe.

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `metric` | choice | No | `price` | `price` or `market_cap` — what to rank by |
| `timeframe` | choice | No | `24h` | `15 minutes` / `1 hour` / `4 hours` / `24 hours` |
| `type` | choice | No | `both` | `gainers` / `losers` / `both` |
| `limit` | integer | No | `5` | Coins per category (1–10) |

**Examples:**
```
/movers
/movers metric:price timeframe:15 minutes type:gainers limit:10
/movers metric:cap timeframe:1 hour type:both limit:5
```

**Output (metric:price, timeframe:15m):**
```
#   SYM    PREV 15m   NOW        CHG
-------------------------------------------
 1. KAITO  $0.3800    $0.3970   ▲  +4.47%
 2. ARIA   $0.2550    $0.3022   ▲ +18.51%
```

> **Note:** `15m / 1h / 4h` fetch kline data per-symbol (~5–10s). `24h` uses cached data and is instant.

---

### `/scan`
Find Bybit-listed coins within a market cap range. Market cap from CoinMarketCap (scans top 500).

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `min_cap` | number | Yes | — | Minimum market cap in USD |
| `max_cap` | number | Yes | — | Maximum market cap in USD |
| `limit` | integer | No | `10` | Max results (1–25) |

**Example:** `/scan min_cap:70000000 max_cap:100000000`
→ Finds Bybit-listed coins with market cap between $70M and $100M.

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
View all watchlist coins with live prices, market cap, and 24h change.

---

### `/alert-add`
Create an alert that fires when price or market cap crosses a threshold. Alert is sent to the channel where the command is run.

| Param | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | Yes | Coin symbol |
| `metric` | choice | Yes | `price` or `market_cap` |
| `condition` | choice | Yes | `above` / `below` (fixed USD) or `change_up` / `change_down` (% from now) |
| `threshold` | number | Yes | USD value for `above`/`below` — OR percent (1–100) for `change_up`/`change_down` |

**Examples:**
```
/alert-add symbol:btc metric:price condition:above threshold:100000
/alert-add symbol:eth metric:price condition:change_up threshold:3
/alert-add symbol:sol metric:market_cap condition:change_down threshold:5
```

> **`change_up` / `change_down`:** Takes the current price/cap at the moment you run the command and sets the target at `±N%`. E.g. if ETH is $3000 and you set `change_up 3`, the alert fires when ETH reaches $3090.

---

### `/alert-list`
View all active alerts in the guild, with IDs for removal.

---

### `/alert-remove`
Remove an alert by ID.

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Alert ID (from `/alert-list`) |

**Example:** `/alert-remove id:abc123`

---

### `/candidate-list`
View coins being tracked for target market cap. Filter by status.

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `status` | choice | No | `tracking` | `tracking` / `hit_target` / `expired` |

**Example:** `/candidate-list status:tracking`

---

### `/candidate-remove`
Remove a candidate from tracking.

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Candidate ID (from `/candidate-list`) |

**Example:** `/candidate-remove id:abc123`

---

### `/unlock`
Token supply & unlock overview for a coin.

| Param | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | Yes | Coin symbol (e.g. `apt`, `arb`) |

**Example:** `/unlock symbol:apt`

**Output:**
```
Circulating : 793.88M   (37.8% of max)
Locked      : 406.30M   (19.3% of max)
Total issued: 1,200.18M (57.1% of max)
Max supply  : 2,100M
Not issued  : 899.82M   (42.8% of max)

Unlock progress (circ / max):
[████████░░░░░░░░░░░░] 37.8%
```

---

### `/call`
Tạo một kèo future mới cho cả nhóm theo dõi.

| Param | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | Yes | Coin symbol (e.g. `BTC`, `ETH`) |
| `direction` | choice | Yes | `long` hoặc `short` |
| `price` | number | Yes | Giá call kèo (USD) |

**Example:** `/call symbol:BTC direction:long price:70000`

---

### `/follow`
Vào lệnh theo một kèo đang active. Kèo được chọn từ dropdown autocomplete.

| Param | Type | Required | Description |
|---|---|---|---|
| `call_id` | string | Yes | Chọn kèo từ dropdown |
| `entry` | number | Yes | Giá entry của bạn (USD) |

**Example:** `/follow call_id:[chọn từ dropdown] entry:69500`

---

### `/positions`
Xem tất cả kèo đang active, danh sách thành viên đang theo, và P&L% realtime.

**Output:**
```
BTC 📈 LONG @ $70,000 · Now: $70,504
Alice   entry $69,500 → 🟡 +1.44%
Bob     entry $70,200 → ✅TP +0.43%
Charlie entry $71,000 → ❌CL -0.70%
```

---

### `/tp`
Take profit — đóng lệnh của bạn với kết quả dương. Giá đóng được fetch tự động từ Bybit.

| Param | Type | Required | Description |
|---|---|---|---|
| `call_id` | string | Yes | Chọn kèo từ dropdown |

---

### `/cl`
Cut loss — đóng lệnh của bạn với kết quả âm. Giá đóng được fetch tự động từ Bybit.

| Param | Type | Required | Description |
|---|---|---|---|
| `call_id` | string | Yes | Chọn kèo từ dropdown |

> **Lưu ý:** P&L% được tính theo `entry` của từng người. Long: `(close - entry) / entry`. Short: `(entry - close) / entry`. Kèo tự đóng khi tất cả thành viên đã TP/CL.

---

### `/help`
Show all available commands (ephemeral — only visible to you).

---

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

Edit `.env` with your keys. See [Environment Variables](#environment-variables) below.

### 4. Register slash commands

```bash
yarn register
```

Run once after setup, and again whenever you add or change commands.
With `DISCORD_GUILD_ID` set: instant registration to that guild.
Without it: global registration (~1 hour propagation).

### 5. Run

```bash
yarn dev                   # development (hot reload)
yarn build && yarn start   # production
```

---

## Deploying to Railway

1. Push code to GitHub
2. Create a new Railway project → deploy from GitHub repo
3. Add a **PostgreSQL** service → link `DATABASE_URL` to the bot service via Variable Reference
4. Set required environment variables (see below)
5. Deploy — bot auto-creates database tables on first start

---

## Automated Jobs

| Schedule | Job |
|---|---|
| Every 5 min | Check alerts and send Discord notifications |
| Every 6 hours | Refresh market data for tracked candidates |
| Daily 8am UTC | Scan top gainers and auto-add new candidates |

Set `CANDIDATE_ALERT_CHANNEL_ID` to enable candidate notifications.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DISCORD_TOKEN` | Yes | — | Bot token |
| `DISCORD_CLIENT_ID` | Yes | — | Application ID |
| `DISCORD_GUILD_ID` | No | — | Guild ID for instant dev command registration |
| `COINMARKETCAP_API_KEY` | Yes | — | CMC API key |
| `BYBIT_API_KEY` | No | — | Bybit API key for real-time prices |
| `DATABASE_URL` | No | — | PostgreSQL connection string (recommended for production) |
| `DATA_DIR` | No | `src/data/` | Override JSON storage path (e.g. Railway Volume `/data`) |
| `ALERT_COOLDOWN_MINUTES` | No | `60` | Minutes between repeated alert notifications |
| `CANDIDATE_ALERT_CHANNEL_ID` | No | — | Channel for candidate hit/discovery notifications |
| `CANDIDATE_TARGET_MARKET_CAP` | No | `1000000000` | Target market cap ($1B) for candidates |
| `CANDIDATE_TRACKING_DAYS` | No | `7` | Days to track a candidate before expiry |
| `CANDIDATE_MIN_CHANGE_24H` | No | `10` | Minimum 24h % change to qualify as a candidate |
| `CANDIDATE_SCAN_SIZE` | No | `100` | Number of top gainers to scan daily |

---

## Data Storage

Supports two storage backends:

- **PostgreSQL** (recommended for production) — set `DATABASE_URL`. Tables are auto-created on startup.
- **JSON files** (local dev) — data stored in `src/data/`. No setup needed.

---

## License

MIT
