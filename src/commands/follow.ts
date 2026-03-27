import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction,
} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { parseDecimalInput } from '../utils/format.js';

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
  .addStringOption((opt) =>
    opt
      .setName('entry')
      .setDescription('Giá entry (USD) — vd: 0.27 hoặc 0,27')
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
  const entryRaw = interaction.options.getString('entry', true);
  const entry = parseDecimalInput(entryRaw);
  const leverageOpt = interaction.options.getInteger('leverage') ?? undefined;

  const targetUser = interaction.options.getUser('user');

  if (isNaN(entry) || entry <= 0) {
    await interaction.reply({ content: '❌ Giá entry không hợp lệ. Vui lòng nhập số dương (vd: 0.27 hoặc 0,27).', ephemeral: true });
    return;
  }

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
    .setDescription(`Dùng \`/tp\` hoặc \`/cl\` khi muốn đóng lệnh.\nID: \`...${shortId}\``)
    .addFields(
      { name: 'Call Price', value: `$${call.callPrice.toLocaleString('en-US')}`, inline: true },
      { name: 'Called by', value: `<@${call.calledById}>`, inline: true },
      { name: 'Entry', value: `$${entry.toLocaleString('en-US')}`, inline: true },
      { name: 'Leverage', value: `x${position.leverage}`, inline: true },
      { name: 'User', value: `<@${userId}>`, inline: false },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
