import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags} from 'discord.js';
import { CallService } from '../services/call.service.js';

let callService: CallService;

export function init(service: CallService): void {
  callService = service;
}

export const data = new SlashCommandBuilder()
  .setName('position-fix')
  .setDescription('Xóa lệnh vào kèo trùng khi người call lỡ join kèo của chính mình');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const removed = await callService.fixCallerDuplicatePositions(interaction.guildId!);

  if (removed === 0) {
    await interaction.editReply('✅ Không tìm thấy position bị dup.');
  } else {
    await interaction.editReply(`✅ Đã xóa **${removed}** position bị dup.`);
  }
}
