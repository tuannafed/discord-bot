import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { AlertService } from '../services/alert.service.js';
import { AlertMetric, AlertCondition } from '../types/alert.js';
import { formatPrice, formatMarketCap } from '../utils/format.js';

let alertService: AlertService;

export function init(service: AlertService): void {
  alertService = service;
}

export const data = new SlashCommandBuilder()
  .setName('alert-add')
  .setDescription('Add a price or market cap alert')
  .addStringOption((opt) =>
    opt.setName('symbol').setDescription('Coin symbol (e.g. btc)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('metric')
      .setDescription('What to watch')
      .setRequired(true)
      .addChoices(
        { name: 'Price', value: 'price' },
        { name: 'Market Cap', value: 'market_cap' }
      )
  )
  .addStringOption((opt) =>
    opt
      .setName('condition')
      .setDescription('Trigger condition')
      .setRequired(true)
      .addChoices(
        { name: 'Above', value: 'above' },
        { name: 'Below', value: 'below' }
      )
  )
  .addNumberOption((opt) =>
    opt.setName('threshold').setDescription('Threshold value in USD').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const symbol = interaction.options.getString('symbol', true);
  const metric = interaction.options.getString('metric', true) as AlertMetric;
  const condition = interaction.options.getString('condition', true) as AlertCondition;
  const threshold = interaction.options.getNumber('threshold', true);

  await interaction.deferReply();

  const alert = await alertService.addAlert({
    guildId,
    channelId: interaction.channelId,
    symbol,
    metric,
    condition,
    threshold,
    userId: interaction.user.id,
  });

  if (!alert) {
    await interaction.editReply(`Coin **${symbol.toUpperCase()}** not found on CoinGecko.`);
    return;
  }

  const thresholdStr = metric === 'price' ? formatPrice(threshold) : formatMarketCap(threshold);

  await interaction.editReply(
    `Alert set: **${symbol.toUpperCase()}** ${metric} ${condition} **${thresholdStr}**\nAlert ID: \`${alert.id}\``
  );
}
