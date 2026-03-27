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
  .setName('call-update')
  .setDescription('Sửa giá call hoặc leverage của kèo')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo cần sửa')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addNumberOption((opt) =>
    opt
      .setName('price')
      .setDescription('Giá call mới (USD)')
      .setRequired(false)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('leverage')
      .setDescription('Leverage mới')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
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
  const price = interaction.options.getNumber('price');
  const leverage = interaction.options.getInteger('leverage');

  if (price === null && leverage === null) {
    await interaction.reply({ content: '❌ Cần nhập ít nhất một giá trị: `price` hoặc `leverage`.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const fields: { name: string; value: string; inline: boolean }[] = [];
  let lastCall = null;

  if (price !== null) {
    const result = await callService.updateCallPrice(callId, price);
    if ('error' in result) {
      await interaction.editReply(`❌ ${result.error}`);
      return;
    }
    lastCall = result.call;
    fields.push({ name: 'Giá call mới', value: `$${price.toLocaleString('en-US')}`, inline: true });
  }

  if (leverage !== null) {
    const result = await callService.updateCallLeverage(callId, leverage);
    if ('error' in result) {
      await interaction.editReply(`❌ ${result.error}`);
      return;
    }
    lastCall = result.call;
    fields.push({ name: 'Leverage mới', value: `x${leverage}`, inline: true });
  }

  const dirEmoji = lastCall!.direction === 'long' ? '📈 LONG' : '📉 SHORT';

  const embed = new EmbedBuilder()
    .setTitle('✏️ Đã cập nhật kèo')
    .setColor(0xf39c12)
    .addFields(
      { name: 'Kèo', value: `${lastCall!.symbol} ${dirEmoji}`, inline: true },
      ...fields,
      { name: 'Updated by', value: `<@${interaction.user.id}>`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
