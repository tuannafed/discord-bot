import { type LlmChatService } from './llm-chat.service.js';
import { logger } from '../utils/logger.js';

export type VoiceCommandName = 'call' | 'follow' | 'cl' | 'tp' | 'sl' | 'follow-update' | 'call-update' | 'unknown';

export type VoiceIntent =
  | { command: 'call'; symbol: string; direction: 'long' | 'short'; price: number; leverage?: number }
  | { command: 'follow'; symbol: string; entry: number; leverage?: number }
  | { command: 'cl'; symbol: string }
  | { command: 'tp'; symbol: string }
  | { command: 'sl'; symbol: string }
  | { command: 'follow-update'; symbol: string; entry?: number; leverage?: number }
  | { command: 'call-update'; symbol: string; price?: number; leverage?: number }
  | { command: 'unknown' };

const PARSE_SYSTEM_PROMPT = `Bạn là parser lệnh trading. Phân tích câu nói của user và trả về JSON.

Commands có thể có:
- call: {"command":"call","symbol":"BTC","direction":"long|short","price":65000,"leverage":10}
- follow: {"command":"follow","symbol":"BTC","entry":64000,"leverage":10}
- cl (cut loss): {"command":"cl","symbol":"BTC"}
- tp (take profit): {"command":"tp","symbol":"BTC"}
- sl (stop loss): {"command":"sl","symbol":"BTC"}
- follow-update: {"command":"follow-update","symbol":"BTC","entry":64500,"leverage":15}
- call-update: {"command":"call-update","symbol":"BTC","price":65500,"leverage":20}
- không hiểu: {"command":"unknown"}

Rules:
- symbol PHẢI là uppercase ticker (BTC, ETH, SOL, ARIA, v.v.)
- price/entry/leverage là số, bỏ dấu phẩy nếu có
- direction: "long" hoặc "short" (dù user nói "buy/mua" = long, "sell/bán/short" = short)
- Nếu thiếu thông tin bắt buộc → {"command":"unknown"}
- Chỉ trả JSON thuần, không giải thích`;

export async function parseVoiceIntent(
  transcript: string,
  llm: LlmChatService,
): Promise<VoiceIntent> {
  const result = await llm.completeRaw(PARSE_SYSTEM_PROMPT, transcript);
  if ('error' in result) {
    logger.warn(`parseVoiceIntent LLM error: ${result.error}`);
    return { command: 'unknown' };
  }

  try {
    const text = result.text.trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text) as VoiceIntent;
    return parsed;
  } catch {
    logger.warn(`parseVoiceIntent JSON parse failed: ${result.text.slice(0, 200)}`);
    return { command: 'unknown' };
  }
}

/** Human-readable confirmation message for the user to confirm */
export function buildConfirmMessage(intent: VoiceIntent): string | null {
  switch (intent.command) {
    case 'call': {
      const dir = intent.direction === 'long' ? '📈 LONG' : '📉 SHORT';
      const lev = intent.leverage ? ` x${intent.leverage}` : '';
      return `Bạn muốn **call ${intent.symbol} ${dir}** giá **$${intent.price.toLocaleString()}**${lev} đúng không? (nói **OK** để xác nhận)`;
    }
    case 'follow': {
      const lev = intent.leverage ? ` x${intent.leverage}` : '';
      return `Bạn muốn **follow kèo ${intent.symbol}** entry **$${intent.entry.toLocaleString()}**${lev} đúng không? (nói **OK** để xác nhận)`;
    }
    case 'cl':
      return `Bạn muốn **cut loss kèo ${intent.symbol}** đúng không? (nói **OK** để xác nhận)`;
    case 'tp':
      return `Bạn muốn **take profit kèo ${intent.symbol}** đúng không? (nói **OK** để xác nhận)`;
    case 'sl':
      return `Bạn muốn **stop loss kèo ${intent.symbol}** đúng không? (nói **OK** để xác nhận)`;
    case 'follow-update': {
      const parts: string[] = [];
      if (intent.entry) parts.push(`entry $${intent.entry.toLocaleString()}`);
      if (intent.leverage) parts.push(`x${intent.leverage}`);
      return `Bạn muốn **cập nhật follow ${intent.symbol}** (${parts.join(', ')}) đúng không? (nói **OK** để xác nhận)`;
    }
    case 'call-update': {
      const parts: string[] = [];
      if (intent.price) parts.push(`giá $${intent.price.toLocaleString()}`);
      if (intent.leverage) parts.push(`x${intent.leverage}`);
      return `Bạn muốn **cập nhật kèo ${intent.symbol}** (${parts.join(', ')}) đúng không? (nói **OK** để xác nhận)`;
    }
    default:
      return null;
  }
}

export function isConfirmation(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return ['ok', 'oke', 'okay', 'đúng', 'yes', 'ừ', 'ừm', 'được', 'xác nhận', 'confirm'].some(
    (w) => lower === w || lower.startsWith(w + ' '),
  );
}

export function isCancellation(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return ['không', 'no', 'huỷ', 'hủy', 'cancel', 'thôi', 'bỏ'].some(
    (w) => lower === w || lower.startsWith(w + ' '),
  );
}
