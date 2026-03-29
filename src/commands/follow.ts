import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction, MessageFlags} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { parseDecimalInput, formatPrice } from '../utils/format.js';

let callService: CallService;

export function init(service: CallService): void {
  callService = service;
}

export const data = new SlashCommandBuilder()
  .setName('follow')
  .setDescription('Vào lệnh theo kèo đang mở')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo để vào lệnh')
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
      .setDescription('Vào lệnh hộ member khác (chỉ admin)')
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
  const dirEmoji = call.direction === 'long' ? '📈' : '📉';
  const dirLabel = call.direction === 'long' ? 'LONG' : 'SHORT';
  const shortId = call.id.slice(-6);

  const LONG_CAPTIONS = [
    '⛵ Con dân đã lên tàu! Thuyền trưởng gật đầu hài lòng lắm!',
    '🎉 Một chiến binh nữa gia nhập đội! Tàu ngày càng đông vui!',
    '🏝️ Vé đã cắm! Bà con cùng nhau ra đảo nào!',
    '🚀 Đã vào lệnh! Thắt dây an toàn chờ tên lửa cất cánh thôi!',
    '⚓ Chào mừng lên tàu! Thuyền trưởng đang lái, bà con cứ ngồi yên hưởng!',
    '🌊 Sóng to nhưng tàu vững! Con dân đã an vị, chuẩn bị đu thôi!',
    '🥳 Gia nhập thành công! Cùng thuyền trưởng làm giàu nào bà con ơi!',
  ];
  const SHORT_CAPTIONS = [
    '🦈 Con dân đã nhảy xuống biển cùng thuyền trưởng! Short gang đủ mặt!',
    '🔻 Lặn rồi! Bà con bám chặt vào — thuyền trưởng dẫn xuống đáy giá!',
    '😤 Một chiến binh short nữa! Thuyền trưởng cười đắc ý lắm!',
    '🐋 Nhập hội cá voi short thành công! Đợi giá về đáy thôi bà con!',
    '🌀 Đã vào kèo short! Bình tĩnh, thuyền trưởng có tất cả trong tầm kiểm soát!',
    '⚓ Neo thả xuống cùng thuyền trưởng! Ai theo short là người sáng suốt!',
    '🎯 Short gang +1! Cùng nhau kiếm tiền trong cơn bão giá nào!',
  ];
  const captions = call.direction === 'long' ? LONG_CAPTIONS : SHORT_CAPTIONS;
  const caption = captions[Math.floor(Math.random() * captions.length)];

  const embed = new EmbedBuilder()
    .setTitle(`✅ Đã lên tàu: ${call.symbol} ${dirEmoji} ${dirLabel}`)
    .setColor(call.direction === 'long' ? 0x57f287 : 0xed4245)
    .setDescription(caption)
    .addFields(
      { name: '⚓ Thuyền trưởng', value: `<@${call.calledById}>`, inline: true },
      { name: '💰 Call Price', value: formatPrice(call.callPrice), inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '🎯 Entry của bạn', value: formatPrice(entry), inline: true },
      { name: '⚡ Leverage', value: `x${position.leverage}`, inline: true },
      { name: '👤 Con dân', value: `<@${userId}>`, inline: true },
      { name: '🪪 Call ID', value: `\`...${shortId}\``, inline: true },
      { name: '\u200b', value: `> Dùng \`/tp\`, \`/sl\` hoặc \`/cl\` khi muốn đóng lệnh.`, inline: false },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
