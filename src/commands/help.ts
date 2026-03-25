import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all available commands');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('Crypto Tracker — Commands')
    .setColor(0x5865f2)
    .addFields(
      {
        name: 'Market Data',
        value: [
          '`/coin symbol:<symbol>` — Price, market cap, 24h change for a coin',
          '`/top [limit]` — Top coins by market cap (default 10, max 25)',
          '`/movers [type] [limit]` — Top gainers/losers by 24h change',
          '`/scan min_cap:<usd> max_cap:<usd> [limit]` — Find Bybit-listed coins in a market cap range',
        ].join('\n'),
      },
      {
        name: 'Watchlist',
        value: [
          '`/watch-add symbol:<symbol>` — Add a coin to the guild watchlist',
          '`/watch-remove symbol:<symbol>` — Remove a coin from the watchlist',
          '`/watch-list` — View watchlist with live prices',
        ].join('\n'),
      },
      {
        name: 'Alerts',
        value: [
          '`/alert-add symbol:<symbol> metric:<price|market_cap> condition:<above|below> threshold:<usd>` — Create an alert',
          '`/alert-list` — View active alerts',
        ].join('\n'),
      },
      {
        name: 'Candidates',
        value: [
          '`/candidate-list [status]` — View tracked candidates (tracking / hit_target / expired)',
          '`/candidate-remove id:<id>` — Remove a candidate',
        ].join('\n'),
      },
      {
        name: 'Other',
        value: '`/ping` — Health check',
      },
    )
    .addFields({
      name: 'Examples',
      value: [
        '`/coin symbol:btc`',
        '`/top limit:20`',
        '`/movers type:gainers limit:10`',
        '`/scan min_cap:70000000 max_cap:100000000`',
        '`/alert-add symbol:eth metric:price condition:above threshold:5000`',
      ].join('\n'),
    })
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
