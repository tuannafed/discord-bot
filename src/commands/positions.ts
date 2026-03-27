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

function buildContent(positions: Position[], call: CallWithPositions, currentPrice: number): string {
  const callerRow: Position = {
    id: '', callId: call.id, guildId: call.guildId, userId: call.calledById,
    username: call.calledBy, entryPrice: call.callPrice, leverage: call.leverage,
    joinedAt: call.calledAt, closedAt: null, closeType: null, closePrice: null,
    pnlPct: null, notifiedMilestones: '',
  };
  const allRows = [callerRow, ...positions];

  const NAME_W = 8;

  // Info table (no PnL)
  const tableHeader = `#   ${'Name'.padEnd(NAME_W)}  ${'Entry'.padStart(7)}  Lev`;
  const tableSep = '-'.repeat(tableHeader.length);
  const tableRows = allRows.map((pos, i) => {
    const label = String(i + 1).padStart(2);
    const name = pos.username.length > NAME_W ? pos.username.slice(0, NAME_W) : pos.username.padEnd(NAME_W);
    const price = pos.entryPrice < 1
      ? `$${pos.entryPrice.toFixed(3)}`
      : `$${pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
    return `${label}  ${name}  ${price.padStart(7)}  ${pos.leverage}`;
  });
  const table = '```\n' + [tableHeader, tableSep, ...tableRows].join('\n') + '\n```';

  // PnL list with emoji
  const pnlLines = allRows.map((pos, i) => {
    const pnlResult = calcPnl(pos, call, currentPrice);
    const label = String(i + 1).padStart(2);
    const name = pos.username.length > NAME_W ? pos.username.slice(0, NAME_W) : pos.username.padEnd(NAME_W);

    if (pnlResult.status === 'na') {
      return `⬜ ${label}  ${name}  N/A`;
    }
    const { pct, status } = pnlResult as { pct: number; status: string };
    const sign = pct >= 0 ? '+' : '';
    const emoji = pct >= 0 ? '🟢' : '🔴';
    const pnlStr = status === 'TP'
      ? `${sign}${pct.toFixed(2)}% TP`
      : status === 'CL'
        ? `${sign}${pct.toFixed(2)}% CL`
        : `${sign}${pct.toFixed(2)}%`;
    return `${emoji} ${label}  ${name}  **${pnlStr}**`;
  });

  return table + '\n' + pnlLines.join('\n');
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

  const symbols = [...new Set(callsWithPositions.map((c) => c.symbol))];
  const priceMap = await marketService.getLivePrices(symbols);

  const embed = new EmbedBuilder()
    .setTitle('📊 Active Calls')
    .setColor(0x5865f2)
    .setTimestamp();

  for (const call of callsWithPositions) {
    const currentPrice = priceMap.get(call.symbol) ?? 0;
    const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
    const priceStr = currentPrice > 0 ? ` · **${formatPrice(currentPrice)}**` : '';
    const fieldName = `${call.symbol} ${dirEmoji} x${call.leverage}${priceStr}`;

    if (call.positions.length === 0) {
      embed.addFields({ name: fieldName, value: '_Chưa có ai join_' });
    } else {
      embed.addFields({ name: fieldName, value: buildContent(call.positions, call, currentPrice) });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
