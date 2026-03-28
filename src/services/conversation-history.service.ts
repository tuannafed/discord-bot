export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const MAX_HISTORY = 20;

/**
 * In-memory conversation history per channel.
 * Stores last MAX_HISTORY messages (user + assistant pairs).
 */
export class ConversationHistoryService {
  private readonly histories = new Map<string, ChatMessage[]>();

  getHistory(channelId: string): ChatMessage[] {
    return this.histories.get(channelId) ?? [];
  }

  addUserMessage(channelId: string, content: string): void {
    const history = this.getOrCreate(channelId);
    history.push({ role: 'user', content });
    this.trim(channelId);
  }

  addAssistantMessage(channelId: string, content: string): void {
    const history = this.getOrCreate(channelId);
    history.push({ role: 'assistant', content });
    this.trim(channelId);
  }

  clear(channelId: string): void {
    this.histories.delete(channelId);
  }

  private getOrCreate(channelId: string): ChatMessage[] {
    if (!this.histories.has(channelId)) {
      this.histories.set(channelId, []);
    }
    return this.histories.get(channelId)!;
  }

  private trim(channelId: string): void {
    const history = this.histories.get(channelId);
    if (history && history.length > MAX_HISTORY) {
      // Remove oldest messages but keep pairs intact
      history.splice(0, history.length - MAX_HISTORY);
    }
  }
}
