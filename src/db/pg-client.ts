import { Pool } from 'pg';
import { env } from '../config/env.js';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function runMigrations(): Promise<void> {
  const db = getPool();
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
      last_triggered_at   TEXT,
      is_active           BOOLEAN NOT NULL DEFAULT TRUE,
      created_by          TEXT NOT NULL,
      created_at          TEXT NOT NULL
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
