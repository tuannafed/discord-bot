import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags} from 'discord.js';
import { WatchlistService } from '../services/watchlist.service.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { formatPrice, formatMarketCap, formatChange } from '../utils/format.js';

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
    await interaction.reply({ content: 'This command must be used in a server.', flags: MessageFlags.Ephemeral });
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
    if (!market) return `${item.symbol.toUpperCase().slice(0, 5).padEnd(5)} — unavailable`;

    const arrow = market.priceChangePercentage24h >= 0 ? '▲' : '▼';
    const chg = formatChange(market.priceChangePercentage24h);
    return `${market.symbol.toUpperCase().slice(0, 5).padEnd(5)} ${formatPrice(market.currentPrice).padEnd(10)} ${formatMarketCap(market.marketCap).padEnd(7)} ${arrow}${chg.padStart(7)}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('Watchlist')
    .setDescription('```\n' + lines.join('\n') + '\n```')
    .setColor(0x5865f2)
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
