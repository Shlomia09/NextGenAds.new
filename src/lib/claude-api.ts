// Claude API client — all calls go through Supabase Edge Function (never directly to Anthropic)
import { supabase } from './supabase';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeChatRequest {
  brand_id: string;
  messages: ClaudeMessage[];
}

export const sendChatMessage = async (request: ClaudeChatRequest): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('claude-chat', {
    body: request,
  });

  if (error) throw error;
  return data.content as string;
};

export const generateRecommendations = async (brand_id: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('generate-recommendations', {
    body: { brand_id },
  });
  if (error) throw error;
};
