import { randomUUID } from 'crypto';
import { PgCallRepository } from '../repositories/pg-call.repository.js';
import { MarketService } from './market.service.js';
import { Call, CallWithPositions, Position, CloseType } from '../types/call.js';

export class CallService {
  constructor(
    private readonly repo: PgCallRepository,
    private readonly marketService: MarketService,
  ) {}

  async createCall(params: {
    guildId: string;
    channelId: string;
    symbol: string;
    direction: 'long' | 'short';
    callPrice: number;
    calledBy: string;
    calledById: string;
  }): Promise<Call> {
    const call: Call = {
      id: randomUUID(),
      guildId: params.guildId,
      channelId: params.channelId,
      symbol: params.symbol.toUpperCase(),
      direction: params.direction,
      callPrice: params.callPrice,
      calledBy: params.calledBy,
      calledById: params.calledById,
      calledAt: new Date().toISOString(),
      status: 'active',
    };
    await this.repo.createCall(call);
    return call;
  }

  async getActiveCalls(guildId: string): Promise<Call[]> {
    return this.repo.findActiveCalls(guildId);
  }

  async getAllCalls(guildId: string): Promise<Call[]> {
    return this.repo.findAllCalls(guildId);
  }

  async getActiveCallsWithPositions(guildId: string): Promise<CallWithPositions[]> {
    const calls = await this.repo.findActiveCalls(guildId);
    return Promise.all(
      calls.map(async (call) => {
        const positions = await this.repo.findPositionsByCall(call.id);
        return { ...call, positions };
      })
    );
  }

  async joinCall(params: {
    callId: string;
    guildId: string;
    userId: string;
    username: string;
    entryPrice: number;
  }): Promise<{ position: Position; call: Call } | { error: string }> {
    const call = await this.repo.findCallById(params.callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    if (call.status !== 'active') return { error: 'Kèo này đã đóng, không thể join.' };

    const existing = await this.repo.findOpenPositionByUser(params.callId, params.userId);
    if (existing) return { error: 'Bạn đã join kèo này rồi.' };

    const position: Position = {
      id: randomUUID(),
      callId: params.callId,
      guildId: params.guildId,
      userId: params.userId,
      username: params.username,
      entryPrice: params.entryPrice,
      joinedAt: new Date().toISOString(),
      closedAt: null,
      closeType: null,
      closePrice: null,
      pnlPct: null,
    };
    await this.repo.createPosition(position);
    return { position, call };
  }

  async closeUserPosition(params: {
    guildId: string;
    userId: string;
    username: string;
    callId: string;
    closeType: CloseType;
  }): Promise<{ position: Position; call: Call; currentPrice: number } | { error: string }> {
    const call = await this.repo.findCallById(params.callId);
    if (!call) return { error: 'Kèo không tồn tại.' };

    const position = await this.repo.findOpenPositionByUser(params.callId, params.userId);
    if (!position) return { error: 'Bạn chưa join kèo này hoặc đã đóng rồi.' };

    const coin = await this.marketService.getCoinBySymbol(call.symbol);
    if (!coin) return { error: `Không fetch được giá ${call.symbol}.` };

    const currentPrice = coin.currentPrice;
    const pnlPct = call.direction === 'long'
      ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;

    const closedAt = new Date().toISOString();
    await this.repo.closePosition(position.id, closedAt, params.closeType, currentPrice, pnlPct);

    const closedPosition: Position = {
      ...position,
      closedAt,
      closeType: params.closeType,
      closePrice: currentPrice,
      pnlPct,
    };

    // Auto-close call if all positions are closed
    const allClosed = await this.repo.checkAllPositionsClosed(params.callId);
    if (allClosed) {
      await this.repo.closeCall(params.callId);
    }

    return { position: closedPosition, call, currentPrice };
  }

  async adminCloseCall(callId: string): Promise<{ call: Call; closedCount: number; currentPrice: number } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    if (call.status === 'closed') return { error: 'Kèo này đã đóng rồi.' };

    const coin = await this.marketService.getCoinBySymbol(call.symbol);
    if (!coin) return { error: `Không fetch được giá ${call.symbol}.` };

    const currentPrice = coin.currentPrice;
    const closedAt = new Date().toISOString();
    await this.repo.autoCloseOpenPositions(call.id, closedAt, currentPrice, call.direction);
    await this.repo.closeCall(call.id);

    const positions = await this.repo.findPositionsByCall(call.id);
    const closedCount = positions.filter((p) => p.closedAt === closedAt).length;

    return { call, closedCount, currentPrice };
  }

  async updateCallPrice(callId: string, callPrice: number): Promise<{ call: Call } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    await this.repo.updateCallPrice(callId, callPrice);
    return { call: { ...call, callPrice } };
  }

  async updatePositionEntry(callId: string, userId: string, entryPrice: number): Promise<{ position: Position; call: Call } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    const position = await this.repo.findOpenPositionByUser(callId, userId);
    if (!position) return { error: 'Bạn chưa join kèo này hoặc đã đóng rồi.' };
    await this.repo.updatePositionEntry(position.id, entryPrice);
    return { position: { ...position, entryPrice }, call };
  }

  async deleteCall(callId: string): Promise<{ call: Call } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    await this.repo.deleteCall(callId);
    return { call };
  }

  async getCallWithPositions(callId: string): Promise<CallWithPositions | undefined> {
    const call = await this.repo.findCallById(callId);
    if (!call) return undefined;
    const positions = await this.repo.findPositionsByCall(call.id);
    return { ...call, positions };
  }
}
