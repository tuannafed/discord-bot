import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { formatPrice, formatMarketCap, formatChange, formatChangeEmoji } from '../utils/format.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
}

export const data = new SlashCommandBuilder()
  .setName('coin')
  .setDescription('Get market data for a coin')
  .addStringOption((opt) =>
    opt.setName('symbol').setDescription('Coin symbol (e.g. btc, eth)').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true).toLowerCase();

  await interaction.deferReply();

  const coin = await marketService.getCoinBySymbol(symbol);
  if (!coin) {
    await interaction.editReply(`Coin with symbol **${symbol.toUpperCase()}** not found.`);
    return;
  }

  const emoji = formatChangeEmoji(coin.priceChangePercentage24h);
  const embed = new EmbedBuilder()
    .setTitle(`${coin.name} (${coin.symbol.toUpperCase()})`)
    .setColor(coin.priceChangePercentage24h >= 0 ? 0x00cc66 : 0xff4444)
    .addFields(
      { name: 'Price', value: formatPrice(coin.currentPrice), inline: true },
      { name: 'Market Cap', value: formatMarketCap(coin.marketCap), inline: true },
      { name: 'Rank', value: `#${coin.marketCapRank}`, inline: true },
      { name: '24h Change', value: `${emoji} ${formatChange(coin.priceChangePercentage24h)}`, inline: true }
    )
    .setFooter({ text: 'Data from CoinGecko' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
