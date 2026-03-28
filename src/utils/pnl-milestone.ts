import { TextChannel, Client, EmbedBuilder } from 'discord.js';
import { logger } from './logger.js';

export const MILESTONES      = [100, 200, 300, 500, 1000];
export const LOSS_MILESTONES = [-100, -200, -300, -400, -500, -600, -700, -800, -900, -1000];

export const MILESTONE_CONFIG: Record<number, { emoji: string; title: string; color: number }> = {
  // Profit
  100:   { emoji: '🎉', title: 'X2 — ví đã “ủa” một phát chưa?',           color: 0x2ecc71 },
  200:   { emoji: '🔥', title: 'X3 — nóng máy rồi, đừng làm drop quá nha', color: 0xe67e22 },
  300:   { emoji: '💎', title: 'X4 — tay to hay mạng lag? Cả hai!',       color: 0x1abc9c },
  500:   { emoji: '🚀', title: 'X6 — bay thẳng, không cần vé Turbulence', color: 0x9b59b6 },
  1000:  { emoji: '👑', title: 'X11 — cap chart như phim hành động',      color: 0xf1c40f },
  // Loss (1R → 10R, mỗi bậc = 100% PnL với leverage)
  [-100]:  { emoji: '😬', title: '-1R — “ổn mà”, dev nhìn chart cũng gật',           color: 0xe74c3c },
  [-200]:  { emoji: '😨', title: '-2R — plot twist hơi gắt, thở đi',                 color: 0xc0392b },
  [-300]:  { emoji: '😱', title: '-3R — stop-loss là bạn, FOMO là… khách',           color: 0xa93228 },
  [-400]:  { emoji: '🤕', title: '-4R — lỡ tay hay lỡ sóng? Cả hai cũng “úi dà”',   color: 0x922b21 },
  [-500]:  { emoji: '💀', title: '-5R — chart đỏ như Tết… nhưng ngược',             color: 0x7f251d },
  [-600]:  { emoji: '🌧️', title: '-6R — mưa lệnh, nhớ mang… ô tâm lý',              color: 0x6d1f18 },
  [-700]:  { emoji: '🫠', title: '-7R — hy vọng là chiến lược, đừng để thành bug',   color: 0x5c1a14 },
  [-800]:  { emoji: '⚰️', title: '-8R — drama dài tập, chưa phải hồi kết',           color: 0x4d1511 },
  [-900]:  { emoji: '🔻', title: '-9R — sắp đủ bộ sưu tập “cực hình” một thể loại', color: 0x3f100e },
  [-1000]: { emoji: '☠️', title: '-10R — vẫn còn tài khoản là đã vượt ải',          color: 0x320a0c },
};

export function getMilestoneHit(pnlPct: number): number | null {
  // Profit: find highest milestone crossed
  let hit: number | null = null;
  for (const m of MILESTONES) {
    if (pnlPct >= m) hit = m;
  }
  if (hit !== null) return hit;
  // Loss: find lowest milestone crossed (e.g. -250% → -200)
  for (const m of LOSS_MILESTONES) {
    if (pnlPct <= m) hit = m;
  }
  return hit;
}

export async function sendMilestoneNotification(
  client: Client,
  channelId: string,
  params: {
    userId: string;
    symbol: string;
    direction: string;
    pnlPct: number;
    milestone: number;
    live?: boolean; // true = đang giữ lệnh, false/undefined = vừa chốt
    guildId?: string;
  }
): Promise<void> {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return;
    if (params.guildId && 'guildId' in channel && channel.guildId !== params.guildId) {
      logger.warn(`Milestone blocked: channel ${channelId} guildId=${('guildId' in channel) ? channel.guildId : 'n/a'} !== expected ${params.guildId}`);
      return;
    }

    const cfg = MILESTONE_CONFIG[params.milestone];
    const sign = params.pnlPct >= 0 ? '+' : '';
    const dirLabel = params.direction === 'long' || params.direction === 'short'
      ? (params.direction === 'long' ? '📈 LONG' : '📉 SHORT')
      : params.direction;
    const isLoss = params.pnlPct < 0;
    // Show milestone threshold instead of exact PnL to avoid confusion when price fluctuates between polling cycles
    const milestoneSign = params.milestone >= 0 ? '+' : '';
    const action = params.live
      ? `đang giữ lệnh **${params.symbol} ${dirLabel}** với P&L **${milestoneSign}${params.milestone}%** ${isLoss ? '📉' : '🔥'}`
      : `vừa chốt **${params.symbol} ${dirLabel}** với P&L **${sign}${params.pnlPct.toFixed(2)}%** ${isLoss ? '😢' : '🤑'}`;

    const embed = new EmbedBuilder()
      .setTitle(`${cfg.emoji} ${cfg.title}`)
      .setColor(cfg.color)
      .setDescription(`<@${params.userId}> ${action}`)
      .setTimestamp();

    try {
      await (channel as TextChannel).send({ embeds: [embed] });
    } catch (embedErr: unknown) {
      const code = (embedErr as { code?: number })?.code;
      if (code === 50004) {
        // Missing Embed Links permission — fallback to plain text
        await (channel as TextChannel).send(`${cfg.emoji} **${cfg.title}** — <@${params.userId}> ${action}`);
      } else {
        throw embedErr;
      }
    }
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 50001 || code === 10003) {
      logger.warn(`Milestone notification skipped for channel ${channelId}: ${(err as Error).message}`);
    } else {
      logger.error('sendMilestoneNotification failed', err);
    }
  }
}
