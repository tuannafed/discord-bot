import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { CoinMarketData } from '../types/coin.js';
import { formatPriceFixed, formatMarketCapFixed, formatChangeFixed } from '../utils/format.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
}

const TIMEFRAME_LABEL: Record<string, string> = {
  '15': '15m',
  '60': '1h',
  '240': '4h',
  'D': '24h',
};

export const data = new SlashCommandBuilder()
  .setName('movers')
  .setDescription('Top gainers and losers by timeframe')
  .addStringOption((opt) =>
    opt
      .setName('timeframe')
      .setDescription('Timeframe for % change (default: 24h)')
      .addChoices(
        { name: '15 minutes', value: '15' },
        { name: '1 hour',     value: '60' },
        { name: '4 hours',    value: '240' },
        { name: '24 hours',   value: 'D' }
      )
  )
  .addStringOption((opt) =>
    opt
      .setName('type')
      .setDescription('Show gainers, losers, or both (default: both)')
      .addChoices(
        { name: 'Both',    value: 'both' },
        { name: 'Gainers', value: 'gainers' },
        { name: 'Losers',  value: 'losers' }
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
  const rows = coins.map((coin, i) => {
    const arrow = coin.priceChangePercentage24h >= 0 ? '▲' : '▼';
    return `${String(i + 1).padStart(2)}. ${coin.symbol.toUpperCase().padEnd(5)} ${formatPriceFixed(coin.currentPrice)} ${formatMarketCapFixed(coin.marketCap)} ${arrow}${formatChangeFixed(coin.priceChangePercentage24h)}`;
  });
  return '```\n' + rows.join('\n') + '\n```';
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const timeframe = interaction.options.getString('timeframe') ?? 'D';
  const type = interaction.options.getString('type') ?? 'both';
  const limit = interaction.options.getInteger('limit') ?? 5;
  const label = TIMEFRAME_LABEL[timeframe];

  // 15m/1h kline requires fetching per-symbol — warn user it may take a moment
  await interaction.deferReply();

  // For 24h use cached futures data, otherwise fetch kline
  const interval = timeframe === 'D' ? undefined : timeframe;

  const embed = new EmbedBuilder()
    .setTitle(`Top Movers — ${label}`)
    .setColor(0x5865f2)
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  if (type === 'gainers' || type === 'both') {
    const gainers = await marketService.getTopGainers(limit, interval);
    embed.addFields({
      name: `📈 Top ${limit} Gainers (${label})`,
      value: gainers.length > 0 ? buildLines(gainers) : 'No data available',
    });
  }

  if (type === 'losers' || type === 'both') {
    const losers = await marketService.getTopLosers(limit, interval);
    embed.addFields({
      name: `📉 Top ${limit} Losers (${label})`,
      value: losers.length > 0 ? buildLines(losers) : 'No data available',
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
