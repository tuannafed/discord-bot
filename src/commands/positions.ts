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

function pnlLabel(pos: Position, call: CallWithPositions, currentPrice: number): string {
  if (pos.closedAt !== null) {
    const pct = pos.pnlPct ?? 0;
    const sign = pct >= 0 ? '+' : '';
    const icon = pos.closeType === 'tp' ? '✅TP' : '❌CL';
    return `${icon} ${sign}${pct.toFixed(2)}%`;
  }
  const pnl = call.direction === 'long'
    ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
    : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;
  const sign = pnl >= 0 ? '+' : '';
  return `🟡 ${sign}${pnl.toFixed(2)}%`;
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

    if (call.positions.length === 0) {
      embed.addFields({
        name: `${call.symbol} ${dirEmoji} @ $${call.callPrice.toLocaleString('en-US')}${priceStr}`,
        value: '_Chưa có ai join_',
      });
    } else {
      const lines = call.positions.map((pos) => {
        const label = pnlLabel(pos, call, currentPrice);
        return `**${pos.username}** entry $${pos.entryPrice.toLocaleString('en-US')} → ${label}`;
      });
      embed.addFields({
        name: `${call.symbol} ${dirEmoji} @ $${call.callPrice.toLocaleString('en-US')}${priceStr}`,
        value: lines.join('\n'),
      });
    }
  }

  embed.setFooter({ text: `ID kèo: ${callsWithPositions.map((c) => c.id.slice(0, 8)).join(', ')}` });

  await interaction.editReply({ embeds: [embed] });
}
