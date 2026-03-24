import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().optional(),

  // CoinMarketCap (required for market data)
  COINMARKETCAP_API_KEY: z.string().min(1, 'COINMARKETCAP_API_KEY is required'),

  // Bybit (optional — used to enrich real-time prices)
  BYBIT_API_KEY: z.string().optional(),

  ALERT_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(60),
  CANDIDATE_TARGET_MARKET_CAP: z.coerce.number().positive().default(1_000_000_000),
  CANDIDATE_TRACKING_DAYS: z.coerce.number().int().positive().default(7),
  CANDIDATE_MIN_CHANGE_24H: z.coerce.number().positive().default(10),
  CANDIDATE_SCAN_SIZE: z.coerce.number().int().positive().default(100),
  CANDIDATE_ALERT_CHANNEL_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
