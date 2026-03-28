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

/** Caller PnL row (synthetic — not a real Position DB row) */
function buildCallerPnlString(call: CallWithPositions, currentPrice: number): string {
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
  if (pnlResult.status === 'na') return 'PnL: N/A';
  const { pct, status } = pnlResult as { pct: number; status: string };
  const sign = pct >= 0 ? '+' : '';
  const pctRounded = Math.round(pct);
  if (status === 'TP') return `PnL: ✅ +${pctRounded}% TP`;
  if (status === 'SL') return `PnL: 🟥 ${sign}${pctRounded}% SL`;
  if (status === 'CL') return `PnL: ❌ ${sign}${pctRounded}% CL`;
  return `PnL: ${pct >= 0 ? '🟢' : '🔴'} ${sign}${pctRounded}%`;
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

/** Embed color based on call direction */
function callEmbedColor(direction: string): number {
  return direction === 'long' ? 0x57f287 : 0xed4245; // green / red
}

const CREW_CAPTIONS_LONG = [
  '🚢 Con dân đã lên tàu, thuyền trưởng hô to: FULL STEAM AHEAD!',
  '⛵ Thuyền trưởng mở kèo, bà con đu đỉnh không kịp thở!',
  '🏝️ Tất cả hướng ra đảo! Ai không lên tàu thì ở lại bờ khóc!',
  '🦜 Thuyền trưởng phán: "Đu hay không đu — đó là câu hỏi!" Bà con chọn đu!',
  '⚓ Neo đã nhổ! Con thuyền lệnh đang lướt sóng về phía lợi nhuận!',
  '🌊 Sóng to không sợ, bà con vẫn bám tàu kiên cường!',
];

const CREW_CAPTIONS_SHORT = [
  '🔻 Thuyền trưởng bắt đỉnh, bà con đu short không chớp mắt!',
  '📉 Thuyền đang lặn xuống đáy — bà con thắt dây an toàn chưa?',
  '🦈 Short team tập hợp! Thuyền trưởng dẫn đầu lặn sâu hơn nữa!',
  '⚓ Neo thả xuống! Chúng ta cùng nhau đến đáy… của giá!',
  '🌊 Thuyền ngược sóng — short gang đang kiếm tiền trong bão!',
  '🐋 Cá voi short xuất hiện! Thuyền trưởng và con dân bơi theo!',
];

function randomCrewCaption(direction: string): string {
  const pool = direction === 'long' ? CREW_CAPTIONS_LONG : CREW_CAPTIONS_SHORT;
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

    // Caller line (above table)
    const callerPnl = call.callerClosedAt === null
      ? buildCallerPnlString(call, currentPrice)
      : null;
    const callerLine = callerPnl !== null
      ? `⚓ **Thuyền trưởng:** ${call.calledBy} @ ${formatPrice(call.callPrice)} x${call.leverage} — ${callerPnl}`
      : `⚓ **Thuyền trưởng:** ${call.calledBy} _(đã đóng)_`;

    const fundingDesc = formatFundingSnippet(fundingMap.get(call.symbol));
    const table = buildPositionsTableContent(call.positions, call, currentPrice, { openOnly: true });
    const caption = randomCrewCaption(call.direction);

    const embed = new EmbedBuilder()
      .setTitle(`${call.symbol} ${dirEmoji} x${call.leverage}${priceStr}`)
      .setColor(callEmbedColor(call.direction))
      .setDescription(`${callerLine}\n\n${caption}\n\n${fundingDesc}${table}`);

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
