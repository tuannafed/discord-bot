import { logger } from '../utils/logger.js';

export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
};

type TavilyApiResponse = {
  results?: Array<{ title?: string; url?: string; content?: string }>;
  error?: string;
};

/** Keywords (lowercase) that trigger a web search. */
const SEARCH_KEYWORDS = [
  // Vietnamese
  'tìm',
  'tìm kiếm',
  'search',
  'tin tức',
  'tin mới',
  'news',
  'mới nhất',
  'hôm nay',
  'hôm qua',
  'tuần này',
  'tháng này',
  'năm nay',
  'gần đây',
  'cập nhật',
  'update',
  'giá',
  'price',
  'thị trường',
  'market',
  'sự kiện',
  'event',
  'ra mắt',
  'launch',
  'nâng cấp',
  'upgrade',
  'thông báo',
  'announcement',
  'latest',
  'recent',
  'today',
  'hiện tại',
  'currently',
];

export function shouldSearch(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return SEARCH_KEYWORDS.some((kw) => lower.includes(kw));
}

export class TavilySearchService {
  private readonly baseUrl = 'https://api.tavily.com';

  constructor(
    private readonly apiKey: string,
    private readonly maxResults: number = 3,
  ) {}

  async search(query: string): Promise<TavilySearchResult[]> {
    const url = `${this.baseUrl}/search`;
    const body = {
      api_key: this.apiKey,
      query,
      search_depth: 'basic',
      max_results: this.maxResults,
      include_answer: false,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      const raw = await res.text();
      let data: TavilyApiResponse = {};
      try {
        data = raw ? (JSON.parse(raw) as TavilyApiResponse) : {};
      } catch {
        logger.warn(`Tavily non-JSON HTTP ${res.status} body=${raw.slice(0, 500)}`);
        return [];
      }

      if (!res.ok) {
        logger.warn(`Tavily HTTP ${res.status} error=${data.error ?? res.statusText}`);
        return [];
      }

      return (data.results ?? []).map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        content: r.content ?? '',
      }));
    } catch (err) {
      logger.warn('Tavily search request failed', err);
      return [];
    }
  }
}

/** Format search results into a context block to inject into the LLM prompt. */
export function formatSearchContext(results: TavilySearchResult[]): string {
  if (results.length === 0) return '';
  const items = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content.slice(0, 400)}`)
    .join('\n\n');
  return `Thông tin tìm kiếm từ web:\n${items}`;
}
