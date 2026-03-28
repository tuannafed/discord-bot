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

=== QUY TẮC QUAN TRỌNG NHẤT ===
Câu nói PHẢI bắt đầu bằng một trong các keyword lệnh sau (có thể có 1-2 từ đệm không quan trọng trước):
  Trading:   call, "tạo kèo", follow, "theo kèo", "vào kèo", cl, "cắt lỗ", tp, "chốt lời", sl, "stop loss", "follow update", "call update"
  Read-only: positions, coin, top, movers, watchlist, "watch list", alert, funding

Nếu KHÔNG bắt đầu bằng keyword trên → {"command":"unknown"} (coi như chat thường)

Ví dụ ĐÚNG: "call kèo BTC long x20 giá 65k", "tạo kèo BTC long 65k x20", "positions", "follow kèo BTC entry 64000", "theo kèo BTC entry 64000", "vào kèo BTC 64000"
Ví dụ SAI (→ unknown): "BTC đang ở đâu", "hôm nay thị trường thế nào", "chào bot"

Lưu ý: speech-to-text có thể viết sai dấu hoặc sai từ, hãy đoán intent theo ngữ nghĩa.

=== TRADING COMMANDS (cần confirm trước khi thực hiện) ===

call — đặt kèo mới (bắt đầu bằng "call" HOẶC "tạo kèo"):
  Output: {"command":"call","symbol":"BTC","direction":"long|short","price":65000,"leverage":20}
  Ví dụ: "call BTC long x20 giá 65k"
         "call kèo ETH short giá 3000 đòn 10"
         "tạo kèo BTC long giá 65000 x20"
         "tạo kèo ETH short 3000 đòn 10"

follow — vào theo kèo (bắt đầu bằng "follow" HOẶC "theo kèo" HOẶC "vào kèo"):
  Output: {"command":"follow","symbol":"BTC","entry":64000,"leverage":10}
  Ví dụ: "follow kèo BTC entry 64000"
         "follow BTC giá của tôi là 64000 đòn 10"
         "theo kèo BTC entry 64000 x10"
         "vào kèo BTC giá 64000"

cl — cắt lỗ (bắt đầu bằng "cl" hoặc "cắt lỗ" hoặc "cut loss"):
  Output: {"command":"cl","symbol":"BTC"}
  Ví dụ: "cl BTC", "cắt lỗ BTC", "cut loss kèo BTC"

tp — chốt lời (bắt đầu bằng "tp" hoặc "chốt lời" hoặc "take profit"):
  Output: {"command":"tp","symbol":"BTC"}
  Ví dụ: "tp BTC", "chốt lời BTC", "take profit kèo BTC"

sl — stop loss (bắt đầu bằng "sl" hoặc "stop loss" hoặc "dừng lỗ"):
  Output: {"command":"sl","symbol":"BTC"}
  Ví dụ: "sl BTC", "stop loss BTC", "dừng lỗ kèo BTC"

follow update — sửa follow (bắt đầu bằng "follow update"):
  Output: {"command":"follow-update","symbol":"BTC","entry":64500,"leverage":15}
  Ví dụ: "follow update kèo BTC giá 64500"
         "follow update BTC đòn 15"

call update — sửa kèo (bắt đầu bằng "call update"):
  Output: {"command":"call-update","symbol":"BTC","price":65500,"leverage":20}
  Ví dụ: "call update kèo BTC giá 65500"
         "call update BTC đòn 20"

=== READ-ONLY COMMANDS (thực hiện ngay, không cần confirm) ===

positions — xem lệnh đang mở (bắt đầu bằng "positions"):
  Output: {"command":"positions"}
  Ví dụ: "positions", "positions đi", "chạy positions", "xem positions"

coin — xem giá (bắt đầu bằng "coin"):
  Output: {"command":"coin","symbol":"BTC"}
  Ví dụ: "coin BTC", "coin ETH hôm nay"

top — top coins (bắt đầu bằng "top"):
  Output: {"command":"top"}
  Ví dụ: "top", "top coin", "top coins"

movers — coin biến động (bắt đầu bằng "movers"):
  Output: {"command":"movers"}
  Ví dụ: "movers", "movers hôm nay"

watchlist — danh sách theo dõi (bắt đầu bằng "watchlist" hoặc "watch list"):
  Output: {"command":"watch-list"}
  Ví dụ: "watchlist", "watch list"

alert — cảnh báo (bắt đầu bằng "alert"):
  Output: {"command":"alert-list"}
  Ví dụ: "alert", "alert list"

funding — funding rate (bắt đầu bằng "funding"):
  Output: {"command":"funding","symbol":"BTC"}
  Ví dụ: "funding BTC", "funding" (symbol optional)

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
