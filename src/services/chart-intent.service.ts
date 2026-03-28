import { type LlmChatService } from './llm-chat.service.js';
import { logger } from '../utils/logger.js';

export type ChartIntent = {
  symbol: string;
  days: number;
};

const CHART_KEYWORDS = ['chart', 'biểu đồ', 'vẽ', 'candlestick', 'nến', 'giá', 'price chart'];

export function isChartRequest(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return CHART_KEYWORDS.some((kw) => lower.includes(kw));
}

const PARSE_SYSTEM_PROMPT = `You are a JSON extractor. Extract chart request info from user message.
Return ONLY valid JSON: {"symbol":"BTC","days":7}
- symbol: uppercase coin ticker (BTC, ETH, SOL, etc.)
- days: number of days (1=today/24h, 7=7 days, 30=30 days). Default 1 if not specified.
- If no symbol found, return {"symbol":null,"days":1}
No explanation, no markdown, only JSON.`;

export async function parseChartIntent(
  prompt: string,
  llm: LlmChatService,
): Promise<ChartIntent | null> {
  const result = await llm.completeRaw(PARSE_SYSTEM_PROMPT, prompt);
  if ('error' in result) {
    logger.warn(`parseChartIntent LLM error: ${result.error}`);
    return null;
  }

  try {
    const text = result.text.trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text) as { symbol?: unknown; days?: unknown };
    const symbol = typeof parsed.symbol === 'string' ? parsed.symbol.toUpperCase() : null;
    if (!symbol) return null;
    const days = typeof parsed.days === 'number' && parsed.days > 0 ? Math.min(parsed.days, 90) : 1;
    return { symbol, days };
  } catch {
    logger.warn(`parseChartIntent JSON parse failed: ${result.text.slice(0, 200)}`);
    return null;
  }
}
