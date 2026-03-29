import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { parseDecimalInput, formatPrice } from '../utils/format.js';

let callService: CallService;

export function init(service: CallService): void {
  callService = service;
}

export const data = new SlashCommandBuilder()
  .setName('call')
  .setDescription('Tạo kèo mới (mua long / bán short)')
  .addStringOption((opt) =>
    opt
      .setName('symbol')
      .setDescription('Ký hiệu coin (vd: BTC, ETH)')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('direction')
      .setDescription('Hướng lệnh')
      .setRequired(true)
      .addChoices(
        { name: 'Mua (long)', value: 'long' },
        { name: 'Bán (short)', value: 'short' }
      )
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
    await interaction.reply({ content: '❌ Giá call không hợp lệ. Vui lòng nhập số dương (vd: 0.27 hoặc 0,27).', flags: MessageFlags.Ephemeral });
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

  const dirEmoji = direction === 'long' ? '📈' : '📉';
  const dirLabel = direction === 'long' ? 'LONG' : 'SHORT';
  const shortId = call.id.slice(-6);

  const LONG_CAPTIONS = [
    '🚀 Thuyền trưởng mở kèo! Ai lên tàu thì nhanh lên, sắp nhổ neo rồi!',
    '⛵ Con thuyền lệnh đã sẵn sàng — bà con đu đỉnh không kịp thở!',
    '🏝️ Hướng ra đảo! Thuyền trưởng dẫn đầu, con dân bơi theo!',
    '🌊 Sóng xanh nổi lên! Thuyền trưởng hô: ALL ABOARD — ai không lên tự bơi!',
    '🦜 Thuyền trưởng phán: "Đu hay không đu?" — Bà con đồng thanh: DU!',
    '⚓ Neo nhổ! Tàu chạy! Ai còn đứng bờ thì khóc một mình nha!',
    '🎯 Thuyền trưởng đã ngắm xong — bà con chuẩn bị đếm tiền thôi!',
    '🌅 Bình minh ló dạng, thuyền trưởng kéo còi: KÈO MỚI — ai ngủ thì ráng chịu!',
    '💪 Thuyền trưởng tuyên bố: "Không long thì thôi, long là long tới bến!"',
    '🥂 Rượu mừng để sẵn, thuyền trưởng chỉ cần bà con lên tàu là đủ!',
  ];
  const SHORT_CAPTIONS = [
    '🔻 Thuyền trưởng lệnh lặn! Ai theo short thì bám chặt vào ghế!',
    '🦈 Short gang tập hợp! Thuyền trưởng dẫn đầu lặn sâu hơn nữa!',
    '📉 Thuyền ngược sóng — thuyền trưởng bắt đỉnh, con dân đu theo!',
    '⚓ Neo thả xuống! Cùng nhau xuống đáy… của giá — không phải tài khoản!',
    '🐋 Cá voi short nổi lên! Con dân nhanh lên tàu, thuyền trưởng không chờ lâu đâu!',
    '🌀 Thuyền trưởng phán: giá này bán được! Ai không tin thì xem lại sau!',
    '🎯 Short team ra trận! Thuyền trưởng đã ngắm — bà con cứ yên tâm mà ngủ!',
    '🔱 Thuyền trưởng hạ lệnh: SHORT là chân lý — ai long thì đó là vấn đề của bạn!',
    '🌊 Thuyền lặn xuống, bà con nín thở — thuyền trưởng bảo đảm lên được!',
    '😤 Thuyền trưởng nhìn chart xong đập bàn: SHORT ĐI BÀ CON ƠI!',
  ];
  const captions = direction === 'long' ? LONG_CAPTIONS : SHORT_CAPTIONS;
  const caption = captions[Math.floor(Math.random() * captions.length)];

  const embed = new EmbedBuilder()
    .setTitle(`${dirEmoji} Kèo mới: **${symbol}** ${dirLabel} x${leverage}`)
    .setColor(direction === 'long' ? 0x57f287 : 0xed4245)
    .setDescription(caption)
    .addFields(
      { name: '💰 Call Price', value: formatPrice(price), inline: true },
      { name: '⚡ Leverage', value: `x${leverage}`, inline: true },
      { name: '⚓ Thuyền trưởng', value: `<@${interaction.user.id}>`, inline: true },
      { name: '🪪 Call ID', value: `\`...${shortId}\``, inline: true },
      { name: '\u200b', value: `> Dùng \`/follow\` để vào lệnh theo kèo này.`, inline: false },
    )
    .setTimestamp();

  await interaction.editReply({ content: '@everyone', embeds: [embed], allowedMentions: { parse: ['everyone'] } });
}
