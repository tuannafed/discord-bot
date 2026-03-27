import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { formatMarketCap, formatPriceFixed, formatMarketCapFixed, formatChangeFixed } from '../utils/format.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
}

export const data = new SlashCommandBuilder()
  .setName('scan')
  .setDescription('Find coins within a market cap range')
  .addNumberOption((opt) =>
    opt
      .setName('min_cap')
      .setDescription('Minimum market cap in triệu $ (e.g. 30 = $30M)')
      .setRequired(true)
  )
  .addNumberOption((opt) =>
    opt
      .setName('max_cap')
      .setDescription('Maximum market cap in triệu $ (e.g. 100 = $100M)')
      .setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('limit')
      .setDescription('Max results to show (1–25, default 10)')
      .setMinValue(1)
      .setMaxValue(25)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const minCap = interaction.options.getNumber('min_cap', true) * 1_000_000;
  const maxCap = interaction.options.getNumber('max_cap', true) * 1_000_000;
  const limit = interaction.options.getInteger('limit') ?? 10;

  if (minCap >= maxCap) {
    await interaction.reply({ content: '`min_cap` must be less than `max_cap`.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const coins = await marketService.scanByMarketCap(minCap, maxCap, limit);

  if (coins.length === 0) {
    await interaction.editReply(
      `No coins found with market cap between **${formatMarketCap(minCap)}** and **${formatMarketCap(maxCap)}**.\n` +
        `Try a wider range or note that the scan covers the top 500 coins by market cap.`
    );
    return;
  }

  const lines = coins.map((coin, i) => {
    const chg = formatChangeFixed(coin.priceChangePercentage24h);
    const arrow = coin.priceChangePercentage24h >= 0 ? '▲' : '▼';
    return `${String(i + 1).padStart(2)}. ${coin.symbol.toUpperCase().slice(0, 5).padEnd(5)} ${formatPriceFixed(coin.currentPrice)} ${formatMarketCapFixed(coin.marketCap)} ${arrow}${chg}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`Coins with Market Cap ${formatMarketCap(minCap)} – ${formatMarketCap(maxCap)}`)
    .setDescription('```\n' + lines.join('\n') + '\n```')
    .setColor(0x1abc9c)
    .setFooter({ text: `${coins.length} result${coins.length !== 1 ? 's' : ''} · Bybit-listed coins only · Market cap from CoinMarketCap` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
