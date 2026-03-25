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

export interface IAlertRepository {
  findAll(): Promise<AlertRule[]> | AlertRule[];
  findByGuild(guildId: string): Promise<AlertRule[]> | AlertRule[];
  findById(id: string): Promise<AlertRule | undefined> | AlertRule | undefined;
  add(alert: AlertRule): Promise<void> | void;
  update(alert: AlertRule): Promise<void> | void;
  remove(id: string): Promise<boolean> | boolean;
}

export class AlertService {
  constructor(
    private readonly repo: IAlertRepository,
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

    await this.repo.add(alert);
    return alert;
  }

  async getAlerts(guildId: string): Promise<AlertRule[]> {
    return this.repo.findByGuild(guildId);
  }

  async getAllActiveAlerts(): Promise<AlertRule[]> {
    const all = await this.repo.findAll();
    return all.filter((a) => a.isActive);
  }

  async updateAlert(alert: AlertRule): Promise<void> {
    await this.repo.update(alert);
  }

  async removeAlert(id: string, guildId: string): Promise<boolean> {
    const all = await this.repo.findAll();
    const alert = all.find((a) => a.id === id && a.guildId === guildId);
    if (!alert) return false;
    return this.repo.remove(id);
  }
}
