import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { CallService } from '../services/call.service.js';
import { MarketService } from '../services/market.service.js';
import { formatPrice } from '../utils/format.js';

let callService: CallService;
let marketService: MarketService;

export function init(cService: CallService, mService: MarketService): void {
  callService = cService;
  marketService = mService;
}

export const data = new SlashCommandBuilder()
  .setName('positions-user')
  .setDescription('Xem các lệnh đang active của một user')
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('User cần xem (mặc định: bản thân)')
      .setRequired(false)
  );

const CAPTIONS_PROFIT = [
  'Thuyền trưởng đang đếm tiền!',
  'Kèo nào cũng xanh, tài thật!',
  'Ví đang nở như bánh mì!',
  'Chart đẹp, lòng cũng đẹp theo!',
  'Profit xanh lè như hy vọng!',
  'Cười nhẹ thôi kẻo market nghe thấy!',
  'Tiền về ví nhanh hơn sóng!',
  'Thuyền trưởng chuẩn bài quá!',
];

const CAPTIONS_MIXED = [
  'Vừa lãi vừa lỗ — bình thường thôi!',
  'Đỏ xanh lẫn lộn, tâm lý vững là thắng!',
  'Market đang test lòng kiên nhẫn!',
  'Một tay xanh, một tay đỏ — cân bằng vũ trụ!',
  'Có lãi có lỗ mới gọi là trading!',
];

const CAPTIONS_LOSS = [
  'Bình tĩnh, thuyền trưởng vẫn tự tin!',
  'Chưa đến bến thì chưa tính thua!',
  'Lỗ chút xíu coi như học phí!',
  'Market đang thử lòng chúng ta!',
  'Pullback thôi mà, đừng hoảng!',
  'Tàu rung nhẹ thôi, chưa chìm đâu!',
];

function randomItem(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickCaption(totalPnl: number, hasNa: boolean): string {
  if (hasNa) return randomItem(CAPTIONS_MIXED);
  if (totalPnl > 0) return randomItem(CAPTIONS_PROFIT);
  if (totalPnl < 0) return randomItem(CAPTIONS_LOSS);
  return randomItem(CAPTIONS_MIXED);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const target = interaction.options.getUser('user') ?? interaction.user;
  const guildId = interaction.guildId!;

  const entries = await callService.getActivePositionsByUser(guildId, target.id);

  if (entries.length === 0) {
    const name = target.id === interaction.user.id ? 'Bạn' : `**${target.displayName}**`;
    await interaction.editReply(`${name} không có lệnh nào đang active.`);
    return;
  }

  const symbols = [...new Set(entries.map(({ call }) => call.symbol))];
  const priceMap = await marketService.getLivePrices(symbols);

  const SYM_W = 5;
  const header = `${'Sym'.padEnd(SYM_W)}  ${'Entry'.padStart(10)}  Lev  PnL`;
  const sep = '-'.repeat(header.length + 2);

  let totalPnl = 0;
  let hasNa = false;
  const rows: string[] = [];

  for (const { position, call } of entries) {
    const currentPrice = priceMap.get(call.symbol) ?? 0;
    const sym = call.symbol.slice(0, SYM_W).padEnd(SYM_W);
    const entry = formatPrice(position.entryPrice);
    const lev = String(position.leverage).padEnd(4);

    let emoji = '⬜';
    let pnlStr = 'N/A';

    if (currentPrice > 0) {
      const rawPct =
        call.direction === 'long'
          ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
          : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
      const pnl = rawPct * position.leverage;
      totalPnl += pnl;
      const sign = pnl >= 0 ? '+' : '';
      pnlStr = `${sign}${Math.round(pnl)}%`;
      emoji = pnl >= 0 ? '🟢' : '🔴';
    } else {
      hasNa = true;
    }

    rows.push(`${emoji} ${sym}  ${entry.padStart(10)}  ${lev} ${pnlStr}`);
  }

  const table = '```\n' + [header, sep, ...rows].join('\n') + '\n```';
  const caption = pickCaption(totalPnl, hasNa);

  const embed = new EmbedBuilder()
    .setTitle(`📋 Lệnh active của ${target.displayName}`)
    .setColor(0x5865f2)
    .setThumbnail(target.displayAvatarURL())
    .setDescription(`_${caption}_\n\n${table}`)
    .setFooter({ text: `${entries.length} lệnh đang mở` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
