# Product: discord-coin-tracker-bot

## Overview

A Discord bot that tracks cryptocurrency coins by market cap and daily growth. It monitors price movements, sends configurable alerts, maintains per-guild watchlists, and automatically discovers candidate coins that may be approaching target market caps.

## Target Users

- **Primary:** Crypto traders and investors using Discord communities
- **Secondary:** Discord server admins who want to provide crypto tracking tools to their community

## Core Problems Solved

1. Fragmented crypto monitoring — users need to check multiple tools; the bot brings real-time alerts and tracking into Discord where they already communicate
2. Opportunity discovery — the candidate system automatically surfaces coins that are gaining momentum (top gainers) and tracks them toward target market-cap milestones

## Key Features (MVP)

- [x] Watchlist — add/remove/list coins per guild (`/watch-add`, `/watch-remove`, `/watch-list`)
- [x] Price alerts — trigger on price, market cap, or 24h change thresholds (`/alert-add`, `/alert-remove`, `/alert-list`)
- [x] Market data — top coins, top movers, market scan, coin detail (`/top`, `/movers`, `/scan`, `/coin`)
- [x] Candidate tracking — auto-discover top gainers daily, track toward target market cap (`/candidate-list`, `/candidate-remove`)
- [x] Polling — periodic alert checks (5 min), market data refresh (6 h), daily candidate discovery (8 am UTC)

## Out of Scope (v1)

- Portfolio tracking with cost basis / P&L
- Web dashboard or admin UI
- Multi-chain / DEX data (only CeFi via CMC + Bybit)

## Success Metrics

- Alert delivery latency < 5 min from threshold crossing
- Candidate discovery runs reliably daily with no missed cron jobs

## External Dependencies / Integrations

- **Discord.js v14** — slash commands, guild-scoped interactions, message delivery
- **CoinMarketCap API** — primary source for market cap, rank, 24h change, coin listing
- **Bybit API** (optional) — real-time price enrichment via spot tickers
- **PostgreSQL** (optional) — persistent storage via `pg`; falls back to JSON files (`lowdb`) if `DATABASE_URL` is not set
- **node-cron** — scheduled polling jobs
