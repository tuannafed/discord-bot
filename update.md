You are a Senior Backend Engineer specializing in API integrations and system refactoring.

## Objective

Refactor the existing crypto data service to replace CoinGecko with a more reliable free provider.

## Current State

- The system currently uses CoinGecko API for:
  - Price fetching
  - Market data
- It suffers from:
  - Rate limits
  - Unstable free access
  - Requires paid API key for production

## Target Architecture

Replace CoinGecko with:

PRIMARY SOURCE:

- Bybit API (REST + WebSocket if applicable)
  - Use for real-time price data

SECONDARY SOURCE (fallback):

- CoinMarketCap API (free tier)
  - Use for metadata (market cap, ranking, symbol info)

## Requirements

1. Abstract Data Provider Layer

- Introduce a provider interface:

````ts
interface CryptoProvider {
  getPrice(symbol: string): Promise<number>;
  getMarketData(symbol: string): Promise<MarketData>;
}

Implement Providers
BybitProvider
Endpoint: https://api.bybit.com/v5/market/tickers
Map symbol format (e.g., BTCUSDT)
Extract lastPrice
CoinMarketCapProvider
Endpoint: https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest
Use API key from ENV: COINMARKETCAP_API_KEY
Map symbol → id if needed
Fallback Logic
Try Bybit first
If failed → fallback to CoinMarketCap
Add retry + timeout handling
Caching Layer
Add Redis caching:
Key: price:{symbol}
TTL: 10–30 seconds
Error Handling
Gracefully handle:
API failure
Rate limits
Invalid symbol
Environment Variables
COINMARKETCAP_API_KEY=xxx
BYBIT_API_KEY=optional
Remove CoinGecko
Remove all CoinGecko dependencies
Clean unused code
Deliverables
Updated service files
Provider implementations
Refactored API calls
Clear separation of concerns
Ready for production usage
Constraints
Must be framework-agnostic (or align with existing NestJS if detected)
Keep code clean, typed, and scalable
Do not break existing endpoints
Bonus (if applicable)
Add WebSocket support for Bybit (real-time streaming)
Add metrics logging for API latency and failures

---

# ⚡ Version ngắn (dùng nhanh trong Cursor)

```txt
Refactor crypto service:
- Replace CoinGecko with Bybit (primary) + CoinMarketCap (fallback)
- Add provider interface
- Implement Redis cache (TTL 10–30s)
- Remove CoinGecko completely
- Keep API unchanged
````
