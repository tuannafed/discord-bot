import { Client, EmbedBuilder } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { CallService } from '../services/call.service.js';

const INTERVAL_MS = 30_000;  // ping mỗi 30 giây
const MAX_ROUNDS = 20;        // tối đa 10 phút (20 × 30s)

// Track active reminders: callId → intervalId
const activeReminders = new Map<string, ReturnType<typeof setInterval>>();

export function startCloseReminder(
  client: Client,
  callService: CallService,
  callId: string,
  channelId: string,
  callerUserId: string,
  symbol: string,
  direction: string,
  closeType: 'tp' | 'cl' | 'sl',
): void {
  if (!env.ENABLE_CLOSE_REMINDER) return;

  // Không chạy 2 reminder cho cùng 1 call
  if (activeReminders.has(callId)) return;

  const action = closeType === 'tp' ? 'chốt lời ✅' : closeType === 'sl' ? 'stop loss 🛑' : 'cắt lỗ ❌';
  let rounds = 0;

  const intervalId = setInterval(async () => {
    rounds++;

    try {
      const openPositions = await callService.getOpenPositionsByCall(callId);
      const pending = openPositions.filter((p) => p.userId !== callerUserId);

      if (pending.length === 0 || rounds >= MAX_ROUNDS) {
        clearInterval(intervalId);
        activeReminders.delete(callId);
        logger.info(`Close reminder ${callId}: ${pending.length === 0 ? 'all closed' : 'max rounds'}, stopping`);
        return;
      }

      const mentions = pending.map((p) => `<@${p.userId}>`).join(' ');
      const dirLabel = direction === 'long' ? '📈 LONG' : '📉 SHORT';

      const titleEmoji = closeType === 'tp' ? '✅' : closeType === 'sl' ? '🟥' : '❌';
      const embed = new EmbedBuilder()
        .setTitle(`${titleEmoji} Nhắc đóng lệnh — ${symbol} ${dirLabel}`)
        .setColor(closeType === 'tp' ? 0x2ecc71 : closeType === 'sl' ? 0xe67e22 : 0xe74c3c)
        .setDescription(
          `<@${callerUserId}> vừa **${action}** kèo **${symbol}**.\n` +
          `${mentions} bạn chưa đóng lệnh, dùng \`/tp\`, \`/cl\` hoặc \`/sl\` ngay!`
        )
        .setTimestamp();

      const channel = await client.channels.fetch(channelId);
      if (channel?.isTextBased()) {
        await (channel as any).send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error(`Close reminder ${callId}: error`, err);
      clearInterval(intervalId);
      activeReminders.delete(callId);
    }
  }, INTERVAL_MS);

  activeReminders.set(callId, intervalId);
  logger.info(`Close reminder started for call ${callId} (${symbol})`);
}

export function stopCloseReminder(callId: string): void {
  const intervalId = activeReminders.get(callId);
  if (intervalId) {
    clearInterval(intervalId);
    activeReminders.delete(callId);
  }
}
