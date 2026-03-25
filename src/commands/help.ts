import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all available commands');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('📊 Crypto Tracker — Commands')
    .setColor(0x5865f2)
    .setDescription('All commands are slash commands. Optional params shown in `[brackets]`.')
    .addFields(
      {
        name: '💹 Market Data',
        value: [
          '`/coin` `symbol` `[timeframe]` — Price, MCap, rank, change & supply',
          '> Timeframe: `15m` / `1h` / `4h` / `24h` — shows prev price, prev cap & % change',
          '`/top` `[limit]` — Top coins by market cap *(Bybit-listed)*',
          '`/movers` `[metric]` `[timeframe]` `[type]` `[limit]`',
          '> Gainers & losers · price or cap · 15m / 1h / 4h / 24h',
          '`/scan` `min_cap` `max_cap` `[limit]` — Coins in a cap range',
        ].join('\n'),
      },
      {
        name: '👁 Watchlist',
        value: [
          '`/watch-add` `symbol` — Add coin to watchlist',
          '`/watch-remove` `symbol` — Remove coin from watchlist',
          '`/watch-list` — View watchlist with live prices & 24h change',
        ].join('\n'),
      },
      {
        name: '🔔 Alerts',
        value: [
          '`/alert-add` `symbol` `metric` `condition` `threshold`',
          '> `above` / `below` → fixed USD value',
          '> `change_up` / `change_down` → % from current (e.g. `3` = 3%)',
          '`/alert-list` — View all active alerts (with IDs)',
          '`/alert-remove` `id` — Delete an alert',
        ].join('\n'),
      },
      {
        name: '🎯 Candidates',
        value: [
          '`/candidate-list` `[status]` — `tracking` / `hit_target` / `expired`',
          '`/candidate-remove` `id` — Remove a candidate',
        ].join('\n'),
      },
      {
        name: '⚙️ Other',
        value: '`/ping` — Health check\n`/help` — Show this message',
      },
      {
        name: '📌 Examples',
        value: [
          '```',
          '/coin symbol:btc',
          '/coin symbol:eth timeframe:1 hour',
          '/top limit:20',
          '/movers metric:price timeframe:15 minutes type:gainers limit:10',
          '/movers metric:cap timeframe:1 hour',
          '/scan min_cap:70000000 max_cap:100000000',
          '/alert-add symbol:eth metric:price condition:above threshold:5000',
          '/alert-add symbol:btc metric:price condition:change_up threshold:3',
          '/alert-add symbol:eth metric:market_cap condition:change_down threshold:5',
          '/alert-remove id:abc123',
          '```',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
