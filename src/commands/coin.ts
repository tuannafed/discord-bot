import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { formatPrice, formatMarketCap, formatChange, formatSupply } from '../utils/format.js';

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

  const arrow = coin.priceChangePercentage24h >= 0 ? '▲' : '▼';
  const embed = new EmbedBuilder()
    .setTitle(`${coin.name} (${coin.symbol.toUpperCase()})`)
    .setColor(coin.priceChangePercentage24h >= 0 ? 0x00cc66 : 0xff4444)
    .setDescription(
      '```\n' +
      `Price    : ${formatPrice(coin.currentPrice)}\n` +
      `MCap     : ${formatMarketCap(coin.marketCap)}\n` +
      `Rank     : #${coin.marketCapRank}\n` +
      `24h      : ${arrow} ${formatChange(coin.priceChangePercentage24h)}\n` +
      `Circ.    : ${formatSupply(coin.circulatingSupply)}\n` +
      `Total    : ${formatSupply(coin.totalSupply)}\n` +
      `Max      : ${formatSupply(coin.maxSupply)}\n` +
      '```'
    )
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
