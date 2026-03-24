export type AlertMetric = 'market_cap' | 'price';
export type AlertCondition = 'above' | 'below';

export interface AlertRule {
  id: string;
  guildId: string;
  channelId: string;
  symbol: string;
  coinId: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  lastTriggeredAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AlertDb {
  alerts: AlertRule[];
}
