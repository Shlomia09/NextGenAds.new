// Brand & Account Types
export type Platform = 'meta' | 'google';
export type BrandStage = 'new' | 'scaling' | 'mature';
export type RecommendationPriority = 'critical' | 'high' | 'medium';
export type RecommendationStatus = 'pending' | 'approved' | 'executed' | 'dismissed';
export type RecommendationType =
  | 'funnel_structure'
  | 'audience'
  | 'budget'
  | 'creative'
  | 'scaling';

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  category: string;
  aov_min: number;
  aov_max: number;
  currency: string;
  markets: string[];
  stage: BrandStage;
  created_at: string;
}

export interface AdAccount {
  id: string;
  user_id: string;
  platform: Platform;
  account_id: string;
  account_name: string;
  access_token: string;
  refresh_token?: string;
  connected_at: string;
  status: 'active' | 'error' | 'disconnected';
}

export interface Campaign {
  id: string;
  brand_id: string;
  ad_account_id: string;
  platform: Platform;
  campaign_id_external: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  objective: string;
  budget_daily?: number;
  budget_lifetime?: number;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  roas: number;
  date_start: string;
  date_end?: string;
  synced_at: string;
}

export interface Recommendation {
  id: string;
  brand_id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  action: string;
  reasoning: string;
  benchmark_reference: string;
  status: RecommendationStatus;
  created_at: string;
  executed_at?: string;
}

export interface IntelligenceSession {
  id: string;
  brand_id: string;
  user_id: string;
  messages: ChatMessage[];
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Benchmark data types
export interface BenchmarkMetric {
  label: string;
  your_value: number;
  benchmark_value: number;
  unit: string;
  higher_is_better: boolean;
}

export interface AovBracket {
  label: string;
  min: number;
  max: number;
  benchmark_cac: { min: number; max: number };
  benchmark_roas: number;
  recommended_funnel: string;
  timeline_days: number;
}

// Meta API types
export interface MetaCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  status: string;
  objective: string;
  spend: string;
  impressions: string;
  clicks: string;
  cpm: string;
  cpc: string;
  purchases?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
  date_start: string;
  date_stop: string;
}
