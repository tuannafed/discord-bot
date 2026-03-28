import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { formatSupply } from '../utils/format.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
}

export const data = new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('Cung cấp token & lịch mở khóa (unlock) tổng quan')
  .addStringOption((opt) =>
    opt.setName('symbol').setDescription('Ký hiệu coin (vd: apt, arb)').setRequired(true)
  );

function pct(part: number, total: number): string {
  if (total <= 0) return '—';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function progressBar(ratio: number, width = 20): string {
  const filled = Math.round(Math.min(Math.max(ratio, 0), 1) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true).toLowerCase();

  await interaction.deferReply();

  const coin = await marketService.getCoinBySymbol(symbol);
  if (!coin) {
    await interaction.editReply(`Coin **${symbol.toUpperCase()}** not found.`);
    return;
  }

  const circ = coin.circulatingSupply ?? 0;
  const total = coin.totalSupply ?? 0;
  const max = coin.maxSupply ?? null;
  const isInfinite = max == null;

  // Locked = issued but not yet circulating
  const locked = total > circ ? total - circ : 0;
  // Not yet issued = max - total
  const notIssued = max != null && max > total ? max - total : 0;

  const base = max ?? total;
  const circRatio = base > 0 ? circ / base : 0;

  const lines: string[] = [];

  lines.push(`Circulating : ${formatSupply(circ).padEnd(10)} (${pct(circ, base)} of ${isInfinite ? 'total' : 'max'})`);

  if (locked > 0) {
    lines.push(`Locked      : ${formatSupply(locked).padEnd(10)} (${pct(locked, base)} of ${isInfinite ? 'total' : 'max'})`);
  }

  lines.push(`Total issued: ${formatSupply(total).padEnd(10)}${max != null ? ` (${pct(total, max)} of max)` : ''}`);

  if (max != null) {
    lines.push(`Max supply  : ${formatSupply(max)}`);
    if (notIssued > 0) {
      lines.push(`Not issued  : ${formatSupply(notIssued).padEnd(10)} (${pct(notIssued, max)} of max)`);
    }
  } else {
    lines.push(`Max supply  : ∞ (no cap)`);
  }

  lines.push('');
  lines.push(`Unlock progress (circ / ${isInfinite ? 'total' : 'max'}):`);
  lines.push(`[${progressBar(circRatio)}] ${pct(circ, base)}`);

  const embed = new EmbedBuilder()
    .setTitle(`🔓 ${coin.name} (${coin.symbol.toUpperCase()}) — Supply Overview`)
    .setColor(0x5865f2)
    .setDescription('```\n' + lines.join('\n') + '\n```')
    .setFooter({ text: 'Source: CoinMarketCap · Detailed unlock schedule requires DropsTab/CryptoRank' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
