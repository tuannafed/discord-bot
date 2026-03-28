import {
  joinVoiceChannel,
  createAudioPlayer,
  VoiceConnectionStatus,
  EndBehaviorType,
  getVoiceConnection,
  AudioPlayerStatus,
} from '@discordjs/voice';
import { VoiceChannel, TextChannel, Client } from 'discord.js';
import { Readable } from 'stream';
import OpenAI from 'openai';
import { toFile } from 'openai';
import { CallService } from './call.service.js';
import { LlmChatService } from './llm-chat.service.js';
import { parseVoiceIntent, buildConfirmMessage, isConfirmation, isCancellation, type VoiceIntent } from './voice-intent.service.js';
import { executeVoiceIntent } from './voice-executor.service.js';
import { logger } from '../utils/logger.js';

const WAKE_WORD = 'hey bot';
const LISTEN_TIMEOUT_MS = 8_000;   // max time to listen after wake word
const CONFIRM_TIMEOUT_MS = 10_000; // max time to wait for OK/cancel
const SILENCE_THRESHOLD_MS = 1_500; // stop recording after this silence

type SessionState =
  | { phase: 'idle' }
  | { phase: 'listening'; userId: string; startedAt: number }
  | { phase: 'confirming'; userId: string; intent: VoiceIntent; textChannel: TextChannel; startedAt: number };

export class VoiceBotService {
  private readonly openai: OpenAI;
  private sessions = new Map<string, SessionState>(); // guildId → state
  private readonly player = createAudioPlayer();

  constructor(
    private readonly client: Client,
    private readonly llm: LlmChatService,
    private readonly callService: CallService,
    apiKey: string,
  ) {
    this.openai = new OpenAI({ apiKey });
  }

  /** Join voice channel and start listening */
  async join(voiceChannel: VoiceChannel, textChannel: TextChannel): Promise<void> {
    const guildId = voiceChannel.guild.id;

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
    });

    this.sessions.set(guildId, { phase: 'idle' });

    connection.on(VoiceConnectionStatus.Ready, () => {
      logger.info(`Voice bot joined ${voiceChannel.name} in guild ${guildId}`);
      this.startListening(connection, guildId, textChannel);
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.sessions.delete(guildId);
      logger.info(`Voice bot disconnected from guild ${guildId}`);
    });
  }

  leave(guildId: string): void {
    const connection = getVoiceConnection(guildId);
    connection?.destroy();
    this.sessions.delete(guildId);
  }

  private startListening(connection: any, guildId: string, textChannel: TextChannel): void {
    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId: string) => {
      const session = this.sessions.get(guildId) ?? { phase: 'idle' };

      // Collect audio stream for this user
      const audioStream = receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: SILENCE_THRESHOLD_MS },
      });

      const chunks: Buffer[] = [];
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));

      audioStream.on('end', async () => {
        if (chunks.length === 0) return;
        const audioBuffer = Buffer.concat(chunks);

        try {
          const transcript = await this.transcribe(audioBuffer);
          if (!transcript) return;

          logger.info(`Voice transcript [${userId}]: "${transcript}"`);
          await this.handleTranscript(transcript, userId, guildId, textChannel, session);
        } catch (err) {
          logger.warn('Voice transcription failed', err);
        }
      });
    });
  }

  private async transcribe(audioBuffer: Buffer): Promise<string | null> {
    if (audioBuffer.length < 1000) return null; // too short — skip noise

    const file = await toFile(Readable.from(audioBuffer), 'audio.pcm', { type: 'audio/wav' });
    const response = await this.openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'vi',
    });

    const text = response.text?.trim();
    return text || null;
  }

  private async handleTranscript(
    transcript: string,
    userId: string,
    guildId: string,
    textChannel: TextChannel,
    session: SessionState,
  ): Promise<void> {
    const lower = transcript.toLowerCase();

    // --- Phase: CONFIRMING — waiting for OK or cancel ---
    if (session.phase === 'confirming' && session.userId === userId) {
      if (Date.now() - session.startedAt > CONFIRM_TIMEOUT_MS) {
        this.sessions.set(guildId, { phase: 'idle' });
        await textChannel.send(`⏱️ <@${userId}> Hết thời gian xác nhận. Lệnh đã huỷ.`);
        return;
      }

      if (isConfirmation(transcript)) {
        this.sessions.set(guildId, { phase: 'idle' });
        const member = await textChannel.guild.members.fetch(userId);
        const result = await executeVoiceIntent(session.intent, {
          guildId,
          userId,
          username: member.user.username,
          channel: textChannel,
          callService: this.callService,
        });
        await textChannel.send(`<@${userId}> ${result.message}`);
        return;
      }

      if (isCancellation(transcript)) {
        this.sessions.set(guildId, { phase: 'idle' });
        await textChannel.send(`🚫 <@${userId}> Đã huỷ lệnh.`);
        return;
      }

      // Not a clear confirm/cancel — re-prompt
      await textChannel.send(`<@${userId}> Nói **OK** để xác nhận hoặc **Không** để huỷ.`);
      return;
    }

    // --- Phase: IDLE — detect wake word ---
    if (session.phase === 'idle') {
      if (lower.includes(WAKE_WORD)) {
        this.sessions.set(guildId, { phase: 'listening', userId, startedAt: Date.now() });
        await textChannel.send(`👂 <@${userId}> Mình nghe đây, nói lệnh của bạn...`);

        // Auto-reset if user doesn't continue
        setTimeout(() => {
          const current = this.sessions.get(guildId);
          if (current?.phase === 'listening' && current.userId === userId) {
            this.sessions.set(guildId, { phase: 'idle' });
          }
        }, LISTEN_TIMEOUT_MS);
      }
      return;
    }

    // --- Phase: LISTENING — user said wake word, now parse command ---
    if (session.phase === 'listening' && session.userId === userId) {
      if (Date.now() - session.startedAt > LISTEN_TIMEOUT_MS) {
        this.sessions.set(guildId, { phase: 'idle' });
        return;
      }

      // Check if the transcript already contains the wake word + command in one breath
      const commandText = lower.includes(WAKE_WORD)
        ? transcript.slice(lower.indexOf(WAKE_WORD) + WAKE_WORD.length).trim()
        : transcript;

      if (!commandText) return;

      const intent = await parseVoiceIntent(commandText, this.llm);

      if (intent.command === 'unknown') {
        this.sessions.set(guildId, { phase: 'idle' });
        await textChannel.send(`❓ <@${userId}> Mình không hiểu lệnh. Thử lại nhé (ví dụ: "Hey bot call BTC long giá 65000")`);
        return;
      }

      const confirmMsg = buildConfirmMessage(intent);
      if (!confirmMsg) {
        this.sessions.set(guildId, { phase: 'idle' });
        return;
      }

      this.sessions.set(guildId, {
        phase: 'confirming',
        userId,
        intent,
        textChannel,
        startedAt: Date.now(),
      });

      await textChannel.send(`<@${userId}> ${confirmMsg}`);
    }
  }
}
