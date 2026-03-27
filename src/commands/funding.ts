import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
}

/** Luôn hiển thị theo Việt Nam (ICT = UTC+7). `nextFundingTime` của Bybit là instant UTC. */
function formatDatetimeICT(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function formatRatePct(raw: number): string {
  const pct = raw * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(4)}%`;
}

export const data = new SlashCommandBuilder()
  .setName('funding')
  .setDescription('Funding rate Bybit USDT perpetual (linear)')
  .addStringOption((opt) =>
    opt.setName('symbol').setDescription('Ticker (vd: btc, eth, sol)').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true).trim();
  await interaction.deferReply();

  const snap = await marketService.getLinearFunding(symbol);
  if (!snap) {
    await interaction.editReply(
      `Không lấy được funding cho **${symbol.toUpperCase()}** — kiểm tra pair **${symbol.toUpperCase().replace(/USDT$/i, '')}USDT** perpetual trên Bybit.`,
    );
    return;
  }

  const pctPeriod = snap.fundingRate * 100;
  const sign = pctPeriod >= 0 ? '+' : '';
  const unix = Math.floor(snap.nextFundingTime.getTime() / 1000);

  const lines: string[] = [
    `**Rate kỳ hiện tại:** \`${sign}${pctPeriod.toFixed(4)}%\` / ${snap.fundingIntervalHours}h`,
    `**Funding tiếp theo:** ${formatDatetimeICT(snap.nextFundingTime)} ICT (<t:${unix}:R>)`,
  ];

  if (snap.lastSettled) {
    lines.push(
      `**Vừa settle:** \`${formatRatePct(snap.lastSettled.fundingRate)}\` · ${formatDatetimeICT(snap.lastSettled.settledAt)} ICT`,
    );
  }
  if (snap.priorSettled) {
    lines.push(
      `**Kỳ trước:** \`${formatRatePct(snap.priorSettled.fundingRate)}\` · ${formatDatetimeICT(snap.priorSettled.settledAt)} ICT`,
    );
  }

  const embed = new EmbedBuilder()
    .setTitle(`Funding — ${snap.baseSymbol}/USDT · Bybit`)
    .setColor(pctPeriod >= 0 ? 0xe74c3c : 0x3498db)
    .setDescription(lines.join('\n'))
    .setFooter({
      text: 'Giờ cố định ICT (UTC+7). Bybit trả timestamp UTC; settle: /v5/market/funding/history.',
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
