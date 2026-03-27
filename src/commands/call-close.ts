import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction,
} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { formatPrice } from '../utils/format.js';

let callService: CallService;

export function init(service: CallService): void {
  callService = service;
}

export const data = new SlashCommandBuilder()
  .setName('call-close')
  .setDescription('Admin: đóng kèo và auto-close tất cả positions còn mở')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo để đóng')
      .setRequired(true)
      .setAutocomplete(true)
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

  await interaction.deferReply();

  const result = await callService.adminCloseCall(callId);

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const { call, closedCount, currentPrice } = result;
  const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';

  const embed = new EmbedBuilder()
    .setTitle(`🔒 Kèo đã đóng — ${call.symbol} ${dirEmoji}`)
    .setColor(0x95a5a6)
    .addFields(
      { name: 'Symbol', value: `${call.symbol} ${dirEmoji}`, inline: true },
      { name: 'Call Price', value: formatPrice(call.callPrice), inline: true },
      { name: 'Close Price', value: formatPrice(currentPrice), inline: true },
      { name: 'Auto-closed positions', value: `${closedCount} positions`, inline: true },
      { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
    )
    .setDescription('Tất cả positions còn mở đã được auto-close theo giá hiện tại.')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
