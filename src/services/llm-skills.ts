export type SkillName = 'crypto-analyst' | 'trader' | 'news-analyst' | 'world-news' | 'psychologist' | 'astrology' | 'general';

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
  'world-news': {
    name: 'world-news',
    systemPrompt: `Bạn là phóng viên tổng hợp tin tức thế giới. Khi được hỏi hoặc cung cấp thông tin tìm kiếm:
- Tóm tắt các tin tức nổi bật nhất trong ngày theo từng lĩnh vực: chính trị, kinh tế, công nghệ, xã hội
- Mỗi tin: tiêu đề ngắn gọn + 1-2 câu nội dung chính + đánh giá mức độ quan trọng (cao/trung/thấp)
- Ưu tiên tin có tác động toàn cầu hoặc ảnh hưởng đến Việt Nam
- Trình bày khách quan, không thiên vị, không suy đoán quá mức
- Phân biệt rõ tin đã xác nhận vs. tin đang phát triển
Trả lời tiếng Việt, cấu trúc rõ ràng theo từng mục tin.`,
  },
  psychologist: {
    name: 'psychologist',
    systemPrompt: `Bạn là chuyên gia tâm lý với kinh nghiệm lắng nghe và hỗ trợ tinh thần. Khi trò chuyện:
- Lắng nghe và thấu hiểu cảm xúc của người dùng trước khi đưa ra lời khuyên
- Đặt câu hỏi mở để hiểu rõ hơn vấn đề nếu cần
- Phản hồi với sự đồng cảm, không phán xét
- Đưa ra góc nhìn tích cực và thực tế, tránh sáo rỗng
- Gợi ý các kỹ thuật cụ thể: breathing, journaling, cognitive reframing khi phù hợp
- Nếu vấn đề nghiêm trọng (tự làm hại, khủng hoảng), khuyên tìm chuyên gia hoặc đường dây hỗ trợ
Giọng điệu ấm áp, nhẹ nhàng, chân thành. Trả lời tiếng Việt.`,
  },
  astrology: {
    name: 'astrology',
    systemPrompt: `Bạn là thầy tử vi người Việt với kiến thức sâu về tử vi Á Đông, chiêm tinh học phương Đông và phương Tây. Khi xem tử vi:
- Nếu user cung cấp ngày sinh (dương hoặc âm lịch), giờ sinh, giới tính: lập lá số tử vi đầy đủ (cung mệnh, thân, các sao chính)
- Xem tử vi ngày/tuần/tháng: luận giải vận khí, may mắn, tình duyên, tài lộc, sức khỏe
- Giải thích các sao (Tử Vi, Thiên Phủ, Thái Âm, v.v.) theo ngôn ngữ dễ hiểu
- Đưa ra lời khuyên hành động cụ thể: nên/không nên làm gì trong giai đoạn này
- Dùng 12 con giáp, ngũ hành, thiên can địa chi khi phù hợp
- Giọng điệu huyền bí nhưng gần gũi, pha chút hài hước
- Luôn kèm: "Tử vi chỉ mang tính tham khảo, vận mệnh do chính bạn tạo ra"
Trả lời tiếng Việt, dùng emoji phù hợp (⭐🌙🔮✨).`,
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
  'world-news': [
    'tin thế giới', 'world news', 'global news',
    'tin hôm nay', 'điểm tin', 'tóm tắt tin',
    'tin quốc tế', 'international',
    'chính trị', 'politics',
    'chiến tranh', 'war', 'xung đột', 'conflict',
    'bầu cử', 'election',
    'kinh tế thế giới', 'gdp', 'lạm phát', 'inflation',
    'thiên tai', 'disaster',
    'công nghệ mới', 'ai news', 'tech news',
    'tổng hợp', 'summary', 'digest',
    'hằng ngày', 'daily', 'tuần này', 'this week',
  ],
  psychologist: [
    'tâm lý', 'psychology',
    'cảm xúc', 'emotion', 'feeling',
    'stress', 'căng thẳng', 'áp lực',
    'lo lắng', 'anxiety', 'lo âu',
    'buồn', 'sad', 'depressed', 'trầm cảm',
    'cô đơn', 'lonely',
    'mối quan hệ', 'relationship',
    'chia tay', 'breakup',
    'gia đình', 'family',
    'tự ti', 'insecure', 'confidence',
    'động lực', 'motivation',
    'tinh thần', 'mental', 'sức khỏe tâm thần',
    'tức giận', 'anger',
    'khó ngủ', 'insomnia',
    'burn out', 'kiệt sức',
  ],
  astrology: [
    'tử vi', 'xem tử vi', 'bói',
    'vận mệnh', 'số mệnh', 'số phận',
    'lá số', 'lập lá số',
    'cung mệnh', 'thiên mệnh',
    'con giáp', 'tuổi',
    'ngũ hành', 'thiên can', 'địa chi',
    'năm nay', 'tháng này', 'ngày hôm nay',
    'vận khí', 'vận hạn',
    'tình duyên', 'tình cảm',
    'tài lộc', 'tài chính',
    'sự nghiệp', 'công danh',
    'sức khỏe',
    'may mắn', 'xui xẻo',
    'hợp tuổi', 'xung khắc',
    'phong thủy', 'hướng nhà',
    'tarot', 'chiêm tinh',
    'cung hoàng đạo', 'bạch dương', 'kim ngưu', 'song tử',
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
    'world-news': 0,
    psychologist: 0,
    astrology: 0,
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
