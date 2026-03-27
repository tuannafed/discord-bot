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
          '`/unlock` `symbol` — Token supply & unlock overview (circ / locked / max)',
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
        name: '⚡ Group Trading',
        value: [
          '`/call` `symbol` `direction` `price` — Tạo kèo mới (long/short)',
          '`/follow` `call_id` `entry` — Vào lệnh theo kèo (chọn từ dropdown)',
          '`/positions` — Xem tất cả kèo active + P&L% realtime từng người',
          '`/tp` `call_id` — Take profit, đóng lệnh của bạn (fetch giá tự động)',
          '`/cl` `call_id` — Cut loss, đóng lệnh của bạn (fetch giá tự động)',
          '`/call-close` `call_id` — *(Admin)* Đóng kèo & auto-close tất cả positions còn mở',
          '`/call-delete` `call_id` — *(Admin)* Xóa kèo ghi sai (xóa cả positions liên quan)',
          '> P&L% tính theo entry từng người · Long: `(close−entry)/entry` · Short: `(entry−close)/entry`',
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
          '/unlock symbol:apt',
          '/unlock symbol:arb',
          '/call symbol:BTC direction:long price:70000',
          '/follow call_id:[chọn từ dropdown] entry:69500',
          '/positions',
          '/tp call_id:[chọn từ dropdown]',
          '/cl call_id:[chọn từ dropdown]',
          '```',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Data from Bybit + CoinMarketCap' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
