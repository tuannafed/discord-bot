import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags} from 'discord.js';
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
    await interaction.reply({ content: 'This command must be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const alerts = await alertService.getAlerts(guildId);

  if (alerts.length === 0) {
    await interaction.reply('No alerts set. Use `/alert-add` to create one.');
    return;
  }

  const lines = alerts.map((alert, i) => {
    const status = alert.isActive ? '✓' : '✗';
    let conditionStr: string;
    if ((alert.condition === 'change_up' || alert.condition === 'change_down') && alert.changePct != null) {
      const dir = alert.condition === 'change_up' ? '📈 +' : '📉 -';
      const baseStr = alert.metric === 'price'
        ? formatPrice(alert.baseValue ?? alert.threshold)
        : formatMarketCap(alert.baseValue ?? alert.threshold);
      const targetStr = alert.metric === 'price'
        ? formatPrice(alert.threshold)
        : formatMarketCap(alert.threshold);
      conditionStr = `${dir}${alert.changePct}% (${baseStr} → ${targetStr})`;
    } else {
      const thresholdStr = alert.metric === 'price'
        ? formatPrice(alert.threshold)
        : formatMarketCap(alert.threshold);
      conditionStr = `${alert.condition} ${thresholdStr}`;
    }
    return (
      `${String(i + 1).padStart(2)}. **${alert.symbol.toUpperCase()}** ${alert.metric} ${conditionStr} [${status}]\n` +
      `    ID: \`${alert.id}\``
    );
  });

  const embed = new EmbedBuilder()
    .setTitle('Alerts')
    .setDescription(lines.join('\n\n'))
    .setColor(0xffa500)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
