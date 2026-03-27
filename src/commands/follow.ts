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
      .setDescription('Giá entry (USD)')
      .setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('leverage')
      .setDescription('Đòn bẩy riêng (mặc định theo kèo)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('Follow cho member khác (chỉ admin)')
      .setRequired(false)
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
  const leverageOpt = interaction.options.getInteger('leverage') ?? undefined;
  const targetUser = interaction.options.getUser('user');

  const userId = targetUser?.id ?? interaction.user.id;
  const username = targetUser?.username ?? interaction.user.username;

  await interaction.deferReply({ ephemeral: true });

  const result = await callService.joinCall({
    callId,
    guildId: interaction.guildId!,
    userId,
    username,
    entryPrice: entry,
    leverage: leverageOpt,
  });

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const { call, position } = result;
  const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
  const shortId = call.id.slice(-6);
  const embed = new EmbedBuilder()
    .setTitle(`✅ Đã join kèo ${call.symbol} ${dirEmoji}`)
    .setColor(0x5865f2)
    .addFields(
      { name: 'Symbol', value: `${call.symbol} ${dirEmoji}`, inline: true },
      { name: 'Call Price', value: `$${call.callPrice.toLocaleString('en-US')}`, inline: true },
      { name: 'Called by', value: `<@${call.calledById}>`, inline: true },
      { name: 'ID', value: `\`...${shortId}\``, inline: true },
      { name: 'User', value: `<@${userId}>`, inline: true },
      { name: 'Entry', value: `$${entry.toLocaleString('en-US')}`, inline: true },
      { name: 'Leverage', value: `x${position.leverage}`, inline: true },
    )
    .setDescription('Dùng `/tp` hoặc `/cl` khi muốn đóng lệnh.')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
