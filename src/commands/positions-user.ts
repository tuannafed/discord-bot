import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { CallService } from '../services/call.service.js';
import { MarketService } from '../services/market.service.js';
import { formatPrice } from '../utils/format.js';
import { callEmbedColor } from './positions-list.js';

let callService: CallService;
let marketService: MarketService;

export function init(cService: CallService, mService: MarketService): void {
  callService = cService;
  marketService = mService;
}

export const data = new SlashCommandBuilder()
  .setName('positions-user')
  .setDescription('Xem các lệnh đang active của một user')
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('User cần xem (mặc định: bản thân)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const target = interaction.options.getUser('user') ?? interaction.user;
  const guildId = interaction.guildId!;

  const entries = await callService.getActivePositionsByUser(guildId, target.id);

  if (entries.length === 0) {
    const name = target.id === interaction.user.id ? 'Bạn' : `**${target.displayName}**`;
    await interaction.editReply(`${name} không có lệnh nào đang active.`);
    return;
  }

  const symbols = [...new Set(entries.map(({ call }) => call.symbol))];
  const priceMap = await marketService.getLivePrices(symbols);

  const embed = new EmbedBuilder()
    .setTitle(`📋 Lệnh active của ${target.displayName}`)
    .setColor(0x5865f2)
    .setThumbnail(target.displayAvatarURL())
    .setTimestamp();

  for (const { position, call } of entries) {
    const currentPrice = priceMap.get(call.symbol) ?? 0;
    const dirEmoji = call.direction === 'long' ? '📈 LONG' : '📉 SHORT';

    let pnlStr = 'N/A';
    if (currentPrice > 0) {
      const rawPct =
        call.direction === 'long'
          ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
          : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
      const pnl = rawPct * position.leverage;
      const sign = pnl >= 0 ? '+' : '';
      const emoji = pnl >= 0 ? '🟢' : '🔴';
      pnlStr = `${emoji} ${sign}${Math.round(pnl)}%`;
    }

    const priceStr = currentPrice > 0 ? ` · **${formatPrice(currentPrice)}**` : '';
    const fieldName = `${call.symbol} ${dirEmoji} x${call.leverage}${priceStr}`;
    const fieldValue = [
      `Entry: **${formatPrice(position.entryPrice)}** x${position.leverage}`,
      `PnL: ${pnlStr}`,
      `CallID: \`${call.id.slice(0, 8)}\``,
    ].join('\n');

    embed.addFields({ name: fieldName, value: fieldValue, inline: true });
  }

  embed.setFooter({ text: `${entries.length} lệnh đang mở` });

  await interaction.editReply({ embeds: [embed] });
}
