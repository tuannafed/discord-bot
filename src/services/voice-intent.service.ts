import { type LlmChatService } from './llm-chat.service.js';
import { logger } from '../utils/logger.js';

export type VoiceCommandName =
  // Trading (require confirm)
  | 'call' | 'follow' | 'cl' | 'tp' | 'sl' | 'follow-update' | 'call-update'
  // Read-only (no confirm needed)
  | 'positions' | 'coin' | 'top' | 'movers' | 'watch-list' | 'alert-list' | 'funding'
  | 'unknown';

export type VoiceIntent =
  // --- Trading commands (mutating, require confirmation) ---
  | { command: 'call'; symbol: string; direction: 'long' | 'short'; price: number; leverage?: number }
  | { command: 'follow'; symbol: string; entry: number; leverage?: number }
  | { command: 'cl'; symbol: string }
  | { command: 'tp'; symbol: string }
  | { command: 'sl'; symbol: string }
  | { command: 'follow-update'; symbol: string; entry?: number; leverage?: number }
  | { command: 'call-update'; symbol: string; price?: number; leverage?: number }
  // --- Read-only commands (no confirmation, execute immediately) ---
  | { command: 'positions' }
  | { command: 'coin'; symbol: string }
  | { command: 'top' }
  | { command: 'movers' }
  | { command: 'watch-list' }
  | { command: 'alert-list' }
  | { command: 'funding'; symbol?: string }
  | { command: 'unknown' };

/** Commands that require ✅ confirmation before executing */
export const CONFIRM_REQUIRED = new Set<VoiceCommandName>([
  'call', 'follow', 'cl', 'tp', 'sl', 'follow-update', 'call-update',
]);

const PARSE_SYSTEM_PROMPT = `Bạn là parser lệnh trading Discord bot. Phân tích câu nói tiếng Việt của user và trả về JSON.

=== TRADING COMMANDS (cần confirm) ===
- call:          {"command":"call","symbol":"BTC","direction":"long|short","price":65000,"leverage":10}
- follow:        {"command":"follow","symbol":"BTC","entry":64000,"leverage":10}
- cl (cắt lỗ):  {"command":"cl","symbol":"BTC"}
- tp (chốt lời):{"command":"tp","symbol":"BTC"}
- sl (stop loss):{"command":"sl","symbol":"BTC"}
- follow-update: {"command":"follow-update","symbol":"BTC","entry":64500,"leverage":15}
- call-update:   {"command":"call-update","symbol":"BTC","price":65500,"leverage":20}

=== READ-ONLY COMMANDS (không cần confirm) ===
- positions: {"command":"positions"}
  Trigger: "positions", "xem kèo", "xem lệnh", "lệnh đang chạy", "kèo đang mở", "xem vị thế", "chạy lệnh positions"
- coin:      {"command":"coin","symbol":"BTC"}
  Trigger: "giá BTC", "xem BTC", "coin BTC", "BTC bao nhiêu"
- top:       {"command":"top"}
  Trigger: "top coin", "xem top", "top gainers"
- movers:    {"command":"movers"}
  Trigger: "movers", "coin tăng mạnh", "biến động hôm nay"
- watch-list:{"command":"watch-list"}
  Trigger: "watchlist", "danh sách theo dõi", "watch list"
- alert-list:{"command":"alert-list"}
  Trigger: "alert", "cảnh báo", "danh sách alert"
- funding:   {"command":"funding","symbol":"BTC"}
  Trigger: "funding BTC", "phí funding", "funding rate"

=== RULES — ĐỌC KỸ ===

**Số đọc bằng lời → convert sang số thực:**
- "không phẩy hai ba sáu" → 0.236
- "không chấm hai ba sáu" → 0.236
- "không phẩy hai" → 0.2
- "một nghìn năm trăm" → 1500
- "sáu mươi lăm nghìn" → 65000
- "hai trăm" → 200
- Bỏ tất cả dấu phẩy ngăn cách hàng nghìn nếu có (65,000 → 65000)

**Đơn vị giá — luôn dùng USD (USDT = USD):**
- Mọi giá trị price/entry đều là USD, không cần user nói đơn vị
- "entry hai trăm đô" → 200, "giá 65k" → 65000

**Symbol:**
- PHẢI là uppercase ticker: BTC, ETH, SOL, ARIA, v.v.
- "bitcoin" → BTC, "ethereum" → ETH, "solana" → SOL

**Direction:**
- long: buy, mua, long, vào long
- short: sell, bán, short, vào short

**Nếu câu không phải lệnh trading/query** (vd: hỏi news, phân tích, chat) → {"command":"unknown"}
**Nếu thiếu thông tin bắt buộc** ở trading commands → {"command":"unknown"}
**Chỉ trả JSON thuần, không giải thích, không markdown**`;

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

/** Human-readable confirmation message — only for CONFIRM_REQUIRED commands */
export function buildConfirmMessage(intent: VoiceIntent): string | null {
  switch (intent.command) {
    case 'call': {
      const dir = intent.direction === 'long' ? '📈 LONG' : '📉 SHORT';
      const lev = intent.leverage ? ` x${intent.leverage}` : '';
      return `Bạn muốn **call ${intent.symbol} ${dir}** giá **$${intent.price.toLocaleString()}**${lev}?`;
    }
    case 'follow': {
      const lev = intent.leverage ? ` x${intent.leverage}` : '';
      return `Bạn muốn **follow kèo ${intent.symbol}** entry **$${intent.entry.toLocaleString()}**${lev}?`;
    }
    case 'cl':
      return `Bạn muốn **cắt lỗ kèo ${intent.symbol}**?`;
    case 'tp':
      return `Bạn muốn **chốt lời kèo ${intent.symbol}**?`;
    case 'sl':
      return `Bạn muốn **stop loss kèo ${intent.symbol}**?`;
    case 'follow-update': {
      const parts: string[] = [];
      if (intent.entry) parts.push(`entry $${intent.entry.toLocaleString()}`);
      if (intent.leverage) parts.push(`x${intent.leverage}`);
      return `Bạn muốn **cập nhật follow ${intent.symbol}** (${parts.join(', ')})?`;
    }
    case 'call-update': {
      const parts: string[] = [];
      if (intent.price) parts.push(`giá $${intent.price.toLocaleString()}`);
      if (intent.leverage) parts.push(`x${intent.leverage}`);
      return `Bạn muốn **cập nhật kèo ${intent.symbol}** (${parts.join(', ')})?`;
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
