import { TextChannel } from 'discord.js';
import { CallService } from './call.service.js';
import { MarketService } from './market.service.js';
import { type VoiceIntent } from './voice-intent.service.js';

export type ExecuteResult = { success: true; message: string } | { success: false; message: string };

/** Find active call_id by symbol for the guild */
async function resolveCallId(
  callService: CallService,
  guildId: string,
  symbol: string,
): Promise<string | null> {
  const calls = await callService.getActiveCalls(guildId);
  const match = calls.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
  return match?.id ?? null;
}

export async function executeVoiceIntent(
  intent: VoiceIntent,
  context: {
    guildId: string;
    userId: string;
    username: string;
    channel: TextChannel;
    callService: CallService;
    marketService?: MarketService;
  },
): Promise<ExecuteResult> {
  const { guildId, userId, username, callService, marketService } = context;

  switch (intent.command) {

    // ─── Trading (mutating) ───────────────────────────────────────────────────

    case 'call': {
      const result = await callService.createCall({
        guildId,
        channelId: context.channel.id,
        symbol: intent.symbol,
        direction: intent.direction,
        callPrice: intent.price,
        leverage: intent.leverage ?? 20,
        calledBy: username,
        calledById: userId,
      });
      const dir = intent.direction === 'long' ? '📈 LONG' : '📉 SHORT';
      return { success: true, message: `✅ Đã call **${intent.symbol} ${dir}** $${intent.price.toLocaleString()} x${result.leverage}` };
    }

    case 'follow': {
      const callId = await resolveCallId(callService, guildId, intent.symbol);
      if (!callId) return { success: false, message: `❌ Không tìm thấy kèo **${intent.symbol}** đang active.` };
      const result = await callService.joinCall({ callId, guildId, userId, username, entryPrice: intent.entry, leverage: intent.leverage });
      if ('error' in result) return { success: false, message: `❌ ${result.error}` };
      return { success: true, message: `✅ Đã follow kèo **${intent.symbol}** entry $${intent.entry.toLocaleString()} x${result.position.leverage}` };
    }

    case 'cl':
    case 'tp':
    case 'sl': {
      const callId = await resolveCallId(callService, guildId, intent.symbol);
      if (!callId) return { success: false, message: `❌ Không tìm thấy kèo **${intent.symbol}** đang active.` };
      const result = await callService.closeUserPosition({ guildId, userId, username, callId, closeType: intent.command });
      if ('error' in result) return { success: false, message: `❌ ${result.error}` };
      const typeLabel = intent.command === 'tp' ? 'Take Profit' : intent.command === 'sl' ? 'Stop Loss' : 'Cut Loss';
      const pnl = result.position.pnlPct ?? 0;
      const sign = pnl >= 0 ? '+' : '';
      return { success: true, message: `✅ **${typeLabel}** kèo ${intent.symbol} — P&L: **${sign}${pnl.toFixed(2)}%**` };
    }

    case 'follow-update': {
      const callId = await resolveCallId(callService, guildId, intent.symbol);
      if (!callId) return { success: false, message: `❌ Không tìm thấy kèo **${intent.symbol}** đang active.` };
      if (intent.entry) {
        const r = await callService.updatePositionEntry(callId, userId, intent.entry);
        if ('error' in r) return { success: false, message: `❌ ${r.error}` };
      }
      if (intent.leverage) {
        const r = await callService.updatePositionLeverage(callId, userId, intent.leverage);
        if ('error' in r) return { success: false, message: `❌ ${r.error}` };
      }
      return { success: true, message: `✅ Đã cập nhật follow kèo **${intent.symbol}**` };
    }

    case 'call-update': {
      const callId = await resolveCallId(callService, guildId, intent.symbol);
      if (!callId) return { success: false, message: `❌ Không tìm thấy kèo **${intent.symbol}** đang active.` };
      if (intent.price) await callService.updateCallPrice(callId, intent.price);
      if (intent.leverage) await callService.updateCallLeverage(callId, intent.leverage);
      return { success: true, message: `✅ Đã cập nhật kèo **${intent.symbol}**` };
    }

    // ─── Read-only ────────────────────────────────────────────────────────────

    case 'positions': {
      const calls = await callService.getActiveCallsWithPositions(guildId);
      const userPositions = calls.flatMap((c) =>
        c.positions.filter((p) => p.userId === userId && !p.closedAt).map((p) => ({ p, c })),
      );
      if (userPositions.length === 0) {
        return { success: true, message: '📭 Bạn chưa có lệnh nào đang mở.' };
      }
      const lines = userPositions.map(({ p, c }) => {
        const dir = c.direction === 'long' ? '📈' : '📉';
        const pnl = p.pnlPct != null ? ` | P&L: ${p.pnlPct >= 0 ? '+' : ''}${p.pnlPct.toFixed(2)}%` : '';
        return `${dir} **${c.symbol}** x${p.leverage} @ $${p.entryPrice.toLocaleString()}${pnl}`;
      });
      return { success: true, message: `📊 **Lệnh đang mở (${userPositions.length}):**\n${lines.join('\n')}` };
    }

    case 'coin': {
      if (!marketService) return { success: false, message: '❌ Market service không khả dụng.' };
      const data = await marketService.getCoinBySymbol(intent.symbol);
      if (!data) return { success: false, message: `❌ Không tìm thấy coin **${intent.symbol}**.` };
      const change = data.priceChangePercentage24h >= 0 ? `+${data.priceChangePercentage24h.toFixed(2)}%` : `${data.priceChangePercentage24h.toFixed(2)}%`;
      return {
        success: true,
        message: `💰 **${data.symbol}** — $${data.currentPrice.toLocaleString()} (${change} 24h) | MCap: $${(data.marketCap / 1e9).toFixed(2)}B`,
      };
    }

    case 'top': {
      if (!marketService) return { success: false, message: '❌ Market service không khả dụng.' };
      const coins = await marketService.getTopCoins(5);
      const lines = coins.map((c, i) => {
        const change = c.priceChangePercentage24h >= 0 ? `+${c.priceChangePercentage24h.toFixed(2)}%` : `${c.priceChangePercentage24h.toFixed(2)}%`;
        return `${i + 1}. **${c.symbol}** $${c.currentPrice.toLocaleString()} (${change})`;
      });
      return { success: true, message: `🏆 **Top 5 coins:**\n${lines.join('\n')}` };
    }

    case 'movers': {
      if (!marketService) return { success: false, message: '❌ Market service không khả dụng.' };
      const coins = await marketService.getTopGainers(5);
      const lines = coins.map((c, i) => {
        const change = `+${c.priceChangePercentage24h.toFixed(2)}%`;
        return `${i + 1}. **${c.symbol}** $${c.currentPrice.toLocaleString()} (${change})`;
      });
      return { success: true, message: `🚀 **Top movers hôm nay:**\n${lines.join('\n')}` };
    }

    case 'watch-list': {
      return { success: true, message: '📋 Dùng lệnh `/watch-list` để xem danh sách theo dõi nhé.' };
    }

    case 'alert-list': {
      return { success: true, message: '🔔 Dùng lệnh `/alert-list` để xem danh sách cảnh báo nhé.' };
    }

    case 'funding': {
      if (!marketService) return { success: false, message: '❌ Market service không khả dụng.' };
      const symbol = intent.symbol ?? 'BTC';
      const data = await marketService.getLinearFunding(symbol);
      if (!data) return { success: false, message: `❌ Không lấy được funding rate cho **${symbol}**.` };
      const rate = (data.fundingRate * 100).toFixed(4);
      const sign = data.fundingRate >= 0 ? '+' : '';
      return { success: true, message: `💸 **${symbol}** Funding Rate: **${sign}${rate}%**` };
    }

    default:
      return { success: false, message: '❌ Không hiểu lệnh. Thử lại nhé.' };
  }
}
