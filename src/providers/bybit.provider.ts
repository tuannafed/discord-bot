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

  /** Returns all USDT spot symbols available on Bybit */
  async getAllSymbols(): Promise<string[]> {
    try {
      const response = await this.client.get<BybitTickersResponse>('/v5/market/tickers', {
        params: { category: 'spot' },
      });

      if (response.data.retCode !== 0) {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }

      return response.data.result.list
        .filter((t) => t.symbol.endsWith('USDT'))
        .map((t) => t.symbol.slice(0, -4).toUpperCase());
    } catch (error) {
      logger.error('Bybit getAllSymbols failed', error);
      throw new Error('Failed to fetch symbol list from Bybit');
    }
  }

  /** Bybit doesn't support coin listing — not applicable */
  async getCoinList(): Promise<CoinListItem[]> {
    throw new Error('getCoinList not supported by Bybit provider');
  }
}
