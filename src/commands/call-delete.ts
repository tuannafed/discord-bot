import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction, MessageFlags} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { formatPrice } from '../utils/format.js';

let callService: CallService;

export function init(service: CallService): void {
  callService = service;
}

export const data = new SlashCommandBuilder()
  .setName('call-delete')
  .setDescription('Xóa kèo nhầm (xóa luôn các lệnh vào kèo liên quan)')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo cần xóa')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const calls = await callService.getAllCalls(interaction.guildId!);
  const choices = calls.map((c) => ({
    name: `[${c.status.toUpperCase()}] ${c.symbol} ${c.direction.toUpperCase()} @ ${formatPrice(c.callPrice)} x${c.leverage} (${c.id.slice(0, 8)})`,
    value: c.id,
  }));
  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const callId = interaction.options.getString('call_id', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await callService.deleteCall(callId);

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const { call } = result;
  const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Kèo đã xóa')
    .setColor(0xe74c3c)
    .addFields(
      { name: 'Symbol', value: `${call.symbol} ${dirEmoji}`, inline: true },
      { name: 'Call Price', value: formatPrice(call.callPrice), inline: true },
      { name: 'Deleted by', value: `<@${interaction.user.id}>`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
