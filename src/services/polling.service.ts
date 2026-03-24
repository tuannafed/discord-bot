import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { AlertService } from './alert.service.js';
import { CandidateService } from './candidate.service.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { minutesSince, nowIso } from '../utils/time.js';
import { formatPrice, formatMarketCap, formatChange } from '../utils/format.js';

export class PollingService {
  constructor(
    private readonly client: Client,
    private readonly alertService: AlertService,
    private readonly candidateService: CandidateService,
    private readonly provider: CryptoDataProvider
  ) {}

  start(): void {
    cron.schedule('*/5 * * * *', () => {
      this.runAlertCheck().catch((err) => logger.error('Alert check failed', err));
    });

    cron.schedule('0 */6 * * *', () => {
      this.runCandidateUpdate().catch((err) => logger.error('Candidate update failed', err));
    });

    cron.schedule('0 8 * * *', () => {
      this.runCandidateDiscovery().catch((err) => logger.error('Candidate discovery failed', err));
    });

    logger.info('Polling service started');
  }

  private async runAlertCheck(): Promise<void> {
    const alerts = this.alertService.getAllActiveAlerts();
    if (alerts.length === 0) return;

    const symbols = [...new Set(alerts.map((a) => a.symbol.toUpperCase()))];
    const marketData = await this.provider.getMarketData(symbols);
    const marketMap = new Map(marketData.map((m) => [m.symbol.toLowerCase(), m]));

    for (const alert of alerts) {
      const market = marketMap.get(alert.symbol.toLowerCase());
      if (!market) continue;

      const value = alert.metric === 'price' ? market.currentPrice : market.marketCap;
      const triggered =
        (alert.condition === 'above' && value >= alert.threshold) ||
        (alert.condition === 'below' && value <= alert.threshold);

      if (!triggered) continue;

      const cooldownPassed =
        !alert.lastTriggeredAt ||
        minutesSince(alert.lastTriggeredAt) >= env.ALERT_COOLDOWN_MINUTES;

      if (!cooldownPassed) continue;

      try {
        const channel = await this.client.channels.fetch(alert.channelId);
        if (channel instanceof TextChannel) {
          const valueStr =
            alert.metric === 'price'
              ? formatPrice(market.currentPrice)
              : formatMarketCap(market.marketCap);

          await channel.send(
            `**Alert:** ${market.name} (${market.symbol.toUpperCase()}) ` +
              `${alert.metric} is ${alert.condition} ${alert.metric === 'price' ? formatPrice(alert.threshold) : formatMarketCap(alert.threshold)}.\n` +
              `Current ${alert.metric}: **${valueStr}**`
          );
        }
        this.alertService.updateAlert({ ...alert, lastTriggeredAt: nowIso() });
      } catch (err) {
        logger.error(`Failed to send alert ${alert.id}`, err);
      }
    }
  }

  private async runCandidateUpdate(): Promise<void> {
    const { hitTarget, expired } = await this.candidateService.runUpdateJob();

    if (hitTarget === 0) return;

    if (env.CANDIDATE_ALERT_CHANNEL_ID) {
      try {
        const channel = await this.client.channels.fetch(env.CANDIDATE_ALERT_CHANNEL_ID);
        if (channel instanceof TextChannel) {
          const candidates = this.candidateService.getCandidatesByStatus('hit_target');
          const recentHits = candidates.filter(
            (c) => c.lastCheckedAt && minutesSince(c.lastCheckedAt) < 60
          );
          for (const c of recentHits) {
            await channel.send(
              `**Candidate Hit Target!** ${c.name} (${c.symbol.toUpperCase()}) reached target market cap.\n` +
                `Market cap: **${formatMarketCap(c.currentMarketCap)}** ` +
                `(target: ${formatMarketCap(c.targetMarketCap)})\n` +
                `Price: **${formatPrice(c.currentPrice)}**\n` +
                `Discovered at ${formatMarketCap(c.discoveredMarketCap)} with ${formatChange(c.discoveredChange24h)} 24h change.`
            );
          }
        }
      } catch (err) {
        logger.error('Failed to send candidate hit target notification', err);
      }
    }

    logger.info(`Candidate update: ${hitTarget} hit target, ${expired} expired`);
  }

  private async runCandidateDiscovery(): Promise<void> {
    if (!env.CANDIDATE_ALERT_CHANNEL_ID) {
      logger.warn('CANDIDATE_ALERT_CHANNEL_ID not set — skipping discovery job');
      return;
    }

    const added = await this.candidateService.runDiscoveryJob(
      'global',
      env.CANDIDATE_ALERT_CHANNEL_ID
    );

    if (added > 0) {
      try {
        const channel = await this.client.channels.fetch(env.CANDIDATE_ALERT_CHANNEL_ID);
        if (channel instanceof TextChannel) {
          await channel.send(`Daily scan complete: **${added}** new candidate(s) added for tracking.`);
        }
      } catch (err) {
        logger.error('Failed to send discovery notification', err);
      }
    }
  }
}
