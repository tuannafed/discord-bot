import { Message, TextChannel } from 'discord.js';
import axios from 'axios';
import OpenAI, { toFile } from 'openai';
import { Readable } from 'stream';
import { CallService } from './call.service.js';
import { MarketService } from './market.service.js';
import { LlmChatService } from './llm-chat.service.js';
import { parseVoiceIntent, buildConfirmMessage, CONFIRM_REQUIRED } from './voice-intent.service.js';
import { executeVoiceIntent } from './voice-executor.service.js';
import { detectSkill, getSkill } from './llm-skills.js';
import { shouldSearch, formatSearchContext, type TavilySearchService } from './tavily-search.service.js';
import { ConversationHistoryService } from './conversation-history.service.js';
import { logger } from '../utils/logger.js';

// Discord voice message attachment flag
const VOICE_MESSAGE_FLAG = 1 << 13; // MessageFlags.IsVoiceMessage = 8192

// Max audio size: ~30s at 16kHz mono 16-bit = ~960KB (ogg/opus is compressed, usually <300KB for 30s)
const MAX_AUDIO_BYTES = 1_000_000; // 1MB hard limit

// Pending confirmations: messageId → { intent, originalMessage }
const pendingConfirms = new Map<string, {
  intent: Awaited<ReturnType<typeof parseVoiceIntent>>;
  originalMessage: Message;
  expiresAt: number;
}>();

const CONFIRM_TIMEOUT_MS = 60_000; // 1 minute to confirm

export class VoiceMessageService {
  private readonly openai: OpenAI;
  private readonly history = new ConversationHistoryService();

  constructor(
    private readonly llm: LlmChatService,
    private readonly callService: CallService,
    openaiApiKey: string,
    private readonly marketService?: MarketService,
    private readonly tavilySearch?: TavilySearchService | null,
  ) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  /** Returns true if message is a Discord voice message attachment */
  static isVoiceMessage(message: Message): boolean {
    // Discord sets IS_VOICE_MESSAGE flag (8192) on voice messages
    if ((message.flags.bitfield & VOICE_MESSAGE_FLAG) !== 0) return true;
    // Fallback: check for ogg attachment with content_type audio
    return message.attachments.some(
      (a) => a.contentType?.startsWith('audio/') && a.name?.endsWith('.ogg'),
    );
  }

  async handle(message: Message): Promise<void> {
    const attachment = message.attachments.find(
      (a) => a.contentType?.startsWith('audio/') || a.name?.endsWith('.ogg'),
    );
    if (!attachment) return;

    if (attachment.size > MAX_AUDIO_BYTES) {
      await message.reply({ content: '❌ Tin nhắn thoại quá dài (tối đa ~30s).' });
      return;
    }

    // Download audio
    let audioBuffer: Buffer;
    try {
      const response = await axios.get<ArrayBuffer>(attachment.url, { responseType: 'arraybuffer' });
      audioBuffer = Buffer.from(response.data);
    } catch (err) {
      logger.warn(`Failed to download voice message: ${(err as Error).message}`);
      return;
    }

    // Transcribe via Whisper
    let transcript: string;
    try {
      const file = await toFile(Readable.from(audioBuffer), attachment.name ?? 'audio.ogg', {
        type: attachment.contentType ?? 'audio/ogg',
      });
      const result = await this.openai.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: 'vi',
      });
      transcript = result.text?.trim() ?? '';
    } catch (err) {
      logger.warn(`Whisper transcription failed: ${(err as Error).message}`);
      await message.reply({ content: '❌ Không thể nhận diện giọng nói. Thử lại nhé.' });
      return;
    }

    if (!transcript) return;
    logger.info(`Voice transcript from ${message.author.username}: "${transcript}"`);

    // Parse intent via LLM
    const intent = await parseVoiceIntent(transcript, this.llm);

    if (intent.command === 'unknown') {
      // Not a trade command — fallback to LLM chat (same as text mention)
      await this.handleAsChat(transcript, message);
      return;
    }

    const context = {
      guildId: message.guild!.id,
      userId: message.author.id,
      username: message.member?.displayName ?? message.author.username,
      channel: message.channel as TextChannel,
      callService: this.callService,
      marketService: this.marketService,
    };

    // Read-only commands: execute immediately, no confirm needed
    if (!CONFIRM_REQUIRED.has(intent.command as never)) {
      const result = await executeVoiceIntent(intent, context);
      await message.reply({ content: `🎙️ *"${transcript}"*\n\n${result.message}`, allowedMentions: { repliedUser: true } });
      return;
    }

    const confirmMsg = buildConfirmMessage(intent);
    if (!confirmMsg) return;

    // Trading commands: send confirmation with reactions
    const reply = await message.reply({
      content: `🎙️ *"${transcript}"*\n\n${confirmMsg}\n\nReact ✅ để xác nhận hoặc ❌ để huỷ.`,
      allowedMentions: { repliedUser: true },
    });

    await reply.react('✅');
    await reply.react('❌');

    // Store pending confirmation keyed by reply message ID
    pendingConfirms.set(reply.id, {
      intent,
      originalMessage: message,
      expiresAt: Date.now() + CONFIRM_TIMEOUT_MS,
    });

    // Auto-delete after timeout (no action taken)
    setTimeout(() => {
      if (pendingConfirms.has(reply.id)) {
        pendingConfirms.delete(reply.id);
        reply.delete().catch(() => undefined);
      }
    }, CONFIRM_TIMEOUT_MS);
  }

  /** Fallback: treat transcript as a text chat message (skill + Tavily) */
  private async handleAsChat(transcript: string, message: Message): Promise<void> {
    const channelId = message.channel.id;
    const skillName = detectSkill(transcript);
    const skill = getSkill(skillName);

    let enrichedPrompt = transcript;
    if (this.tavilySearch && shouldSearch(transcript)) {
      const results = await this.tavilySearch.search(transcript);
      const context = formatSearchContext(results);
      if (context) enrichedPrompt = `${context}\n\nCâu hỏi: ${transcript}`;
    }

    const channelHistory = this.history.getHistory(channelId);
    this.history.addUserMessage(channelId, transcript);

    const result = await this.llm.complete(enrichedPrompt, channelHistory, skill.systemPrompt);
    if ('error' in result) {
      await message.reply({ content: `🎙️ *"${transcript}"*\n\n❌ Không thể xử lý. Thử lại nhé.` });
      return;
    }

    this.history.addAssistantMessage(channelId, result.text);
    logger.info(`Voice chat skill=${skillName} for transcript="${transcript.slice(0, 60)}"`);

    // Split if > 4096 chars
    const MAX = 4000;
    const text = result.text;
    const prefix = `🎙️ *"${transcript.slice(0, 80)}${transcript.length > 80 ? '…' : ''}"*\n\n`;
    if (prefix.length + text.length <= MAX) {
      await message.reply({ content: prefix + text, allowedMentions: { repliedUser: true } });
    } else {
      await message.reply({ content: prefix + text.slice(0, MAX - prefix.length), allowedMentions: { repliedUser: true } });
      let remaining = text.slice(MAX - prefix.length);
      while (remaining.length > 0) {
        await (message.channel as TextChannel).send({ content: remaining.slice(0, MAX) });
        remaining = remaining.slice(MAX);
      }
    }
  }

  /** Call this from messageReactionAdd event to handle ✅/❌ */
  async handleReaction(
    messageId: string,
    emoji: string,
    userId: string,
    channel: TextChannel,
    guildId: string,
    username: string,
  ): Promise<void> {
    const pending = pendingConfirms.get(messageId);
    if (!pending) return;

    // Only the original sender can confirm
    if (userId !== pending.originalMessage.author.id) return;

    // Expired?
    if (Date.now() > pending.expiresAt) {
      pendingConfirms.delete(messageId);
      return;
    }

    pendingConfirms.delete(messageId);

    if (emoji === '❌') {
      // Delete the confirm message immediately
      const confirmMessage = await channel.messages.fetch(messageId).catch(() => null);
      await confirmMessage?.delete().catch(() => undefined);
      return;
    }

    if (emoji !== '✅') return;

    const result = await executeVoiceIntent(pending.intent, {
      guildId,
      userId,
      username,
      channel,
      callService: this.callService,
      marketService: this.marketService,
    });

    await channel.send({ content: result.message });
  }
}
