/**
 * Normalize decimal input from various keyboard locales.
 * Accepts both "0.27" (en-US) and "0,27" (some iPhone locales).
 * Returns NaN if the input is not a valid number.
 */
export function parseDecimalInput(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  const value = parseFloat(normalized);
  return value;
}

export function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(8)}`;
}

export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1_000_000_000) {
    return `$${(marketCap / 1_000_000_000).toFixed(1)}B`;
  }
  if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(1)}M`;
  }
  return `$${marketCap.toLocaleString('en-US')}`;
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export function formatChangeEmoji(change: number): string {
  return change >= 0 ? '📈' : '📉';
}

export function formatSupply(supply: number | null | undefined): string {
  if (supply == null) return '∞';
  if (supply >= 1_000_000_000) return `${(supply / 1_000_000_000).toFixed(2)}B`;
  if (supply >= 1_000_000) return `${(supply / 1_000_000).toFixed(2)}M`;
  if (supply >= 1_000) return `${(supply / 1_000).toFixed(2)}K`;
  return supply.toLocaleString('en-US');
}

/** Fixed-width price, right-padded to 10 chars */
export function formatPriceFixed(price: number): string {
  return formatPrice(price).padEnd(10);
}

/** Fixed-width market cap, right-padded to 7 chars */
export function formatMarketCapFixed(marketCap: number): string {
  return formatMarketCap(marketCap).padEnd(7);
}

/** Fixed-width change, left-padded to 7 chars */
export function formatChangeFixed(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`.padStart(7);
}
