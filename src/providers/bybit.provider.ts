import axios, { AxiosInstance } from 'axios';
import { CryptoProvider } from './crypto-provider.interface.js';
import { CoinMarketData, CoinListItem } from '../types/coin.js';
import { logger } from '../utils/logger.js';

interface BybitTicker {
  symbol: string;       // e.g. BTCUSDT
  lastPrice: string;
  volume24h: string;
  price24hPcnt: string; // e.g. "0.0123" = 1.23%
}

interface BybitTickersResponse {
  retCode: number;
  retMsg: string;
  result: {
    list: BybitTicker[];
  };
}

export class BybitProvider implements Pick<CryptoProvider, 'getMarketData'> {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.bybit.com',
      timeout: 10_000,
      headers: { Accept: 'application/json' },
    });
  }

  /** Returns price data for given symbols. market_cap and rank will be 0 (Bybit doesn't provide them). */
  async getMarketData(symbols: string[]): Promise<CoinMarketData[]> {
    if (symbols.length === 0) return [];

    try {
      const response = await this.client.get<BybitTickersResponse>('/v5/market/tickers', {
        params: { category: 'spot' },
      });

      if (response.data.retCode !== 0) {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }

      const tickers = response.data.result.list;
      const tickerMap = new Map<string, BybitTicker>();
      for (const t of tickers) {
        // Map "BTCUSDT" -> "BTC"
        if (t.symbol.endsWith('USDT')) {
          tickerMap.set(t.symbol.slice(0, -4).toUpperCase(), t);
        }
      }

      return symbols
        .map((sym) => {
          const ticker = tickerMap.get(sym.toUpperCase());
          if (!ticker) return null;
          return {
            id: sym.toLowerCase(),
            symbol: sym.toLowerCase(),
            name: sym.toUpperCase(),
            currentPrice: parseFloat(ticker.lastPrice),
            marketCap: 0,
            marketCapRank: 0,
            priceChangePercentage24h: parseFloat(ticker.price24hPcnt) * 100,
          } satisfies CoinMarketData;
        })
        .filter((item): item is CoinMarketData => item !== null);
    } catch (error) {
      logger.error('Bybit getMarketData failed', error);
      throw new Error('Failed to fetch price data from Bybit');
    }
  }

  /** Returns all USDT perpetual futures tickers from Bybit (linear category) */
  async getAllFuturesTickers(): Promise<CoinMarketData[]> {
    try {
      const response = await this.client.get<BybitTickersResponse>('/v5/market/tickers', {
        params: { category: 'linear' },
      });

      if (response.data.retCode !== 0) {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }

      return response.data.result.list
        .filter((t) => t.symbol.endsWith('USDT'))
        .map((t) => {
          const symbol = t.symbol.slice(0, -4).toUpperCase();
          return {
            id: symbol.toLowerCase(),
            symbol: symbol.toLowerCase(),
            name: symbol,
            currentPrice: parseFloat(t.lastPrice),
            marketCap: 0,
            marketCapRank: 0,
            priceChangePercentage24h: parseFloat(t.price24hPcnt) * 100,
          } satisfies CoinMarketData;
        });
    } catch (error) {
      logger.error('Bybit getAllFuturesTickers failed', error);
      throw new Error('Failed to fetch futures tickers from Bybit');
    }
  }

  /** Fetch futures (linear) prices for specific symbols. Returns Map<SYMBOL, price> */
  async getFuturesPrices(symbols: string[]): Promise<Map<string, number>> {
    if (symbols.length === 0) return new Map();
    try {
      const response = await this.client.get<BybitTickersResponse>('/v5/market/tickers', {
        params: { category: 'linear' },
      });
      if (response.data.retCode !== 0) {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
      const upper = new Set(symbols.map((s) => s.toUpperCase()));
      const result = new Map<string, number>();
      for (const t of response.data.result.list) {
        if (!t.symbol.endsWith('USDT')) continue;
        const sym = t.symbol.slice(0, -4).toUpperCase();
        if (upper.has(sym)) {
          result.set(sym, parseFloat(t.lastPrice));
        }
      }
      return result;
    } catch (error) {
      logger.error('Bybit getFuturesPrices failed', error);
      return new Map();
    }
  }

  /** Returns all USDT perpetual futures symbols available on Bybit (linear category) */
  async getAllSymbols(): Promise<string[]> {
    const tickers = await this.getAllFuturesTickers();
    return tickers.map((t) => t.symbol.toUpperCase());
  }

  /**
   * For each USDT perpetual symbol, fetch the last 2 kline candles at the given interval
   * and return % change = (currentClose - prevClose) / prevClose * 100.
   * interval: '15' = 15m, '60' = 1h, '240' = 4h, 'D' = 1d
   */
  async getAllFuturesKlineChange(interval: string): Promise<Map<string, { pct: number; prev: number; current: number }>> {
    const tickers = await this.getAllFuturesTickers();
    const result = new Map<string, { pct: number; prev: number; current: number }>();

    const BATCH = 20;
    for (let i = 0; i < tickers.length; i += BATCH) {
      const batch = tickers.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (ticker) => {
          try {
            const symbol = ticker.symbol.toUpperCase() + 'USDT';
            const resp = await this.client.get<{
              retCode: number;
              result: { list: string[][] };
            }>('/v5/market/kline', {
              params: { category: 'linear', symbol, interval, limit: 2 },
            });
            const list = resp.data.result?.list;
            // list[0] = latest candle, list[1] = previous candle
            // each candle: [openTime, open, high, low, close, volume, turnover]
            if (list && list.length === 2) {
              const current = parseFloat(list[0][4]);
              const prev = parseFloat(list[1][4]);
              if (prev > 0) {
                result.set(ticker.symbol.toLowerCase(), {
                  pct: ((current - prev) / prev) * 100,
                  prev,
                  current,
                });
              }
            }
          } catch {
            // skip failed symbols silently
          }
        })
      );
    }
    return result;
  }

  /**
   * Fetch kline change for a single symbol.
   * Returns { pct, prev, current } or null if unavailable.
   */
  async getKlineChange(
    symbol: string,
    interval: string,
  ): Promise<{ pct: number; prev: number; current: number } | null> {
    try {
      const bybitSymbol = symbol.toUpperCase() + 'USDT';
      const resp = await this.client.get<{
        retCode: number;
        result: { list: string[][] };
      }>('/v5/market/kline', {
        params: { category: 'linear', symbol: bybitSymbol, interval, limit: 2 },
      });
      const list = resp.data.result?.list;
      if (list && list.length === 2) {
        const current = parseFloat(list[0][4]);
        const prev = parseFloat(list[1][4]);
        if (prev > 0) {
          return { pct: ((current - prev) / prev) * 100, prev, current };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Bybit doesn't support coin listing — not applicable */
  async getCoinList(): Promise<CoinListItem[]> {
    throw new Error('getCoinList not supported by Bybit provider');
  }
}
