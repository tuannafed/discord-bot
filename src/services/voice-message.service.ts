import { Message, TextChannel, MessageFlags } from 'discord.js';
import axios from 'axios';
import OpenAI, { toFile } from 'openai';
import { Readable } from 'stream';
import { CallService } from './call.service.js';
import { LlmChatService } from './llm-chat.service.js';
import { parseVoiceIntent, buildConfirmMessage } from './voice-intent.service.js';
import { executeVoiceIntent } from './voice-executor.service.js';
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

  constructor(
    private readonly llm: LlmChatService,
    private readonly callService: CallService,
    openaiApiKey: string,
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
      // Not a trade command — ignore silently (might be normal chat)
      return;
    }

    const confirmMsg = buildConfirmMessage(intent);
    if (!confirmMsg) return;

    // Send confirmation and add reactions
    const reply = await message.reply({
      content: `🎙️ *"${transcript}"*\n\n${confirmMsg}`,
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

    // Auto-cleanup after timeout
    setTimeout(() => {
      if (pendingConfirms.has(reply.id)) {
        pendingConfirms.delete(reply.id);
        reply.reactions.removeAll().catch(() => undefined);
      }
    }, CONFIRM_TIMEOUT_MS);
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
      await channel.send({ content: '↩️ Đã huỷ lệnh.' });
      return;
    }

    if (emoji !== '✅') return;

    const result = await executeVoiceIntent(pending.intent, {
      guildId,
      userId,
      username,
      channel,
      callService: this.callService,
    });

    await channel.send({ content: result.message });
  }
}
