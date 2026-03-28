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
  .setName('follow-update')
  .setDescription('Sửa giá vào lệnh hoặc đòn bẩy của lệnh vào kèo')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo cần sửa')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('entry')
      .setDescription('Giá entry mới (USD) — vd: 0.27 hoặc 0,27')
      .setRequired(false)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('leverage')
      .setDescription('Đòn bẩy mới')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('Member cần sửa (chỉ admin, mặc định là bạn)')
      .setRequired(false)
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const calls = await callService.getActiveCalls(interaction.guildId!);
  const choices = calls.map((c) => ({
    name: `${c.symbol} ${c.direction.toUpperCase()} @ ${c.callPrice.toLocaleString('en-US')} x${c.leverage} (${c.id.slice(0, 8)})`,
    value: c.id,
  }));
  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const callId = interaction.options.getString('call_id', true);
  const entryRaw = interaction.options.getString('entry');
  const entry = entryRaw !== null ? parseDecimalInput(entryRaw) : null;
  const leverage = interaction.options.getInteger('leverage');
  const targetUser = interaction.options.getUser('user');

  if (entry !== null && (isNaN(entry) || entry <= 0)) {
    await interaction.reply({ content: '❌ Giá entry không hợp lệ. Vui lòng nhập số dương (vd: 0.27 hoặc 0,27).', flags: MessageFlags.Ephemeral });
    return;
  }

  if (entry === null && leverage === null) {
    await interaction.reply({ content: '❌ Cần nhập ít nhất một giá trị: `entry` hoặc `leverage`.', flags: MessageFlags.Ephemeral });
    return;
  }

  const userId = targetUser?.id ?? interaction.user.id;
  const displayUser = targetUser ?? interaction.user;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const fields: { name: string; value: string; inline: boolean }[] = [];
  let lastCall = null;

  if (entry !== null) {
    const result = await callService.updatePositionEntry(callId, userId, entry);
    if ('error' in result) {
      await interaction.editReply(`❌ ${result.error}`);
      return;
    }
    lastCall = result.call;
    fields.push({ name: 'Entry mới', value: `$${entry.toLocaleString('en-US')}`, inline: true });
  }

  if (leverage !== null) {
    const result = await callService.updatePositionLeverage(callId, userId, leverage);
    if ('error' in result) {
      await interaction.editReply(`❌ ${result.error}`);
      return;
    }
    lastCall = result.call;
    fields.push({ name: 'Leverage mới', value: `x${leverage}`, inline: true });
  }

  const dirEmoji = lastCall!.direction === 'long' ? '📈 LONG' : '📉 SHORT';

  const embed = new EmbedBuilder()
    .setTitle('✏️ Đã cập nhật lệnh follow')
    .setColor(0xf39c12)
    .addFields(
      { name: 'Kèo', value: `${lastCall!.symbol} ${dirEmoji}`, inline: true },
      ...fields,
      { name: 'User', value: `<@${displayUser.id}>`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
