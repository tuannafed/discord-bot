import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction, MessageFlags} from 'discord.js';
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
    await interaction.reply({ content: '❌ Giá entry không hợp lệ. Vui lòng nhập số dương (vd: 0.27 hoặc 0,27).', flags: MessageFlags.Ephemeral });
    return;
  }

  const userId = targetUser?.id ?? interaction.user.id;
  const username = targetUser?.username ?? interaction.user.username;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
    .setDescription([
      `**Call Price:** $${call.callPrice.toLocaleString('en-US')}`,
      `**Called by:** <@${call.calledById}>`,
      `**Entry:** $${entry.toLocaleString('en-US')}`,
      `**Leverage:** x${position.leverage}`,
      `**User:** <@${userId}>`,
      `**Call ID:** \`...${shortId}\``,
      ``,
      `Dùng \`/tp\`, \`/sl\` hoặc \`/cl\` khi muốn đóng lệnh.`,
    ].join('\n'))
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
