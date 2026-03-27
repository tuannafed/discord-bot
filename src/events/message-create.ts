import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger.js';

export function registerMessageCreateEvent(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || !client.user) return;
    if (!message.mentions.users.has(client.user.id)) return;

    try {
      await message.reply({
        content:
          'Chào! Bot chỉ nhận **slash command** — gõ `/` trong kênh này (ví dụ `/help`).',
        allowedMentions: { repliedUser: true },
      });
    } catch (err) {
      logger.warn(`Mention reply failed in channel ${message.channelId}: ${(err as Error).message}`);
    }
  });
}
