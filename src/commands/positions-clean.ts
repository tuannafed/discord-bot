import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  AutocompleteInteraction,
} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { formatPrice } from '../utils/format.js';

let callService: CallService;
let adminUserIds: Set<string> = new Set();

export function init(service: CallService, admins: Set<string>): void {
  callService = service;
  adminUserIds = admins;
}

export const data = new SlashCommandBuilder()
  .setName('positions-clean')
  .setDescription('Quản trị: xóa dữ liệu đã đóng lệnh (TP/CL/SL) trên một kèo')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo cần dọn')
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const calls = await callService.getActiveCalls(interaction.guildId!);
  const choices = calls.map((c) => ({
    name: `${c.symbol} ${c.direction.toUpperCase()} @ ${formatPrice(c.callPrice)} x${c.leverage} (${c.id.slice(0, 8)})`,
    value: c.id,
  }));
  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (adminUserIds.size === 0) {
    await interaction.reply({
      content: 'Lệnh này chưa được bật (chưa cấu hình admin).',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (!adminUserIds.has(interaction.user.id)) {
    await interaction.reply({
      content: 'Bạn không có quyền dùng lệnh này.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const callId = interaction.options.getString('call_id', true);
  const result = await callService.adminCleanClosedTradeData({
    callId,
    guildId: interaction.guildId!,
  });

  if ('error' in result) {
    await interaction.editReply(result.error);
    return;
  }

  const parts = [
    `Đã xóa **${result.positionsDeleted}** bản ghi position đã đóng.`,
    result.callerCloseCleared ? 'Đã xóa trạng thái đóng lệnh của caller trên kèo.' : 'Caller chưa có bản ghi đóng trên kèo (không đổi).',
  ];
  await interaction.editReply(parts.join('\n'));
}
