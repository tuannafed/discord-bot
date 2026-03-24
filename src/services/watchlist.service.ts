import { WatchlistRepository } from '../repositories/watchlist.repository.js';
import { WatchItem } from '../types/watchlist.js';
import { resolveSymbolToId } from '../utils/symbol-resolver.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { nowIso } from '../utils/time.js';

export class WatchlistService {
  constructor(
    private readonly repo: WatchlistRepository,
    private readonly provider: CryptoDataProvider
  ) {}

  async addWatch(guildId: string, symbol: string, userId: string): Promise<'added' | 'exists' | 'not_found'> {
    const existing = this.repo.findOne(guildId, symbol);
    if (existing) return 'exists';

    const coinId = await resolveSymbolToId(symbol, this.provider);
    if (!coinId) return 'not_found';

    const item: WatchItem = {
      guildId,
      symbol: symbol.toLowerCase(),
      coinId: symbol.toLowerCase(), // use symbol as id since CMC uses symbols
      createdBy: userId,
      createdAt: nowIso(),
    };
    this.repo.add(item);
    return 'added';
  }

  removeWatch(guildId: string, symbol: string): boolean {
    return this.repo.remove(guildId, symbol);
  }

  getWatchlist(guildId: string): WatchItem[] {
    return this.repo.findByGuild(guildId);
  }
}
