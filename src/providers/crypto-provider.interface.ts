import { CoinMarketData, CoinListItem } from '../types/coin.js';

export interface CryptoProvider {
  /** Fetch market data for a batch of symbols (uppercase, e.g. BTC, ETH) */
  getMarketData(symbols: string[]): Promise<CoinMarketData[]>;

  /** Fetch top N coins by market cap */
  getTopCoins(limit: number): Promise<CoinMarketData[]>;

  /** Fetch top gainers by 24h change from the top N coins */
  getTopGainers(scanSize: number): Promise<CoinMarketData[]>;

  /** Get full coin listing for symbol resolution */
  getCoinList(): Promise<CoinListItem[]>;
}
