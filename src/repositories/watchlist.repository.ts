import { JsonDb } from './json-db.js';
import { WatchItem, WatchlistDb } from '../types/watchlist.js';
import { dataPath } from '../utils/data-path.js';

const DB_PATH = dataPath('watchlists.json');
const DEFAULT_DATA: WatchlistDb = { items: [] };

export class WatchlistRepository {
  private readonly db: JsonDb<WatchlistDb>;

  constructor() {
    this.db = new JsonDb<WatchlistDb>(DB_PATH, DEFAULT_DATA);
  }

  findByGuild(guildId: string): WatchItem[] {
    const { items } = this.db.read();
    return items.filter((item) => item.guildId === guildId);
  }

  findOne(guildId: string, symbol: string): WatchItem | undefined {
    const { items } = this.db.read();
    return items.find(
      (item) => item.guildId === guildId && item.symbol.toLowerCase() === symbol.toLowerCase()
    );
  }

  add(item: WatchItem): void {
    const data = this.db.read();
    this.db.write({ items: [...data.items, item] });
  }

  remove(guildId: string, symbol: string): boolean {
    const data = this.db.read();
    const filtered = data.items.filter(
      (item) => !(item.guildId === guildId && item.symbol.toLowerCase() === symbol.toLowerCase())
    );
    if (filtered.length === data.items.length) return false;
    this.db.write({ items: filtered });
    return true;
  }
}
