import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { LLM_ERROR_USER_MESSAGE, type LlmChatService } from '../services/llm-chat.service.js';
import {
  shouldSearch,
  formatSearchContext,
  type TavilySearchService,
} from '../services/tavily-search.service.js';

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

const MSG_CHAT_HIDDEN =
  'Hiện tại tính năng chat của mình đang **tắt**. Các lệnh slash vẫn dùng bình thường nhé.';

const MSG_CHAT_NEED_CONFIG =
  'Chat qua tag bot tạm chưa dùng được — thử lại sau hoặc nhờ admin kiểm tra cấu hình.';

export function registerMessageCreateEvent(
  client: Client,
  llmChat: LlmChatService | null,
  enableAiChat: boolean,
  tavilySearch: TavilySearchService | null = null,
): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || !client.user) return;
    if (!message.mentions.users.has(client.user.id)) return;

    const prompt = stripBotMention(message.content, client.user.id);

    try {
      if (!llmChat) {
        const content = enableAiChat ? MSG_CHAT_NEED_CONFIG : MSG_CHAT_HIDDEN;
        await message.reply({
          content,
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
          content: 'Nhắn thêm nội dung cùng lúc tag mình nhé.',
          allowedMentions: { repliedUser: true },
        });
        return;
      }

      llmChat.recordCooldown(message.guild.id, message.author.id);
      await message.channel.sendTyping().catch(() => undefined);

      // Keyword-triggered web search — inject context into prompt if needed
      let enrichedPrompt = prompt;
      if (tavilySearch && shouldSearch(prompt)) {
        const results = await tavilySearch.search(prompt);
        const context = formatSearchContext(results);
        if (context) {
          enrichedPrompt = `${context}\n\nCâu hỏi: ${prompt}`;
          logger.info(`Tavily search returned ${results.length} results for prompt="${prompt.slice(0, 80)}"`);
        }
      }

      const result = await llmChat.complete(enrichedPrompt);
      if ('error' in result) {
        await message.reply({
          content: LLM_ERROR_USER_MESSAGE,
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
