import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags} from 'discord.js';
import { WatchlistService } from '../services/watchlist.service.js';

let watchlistService: WatchlistService;

export function init(service: WatchlistService): void {
  watchlistService = service;
}

export const data = new SlashCommandBuilder()
  .setName('watch-remove')
  .setDescription('Xóa coin khỏi danh sách theo dõi của server')
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

  const removed = await watchlistService.removeWatch(guildId, symbol);

  if (removed) {
    await interaction.reply(`Removed **${symbol.toUpperCase()}** from the watchlist.`);
  } else {
    await interaction.reply(`**${symbol.toUpperCase()}** was not in the watchlist.`);
  }
}
