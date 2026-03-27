import { randomUUID } from 'crypto';
import { PgCallRepository } from '../repositories/pg-call.repository.js';
import { MarketService } from './market.service.js';
import { Call, CallWithPositions, Position, CloseType } from '../types/call.js';
import { LOSS_MILESTONES, MILESTONES } from '../utils/pnl-milestone.js';

export class CallService {
  // In-memory mute state for callers: Set of callIds where caller has muted milestone noti
  private readonly callerMuted = new Set<string>();

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
    leverage: number;
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
      leverage: params.leverage,
      calledBy: params.calledBy,
      calledById: params.calledById,
      calledAt: new Date().toISOString(),
      status: 'active',
      callerClosedAt: null,
      callerCloseType: null,
      callerClosePrice: null,
      callerPnlPct: null,
      callerNotifiedMilestones: '',
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
    leverage?: number;
  }): Promise<{ position: Position; call: Call } | { error: string }> {
    const call = await this.repo.findCallById(params.callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    if (call.status !== 'active') return { error: 'Kèo này đã đóng, không thể join.' };

    if (call.calledById === params.userId) return { error: 'Bạn là người call kèo này, không cần join thêm.' };

    const existing = await this.repo.findOpenPositionByUser(params.callId, params.userId);
    if (existing) return { error: 'Bạn đã join kèo này rồi.' };

    const position: Position = {
      id: randomUUID(),
      callId: params.callId,
      guildId: params.guildId,
      userId: params.userId,
      username: params.username,
      entryPrice: params.entryPrice,
      leverage: params.leverage ?? call.leverage,
      joinedAt: new Date().toISOString(),
      closedAt: null,
      closeType: null,
      closePrice: null,
      pnlPct: null,
      notifiedMilestones: '',
      mutedMilestones: false,
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

    // Caller dùng callPrice + call.leverage làm entry
    const isCaller = call.calledById === params.userId;
    const position = isCaller
      ? null
      : await this.repo.findOpenPositionByUser(params.callId, params.userId);

    if (!isCaller && !position) return { error: 'Bạn chưa join kèo này hoặc đã đóng rồi.' };

    const coin = await this.marketService.getCoinBySymbol(call.symbol);
    if (!coin) return { error: `Không fetch được giá ${call.symbol}.` };

    const currentPrice = coin.currentPrice;
    const entryPrice = position ? position.entryPrice : call.callPrice;
    const leverage = position ? position.leverage : call.leverage;
    const rawPct = call.direction === 'long'
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100;
    const pnlPct = rawPct * leverage;

    const closedAt = new Date().toISOString();

    let closedPosition: Position;
    if (position) {
      await this.repo.closePosition(position.id, closedAt, params.closeType, currentPrice, pnlPct);
      closedPosition = { ...position, closedAt, closeType: params.closeType, closePrice: currentPrice, pnlPct };
    } else {
      // Caller: save close info to calls table
      await this.repo.saveCallerClose(call.id, closedAt, params.closeType, currentPrice, pnlPct);
      closedPosition = {
        id: '',
        callId: call.id,
        guildId: call.guildId,
        userId: call.calledById,
        username: call.calledBy,
        entryPrice: call.callPrice,
        leverage: call.leverage,
        joinedAt: call.calledAt,
        closedAt,
        closeType: params.closeType,
        closePrice: currentPrice,
        pnlPct,
        notifiedMilestones: '',
        mutedMilestones: false,
      };
    }

    // Auto-close call if all positions are closed
    const allClosed = await this.repo.checkAllPositionsClosed(params.callId);
    if (allClosed) {
      await this.repo.closeCall(params.callId);
    }

    return { position: closedPosition, call, currentPrice };
  }

  async updateCallPrice(callId: string, callPrice: number): Promise<{ call: Call } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    await this.repo.updateCallPrice(callId, callPrice);
    return { call: { ...call, callPrice } };
  }

  async updateCallLeverage(callId: string, leverage: number): Promise<{ call: Call } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    await this.repo.updateCallLeverage(callId, leverage);
    return { call: { ...call, leverage } };
  }

  async updatePositionEntry(callId: string, userId: string, entryPrice: number): Promise<{ position: Position; call: Call } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    const position = await this.repo.findOpenPositionByUser(callId, userId);
    if (!position) return { error: 'Bạn chưa join kèo này hoặc đã đóng rồi.' };
    await this.repo.updatePositionEntry(position.id, entryPrice);
    return { position: { ...position, entryPrice }, call };
  }

  async updatePositionLeverage(callId: string, userId: string, leverage: number): Promise<{ position: Position; call: Call } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    const position = await this.repo.findOpenPositionByUser(callId, userId);
    if (!position) return { error: 'Bạn chưa join kèo này hoặc đã đóng rồi.' };
    await this.repo.updatePositionLeverage(position.id, leverage);
    return { position: { ...position, leverage }, call };
  }

  async muteMilestone(callId: string, userId: string): Promise<{ ok: true } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };

    if (call.calledById === userId) {
      this.callerMuted.add(callId);
      return { ok: true };
    }

    const position = await this.repo.findOpenPositionByUser(callId, userId);
    if (!position) return { error: 'Bạn chưa join kèo này hoặc đã đóng rồi.' };
    await this.repo.setMutedMilestones(position.id, true);
    return { ok: true };
  }

  async unmuteMilestone(callId: string, userId: string): Promise<{ ok: true } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };

    if (call.calledById === userId) {
      this.callerMuted.delete(callId);
      return { ok: true };
    }

    const position = await this.repo.findOpenPositionByUser(callId, userId);
    if (!position) return { error: 'Bạn chưa join kèo này hoặc đã đóng rồi.' };
    await this.repo.setMutedMilestones(position.id, false);
    return { ok: true };
  }

  async deleteCall(callId: string): Promise<{ call: Call } | { error: string }> {
    const call = await this.repo.findCallById(callId);
    if (!call) return { error: 'Kèo không tồn tại.' };
    await this.repo.deleteCall(callId);
    this.callerMuted.delete(callId);
    return { call };
  }

  async checkAndUpdateMilestones(
    position: Position,
    call: Call,
    currentPrice: number,
  ): Promise<number[]> {
    const rawPct = call.direction === 'long'
      ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
    const pnl = rawPct * position.leverage;

    // Find the current milestone band
    // Profit: highest crossed (e.g. 230% → 200), Loss: lowest crossed (e.g. -250% → -200)
    let currentBand: number | null = null;
    for (const m of MILESTONES) {
      if (pnl >= m) currentBand = m;
    }
    if (currentBand === null) {
      for (const m of LOSS_MILESTONES) {
        if (pnl <= m) currentBand = m;
      }
    }

    const isCaller = position.id.startsWith('caller-');

    // Skip if muted
    if (isCaller) {
      if (this.callerMuted.has(position.callId)) return [];
    } else if (position.mutedMilestones) {
      return [];
    }

    // lastNotified: the band we last sent a notification for
    const lastNotified = isCaller
      ? (call.callerNotifiedMilestones ? parseInt(call.callerNotifiedMilestones, 10) : null)
      : (position.notifiedMilestones ? parseInt(position.notifiedMilestones, 10) : null);

    // Fire if we're in a band AND it differs from the last notified band
    if (currentBand === null || currentBand === lastNotified) return [];

    if (isCaller) {
      await this.repo.updateCallerNotifiedMilestones(position.callId, String(currentBand));
    } else {
      await this.repo.updateNotifiedMilestones(position.id, String(currentBand));
    }
    return [currentBand];
  }

  async getOpenPositionsWithCalls(guildId: string): Promise<{ position: Position; call: Call }[]> {
    const calls = await this.repo.findActiveCalls(guildId);
    const result: { position: Position; call: Call }[] = [];
    for (const call of calls) {
      const positions = await this.repo.findOpenPositionsByCall(call.id);
      for (const position of positions) {
        result.push({ position, call });
      }
    }
    return result;
  }

  async getAllOpenPositionsWithCalls(): Promise<{ position: Position; call: Call }[]> {
    return this.repo.findAllOpenPositionsWithCalls();
  }

  async getOpenPositionsByCall(callId: string): Promise<Position[]> {
    return this.repo.findOpenPositionsByCall(callId);
  }

  async fixCallerDuplicatePositions(guildId: string): Promise<number> {
    return this.repo.deleteCallerDuplicatePositions(guildId);
  }

  getRepo(): PgCallRepository {
    return this.repo;
  }

  async getCallWithPositions(callId: string): Promise<CallWithPositions | undefined> {
    const call = await this.repo.findCallById(callId);
    if (!call) return undefined;
    const positions = await this.repo.findPositionsByCall(call.id);
    return { ...call, positions };
  }
}
