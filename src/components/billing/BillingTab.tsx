import React, { useState } from 'react';
import { CreditCard, TrendingUp, Calendar, Zap, Users, RefreshCw, ExternalLink } from 'lucide-react';
import { useSubscription, createPortalSession } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface BillingTabProps {
  /* no props — uses useSubscription hook internally */
}

// Helper: color the plan badge
function getPlanBadgeStyle(planId: string): React.CSSProperties {
  const map: Record<string, { background: string; color: string; border: string }> = {
    free:    { background: 'rgba(74,46,30,0.2)',    color: '#8B6050',  border: '0.5px solid #4a2e1e' },
    starter: { background: 'rgba(196,131,106,0.1)', color: '#C4836A',  border: '0.5px solid rgba(196,131,106,0.3)' },
    growth:  { background: 'rgba(16,185,129,0.1)',  color: '#10B981',  border: '0.5px solid rgba(16,185,129,0.3)' },
    scale:   { background: 'rgba(139,92,246,0.1)',  color: '#A78BFA',  border: '0.5px solid rgba(139,92,246,0.3)' },
  };
  return map[planId] ?? map['free'];
}

// Helper: progress bar fill color based on usage %
function getUsageColor(used: number, limit: number): string {
  if (limit === -1) return '#10B981'; // unlimited
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  if (pct > 90) return '#EF4444';
  if (pct > 70) return '#F59E0B';
  return '#10B981';
}

// Helper: format renewal date
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const BillingTab: React.FC<BillingTabProps> = () => {
  const navigate = useNavigate();
  const { subscription, usage, plan, isLoading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession();
      if (result?.url) window.location.href = result.url;
    } catch (err) {
      console.error('Failed to open billing portal:', err);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession();
      if (result?.url) window.location.href = result.url;
    } catch (err) {
      console.error('Failed to open billing portal:', err);
    } finally {
      setPortalLoading(false);
    }
  };

  const planId: string = subscription?.plan_id ?? 'free';
  const statusRaw: string = subscription?.status ?? 'active';
  const isScale = planId === 'scale';

  const chatUsed: number = usage?.chat_queries_used ?? 0;
  const chatLimit: number = plan?.chat_queries_monthly ?? -1;

  // brands/ad accounts — show 0 used (real counts require a separate query)
  const brandsUsed = 0;
  const brandsLimit: number = plan?.max_brands ?? 1;

  const adAccountsUsed = 0;
  const adAccountsLimit: number = plan?.max_ad_accounts ?? 1;

  const renewalDate: string | null = subscription?.current_period_end ?? null;
  const cancelAtPeriodEnd: boolean = subscription?.cancel_at_period_end ?? false;

  // Status badge
  const statusBadge = (() => {
    if (statusRaw === 'active' && !cancelAtPeriodEnd)
      return { label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' };
    if (statusRaw === 'past_due')
      return { label: 'Past Due', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
    if (cancelAtPeriodEnd)
      return { label: 'Canceling', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
    return { label: 'Canceled', color: '#8B6050', bg: 'rgba(139,96,80,0.1)', border: 'rgba(139,96,80,0.3)' };
  })();

  const planPrice: number = subscription?.billing_cycle === 'yearly'
    ? Math.round((plan?.price_yearly ?? 0) / 100 / 12)
    : Math.round((plan?.price_monthly ?? 0) / 100);
  const planName: string = plan?.name ?? planId.charAt(0).toUpperCase() + planId.slice(1);
  const planBadgeStyle = getPlanBadgeStyle(planId);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#4a2e1e',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '13px',
        }}
      >
        <RefreshCw size={16} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
        Loading billing info…
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ─── Section 1: Current Plan Card ─── */}
        <div
          style={{
            background: '#1C1208',
            border: '0.5px solid #2a1a0e',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          {/* Plan name + status badges row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                ...planBadgeStyle,
                fontFamily: 'Outfit, sans-serif',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              {planName}
            </span>
            <span
              style={{
                background: statusBadge.bg,
                border: `0.5px solid ${statusBadge.border}`,
                color: statusBadge.color,
                fontFamily: 'Outfit, sans-serif',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              {statusBadge.label}
            </span>
          </div>

          {/* Price row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
            <span
              style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '28px',
                color: '#F5E6D8',
                fontWeight: 400,
              }}
            >
              {planPrice === 0 ? '€0' : `€${planPrice}`}
            </span>
            <span
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '12px',
                color: '#4a2e1e',
              }}
            >
              / month
            </span>
          </div>

          {/* Renewal / cancellation date */}
          {cancelAtPeriodEnd ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '11px',
                color: '#F59E0B',
                marginBottom: '16px',
                background: 'rgba(245,158,11,0.07)',
                border: '0.5px solid rgba(245,158,11,0.2)',
                borderRadius: '5px',
                padding: '8px 10px',
              }}
            >
              <Calendar size={12} />
              Cancels on {formatDate(renewalDate)}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '11px',
                color: '#8B6050',
                marginBottom: '16px',
              }}
            >
              <Calendar size={12} color="#4a2e1e" />
              Renews on {formatDate(renewalDate)}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Manage Billing */}
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(196,131,106,0.08)',
                border: '0.5px solid rgba(196,131,106,0.25)',
                color: '#C4836A',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: portalLoading ? 'not-allowed' : 'pointer',
                opacity: portalLoading ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={e => { if (!portalLoading) e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { if (!portalLoading) e.currentTarget.style.opacity = '1'; }}
            >
              {portalLoading ? (
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <CreditCard size={13} />
              )}
              Manage Billing
              <ExternalLink size={11} style={{ marginLeft: '2px', opacity: 0.6 }} />
            </button>

            {/* Upgrade Plan (hidden for Scale) */}
            {!isScale && (
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#C4836A',
                  border: 'none',
                  color: '#0F0A07',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <TrendingUp size={13} />
                Upgrade Plan
              </button>
            )}
          </div>
        </div>

        {/* ─── Section 2: Usage This Month ─── */}
        <div
          style={{
            background: '#1C1208',
            border: '0.5px solid #2a1a0e',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              color: '#4a2e1e',
              marginBottom: '16px',
              fontWeight: 600,
            }}
          >
            Usage this month
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Intelligence Chat */}
            <UsageMeter
              icon={<Zap size={12} color="#C4836A" />}
              label="Intelligence Chat"
              used={chatUsed}
              limit={chatLimit}
            />

            {/* Brands */}
            <UsageMeter
              icon={<Users size={12} color="#C4836A" />}
              label="Brands"
              used={brandsUsed}
              limit={brandsLimit}
            />

            {/* Ad Accounts */}
            <UsageMeter
              icon={<CreditCard size={12} color="#C4836A" />}
              label="Ad Accounts"
              used={adAccountsUsed}
              limit={adAccountsLimit}
            />
          </div>
        </div>

        {/* ─── Section 3: Danger Zone ─── */}
        <div
          style={{
            background: '#0F0A07',
            border: '0.5px solid rgba(239,68,68,0.2)',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              color: '#EF4444',
              marginBottom: '8px',
              fontWeight: 600,
            }}
          >
            Danger Zone
          </div>
          <p
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '12px',
              color: '#8B6050',
              margin: '0 0 12px 0',
              lineHeight: 1.5,
            }}
          >
            Cancel your subscription — your data will be retained for 30 days.
          </p>
          <button
            onClick={handleCancelSubscription}
            disabled={portalLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239,68,68,0.07)',
              border: '0.5px solid rgba(239,68,68,0.3)',
              color: '#EF4444',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: portalLoading ? 'not-allowed' : 'pointer',
              opacity: portalLoading ? 0.6 : 1,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { if (!portalLoading) e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={e => { if (!portalLoading) e.currentTarget.style.opacity = '1'; }}
          >
            {portalLoading ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : null}
            Cancel Subscription
          </button>
        </div>

      </div>
    </>
  );
};

/* ─── Sub-component: Usage Meter ─── */
interface UsageMeterProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number; // -1 = unlimited
}

const UsageMeter: React.FC<UsageMeterProps> = ({ icon, label, used, limit }) => {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const fillColor = getUsageColor(used, limit);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {icon}
          <span
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#8B6050',
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: '14px',
            color: '#F5E6D8',
            fontWeight: 400,
          }}
        >
          {isUnlimited
            ? <span style={{ color: '#10B981', fontSize: '11px', fontFamily: 'Outfit, sans-serif' }}>Unlimited</span>
            : `${used} / ${limit}`}
        </span>
      </div>

      {/* Progress bar */}
      {!isUnlimited && (
        <div
          style={{
            height: '3px',
            background: '#0F0A07',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: fillColor,
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BillingTab;
