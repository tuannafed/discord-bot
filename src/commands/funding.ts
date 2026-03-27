import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { formatPrice } from '../utils/format.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
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
  const periodsPerDay = 24 / snap.fundingIntervalHours;
  const aprSimple = snap.fundingRate * periodsPerDay * 365 * 100;

  const unix = Math.floor(snap.nextFundingTime.getTime() / 1000);

  const embed = new EmbedBuilder()
    .setTitle(`Funding — ${snap.baseSymbol}/USDT · Bybit`)
    .setColor(pctPeriod >= 0 ? 0xe74c3c : 0x3498db)
    .setDescription(
      [
        `**Rate kỳ hiện tại:** \`${sign}${pctPeriod.toFixed(4)}%\` / ${snap.fundingIntervalHours}h`,
        'Rate **dương** → long trả short · **âm** → short trả long *(Bybit)*',
        '',
        `**Ước tính APR (cộng dồn đơn giản):** \`${sign}${aprSimple.toFixed(2)}%\` *(tham khảo)*`,
        '',
        `**Mark:** ${formatPrice(snap.markPrice)} · **Index:** ${formatPrice(snap.indexPrice)}`,
        `**Funding tiếp theo:** <t:${unix}:F> (<t:${unix}:R>)`,
      ].join('\n'),
    )
    .setFooter({ text: 'Bybit v5 public API · cache ~30s' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
