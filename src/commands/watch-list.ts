import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { WatchlistService } from '../services/watchlist.service.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { formatPrice, formatMarketCap, formatChange, formatChangeEmoji } from '../utils/format.js';

let watchlistService: WatchlistService;
let provider: CryptoDataProvider;

export function init(wl: WatchlistService, p: CryptoDataProvider): void {
  watchlistService = wl;
  provider = p;
}

export const data = new SlashCommandBuilder()
  .setName('watch-list')
  .setDescription('Show your guild watchlist with current prices');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const items = await watchlistService.getWatchlist(guildId);

  if (items.length === 0) {
    await interaction.editReply('Watchlist is empty. Use `/watch-add` to add coins.');
    return;
  }

  const symbols = items.map((i) => i.symbol.toUpperCase());
  const marketData = await provider.getMarketData(symbols);
  const marketMap = new Map(marketData.map((m) => [m.symbol.toLowerCase(), m]));

  const lines = items.map((item) => {
    const market = marketMap.get(item.symbol.toLowerCase());
    if (!market) return `**${item.symbol.toUpperCase()}** — data unavailable`;

    const emoji = formatChangeEmoji(market.priceChangePercentage24h);
    return (
      `**${market.name}** (${market.symbol.toUpperCase()})\n` +
      `Price: ${formatPrice(market.currentPrice)} | MCap: ${formatMarketCap(market.marketCap)} | 24h: ${emoji} ${formatChange(market.priceChangePercentage24h)}`
    );
  });

  const embed = new EmbedBuilder()
    .setTitle('Watchlist')
    .setDescription(lines.join('\n\n'))
    .setColor(0x5865f2)
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
