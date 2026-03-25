import { Pool } from 'pg';
import { WatchItem } from '../types/watchlist.js';

export class PgWatchlistRepository {
  constructor(private readonly db: Pool) {}

  findByGuild(guildId: string): Promise<WatchItem[]> {
    return this.db
      .query<WatchItem>(
        'SELECT guild_id AS "guildId", symbol, coin_id AS "coinId", created_by AS "createdBy", created_at AS "createdAt" FROM watchlist WHERE guild_id = $1',
        [guildId]
      )
      .then((r) => r.rows);
  }

  async findOne(guildId: string, symbol: string): Promise<WatchItem | undefined> {
    const r = await this.db.query<WatchItem>(
      'SELECT guild_id AS "guildId", symbol, coin_id AS "coinId", created_by AS "createdBy", created_at AS "createdAt" FROM watchlist WHERE guild_id = $1 AND lower(symbol) = lower($2)',
      [guildId, symbol]
    );
    return r.rows[0];
  }

  async add(item: WatchItem): Promise<void> {
    await this.db.query(
      'INSERT INTO watchlist (guild_id, symbol, coin_id, created_by, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
      [item.guildId, item.symbol.toLowerCase(), item.coinId, item.createdBy, item.createdAt]
    );
  }

  async remove(guildId: string, symbol: string): Promise<boolean> {
    const r = await this.db.query(
      'DELETE FROM watchlist WHERE guild_id = $1 AND lower(symbol) = lower($2)',
      [guildId, symbol]
    );
    return (r.rowCount ?? 0) > 0;
  }
}
