import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { CoinMarketData } from '../types/coin.js';
import { resolveSymbolToId } from '../utils/symbol-resolver.js';

export class MarketService {
  constructor(private readonly provider: CryptoDataProvider) {}

  async getCoinBySymbol(symbol: string): Promise<CoinMarketData | null> {
    const id = await resolveSymbolToId(symbol, this.provider);
    if (!id) return null;

    // CMC uses symbol for lookup — use the original symbol directly
    const results = await this.provider.getMarketData([symbol]);
    return results[0] ?? null;
  }

  async getCoinBySymbols(symbols: string[]): Promise<CoinMarketData[]> {
    if (symbols.length === 0) return [];
    return this.provider.getMarketData(symbols);
  }

  async getTopCoins(limit: number): Promise<CoinMarketData[]> {
    const coins = await this.provider.getBybitFuturesWithMarketCap();
    return coins
      .filter((c) => c.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, limit);
  }

  async getTopGainers(limit: number, interval?: string): Promise<CoinMarketData[]> {
    const coins = interval
      ? await this.provider.getBybitFuturesWithKlineChange(interval)
      : await this.provider.getBybitFuturesWithMarketCap();
    return coins
      .filter((c) => c.priceChangePercentage24h > 0)
      .sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
      .slice(0, limit);
  }

  async getTopLosers(limit: number, interval?: string): Promise<CoinMarketData[]> {
    const coins = interval
      ? await this.provider.getBybitFuturesWithKlineChange(interval)
      : await this.provider.getBybitFuturesWithMarketCap();
    return coins
      .filter((c) => c.priceChangePercentage24h < 0)
      .sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h)
      .slice(0, limit);
  }

  async getCoinKlineChange(
    symbol: string,
    interval: string,
  ): Promise<{ pct: number; prev: number; current: number } | null> {
    return this.provider.getCoinKlineChange(symbol, interval);
  }

  async scanByMarketCap(minCap: number, maxCap: number, limit: number): Promise<CoinMarketData[]> {
    const coins = await this.provider.getBybitFuturesWithMarketCap();
    return coins
      .filter((c) => c.marketCap >= minCap && c.marketCap <= maxCap)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, limit);
  }
}
