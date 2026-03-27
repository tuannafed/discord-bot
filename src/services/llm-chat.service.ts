import { logger } from '../utils/logger.js';

export type LlmProvider = 'openai' | 'anthropic';

export type LlmChatConfig = {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  cooldownMs: number;
  maxTokens: number;
  anthropicVersion: string;
};

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

type AnthropicMessageResponse = {
  type?: string;
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

function extractAnthropicText(data: AnthropicMessageResponse): string | null {
  const blocks = data.content?.filter((b) => b.type === 'text' && b.text) ?? [];
  const text = blocks.map((b) => b.text!).join('\n').trim();
  return text || null;
}

export class LlmChatService {
  private readonly lastUsed = new Map<string, number>();

  constructor(private readonly cfg: LlmChatConfig) {}

  cooldownRemainingMs(guildId: string, userId: string): number {
    const key = `${guildId}:${userId}`;
    const prev = this.lastUsed.get(key) ?? 0;
    const elapsed = Date.now() - prev;
    if (elapsed >= this.cfg.cooldownMs) return 0;
    return this.cfg.cooldownMs - elapsed;
  }

  /** Gọi sau khi đã kiểm tra cooldown, trước khi gọi API (tránh double request song song). */
  recordCooldown(guildId: string, userId: string): void {
    this.lastUsed.set(`${guildId}:${userId}`, Date.now());
  }

  async complete(userMessage: string): Promise<{ text: string } | { error: string }> {
    const base = this.cfg.baseUrl.replace(/\/$/, '');

    if (this.cfg.provider === 'anthropic') {
      return this.completeAnthropic(base, userMessage);
    }
    return this.completeOpenAiCompatible(base, userMessage);
  }

  private async completeOpenAiCompatible(
    base: string,
    userMessage: string,
  ): Promise<{ text: string } | { error: string }> {
    const url = `${base}/chat/completions`;
    const body = {
      model: this.cfg.model,
      messages: [
        { role: 'system' as const, content: this.cfg.systemPrompt },
        { role: 'user' as const, content: userMessage },
      ],
      max_tokens: this.cfg.maxTokens,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });

      const data = (await res.json()) as OpenAiChatResponse;

      if (!res.ok) {
        const msg = data.error?.message ?? res.statusText;
        logger.warn(`LLM HTTP ${res.status}: ${msg}`);
        return { error: 'Model trả lỗi — thử lại sau hoặc kiểm tra API key / model.' };
      }

      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) {
        return { error: 'Model không trả nội dung.' };
      }
      return { text };
    } catch (err) {
      logger.warn(`LLM request failed: ${(err as Error).message}`);
      return { error: 'Không gọi được API (mạng hoặc timeout).' };
    }
  }

  private async completeAnthropic(
    base: string,
    userMessage: string,
  ): Promise<{ text: string } | { error: string }> {
    const url = `${base}/messages`;
    const body = {
      model: this.cfg.model,
      max_tokens: this.cfg.maxTokens,
      system: this.cfg.systemPrompt,
      messages: [{ role: 'user' as const, content: userMessage }],
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.cfg.apiKey,
          'anthropic-version': this.cfg.anthropicVersion,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });

      const data = (await res.json()) as AnthropicMessageResponse;

      if (!res.ok || data.type === 'error') {
        const msg = data.error?.message ?? res.statusText;
        logger.warn(`Anthropic HTTP ${res.status}: ${msg}`);
        return { error: 'Claude trả lỗi — thử lại sau hoặc kiểm tra API key / model.' };
      }

      const text = extractAnthropicText(data);
      if (!text) {
        return { error: 'Claude không trả nội dung.' };
      }
      return { text };
    } catch (err) {
      logger.warn(`Anthropic request failed: ${(err as Error).message}`);
      return { error: 'Không gọi được API (mạng hoặc timeout).' };
    }
  }
}

function normalizeProvider(raw: string | undefined): LlmProvider {
  const v = raw?.trim().toLowerCase();
  if (v === 'anthropic' || v === 'claude') return 'anthropic';
  return 'openai';
}

export function buildLlmChatServiceFromEnv(env: {
  LLM_API_KEY?: string | undefined;
  LLM_PROVIDER?: string | undefined;
  LLM_BASE_URL?: string | undefined;
  LLM_MODEL?: string | undefined;
  LLM_SYSTEM_PROMPT?: string | undefined;
  LLM_COOLDOWN_MS?: number | undefined;
  LLM_MAX_TOKENS?: number | undefined;
  LLM_ANTHROPIC_VERSION?: string | undefined;
}): LlmChatService | null {
  const key = env.LLM_API_KEY?.trim();
  if (!key) return null;

  const provider = normalizeProvider(env.LLM_PROVIDER);
  const defaultBase =
    provider === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1';
  const baseUrl = (env.LLM_BASE_URL?.trim() || defaultBase).replace(/\/$/, '');
  const defaultModel =
    provider === 'anthropic' ? 'claude-3-5-haiku-20241022' : 'gpt-4o-mini';

  return new LlmChatService({
    provider,
    apiKey: key,
    baseUrl,
    model: env.LLM_MODEL?.trim() || defaultModel,
    systemPrompt:
      env.LLM_SYSTEM_PROMPT?.trim() ||
      'Bạn là trợ lý ngắn gọn, thân thiện trong Discord. Trả lời tiếng Việt khi user dùng tiếng Việt. Không spam, không markdown quá dài.',
    cooldownMs: env.LLM_COOLDOWN_MS ?? 8000,
    maxTokens: Math.min(Math.max(env.LLM_MAX_TOKENS ?? 600, 64), 4096),
    anthropicVersion: env.LLM_ANTHROPIC_VERSION?.trim() || '2023-06-01',
  });
}
