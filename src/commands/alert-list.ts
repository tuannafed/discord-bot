import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { AlertService } from '../services/alert.service.js';
import { formatPrice, formatMarketCap } from '../utils/format.js';

let alertService: AlertService;

export function init(service: AlertService): void {
  alertService = service;
}

export const data = new SlashCommandBuilder()
  .setName('alert-list')
  .setDescription('List all alerts for this server');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const alerts = alertService.getAlerts(guildId);

  if (alerts.length === 0) {
    await interaction.reply('No alerts set. Use `/alert-add` to create one.');
    return;
  }

  const lines = alerts.map((alert) => {
    const thresholdStr =
      alert.metric === 'price' ? formatPrice(alert.threshold) : formatMarketCap(alert.threshold);
    const status = alert.isActive ? 'Active' : 'Inactive';
    return (
      `**${alert.symbol.toUpperCase()}** — ${alert.metric} ${alert.condition} ${thresholdStr} [${status}]\n` +
      `ID: \`${alert.id}\``
    );
  });

  const embed = new EmbedBuilder()
    .setTitle('Alerts')
    .setDescription(lines.join('\n\n'))
    .setColor(0xffa500)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
