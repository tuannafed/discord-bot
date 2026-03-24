import './config/env.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

import { CryptoDataProvider } from './providers/crypto-data.provider.js';
import { MarketService } from './services/market.service.js';
import { WatchlistService } from './services/watchlist.service.js';
import { AlertService } from './services/alert.service.js';
import { CandidateService } from './services/candidate.service.js';
import { PollingService } from './services/polling.service.js';

import { WatchlistRepository } from './repositories/watchlist.repository.js';
import { AlertRepository } from './repositories/alert.repository.js';
import { CandidateRepository } from './repositories/candidate.repository.js';

import { buildCommands } from './commands/index.js';
import { registerReadyEvent } from './events/ready.js';
import { registerInteractionCreateEvent } from './events/interaction-create.js';

async function main(): Promise<void> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  // Repositories
  const watchlistRepo = new WatchlistRepository();
  const alertRepo = new AlertRepository();
  const candidateRepo = new CandidateRepository();

  // Providers
  const cryptoProvider = new CryptoDataProvider();

  // Services
  const marketService = new MarketService(cryptoProvider);
  const watchlistService = new WatchlistService(watchlistRepo, cryptoProvider);
  const alertService = new AlertService(alertRepo, cryptoProvider);
  const candidateService = new CandidateService(candidateRepo, cryptoProvider);
  const pollingService = new PollingService(client, alertService, candidateService, cryptoProvider);

  // Commands
  const commands = buildCommands(
    marketService,
    watchlistService,
    alertService,
    candidateService,
    cryptoProvider
  );

  // Events
  registerReadyEvent(client, pollingService);
  registerInteractionCreateEvent(client, commands);

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  logger.error('Fatal error during startup', err);
  process.exit(1);
});
