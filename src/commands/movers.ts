import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { CoinMarketData } from '../types/coin.js';
import { formatPrice, formatMarketCap, formatChange, formatChangeEmoji } from '../utils/format.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
}

export const data = new SlashCommandBuilder()
  .setName('movers')
  .setDescription('Top gainers and losers in the last 24h')
  .addStringOption((opt) =>
    opt
      .setName('type')
      .setDescription('Show gainers, losers, or both (default: both)')
      .addChoices(
        { name: 'Both', value: 'both' },
        { name: 'Gainers', value: 'gainers' },
        { name: 'Losers', value: 'losers' }
      )
  )
  .addIntegerOption((opt) =>
    opt
      .setName('limit')
      .setDescription('Number of coins per category (1-10, default 5)')
      .setMinValue(1)
      .setMaxValue(10)
  );

function buildLines(coins: CoinMarketData[]): string {
  return coins
    .map((coin, i) => {
      const emoji = formatChangeEmoji(coin.priceChangePercentage24h);
      return `\`${String(i + 1).padStart(2)}.\` **${coin.symbol.toUpperCase()}** 💰${formatPrice(coin.currentPrice)} · 📊${formatMarketCap(coin.marketCap)} · ${emoji} ${formatChange(coin.priceChangePercentage24h)}`;
    })
    .join('\n');
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const type = interaction.options.getString('type') ?? 'both';
  const limit = interaction.options.getInteger('limit') ?? 5;

  await interaction.deferReply();

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  if (type === 'gainers' || type === 'both') {
    const gainers = await marketService.getTopGainers(limit);
    embed.addFields({
      name: `📈 Top ${limit} Gainers (24h)`,
      value: gainers.length > 0 ? buildLines(gainers) : 'No data available',
    });
  }

  if (type === 'losers' || type === 'both') {
    const losers = await marketService.getTopLosers(limit);
    embed.addFields({
      name: `📉 Top ${limit} Losers (24h)`,
      value: losers.length > 0 ? buildLines(losers) : 'No data available',
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
