import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { formatPrice, formatMarketCap, formatChange, formatSupply } from '../utils/format.js';

let marketService: MarketService;

export function init(service: MarketService): void {
  marketService = service;
}

const TIMEFRAME_LABEL: Record<string, string> = {
  '15':  '15m',
  '60':  '1h',
  '240': '4h',
  'D':   '24h',
};

export const data = new SlashCommandBuilder()
  .setName('coin')
  .setDescription('Dữ liệu thị trường một coin (giá, vốn hóa, hạng, …)')
  .addStringOption((opt) =>
    opt.setName('symbol').setDescription('Ký hiệu coin (vd: btc, eth)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('timeframe')
      .setDescription('Khung % thay đổi giá (mặc định: 24h)')
      .addChoices(
        { name: '15 phút', value: '15' },
        { name: '1 giờ', value: '60' },
        { name: '4 giờ', value: '240' },
        { name: '24 giờ', value: 'D' },
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true).toLowerCase();
  const timeframe = interaction.options.getString('timeframe') ?? null;

  await interaction.deferReply();

  const coin = await marketService.getCoinBySymbol(symbol);
  if (!coin) {
    await interaction.editReply(`Coin with symbol **${symbol.toUpperCase()}** not found.`);
    return;
  }

  let pricePct = coin.priceChangePercentage24h;
  let tfLabel = '24h';
  let prevPrice: number | null = null;
  let prevMarketCap: number | null = null;

  if (timeframe) {
    const kline = await marketService.getCoinKlineChange(symbol, timeframe);
    if (kline) {
      pricePct = kline.pct;
      prevPrice = kline.prev;
      // estimate prevMCap using price ratio
      if (kline.current > 0 && coin.marketCap > 0) {
        prevMarketCap = coin.marketCap * (kline.prev / kline.current);
      }
    }
    tfLabel = TIMEFRAME_LABEL[timeframe];
  }

  const capPct = prevMarketCap != null && prevMarketCap > 0
    ? ((coin.marketCap - prevMarketCap) / prevMarketCap) * 100
    : null;

  const arrow = (pct: number) => pct >= 0 ? '▲' : '▼';
  const sign  = (pct: number) => pct >= 0 ? '+' : '';
  const fmtPct = (pct: number) => `${arrow(pct)} ${sign(pct)}${formatChange(pct)}`;

  const tfPad = tfLabel.padEnd(4);

  const lines = [
    `Price    : ${formatPrice(coin.currentPrice)}`,
    prevPrice != null
      ? `Prev ${tfPad} : ${formatPrice(prevPrice)}`
      : null,
    `Price ${tfPad} : ${fmtPct(pricePct)}`,
    ``,
    `MCap     : ${formatMarketCap(coin.marketCap)}`,
    prevMarketCap != null
      ? `Prev ${tfPad} : ${formatMarketCap(prevMarketCap)}`
      : null,
    capPct != null
      ? `Cap  ${tfPad} : ${fmtPct(capPct)}`
      : null,
    ``,
    `Rank     : #${coin.marketCapRank}`,
    `Circ.    : ${formatSupply(coin.circulatingSupply)}`,
    `Total    : ${formatSupply(coin.totalSupply)}`,
    `Max      : ${formatSupply(coin.maxSupply)}`,
  ].filter((l): l is string => l !== null);

  const embed = new EmbedBuilder()
    .setTitle(`${coin.name} (${coin.symbol.toUpperCase()})`)
    .setColor(pricePct >= 0 ? 0x00cc66 : 0xff4444)
    .setDescription('```\n' + lines.join('\n') + '\n```')
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
