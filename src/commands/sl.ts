import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction,
  Client,
} from 'discord.js';
import { CallService } from '../services/call.service.js';
import { formatPrice } from '../utils/format.js';
import { getMilestoneHit, sendMilestoneNotification } from '../utils/pnl-milestone.js';
import { startCloseReminder } from '../utils/close-reminder.js';

let callService: CallService;
let discordClient: Client;

export function init(service: CallService, client: Client): void {
  callService = service;
  discordClient = client;
}

export const data = new SlashCommandBuilder()
  .setName('sl')
  .setDescription('Stop loss — đóng lệnh cắt lỗ theo giá thị trường hiện tại')
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
    name: `${c.symbol} ${c.direction.toUpperCase()} @ ${c.callPrice.toLocaleString('en-US')} (${c.id.slice(0, 8)})`,
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
    closeType: 'sl',
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

  const embed = new EmbedBuilder()
    .setTitle(`🛑 Stop Loss — ${call.symbol} ${dirEmoji}`)
    .setColor(0xe67e22)
    .setDescription([
      `**Entry:** ${formatPrice(position.entryPrice)}`,
      `**Close Price:** ${formatPrice(currentPrice)}`,
      `**P&L:** ${sign}${pnlPct.toFixed(2)}%`,
      `**Leverage:** x${position.leverage}`,
      `**User:** <@${userId}>`,
    ].join('\n'))
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  const milestone = getMilestoneHit(pnlPct);
  if (milestone !== null) {
    await sendMilestoneNotification(discordClient, call.channelId, {
      userId,
      symbol: call.symbol,
      direction: call.direction,
      pnlPct,
      milestone,
      guildId: interaction.guildId!,
    });
  }

  if (isCaller) {
    startCloseReminder(
      discordClient,
      callService,
      call.id,
      call.channelId,
      userId,
      call.symbol,
      call.direction,
      'sl',
    );
  }
}
