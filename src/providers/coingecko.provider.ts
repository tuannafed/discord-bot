import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface GlobalMarketSnapshot {
  total: number;       // TOTAL — tổng mcap toàn thị trường
  btcMcap: number;     // BTC market cap
  ethMcap: number;     // ETH market cap
  btcDominance: number; // BTC.D %
  ethDominance: number; // ETH.D %
}

export interface MarketMetrics {
  total: number;
  total2: number;       // TOTAL - BTC
  total3: number;       // TOTAL - BTC - ETH
  others: number;       // TOTAL - top10 (approx: TOTAL - BTC - ETH for free tier)
  othersDominance: number; // OTHERS / TOTAL * 100
  btcDominance: number;
}

export class CoinGeckoProvider {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 15_000,
      headers: {
        Accept: 'application/json',
        ...(env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': env.COINGECKO_API_KEY } : {}),
      },
    });
  }

  /** Fetch current global market snapshot */
  async getGlobalSnapshot(): Promise<GlobalMarketSnapshot> {
    const res = await this.client.get<{
      data: {
        total_market_cap: Record<string, number>;
        market_cap_percentage: Record<string, number>;
      };
    }>('/global');

    const d = res.data.data;
    const total = d.total_market_cap['usd'] ?? 0;
    const btcDominance = d.market_cap_percentage['btc'] ?? 0;
    const ethDominance = d.market_cap_percentage['eth'] ?? 0;
    const btcMcap = total * (btcDominance / 100);
    const ethMcap = total * (ethDominance / 100);

    return { total, btcMcap, ethMcap, btcDominance, ethDominance };
  }

  /**
   * Fetch historical market cap for bitcoin or ethereum.
   * CoinGecko free tier granularity:
   *   days=1  → minutely (~1-5 min intervals)
   *   days≤90 → hourly
   *   days>90 → daily
   */
  async getCoinMarketCapHistory(
    coinId: 'bitcoin' | 'ethereum',
    days: number,
  ): Promise<Array<[number, number]>> {
    const res = await this.client.get<{ market_caps: Array<[number, number]> }>(
      `/coins/${coinId}/market_chart`,
      { params: { vs_currency: 'usd', days } },
    );
    return res.data.market_caps;
  }

  /**
   * Get the historical data point closest to `targetMs` milliseconds ago from now.
   */
  findClosestPoint(history: Array<[number, number]>, targetMs: number): number | null {
    if (history.length === 0) return null;
    const targetTs = Date.now() - targetMs;
    let closest = history[0];
    let minDiff = Math.abs(history[0][0] - targetTs);
    for (const point of history) {
      const diff = Math.abs(point[0] - targetTs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }
    return closest[1];
  }

  /**
   * Given a timeframe string like "1h", "4h", "1d", "3mon",
   * returns { days, targetMs } for CoinGecko query.
   */
  parseTimeframe(tf: string): { days: number; targetMs: number } {
    const match = tf.match(/^(\d+)(m|h|d|mon)$/);
    if (!match) throw new Error(`Invalid timeframe: ${tf}`);
    const n = parseInt(match[1], 10);
    const unit = match[2];

    let targetMs: number;
    let days: number;

    if (unit === 'm') {
      targetMs = n * 60 * 1000;
      days = 1;
    } else if (unit === 'h') {
      targetMs = n * 3600 * 1000;
      days = n <= 23 ? 1 : Math.ceil(n / 24) + 1;
    } else if (unit === 'd') {
      targetMs = n * 86400 * 1000;
      days = n + 1;
    } else {
      // mon
      targetMs = n * 30 * 86400 * 1000;
      days = n * 30 + 1;
    }

    return { days, targetMs };
  }

  /**
   * Fetch full MarketMetrics with prev values for a given timeframe.
   * Returns current + prev for TOTAL, TOTAL2, TOTAL3, OTHERS, BTC.D, OTHERS.D
   */
  async getMarketMetrics(timeframe: string): Promise<{
    current: MarketMetrics;
    prev: MarketMetrics;
  }> {
    const { days, targetMs } = this.parseTimeframe(timeframe);

    // Fetch in parallel
    const [snapshot, btcHistory, ethHistory] = await Promise.all([
      this.getGlobalSnapshot(),
      this.getCoinMarketCapHistory('bitcoin', days),
      this.getCoinMarketCapHistory('ethereum', days),
    ]);

    // Current metrics
    const current = this.buildMetrics(
      snapshot.total,
      snapshot.btcMcap,
      snapshot.ethMcap,
      snapshot.btcDominance,
    );

    // Prev metrics from history
    const prevBtcMcap = this.findClosestPoint(btcHistory, targetMs) ?? snapshot.btcMcap;
    const prevEthMcap = this.findClosestPoint(ethHistory, targetMs) ?? snapshot.ethMcap;

    // Estimate prevTotal from BTC mcap + current BTC dominance ratio
    // (CoinGecko doesn't expose total market_cap history on free tier)
    // Use: prevTotal = prevBtcMcap / (btcDominance / 100)
    const prevTotal = snapshot.btcDominance > 0
      ? prevBtcMcap / (snapshot.btcDominance / 100)
      : snapshot.total;

    const prev = this.buildMetrics(prevTotal, prevBtcMcap, prevEthMcap, snapshot.btcDominance);

    return { current, prev };
  }

  private buildMetrics(
    total: number,
    btcMcap: number,
    ethMcap: number,
    btcDominance: number,
  ): MarketMetrics {
    const total2 = total - btcMcap;
    const total3 = total - btcMcap - ethMcap;
    // OTHERS = coins outside top 10 ≈ TOTAL3 for free tier (no top10 history)
    const others = total3;
    const othersDominance = total > 0 ? (others / total) * 100 : 0;

    return { total, total2, total3, others, othersDominance, btcDominance };
  }
}
