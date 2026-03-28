export type SkillName = 'crypto-analyst' | 'trader' | 'news-analyst' | 'general';

export type Skill = {
  name: SkillName;
  systemPrompt: string;
};

const SKILLS: Record<SkillName, Skill> = {
  'crypto-analyst': {
    name: 'crypto-analyst',
    systemPrompt: `Bạn là chuyên gia phân tích crypto với 10 năm kinh nghiệm. Khi phân tích một đồng coin:
- Đánh giá xu hướng giá (trend), hỗ trợ/kháng cự, volume
- Nhận xét về market cap, tokenomics, on-chain metrics nếu biết
- Đưa ra nhận định ngắn gọn: bullish / bearish / neutral + lý do
- Luôn kèm disclaimer "Không phải lời khuyên đầu tư"
Trả lời tiếng Việt, súc tích, dùng bullet points. Không spam markdown quá dài.`,
  },
  trader: {
    name: 'trader',
    systemPrompt: `Bạn là trader crypto chuyên nghiệp. Khi tư vấn giao dịch:
- Xác định entry, stop-loss, take-profit cụ thể
- Tính risk/reward ratio
- Đề xuất % vốn phù hợp với mức rủi ro
- Cảnh báo các rủi ro chính của lệnh
- Phân tích timeframe ngắn hạn (1h, 4h)
Trả lời tiếng Việt, số liệu rõ ràng. Luôn kèm disclaimer "Không phải lời khuyên đầu tư".`,
  },
  'news-analyst': {
    name: 'news-analyst',
    systemPrompt: `Bạn là chuyên gia phân tích tin tức crypto và tài chính. Khi phân tích tin tức:
- Tóm tắt sự kiện chính xác, khách quan
- Đánh giá tác động ngắn hạn và dài hạn lên thị trường
- Phân tích sentiment: tích cực / tiêu cực / trung lập
- Liên kết với các sự kiện liên quan nếu có
Trả lời tiếng Việt, rõ ràng, không giật tít. Phân biệt rõ sự kiện đã xảy ra vs. suy đoán.`,
  },
  general: {
    name: 'general',
    systemPrompt: `Bạn là trợ lý thân thiện trong Discord. Trả lời tiếng Việt khi user dùng tiếng Việt.
Không spam, không markdown quá dài. Giọng điệu nhẹ nhàng, hài hước khi phù hợp.`,
  },
};

/** Keywords để detect skill từ prompt */
const SKILL_KEYWORDS: Record<SkillName, string[]> = {
  'crypto-analyst': [
    'phân tích', 'analyze', 'analysis',
    'technical', 'kỹ thuật',
    'on-chain', 'onchain',
    'tokenomics', 'token',
    'xu hướng', 'trend',
    'hỗ trợ', 'kháng cự', 'support', 'resistance',
    'bullish', 'bearish',
    'chart', 'biểu đồ',
    'đồng', 'coin', 'altcoin',
    'btc', 'eth', 'sol', 'bnb',
  ],
  trader: [
    'trade', 'giao dịch',
    'entry', 'vào lệnh',
    'exit', 'chốt lời', 'cắt lỗ',
    'stop loss', 'sl', 'tp', 'take profit',
    'long', 'short',
    'leverage', 'đòn bẩy',
    'risk', 'rủi ro',
    'position', 'vị thế',
    'margin',
  ],
  'news-analyst': [
    'tin tức', 'news',
    'sự kiện', 'event',
    'thông báo', 'announcement',
    'ra mắt', 'launch',
    'hôm nay', 'today',
    'mới nhất', 'latest', 'recent',
    'thị trường', 'market',
    'fed', 'macro', 'vĩ mô',
    'sec', 'regulation', 'pháp lý',
    'hack', 'exploit',
  ],
  general: [],
};

export function detectSkill(prompt: string): SkillName {
  const lower = prompt.toLowerCase();

  // Score each skill by keyword matches
  const scores: Record<SkillName, number> = {
    'crypto-analyst': 0,
    trader: 0,
    'news-analyst': 0,
    general: 0,
  };

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS) as [SkillName, string[]][]) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[skill]++;
    }
  }

  const best = (Object.entries(scores) as [SkillName, number][])
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)[0];

  return best ? best[0] : 'general';
}

export function getSkill(name: SkillName): Skill {
  return SKILLS[name];
}
