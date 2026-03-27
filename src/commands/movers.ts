import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { CoinMarketData } from '../types/coin.js';
import { formatPrice, formatMarketCap, formatChangeFixed } from '../utils/format.js';

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
      .setName('metric')
      .setDescription('What to rank by (default: price)')
      .addChoices(
        { name: 'Price',      value: 'price' },
        { name: 'Market Cap', value: 'cap' }
      )
  )
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
  )
  .addNumberOption((opt) =>
    opt
      .setName('min_cap')
      .setDescription('Lọc theo market cap tối thiểu, tính bằng triệu $ (e.g. 30 = $30M)')
  )
  .addNumberOption((opt) =>
    opt
      .setName('max_cap')
      .setDescription('Lọc theo market cap tối đa, tính bằng triệu $ (e.g. 500 = $500M)')
  );

function getPrev(current: number, pct: number): number {
  return pct === -100 ? 0 : current / (1 + pct / 100);
}

function buildPriceLines(coins: CoinMarketData[], label: string): string {
  const header = `${'#'.padEnd(3)} ${'SYM'.padEnd(6)} ${'PREV ' + label}  ${'NOW'.padEnd(10)} ${'CHG'.padStart(7)}`;
  const sep = '-'.repeat(header.length);
  const rows = coins.map((coin, i) => {
    const prevVal = coin.prevPrice ?? getPrev(coin.currentPrice, coin.priceChangePercentage24h);
    const prev = formatPrice(prevVal);
    const now = formatPrice(coin.currentPrice);
    const arrow = coin.priceChangePercentage24h >= 0 ? '▲' : '▼';
    return `${String(i + 1).padStart(2)}. ${coin.symbol.toUpperCase().padEnd(6)} ${prev.padEnd(10)} ${now.padEnd(10)} ${arrow}${formatChangeFixed(coin.priceChangePercentage24h)}`;
  });
  return '```\n' + header + '\n' + sep + '\n' + rows.join('\n') + '\n```';
}

function buildCapLines(coins: CoinMarketData[], label: string): string {
  const header = `${'#'.padEnd(3)} ${'SYM'.padEnd(6)} ${'PREV ' + label}  ${'NOW'.padEnd(8)} ${'CHG'.padStart(7)}`;
  const sep = '-'.repeat(header.length);
  const rows = coins.map((coin, i) => {
    const prevVal = coin.prevMarketCap ?? getPrev(coin.marketCap, coin.priceChangePercentage24h);
    const prev = formatMarketCap(prevVal);
    const now = formatMarketCap(coin.marketCap);
    const arrow = coin.priceChangePercentage24h >= 0 ? '▲' : '▼';
    return `${String(i + 1).padStart(2)}. ${coin.symbol.toUpperCase().padEnd(6)} ${prev.padEnd(8)} ${now.padEnd(8)} ${arrow}${formatChangeFixed(coin.priceChangePercentage24h)}`;
  });
  return '```\n' + header + '\n' + sep + '\n' + rows.join('\n') + '\n```';
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const metric = interaction.options.getString('metric') ?? 'price';
  const timeframe = interaction.options.getString('timeframe') ?? 'D';
  const type = interaction.options.getString('type') ?? 'both';
  const limit = interaction.options.getInteger('limit') ?? 5;
  const minCapInput = interaction.options.getNumber('min_cap');
  const maxCapInput = interaction.options.getNumber('max_cap');
  const minCap = minCapInput != null ? minCapInput * 1_000_000 : undefined;
  const maxCap = maxCapInput != null ? maxCapInput * 1_000_000 : undefined;
  const label = TIMEFRAME_LABEL[timeframe];

  await interaction.deferReply();

  const interval = timeframe === 'D' ? undefined : timeframe;
  const buildLines = metric === 'cap'
    ? (coins: CoinMarketData[]) => buildCapLines(coins, label)
    : (coins: CoinMarketData[]) => buildPriceLines(coins, label);

  const descParts = [
    `Timeframe: **${label}**`,
    ...(minCapInput != null ? [`Min Cap: **$${minCapInput}M**`] : []),
    ...(maxCapInput != null ? [`Max Cap: **$${maxCapInput}M**`] : []),
  ];

  const embed = new EmbedBuilder()
    .setTitle(`Top Movers — ${label} (${metric === 'cap' ? 'Market Cap' : 'Price'})`)
    .setDescription(descParts.join('  ·  '))
    .setColor(0x5865f2)
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  if (type === 'gainers' || type === 'both') {
    const gainers = await marketService.getTopGainers(limit, interval, minCap, maxCap);
    embed.addFields({
      name: `📈 Top ${limit} Gainers (${label})`,
      value: gainers.length > 0 ? buildLines(gainers) : 'No data available',
    });
  }

  if (type === 'losers' || type === 'both') {
    const losers = await marketService.getTopLosers(limit, interval, minCap, maxCap);
    embed.addFields({
      name: `📉 Top ${limit} Losers (${label})`,
      value: losers.length > 0 ? buildLines(losers) : 'No data available',
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
