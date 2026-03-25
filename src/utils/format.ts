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
    return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
  }
  if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
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

/** Fixed-width price, right-padded to 10 chars */
export function formatPriceFixed(price: number): string {
  return formatPrice(price).padEnd(10);
}

/** Fixed-width market cap, right-padded to 8 chars */
export function formatMarketCapFixed(marketCap: number): string {
  return formatMarketCap(marketCap).padEnd(8);
}

/** Fixed-width change, left-padded to 7 chars */
export function formatChangeFixed(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`.padStart(7);
}
