import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { CoinMarketData } from '../types/coin.js';
import { LinearFundingSnapshot } from '../types/funding.js';
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

  async getTopGainers(limit: number, interval?: string, minCap?: number, maxCap?: number): Promise<CoinMarketData[]> {
    const coins = interval
      ? await this.provider.getBybitFuturesWithKlineChange(interval)
      : await this.provider.getBybitFuturesWithMarketCap();
    return coins
      .filter((c) => c.priceChangePercentage24h > 0)
      .filter((c) => minCap == null || c.marketCap >= minCap)
      .filter((c) => maxCap == null || c.marketCap <= maxCap)
      .sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
      .slice(0, limit);
  }

  async getTopLosers(limit: number, interval?: string, minCap?: number, maxCap?: number): Promise<CoinMarketData[]> {
    const coins = interval
      ? await this.provider.getBybitFuturesWithKlineChange(interval)
      : await this.provider.getBybitFuturesWithMarketCap();
    return coins
      .filter((c) => c.priceChangePercentage24h < 0)
      .filter((c) => minCap == null || c.marketCap >= minCap)
      .filter((c) => maxCap == null || c.marketCap <= maxCap)
      .sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h)
      .slice(0, limit);
  }

  async getCoinKlineChange(
    symbol: string,
    interval: string,
  ): Promise<{ pct: number; prev: number; current: number } | null> {
    return this.provider.getCoinKlineChange(symbol, interval);
  }

  async getLivePrices(symbols: string[]): Promise<Map<string, number>> {
    if (symbols.length === 0) return new Map();
    const bybitPrices = await this.provider.getLivePrices(symbols);

    // Fallback to CMC for symbols not found on Bybit spot
    const missing = symbols.filter((s) => !bybitPrices.has(s.toUpperCase()));
    if (missing.length > 0) {
      const cmcData = await this.provider.getMarketData(missing).catch(() => []);
      for (const coin of cmcData) {
        if (coin.currentPrice > 0) {
          bybitPrices.set(coin.symbol.toUpperCase(), coin.currentPrice);
        }
      }
    }

    return bybitPrices;
  }

  async scanByMarketCap(minCap: number, maxCap: number, limit: number): Promise<CoinMarketData[]> {
    const coins = await this.provider.getBybitFuturesWithMarketCap();
    return coins
      .filter((c) => c.marketCap >= minCap && c.marketCap <= maxCap)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, limit);
  }

  /** Bybit USDT perp funding snapshot (symbol missing from linear → null) */
  async getLinearFunding(symbol: string): Promise<LinearFundingSnapshot | null> {
    return this.provider.getLinearFunding(symbol);
  }
}
