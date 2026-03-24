export type CandidateStatus = 'tracking' | 'hit_target' | 'expired';

export interface Candidate {
  id: string;
  guildId: string;
  channelId: string;
  symbol: string;
  coinId: string;
  name: string;
  discoveredAt: string;
  discoveredSource: string;
  discoveredMarketCap: number;
  discoveredPrice: number;
  discoveredChange24h: number;
  currentMarketCap: number;
  currentPrice: number;
  targetMarketCap: number;
  trackingExpiresAt: string;
  status: CandidateStatus;
  lastCheckedAt: string | null;
}

export interface CandidateDb {
  candidates: Candidate[];
}
