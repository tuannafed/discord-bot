import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { VoiceBotService } from '../services/voice-bot.service.js';

let voiceBot: VoiceBotService;

export function init(service: VoiceBotService): void {
  voiceBot = service;
}

export const data = new SlashCommandBuilder()
  .setName('voice-leave')
  .setDescription('Bot rời voice channel');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!voiceBot) {
    await interaction.reply({ content: '❌ Voice bot chưa được cấu hình.', flags: MessageFlags.Ephemeral });
    return;
  }

  voiceBot.leave(interaction.guildId!);
  await interaction.reply({ content: '👋 Đã rời voice channel.', flags: MessageFlags.Ephemeral });
}
