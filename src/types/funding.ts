/** Một kỳ funding đã settle (Bybit funding history) */
export interface FundingSettledPeriod {
  /** Raw rate đã áp dụng kỳ đó */
  fundingRate: number;
  settledAt: Date;
}

/** USDT perpetual funding snapshot (Bybit linear) */
export interface LinearFundingSnapshot {
  baseSymbol: string;
  /** Raw rate per funding period (e.g. 0.0001) */
  fundingRate: number;
  nextFundingTime: Date;
  markPrice: number;
  indexPrice: number;
  fundingIntervalHours: number;
  /** Kỳ settle gần nhất (history[0]), nếu API trả về */
  lastSettled?: FundingSettledPeriod;
  /** Kỳ settle liền trước (history[1]) */
  priorSettled?: FundingSettledPeriod;
}
