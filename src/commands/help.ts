import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Xem lệnh nhóm kèo (rút gọn)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('⚡ Kèo nhóm — lệnh')
    .setColor(0xfee75c)
    .setDescription('Các lệnh bắt đầu bằng `/`. Danh sách đầy đủ: `/help-full`.')
    .addFields({
      name: '',
      value: [
        '> `/call` `symbol` `long/short` `giá` `[đòn_bẩy]` — Tạo kèo (mua long / bán short), mặc định x20',
        '> `/follow` `call_id` `entry` `[đòn_bẩy]` `[user]` — Vào lệnh theo kèo, có thể hộ người khác',
        '> `/positions` — Kèo đang chạy, **chỉ người còn mở lệnh** (funding + bảng PnL)',
        '> `/positions-history` — Cùng kiểu hiển thị nhưng **đủ cả** người đã TP/CL/SL',
        '> `/positions-user` `[user]` — Lệnh đang active của một user (mặc định: bản thân)',
        '> `/positions-clean` `call_id` — *(Quản trị)* Xóa trong CSDL bản ghi đã đóng + xóa trạng thái đóng của người call',
        '> `/tp` `call_id` — Chốt lời (giá lấy từ Bybit)',
        '> `/cl` `call_id` — Cắt lỗ (giá lấy từ Bybit)',
        '> `/sl` `call_id` — Cắt lỗ (giá lấy từ Bybit)',
        '> `/call-update` `call_id` `[giá]` `[đòn_bẩy]` — Sửa giá call hoặc đòn bẩy kèo',
        '> `/follow-update` `call_id` `[entry]` `[đòn_bẩy]` `[user]` — Sửa giá vào lệnh / đòn bẩy lệnh vào kèo',
        '> `/call-delete` `call_id` — *(Quản trị)* Xóa kèo nhầm (xóa luôn lệnh liên quan)',
      ].join('\n'),
    }, {
      name: '📌 Ví dụ',
      value: [
        '```',
        '/call symbol:STG direction:short price:0.271 leverage:20',
        '/call-delete call_id:[chọn]',
        '/follow call_id:[chọn] entry:0.268',
        '/follow call_id:[chọn] entry:0.268 user:@member',
        '/follow-update call_id:[chọn] entry:0.270 leverage:10',
        '/follow-update call_id:[chọn] leverage:50 user:@member',
        '/follow-delete call_id:[chọn]',
        '/call-update call_id:[chọn] price:0.275 leverage:25',
        '/positions',
        '/positions-history',
        '/positions-user',
        '/positions-user user:@member',
        '/positions-clean call_id:[chọn]',
        '/tp call_id:[chọn]',
        '/cl call_id:[chọn]',
        '/sl call_id:[chọn]',
        '```',
      ].join('\n'),
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
