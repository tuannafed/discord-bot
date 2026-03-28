import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, APIEmbed } from 'discord.js';
import { CallService } from '../services/call.service.js';
import { MarketService } from '../services/market.service.js';
import { CallWithPositions, Position } from '../types/call.js';
import type { LinearFundingSnapshot } from '../types/funding.js';
import { formatPrice } from '../utils/format.js';

let callService: CallService;
let marketService: MarketService;

export function init(cService: CallService, mService: MarketService): void {
  callService = cService;
  marketService = mService;
}

function calcPnl(pos: Position, call: CallWithPositions, currentPrice: number): { pct: number; status: string } | { status: 'na' } {
  if (pos.closedAt !== null) {
    const pct = pos.pnlPct ?? 0;
    return { pct, status: pos.closeType === 'tp' ? 'TP' : pos.closeType === 'sl' ? 'SL' : 'CL' };
  }
  if (currentPrice <= 0) return { status: 'na' };
  const rawPct = call.direction === 'long'
    ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
    : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;
  const pct = rawPct * pos.leverage;
  return { pct, status: 'open' };
}

export type BuildPositionsTableOptions = { openOnly?: boolean };

const CALLER_PNL_PROFIT = [
  'đang đếm tiền rồi!', 'thuyền trưởng cười tươi!', 'ngon lành cành đào!',
  'bà con vỗ tay đi!', 'đỉnh của chóp luôn!',
];
const CALLER_PNL_LOSS = [
  'đang chìm nhưng chưa bỏ cuộc!', 'bình tĩnh, thuyền trưởng vẫn tự tin!',
  'sóng to nhưng tàu vẫn chạy!', 'hold chắc, thuyền trưởng còn đây!',
  'chưa đến bến thì chưa tính thua!',
];
const CALLER_PNL_REKT = [
  'ai cứu với! 😱', 'thuyền trưởng vẫn giữ lái dù sóng to!',
  'chìm tàu chưa? Chưa! Bám chặt vào!', 'thuyền trưởng tuyên bố: TA KHÔNG항CAPITULATE!',
];

function randomItem(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Caller section: 2 lines — name line + đu giá line */
function buildCallerSection(call: CallWithPositions, currentPrice: number): string {
  if (call.callerClosedAt !== null) {
    return `⚓ **Thuyền trưởng:** ${call.calledBy} _(đã đóng lệnh)_`;
  }

  const callerPos: Position = {
    id: '', callId: call.id, guildId: call.guildId, userId: call.calledById,
    username: call.calledBy, entryPrice: call.callPrice, leverage: call.leverage,
    joinedAt: call.calledAt,
    closedAt: call.callerClosedAt,
    closeType: call.callerCloseType,
    closePrice: call.callerClosePrice,
    pnlPct: call.callerPnlPct,
    notifiedMilestones: '', mutedMilestones: false,
  };
  const pnlResult = calcPnl(callerPos, call, currentPrice);

  let pnlStr = 'N/A';
  let vibe = '';
  if (pnlResult.status !== 'na') {
    const { pct } = pnlResult as { pct: number; status: string };
    const sign = pct >= 0 ? '+' : '';
    const pctRounded = Math.round(pct);
    const emoji = pct >= 0 ? '🟢' : '🔴';
    pnlStr = `${emoji} ${sign}${pctRounded}%`;
    if (pct >= 0) vibe = randomItem(CALLER_PNL_PROFIT);
    else if (pct > -50) vibe = randomItem(CALLER_PNL_LOSS);
    else vibe = randomItem(CALLER_PNL_REKT);
  }

  const line1 = `⚓ **Thuyền trưởng:** ${call.calledBy}`;
  const line2 = `🎯 Đang đu giá: ${formatPrice(call.callPrice)} x${call.leverage} — ${pnlStr} _(${vibe})_`;
  return `${line1}\n${line2}`;
}

export function buildPositionsTableContent(
  positions: Position[],
  call: CallWithPositions,
  currentPrice: number,
  options?: BuildPositionsTableOptions,
): string {
  const followersAll = positions.filter((p) => p.userId !== call.calledById);
  const followersFiltered = options?.openOnly
    ? followersAll.filter((p) => p.closedAt === null)
    : followersAll;

  if (followersFiltered.length === 0) {
    return '_Chưa có ai follow kèo này._';
  }

  const NAME_W = 6;
  const header = `${'Name'.padEnd(NAME_W)}  ${'Entry'.padStart(10)}  Lev  PnL`;
  const sep = '-'.repeat(header.length + 2);

  const rows = followersFiltered.map((pos) => {
    const pnlResult = calcPnl(pos, call, currentPrice);
    const name = pos.username.slice(0, NAME_W).padEnd(NAME_W);
    const price = formatPrice(pos.entryPrice);
    const lev = String(pos.leverage).padEnd(4);

    let emoji = '⬜';
    let pnlStr = 'N/A';
    if (pnlResult.status !== 'na') {
      const { pct, status } = pnlResult as { pct: number; status: string };
      const sign = pct >= 0 ? '+' : '';
      const pctRounded = Math.round(pct);
      if (status === 'TP') {
        emoji = '✅';
        pnlStr = `${sign}${pctRounded}%TP`;
      } else if (status === 'SL') {
        emoji = '🟥';
        pnlStr = `${sign}${pctRounded}%SL`;
      } else if (status === 'CL') {
        emoji = '❌';
        pnlStr = `${sign}${pctRounded}%CL`;
      } else {
        emoji = pct >= 0 ? '🟢' : '🔴';
        pnlStr = `${sign}${pctRounded}%`;
      }
    }

    return `${emoji} ${name}  ${price.padStart(10)}  ${lev} ${pnlStr}`;
  });

  return '```\n' + [header, sep, ...rows].join('\n') + '\n```';
}

/** Một dòng trước bảng PnL — ví dụ: Funding: -0.0214% / 8h */
export function formatFundingSnippet(snap: LinearFundingSnapshot | null | undefined): string {
  if (!snap) return '';
  const pctPeriod = snap.fundingRate * 100;
  const sign = pctPeriod >= 0 ? '+' : '';
  return `Funding: ${sign}${pctPeriod.toFixed(4)}% / ${snap.fundingIntervalHours}h\n\n`;
}

export const data = new SlashCommandBuilder()
  .setName('positions')
  .setDescription('Kèo đang chạy — chỉ người còn mở lệnh (đã TP/CL/SL không hiện)');

const LONG_COLORS = [
  0x57f287, // xanh lá Discord
  0x1abc9c, // ngọc lam
  0x2ecc71, // emerald
  0x00b4d8, // xanh dương sáng
  0xf1c40f, // vàng
  0x9b59b6, // tím
  0xe67e22, // cam
  0x00d2ff, // cyan
];

const SHORT_COLORS = [
  0xed4245, // đỏ Discord
  0xe74c3c, // đỏ đậm
  0xff6b6b, // hồng đỏ
  0xff4500, // đỏ cam
  0xc0392b, // crimson
  0xff0080, // hồng neon
  0x8b0000, // dark red
  0xff7675, // salmon
];

function callEmbedColor(direction: string): number {
  const pool = direction === 'long' ? LONG_COLORS : SHORT_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

const CREW_CAPTIONS_LONG = [
  '🚢 Con dân đã lên tàu, thuyền trưởng hô to: FULL STEAM AHEAD!',
  '⛵ Thuyền trưởng mở kèo, bà con đu đỉnh không kịp thở!',
  '🏝️ Tất cả hướng ra đảo! Ai không lên tàu thì ở lại bờ khóc!',
  '🦜 Thuyền trưởng phán: "Đu hay không đu — đó là câu hỏi!" Bà con chọn đu!',
  '⚓ Neo đã nhổ! Con thuyền lệnh đang lướt sóng về phía lợi nhuận!',
  '🌊 Sóng to không sợ, bà con vẫn bám tàu kiên cường!',
];
const CREW_CAPTIONS_LONG_EXTRA = [
  '🚀 Thuyền trưởng nói: "All in!" — bà con check ví xong vẫn all in!',
  '📈 Chart xanh lè, thuyền trưởng cười, bà con bắt đầu mơ Lamborghini!',
  '🔥 Lệnh đã vào, tim đập nhanh hơn cả funding rate!',
  '💰 Thuyền này không có vé khứ hồi — chỉ có bay lên hoặc… bay màu!',
  '🌕 Hướng đến mặt trăng! Ai xuống tàu giữa đường là mất slot triệu phú!',
  '🎯 Entry đẹp như mơ, bà con tin tưởng tuyệt đối… cho tới khi market mở!',
  '🧭 Thuyền trưởng bảo đi lên — lý do: "Trust me bro!"',
  '🚢 Tàu căng buồm, bà con căng margin!',
  '📊 Nhìn chart 5 phút mà tưởng đang nhìn tương lai!',
  '🤑 Lãi chưa thấy, nhưng niềm tin thì đang ATH!',
];
const CREW_CAPTIONS_SHORT = [
  '🔻 Thuyền trưởng bắt đỉnh, bà con đu short không chớp mắt!',
  '📉 Thuyền đang lặn xuống đáy — bà con thắt dây an toàn chưa?',
  '🦈 Short team tập hợp! Thuyền trưởng dẫn đầu lặn sâu hơn nữa!',
  '⚓ Neo thả xuống! Chúng ta cùng nhau đến đáy… của giá!',
  '🌊 Thuyền ngược sóng — short gang đang kiếm tiền trong bão!',
  '🐋 Cá voi short xuất hiện! Thuyền trưởng và con dân bơi theo!',
];
const CREW_CAPTIONS_SHORT_EXTRA = [
  '📉 Thuyền trưởng quay xe, bà con short theo không cần hỏi lý do!',
  '🩸 Chart đỏ như máu, short gang cười như trúng số!',
  '⚰️ Long chết hàng loạt — short team dựng bia ghi công!',
  '🌊 Sóng càng mạnh, short càng lời!',
  '🔪 Thị trường bị “cắt tiết” — bà con short đứng xem như phim!',
  '🐻 Gấu đã thức giấc — thuyền trưởng ra lệnh: SHORT ALL!',
  '📊 Nhìn chart rơi mà lòng vui như Tết!',
  '💀 Longers bị thanh lý, shorters mở tiệc ăn mừng!',
  '⚡ Dump bất ngờ! Ai không short kịp chỉ biết đứng nhìn!',
  '🧊 Giá đóng băng rồi… nhưng tài khoản short thì đang nóng!',
];
function randomCrewCaption(direction: string): string {
  const pool = direction === 'long' ? [...CREW_CAPTIONS_LONG, ...CREW_CAPTIONS_LONG_EXTRA] : [...CREW_CAPTIONS_SHORT, ...CREW_CAPTIONS_SHORT_EXTRA];
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const callsWithPositions = await callService.getActiveCallsWithPositions(interaction.guildId!);

  if (callsWithPositions.length === 0) {
    await interaction.editReply('Không có kèo nào đang active.');
    return;
  }

  const symbols = [...new Set(callsWithPositions.map((c) => c.symbol))];
  const [priceMap, fundingMap] = await Promise.all([
    marketService.getLivePrices(symbols),
    Promise.all(symbols.map(async (sym) => [sym, await marketService.getLinearFunding(sym)] as const)).then(
      (pairs) => new Map(pairs),
    ),
  ]);

  const embeds: APIEmbed[] = [];

  for (const call of callsWithPositions) {
    const currentPrice = priceMap.get(call.symbol) ?? 0;
    const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
    const priceStr = currentPrice > 0 ? ` · **${formatPrice(currentPrice)}**` : '';

    const fundingDesc = formatFundingSnippet(fundingMap.get(call.symbol));
    const callerSection = buildCallerSection(call, currentPrice);
    const table = buildPositionsTableContent(call.positions, call, currentPrice, { openOnly: true });
    const caption = randomCrewCaption(call.direction);

    const embed = new EmbedBuilder()
      .setTitle(`${call.symbol} ${dirEmoji} x${call.leverage}${priceStr}`)
      .setColor(callEmbedColor(call.direction))
      .setDescription(`${fundingDesc}${callerSection}\n\n${caption}\n\n${table}`);

    embeds.push(embed.toJSON());
  }

  // Discord allows max 10 embeds per message; split if needed
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
