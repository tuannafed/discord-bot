import { CryptoProvider } from './crypto-provider.interface.js';
import { BybitProvider } from './bybit.provider.js';
import { CoinMarketCapProvider } from './coinmarketcap.provider.js';
import { CoinMarketData, CoinListItem } from '../types/coin.js';
import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const PRICE_CACHE_TTL_MS = 15_000;     // 15s for prices
const MARKET_CACHE_TTL_MS = 60_000;    // 60s for full market data
const LIST_CACHE_TTL_MS = 3_600_000;   // 1h for coin list

export class CryptoDataProvider implements CryptoProvider {
  private readonly bybit: BybitProvider;
  private readonly cmc: CoinMarketCapProvider;

  private priceCache = new Map<string, CacheEntry<CoinMarketData>>();
  private marketCache = new Map<string, CacheEntry<CoinMarketData[]>>();
  private listCache: CacheEntry<CoinListItem[]> | null = null;

  constructor() {
    this.bybit = new BybitProvider();
    this.cmc = new CoinMarketCapProvider();
  }

  async getMarketData(symbols: string[]): Promise<CoinMarketData[]> {
    if (symbols.length === 0) return [];

    const cacheKey = [...symbols].sort().join(',');
    const cached = this.marketCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    // Step 1: Get full market data from CMC (market cap, rank, 24h change)
    let cmcData: CoinMarketData[] = [];
    try {
      cmcData = await this.cmc.getMarketData(symbols);
    } catch (err) {
      logger.warn('CMC getMarketData failed, using Bybit only', err);
    }

    // Step 2: Enrich prices from Bybit (more real-time)
    let bybitData: CoinMarketData[] = [];
    try {
      bybitData = await this.bybit.getMarketData(symbols);
    } catch (err) {
      logger.warn('Bybit getMarketData failed, using CMC prices', err);
    }

    const bybitMap = new Map(bybitData.map((d) => [d.symbol.toUpperCase(), d]));

    // Merge: CMC as base, override price from Bybit when available
    let result: CoinMarketData[];
    if (cmcData.length > 0) {
      result = cmcData.map((coin) => {
        const bybit = bybitMap.get(coin.symbol.toUpperCase());
        if (bybit) {
          return { ...coin, currentPrice: bybit.currentPrice };
        }
        return coin;
      });
    } else if (bybitData.length > 0) {
      // CMC fully failed — use Bybit only (no market cap data)
      result = bybitData;
    } else {
      throw new Error(`Failed to fetch market data for: ${symbols.join(', ')}`);
    }

    this.marketCache.set(cacheKey, { data: result, expiresAt: Date.now() + MARKET_CACHE_TTL_MS });
    return result;
  }

  async getTopCoins(limit: number): Promise<CoinMarketData[]> {
    const cacheKey = `top:${limit}`;
    const cached = this.marketCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const data = await this.cmc.getTopCoins(limit);
    this.marketCache.set(cacheKey, { data, expiresAt: Date.now() + MARKET_CACHE_TTL_MS });
    return data;
  }

  async getTopGainers(scanSize: number): Promise<CoinMarketData[]> {
    const cacheKey = `gainers:${scanSize}`;
    const cached = this.marketCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const data = await this.cmc.getTopGainers(scanSize);
    this.marketCache.set(cacheKey, { data, expiresAt: Date.now() + MARKET_CACHE_TTL_MS });
    return data;
  }

  async getCoinList(): Promise<CoinListItem[]> {
    if (this.listCache && this.listCache.expiresAt > Date.now()) {
      return this.listCache.data;
    }
    const data = await this.cmc.getCoinList();
    this.listCache = { data, expiresAt: Date.now() + LIST_CACHE_TTL_MS };
    return data;
  }

  /** Returns set of symbols available on Bybit (USDT pairs) */
  async getBybitSymbols(): Promise<Set<string>> {
    const symbols = await this.bybit.getAllSymbols();
    return new Set(symbols);
  }

  /** Invalidate all caches (e.g. after symbol resolution miss) */
  clearCache(): void {
    this.priceCache.clear();
    this.marketCache.clear();
    this.listCache = null;
  }
}
