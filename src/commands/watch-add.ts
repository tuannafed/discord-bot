import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags} from 'discord.js';
import { WatchlistService } from '../services/watchlist.service.js';

let watchlistService: WatchlistService;

export function init(service: WatchlistService): void {
  watchlistService = service;
}

export const data = new SlashCommandBuilder()
  .setName('watch-add')
  .setDescription('Thêm coin vào danh sách theo dõi của server')
  .addStringOption((opt) =>
    opt.setName('symbol').setDescription('Ký hiệu coin (vd: btc)').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();

  const result = await watchlistService.addWatch(guildId, symbol, interaction.user.id);

  if (result === 'exists') {
    await interaction.editReply(`**${symbol.toUpperCase()}** is already in the watchlist.`);
  } else if (result === 'not_found') {
    await interaction.editReply(`Coin **${symbol.toUpperCase()}** not found on CoinMarketCap.`);
  } else {
    await interaction.editReply(`Added **${symbol.toUpperCase()}** to the watchlist.`);
  }
}
