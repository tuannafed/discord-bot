import './config/env.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

import { CryptoDataProvider } from './providers/crypto-data.provider.js';
import { MarketService } from './services/market.service.js';
import { WatchlistService, IWatchlistRepository } from './services/watchlist.service.js';
import { AlertService, IAlertRepository } from './services/alert.service.js';
import { CandidateService, ICandidateRepository } from './services/candidate.service.js';
import { CallService } from './services/call.service.js';
import { PollingService } from './services/polling.service.js';

import { WatchlistRepository } from './repositories/watchlist.repository.js';
import { AlertRepository } from './repositories/alert.repository.js';
import { CandidateRepository } from './repositories/candidate.repository.js';
import { PgWatchlistRepository } from './repositories/pg-watchlist.repository.js';
import { PgAlertRepository } from './repositories/pg-alert.repository.js';
import { PgCandidateRepository } from './repositories/pg-candidate.repository.js';
import { PgCallRepository } from './repositories/pg-call.repository.js';
import { getPool, runMigrations } from './db/pg-client.js';

import { buildCommands } from './commands/index.js';
import { registerReadyEvent } from './events/ready.js';
import { registerInteractionCreateEvent } from './events/interaction-create.js';

async function main(): Promise<void> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  // Repositories — use PostgreSQL when DATABASE_URL is set, else JSON files
  let watchlistRepo: IWatchlistRepository;
  let alertRepo: IAlertRepository;
  let candidateRepo: ICandidateRepository;

  if (env.DATABASE_URL) {
    logger.info('Using PostgreSQL for storage');
    const pool = getPool();
    await runMigrations();
    watchlistRepo = new PgWatchlistRepository(pool);
    alertRepo = new PgAlertRepository(pool);
    candidateRepo = new PgCandidateRepository(pool);
  } else {
    logger.info('Using JSON file storage');
    watchlistRepo = new WatchlistRepository();
    alertRepo = new AlertRepository();
    candidateRepo = new CandidateRepository();
  }

  // Providers
  const cryptoProvider = new CryptoDataProvider();

  // Services
  const marketService = new MarketService(cryptoProvider);
  const watchlistService = new WatchlistService(watchlistRepo, cryptoProvider);
  const alertService = new AlertService(alertRepo, cryptoProvider);
  const candidateService = new CandidateService(candidateRepo, cryptoProvider);
  const pollingService = new PollingService(client, alertService, candidateService, cryptoProvider);

  const callRepo = env.DATABASE_URL ? new PgCallRepository(getPool()) : undefined;
  const callService = callRepo ? new CallService(callRepo, marketService) : undefined;

  // Commands
  const commands = buildCommands(
    marketService,
    watchlistService,
    alertService,
    candidateService,
    cryptoProvider,
    callService!,
  );

  // Events
  registerReadyEvent(client, pollingService);
  registerInteractionCreateEvent(client, commands);

  await client.login(env.DISCORD_TOKEN);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    pollingService.stop();
    client.destroy();
    if (env.DATABASE_URL) {
      const { closePool } = await import('./db/pg-client.js');
      await closePool();
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal error during startup', err);
  process.exit(1);
});
