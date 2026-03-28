import { logger } from '../utils/logger.js';
import type { ChatMessage } from './conversation-history.service.js';

/** Một dòng cố định cho Discord; chi tiết chỉ trong log. */
export const LLM_ERROR_USER_MESSAGE = 'Không trả lời được lúc này — thử lại sau.';

export type LlmProvider = 'openai' | 'anthropic' | 'deepseek';

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
  error?: { message?: string; type?: string };
};

/** Anthropic trả { type: 'error', error: { message } } hoặc HTTP 4xx cùng schema. */
function anthropicErrorMessage(raw: unknown, status: number, statusText: string): string {
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const err = o.error;
    if (typeof err === 'object' && err !== null && 'message' in err) {
      const m = (err as { message?: unknown }).message;
      if (typeof m === 'string' && m.length > 0) return m;
    }
    if (typeof o.message === 'string' && o.message.length > 0) return o.message;
  }
  if (status) return `${status} ${statusText}`.trim();
  return statusText || 'Unknown error';
}

/** Đảm bảo POST …/v1/messages (nhiều người chỉ ghi https://api.anthropic.com). */
function normalizeAnthropicBaseUrl(base: string): string {
  const b = base.replace(/\/$/, '');
  if (/\/v\d+$/i.test(b)) return b;
  if (b === 'https://api.anthropic.com' || b === 'http://api.anthropic.com') return `${b}/v1`;
  return b;
}

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

  async complete(
    userMessage: string,
    history: ChatMessage[] = [],
    skillSystemPrompt?: string,
  ): Promise<{ text: string } | { error: string }> {
    return this.completeRaw(skillSystemPrompt ?? this.cfg.systemPrompt, userMessage, history);
  }

  /** Like complete() but with a custom system prompt — used for structured extraction. */
  async completeRaw(
    systemPrompt: string,
    userMessage: string,
    history: ChatMessage[] = [],
  ): Promise<{ text: string } | { error: string }> {
    const base = this.cfg.baseUrl.replace(/\/$/, '');

    if (this.cfg.provider === 'anthropic') {
      return this.completeAnthropic(base, userMessage, systemPrompt, history);
    }
    // deepseek and openai both use the OpenAI-compatible format
    return this.completeOpenAiCompatible(base, userMessage, systemPrompt, history);
  }

  private async completeOpenAiCompatible(
    base: string,
    userMessage: string,
    systemPrompt: string,
    history: ChatMessage[] = [],
  ): Promise<{ text: string } | { error: string }> {
    const url = `${base}/chat/completions`;
    const body = {
      model: this.cfg.model,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
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

      const raw = await res.text();
      let data: OpenAiChatResponse = {};
      try {
        data = raw ? (JSON.parse(raw) as OpenAiChatResponse) : {};
      } catch {
        logger.warn(
          `OpenAI-compatible non-JSON HTTP ${res.status} url=${url} body=${raw.slice(0, 2000)}`,
        );
        return { error: LLM_ERROR_USER_MESSAGE };
      }

      if (!res.ok) {
        const msg = data.error?.message ?? res.statusText;
        logger.warn(
          `OpenAI-compatible HTTP ${res.status} url=${url} model=${this.cfg.model} apiMessage=${msg} body=${raw.slice(0, 2000)}`,
        );
        return { error: LLM_ERROR_USER_MESSAGE };
      }

      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) {
        logger.warn(`OpenAI-compatible empty content model=${this.cfg.model} body=${raw.slice(0, 2000)}`);
        return { error: LLM_ERROR_USER_MESSAGE };
      }
      return { text };
    } catch (err) {
      logger.warn(`OpenAI-compatible request failed model=${this.cfg.model}`, err);
      return { error: LLM_ERROR_USER_MESSAGE };
    }
  }

  private async completeAnthropic(
    base: string,
    userMessage: string,
    systemPrompt: string,
    history: ChatMessage[] = [],
  ): Promise<{ text: string } | { error: string }> {
    const root = normalizeAnthropicBaseUrl(base);
    const url = `${root}/messages`;
    const body = {
      model: this.cfg.model,
      max_tokens: this.cfg.maxTokens,
      system: systemPrompt,
      messages: [
        ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: userMessage },
      ],
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.cfg.apiKey.trim(),
          'anthropic-version': this.cfg.anthropicVersion,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });

      const rawText = await res.text();
      let data: AnthropicMessageResponse;
      try {
        data = rawText ? (JSON.parse(rawText) as AnthropicMessageResponse) : {};
      } catch {
        logger.warn(
          `Anthropic non-JSON HTTP ${res.status} url=${url} model=${this.cfg.model} body=${rawText.slice(0, 2000)}`,
        );
        return { error: LLM_ERROR_USER_MESSAGE };
      }

      if (!res.ok || data.type === 'error') {
        const detail = anthropicErrorMessage(data, res.status, res.statusText);
        logger.warn(
          `Anthropic HTTP ${res.status} url=${url} model=${this.cfg.model} detail=${detail} body=${rawText.slice(0, 2000)}`,
        );
        return { error: LLM_ERROR_USER_MESSAGE };
      }

      const text = extractAnthropicText(data);
      if (!text) {
        logger.warn(
          `Anthropic empty content model=${this.cfg.model} body=${rawText.slice(0, 2000)}`,
        );
        return { error: LLM_ERROR_USER_MESSAGE };
      }
      return { text };
    } catch (err) {
      logger.warn(`Anthropic request failed model=${this.cfg.model}`, err);
      return { error: LLM_ERROR_USER_MESSAGE };
    }
  }
}

function normalizeProvider(raw: string | undefined): LlmProvider {
  const v = raw?.trim().toLowerCase();
  if (v === 'anthropic' || v === 'claude') return 'anthropic';
  if (v === 'openai') return 'openai';
  return 'deepseek';
}

export function buildLlmChatServiceFromEnv(env: {
  ENABLE_AI_CHAT?: boolean | undefined;
  LLM_API_KEY?: string | undefined;
  LLM_PROVIDER?: string | undefined;
  LLM_BASE_URL?: string | undefined;
  LLM_MODEL?: string | undefined;
  LLM_SYSTEM_PROMPT?: string | undefined;
  LLM_COOLDOWN_MS?: number | undefined;
  LLM_MAX_TOKENS?: number | undefined;
  LLM_ANTHROPIC_VERSION?: string | undefined;
}): LlmChatService | null {
  if (!env.ENABLE_AI_CHAT) return null;

  const key = env.LLM_API_KEY?.trim();
  if (!key) return null;

  const provider = normalizeProvider(env.LLM_PROVIDER);
  const defaultBase =
    provider === 'anthropic'
      ? 'https://api.anthropic.com/v1'
      : provider === 'openai'
        ? 'https://api.openai.com/v1'
        : 'https://api.deepseek.com/v1';
  const baseUrl = (env.LLM_BASE_URL?.trim() || defaultBase).replace(/\/$/, '');
  const defaultModel =
    provider === 'anthropic'
      ? 'claude-haiku-4-5-20251001'
      : provider === 'openai'
        ? 'gpt-4o-mini'
        : 'deepseek-chat';

  return new LlmChatService({
    provider,
    apiKey: key,
    baseUrl,
    model: env.LLM_MODEL?.trim() || defaultModel,
    systemPrompt:
      env.LLM_SYSTEM_PROMPT?.trim() ||
      'Bạn là trợ lý ngắn gọn, thân thiện trong Discord. Trả lời tiếng Việt khi user dùng tiếng Việt. Không spam, không markdown quá dài. Nói giọng điệu nhẹ nhàng, ngọt ngào và hài hước, tấu hài có thể',
    cooldownMs: env.LLM_COOLDOWN_MS ?? 8000,
    maxTokens: Math.min(Math.max(env.LLM_MAX_TOKENS ?? 600, 64), 4096),
    anthropicVersion: env.LLM_ANTHROPIC_VERSION?.trim() || '2023-06-01',
  });
}
