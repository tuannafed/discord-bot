import { Pool } from 'pg';
import { env } from '../config/env.js';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = env.DATABASE_URL!;
    // Railway internal postgres URLs don't need SSL; external ones use self-signed certs
    const needsSsl = connectionString.includes('railway.app') || connectionString.includes('sslmode=require');
    pool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function runMigrations(): Promise<void> {
  const db = getPool();
  // Add new columns if they don't exist yet (safe to run multiple times)
  await db.query(`
    ALTER TABLE alerts ADD COLUMN IF NOT EXISTS base_value  DOUBLE PRECISION;
    ALTER TABLE alerts ADD COLUMN IF NOT EXISTS change_pct  DOUBLE PRECISION;
  `).catch(() => { /* table may not exist yet — will be created below */ });

  await db.query(`
    CREATE TABLE IF NOT EXISTS watchlist (
      guild_id     TEXT NOT NULL,
      symbol       TEXT NOT NULL,
      coin_id      TEXT NOT NULL,
      created_by   TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      PRIMARY KEY (guild_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id                  TEXT PRIMARY KEY,
      guild_id            TEXT NOT NULL,
      channel_id          TEXT NOT NULL,
      symbol              TEXT NOT NULL,
      coin_id             TEXT NOT NULL,
      metric              TEXT NOT NULL,
      condition           TEXT NOT NULL,
      threshold           DOUBLE PRECISION NOT NULL,
      base_value          DOUBLE PRECISION,
      change_pct          DOUBLE PRECISION,
      last_triggered_at   TEXT,
      is_active           BOOLEAN NOT NULL DEFAULT TRUE,
      created_by          TEXT NOT NULL,
      created_at          TEXT NOT NULL
    );

    ALTER TABLE positions ADD COLUMN IF NOT EXISTS notified_milestones TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS calls (
      id           TEXT PRIMARY KEY,
      guild_id     TEXT NOT NULL,
      channel_id   TEXT NOT NULL,
      symbol       TEXT NOT NULL,
      direction    TEXT NOT NULL,
      call_price   DOUBLE PRECISION NOT NULL,
      called_by    TEXT NOT NULL,
      called_by_id TEXT NOT NULL,
      called_at    TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS positions (
      id           TEXT PRIMARY KEY,
      call_id      TEXT NOT NULL REFERENCES calls(id),
      guild_id     TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      username     TEXT NOT NULL,
      entry_price  DOUBLE PRECISION NOT NULL,
      joined_at    TEXT NOT NULL,
      closed_at    TEXT,
      close_type   TEXT,
      close_price  DOUBLE PRECISION,
      pnl_pct      DOUBLE PRECISION
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id                      TEXT PRIMARY KEY,
      guild_id                TEXT NOT NULL,
      channel_id              TEXT NOT NULL,
      symbol                  TEXT NOT NULL,
      coin_id                 TEXT NOT NULL,
      name                    TEXT NOT NULL,
      discovered_at           TEXT NOT NULL,
      discovered_source       TEXT NOT NULL,
      discovered_market_cap   DOUBLE PRECISION NOT NULL,
      discovered_price        DOUBLE PRECISION NOT NULL,
      discovered_change_24h   DOUBLE PRECISION NOT NULL,
      current_market_cap      DOUBLE PRECISION NOT NULL,
      current_price           DOUBLE PRECISION NOT NULL,
      target_market_cap       DOUBLE PRECISION NOT NULL,
      tracking_expires_at     TEXT NOT NULL,
      status                  TEXT NOT NULL,
      last_checked_at         TEXT
    );
  `);
}
