export interface WatchItem {
  guildId: string;
  symbol: string;
  coinId: string;
  createdBy: string;
  createdAt: string;
}

export interface WatchlistDb {
  items: WatchItem[];
}
