import { CandidateRepository } from '../repositories/candidate.repository.js';
import { Candidate, CandidateStatus } from '../types/candidate.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { env } from '../config/env.js';
import { generateId } from '../utils/ids.js';
import { nowIso, addDays, isExpired } from '../utils/time.js';
import { logger } from '../utils/logger.js';

export class CandidateService {
  constructor(
    private readonly repo: CandidateRepository,
    private readonly provider: CryptoDataProvider
  ) {}

  getCandidates(guildId: string): Candidate[] {
    return this.repo.findByGuild(guildId);
  }

  getCandidatesByStatus(status: CandidateStatus): Candidate[] {
    return this.repo.findByStatus(status);
  }

  removeCandidate(id: string): boolean {
    return this.repo.remove(id);
  }

  async runDiscoveryJob(guildId: string, channelId: string): Promise<number> {
    logger.info('Running candidate discovery job');

    const gainers = await this.provider.getTopGainers(env.CANDIDATE_SCAN_SIZE);
    let added = 0;

    for (const coin of gainers) {
      const change = coin.priceChangePercentage24h ?? 0;
      if (
        change < env.CANDIDATE_MIN_CHANGE_24H ||
        coin.marketCap >= env.CANDIDATE_TARGET_MARKET_CAP
      ) {
        continue;
      }

      const existing = this.repo.findByCoinId(coin.symbol);
      if (existing) continue;

      const candidate: Candidate = {
        id: generateId(),
        guildId,
        channelId,
        symbol: coin.symbol.toLowerCase(),
        coinId: coin.symbol.toLowerCase(),
        name: coin.name,
        discoveredAt: nowIso(),
        discoveredSource: 'daily_scan',
        discoveredMarketCap: coin.marketCap,
        discoveredPrice: coin.currentPrice,
        discoveredChange24h: change,
        currentMarketCap: coin.marketCap,
        currentPrice: coin.currentPrice,
        targetMarketCap: env.CANDIDATE_TARGET_MARKET_CAP,
        trackingExpiresAt: addDays(new Date(), env.CANDIDATE_TRACKING_DAYS).toISOString(),
        status: 'tracking',
        lastCheckedAt: null,
      };

      this.repo.add(candidate);
      added++;
    }

    logger.info(`Candidate discovery added ${added} new candidates`);
    return added;
  }

  async runUpdateJob(): Promise<{ hitTarget: number; expired: number }> {
    logger.info('Running candidate update job');

    const tracking = this.repo.findByStatus('tracking');
    if (tracking.length === 0) return { hitTarget: 0, expired: 0 };

    const symbols = tracking.map((c) => c.symbol.toUpperCase());
    const marketData = await this.provider.getMarketData(symbols);
    const marketMap = new Map(marketData.map((m) => [m.symbol.toLowerCase(), m]));

    let hitTarget = 0;
    let expired = 0;

    for (const candidate of tracking) {
      const now = nowIso();

      if (isExpired(candidate.trackingExpiresAt)) {
        this.repo.update({ ...candidate, status: 'expired', lastCheckedAt: now });
        expired++;
        continue;
      }

      const market = marketMap.get(candidate.symbol.toLowerCase());
      if (!market) continue;

      const updatedCandidate: Candidate = {
        ...candidate,
        currentMarketCap: market.marketCap,
        currentPrice: market.currentPrice,
        lastCheckedAt: now,
      };

      if (market.marketCap >= candidate.targetMarketCap) {
        this.repo.update({ ...updatedCandidate, status: 'hit_target' });
        hitTarget++;
      } else {
        this.repo.update(updatedCandidate);
      }
    }

    logger.info(`Candidate update: ${hitTarget} hit target, ${expired} expired`);
    return { hitTarget, expired };
  }
}
