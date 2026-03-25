import axios, { AxiosInstance } from 'axios';
import { CryptoProvider } from './crypto-provider.interface.js';
import { CoinMarketData, CoinListItem } from '../types/coin.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface CmcQuote {
  price: number;
  market_cap: number;
  percent_change_24h: number;
  volume_24h: number;
}

interface CmcCoinData {
  id: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  quote: { USD: CmcQuote };
}

interface CmcQuotesResponse {
  data: Record<string, CmcCoinData>;
}

interface CmcListingsResponse {
  data: CmcCoinData[];
}

interface CmcMapItem {
  id: number;
  name: string;
  symbol: string;
  slug: string;
}

interface CmcMapResponse {
  data: CmcMapItem[];
}

export class CoinMarketCapProvider implements CryptoProvider {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://pro-api.coinmarketcap.com/v1',
      timeout: 10_000,
      headers: {
        Accept: 'application/json',
        'X-CMC_PRO_API_KEY': env.COINMARKETCAP_API_KEY ?? '',
      },
    });
  }

  async getMarketData(symbols: string[]): Promise<CoinMarketData[]> {
    if (symbols.length === 0) return [];

    try {
      const response = await this.client.get<CmcQuotesResponse>(
        '/cryptocurrency/quotes/latest',
        { params: { symbol: symbols.map((s) => s.toUpperCase()).join(','), convert: 'USD' } }
      );

      return Object.values(response.data.data).map((coin) => ({
        id: coin.symbol.toLowerCase(),
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        currentPrice: coin.quote.USD.price,
        marketCap: coin.quote.USD.market_cap,
        marketCapRank: coin.cmc_rank,
        priceChangePercentage24h: coin.quote.USD.percent_change_24h,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        maxSupply: coin.max_supply,
      }));
    } catch (error) {
      logger.error('CoinMarketCap getMarketData failed', error);
      throw new Error('Failed to fetch market data from CoinMarketCap');
    }
  }

  async getTopCoins(limit: number): Promise<CoinMarketData[]> {
    try {
      const response = await this.client.get<CmcListingsResponse>(
        '/cryptocurrency/listings/latest',
        { params: { limit, convert: 'USD', sort: 'market_cap' } }
      );

      return response.data.data.map((coin) => ({
        id: coin.symbol.toLowerCase(),
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        currentPrice: coin.quote.USD.price,
        marketCap: coin.quote.USD.market_cap,
        marketCapRank: coin.cmc_rank,
        priceChangePercentage24h: coin.quote.USD.percent_change_24h,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        maxSupply: coin.max_supply,
      }));
    } catch (error) {
      logger.error('CoinMarketCap getTopCoins failed', error);
      throw new Error('Failed to fetch top coins from CoinMarketCap');
    }
  }

  async getTopGainers(scanSize: number): Promise<CoinMarketData[]> {
    try {
      const response = await this.client.get<CmcListingsResponse>(
        '/cryptocurrency/listings/latest',
        { params: { limit: scanSize, convert: 'USD', sort: 'percent_change_24h', sort_dir: 'desc' } }
      );

      return response.data.data.map((coin) => ({
        id: coin.symbol.toLowerCase(),
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        currentPrice: coin.quote.USD.price,
        marketCap: coin.quote.USD.market_cap,
        marketCapRank: coin.cmc_rank,
        priceChangePercentage24h: coin.quote.USD.percent_change_24h,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        maxSupply: coin.max_supply,
      }));
    } catch (error) {
      logger.error('CoinMarketCap getTopGainers failed', error);
      throw new Error('Failed to fetch top gainers from CoinMarketCap');
    }
  }

  async getCoinList(): Promise<CoinListItem[]> {
    try {
      const response = await this.client.get<CmcMapResponse>('/cryptocurrency/map', {
        params: { limit: 5000, sort: 'cmc_rank' },
      });

      return response.data.data.map((coin) => ({
        id: coin.symbol.toLowerCase(),
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
      }));
    } catch (error) {
      logger.error('CoinMarketCap getCoinList failed', error);
      throw new Error('Failed to fetch coin list from CoinMarketCap');
    }
  }
}
