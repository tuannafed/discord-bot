import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags} from 'discord.js';
import { AlertService } from '../services/alert.service.js';
import { AlertMetric, AlertCondition } from '../types/alert.js';
import { formatPrice, formatMarketCap, parseDecimalInput } from '../utils/format.js';

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
        { name: 'Above (fixed value)', value: 'above' },
        { name: 'Below (fixed value)', value: 'below' },
        { name: 'Change Up % (from now)', value: 'change_up' },
        { name: 'Change Down % (from now)', value: 'change_down' }
      )
  )
  .addStringOption((opt) =>
    opt
      .setName('threshold')
      .setDescription('USD value for above/below — OR % for change_up/change_down (e.g. 3 = 3%). Supports 0,27 or 0.27')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const symbol = interaction.options.getString('symbol', true);
  const metric = interaction.options.getString('metric', true) as AlertMetric;
  const condition = interaction.options.getString('condition', true) as AlertCondition;
  const thresholdRaw = interaction.options.getString('threshold', true);
  const thresholdInput = parseDecimalInput(thresholdRaw);

  if (isNaN(thresholdInput) || thresholdInput <= 0) {
    await interaction.reply({ content: '❌ Threshold không hợp lệ. Vui lòng nhập số dương (vd: 0.27 hoặc 0,27).', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();

  const isChangePct = condition === 'change_up' || condition === 'change_down';

  if (isChangePct && (thresholdInput < 1 || thresholdInput > 100)) {
    await interaction.editReply('Change % must be between 1 and 100.');
    return;
  }

  const alert = await alertService.addAlert({
    guildId,
    channelId: interaction.channelId,
    symbol,
    metric,
    condition,
    threshold: thresholdInput,
    userId: interaction.user.id,
  });

  if (!alert) {
    await interaction.editReply(`Coin **${symbol.toUpperCase()}** not found on CoinMarketCap.`);
    return;
  }

  let confirmMsg: string;
  if (isChangePct) {
    const dir = condition === 'change_up' ? '📈 up' : '📉 down';
    const baseStr = metric === 'price'
      ? formatPrice(alert.baseValue ?? 0)
      : formatMarketCap(alert.baseValue ?? 0);
    const targetStr = metric === 'price'
      ? formatPrice(alert.threshold)
      : formatMarketCap(alert.threshold);
    confirmMsg =
      `Alert set: **${symbol.toUpperCase()}** ${metric} ${dir} **${thresholdInput}%**\n` +
      `Base: ${baseStr} → Target: **${targetStr}**\n` +
      `Alert ID: \`${alert.id}\``;
  } else {
    const thresholdStr = metric === 'price' ? formatPrice(alert.threshold) : formatMarketCap(alert.threshold);
    confirmMsg =
      `Alert set: **${symbol.toUpperCase()}** ${metric} ${condition} **${thresholdStr}**\n` +
      `Alert ID: \`${alert.id}\``;
  }

  await interaction.editReply(confirmMsg);
}
