import axios from 'axios';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { registerFont } from 'canvas';
import { join } from 'path';
import { logger } from '../utils/logger.js';

// Bundle font shipped with the repo — works on any OS/platform including Railway
// __dirname points to dist/services/ at runtime, so go up two levels to project root
const BUNDLED_FONT = join(__dirname, '../../assets/fonts/DejaVuSans.ttf');
try {
  registerFont(BUNDLED_FONT, { family: 'ChartFont' });
} catch (err) {
  logger.warn('Failed to register bundled font, chart text may appear as boxes', err);
}

type OhlcCandle = {
  time: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
};

type BybitKlineResponse = {
  retCode: number;
  retMsg: string;
  result: { list: string[][] };
};

/** Map days → Bybit kline interval + limit */
function resolveInterval(days: number): { interval: string; limit: number } {
  if (days <= 1) return { interval: '60', limit: 24 };   // 1h candles, 24 candles = 1 day
  if (days <= 7) return { interval: '240', limit: 42 };  // 4h candles, 42 = ~7 days
  if (days <= 30) return { interval: 'D', limit: 30 };   // daily candles
  return { interval: 'D', limit: Math.min(days, 90) };
}

export async function fetchOhlcv(symbol: string, days: number): Promise<OhlcCandle[]> {
  const { interval, limit } = resolveInterval(days);
  const bybitSymbol = `${symbol.toUpperCase()}USDT`;

  const res = await axios.get<BybitKlineResponse>('https://api.bybit.com/v5/market/kline', {
    params: { category: 'linear', symbol: bybitSymbol, interval, limit },
    timeout: 10_000,
  });

  if (res.data.retCode !== 0) {
    throw new Error(`Bybit kline error: ${res.data.retMsg}`);
  }

  // Bybit returns newest first — reverse to chronological
  return res.data.result.list
    .slice()
    .reverse()
    .map((c) => ({
      time: parseInt(c[0], 10),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
    }));
}

function formatLabel(time: number, days: number): string {
  const d = new Date(time);
  if (days <= 1) return `${d.getUTCHours().toString().padStart(2, '0')}:00`;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return Math.round(price).toString();
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(6);
}

export async function renderCandlestickChart(
  symbol: string,
  candles: OhlcCandle[],
  days: number,
): Promise<Buffer> {
  const width = 900;
  const height = 500;
  const canvas = new ChartJSNodeCanvas({ width, height, backgroundColour: '#1a1a2e' });

  const labels = candles.map((c) => formatLabel(c.time, days));
  const lastClose = candles.at(-1)?.close ?? 0;
  const firstClose = candles[0]?.close ?? 0;
  const isUp = lastClose >= firstClose;
  const bullColor = 'rgba(38, 203, 124, 0.9)';
  const bearColor = 'rgba(235, 87, 87, 0.9)';
  const trendColor = isUp ? bullColor : bearColor;

  // Build candlestick bars using floating bar chart
  const ohlcData = candles.map((c) => {
    const isBull = c.close >= c.open;
    return {
      x: formatLabel(c.time, days),
      y: [c.open, c.close] as [number, number],
      backgroundColor: isBull ? bullColor : bearColor,
      borderColor: isBull ? bullColor : bearColor,
    };
  });

  // Wick lines as scatter
  const wickData = candles.flatMap((c, i) => [
    { x: i, y: c.high },
    { x: i, y: c.low },
  ]);

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const padding = (maxPrice - minPrice) * 0.05;

  const image = await canvas.renderToBuffer({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: symbol,
          data: ohlcData.map((d) => d.y),
          backgroundColor: ohlcData.map((d) => d.backgroundColor),
          borderColor: ohlcData.map((d) => d.borderColor),
          borderWidth: 1,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${symbol}/USDT - ${days === 1 ? '24h' : `${days}d`} candlestick`,
          color: '#e0e0e0',
          font: { size: 16, weight: 'bold', family: 'ChartFont' },
          padding: { bottom: 12 },
        },
        subtitle: {
          display: true,
          text: `Last: $${formatPrice(lastClose)}`,
          color: trendColor,
          font: { size: 13, family: 'ChartFont' },
          padding: { bottom: 8 },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#aaaaaa',
            maxTicksLimit: 12,
            font: { size: 11, family: 'ChartFont' },
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          min: minPrice - padding,
          max: maxPrice + padding,
          position: 'right' as const,
          ticks: {
            color: '#aaaaaa',
            font: { size: 11, family: 'ChartFont' },
            callback: (v: unknown) => `$${formatPrice(Number(v))}`,
          },
          grid: { color: 'rgba(255,255,255,0.08)' },
        },
      },
    },
  });

  logger.info(`Chart rendered: ${symbol} ${days}d ${candles.length} candles`);
  return image;
}
