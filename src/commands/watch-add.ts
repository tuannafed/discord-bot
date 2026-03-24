import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { WatchlistService } from '../services/watchlist.service.js';

let watchlistService: WatchlistService;

export function init(service: WatchlistService): void {
  watchlistService = service;
}

export const data = new SlashCommandBuilder()
  .setName('watch-add')
  .setDescription('Add a coin to your guild watchlist')
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

  await interaction.deferReply();

  const result = await watchlistService.addWatch(guildId, symbol, interaction.user.id);

  if (result === 'exists') {
    await interaction.editReply(`**${symbol.toUpperCase()}** is already in the watchlist.`);
  } else if (result === 'not_found') {
    await interaction.editReply(`Coin **${symbol.toUpperCase()}** not found on CoinGecko.`);
  } else {
    await interaction.editReply(`Added **${symbol.toUpperCase()}** to the watchlist.`);
  }
}
