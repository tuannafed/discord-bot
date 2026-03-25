export type AlertMetric = 'market_cap' | 'price';
export type AlertCondition = 'above' | 'below' | 'change_up' | 'change_down';

export interface AlertRule {
  id: string;
  guildId: string;
  channelId: string;
  symbol: string;
  coinId: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  /** Stored for change_up/change_down: base value at time of alert creation */
  baseValue?: number;
  /** Stored for change_up/change_down: the % change requested (e.g. 3) */
  changePct?: number;
  lastTriggeredAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AlertDb {
  alerts: AlertRule[];
}
