import { Pool } from 'pg';
import { Candidate, CandidateStatus } from '../types/candidate.js';

const SELECT = `
  id, guild_id AS "guildId", channel_id AS "channelId", symbol, coin_id AS "coinId", name,
  discovered_at AS "discoveredAt", discovered_source AS "discoveredSource",
  discovered_market_cap AS "discoveredMarketCap", discovered_price AS "discoveredPrice",
  discovered_change_24h AS "discoveredChange24h", current_market_cap AS "currentMarketCap",
  current_price AS "currentPrice", target_market_cap AS "targetMarketCap",
  tracking_expires_at AS "trackingExpiresAt", status, last_checked_at AS "lastCheckedAt"
`;

export class PgCandidateRepository {
  constructor(private readonly db: Pool) {}

  async findAll(): Promise<Candidate[]> {
    const r = await this.db.query<Candidate>(`SELECT ${SELECT} FROM candidates`);
    return r.rows;
  }

  async findByGuild(guildId: string): Promise<Candidate[]> {
    const r = await this.db.query<Candidate>(
      `SELECT ${SELECT} FROM candidates WHERE guild_id = $1`,
      [guildId]
    );
    return r.rows;
  }

  async findByStatus(status: CandidateStatus): Promise<Candidate[]> {
    const r = await this.db.query<Candidate>(
      `SELECT ${SELECT} FROM candidates WHERE status = $1`,
      [status]
    );
    return r.rows;
  }

  async findByCoinId(coinId: string): Promise<Candidate | undefined> {
    const r = await this.db.query<Candidate>(
      `SELECT ${SELECT} FROM candidates WHERE coin_id = $1 AND status = 'tracking'`,
      [coinId]
    );
    return r.rows[0];
  }

  async add(candidate: Candidate): Promise<void> {
    await this.db.query(
      `INSERT INTO candidates (id, guild_id, channel_id, symbol, coin_id, name, discovered_at, discovered_source,
        discovered_market_cap, discovered_price, discovered_change_24h, current_market_cap, current_price,
        target_market_cap, tracking_expires_at, status, last_checked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        candidate.id, candidate.guildId, candidate.channelId, candidate.symbol, candidate.coinId,
        candidate.name, candidate.discoveredAt, candidate.discoveredSource,
        candidate.discoveredMarketCap, candidate.discoveredPrice, candidate.discoveredChange24h,
        candidate.currentMarketCap, candidate.currentPrice, candidate.targetMarketCap,
        candidate.trackingExpiresAt, candidate.status, candidate.lastCheckedAt,
      ]
    );
  }

  async update(candidate: Candidate): Promise<void> {
    await this.db.query(
      `UPDATE candidates SET current_market_cap=$1, current_price=$2, status=$3, last_checked_at=$4 WHERE id=$5`,
      [candidate.currentMarketCap, candidate.currentPrice, candidate.status, candidate.lastCheckedAt, candidate.id]
    );
  }

  async remove(id: string): Promise<boolean> {
    const r = await this.db.query('DELETE FROM candidates WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  }
}
