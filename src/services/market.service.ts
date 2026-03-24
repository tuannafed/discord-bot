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
    return this.provider.getTopCoins(limit);
  }

  async getTopGainers(limit: number): Promise<CoinMarketData[]> {
    const gainers = await this.provider.getTopGainers(limit * 4);
    return gainers
      .filter((c) => c.priceChangePercentage24h > 0)
      .sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
      .slice(0, limit);
  }

  async getTopLosers(limit: number): Promise<CoinMarketData[]> {
    const coins = await this.provider.getTopCoins(limit * 4);
    return coins
      .filter((c) => c.priceChangePercentage24h < 0)
      .sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h)
      .slice(0, limit);
  }
}
