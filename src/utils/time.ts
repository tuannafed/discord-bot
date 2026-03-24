export function nowIso(): string {
  return new Date().toISOString();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function minutesSince(isoDate: string): number {
  const diff = Date.now() - new Date(isoDate).getTime();
  return diff / 1000 / 60;
}
