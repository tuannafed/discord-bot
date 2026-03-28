import OpenAI from 'openai';
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

// ---------------------------------------------------------------------------
// Pre-LLM keyword matcher for simple read-only commands
// Avoids an LLM round-trip for unambiguous phrases like "vị thế", "biến động"
// ---------------------------------------------------------------------------

/** Normalize for keyword matching: lowercase, strip diacritics */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function startsWith(norm: string, ...prefixes: string[]): boolean {
  return prefixes.some((p) => norm === p || norm.startsWith(p + ' '));
}

/**
 * Fast keyword pre-match for read-only commands (no LLM needed).
 * Returns null if no match — falls through to LLM parser.
 */
function preMatchReadOnly(transcript: string): VoiceIntent | null {
  const n = normalize(transcript);

  // positions
  if (startsWith(n, 'positions', 'vi the', 'xem vi the', 'lenh dang mo', 'xem lenh')) {
    return { command: 'positions' };
  }

  // top
  if (startsWith(n, 'top coin', 'top coins', 'xem top') || n === 'top') {
    return { command: 'top' };
  }

  // movers
  if (startsWith(n, 'movers', 'bien dong', 'coin bien dong')) {
    return { command: 'movers' };
  }

  // watchlist
  if (startsWith(n, 'watchlist', 'watch list', 'danh sach theo doi', 'danh sach watch')) {
    return { command: 'watch-list' };
  }

  // alert-list
  if (startsWith(n, 'alert', 'canh bao', 'danh sach canh bao', 'xem alert')) {
    return { command: 'alert-list' };
  }

  // funding (may have symbol)
  if (startsWith(n, 'funding', 'phi funding', 'funding rate', 'lai suat')) {
    // Try to extract symbol after keyword
    const symbol = extractSymbol(transcript);
    return { command: 'funding', ...(symbol ? { symbol } : {}) };
  }

  // coin / xem giá (requires symbol — let LLM handle extraction if no clear symbol)
  if (startsWith(n, 'xem gia', 'gia coin', 'gia cua', 'coin ')) {
    const symbol = extractSymbol(transcript);
    if (symbol) return { command: 'coin', symbol };
    // No symbol found → fall through to LLM
  }

  return null;
}

/** Extract uppercase coin ticker from transcript (bitcoin→BTC etc.) */
function extractSymbol(transcript: string): string | null {
  const ALIASES: Record<string, string> = {
    bitcoin: 'BTC', btc: 'BTC',
    ethereum: 'ETH', eth: 'ETH',
    solana: 'SOL', sol: 'SOL',
    bnb: 'BNB', 'binance coin': 'BNB',
    xrp: 'XRP', ripple: 'XRP',
    doge: 'DOGE', dogecoin: 'DOGE',
    ada: 'ADA', cardano: 'ADA',
    avax: 'AVAX', avalanche: 'AVAX',
    dot: 'DOT', polkadot: 'DOT',
    link: 'LINK', chainlink: 'LINK',
    matic: 'MATIC', polygon: 'MATIC',
    ltc: 'LTC', litecoin: 'LTC',
    uni: 'UNI', uniswap: 'UNI',
    atom: 'ATOM', cosmos: 'ATOM',
    near: 'NEAR',
    apt: 'APT', aptos: 'APT',
    sui: 'SUI',
    op: 'OP', optimism: 'OP',
    arb: 'ARB', arbitrum: 'ARB',
    ton: 'TON',
    pepe: 'PEPE',
    shib: 'SHIB', 'shiba inu': 'SHIB',
  };

  const lower = transcript.toLowerCase();
  for (const [alias, ticker] of Object.entries(ALIASES)) {
    if (lower.includes(alias)) return ticker;
  }

  // Generic uppercase ticker (2-5 chars) in the original transcript
  const match = transcript.match(/\b([A-Z]{2,5})\b/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// LLM-based intent parser (GPT gpt-4o-mini) — for complex trading commands
// ---------------------------------------------------------------------------

const PARSE_SYSTEM_PROMPT = `Bạn là parser lệnh trading Discord bot. Nhiệm vụ: nhận câu nói tiếng Việt (đã được speech-to-text), xác định intent và trả về JSON.

=== QUY TẮC QUAN TRỌNG NHẤT ===
Câu nói PHẢI bắt đầu bằng một trong các keyword lệnh sau (có thể có 1-2 từ đệm không quan trọng trước):
  Trading:   call, "tạo kèo", follow, "theo kèo", "vào kèo", cl, "cắt lỗ", "cut loss", tp, "chốt lời", "take profit", sl, "stop loss", "dừng lỗ", "follow update", "call update", "sửa kèo", "cập nhật kèo", "sửa follow", "cập nhật follow"
  Read-only: positions, "vị thế", "xem vị thế", "lệnh đang mở", "xem lệnh",
             coin, "xem giá", "giá coin", "giá của",
             top, "top coin", "xem top",
             movers, "biến động", "coin biến động",
             watchlist, "watch list", "danh sách theo dõi",
             alert, "cảnh báo", "danh sách cảnh báo",
             funding, "phí funding", "funding rate", "lãi suất"

Nếu KHÔNG bắt đầu bằng keyword trên → {"command":"unknown"} (coi như chat thường)

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

follow update — sửa follow (bắt đầu bằng "follow update" HOẶC "sửa follow" HOẶC "cập nhật follow"):
  Output: {"command":"follow-update","symbol":"BTC","entry":64500,"leverage":15}
  Ví dụ: "follow update kèo BTC giá 64500"
         "sửa follow BTC giá 64500"
         "cập nhật follow BTC đòn 15"

call update — sửa kèo (bắt đầu bằng "call update" HOẶC "sửa kèo" HOẶC "cập nhật kèo"):
  Output: {"command":"call-update","symbol":"BTC","price":65500,"leverage":20}
  Ví dụ: "call update kèo BTC giá 65500"
         "sửa kèo BTC giá 65500"
         "cập nhật kèo BTC đòn 20"

=== READ-ONLY COMMANDS (thực hiện ngay, không cần confirm) ===

positions — xem lệnh đang mở (bắt đầu bằng "positions" HOẶC "vị thế" HOẶC "xem vị thế" HOẶC "lệnh đang mở" HOẶC "xem lệnh"):
  Output: {"command":"positions"}

coin — xem giá (bắt đầu bằng "coin" HOẶC "xem giá" HOẶC "giá coin" HOẶC "giá của"):
  Output: {"command":"coin","symbol":"BTC"}

top — top coins (bắt đầu bằng "top"):
  Output: {"command":"top"}

movers — coin biến động (bắt đầu bằng "movers" HOẶC "biến động"):
  Output: {"command":"movers"}

watchlist — danh sách theo dõi (bắt đầu bằng "watchlist" HOẶC "watch list" HOẶC "danh sách theo dõi"):
  Output: {"command":"watch-list"}

alert — cảnh báo (bắt đầu bằng "alert" HOẶC "cảnh báo" HOẶC "danh sách cảnh báo"):
  Output: {"command":"alert-list"}

funding — funding rate (bắt đầu bằng "funding" HOẶC "phí funding" HOẶC "lãi suất"):
  Output: {"command":"funding","symbol":"BTC"}
  Ví dụ: "funding BTC", "phí funding ETH", "lãi suất" (symbol optional)

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
  openai: OpenAI,
): Promise<VoiceIntent> {
  // Fast path: pre-match simple read-only commands without LLM round-trip
  const preMatched = preMatchReadOnly(transcript);
  if (preMatched) {
    logger.info(`parseVoiceIntent pre-matched: ${JSON.stringify(preMatched)}`);
    return preMatched;
  }

  // Slow path: LLM for trading commands and complex read-only (e.g. "coin BTC")
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PARSE_SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      max_tokens: 150,
      temperature: 0,
    });

    const text = response.choices[0]?.message?.content?.trim().replace(/```json|```/g, '').trim();
    if (!text) return { command: 'unknown' };

    const parsed = JSON.parse(text) as VoiceIntent;
    return parsed;
  } catch (err) {
    logger.warn(`parseVoiceIntent failed: ${(err as Error).message}`);
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
