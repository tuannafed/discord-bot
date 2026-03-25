import { Pool } from 'pg';
import { AlertRule } from '../types/alert.js';

const SELECT =
  'id, guild_id AS "guildId", channel_id AS "channelId", symbol, coin_id AS "coinId", metric, condition, threshold, base_value AS "baseValue", change_pct AS "changePct", last_triggered_at AS "lastTriggeredAt", is_active AS "isActive", created_by AS "createdBy", created_at AS "createdAt"';

export class PgAlertRepository {
  constructor(private readonly db: Pool) {}

  async findAll(): Promise<AlertRule[]> {
    const r = await this.db.query<AlertRule>(`SELECT ${SELECT} FROM alerts`);
    return r.rows;
  }

  async findByGuild(guildId: string): Promise<AlertRule[]> {
    const r = await this.db.query<AlertRule>(
      `SELECT ${SELECT} FROM alerts WHERE guild_id = $1`,
      [guildId]
    );
    return r.rows;
  }

  async findById(id: string): Promise<AlertRule | undefined> {
    const r = await this.db.query<AlertRule>(
      `SELECT ${SELECT} FROM alerts WHERE id = $1`,
      [id]
    );
    return r.rows[0];
  }

  async add(alert: AlertRule): Promise<void> {
    await this.db.query(
      `INSERT INTO alerts (id, guild_id, channel_id, symbol, coin_id, metric, condition, threshold, base_value, change_pct, last_triggered_at, is_active, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        alert.id, alert.guildId, alert.channelId, alert.symbol, alert.coinId,
        alert.metric, alert.condition, alert.threshold,
        alert.baseValue ?? null, alert.changePct ?? null,
        alert.lastTriggeredAt, alert.isActive, alert.createdBy, alert.createdAt,
      ]
    );
  }

  async update(alert: AlertRule): Promise<void> {
    await this.db.query(
      `UPDATE alerts SET channel_id=$1, metric=$2, condition=$3, threshold=$4, last_triggered_at=$5, is_active=$6 WHERE id=$7`,
      [alert.channelId, alert.metric, alert.condition, alert.threshold, alert.lastTriggeredAt, alert.isActive, alert.id]
    );
  }

  async remove(id: string): Promise<boolean> {
    const r = await this.db.query('DELETE FROM alerts WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  }
}
