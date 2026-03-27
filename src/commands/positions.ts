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
    return { pct, status: pos.closeType === 'tp' ? 'TP' : pos.closeType === 'sl' ? 'SL' : 'CL' };
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
    joinedAt: call.calledAt,
    closedAt: call.callerClosedAt,
    closeType: call.callerCloseType,
    closePrice: call.callerClosePrice,
    pnlPct: call.callerPnlPct,
    notifiedMilestones: '', mutedMilestones: false,
  };
  const allRows = [callerRow, ...positions.filter((p) => p.userId !== call.calledById)];

  const NAME_W = 6;
  const header = `${'Name'.padEnd(NAME_W)}  ${'Entry'.padStart(10)}  Lev  PnL`;
  const sep = '-'.repeat(header.length + 2); // +2 for emoji prefix width

  const rows = allRows.map((pos) => {
    const pnlResult = calcPnl(pos, call, currentPrice);
    const name = pos.username.slice(0, NAME_W).padEnd(NAME_W);
    const price = formatPrice(pos.entryPrice);
    const lev = String(pos.leverage).padEnd(4);

    let emoji = '⬜';
    let pnlStr = 'N/A';
    if (pnlResult.status !== 'na') {
      const { pct, status } = pnlResult as { pct: number; status: string };
      const sign = pct >= 0 ? '+' : '';
      const pctRounded = Math.round(pct);
      if (status === 'TP') {
        emoji = '✅';
        pnlStr = `${sign}${pctRounded}%TP`;
      } else if (status === 'SL') {
        emoji = '🟥';
        pnlStr = `${sign}${pctRounded}%SL`;
      } else if (status === 'CL') {
        emoji = '❌';
        pnlStr = `${sign}${pctRounded}%CL`;
      } else {
        emoji = pct >= 0 ? '🟢' : '🔴';
        pnlStr = `${sign}${pctRounded}%`;
      }
    }

    return `${emoji} ${name}  ${price.padStart(10)}  ${lev} ${pnlStr}`;
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

    embed.addFields({ name: fieldName, value: buildContent(call.positions, call, currentPrice) });
  }

  await interaction.editReply({ embeds: [embed] });
}
