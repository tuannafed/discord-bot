import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Xem danh sách tất cả lệnh');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('📖 Danh sách lệnh')
    .setColor(0x5865f2)
    .setDescription('Tất cả đều là slash command. Tham số trong `[ngoặc]` là tùy chọn.')
    .addFields(
      {
        name: '💹 Thị trường',
        value: [
          '`/coin` `symbol` `[timeframe]` — Giá, vốn hóa, hạng, % thay đổi & cung',
          '> Timeframe: `15m` / `1h` / `4h` / `24h`',
          '`/top` `[limit]` — Top coin theo vốn hóa *(có trên Bybit)*',
          '`/movers` `[metric]` `[timeframe]` `[type]` `[limit]` — Tăng/giảm mạnh nhất',
          '`/scan` `min_cap` `max_cap` `[limit]` — Lọc coin theo vốn hóa',
          '`/unlock` `symbol` — Thông tin unlock token (lưu hành / bị khóa / tối đa)',
        ].join('\n'),
      },
      {
        name: '👁 Watchlist',
        value: [
          '`/watch-add` `symbol` — Thêm coin vào danh sách theo dõi',
          '`/watch-remove` `symbol` — Xóa coin khỏi danh sách',
          '`/watch-list` — Xem danh sách với giá & % thay đổi 24h',
        ].join('\n'),
      },
      {
        name: '🔔 Cảnh báo giá',
        value: [
          '`/alert-add` `symbol` `metric` `condition` `threshold`',
          '> `above` / `below` — Ngưỡng giá cố định (USD)',
          '> `change_up` / `change_down` — % thay đổi so với hiện tại (vd: `3` = 3%)',
          '`/alert-list` — Xem tất cả cảnh báo đang bật',
          '`/alert-remove` `id` — Xóa một cảnh báo',
        ].join('\n'),
      },
      {
        name: '⚡ Kèo nhóm',
        value: [
          '`/call` `symbol` `direction` `price` `[leverage]` — Tạo kèo mới (long/short), đòn bẩy mặc định x20',
          '`/follow` `call_id` `entry` `[leverage]` `[user]` — Vào lệnh theo kèo, có thể add cho người khác',
          '`/positions` — Xem tất cả kèo active + P&L realtime của từng người',
          '`/tp` `call_id` — Chốt lời, đóng lệnh (giá tự động lấy từ Bybit)',
          '`/cl` `call_id` — Cắt lỗ, đóng lệnh (giá tự động lấy từ Bybit)',
          '`/call-update` `call_id` `[price]` `[leverage]` — Sửa giá call hoặc đòn bẩy của kèo',
          '`/follow-update` `call_id` `[entry]` `[leverage]` `[user]` — Sửa entry hoặc đòn bẩy lệnh follow',
          '`/call-delete` `call_id` — *(Admin)* Xóa kèo ghi sai (xóa luôn tất cả lệnh liên quan)',
          '> P&L = % thay đổi × đòn bẩy · Long: `(close−entry)/entry` · Short: `(entry−close)/entry`',
          '> Nhận thông báo tự động khi đạt 100% / 200% / 300% / 500% / 1000%',
        ].join('\n'),
      },
      {
        name: '🎯 Coin tiềm năng',
        value: [
          '`/candidate-list` `[status]` — `tracking` / `hit_target` / `expired`',
          '`/candidate-remove` `id` — Xóa một coin khỏi danh sách',
        ].join('\n'),
      },
      {
        name: '⚙️ Khác',
        value: '`/ping` — Kiểm tra bot còn sống không\n`/help` — Xem tin nhắn này',
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
          '/tp call_id:[chọn]',
          '/cl call_id:[chọn]',
          '```',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Dữ liệu từ Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
