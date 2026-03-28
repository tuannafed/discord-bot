import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { CoinGeckoProvider } from '../providers/coingecko.provider.js';
import { formatMarketCap } from '../utils/format.js';

let cgProvider: CoinGeckoProvider;

export function init(provider: CoinGeckoProvider): void {
  cgProvider = provider;
}

const TIMEFRAME_CHOICES = [
  { name: '1 giờ', value: '1h' },
  { name: '2 giờ', value: '2h' },
  { name: '4 giờ', value: '4h' },
  { name: '6 giờ', value: '6h' },
  { name: '12 giờ', value: '12h' },
  { name: '1 ngày', value: '1d' },
  { name: '2 ngày', value: '2d' },
  { name: '3 ngày', value: '3d' },
  { name: '7 ngày', value: '7d' },
  { name: '1 tháng', value: '1mon' },
  { name: '2 tháng', value: '2mon' },
  { name: '3 tháng', value: '3mon' },
  { name: '6 tháng', value: '6mon' },
];

export const data = new SlashCommandBuilder()
  .setName('market')
  .setDescription('Tổng quan thị trường (TOTAL, BTC.D, TOTAL2, TOTAL3, OTHERS)')
  .addStringOption((opt) =>
    opt
      .setName('timeframe')
      .setDescription('Khung so sánh với trước đó (mặc định: 1 giờ)')
      .addChoices(...TIMEFRAME_CHOICES)
  );

function formatChange(current: number, prev: number): string {
  if (prev <= 0) return 'N/A';
  const pct = ((current - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatDominance(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

function formatDominanceChange(current: number, prev: number): string {
  if (prev <= 0) return 'N/A';
  const diff = current - prev;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(2)}pp`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const timeframe = interaction.options.getString('timeframe') ?? '1h';

  await interaction.deferReply();

  const { current, prev } = await cgProvider.getMarketMetrics(timeframe);

  const tfLabel = TIMEFRAME_CHOICES.find((c) => c.value === timeframe)?.name ?? timeframe;

  const rows = [
    {
      label: 'TOTAL',
      prev: formatMarketCap(prev.total),
      now: formatMarketCap(current.total),
      chg: formatChange(current.total, prev.total),
    },
    {
      label: 'BTC.D',
      prev: formatDominance(prev.btcDominance),
      now: formatDominance(current.btcDominance),
      chg: formatDominanceChange(current.btcDominance, prev.btcDominance),
    },
    {
      label: 'TOTAL2',
      prev: formatMarketCap(prev.total2),
      now: formatMarketCap(current.total2),
      chg: formatChange(current.total2, prev.total2),
    },
    {
      label: 'TOTAL3',
      prev: formatMarketCap(prev.total3),
      now: formatMarketCap(current.total3),
      chg: formatChange(current.total3, prev.total3),
    },
    {
      label: 'OTHERS',
      prev: formatMarketCap(prev.others),
      now: formatMarketCap(current.others),
      chg: formatChange(current.others, prev.others),
    },
    {
      label: 'OTHERS.D',
      prev: formatDominance(prev.othersDominance),
      now: formatDominance(current.othersDominance),
      chg: formatDominanceChange(current.othersDominance, prev.othersDominance),
    },
  ];

  const chgSign = (chg: string) => chg.startsWith('+') || chg.startsWith('▲') ? '🟢' : chg.startsWith('-') || chg.startsWith('▼') ? '🔴' : '⚪';

  const embed = new EmbedBuilder()
    .setTitle('🌐 Tổng quan thị trường')
    .setDescription(`Khung thời gian: **${tfLabel}**`)
    .setColor(0x5865f2)
    .addFields(
      ...rows.map((r) => ({
        name: r.label,
        value: `${r.prev} → **${r.now}**  ${chgSign(r.chg)} ${r.chg}`,
        inline: false,
      }))
    )
    .setFooter({ text: 'Dữ liệu CoinGecko · BTC.D thay đổi theo điểm phần trăm (pp)' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
