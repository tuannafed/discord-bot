import { TextChannel } from 'discord.js';
import { CallService } from './call.service.js';
import { type VoiceIntent } from './voice-intent.service.js';

type ExecuteResult = { success: true; message: string } | { success: false; message: string };

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
  },
): Promise<ExecuteResult> {
  const { guildId, userId, username, callService } = context;

  switch (intent.command) {
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

    default:
      return { success: false, message: '❌ Không hiểu lệnh. Thử lại nhé.' };
  }
}
