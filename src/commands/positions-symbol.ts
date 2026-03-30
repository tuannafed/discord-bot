import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, APIEmbed } from 'discord.js';
import { CallService } from '../services/call.service.js';
import { MarketService } from '../services/market.service.js';
import {
  buildPositionsTableContent,
  buildCallerSection,
  formatFundingSnippet,
  BuildPositionsTableOptions,
  callEmbedColor,
} from './positions.js';
import { formatPrice } from '../utils/format.js';

let callService: CallService;
let marketService: MarketService;

export function init(cService: CallService, mService: MarketService): void {
  callService = cService;
  marketService = mService;
}

export const data = new SlashCommandBuilder()
  .setName('positions')
  .setDescription('Xem kèo theo coin symbol (hỗ trợ nhiều symbol, vd: BTC ETH SOL)')
  .addStringOption((opt) =>
    opt
      .setName('symbols')
      .setDescription('Ký hiệu coin, cách nhau bằng dấu cách (vd: BTC ETH SOL)')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const input = interaction.options.getString('symbols', true);
  const symbols = [...new Set(input.toUpperCase().split(/\s+/).filter(Boolean))];

  await interaction.deferReply();

  const allCalls = await callService.getActiveCallsWithPositions(interaction.guildId!);
  const filtered = allCalls.filter((c) => symbols.includes(c.symbol));

  if (filtered.length === 0) {
    const symList = symbols.join(', ');
    await interaction.editReply(`Không có kèo active nào cho **${symList}**.`);
    return;
  }

  const uniqueSymbols = [...new Set(filtered.map((c) => c.symbol))];
  const [priceMap, fundingMap] = await Promise.all([
    marketService.getLivePrices(uniqueSymbols),
    Promise.all(
      uniqueSymbols.map(async (sym) => [sym, await marketService.getLinearFunding(sym)] as const),
    ).then((pairs) => new Map(pairs)),
  ]);

  const embeds: APIEmbed[] = [];

  for (const call of filtered) {
    const currentPrice = priceMap.get(call.symbol) ?? 0;
    const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
    const priceStr = currentPrice > 0 ? ` · **${formatPrice(currentPrice)}**` : '';

    const fundingDesc = formatFundingSnippet(fundingMap.get(call.symbol));
    const callerSection = buildCallerSection(call, currentPrice);
    const table = buildPositionsTableContent(
      call.positions,
      call,
      currentPrice,
      { openOnly: true } as BuildPositionsTableOptions,
    );

    const embed = new EmbedBuilder()
      .setTitle(`${call.symbol} ${dirEmoji} x${call.leverage}${priceStr}`)
      .setColor(callEmbedColor(call.direction))
      .setDescription(`${fundingDesc}${callerSection}\n\n${table}`);

    embeds.push(embed.toJSON());
  }

  const BATCH = 10;
  for (let i = 0; i < embeds.length; i += BATCH) {
    const batch = embeds.slice(i, i + BATCH);
    if (i === 0) {
      await interaction.editReply({ embeds: batch });
    } else {
      await interaction.followUp({ embeds: batch });
    }
  }
}
