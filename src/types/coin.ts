export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  priceChangePercentage24h: number;
}

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}
