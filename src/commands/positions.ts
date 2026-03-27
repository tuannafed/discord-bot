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

function calcPnl(pos: Position, call: CallWithPositions, currentPrice: number): { pct: number; status: string } {
  if (pos.closedAt !== null) {
    const pct = pos.pnlPct ?? 0;
    return { pct, status: pos.closeType === 'tp' ? 'TP' : 'CL' };
  }
  const pct = call.direction === 'long'
    ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
    : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;
  return { pct, status: 'open' };
}

function buildTable(positions: Position[], call: CallWithPositions, currentPrice: number): string {
  const NAME_W = Math.max(4, ...positions.map((p) => p.username.length));
  const header = `#  ${'Name'.padEnd(NAME_W)}  ${'Entry'.padStart(10)}  PnL`;
  const sep = '-'.repeat(header.length);
  const rows = positions.map((pos, i) => {
    const { pct, status } = calcPnl(pos, call, currentPrice);
    const sign = pct >= 0 ? '+' : '';
    const pnlStr = status === 'TP'
      ? `${sign}${pct.toFixed(2)}% TP`
      : status === 'CL'
        ? `${sign}${pct.toFixed(2)}% CL`
        : `${sign}${pct.toFixed(2)}%`;
    const entry = `$${pos.entryPrice.toLocaleString('en-US')}`;
    return `${String(i + 1).padStart(2)}  ${pos.username.padEnd(NAME_W)}  ${entry.padStart(10)}  ${pnlStr}`;
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
    const priceStr = currentPrice > 0 ? ` · Now: ${formatPrice(currentPrice)}` : '';

    const shortId = call.id.slice(-6);
    const header = `${call.symbol} ${dirEmoji} @ $${call.callPrice.toLocaleString('en-US')}${priceStr} · call by <@${call.calledById}> · \`...${shortId}\``;

    if (call.positions.length === 0) {
      embed.addFields({ name: header, value: '_Chưa có ai join_' });
    } else {
      embed.addFields({ name: header, value: buildTable(call.positions, call, currentPrice) });
    }
  }

  embed.setFooter({ text: 'P&L tính theo entry từng người · giá realtime từ Bybit' });

  await interaction.editReply({ embeds: [embed] });
}
