export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  priceChangePercentage24h: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number | null;
  prevPrice?: number;       // price at start of timeframe (from kline)
  prevMarketCap?: number;   // mcap at start of timeframe (from kline, estimated)
}

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}
