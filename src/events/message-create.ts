import { AttachmentBuilder, Client, EmbedBuilder, Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { LLM_ERROR_USER_MESSAGE, type LlmChatService } from '../services/llm-chat.service.js';
import {
  shouldSearch,
  formatSearchContext,
  type TavilySearchService,
} from '../services/tavily-search.service.js';
import { isChartRequest, parseChartIntent } from '../services/chart-intent.service.js';
import { fetchOhlcv, renderCandlestickChart } from '../services/chart.service.js';
import { detectSkill, getSkill } from '../services/llm-skills.js';
import { ConversationHistoryService } from '../services/conversation-history.service.js';

const EMBED_DESC_MAX = 4096;
const EMBED_COLOR: Record<string, number> = {
  'crypto-analyst': 0x26cb7c,
  trader: 0xf0a500,
  'news-analyst': 0x5865f2,
  general: 0x2b2d31,
};

function stripBotMention(content: string, botId: string): string {
  return content
    .replace(new RegExp(`<@!?${botId}>`, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split text into chunks of max `size` chars, breaking at newlines when possible. */
function splitIntoChunks(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= size) {
      chunks.push(remaining);
      break;
    }
    let cutAt = remaining.lastIndexOf('\n', size);
    if (cutAt < size * 0.5) cutAt = size;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).trimStart();
  }
  return chunks;
}

function buildEmbeds(text: string, skillName: string, prompt: string): EmbedBuilder[] {
  const color = EMBED_COLOR[skillName] ?? EMBED_COLOR['general'];
  const chunks = splitIntoChunks(text, EMBED_DESC_MAX);
  return chunks.map((chunk, i) =>
    new EmbedBuilder()
      .setColor(color)
      .setDescription(chunk)
      .setFooter(
        i === 0
          ? { text: `Skill: ${skillName} • "${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}"` }
          : { text: `(tiếp theo ${i + 1}/${chunks.length})` },
      ),
  );
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
  const history = new ConversationHistoryService();

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

      // Keyword-triggered chart generation
      if (isChartRequest(prompt)) {
        const intent = await parseChartIntent(prompt, llmChat);
        if (intent) {
          try {
            const candles = await fetchOhlcv(intent.symbol, intent.days);
            const imageBuffer = await renderCandlestickChart(intent.symbol, candles, intent.days);
            const attachment = new AttachmentBuilder(imageBuffer, {
              name: `chart-${intent.symbol.toLowerCase()}.png`,
            });
            await message.reply({ files: [attachment], allowedMentions: { users: [] } });
          } catch (chartErr) {
            logger.warn(`Chart generation failed for ${intent.symbol}`, chartErr);
            await message.reply({
              content: `Không lấy được dữ liệu chart cho **${intent.symbol}** — symbol có thể không có trên Bybit.`,
              allowedMentions: { repliedUser: true },
            });
          }
          return;
        }
      }

      // Detect skill from prompt
      const skillName = detectSkill(prompt);
      const skill = getSkill(skillName);
      logger.info(`Skill detected: ${skillName} for prompt="${prompt.slice(0, 60)}"`);

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

      // Load conversation history for this channel
      const channelHistory = history.getHistory(message.channelId);
      history.addUserMessage(message.channelId, prompt);

      const result = await llmChat.complete(enrichedPrompt, channelHistory, skill.systemPrompt);
      if ('error' in result) {
        await message.reply({
          content: LLM_ERROR_USER_MESSAGE,
          allowedMentions: { repliedUser: true },
        });
        return;
      }

      history.addAssistantMessage(message.channelId, result.text);

      const embeds = buildEmbeds(result.text, skillName, prompt);
      // Reply with first embed, send remaining as follow-ups
      await message.reply({ embeds: [embeds[0]], allowedMentions: { users: [] } });
      for (const embed of embeds.slice(1)) {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn(`Mention reply failed in channel ${message.channelId}: ${(err as Error).message}`);
    }
  });
}
