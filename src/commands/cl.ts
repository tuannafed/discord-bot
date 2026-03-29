import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction,
  Client,
} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { formatPrice } from '../utils/format.js';
import { getClMessage } from '../utils/trade-messages.js';
import { startCloseReminder } from '../utils/close-reminder.js';

let callService: CallService;
let discordClient: Client;

export function init(service: CallService, client: Client): void {
  callService = service;
  discordClient = client;
}

export const data = new SlashCommandBuilder()
  .setName('cl')
  .setDescription('Cắt lỗ — đóng lệnh khi PnL âm hoặc bằng 0')
  .addStringOption((opt) =>
    opt
      .setName('call_id')
      .setDescription('Chọn kèo để đóng')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('Đóng lệnh cho member khác')
      .setRequired(false)
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
  const callId = interaction.options.getString('call_id', true);
  const targetUser = interaction.options.getUser('user');
  const userId = targetUser?.id ?? interaction.user.id;
  const username = targetUser?.username ?? interaction.user.username;

  await interaction.deferReply();

  const result = await callService.closeUserPosition({
    guildId: interaction.guildId!,
    userId,
    username,
    callId,
    closeType: 'cl',
  });

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  const { position, call, currentPrice } = result;
  const pnlPct = position.pnlPct ?? 0;
  const sign = pnlPct >= 0 ? '+' : '';
  const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';
  const isCaller = call.calledById === userId;

  const condolence = getClMessage(pnlPct);

  const embed = new EmbedBuilder()
    .setTitle(`❌ Cut Loss — ${call.symbol} ${dirEmoji}`)
    .setColor(0xe74c3c)
    .setDescription([
      condolence,
      ``,
      `**Entry:** ${formatPrice(position.entryPrice)}`,
      `**Close Price:** ${formatPrice(currentPrice)}`,
      `**P&L:** ${sign}${pnlPct.toFixed(2)}%`,
      `**Leverage:** x${position.leverage}`,
      `**User:** <@${userId}>`,
    ].join('\n'))
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  if (isCaller) {
    startCloseReminder(
      discordClient,
      callService,
      call.id,
      call.channelId,
      userId,
      call.symbol,
      call.direction,
      'cl',
    );
  }
}
