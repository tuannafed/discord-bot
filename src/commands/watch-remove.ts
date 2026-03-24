import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { WatchlistService } from '../services/watchlist.service.js';

let watchlistService: WatchlistService;

export function init(service: WatchlistService): void {
  watchlistService = service;
}

export const data = new SlashCommandBuilder()
  .setName('watch-remove')
  .setDescription('Remove a coin from your guild watchlist')
  .addStringOption((opt) =>
    opt.setName('symbol').setDescription('Coin symbol (e.g. btc)').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const removed = watchlistService.removeWatch(guildId, symbol);

  if (removed) {
    await interaction.reply(`Removed **${symbol.toUpperCase()}** from the watchlist.`);
  } else {
    await interaction.reply(`**${symbol.toUpperCase()}** was not in the watchlist.`);
  }
}
