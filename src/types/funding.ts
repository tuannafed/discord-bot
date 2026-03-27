/** USDT perpetual funding snapshot (Bybit linear) */
export interface LinearFundingSnapshot {
  baseSymbol: string;
  /** Raw rate per funding period (e.g. 0.0001) */
  fundingRate: number;
  nextFundingTime: Date;
  markPrice: number;
  indexPrice: number;
  fundingIntervalHours: number;
}
