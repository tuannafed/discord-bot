import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().optional(),

  /** Discord user id, phân tách bằng dấu phẩy — quyền dùng lệnh admin (vd. /positions-clean) */
  ADMIN_LIST_ID: z.string().optional(),

  // CoinMarketCap (required for market data)
  COINMARKETCAP_API_KEY: z.string().min(1, 'COINMARKETCAP_API_KEY is required'),

  // Bybit (optional — used to enrich real-time prices)
  BYBIT_API_KEY: z.string().optional(),

  // CoinGecko (optional — used for global market metrics)
  COINGECKO_API_KEY: z.string().optional(),

  DATA_DIR: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.coerce.boolean().default(true),

  ALERT_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(60),
  CANDIDATE_TARGET_MARKET_CAP: z.coerce.number().positive().default(1_000_000_000),
  CANDIDATE_TRACKING_DAYS: z.coerce.number().int().positive().default(7),
  CANDIDATE_MIN_CHANGE_24H: z.coerce.number().positive().default(10),
  CANDIDATE_SCAN_SIZE: z.coerce.number().int().positive().default(100),
  CANDIDATE_ALERT_CHANNEL_ID: z.string().optional(),

  // Optional — mention bot + text → LLM (OpenAI-compatible hoặc Anthropic Claude)
  ENABLE_AI_CHAT: z
    .preprocess((v) => {
      if (v === undefined || v === '') return false;
      const s = String(v).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    }, z.boolean())
    .default(false),
  LLM_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_SYSTEM_PROMPT: z.string().optional(),
  LLM_COOLDOWN_MS: z.coerce.number().int().positive().default(8000),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().max(4096).default(600),
  LLM_ANTHROPIC_VERSION: z.string().optional(),

  // Tavily web search (optional — enables keyword-triggered search before LLM reply)
  TAVILY_API_KEY: z.string().optional(),
  TAVILY_MAX_RESULTS: z.coerce.number().int().min(1).max(5).default(3),

  // Voice bot (optional — enables voice command recognition via Whisper)
  OPENAI_API_KEY: z.string().optional(),

  // Milestone PnL notifications (default: enabled)
  ENABLE_MILESTONE_NOTIFICATIONS: z
    .preprocess((v) => {
      if (v === undefined || v === '') return true;
      const s = String(v).trim().toLowerCase();
      return !(s === 'false' || s === '0' || s === 'no');
    }, z.boolean())
    .default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
