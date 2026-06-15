// Claude API client — all calls go through Supabase Edge Function (never directly to Anthropic)
import { supabase } from './supabase';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeChatRequest {
  brand_id: string;
  messages: ClaudeMessage[];
  campaigns?: { name: string; objective: string; spend: number }[];
}

// Custom error for chat limit reached
export class ChatLimitError extends Error {
  code = 'CHAT_LIMIT_REACHED';
  upgrade_to: string;
  used: number;
  limit: number;

  constructor(message: string, used: number, limit: number, upgrade_to = 'growth') {
    super(message);
    this.name = 'ChatLimitError';
    this.upgrade_to = upgrade_to;
    this.used = used;
    this.limit = limit;
  }
}

export const sendChatMessage = async (request: ClaudeChatRequest): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('claude-chat', {
    body: request,
  });

  if (error) {
    // Supabase wraps non-2xx responses as FunctionsHttpError.
    // Try to extract the JSON body to detect CHAT_LIMIT_REACHED (429).
    if (error.context) {
      try {
        const body = await (error.context as Response).json();
        if (body?.error === 'CHAT_LIMIT_REACHED') {
          throw new ChatLimitError(
            body.message,
            body.used ?? 0,
            body.limit ?? 0,
            body.upgrade_to ?? 'growth'
          );
        }
      } catch (parseErr) {
        if (parseErr instanceof ChatLimitError) throw parseErr;
        // JSON parse failed — fall through to generic throw
      }
    }
    throw error;
  }

  return data.content as string;
};


export const generateRecommendations = async (brand_id: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('generate-recommendations', {
    body: { brand_id },
  });
  if (error) throw error;
};
