import { TextChannel, Client, EmbedBuilder } from 'discord.js';

export const MILESTONES      = [100, 200, 300, 500, 1000];
export const LOSS_MILESTONES = [-100, -200, -300, -500, -1000];

export const MILESTONE_CONFIG: Record<number, { emoji: string; title: string; color: number }> = {
  // Profit
  100:   { emoji: '🎉', title: 'x2 rồi bro!',         color: 0x2ecc71 },
  200:   { emoji: '🔥', title: 'x3 cháy quá!',         color: 0xe67e22 },
  300:   { emoji: '💎', title: 'x4 siêu phẩm!',        color: 0x1abc9c },
  500:   { emoji: '🚀', title: 'x6 lên trời rồi!',     color: 0x9b59b6 },
  1000:  { emoji: '👑', title: 'x11 HUYỀN THOẠI!!!',   color: 0xf1c40f },
  // Loss (1R → 10R)
  [-100]:  { emoji: '😬', title: '-1R rồi bro!',        color: 0xe74c3c },
  [-200]:  { emoji: '😨', title: '-2R đau quá!',        color: 0xc0392b },
  [-300]:  { emoji: '😱', title: '-3R cắt lỗ đi!',     color: 0x922b21 },
  [-500]:  { emoji: '💀', title: '-5R nguy hiểm lắm!', color: 0x7b241c },
  [-1000]: { emoji: '☠️', title: '-10R thanh lý chưa?', color: 0x4a0e0e },
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
    if (params.guildId && 'guildId' in channel && channel.guildId !== params.guildId) return;

    const cfg = MILESTONE_CONFIG[params.milestone];
    const sign = params.pnlPct >= 0 ? '+' : '';
    const dirLabel = params.direction === 'long' || params.direction === 'short'
      ? (params.direction === 'long' ? '📈 LONG' : '📉 SHORT')
      : params.direction;
    const isLoss = params.pnlPct < 0;
    const action = params.live
      ? `đang giữ lệnh **${params.symbol} ${dirLabel}** với P&L **${sign}${params.pnlPct.toFixed(2)}%** ${isLoss ? '📉' : '🔥'}`
      : `vừa chốt **${params.symbol} ${dirLabel}** với P&L **${sign}${params.pnlPct.toFixed(2)}%** ${isLoss ? '😢' : '🤑'}`;

    const embed = new EmbedBuilder()
      .setTitle(`${cfg.emoji} ${cfg.title}`)
      .setColor(cfg.color)
      .setDescription(`<@${params.userId}> ${action}`)
      .setTimestamp();

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch {
    // không block flow chính nếu notification fail
  }
}
