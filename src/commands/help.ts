import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Xem lệnh nhóm kèo (rút gọn)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('⚡ Kèo nhóm — lệnh')
    .setColor(0xfee75c)
    .setDescription('Lệnh gạch chéo (slash). Toàn bộ bot: `/help-full`.')
    .addFields({
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
    })
    .setFooter({ text: 'Nguồn dữ liệu: Bybit + CoinMarketCap · /help-full = tất cả lệnh' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
