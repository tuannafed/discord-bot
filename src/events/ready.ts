import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { PollingService } from '../services/polling.service.js';

export function registerReadyEvent(client: Client, pollingService: PollingService): void {
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Bot ready! Logged in as ${readyClient.user.tag}`);
    pollingService.start();
  });
}
