import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, APIEmbed } from 'discord.js';
import { CallService } from '../services/call.service.js';
import { MarketService } from '../services/market.service.js';
import {
  buildPositionsTableContent,
  formatFundingSnippet,
  BuildPositionsTableOptions,
} from './positions.js';
import { formatPrice } from '../utils/format.js';
import { CallWithPositions } from '../types/call.js';

let callService: CallService;
let marketService: MarketService;

export function init(cService: CallService, mService: MarketService): void {
  callService = cService;
  marketService = mService;
}

export const data = new SlashCommandBuilder()
  .setName('positions-symbol')
  .setDescription('Xem kèo theo coin symbol')
  .addStringOption((opt) =>
    opt
      .setName('symbol')
      .setDescription('Ký hiệu coin (vd: BTC, ETH)')
      .setRequired(true)
  );

const LONG_COLORS = [
  0x57f287, 0x1abc9c, 0x2ecc71, 0x00b4d8,
  0xf1c40f, 0x9b59b6, 0xe67e22, 0x00d2ff,
];
const SHORT_COLORS = [
  0xed4245, 0xe74c3c, 0xff6b6b, 0xff4500,
  0xc0392b, 0xff0080, 0x8b0000, 0xff7675,
];

function callEmbedColor(direction: string): number {
  const pool = direction === 'long' ? LONG_COLORS : SHORT_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildCallerSection(call: CallWithPositions, currentPrice: number): string {
  if (call.callerClosedAt !== null) {
    return `⚓ **Thuyền trưởng:** ${call.calledBy} _(đã đóng lệnh)_`;
  }

  const rawPct = call.direction === 'long'
    ? ((currentPrice - call.callPrice) / call.callPrice) * 100
    : ((call.callPrice - currentPrice) / call.callPrice) * 100;
  const pct = currentPrice > 0 ? rawPct * call.leverage : null;

  let pnlStr = 'N/A';
  let vibe = '';
  if (pct !== null) {
    const sign = pct >= 0 ? '+' : '';
    const emoji = pct >= 0 ? '🟢' : '🔴';
    pnlStr = `${emoji} ${sign}${Math.round(pct)}%`;
    if (pct >= 0) vibe = 'đang đếm tiền rồi!';
    else if (pct > -50) vibe = 'bình tĩnh, thuyền trưởng vẫn tự tin!';
    else vibe = 'ai cứu với! 😱';
  }

  const line1 = `⚓ **Thuyền trưởng:** ${call.calledBy}`;
  const line2 = `🎯 Đang đu giá: ${formatPrice(call.callPrice)} x${call.leverage} — ${pnlStr} _(${vibe})_`;
  return `${line1}\n${line2}`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true).toUpperCase();

  await interaction.deferReply();

  const allCalls = await callService.getActiveCallsWithPositions(interaction.guildId!);
  const filtered = allCalls.filter((c) => c.symbol === symbol);

  if (filtered.length === 0) {
    await interaction.editReply(`Không có kèo active nào cho **${symbol}**.`);
    return;
  }

  const [priceMap, fundingMap] = await Promise.all([
    marketService.getLivePrices([symbol]),
    marketService.getLinearFunding(symbol).then((f) => new Map([[symbol, f]])),
  ]);

  const embeds: APIEmbed[] = [];

  for (const call of filtered) {
    const currentPrice = priceMap.get(symbol) ?? 0;
    const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
    const priceStr = currentPrice > 0 ? ` · **${formatPrice(currentPrice)}**` : '';

    const fundingDesc = formatFundingSnippet(fundingMap.get(symbol));
    const callerSection = buildCallerSection(call, currentPrice);
    const table = buildPositionsTableContent(call.positions, call, currentPrice, { openOnly: true } as BuildPositionsTableOptions);

    const embed = new EmbedBuilder()
      .setTitle(`${call.symbol} ${dirEmoji} x${call.leverage}${priceStr}`)
      .setColor(callEmbedColor(call.direction))
      .setDescription(`${fundingDesc}${callerSection}\n\n${table}`);

    embeds.push(embed.toJSON());
  }

  const BATCH = 10;
  for (let i = 0; i < embeds.length; i += BATCH) {
    const batch = embeds.slice(i, i + BATCH);
    if (i === 0) {
      await interaction.editReply({ embeds: batch });
    } else {
      await interaction.followUp({ embeds: batch });
    }
  }
}
