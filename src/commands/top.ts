import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { formatPrice, formatMarketCap, formatChange, formatChangeEmoji } from '../utils/format.js';

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
    const emoji = formatChangeEmoji(coin.priceChangePercentage24h);
    return `\`${String(i + 1).padStart(2)}.\` **${coin.symbol.toUpperCase()}** 💰${formatPrice(coin.currentPrice)} · 📊${formatMarketCap(coin.marketCap)} · ${emoji} ${formatChange(coin.priceChangePercentage24h)}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`Top ${limit} Coins by Market Cap`)
    .setDescription(lines.join('\n'))
    .setColor(0x5865f2)
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
