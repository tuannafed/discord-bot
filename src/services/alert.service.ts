import { AlertRepository } from '../repositories/alert.repository.js';
import { AlertRule, AlertMetric, AlertCondition } from '../types/alert.js';
import { resolveSymbolToId } from '../utils/symbol-resolver.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { generateId } from '../utils/ids.js';
import { nowIso } from '../utils/time.js';

interface AddAlertParams {
  guildId: string;
  channelId: string;
  symbol: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  userId: string;
}

export class AlertService {
  constructor(
    private readonly repo: AlertRepository,
    private readonly provider: CryptoDataProvider
  ) {}

  async addAlert(params: AddAlertParams): Promise<AlertRule | null> {
    const coinId = await resolveSymbolToId(params.symbol, this.provider);
    if (!coinId) return null;

    const alert: AlertRule = {
      id: generateId(),
      guildId: params.guildId,
      channelId: params.channelId,
      symbol: params.symbol.toLowerCase(),
      coinId: params.symbol.toLowerCase(),
      metric: params.metric,
      condition: params.condition,
      threshold: params.threshold,
      lastTriggeredAt: null,
      isActive: true,
      createdBy: params.userId,
      createdAt: nowIso(),
    };

    this.repo.add(alert);
    return alert;
  }

  getAlerts(guildId: string): AlertRule[] {
    return this.repo.findByGuild(guildId);
  }

  getAllActiveAlerts(): AlertRule[] {
    return this.repo.findAll().filter((a) => a.isActive);
  }

  updateAlert(alert: AlertRule): void {
    this.repo.update(alert);
  }
}
