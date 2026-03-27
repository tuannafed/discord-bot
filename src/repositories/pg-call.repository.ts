import { Pool } from 'pg';
import { Call, Position } from '../types/call.js';

const CALL_SELECT =
  'id, guild_id AS "guildId", channel_id AS "channelId", symbol, direction, call_price AS "callPrice", called_by AS "calledBy", called_by_id AS "calledById", called_at AS "calledAt", status';

const POS_SELECT =
  'id, call_id AS "callId", guild_id AS "guildId", user_id AS "userId", username, entry_price AS "entryPrice", joined_at AS "joinedAt", closed_at AS "closedAt", close_type AS "closeType", close_price AS "closePrice", pnl_pct AS "pnlPct"';

export class PgCallRepository {
  constructor(private readonly db: Pool) {}

  async createCall(call: Call): Promise<void> {
    await this.db.query(
      `INSERT INTO calls (id, guild_id, channel_id, symbol, direction, call_price, called_by, called_by_id, called_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [call.id, call.guildId, call.channelId, call.symbol, call.direction, call.callPrice, call.calledBy, call.calledById, call.calledAt, call.status]
    );
  }

  async findCallById(id: string): Promise<Call | undefined> {
    const r = await this.db.query<Call>(`SELECT ${CALL_SELECT} FROM calls WHERE id = $1`, [id]);
    return r.rows[0];
  }

  async findActiveCalls(guildId: string): Promise<Call[]> {
    const r = await this.db.query<Call>(
      `SELECT ${CALL_SELECT} FROM calls WHERE guild_id = $1 AND status = 'active' ORDER BY called_at DESC`,
      [guildId]
    );
    return r.rows;
  }

  async findAllCalls(guildId: string): Promise<Call[]> {
    const r = await this.db.query<Call>(
      `SELECT ${CALL_SELECT} FROM calls WHERE guild_id = $1 ORDER BY called_at DESC`,
      [guildId]
    );
    return r.rows;
  }

  async closeCall(id: string): Promise<void> {
    await this.db.query(`UPDATE calls SET status = 'closed' WHERE id = $1`, [id]);
  }

  async createPosition(pos: Position): Promise<void> {
    await this.db.query(
      `INSERT INTO positions (id, call_id, guild_id, user_id, username, entry_price, joined_at, closed_at, close_type, close_price, pnl_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [pos.id, pos.callId, pos.guildId, pos.userId, pos.username, pos.entryPrice, pos.joinedAt, pos.closedAt, pos.closeType, pos.closePrice, pos.pnlPct]
    );
  }

  async findPositionsByCall(callId: string): Promise<Position[]> {
    const r = await this.db.query<Position>(
      `SELECT ${POS_SELECT} FROM positions WHERE call_id = $1 ORDER BY joined_at ASC`,
      [callId]
    );
    return r.rows;
  }

  async findOpenPositionByUser(callId: string, userId: string): Promise<Position | undefined> {
    const r = await this.db.query<Position>(
      `SELECT ${POS_SELECT} FROM positions WHERE call_id = $1 AND user_id = $2 AND closed_at IS NULL`,
      [callId, userId]
    );
    return r.rows[0];
  }

  async findOpenPositionsByUser(guildId: string, userId: string): Promise<Position[]> {
    const r = await this.db.query<Position>(
      `SELECT ${POS_SELECT} FROM positions WHERE guild_id = $1 AND user_id = $2 AND closed_at IS NULL`,
      [guildId, userId]
    );
    return r.rows;
  }

  async closePosition(id: string, closedAt: string, closeType: 'tp' | 'cl', closePrice: number, pnlPct: number): Promise<void> {
    await this.db.query(
      `UPDATE positions SET closed_at=$1, close_type=$2, close_price=$3, pnl_pct=$4 WHERE id=$5`,
      [closedAt, closeType, closePrice, pnlPct, id]
    );
  }

  async autoCloseOpenPositions(callId: string, closedAt: string, closePrice: number, direction: 'long' | 'short'): Promise<void> {
    const openPositions = await this.db.query<Position>(
      `SELECT ${POS_SELECT} FROM positions WHERE call_id = $1 AND closed_at IS NULL`,
      [callId]
    );
    for (const pos of openPositions.rows) {
      const pnlPct = direction === 'long'
        ? ((closePrice - pos.entryPrice) / pos.entryPrice) * 100
        : ((pos.entryPrice - closePrice) / pos.entryPrice) * 100;
      const closeType = pnlPct >= 0 ? 'tp' : 'cl';
      await this.closePosition(pos.id, closedAt, closeType, closePrice, pnlPct);
    }
  }

  async deleteCall(id: string): Promise<void> {
    await this.db.query('DELETE FROM positions WHERE call_id = $1', [id]);
    await this.db.query('DELETE FROM calls WHERE id = $1', [id]);
  }

  async checkAllPositionsClosed(callId: string): Promise<boolean> {
    const r = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM positions WHERE call_id = $1 AND closed_at IS NULL`,
      [callId]
    );
    return parseInt(r.rows[0].count, 10) === 0;
  }
}
