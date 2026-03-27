import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { AlertService } from './alert.service.js';
import { CandidateService } from './candidate.service.js';
import { CallService } from './call.service.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { MILESTONE_CONFIG, sendMilestoneNotification } from '../utils/pnl-milestone.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { minutesSince, nowIso } from '../utils/time.js';
import { formatPrice, formatMarketCap, formatChange } from '../utils/format.js';

export class PollingService {
  private tasks: cron.ScheduledTask[] = [];

  constructor(
    private readonly client: Client,
    private readonly alertService: AlertService,
    private readonly candidateService: CandidateService,
    private readonly provider: CryptoDataProvider,
    private readonly callService?: CallService,
  ) {}

  start(): void {
    this.tasks.push(
      cron.schedule('*/5 * * * *', () => {
        this.runAlertCheck().catch((err) => logger.error('Alert check failed', err));
        if (this.callService) {
          this.runMilestoneCheck().catch((err) => logger.error('Milestone check failed', err));
        }
      })
    );

    this.tasks.push(
      cron.schedule('0 */6 * * *', () => {
        this.runCandidateUpdate().catch((err) => logger.error('Candidate update failed', err));
      })
    );

    this.tasks.push(
      cron.schedule('0 8 * * *', () => {
        this.runCandidateDiscovery().catch((err) => logger.error('Candidate discovery failed', err));
      })
    );

    logger.info('Polling service started');
  }

  stop(): void {
    this.tasks.forEach((t) => t.stop());
    this.tasks = [];
    logger.info('Polling service stopped');
  }

  private async runAlertCheck(): Promise<void> {
    const alerts = await this.alertService.getAllActiveAlerts();
    logger.info(`Alert check: ${alerts.length} active alert(s)`);
    if (alerts.length === 0) return;

    const symbols = [...new Set(alerts.map((a) => a.symbol.toUpperCase()))];
    let marketData;
    try {
      marketData = await this.provider.getMarketData(symbols);
    } catch (err) {
      logger.error('Alert check: failed to fetch market data', err);
      return;
    }
    const marketMap = new Map(marketData.map((m) => [m.symbol.toLowerCase(), m]));
    logger.info(`Alert check: fetched market data for ${marketData.length}/${symbols.length} symbols`);

    for (const alert of alerts) {
      const market = marketMap.get(alert.symbol.toLowerCase());
      if (!market) {
        logger.warn(`Alert check: no market data for symbol "${alert.symbol}" (alert ${alert.id})`);
        continue;
      }

      const value = alert.metric === 'price' ? market.currentPrice : market.marketCap;
      const triggered =
        (alert.condition === 'above' && value >= alert.threshold) ||
        (alert.condition === 'below' && value <= alert.threshold);

      logger.info(
        `Alert ${alert.id}: ${alert.symbol} ${alert.metric}=${value} ${alert.condition} ${alert.threshold} → triggered=${triggered}`
      );

      if (!triggered) continue;

      const cooldownPassed =
        !alert.lastTriggeredAt ||
        minutesSince(alert.lastTriggeredAt) >= env.ALERT_COOLDOWN_MINUTES;

      if (!cooldownPassed) {
        logger.info(`Alert ${alert.id}: cooldown not passed (last triggered ${alert.lastTriggeredAt})`);
        continue;
      }

      try {
        const channel = await this.client.channels.fetch(alert.channelId);
        if (channel instanceof TextChannel) {
          const currentStr =
            alert.metric === 'price'
              ? formatPrice(market.currentPrice)
              : formatMarketCap(market.marketCap);

          let msg: string;
          if ((alert.condition === 'change_up' || alert.condition === 'change_down') && alert.changePct != null) {
            const dir = alert.condition === 'change_up' ? '📈 up' : '📉 down';
            const baseStr = alert.metric === 'price'
              ? formatPrice(alert.baseValue ?? alert.threshold)
              : formatMarketCap(alert.baseValue ?? alert.threshold);
            msg =
              `**Alert:** ${market.name} (${market.symbol.toUpperCase()}) ` +
              `${alert.metric} moved ${dir} **${alert.changePct}%**\n` +
              `Base: ${baseStr} → Current: **${currentStr}**`;
          } else {
            const thresholdStr = alert.metric === 'price'
              ? formatPrice(alert.threshold)
              : formatMarketCap(alert.threshold);
            msg =
              `**Alert:** ${market.name} (${market.symbol.toUpperCase()}) ` +
              `${alert.metric} is ${alert.condition} ${thresholdStr}.\n` +
              `Current ${alert.metric}: **${currentStr}**`;
          }

          await channel.send(msg);
          logger.info(`Alert ${alert.id}: notification sent`);
        }
        await this.alertService.updateAlert({ ...alert, lastTriggeredAt: nowIso() });
      } catch (err) {
        logger.error(`Failed to send alert ${alert.id}`, err);
      }
    }
  }

  private async runMilestoneCheck(): Promise<void> {
    if (!this.callService) return;

    const entries = await this.callService.getAllOpenPositionsWithCalls();
    if (entries.length === 0) return;

    logger.info(`Milestone check: ${entries.length} open position(s)`);

    const symbols = [...new Set(entries.map((e) => e.call.symbol.toUpperCase()))];
    let priceMap: Map<string, number>;
    try {
      priceMap = await this.provider.getLivePrices(symbols);
    } catch (err) {
      logger.error('Milestone check: failed to fetch live prices', err);
      return;
    }

    for (const { position, call } of entries) {
      const currentPrice = priceMap.get(call.symbol.toUpperCase()) ?? 0;
      if (currentPrice <= 0) continue;

      const newMilestones = await this.callService.checkAndUpdateMilestones(position, call, currentPrice);

      for (const milestone of newMilestones) {
        const rawPct = call.direction === 'long'
          ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
          : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
        const pnl = rawPct * position.leverage;

        await sendMilestoneNotification(this.client, call.channelId, {
          userId: position.userId,
          symbol: call.symbol,
          direction: call.direction,
          pnlPct: pnl,
          milestone,
        });
        logger.info(`Milestone ${milestone}% fired for position ${position.id} (${position.username})`);
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
          const candidates = await this.candidateService.getCandidatesByStatus('hit_target');
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
