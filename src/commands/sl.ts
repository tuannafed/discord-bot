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

  await interaction.deferReply();

  const result = await callService.closeUserPosition({
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    username: interaction.user.username,
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
  const isCaller = call.calledById === interaction.user.id;

  const condolence = pnlPct <= -500
    ? '💀 Thanh lý rồi bro ơi...'
    : pnlPct <= -200
    ? '😭 Đau quá!'
    : pnlPct <= -50
    ? '😢 Tiếc thật!'
    : pnlPct < 0
    ? '🛑 Stop loss kịp thời!'
    : '😅 May mà cắt kịp!';

  const embed = new EmbedBuilder()
    .setTitle(`${condolence} — ${call.symbol} ${dirEmoji}`)
    .setColor(0xe67e22)
    .addFields(
      { name: 'Entry', value: formatPrice(position.entryPrice), inline: true },
      { name: 'Close Price', value: formatPrice(currentPrice), inline: true },
      { name: 'P&L', value: `**${sign}${pnlPct.toFixed(2)}%**`, inline: true },
      { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  const milestone = getMilestoneHit(pnlPct);
  if (milestone !== null) {
    await sendMilestoneNotification(discordClient, call.channelId, {
      userId: interaction.user.id,
      symbol: call.symbol,
      direction: call.direction,
      pnlPct,
      milestone,
    });
  }

  if (isCaller) {
    startCloseReminder(
      discordClient,
      callService,
      call.id,
      call.channelId,
      interaction.user.id,
      call.symbol,
      call.direction,
      'sl',
    );
  }
}
