import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { CallService } from '../services/call.service.js';
import { MarketService } from '../services/market.service.js';
import { formatPrice } from '../utils/format.js';
import { buildPositionsTableContent, formatFundingSnippet } from './positions.js';

let callService: CallService;
let marketService: MarketService;

export function init(cService: CallService, mService: MarketService): void {
  callService = cService;
  marketService = mService;
}

export const data = new SlashCommandBuilder()
  .setName('positions-history')
  .setDescription('Kèo active — đầy đủ mọi thành viên (kể cả đã TP / CL / SL)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const callsWithPositions = await callService.getActiveCallsWithPositions(interaction.guildId!);

  if (callsWithPositions.length === 0) {
    await interaction.editReply('Không có kèo nào đang active.');
    return;
  }

  const symbols = [...new Set(callsWithPositions.map((c) => c.symbol))];
  const [priceMap, fundingMap] = await Promise.all([
    marketService.getLivePrices(symbols),
    Promise.all(symbols.map(async (sym) => [sym, await marketService.getLinearFunding(sym)] as const)).then(
      (pairs) => new Map(pairs),
    ),
  ]);

  const embed = new EmbedBuilder()
    .setTitle('📊 Kèo active — đầy đủ')
    .setColor(0xeb459e)
    .setTimestamp();

  for (const call of callsWithPositions) {
    const currentPrice = priceMap.get(call.symbol) ?? 0;
    const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
    const priceStr = currentPrice > 0 ? ` · **${formatPrice(currentPrice)}**` : '';
    const fieldName = `${call.symbol} ${dirEmoji} x${call.leverage}${priceStr}`;
    const fundingDesc = formatFundingSnippet(fundingMap.get(call.symbol));
    const body = buildPositionsTableContent(call.positions, call, currentPrice);
    embed.addFields({ name: fieldName, value: `${fundingDesc}${body}` });
  }

  await interaction.editReply({ embeds: [embed] });
}
