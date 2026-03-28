import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help-full')
  .setDescription('Xem danh sách đầy đủ mọi lệnh của bot');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('📖 Danh sách lệnh — đầy đủ')
    .setColor(0x5865f2)
    .setDescription(
      'Tất cả đều là lệnh gạch chéo (slash). Tham số trong `[ngoặc vuông]` là tùy chọn. Gõ `/help` chỉ xem nhóm kèo.',
    )
    .addFields(
      {
        name: '💹 Thị trường',
        value: [
          '`/coin` `symbol` `[khung_thời_gian]` — Giá, vốn hóa, hạng, % thay đổi & cung',
          '> Khung giờ: `15m` / `1h` / `4h` / `24h`',
          '`/top` `[giới_hạn]` — Top coin theo vốn hóa *(có trên Bybit)*',
          '`/movers` `[chỉ_số]` `[khung]` `[loại]` `[giới_hạn]` — Tăng/giảm mạnh nhất',
          '`/scan` `vốn_tối_thiểu` `vốn_tối_đa` `[giới_hạn]` — Lọc coin theo khoảng vốn hóa',
          '`/funding` `symbol` — Phí funding & giờ funding tới (ICT), 2 kỳ thanh toán gần nhất',
          '`/unlock` `symbol` — Thông tin unlock token (lưu hành / khóa / tối đa)',
        ].join('\n'),
      },
      {
        name: '👁 Theo dõi (watchlist)',
        value: [
          '`/watch-add` `symbol` — Thêm coin vào danh sách theo dõi',
          '`/watch-remove` `symbol` — Xóa coin khỏi danh sách',
          '`/watch-list` — Xem danh sách kèm giá & % thay đổi 24h',
        ].join('\n'),
      },
      {
        name: '🔔 Cảnh báo giá',
        value: [
          '`/alert-add` `symbol` `loại_chỉ_số` `điều_kiện` `ngưỡng`',
          '> Giá cố định (USD): điều kiện `above` (trên) / `below` (dưới)',
          '> % so với lúc đặt: `change_up` (tăng) / `change_down` (giảm) — ví dụ `3` = 3%',
          '`/alert-list` — Xem cảnh báo đang bật',
          '`/alert-remove` `id` — Xóa một cảnh báo',
        ].join('\n'),
      },
      {
        name: '⚡ Kèo nhóm',
        value: [
          '`/call` `symbol` `hướng` `giá` `[đòn_bẩy]` — Tạo kèo (long/short), mặc định x20',
          '`/follow` `call_id` `entry` `[đòn_bẩy]` `[user]` — Vào lệnh theo kèo, có thể hộ người khác',
          '`/positions` — Kèo đang chạy, **chỉ người còn mở lệnh** (funding + bảng PnL)',
          '`/positions-history` — Cùng kiểu hiển thị nhưng **đủ cả** người đã TP/CL/SL',
          '`/positions-clean` `call_id` — *(Quản trị)* Xóa trong CSDL bản ghi đã đóng + xóa trạng thái đóng của người call',
          '`/tp` `call_id` — Chốt lời (giá lấy từ Bybit)',
          '`/cl` `call_id` — Cắt lỗ (giá lấy từ Bybit)',
          '`/sl` `call_id` — Stop loss (giá lấy từ Bybit)',
          '`/call-update` `call_id` `[giá]` `[đòn_bẩy]` — Sửa giá call hoặc đòn bẩy kèo',
          '`/follow-update` `call_id` `[entry]` `[đòn_bẩy]` `[user]` — Sửa entry/đòn bẩy lệnh follow',
          '`/call-delete` `call_id` — *(Quản trị)* Xóa kèo nhầm (xóa luôn lệnh liên quan)',
          '> P&L = % giá × đòn bẩy · Long: `(đóng−entry)/entry` · Short: `(entry−đóng)/entry`',
          '> Thông báo mốc PnL: 100% / 200% / 300% / 500% / 1000%',
        ].join('\n'),
      },
      {
        name: '🎯 Coin tiềm năng',
        value: [
          '`/candidate-list` `[trạng_thái]` — Lọc: đang theo / đạt mục / hết hạn *(giá trị lệnh: `tracking` / `hit_target` / `expired`)*',
          '`/candidate-remove` `id` — Xóa một coin khỏi danh sách',
        ].join('\n'),
      },
      {
        name: '⚙️ Khác',
        value:
          '`/ping` — Kiểm tra bot còn hoạt động\n`/help` — Chỉ lệnh **kèo nhóm**\n`/help-full` — Tin nhắn này (đầy đủ, chỉ bạn thấy)',
      },
      {
        name: '📌 Ví dụ',
        value: [
          '```',
          '/coin symbol:btc',
          '/coin symbol:eth timeframe:1 hour',
          '/top limit:20',
          '/movers metric:price timeframe:15m type:gainers limit:10',
          '/scan min_cap:70000000 max_cap:100000000',
          '/funding symbol:btc',
          '/alert-add symbol:eth metric:price condition:above threshold:5000',
          '/alert-add symbol:btc metric:price condition:change_up threshold:3',
          '/unlock symbol:apt',
          '/call symbol:STG direction:short price:0.271 leverage:20',
          '/follow call_id:[chọn] entry:0.268',
          '/follow call_id:[chọn] entry:0.268 user:@member',
          '/follow-update call_id:[chọn] entry:0.270 leverage:10',
          '/follow-update call_id:[chọn] leverage:50 user:@member',
          '/call-update call_id:[chọn] price:0.275 leverage:25',
          '/positions',
          '/positions-history',
          '/positions-clean call_id:[chọn]',
          '/tp call_id:[chọn]',
          '/cl call_id:[chọn]',
          '```',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Nguồn dữ liệu: Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
