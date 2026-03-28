import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help-voice')
  .setDescription('Hướng dẫn dùng lệnh bằng giọng nói (voice message)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embedHow = new EmbedBuilder()
    .setTitle('🎙️ Lệnh giọng nói — Cách dùng')
    .setColor(0x5865f2)
    .setDescription(
      'Bấm nút 🎤 **mic** ở góc phải ô chat → ghi âm → gửi.\n' +
      'Bot tự nhận diện và xử lý. **Không cần tag bot.**\n\n' +
      '**Quy tắc quan trọng:** câu nói phải **bắt đầu bằng keyword lệnh**.\n' +
      'Nếu không có keyword → bot hiểu là chat thường và trả lời bằng AI.',
    );

  const embedTrading = new EmbedBuilder()
    .setTitle('📈 Lệnh trading (cần xác nhận ✅❌)')
    .setColor(0xf0a500)
    .addFields(
      {
        name: '`call` — Tạo kèo mới',
        value: '```\ncall BTC long x20 giá 65k\ncall kèo ETH short giá 3000 đòn 10\ncall BTC long giá 65.000 leverage 20\n```',
      },
      {
        name: '`follow` — Vào theo kèo',
        value: '```\nfollow kèo BTC entry 64000\nfollow BTC giá của tôi là 64k đòn 10\nfollow long BTC entry 64000 x10\n```',
      },
      {
        name: '`cl` / `tp` / `sl` — Đóng lệnh',
        value: '```\ncl BTC          (cắt lỗ)\ntp BTC          (chốt lời)\nsl BTC          (stop loss)\ncắt lỗ BTC\nchốt lời BTC\n```',
      },
      {
        name: '`call update` — Sửa kèo',
        value: '```\ncall update kèo BTC giá 65500\ncall update BTC đòn 20\n```',
      },
      {
        name: '`follow update` — Sửa lệnh follow',
        value: '```\nfollow update kèo BTC giá 64500\nfollow update BTC đòn 15\n```',
      },
    );

  const embedReadonly = new EmbedBuilder()
    .setTitle('📊 Lệnh xem thông tin (thực hiện ngay)')
    .setColor(0x26cb7c)
    .addFields(
      {
        name: '`positions` — Xem lệnh đang mở',
        value: '```\npositions\nchạy positions\nxem positions\n```',
      },
      {
        name: '`coin` — Xem giá coin',
        value: '```\ncoin BTC\ncoin ETH hôm nay\n```',
      },
      {
        name: '`top` / `movers` / `funding`',
        value: '```\ntop\ntop coin\nmovers\nfunding BTC\n```',
      },
      {
        name: '`watchlist` / `alert`',
        value: '```\nwatchlist\nalert\nalert list\n```',
      },
    );

  const embedChat = new EmbedBuilder()
    .setTitle('💬 Chat AI bằng giọng nói')
    .setColor(0x2b2d31)
    .setDescription(
      'Nếu không bắt đầu bằng keyword lệnh, bot sẽ trả lời như chat AI bình thường.\n' +
      'Hỗ trợ đầy đủ: tin tức, phân tích, tử vi, tâm lý, ...',
    )
    .addFields({
      name: 'Ví dụ chat',
      value: '```\nBTC hôm nay thế nào?\nList 5 tin tức crypto hôm nay\nPhân tích ETH tuần này\n```',
    });

  const embedTip = new EmbedBuilder()
    .setColor(0xfee75c)
    .addFields({
      name: '💡 Mẹo',
      value: [
        '• Số có thể đọc bằng lời: *"không phẩy hai ba sáu"* → `0.236`, *"sáu mươi lăm nghìn"* → `65000`',
        '• Giá luôn tính bằng **USD** (không cần nói đơn vị)',
        '• Coin name tự động convert: *bitcoin* → `BTC`, *ethereum* → `ETH`',
        '• Sau khi bot confirm, react **✅** để thực hiện hoặc **❌** để huỷ',
        '• Không phản hồi trong **1 phút** → bot tự xoá message confirm',
      ].join('\n'),
    });

  await interaction.reply({
    embeds: [embedHow, embedTrading, embedReadonly, embedChat, embedTip],
    flags: MessageFlags.Ephemeral,
  });
}
