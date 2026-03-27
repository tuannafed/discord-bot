import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { CallService } from '../services/call.service.js';
import { parseDecimalInput } from '../utils/format.js';

let callService: CallService;

export function init(service: CallService): void {
  callService = service;
}

export const data = new SlashCommandBuilder()
  .setName('call')
  .setDescription('Tạo kèo future mới')
  .addStringOption((opt) =>
    opt
      .setName('symbol')
      .setDescription('Symbol coin (vd: BTC, ETH)')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('direction')
      .setDescription('Long hay Short')
      .setRequired(true)
      .addChoices({ name: 'Long', value: 'long' }, { name: 'Short', value: 'short' })
  )
  .addStringOption((opt) =>
    opt
      .setName('price')
      .setDescription('Giá call kèo (USD) — vd: 0.27 hoặc 0,27')
      .setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('leverage')
      .setDescription('Đòn bẩy (mặc định x20)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true).toUpperCase();
  const direction = interaction.options.getString('direction', true) as 'long' | 'short';
  const priceRaw = interaction.options.getString('price', true);
  const price = parseDecimalInput(priceRaw);
  const leverage = interaction.options.getInteger('leverage') ?? 20;

  if (isNaN(price) || price <= 0) {
    await interaction.reply({ content: '❌ Giá call không hợp lệ. Vui lòng nhập số dương (vd: 0.27 hoặc 0,27).', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const call = await callService.createCall({
    guildId: interaction.guildId!,
    channelId: interaction.channelId,
    symbol,
    direction,
    callPrice: price,
    leverage,
    calledBy: interaction.user.username,
    calledById: interaction.user.id,
  });

  const dirEmoji = direction === 'long' ? '📈 LONG' : '📉 SHORT';
  const shortId = call.id.slice(-6);
  const embed = new EmbedBuilder()
    .setTitle(`🎯 Kèo mới: ${symbol} ${dirEmoji}`)
    .setColor(direction === 'long' ? 0x2ecc71 : 0xe74c3c)
    .setDescription(`Dùng \`/follow\` để vào lệnh theo kèo này.\nID: \`...${shortId}\``)
    .addFields(
      { name: 'Call Price', value: `$${price.toLocaleString('en-US')}`, inline: true },
      { name: 'Leverage', value: `x${leverage}`, inline: true },
      { name: 'Called by', value: `<@${interaction.user.id}>`, inline: false },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
