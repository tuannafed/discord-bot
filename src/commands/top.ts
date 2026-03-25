import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { formatPriceFixed, formatMarketCapFixed, formatChangeFixed } from '../utils/format.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
}

export const data = new SlashCommandBuilder()
  .setName('top')
  .setDescription('Show top coins by market cap')
  .addIntegerOption((opt) =>
    opt
      .setName('limit')
      .setDescription('Number of coins to show (1-25, default 10)')
      .setMinValue(1)
      .setMaxValue(25)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const limit = interaction.options.getInteger('limit') ?? 10;

  await interaction.deferReply();

  const coins = await marketService.getTopCoins(limit);

  const lines = coins.map((coin, i) => {
    const arrow = coin.priceChangePercentage24h >= 0 ? '▲' : '▼';
    return `${String(i + 1).padStart(2)}. ${coin.symbol.toUpperCase().padEnd(7)} ${formatPriceFixed(coin.currentPrice)} ${formatMarketCapFixed(coin.marketCap)} ${arrow}${formatChangeFixed(coin.priceChangePercentage24h)}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`Top ${limit} Coins by Market Cap`)
    .setDescription('```\n' + lines.join('\n') + '\n```')
    .setColor(0x5865f2)
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
