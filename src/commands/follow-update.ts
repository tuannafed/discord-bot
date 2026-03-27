import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction,
} from 'discord.js';
import { CallService } from '../services/call.service.js';

let callService: CallService;

export function init(service: CallService): void {
  callService = service;
}

export const data = new SlashCommandBuilder()
  .setName('follow-update')
  .setDescription('Sửa giá entry của bạn trong một kèo')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo cần sửa entry')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addNumberOption((opt) =>
    opt
      .setName('entry')
      .setDescription('Giá entry mới (USD)')
      .setRequired(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const calls = await callService.getActiveCalls(interaction.guildId!);
  const choices = calls.map((c) => ({
    name: `${c.symbol} ${c.direction.toUpperCase()} @ ${c.callPrice.toLocaleString('en-US')} (${c.id.slice(0, 8)})`,
    value: c.id,
  }));
  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const callId = interaction.options.getString('call_id', true);
  const entry = interaction.options.getNumber('entry', true);

  await interaction.deferReply({ ephemeral: true });

  const result = await callService.updatePositionEntry(callId, interaction.user.id, entry);

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const { call } = result;
  const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';

  const embed = new EmbedBuilder()
    .setTitle('✏️ Đã cập nhật entry')
    .setColor(0xf39c12)
    .addFields(
      { name: 'Kèo', value: `${call.symbol} ${dirEmoji}`, inline: true },
      { name: 'Entry mới', value: `$${entry.toLocaleString('en-US')}`, inline: true },
      { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
