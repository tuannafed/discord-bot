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
      'Nếu bot không nhận ra lệnh → hiện hướng dẫn, **không trả lời chat**.',
    );

  const embedTrading = new EmbedBuilder()
    .setTitle('📈 Lệnh trading (cần xác nhận ✅❌)')
    .setColor(0xf0a500)
    .addFields(
      {
        name: '`call` / `tạo kèo` — Tạo kèo mới',
        value: '```\ncall BTC long x20 giá 65k\ncall kèo ETH short giá 3000 đòn 10\ntạo kèo BTC long giá 65000 x20\ntạo kèo ETH short 3000 đòn 10\n```',
      },
      {
        name: '`follow` / `theo kèo` / `vào kèo` — Vào theo kèo',
        value: '```\nfollow kèo BTC entry 64000\ntheo kèo BTC entry 64000 x10\nvào kèo BTC giá 64000 đòn 10\n```',
      },
      {
        name: '`cl` / `cắt lỗ` — Cắt lỗ',
        value: '```\ncl BTC\ncắt lỗ BTC\ncut loss kèo BTC\n```',
      },
      {
        name: '`tp` / `chốt lời` — Chốt lời',
        value: '```\ntp BTC\nchốt lời BTC\ntake profit kèo BTC\n```',
      },
      {
        name: '`sl` / `dừng lỗ` — Stop loss',
        value: '```\nsl BTC\ndừng lỗ BTC\nstop loss kèo BTC\n```',
      },
      {
        name: '`sửa kèo` / `cập nhật kèo` — Sửa kèo',
        value: '```\ncall update kèo BTC giá 65500\nsửa kèo BTC giá 65500\ncập nhật kèo BTC đòn 20\n```',
      },
      {
        name: '`sửa follow` / `cập nhật follow` — Sửa follow',
        value: '```\nfollow update kèo BTC giá 64500\nsửa follow BTC giá 64500\ncập nhật follow BTC đòn 15\n```',
      },
    );

  const embedReadonly = new EmbedBuilder()
    .setTitle('📊 Lệnh xem thông tin (thực hiện ngay)')
    .setColor(0x26cb7c)
    .addFields(
      {
        name: '`positions` / `vị thế` — Xem lệnh đang mở',
        value: '```\npositions\nvị thế\nxem vị thế\nlệnh đang mở\nxem lệnh\n```',
      },
      {
        name: '`coin` / `xem giá` — Xem giá coin',
        value: '```\ncoin BTC\nxem giá BTC\ngiá coin ETH\ngiá của SOL\n```',
      },
      {
        name: '`top` — Top coins',
        value: '```\ntop\ntop coin\nxem top\n```',
      },
      {
        name: '`movers` / `biến động` — Coin biến động mạnh',
        value: '```\nmovers\nbiến động\ncoin biến động hôm nay\n```',
      },
      {
        name: '`watchlist` / `danh sách theo dõi`',
        value: '```\nwatchlist\nwatch list\ndanh sách theo dõi\n```',
      },
      {
        name: '`alert` / `cảnh báo` — Danh sách cảnh báo',
        value: '```\nalert\ncảnh báo\ndanh sách cảnh báo\n```',
      },
      {
        name: '`funding` / `phí funding` — Funding rate',
        value: '```\nfunding BTC\nphí funding ETH\nfunding rate SOL\nlãi suất BTC\n```',
      },
    );

  const embedTip = new EmbedBuilder()
    .setTitle('💡 Mẹo & Lưu ý')
    .setColor(0xfee75c)
    .addFields({
      name: 'Đọc số bằng lời',
      value: [
        '• *"không phẩy hai ba sáu"* → `0.236`',
        '• *"sáu mươi lăm nghìn"* / *"65k"* → `65000`',
        '• *"một trăm"* → `100`, *"một nghìn rưỡi"* → `1500`',
      ].join('\n'),
    },
    {
      name: 'Khác',
      value: [
        '• Giá luôn tính bằng **USD** (không cần nói đơn vị)',
        '• Coin tự động nhận: *bitcoin* → `BTC`, *ethereum* → `ETH`, *solana* → `SOL`',
        '• Sau khi bot confirm, react **✅** để thực hiện hoặc **❌** để huỷ',
        '• Không phản hồi trong **1 phút** → bot tự xoá message confirm',
        '• Nếu bot không hiểu → hiển thị transcript + hướng dẫn lại',
      ].join('\n'),
    });

  await interaction.reply({
    embeds: [embedHow, embedTrading, embedReadonly, embedTip],
    flags: MessageFlags.Ephemeral,
  });
}
