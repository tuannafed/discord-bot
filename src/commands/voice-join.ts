import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  VoiceChannel,
  TextChannel,
  MessageFlags,
} from 'discord.js';
import { VoiceBotService } from '../services/voice-bot.service.js';

let voiceBot: VoiceBotService;

export function init(service: VoiceBotService): void {
  voiceBot = service;
}

export const data = new SlashCommandBuilder()
  .setName('voice-join')
  .setDescription('Bot tham gia voice channel để nghe lệnh thoại (nói "Hey bot ...")');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
    await interaction.reply({ content: '❌ Bạn cần vào voice channel trước.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!voiceBot) {
    await interaction.reply({ content: '❌ Voice bot chưa được cấu hình (thiếu OPENAI_API_KEY).', flags: MessageFlags.Ephemeral });
    return;
  }

  const textChannel = interaction.channel as TextChannel;
  await voiceBot.join(voiceChannel, textChannel);
  await interaction.reply({ content: `🎙️ Đã vào **${voiceChannel.name}**! Nói **"Hey bot"** rồi ra lệnh nhé.`, flags: MessageFlags.Ephemeral });
}
