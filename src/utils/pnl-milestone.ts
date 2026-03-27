import { TextChannel, Client, EmbedBuilder } from 'discord.js';

export const MILESTONES = [100, 200, 300, 500, 1000];

export const MILESTONE_CONFIG: Record<number, { emoji: string; title: string; color: number }> = {
  100:  { emoji: '🎉', title: 'x2 rồi bro!',        color: 0x2ecc71 },
  200:  { emoji: '🔥', title: 'x3 cháy quá!',        color: 0xe67e22 },
  300:  { emoji: '💎', title: 'x4 siêu phẩm!',       color: 0x1abc9c },
  500:  { emoji: '🚀', title: 'x6 lên trời rồi!',    color: 0x9b59b6 },
  1000: { emoji: '👑', title: 'x11 HUYỀN THOẠI!!!',  color: 0xf1c40f },
};

export function getMilestoneHit(pnlPct: number): number | null {
  // Find highest milestone crossed (e.g. 650% → 500)
  let hit: number | null = null;
  for (const m of MILESTONES) {
    if (pnlPct >= m) hit = m;
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
    const action = params.live
      ? `đang giữ lệnh **${params.symbol} ${dirLabel}** với P&L **${sign}${params.pnlPct.toFixed(2)}%** 🔥`
      : `vừa chốt **${params.symbol} ${dirLabel}** với P&L **${sign}${params.pnlPct.toFixed(2)}%** 🤑`;

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
