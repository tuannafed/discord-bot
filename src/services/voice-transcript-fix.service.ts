/**
 * Post-processing corrections for Whisper STT errors on Vietnamese trading vocabulary.
 *
 * Whisper often mishears short/tonal Vietnamese words as unrelated phrases.
 * This module applies deterministic fixes before intent parsing.
 */

/**
 * Each entry: [wrongPattern (regex), replacement]
 * Patterns are case-insensitive and match the full transcript or a prefix.
 */
const STT_CORRECTIONS: [RegExp, string][] = [
  // positions / vị thế
  [/^bởi dì\b/i, 'vị thế'],
  [/^bị thế\b/i, 'vị thế'],
  [/^bị the\b/i, 'vị thế'],
  [/^vi the\b/i, 'vị thế'],
  [/^bị thể\b/i, 'vị thế'],
  [/^bởi thế\b/i, 'vị thế'],
  [/^bởi the\b/i, 'vị thế'],
  [/^vị the\b/i, 'vị thế'],

  // follow → phô lô / phổ lô / folo...
  [/^phô lô\b/i, 'follow'],
  [/^phổ lô\b/i, 'follow'],
  [/^folo\b/i, 'follow'],
  [/^fo lo\b/i, 'follow'],

  // call → cô / kho / col...
  [/^cô kèo\b/i, 'call kèo'],
  [/^col kèo\b/i, 'call kèo'],
  [/^kho kèo\b/i, 'call kèo'],

  // cắt lỗ
  [/^cắt lổ\b/i, 'cắt lỗ'],
  [/^cắc lỗ\b/i, 'cắt lỗ'],
  [/^cat lo\b/i, 'cắt lỗ'],

  // chốt lời
  [/^chốt lơi\b/i, 'chốt lời'],
  [/^chốt loi\b/i, 'chốt lời'],
  [/^chốt lời\b/i, 'chốt lời'],

  // dừng lỗ / stop loss
  [/^dừng lổ\b/i, 'dừng lỗ'],
  [/^dừng lo\b/i, 'dừng lỗ'],

  // movers / biến động
  [/^biến đọng\b/i, 'biến động'],
  [/^biến dong\b/i, 'biến động'],

  // funding
  [/^phăn đinh\b/i, 'funding'],
  [/^phan dinh\b/i, 'funding'],
  [/^fanding\b/i, 'funding'],

  // watchlist
  [/^uốt lis\b/i, 'watchlist'],
  [/^watch lis\b/i, 'watchlist'],

  // top
  [/^tóp\b/i, 'top'],

  // xem giá
  [/^xem già\b/i, 'xem giá'],
  [/^xem gia\b/i, 'xem giá'],
];

/**
 * Apply STT corrections to a raw Whisper transcript.
 * Only fixes the beginning of the string (command keyword area).
 */
export function fixTranscript(raw: string): string {
  const trimmed = raw.trim();
  for (const [pattern, replacement] of STT_CORRECTIONS) {
    if (pattern.test(trimmed)) {
      const fixed = trimmed.replace(pattern, replacement);
      return fixed;
    }
  }
  return trimmed;
}
