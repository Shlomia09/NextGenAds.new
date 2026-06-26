/**
 * Dashboard.tsx — Bento Home (§38)
 * Layout: Welcome strip (full) + 2-col grid (1.6fr / 1fr)
 * Data: 100% from Supabase / computed from real campaigns (§41-45)
 * NO fake numbers. Missing sources → empty state or "Coming soon" (§43).
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, Sparkles, Zap, Activity,
  CheckCircle2, AlertTriangle, ChevronRight,
  BarChart2, Layers,
} from 'lucide-react';

import {
  getBrands, getCampaigns, getRecommendations, getAdAccounts,
  getIntelligenceSessions, updateRecommendationStatus,
} from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  getBenchmarkMetricsByType,
  formatCurrency, formatNumber,
} from '../lib/benchmarks';
import type { Campaign, Recommendation, BusinessType, AdAccount, BenchmarkMetric } from '../types';

// ─── Helpers ───────────────────────────────────────────────────

/** Time-based greeting (§38) */
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/** Extract display name from auth email */
const displayName = (email?: string) => {
  if (!email) return '';
  const local = email.split('@')[0];
  return local
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/** Relative time label */
const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

/** Whether a date is today */
const isToday = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
};

// ─── Account Health Score (§38 + §42) ─────────────────────────
// Computed from real campaign data vs benchmarks. NO hardcoded numbers.

interface HealthComponent {
  name: string;
  score: number;       // 0-100, or -1 = no data
  label: string;
  color: string;
}

const computeHealth = (
  campaigns: Campaign[],
  benchmarks: BenchmarkMetric[],
): { score: number; grade: string; components: HealthComponent[] } => {
  if (!campaigns.length) return { score: 0, grade: 'No data', components: [] };

  const totalLeads   = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalSpend   = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalClicks  = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);

  const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const cplBench = benchmarks.find(b => b.label.toLowerCase().includes('cpl'));
  const ctrBench = benchmarks.find(b => b.label.toLowerCase().includes('ctr'));

  const components: HealthComponent[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Cost efficiency: CPL vs benchmark
  if (avgCPL > 0 && cplBench && cplBench.benchmark_value > 0) {
    const ratio = avgCPL / cplBench.benchmark_value;
    const s = ratio < 0.8 ? 95 : ratio < 1.0 ? 78 : ratio < 1.3 ? 52 : 22;
    const lbl = ratio < 0.8 ? 'Excellent' : ratio < 1.0 ? 'Good' : ratio < 1.3 ? 'Watch' : 'Poor';
    components.push({ name: 'Cost efficiency', score: s, label: lbl, color: s >= 70 ? 'var(--green)' : s >= 45 ? 'var(--champagne)' : 'var(--red)' });
    totalScore += s * 40; totalWeight += 40;
  }

  // Lead volume
  if (totalLeads > 0) {
    const s = totalLeads > 200 ? 92 : totalLeads > 100 ? 80 : totalLeads > 30 ? 62 : 40;
    const lbl = s >= 80 ? 'Strong' : s >= 60 ? 'Good' : 'Building';
    components.push({ name: 'Lead volume', score: s, label: lbl, color: s >= 70 ? 'var(--green)' : s >= 50 ? 'var(--champagne)' : 'var(--red)' });
    totalScore += s * 30; totalWeight += 30;
  }

  // CTR health
  if (avgCTR > 0 && ctrBench && ctrBench.benchmark_value > 0) {
    const ratio = avgCTR / ctrBench.benchmark_value;
    const s = ratio > 1.2 ? 90 : ratio > 1.0 ? 75 : ratio > 0.7 ? 52 : 28;
    const lbl = ratio > 1.2 ? 'Above avg' : ratio > 1.0 ? 'On target' : ratio > 0.7 ? 'Below avg' : 'Needs work';
    components.push({ name: 'Ad engagement', score: s, label: lbl, color: s >= 70 ? 'var(--green)' : s >= 45 ? 'var(--champagne)' : 'var(--red)' });
    totalScore += s * 20; totalWeight += 20;
  }

  // Budget pacing (campaigns with daily budget set)
  const withBudget = campaigns.filter(c => (c.budget_daily ?? 0) > 0);
  if (campaigns.length > 0) {
    const pct = withBudget.length / campaigns.length;
    const s = pct === 1 ? 85 : pct > 0.5 ? 65 : 40;
    const lbl = pct === 1 ? 'All set' : pct > 0.5 ? 'Partial' : 'Not set';
    components.push({ name: 'Budget pacing', score: s, label: lbl, color: s >= 70 ? 'var(--green)' : s >= 50 ? 'var(--champagne)' : 'var(--red)' });
    totalScore += s * 10; totalWeight += 10;
  }

  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  const grade = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Watch' : 'Needs work';
  return { score, grade, components };
};

// ─── Live Activity feed (§38 §42) — from real timestamps ──────
// Sources: campaigns.synced_at, sessions.created_at, recommendations.created_at
// NO invented events.

interface ActivityEvent {
  id: string;
  type: 'sync' | 'ai' | 'rec';
  label: string;
  timestamp: string;
  color: string;
}

const buildActivity = (
  campaigns: Campaign[],
  sessions: { id: string; title: string; created_at: string }[],
  recs: Recommendation[],
): ActivityEvent[] => {
  const events: ActivityEvent[] = [];

  // Most recently synced campaign (deduplicate to 1 event per unique synced_at date)
  const seen = new Set<string>();
  campaigns.forEach(c => {
    const key = c.synced_at.split('T')[0];
    if (!seen.has(key)) {
      seen.add(key);
      events.push({
        id: `sync-${c.id}`,
        type: 'sync',
        label: `${seen.size === 1 ? campaigns.filter(x => x.synced_at.startsWith(key)).length + ' campaigns' : ''} synced with Meta`,
        timestamp: c.synced_at,
        color: 'var(--blue)',
      });
    }
  });

  // AI sessions
  sessions.slice(0, 3).forEach(s => {
    events.push({
      id: `ai-${s.id}`,
      type: 'ai',
      label: s.title && s.title !== 'New Session' ? `AI: ${s.title}` : 'Intelligence session started',
      timestamp: s.created_at,
      color: 'var(--accent)',
    });
  });

  // Recommendations generated
  recs.slice(0, 3).forEach(r => {
    events.push({
      id: `rec-${r.id}`,
      type: 'rec',
      label: r.title,
      timestamp: r.created_at,
      color: 'var(--green)',
    });
  });

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 7);
};

// ─── Card wrapper ───────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    boxShadow: 'var(--shadow)',
    padding: '18px 20px',
    ...style,
  }}>
    {children}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
    {children}
  </div>
);

// ─── Main Dashboard ────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [learnMoreRec, setLearnMoreRec] = useState<Recommendation | null>(null);

  // ── Queries ──────────────────────────────────────────────────
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn:  () => getBrands(user!.id),
    enabled:  !!user,
  });

  const activeBrand = brands?.[0];

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', activeBrand?.id],
    queryFn:  () => getCampaigns(activeBrand!.id),
    enabled:  !!activeBrand,
  });

  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ['recommendations', activeBrand?.id],
    queryFn:  () => getRecommendations(activeBrand!.id),
    enabled:  !!activeBrand,
  });

  const { data: adAccounts = [] } = useQuery<AdAccount[]>({
    queryKey: ['adAccounts', user?.id],
    queryFn:  () => getAdAccounts(user!.id) as Promise<AdAccount[]>,
    enabled:  !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', activeBrand?.id],
    queryFn:  () => getIntelligenceSessions(activeBrand!.id),
    enabled:  !!activeBrand,
  });

  const updateRecMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'dismissed' }) =>
      updateRecommendationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
  });

  // ── Derived data ─────────────────────────────────────────────
  const businessType = (activeBrand?.business_type as BusinessType) ?? 'ecommerce';
  const aov = activeBrand ? (activeBrand.aov_min + activeBrand.aov_max) / 2 : 0;
  const benchmarks = useMemo(() => activeBrand ? getBenchmarkMetricsByType(businessType, aov, campaigns) : [], [activeBrand, campaigns, businessType, aov]);

  const totalSpend        = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalLeads        = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalImpressions  = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const totalClicks       = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const avgCPL            = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCTR            = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Today pulse — real: campaigns synced + AI sessions
  const syncedToday    = campaigns.filter(c => isToday(c.synced_at)).length;
  const sessionsToday  = sessions.filter(s => isToday(s.created_at)).length;

  // Account health
  const health = useMemo(() => computeHealth(campaigns, benchmarks), [campaigns, benchmarks]);

  // Pending recommendations (top 3)
  const pendingRecs = recommendations.filter(r => r.status === 'pending').slice(0, 3);

  // Live activity
  const activity = useMemo(() => buildActivity(campaigns, sessions, recommendations), [campaigns, sessions, recommendations]);

  // Per-account aggregation
  const accountStats = useMemo(() => {
    return adAccounts.map(acc => {
      const accCampaigns = campaigns.filter(c => c.ad_account_id === acc.id);
      return {
        account:    acc,
        campaigns:  accCampaigns.length,
        active:     accCampaigns.filter(c => c.status === 'ACTIVE').length,
        spend:      accCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0),
        leads:      accCampaigns.reduce((s, c) => s + (c.leads ?? 0), 0),
      };
    });
  }, [adAccounts, campaigns]);

  // ── Loading state ────────────────────────────────────────────
  if (brandsLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 44px)' }}>
      <RefreshCw size={18} style={{ color: 'var(--text-3)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  // ── No brand ─────────────────────────────────────────────────
  if (!activeBrand) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 44px)' }}>
      <div style={{ textAlign: 'center', padding: '60px 40px' }}>
        <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: 16 }} strokeWidth={1.5} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--text)', margin: '0 0 8px' }}>
          No Brand Connected Yet
        </h2>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-2)', margin: '0 0 24px' }}>
          Complete the onboarding to activate your Intelligence Dashboard
        </p>
        <a href="/onboarding" style={{ background: 'var(--accent)', color: '#2A1A12', padding: '10px 22px', borderRadius: 10, textDecoration: 'none', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500 }}>
          Set Up Your Brand
        </a>
      </div>
    </div>
  );

  const isLoading = campaignsLoading || recsLoading;

  return (
    <>
      <div style={{ height: 'calc(100vh - 44px)', overflowY: 'auto', background: 'var(--bg)', padding: '20px 24px 32px' }}>

        {/* ════════════════════════════════════════════════════════
            WELCOME STRIP — full width (§38)
        ════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          {/* Greeting */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
              color: 'var(--text)', margin: '0 0 4px', letterSpacing: -0.5,
            }}>
              {greeting()}{user?.email ? `, ${displayName(user.email)}` : ''}
            </h1>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Today pulse — real data only (§42) */}
          <Card style={{ padding: '14px 20px', minWidth: 280, display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
            {/* Rose-gold glow */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', opacity: 0.08, filter: 'blur(20px)' }} />
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={16} color="#2A1A12" style={{ transform: 'var(--bg-page, none)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                System activity today
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                {syncedToday > 0
                  ? <>{syncedToday} campaign{syncedToday > 1 ? 's' : ''} synced{sessionsToday > 0 ? ` · ${sessionsToday} AI session${sessionsToday > 1 ? 's' : ''}` : ''}</>
                  : sessionsToday > 0
                    ? <>{sessionsToday} AI session{sessionsToday > 1 ? 's' : ''} today</>
                    : <span style={{ color: 'var(--text-3)' }}>No activity logged yet</span>
                }
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                Optimization log coming soon
              </div>
            </div>
          </Card>
        </div>

        {/* ════════════════════════════════════════════════════════
            BENTO GRID — 1.6fr / 1fr (§38)
        ════════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* ══ LEFT COLUMN ══════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── 1. Your Accounts (§38 §42) ── */}
            <Card>
              <SectionLabel>Your accounts</SectionLabel>
              {adAccounts.length === 0 && !isLoading && (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>
                  No Meta accounts connected.{' '}
                  <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Connect now →</a>
                </div>
              )}
              {accountStats.map(({ account, campaigns: numCampaigns, active, spend, leads }) => {
                const initials = account.display_name
                  ? account.display_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                  : account.account_name.slice(0, 2).toUpperCase();
                return (
                  <div key={account.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px',
                    background: 'var(--surface-2)', borderRadius: 12, marginBottom: 8,
                    border: '1px solid var(--border-soft)',
                  }}>
                    {/* Logo / initials */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: '#2A1A12',
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {account.display_name || account.account_name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        {numCampaigns} campaign{numCampaigns !== 1 ? 's' : ''} · {active} active
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: 'var(--accent)' }}>{formatCurrency(spend)}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-3)' }}>spend</div>
                      </div>
                      {leads > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: 'var(--green)' }}>{formatNumber(leads)}</div>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-3)' }}>leads</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* ── 2. Performance Summary (§38 §42 §43) ── */}
            {/* NOTE: Daily 30-day chart requires daily breakdown from Meta API
                (time_increment=1). This data is not yet synced.
                Showing aggregated totals instead. (§43 rule) */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <SectionLabel>Performance · all time</SectionLabel>
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '3px 9px', borderRadius: 20, border: '1px solid var(--border-soft)' }}>
                  Daily chart · coming soon
                </div>
              </div>
              {isLoading ? (
                <div style={{ height: 80, background: 'var(--surface-2)', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : campaigns.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>
                  No campaigns synced yet. Sync your Meta account to see performance.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Total Spend', value: formatCurrency(totalSpend), color: 'var(--accent)', icon: '€' },
                    { label: 'Total Leads', value: formatNumber(totalLeads), color: 'var(--green)', icon: null, hide: totalLeads === 0 },
                    { label: 'Avg CPL', value: avgCPL > 0 ? formatCurrency(avgCPL) : '—', color: avgCPL > 0 ? 'var(--text)' : 'var(--text-3)', icon: null },
                    { label: 'Avg CTR', value: avgCTR > 0 ? `${avgCTR.toFixed(2)}%` : '—', color: avgCTR > 0 ? 'var(--blue)' : 'var(--text-3)', icon: null },
                  ].filter(m => !m.hide).map(m => (
                    <div key={m.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '12px 13px' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{m.label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <BarChart2 size={10} />
                Showing lifetime totals from {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}. Daily breakdown requires Meta daily sync.
              </div>
            </Card>

            {/* ── 3. Recent Intelligence (§38 §42) ── */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionLabel>Recent intelligence</SectionLabel>
                <button
                  onClick={() => navigate('/intelligence')}
                  style={{ background: 'none', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  All sessions <ChevronRight size={11} />
                </button>
              </div>

              {isLoading ? (
                <div style={{ height: 80, background: 'var(--surface-2)', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : sessions.length === 0 ? (
                /* Empty state — inviting (§39) */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                    Ask your first question
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
                    Your AI Intelligence sessions will appear here.
                  </div>
                  <button
                    onClick={() => navigate('/intelligence')}
                    style={{ background: 'var(--accent)', color: '#2A1A12', border: 'none', borderRadius: 9, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  >
                    Open Intelligence →
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.slice(0, 4).map((s: { id: string; title: string; created_at: string; messages: { role: string; content: string }[] }) => {
                    const userMsg = Array.isArray(s.messages) ? s.messages.find((m: { role: string }) => m.role === 'user') : null;
                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate('/intelligence')}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 11,
                          background: 'var(--surface-2)', border: '1px solid var(--border-soft)',
                          borderRadius: 11, padding: '11px 13px', cursor: 'pointer',
                          textAlign: 'left', width: '100%', transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-soft)')}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.title && s.title !== 'New Session' ? s.title : (userMsg ? (userMsg as { content: string }).content.slice(0, 50) + '…' : 'Intelligence session')}
                          </div>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                            {Array.isArray(s.messages) ? s.messages.length : 0} message{(Array.isArray(s.messages) ? s.messages.length : 0) !== 1 ? 's' : ''} · {relTime(s.created_at)}
                          </div>
                        </div>
                        <ChevronRight size={13} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 5 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* ══ RIGHT COLUMN ═════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── 4. Account Health (§38 §42) ── */}
            <Card>
              <SectionLabel>Account health</SectionLabel>
              {campaigns.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
                  Sync campaigns to compute health score.
                </div>
              ) : (
                <>
                  {/* Ring score — conic-gradient (§38) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
                    <div style={{
                      width: 76, height: 76, borderRadius: '50%', flexShrink: 0,
                      background: `conic-gradient(var(--accent) 0% ${health.score}%, var(--border) ${health.score}% 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 0 4px var(--surface)`,
                      position: 'relative',
                    }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>{health.score}</span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-3)' }}>/100</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                        {health.grade}
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)' }}>
                        Based on {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} vs 9yr beauty benchmark
                      </div>
                    </div>
                  </div>
                  {/* Components */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {health.components.map(comp => (
                      <div key={comp.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', background: 'var(--surface-2)', borderRadius: 9, border: '1px solid var(--border-soft)' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)' }}>{comp.name}</span>
                        {comp.score < 0 ? (
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', background: 'var(--surface)', padding: '2px 7px', borderRadius: 20 }}>No data</span>
                        ) : (
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500, color: comp.color, background: `${comp.color.replace(')', '-soft)').replace('var(--', 'var(--')}`, padding: '2px 8px', borderRadius: 20 }}>
                            {comp.label}
                          </span>
                        )}
                      </div>
                    ))}
                    {/* Creative freshness — no data (§43) */}
                    {!health.components.find(c => c.name === 'Creative freshness') && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', background: 'var(--surface-2)', borderRadius: 9, border: '1px solid var(--border-soft)', opacity: 0.6 }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)' }}>Creative freshness</span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', background: 'var(--surface)', padding: '2px 7px', borderRadius: 20 }}>Coming soon</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card>

            {/* ── 5. Needs Your Attention (§38 §42) ── */}
            <Card>
              <SectionLabel>Needs your attention</SectionLabel>
              {isLoading ? (
                <div style={{ height: 60, background: 'var(--surface-2)', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : pendingRecs.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>All clear</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)' }}>No pending actions right now.</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {pendingRecs.map(rec => {
                    const isHigh = rec.priority === 'critical' || rec.priority === 'high';
                    const iconColor = isHigh ? 'var(--red)' : rec.priority === 'high' ? 'var(--champagne)' : 'var(--blue)';
                    const bgColor  = isHigh ? 'var(--red-soft)' : 'var(--surface-2)';
                    return (
                      <div key={rec.id} style={{ background: bgColor, border: `1px solid ${isHigh ? 'var(--red)' : 'var(--border-soft)'}`, borderRadius: 11, padding: '11px 13px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                          <AlertTriangle size={13} style={{ color: iconColor, flexShrink: 0, marginTop: 1 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{rec.title}</div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4, marginBottom: 8 }}>
                              {rec.description.slice(0, 90)}{rec.description.length > 90 ? '…' : ''}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => updateRecMutation.mutate({ id: rec.id, status: 'approved' })}
                                style={{ padding: '4px 11px', background: 'var(--accent)', color: '#2A1A12', border: 'none', borderRadius: 7, fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                              >
                                Apply
                              </button>
                              <button
                                onClick={() => setLearnMoreRec(rec)}
                                style={{ padding: '4px 11px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-2)', cursor: 'pointer' }}
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* ── 6. Top Creative (§38 §42 §43) ── */}
            {/* ad-level insights not yet in DB → "Coming soon" per §43 */}
            <Card style={{ opacity: 0.8 }}>
              <SectionLabel>Top creative · {new Date().toLocaleString('en', { month: 'long' })}</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 54, height: 54, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-soft), var(--surface-2))', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Layers size={20} style={{ color: 'var(--text-3)' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>Ad-level insights</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                    Top creative ranking requires ad-level data from Meta API. Coming soon.
                  </div>
                </div>
              </div>
            </Card>

            {/* ── 7. Live Activity (§38 §42) ── */}
            {/* Real events from: campaigns.synced_at + sessions.created_at + recommendations.created_at */}
            <Card>
              <SectionLabel>Live activity</SectionLabel>
              {activity.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={14} style={{ color: 'var(--text-3)' }} />
                  No system events yet. Sync a campaign to see activity.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {activity.map((event, idx) => (
                    <div key={event.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                      {/* Vertical line */}
                      {idx < activity.length - 1 && (
                        <div style={{ position: 'absolute', left: 8, top: 20, bottom: 0, width: 1, background: 'var(--border-soft)' }} />
                      )}
                      {/* Dot */}
                      <div style={{ width: 17, height: 17, borderRadius: '50%', background: event.color, opacity: 0.85, flexShrink: 0, marginTop: 2, zIndex: 1, boxShadow: `0 0 0 3px var(--surface)` }} />
                      {/* Content */}
                      <div style={{ paddingBottom: idx < activity.length - 1 ? 14 : 0, flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.label}
                        </div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                          {relTime(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>{/* /RIGHT column */}
        </div>{/* /Bento grid */}
      </div>

      {/* ── Learn More Modal (preserved) ────────────────────── */}
      {learnMoreRec && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setLearnMoreRec(null)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 500, width: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>AI Recommendation</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: 'var(--text)', margin: '0 0 12px' }}>{learnMoreRec.title}</h3>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 16px' }}>{learnMoreRec.description}</p>
            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Recommended Action</div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{learnMoreRec.action}</p>
            </div>
            <button onClick={() => setLearnMoreRec(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 18px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default Dashboard;
