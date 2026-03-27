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
  .setName('cl')
  .setDescription('Cut loss — đóng lệnh của bạn với kết quả âm')
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

  const result = await callService.closeUserPosition({
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    username: interaction.user.username,
    callId,
    closeType: 'cl',
  });

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const { position, call, currentPrice } = result;
  const pnlPct = position.pnlPct ?? 0;
  const sign = pnlPct >= 0 ? '+' : '';
  const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';

  const embed = new EmbedBuilder()
    .setTitle(`❌ Cut Loss — ${call.symbol} ${dirEmoji}`)
    .setColor(0xe74c3c)
    .addFields(
      { name: 'Symbol', value: `${call.symbol} ${dirEmoji}`, inline: true },
      { name: 'Entry', value: formatPrice(position.entryPrice), inline: true },
      { name: 'Close Price', value: formatPrice(currentPrice), inline: true },
      { name: 'P&L', value: `**${sign}${pnlPct.toFixed(2)}%**`, inline: true },
      { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
