import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import type { LlmChatService } from '../services/llm-chat.service.js';

const DISCORD_MSG_MAX = 1900;

function stripBotMention(content: string, botId: string): string {
  return content
    .replace(new RegExp(`<@!?${botId}>`, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateForDiscord(text: string): string {
  if (text.length <= DISCORD_MSG_MAX) return text;
  return `${text.slice(0, DISCORD_MSG_MAX - 20)}\n\n_(đã cắt bớt — quá dài)_`;
}

export function registerMessageCreateEvent(client: Client, llmChat: LlmChatService | null): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || !client.user) return;
    if (!message.mentions.users.has(client.user.id)) return;

    const prompt = stripBotMention(message.content, client.user.id);

    try {
      if (!llmChat) {
        await message.reply({
          content:
            'Chào! Dùng **slash command** (`/help`). Để bật chat khi tag bot, set `LLM_API_KEY` + `LLM_PROVIDER=anthropic` (Claude) hoặc OpenAI-compatible.',
          allowedMentions: { repliedUser: true },
        });
        return;
      }

      const waitMs = llmChat.cooldownRemainingMs(message.guild.id, message.author.id);
      if (waitMs > 0) {
        await message.reply({
          content: `⏳ Chờ thêm **${Math.ceil(waitMs / 1000)}s** rồi hỏi tiếp nhé.`,
          allowedMentions: { repliedUser: true },
        });
        return;
      }

      if (!prompt) {
        await message.reply({
          content:
            'Gõ thêm **câu hỏi** cùng dòng với tag bot, ví dụ: `@bot Cay hơn gì nhỉ` — hoặc dùng `/help`.',
          allowedMentions: { repliedUser: true },
        });
        return;
      }

      llmChat.recordCooldown(message.guild.id, message.author.id);
      await message.channel.sendTyping().catch(() => undefined);

      const result = await llmChat.complete(prompt);
      if ('error' in result) {
        await message.reply({
          content: `❌ ${result.error}`,
          allowedMentions: { repliedUser: true },
        });
        return;
      }

      await message.reply({
        content: truncateForDiscord(result.text),
        allowedMentions: { users: [] },
      });
    } catch (err) {
      logger.warn(`Mention reply failed in channel ${message.channelId}: ${(err as Error).message}`);
    }
  });
}
