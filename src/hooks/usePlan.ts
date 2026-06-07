import { useSubscription } from './useSubscription';

export type PlanId = 'free' | 'starter' | 'growth' | 'scale';
export type FeatureKey = 'execute' | 'more_brands' | 'unlimited_chat' | 'white_label' | 'agency_view' | 'api_access';

export interface PlanGates {
  // Plan info
  planId: PlanId;
  planName: string;
  isActive: boolean;
  isLoading: boolean;

  // Limits
  maxBrands: number;
  maxAdAccounts: number;
  chatQueriesLimit: number;
  chatQueriesUsed: number;
  chatQueriesUnlimited: boolean;
  chatQueriesRemaining: number;

  // Feature gates
  canExecute: boolean;
  canAddBrand: (currentBrands: number) => boolean;
  canChat: () => boolean;
  hasWhiteLabel: boolean;
  hasAgencyView: boolean;
  hasApiAccess: boolean;

  // Upgrade logic — returns required plan ID or null
  upgradeRequired: (feature: FeatureKey) => PlanId | null;

  // Usage
  usage: {
    chatQueriesUsed: number;
    benchmarkAuditsUsed: number;
    executionsUsed: number;
  };
}

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'growth', 'scale'];

export const usePlan = (): PlanGates => {
  const { subscription, usage, plan, isLoading } = useSubscription();

  const planId = (plan?.id || 'free') as PlanId;
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const chatLimit = plan?.chat_queries_monthly ?? 0;
  const chatUsed = usage?.chat_queries_used ?? 0;
  const chatUnlimited = chatLimit === -1;

  const canChat = () => {
    if (!isActive && planId !== 'free') return false;
    if (chatUnlimited) return true;
    return chatUsed < chatLimit;
  };

  const upgradeRequired = (feature: FeatureKey): PlanId | null => {
    switch (feature) {
      case 'execute':
        return !plan?.can_execute ? 'growth' : null;
      case 'unlimited_chat':
        return chatLimit !== -1 ? 'growth' : null;
      case 'more_brands':
        return planId === 'starter' ? 'growth' : planId === 'growth' ? 'scale' : null;
      case 'white_label':
        return !plan?.has_white_label ? 'scale' : null;
      case 'agency_view':
        return !plan?.has_agency_view ? 'scale' : null;
      case 'api_access':
        return !plan?.has_api_access ? 'scale' : null;
      default:
        return null;
    }
  };

  return {
    planId,
    planName: plan?.name || 'Free',
    isActive,
    isLoading,

    maxBrands: plan?.max_brands ?? 0,
    maxAdAccounts: plan?.max_ad_accounts ?? 0,
    chatQueriesLimit: chatLimit,
    chatQueriesUsed: chatUsed,
    chatQueriesUnlimited: chatUnlimited,
    chatQueriesRemaining: chatUnlimited ? Infinity : Math.max(0, chatLimit - chatUsed),

    canExecute: plan?.can_execute ?? false,
    canAddBrand: (currentBrands: number) => currentBrands < (plan?.max_brands ?? 0),
    canChat,
    hasWhiteLabel: plan?.has_white_label ?? false,
    hasAgencyView: plan?.has_agency_view ?? false,
    hasApiAccess: plan?.has_api_access ?? false,

    upgradeRequired,

    usage: {
      chatQueriesUsed: chatUsed,
      benchmarkAuditsUsed: usage?.benchmark_audits_used ?? 0,
      executionsUsed: usage?.executions_used ?? 0,
    },
  };
};

// ── Plan metadata (static, for UI) ───────────────────────────
export const PLAN_META: Record<PlanId, {
  label: string;
  monthly: number;
  yearly: number;
  color: string;
}> = {
  free:    { label: 'Free',    monthly: 0,   yearly: 0,    color: '#6b4030' },
  starter: { label: 'Starter', monthly: 149, yearly: 1490, color: '#C4A090' },
  growth:  { label: 'Growth',  monthly: 349, yearly: 3490, color: '#C4836A' },
  scale:   { label: 'Scale',   monthly: 749, yearly: 7490, color: '#D4A847' },
};

export { PLAN_ORDER };
