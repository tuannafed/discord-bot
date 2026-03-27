import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { CallService } from '../services/call.service.js';
import { MarketService } from '../services/market.service.js';
import { CallWithPositions, Position } from '../types/call.js';
import { formatPrice } from '../utils/format.js';

let callService: CallService;
let marketService: MarketService;

export function init(cService: CallService, mService: MarketService): void {
  callService = cService;
  marketService = mService;
}

function calcPnl(pos: Position, call: CallWithPositions, currentPrice: number): { pct: number; status: string } | { status: 'na' } {
  if (pos.closedAt !== null) {
    // Closed PnL already has leverage applied when saved
    const pct = pos.pnlPct ?? 0;
    return { pct, status: pos.closeType === 'tp' ? 'TP' : 'CL' };
  }
  if (currentPrice <= 0) return { status: 'na' };
  const rawPct = call.direction === 'long'
    ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
    : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;
  const pct = rawPct * pos.leverage;
  return { pct, status: 'open' };
}

function buildTable(positions: Position[], call: CallWithPositions, currentPrice: number): string {
  // Caller row uses call price and call leverage
  const callerRow: Position = {
    id: '', callId: call.id, guildId: call.guildId, userId: call.calledById,
    username: call.calledBy, entryPrice: call.callPrice, leverage: call.leverage,
    joinedAt: call.calledAt, closedAt: null, closeType: null, closePrice: null,
    pnlPct: null, notifiedMilestones: '',
  };
  const allRows = [callerRow, ...positions];

  const NAME_W = Math.max(4, ...allRows.map((p) => p.username.length));
  const header = `#  ${'Name'.padEnd(NAME_W)}  ${'Entry'.padStart(10)}  Lev   PnL`;
  const sep = '-'.repeat(header.length);

  const rows = allRows.map((pos, i) => {
    const label = String(i + 1).padStart(2);
    const pnlResult = calcPnl(pos, call, currentPrice);
    let pnlStr: string;
    if (pnlResult.status === 'na') {
      pnlStr = 'N/A';
    } else {
      const { pct, status } = pnlResult as { pct: number; status: string };
      const sign = pct >= 0 ? '+' : '';
      pnlStr = status === 'TP'
        ? `${sign}${pct.toFixed(2)}% TP`
        : status === 'CL'
          ? `${sign}${pct.toFixed(2)}% CL`
          : `${sign}${pct.toFixed(2)}%`;
    }
    const entry = formatPrice(pos.entryPrice);
    const lev = `x${pos.leverage}`.padEnd(5);
    return `${label}  ${pos.username.padEnd(NAME_W)}  ${entry.padStart(10)}  ${lev} ${pnlStr}`;
  });
  return '```\n' + [header, sep, ...rows].join('\n') + '\n```';
}

export const data = new SlashCommandBuilder()
  .setName('positions')
  .setDescription('Xem tất cả kèo active và danh sách thành viên đang theo');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const callsWithPositions = await callService.getActiveCallsWithPositions(interaction.guildId!);

  if (callsWithPositions.length === 0) {
    await interaction.editReply('Không có kèo nào đang active.');
    return;
  }

  // Fetch live prices directly from Bybit (no cache)
  const symbols = [...new Set(callsWithPositions.map((c) => c.symbol))];
  const priceMap = await marketService.getLivePrices(symbols);

  const embed = new EmbedBuilder()
    .setTitle('📊 Active Calls')
    .setColor(0x5865f2)
    .setTimestamp();

  for (const call of callsWithPositions) {
    const currentPrice = priceMap.get(call.symbol) ?? 0;
    const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
    const priceStr = currentPrice > 0 ? ` · Market Price Now: ${formatPrice(currentPrice)}` : '';

    const header = `${call.symbol} ${dirEmoji} x${call.leverage}${priceStr}`;

    if (call.positions.length === 0) {
      embed.addFields({ name: header, value: '_Chưa có ai join_' });
    } else {
      embed.addFields({ name: header, value: buildTable(call.positions, call, currentPrice) });
    }
  }
  await interaction.editReply({ embeds: [embed] });
}
