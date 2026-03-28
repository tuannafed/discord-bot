import { Message, TextChannel, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import OpenAI, { toFile } from 'openai';
import { Readable } from 'stream';
import { CallService } from './call.service.js';
import { MarketService } from './market.service.js';
import { LlmChatService } from './llm-chat.service.js';
import { parseVoiceIntent, buildConfirmMessage, CONFIRM_REQUIRED } from './voice-intent.service.js';
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

const UNKNOWN_EMBED_DESCRIPTION = [
  '**Bot không nhận ra lệnh trong đoạn audio này.**',
  '',
  'Câu nói phải **bắt đầu bằng keyword lệnh**. Ví dụ:',
  '',
  '📈 **Trading:** `call`, `tạo kèo`, `follow`, `theo kèo`, `vào kèo`',
  '🔴 **Đóng lệnh:** `cl`, `cắt lỗ`, `tp`, `chốt lời`, `sl`, `dừng lỗ`',
  '✏️ **Sửa kèo:** `sửa kèo`, `cập nhật kèo`, `sửa follow`, `cập nhật follow`',
  '📊 **Xem thông tin:** `positions`, `vị thế`, `coin`, `xem giá`, `top`, `movers`, `biến động`, `watchlist`, `alert`, `cảnh báo`, `funding`',
  '',
  'Gõ `/help-voice` để xem hướng dẫn đầy đủ.',
].join('\n');

export class VoiceMessageService {
  private readonly openai: OpenAI;

  constructor(
    private readonly llm: LlmChatService,
    private readonly callService: CallService,
    openaiApiKey: string,
    private readonly marketService?: MarketService,
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
        // Hint vocabulary so Whisper transcribes trading terms correctly
        prompt: 'call, tạo kèo, follow, theo kèo, vào kèo, cl, cắt lỗ, cut loss, tp, chốt lời, take profit, sl, stop loss, dừng lỗ, follow update, call update, sửa kèo, cập nhật kèo, sửa follow, cập nhật follow, positions, vị thế, xem vị thế, lệnh đang mở, coin, xem giá, giá coin, top, top coin, movers, biến động, watchlist, danh sách theo dõi, alert, cảnh báo, funding, phí funding, funding rate, lãi suất, long, short, BTC, ETH, SOL, BNB, entry, leverage, đòn bẩy, kèo',
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
      await this.handleUnknown(transcript, message);
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

  /** Show transcript + guidance embed when no command keyword detected */
  private async handleUnknown(transcript: string, message: Message): Promise<void> {
    const shortTranscript = transcript.length > 200
      ? transcript.slice(0, 200) + '…'
      : transcript;

    const embed = new EmbedBuilder()
      .setColor(0xed4245) // Discord red
      .setTitle('🎙️ Không nhận ra lệnh')
      .addFields({ name: 'Bot nghe được', value: `*"${shortTranscript}"*` })
      .setDescription(UNKNOWN_EMBED_DESCRIPTION);

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: true } });
    logger.info(`Voice unknown command from ${message.author.username}: "${transcript.slice(0, 80)}"`);
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
