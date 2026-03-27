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
  .setName('follow')
  .setDescription('Vào lệnh theo một kèo đang active')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo để follow')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addNumberOption((opt) =>
    opt
      .setName('entry')
      .setDescription('Giá entry của bạn (USD)')
      .setRequired(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const calls = await callService.getActiveCalls(guildId);
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

  const result = await callService.joinCall({
    callId,
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    username: interaction.user.username,
    entryPrice: entry,
  });

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const { call } = result;
  const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
  const embed = new EmbedBuilder()
    .setTitle(`✅ Đã join kèo ${call.symbol} ${dirEmoji}`)
    .setColor(0x5865f2)
    .addFields(
      { name: 'Kèo', value: `${call.symbol} ${dirEmoji} @ $${call.callPrice.toLocaleString('en-US')}`, inline: false },
      { name: 'Entry của bạn', value: `$${entry.toLocaleString('en-US')}`, inline: true },
    )
    .setDescription('Dùng `/tp` hoặc `/cl` khi muốn đóng lệnh.')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
