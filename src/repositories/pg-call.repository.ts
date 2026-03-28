import { Pool } from 'pg';
import { Call, Position } from '../types/call.js';

const CALL_SELECT =
  'id, guild_id AS "guildId", channel_id AS "channelId", symbol, direction, call_price AS "callPrice", leverage, called_by AS "calledBy", called_by_id AS "calledById", called_at AS "calledAt", status,' +
  ' caller_closed_at AS "callerClosedAt", caller_close_type AS "callerCloseType", caller_close_price AS "callerClosePrice", caller_pnl_pct AS "callerPnlPct",' +
  ' COALESCE(caller_notified_milestones, \'\') AS "callerNotifiedMilestones"';

const POS_SELECT =
  'id, call_id AS "callId", guild_id AS "guildId", user_id AS "userId", username, entry_price AS "entryPrice", leverage, joined_at AS "joinedAt", closed_at AS "closedAt", close_type AS "closeType", close_price AS "closePrice", pnl_pct AS "pnlPct", notified_milestones AS "notifiedMilestones", muted_milestones AS "mutedMilestones"';

export class PgCallRepository {
  constructor(private readonly db: Pool) {}

  async createCall(call: Call): Promise<void> {
    await this.db.query(
      `INSERT INTO calls (id, guild_id, channel_id, symbol, direction, call_price, leverage, called_by, called_by_id, called_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [call.id, call.guildId, call.channelId, call.symbol, call.direction, call.callPrice, call.leverage, call.calledBy, call.calledById, call.calledAt, call.status]
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

  async findAllActiveCalls(): Promise<Call[]> {
    const r = await this.db.query<Call>(
      `SELECT ${CALL_SELECT} FROM calls WHERE status = 'active' ORDER BY called_at DESC`
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

  async saveCallerClose(callId: string, closedAt: string, closeType: string, closePrice: number, pnlPct: number): Promise<void> {
    await this.db.query(
      `UPDATE calls SET caller_closed_at = $1, caller_close_type = $2, caller_close_price = $3, caller_pnl_pct = $4 WHERE id = $5`,
      [closedAt, closeType, closePrice, pnlPct, callId]
    );
  }

  async createPosition(pos: Position): Promise<void> {
    await this.db.query(
      `INSERT INTO positions (id, call_id, guild_id, user_id, username, entry_price, leverage, joined_at, closed_at, close_type, close_price, pnl_pct, notified_milestones, muted_milestones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [pos.id, pos.callId, pos.guildId, pos.userId, pos.username, pos.entryPrice, pos.leverage, pos.joinedAt, pos.closedAt, pos.closeType, pos.closePrice, pos.pnlPct, pos.notifiedMilestones, pos.mutedMilestones]
    );
  }

  async setMutedMilestones(id: string, muted: boolean): Promise<void> {
    await this.db.query('UPDATE positions SET muted_milestones = $1 WHERE id = $2', [muted, id]);
  }

  async updateNotifiedMilestones(id: string, notifiedMilestones: string): Promise<void> {
    await this.db.query('UPDATE positions SET notified_milestones = $1 WHERE id = $2', [notifiedMilestones, id]);
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

  async closePosition(id: string, closedAt: string, closeType: 'tp' | 'cl' | 'sl', closePrice: number, pnlPct: number): Promise<void> {
    await this.db.query(
      `UPDATE positions SET closed_at=$1, close_type=$2, close_price=$3, pnl_pct=$4 WHERE id=$5`,
      [closedAt, closeType, closePrice, pnlPct, id]
    );
  }


  async updateCallPrice(id: string, callPrice: number): Promise<void> {
    await this.db.query('UPDATE calls SET call_price = $1 WHERE id = $2', [callPrice, id]);
  }

  async updateCallLeverage(id: string, leverage: number): Promise<void> {
    await this.db.query('UPDATE calls SET leverage = $1 WHERE id = $2', [leverage, id]);
  }

  async updatePositionEntry(id: string, entryPrice: number): Promise<void> {
    await this.db.query('UPDATE positions SET entry_price = $1 WHERE id = $2', [entryPrice, id]);
  }

  async updatePositionLeverage(id: string, leverage: number): Promise<void> {
    await this.db.query('UPDATE positions SET leverage = $1 WHERE id = $2', [leverage, id]);
  }

  async findOpenPositionsByCall(callId: string): Promise<Position[]> {
    const r = await this.db.query<Position>(
      `SELECT ${POS_SELECT} FROM positions WHERE call_id = $1 AND closed_at IS NULL ORDER BY joined_at ASC`,
      [callId]
    );
    return r.rows;
  }

  async deleteCall(id: string): Promise<void> {
    await this.db.query('DELETE FROM positions WHERE call_id = $1', [id]);
    await this.db.query('DELETE FROM calls WHERE id = $1', [id]);
  }

  /** Xóa các position follower đã đóng (TP/CL/SL). */
  async deleteClosedPositionsForCall(callId: string): Promise<number> {
    const r = await this.db.query(
      `DELETE FROM positions WHERE call_id = $1 AND closed_at IS NOT NULL`,
      [callId],
    );
    return r.rowCount ?? 0;
  }

  /** Xóa trạng thái đóng lệnh của caller trên bảng calls (nếu có). */
  async clearCallerClose(callId: string): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE calls SET
         caller_closed_at = NULL,
         caller_close_type = NULL,
         caller_close_price = NULL,
         caller_pnl_pct = NULL
       WHERE id = $1 AND caller_closed_at IS NOT NULL`,
      [callId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async checkAllPositionsClosed(callId: string): Promise<boolean> {
    const r = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM positions WHERE call_id = $1 AND closed_at IS NULL`,
      [callId]
    );
    return parseInt(r.rows[0].count, 10) === 0;
  }

  async updateCallerNotifiedMilestones(callId: string, value: string): Promise<void> {
    await this.db.query(
      'UPDATE calls SET caller_notified_milestones = $1 WHERE id = $2',
      [value, callId]
    );
  }

  async deleteCallerDuplicatePositions(guildId: string): Promise<number> {
    const r = await this.db.query<{ id: string }>(
      `DELETE FROM positions
       WHERE id IN (
         SELECT p.id FROM positions p
         JOIN calls c ON c.id = p.call_id
         WHERE c.guild_id = $1
           AND c.status = 'active'
           AND p.user_id = c.called_by_id
           AND p.closed_at IS NULL
       )
       RETURNING id`,
      [guildId]
    );
    return r.rowCount ?? 0;
  }

  async findAllOpenPositionsWithCalls(): Promise<{ position: Position; call: Call }[]> {
    const r = await this.db.query<Position & {
      call_id_2: string; call_guild_id: string; call_channel_id: string; call_symbol: string;
      call_direction: string; call_price: number; called_by: string; called_by_id: string;
      called_at: string; call_status: string;
    }>(
      `SELECT
        p.id, p.call_id AS "callId", p.guild_id AS "guildId", p.user_id AS "userId",
        p.username, p.entry_price AS "entryPrice", p.leverage, p.joined_at AS "joinedAt",
        p.closed_at AS "closedAt", p.close_type AS "closeType", p.close_price AS "closePrice",
        p.pnl_pct AS "pnlPct", p.notified_milestones AS "notifiedMilestones", p.muted_milestones AS "mutedMilestones",
        c.id AS "cId", c.guild_id AS "cGuildId", c.channel_id AS "cChannelId",
        c.symbol AS "cSymbol", c.direction AS "cDirection", c.call_price AS "cCallPrice",
        c.leverage AS "cLeverage", c.called_by AS "cCalledBy", c.called_by_id AS "cCalledById",
        c.called_at AS "cCalledAt", c.status AS "cStatus"
       FROM positions p
       JOIN calls c ON c.id = p.call_id
       WHERE p.closed_at IS NULL AND c.status = 'active'`
    );

    return r.rows.map((row) => ({
      position: {
        id: row.id,
        callId: row.callId,
        guildId: row.guildId,
        userId: row.userId,
        username: row.username,
        entryPrice: row.entryPrice,
        leverage: row.leverage,
        joinedAt: row.joinedAt,
        closedAt: row.closedAt,
        closeType: row.closeType,
        closePrice: row.closePrice,
        pnlPct: row.pnlPct,
        notifiedMilestones: row.notifiedMilestones,
        mutedMilestones: row.mutedMilestones,
      } as Position,
      call: {
        id: (row as any).cId,
        guildId: (row as any).cGuildId,
        channelId: (row as any).cChannelId,
        symbol: (row as any).cSymbol,
        direction: (row as any).cDirection,
        callPrice: (row as any).cCallPrice,
        leverage: (row as any).cLeverage,
        calledBy: (row as any).cCalledBy,
        calledById: (row as any).cCalledById,
        calledAt: (row as any).cCalledAt,
        status: (row as any).cStatus,
      } as Call,
    }));
  }
}
