import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction, MessageFlags} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { formatPrice } from '../utils/format.js';

let callService: CallService;

export function init(service: CallService): void {
  callService = service;
}

export const data = new SlashCommandBuilder()
  .setName('milestone-mute')
  .setDescription('Tắt thông báo mốc PnL cho kèo của bạn')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo muốn tắt thông báo')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const calls = await callService.getActiveCalls(interaction.guildId!);
  const choices = calls.map((c) => ({
    name: `${c.symbol} ${c.direction.toUpperCase()} @ ${formatPrice(c.callPrice)} x${c.leverage} (${c.id.slice(0, 8)})`,
    value: c.id,
  }));
  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const callId = interaction.options.getString('call_id', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await callService.muteMilestone(callId, interaction.user.id);

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  await interaction.editReply('🔕 Đã tắt thông báo milestone cho kèo này. Dùng `/milestone-unmute` để bật lại.');
}
