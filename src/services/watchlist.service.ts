import { WatchItem } from '../types/watchlist.js';
import { resolveSymbolToId } from '../utils/symbol-resolver.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { nowIso } from '../utils/time.js';

export interface IWatchlistRepository {
  findByGuild(guildId: string): Promise<WatchItem[]> | WatchItem[];
  findOne(guildId: string, symbol: string): Promise<WatchItem | undefined> | WatchItem | undefined;
  add(item: WatchItem): Promise<void> | void;
  remove(guildId: string, symbol: string): Promise<boolean> | boolean;
}

export class WatchlistService {
  constructor(
    private readonly repo: IWatchlistRepository,
    private readonly provider: CryptoDataProvider
  ) {}

  async addWatch(guildId: string, symbol: string, userId: string): Promise<'added' | 'exists' | 'not_found'> {
    const existing = await this.repo.findOne(guildId, symbol);
    if (existing) return 'exists';

    const coinId = await resolveSymbolToId(symbol, this.provider);
    if (!coinId) return 'not_found';

    const item: WatchItem = {
      guildId,
      symbol: symbol.toLowerCase(),
      coinId: symbol.toLowerCase(),
      createdBy: userId,
      createdAt: nowIso(),
    };
    await this.repo.add(item);
    return 'added';
  }

  async removeWatch(guildId: string, symbol: string): Promise<boolean> {
    return this.repo.remove(guildId, symbol);
  }

  async getWatchlist(guildId: string): Promise<WatchItem[]> {
    return this.repo.findByGuild(guildId);
  }
}
