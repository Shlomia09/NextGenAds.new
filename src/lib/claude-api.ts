// Claude API client — all calls go through Supabase Edge Function (never directly to Anthropic)
import { supabase } from './supabase';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Full per-campaign context sent to the edge function */
export interface CampaignContext {
  name: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  // Ecommerce
  purchases: number;
  revenue: number;
  roas: number;
  // Lead gen
  leads: number;
  cpl: number;
  lead_quality_rate: number;
  qualified_leads: number;
  bookings: number;
  // Local
  reach: number;
  frequency: number;
  budget_daily?: number;
}

export interface ClaudeChatRequest {
  brand_id: string;
  messages: ClaudeMessage[];
  /** Rich campaign context with all KPIs */
  campaigns?: CampaignContext[];
  /** Pre-built context summary string (injected into system prompt) */
  campaign_context_summary?: string;
  conversion_type?: string;
}

export interface ChatResponse {
  content: string;
  action_proposal: ActionProposal | null;
}

export interface ActionProposal {
  type: 'create_campaign' | 'duplicate_ad' | 'duplicate_adset' | 'pause_campaign' | 'activate_campaign' | 'scale_budget';
  label: string;
  description: string;
  params?: Record<string, unknown>;
  ad_account_id?: string;
  campaign_id_external?: string;
  ad_id_external?: string;
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

export const sendChatMessage = async (request: ClaudeChatRequest): Promise<ChatResponse> => {
  const { data, error } = await supabase.functions.invoke('claude-chat', {
    body: request,
  });

  if (error) {
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
      }
    }
    throw error;
  }

  return {
    content:         data.content as string,
    action_proposal: (data.action_proposal as ActionProposal | null) ?? null,
  };
};


export const generateRecommendations = async (brand_id: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('generate-recommendations', {
    body: { brand_id },
  });
  if (error) throw error;
};
