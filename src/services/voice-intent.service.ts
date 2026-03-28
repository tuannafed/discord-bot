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

const PARSE_SYSTEM_PROMPT = `Bạn là parser lệnh trading Discord bot. Nhiệm vụ: nhận câu nói tiếng Việt (đã được speech-to-text), xác định intent và trả về JSON.

Lưu ý: speech-to-text có thể viết sai dấu hoặc sai từ, hãy đoán intent theo ngữ nghĩa.

=== TRADING COMMANDS (cần confirm trước khi thực hiện) ===

call — đặt kèo mới:
  Output: {"command":"call","symbol":"BTC","direction":"long|short","price":65000,"leverage":20}
  Cách nói: "call BTC long giá 65000", "kèo BTC short 65k đòn 20", "vào lệnh mua BTC 65000 x10",
            "con kèo long BTC đồng bảy 20 giá 65000", "mở kèo ETH short giá 3000 leverage 10"

follow — vào theo kèo có sẵn:
  Output: {"command":"follow","symbol":"BTC","entry":64000,"leverage":10}
  Cách nói: "follow kèo BTC entry 64000", "vào theo kèo BTC giá 64000 x10",
            "tôi follow BTC giá 64k đòn 10", "join kèo BTC 64000"

cl — cắt lỗ:
  Output: {"command":"cl","symbol":"BTC"}
  Cách nói: "cắt lỗ BTC", "cl BTC", "cut loss BTC", "đóng lỗ kèo BTC", "thoát kèo BTC lỗ"

tp — chốt lời:
  Output: {"command":"tp","symbol":"BTC"}
  Cách nói: "chốt lời BTC", "tp BTC", "take profit BTC", "đóng lời kèo BTC", "thoát kèo BTC lời"

sl — dừng lỗ:
  Output: {"command":"sl","symbol":"BTC"}
  Cách nói: "stop loss BTC", "sl BTC", "dừng lỗ BTC"

follow-update — sửa lệnh follow:
  Output: {"command":"follow-update","symbol":"BTC","entry":64500,"leverage":15}
  Cách nói: "sửa follow BTC entry 64500", "update follow BTC đòn 15", "đổi entry BTC thành 64500"

call-update — sửa kèo:
  Output: {"command":"call-update","symbol":"BTC","price":65500,"leverage":20}
  Cách nói: "sửa kèo BTC giá 65500", "update kèo BTC đòn 20", "đổi giá call BTC thành 65500"

=== READ-ONLY COMMANDS (thực hiện ngay, không cần confirm) ===

positions — xem lệnh đang mở:
  Output: {"command":"positions"}
  Cách nói: "positions", "chạy lệnh positions", "xem positions", "xem kèo", "xem lệnh",
            "lệnh đang chạy", "kèo đang mở", "tôi đang có kèo nào", "xem vị thế",
            "kiểm tra lệnh", "tôi đang hold gì", "đang mở kèo gì"

coin — xem giá coin:
  Output: {"command":"coin","symbol":"BTC"}
  Cách nói: "giá BTC", "BTC bao nhiêu", "xem BTC", "coin BTC", "bitcoin giá bao nhiêu",
            "ETH đang ở đâu", "giá ethereum hôm nay"

top — top coin theo market cap:
  Output: {"command":"top"}
  Cách nói: "top coin", "xem top", "top coins hôm nay", "top gainers", "coin top"

movers — coin biến động mạnh:
  Output: {"command":"movers"}
  Cách nói: "movers", "coin tăng mạnh", "biến động hôm nay", "coin nào đang pump"

watch-list — danh sách theo dõi:
  Output: {"command":"watch-list"}
  Cách nói: "watchlist", "danh sách theo dõi", "watch list", "xem watchlist"

alert-list — danh sách cảnh báo:
  Output: {"command":"alert-list"}
  Cách nói: "alert", "cảnh báo", "danh sách alert", "xem alert"

funding — funding rate:
  Output: {"command":"funding","symbol":"BTC"}
  Cách nói: "funding BTC", "phí funding", "funding rate BTC", "BTC funding"
  (symbol optional — nếu không có thì bỏ trường symbol)

=== QUY TẮC XỬ LÝ ===

Số đọc bằng lời → số thực:
  "không phẩy hai ba sáu" → 0.236
  "không chấm hai" → 0.2
  "sáu mươi lăm nghìn" / "65k" / "65.000" → 65000
  "một trăm" → 100, "hai trăm" → 200
  "một nghìn rưỡi" → 1500
  Bỏ dấu phẩy phân cách hàng nghìn (65,000 → 65000)

Đơn vị: luôn USD (USDT = USD), không cần user nói đơn vị

Symbol: uppercase ticker — bitcoin→BTC, ethereum→ETH, solana→SOL, bnb→BNB

Direction: long = mua/buy/long/vào long | short = bán/sell/short/vào short

Nếu là câu hỏi/chat thông thường (tin tức, phân tích, hỏi thăm) → {"command":"unknown"}
Nếu thiếu thông tin bắt buộc của trading command → {"command":"unknown"}
CHỈ trả về JSON, không giải thích, không markdown`;

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
