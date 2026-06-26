/**
 * Dashboard.tsx — Bento Home (§38)
 * Layout: Welcome strip (full) + 2-col grid (1.6fr / 1fr)
 * Data: 100% from Supabase / computed from real campaigns (§41-45)
 * NO fake numbers. Missing sources → empty state or "Coming soon" (§43).
 *
 * Feature chart (30-day): requires campaign_daily_stats table + meta-sync update.
 * Top creative: requires ad_creatives table + meta-sync update.
 * Live activity: requires system_events table + meta-sync update.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Chart from 'chart.js/auto';
import {
  RefreshCw, Sparkles, Zap, Activity,
  CheckCircle2, AlertTriangle, ChevronRight,
  Layers, Image as ImageIcon, TrendingUp,
} from 'lucide-react';

import {
  getCampaigns, getRecommendations, getAdAccounts,
  getIntelligenceSessions, updateRecommendationStatus,
  getDailyStats, getTopCreatives, getSystemEvents,
} from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useBrand } from '../contexts/BrandContext';
import {
  getBenchmarkMetricsByType,
  formatCurrency, formatNumber,
} from '../lib/benchmarks';
import type { Campaign, Recommendation, BusinessType, AdAccount, BenchmarkMetric } from '../types';

// ─── Helpers ───────────────────────────────────────────────────

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const displayName = (email?: string) => {
  if (!email) return '';
  const local = email.split('@')[0];
  return local.replace(/[._-]/g, ' ').split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const isToday = (iso: string) => {
  const d = new Date(iso); const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

// ─── Account Health Score ──────────────────────────────────────
interface HealthComponent { name: string; score: number; label: string; color: string; }

const computeHealth = (campaigns: Campaign[], benchmarks: BenchmarkMetric[]): { score: number; grade: string; components: HealthComponent[] } => {
  if (!campaigns.length) return { score: 0, grade: 'No data', components: [] };
  const totalLeads      = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalSpend      = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalClicks     = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cplBench = benchmarks.find(b => b.label.toLowerCase().includes('cpl'));
  const ctrBench = benchmarks.find(b => b.label.toLowerCase().includes('ctr'));
  const components: HealthComponent[] = [];
  let totalScore = 0; let totalWeight = 0;
  if (avgCPL > 0 && cplBench?.benchmark_value) {
    const ratio = avgCPL / cplBench.benchmark_value;
    const s = ratio < 0.8 ? 95 : ratio < 1.0 ? 78 : ratio < 1.3 ? 52 : 22;
    components.push({ name: 'Cost efficiency', score: s, label: ratio < 0.8 ? 'Excellent' : ratio < 1.0 ? 'Good' : ratio < 1.3 ? 'Watch' : 'Poor', color: s >= 70 ? 'var(--green)' : s >= 45 ? 'var(--champagne)' : 'var(--red)' });
    totalScore += s * 40; totalWeight += 40;
  }
  if (totalLeads > 0) {
    const s = totalLeads > 200 ? 92 : totalLeads > 100 ? 80 : totalLeads > 30 ? 62 : 40;
    components.push({ name: 'Lead volume', score: s, label: s >= 80 ? 'Strong' : s >= 60 ? 'Good' : 'Building', color: s >= 70 ? 'var(--green)' : s >= 50 ? 'var(--champagne)' : 'var(--red)' });
    totalScore += s * 30; totalWeight += 30;
  }
  if (avgCTR > 0 && ctrBench?.benchmark_value) {
    const ratio = avgCTR / ctrBench.benchmark_value;
    const s = ratio > 1.2 ? 90 : ratio > 1.0 ? 75 : ratio > 0.7 ? 52 : 28;
    components.push({ name: 'Ad engagement', score: s, label: ratio > 1.2 ? 'Above avg' : ratio > 1.0 ? 'On target' : ratio > 0.7 ? 'Below avg' : 'Needs work', color: s >= 70 ? 'var(--green)' : s >= 45 ? 'var(--champagne)' : 'var(--red)' });
    totalScore += s * 20; totalWeight += 20;
  }
  const withBudget = campaigns.filter(c => (c.budget_daily ?? 0) > 0);
  if (campaigns.length > 0) {
    const pct = withBudget.length / campaigns.length;
    const s = pct === 1 ? 85 : pct > 0.5 ? 65 : 40;
    components.push({ name: 'Budget pacing', score: s, label: pct === 1 ? 'All set' : pct > 0.5 ? 'Partial' : 'Not set', color: s >= 70 ? 'var(--green)' : s >= 50 ? 'var(--champagne)' : 'var(--red)' });
    totalScore += s * 10; totalWeight += 10;
  }
  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  return { score, grade: score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Watch' : 'Needs work', components };
};

// ─── Card wrapper ───────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow)', padding: '18px 20px', ...style }}>
    {children}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, ...style }}>
    {children}
  </div>
);

// ─── 30-Day Trend Chart ─────────────────────────────────────────
interface DailyStat { date: string; spend: number; leads: number; }

const TrendChart: React.FC<{ data: DailyStat[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    // Destroy existing chart
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const root   = document.documentElement;
    const get    = (v: string) => getComputedStyle(root).getPropertyValue(v).trim();
    const accent = get('--accent');
    const green  = get('--green');
    const text3  = get('--text-3');
    const grid   = get('--grid') || 'rgba(255,255,255,0.05)';
    const surface = get('--surface');
    const border  = get('--border');

    const ctx = canvasRef.current.getContext('2d')!;
    const g1 = ctx.createLinearGradient(0, 0, 0, 220);
    g1.addColorStop(0, accent + '44'); g1.addColorStop(1, accent + '04');
    const g2 = ctx.createLinearGradient(0, 0, 0, 220);
    g2.addColorStop(0, green + '33'); g2.addColorStop(1, green + '03');

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => {
          const dt = new Date(d.date);
          return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        }),
        datasets: [
          {
            label: 'Spend',
            data: data.map(d => d.spend),
            borderColor: accent, backgroundColor: g1,
            fill: true, tension: 0.4, borderWidth: 2,
            pointRadius: 0, pointHoverRadius: 4,
            pointHoverBackgroundColor: accent,
            yAxisID: 'y',
          },
          {
            label: 'Leads',
            data: data.map(d => d.leads),
            borderColor: green, backgroundColor: g2,
            fill: true, tension: 0.4, borderWidth: 2,
            pointRadius: 0, pointHoverRadius: 4,
            pointHoverBackgroundColor: green,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: surface,
            borderColor: border,
            borderWidth: 1,
            titleColor: get('--text'),
            bodyColor: get('--text-2'),
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: ctx => ctx.datasetIndex === 0
                ? ` Spend: €${ctx.raw?.toLocaleString()}`
                : ` Leads: ${ctx.raw}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: text3, maxTicksLimit: 7, font: { family: 'JetBrains Mono', size: 10 } },
          },
          y: {
            position: 'left',
            grid: { color: grid },
            ticks: { color: text3, font: { family: 'JetBrains Mono', size: 10 }, callback: v => '€' + v },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            ticks: { color: text3, font: { family: 'JetBrains Mono', size: 10 } },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

// ─── Main Dashboard ────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();
  const [learnMoreRec, setLearnMoreRec] = useState<Recommendation | null>(null);

  // ── Core queries ──────────────────────────────────────
  // activeBrand comes from global BrandContext (brand switcher in sidebar)
  const { activeBrand, loading: brandsLoading } = useBrand();

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

  // ── NEW: Daily stats, top creatives, system events ───────────
  const { data: dailyStats = [] } = useQuery({
    queryKey: ['dailyStats', activeBrand?.id],
    queryFn:  () => getDailyStats(activeBrand!.id, 30),
    enabled:  !!activeBrand,
  });

  const { data: topCreatives = [] } = useQuery({
    queryKey: ['topCreatives', activeBrand?.id],
    queryFn:  () => getTopCreatives(activeBrand!.id, 3),
    enabled:  !!activeBrand,
  });

  const { data: systemEvents = [] } = useQuery({
    queryKey: ['systemEvents', activeBrand?.id],
    queryFn:  () => getSystemEvents(activeBrand!.id, 10),
    enabled:  !!activeBrand,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const updateRecMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'dismissed' }) =>
      updateRecommendationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
  });

  // ── Derived data ─────────────────────────────────────────────
  const businessType  = (activeBrand?.business_type as BusinessType) ?? 'ecommerce';
  const aov           = activeBrand ? ((activeBrand.aov_min ?? 0) + (activeBrand.aov_max ?? 0)) / 2 : 0;
  const benchmarks    = useMemo(() => activeBrand ? getBenchmarkMetricsByType(businessType, aov, campaigns) : [], [activeBrand, campaigns, businessType, aov]);

  const totalSpend       = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalLeads       = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const totalClicks      = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const avgCPL           = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCTR           = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Today pulse — real timestamps
  const syncedToday   = campaigns.filter(c => isToday(c.synced_at)).length;
  const sessionsToday = sessions.filter((s: { created_at: string }) => isToday(s.created_at)).length;
  const syncsToday    = systemEvents.filter((e: { type: string; created_at: string }) => e.type === 'sync' && isToday(e.created_at)).length;

  // Account health
  const health = useMemo(() => computeHealth(campaigns, benchmarks), [campaigns, benchmarks]);

  // Pending recs (top 3)
  const pendingRecs = recommendations.filter(r => r.status === 'pending').slice(0, 3);

  // Per-account stats
  const accountStats = useMemo(() => adAccounts.map(acc => ({
    account: acc,
    campaigns: campaigns.filter(c => c.ad_account_id === acc.id).length,
    active:    campaigns.filter(c => c.ad_account_id === acc.id && c.status === 'ACTIVE').length,
    spend:     campaigns.filter(c => c.ad_account_id === acc.id).reduce((s, c) => s + (c.spend ?? 0), 0),
    leads:     campaigns.filter(c => c.ad_account_id === acc.id).reduce((s, c) => s + (c.leads ?? 0), 0),
  })), [adAccounts, campaigns]);

  // Live activity: prefer system_events, fallback to timestamp-based
  const activityFeed = useMemo(() => {
    if (systemEvents.length > 0) {
      return systemEvents.slice(0, 7).map((e: { id: string; type: string; label: string; created_at: string }) => ({
        id: e.id, label: e.label, timestamp: e.created_at,
        color: e.type === 'sync' ? 'var(--blue)' : e.type === 'recommendation' ? 'var(--green)' : e.type === 'ai_session' ? 'var(--accent)' : 'var(--champagne)',
      }));
    }
    // Fallback: build from existing timestamps (semi-real)
    const events: { id: string; label: string; timestamp: string; color: string }[] = [];
    const seenDates = new Set<string>();
    campaigns.forEach(c => {
      const key = c.synced_at.split('T')[0];
      if (!seenDates.has(key)) {
        seenDates.add(key);
        const count = campaigns.filter(x => x.synced_at.startsWith(key)).length;
        events.push({ id: `sync-${key}`, label: `${count} campaigns synced with Meta`, timestamp: c.synced_at, color: 'var(--blue)' });
      }
    });
    sessions.slice(0, 3).forEach((s: { id: string; title: string; created_at: string }) => {
      events.push({ id: `ai-${s.id}`, label: s.title && s.title !== 'New Session' ? `AI: ${s.title}` : 'Intelligence session started', timestamp: s.created_at, color: 'var(--accent)' });
    });
    recommendations.slice(0, 3).forEach(r => {
      events.push({ id: `rec-${r.id}`, label: r.title, timestamp: r.created_at, color: 'var(--green)' });
    });
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 7);
  }, [systemEvents, campaigns, sessions, recommendations]);

  // ── Loading state ─────────────────────────────────────────────
  if (brandsLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 44px)' }}>
      <RefreshCw size={18} style={{ color: 'var(--text-3)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!activeBrand) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 44px)' }}>
      <div style={{ textAlign: 'center', padding: '60px 40px' }}>
        <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: 16 }} strokeWidth={1.5} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--text)', margin: '0 0 8px' }}>No Brand Connected Yet</h2>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-2)', margin: '0 0 24px' }}>Complete the onboarding to activate your Intelligence Dashboard</p>
        <a href="/onboarding" style={{ background: 'var(--accent)', color: '#2A1A12', padding: '10px 22px', borderRadius: 10, textDecoration: 'none', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500 }}>Set Up Your Brand</a>
      </div>
    </div>
  );

  const isLoading = campaignsLoading || recsLoading;

  return (
    <>
      <div style={{ height: 'calc(100vh - 44px)', overflowY: 'auto', background: 'var(--bg)', padding: '20px 24px 32px' }}>

        {/* ════════ WELCOME STRIP (full width) ════════ */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          {/* Greeting */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', margin: '0 0 4px', letterSpacing: -0.5 }}>
              {greeting()}{user?.email ? `, ${displayName(user.email)}` : ''}
            </h1>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Today pulse card */}
          <Card style={{ padding: '14px 20px', minWidth: 300, display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', opacity: 0.08, filter: 'blur(20px)' }} />
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>System activity today</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                {syncsToday > 0
                  ? <>{syncsToday} sync{syncsToday > 1 ? 's' : ''} completed{sessionsToday > 0 ? ` · ${sessionsToday} AI session${sessionsToday > 1 ? 's' : ''}` : ''}</>
                  : syncedToday > 0
                    ? <>{syncedToday} campaign{syncedToday > 1 ? 's' : ''} synced{sessionsToday > 0 ? ` · ${sessionsToday} AI session${sessionsToday > 1 ? 's' : ''}` : ''}</>
                    : sessionsToday > 0
                      ? <>{sessionsToday} AI session{sessionsToday > 1 ? 's' : ''}</>
                      : <span style={{ color: 'var(--text-3)' }}>No activity yet today</span>
                }
              </div>
            </div>
          </Card>
        </div>

        {/* ════════ BENTO GRID — 1.6fr / 1fr ════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* ══ LEFT COLUMN ══════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── 1. Your Accounts ── */}
            <Card>
              <SectionLabel>Your accounts</SectionLabel>
              {adAccounts.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>
                  No Meta accounts connected.{' '}
                  <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Connect now →</a>
                </div>
              ) : accountStats.map(({ account, campaigns: numC, active, spend, leads }) => {
                const initials = (account.display_name || account.account_name).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={account.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--surface-2)', borderRadius: 12, marginBottom: 8, border: '1px solid var(--border-soft)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: '#2A1A12' }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {account.display_name || account.account_name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        {numC} campaign{numC !== 1 ? 's' : ''} · {active} active
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

            {/* ── 2. Performance · 30 days ── */}
            <Card style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <SectionLabel style={{ marginBottom: 4 }}>Performance · last 30 days</SectionLabel>
                  {/* Summary KPIs above the chart */}
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--accent)' }}>{formatCurrency(totalSpend)}</span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>spend</span>
                    </div>
                    {totalLeads > 0 && (
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--green)' }}>{formatNumber(totalLeads)}</span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>leads</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
                  {[{ label: 'Spend', color: 'var(--accent)' }, { label: 'Leads', color: 'var(--green)' }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-2)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div style={{ height: 220, background: 'var(--surface-2)', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : dailyStats.length === 0 ? (
                /* Empty state: table exists but no data yet — prompt sync */
                <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--surface-2)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                  <TrendingUp size={28} style={{ color: 'var(--text-3)' }} strokeWidth={1} />
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>Daily data not yet synced</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', textAlign: 'center', maxWidth: 260 }}>
                    Run a Meta sync to populate the 30-day chart. The updated sync fetches daily breakdown automatically.
                  </div>
                </div>
              ) : (
                /* Real Chart.js chart */
                <div style={{ height: 220 }}>
                  <TrendChart data={dailyStats} />
                </div>
              )}

              {/* Totals row below chart */}
              {!isLoading && campaigns.length > 0 && (
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Total Spend', value: formatCurrency(totalSpend), color: 'var(--accent)' },
                    { label: 'Total Leads', value: totalLeads > 0 ? formatNumber(totalLeads) : '—', color: 'var(--green)', hide: totalLeads === 0 },
                    { label: 'Avg CPL', value: avgCPL > 0 ? formatCurrency(avgCPL) : '—', color: 'var(--text)' },
                    { label: 'Avg CTR', value: avgCTR > 0 ? `${avgCTR.toFixed(2)}%` : '—', color: 'var(--blue)' },
                  ].filter(m => !m.hide).map(m => (
                    <div key={m.label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border-soft)' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── 3. Recent Intelligence ── */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionLabel style={{ marginBottom: 0 }}>Recent intelligence</SectionLabel>
                <button onClick={() => navigate('/intelligence')} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  All sessions <ChevronRight size={11} />
                </button>
              </div>
              {isLoading ? (
                <div style={{ height: 80, background: 'var(--surface-2)', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Ask your first question</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>Your AI Intelligence sessions will appear here.</div>
                  <button onClick={() => navigate('/intelligence')} style={{ background: 'var(--accent)', color: '#2A1A12', border: 'none', borderRadius: 9, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                    Open Intelligence →
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(sessions as { id: string; title: string; created_at: string; messages: { role: string; content: string }[] }[]).slice(0, 4).map(s => {
                    const userMsg = Array.isArray(s.messages) ? s.messages.find(m => m.role === 'user') : null;
                    return (
                      <button key={s.id} onClick={() => navigate('/intelligence')}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 11, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '11px 13px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-soft)')}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.title && s.title !== 'New Session' ? s.title : userMsg ? userMsg.content.slice(0, 55) + '…' : 'Intelligence session'}
                          </div>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                            {Array.isArray(s.messages) ? s.messages.length : 0} messages · {relTime(s.created_at)}
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

            {/* ── 4. Account Health ── */}
            <Card>
              <SectionLabel>Account health</SectionLabel>
              {campaigns.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>Sync campaigns to compute health score.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
                    <div style={{ width: 76, height: 76, borderRadius: '50%', flexShrink: 0, background: `conic-gradient(var(--accent) 0% ${health.score}%, var(--border) ${health.score}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px var(--surface)', position: 'relative' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>{health.score}</span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-3)' }}>/100</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{health.grade}</div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)' }}>Based on {campaigns.length} campaigns vs 9yr benchmark</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {health.components.map(comp => (
                      <div key={comp.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', background: 'var(--surface-2)', borderRadius: 9, border: '1px solid var(--border-soft)' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)' }}>{comp.name}</span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500, color: comp.color }}>{comp.label}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', background: 'var(--surface-2)', borderRadius: 9, border: '1px solid var(--border-soft)', opacity: 0.55 }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)' }}>Creative freshness</span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', background: 'var(--surface)', padding: '2px 7px', borderRadius: 20 }}>Needs ad sync</span>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* ── 5. Needs Your Attention ── */}
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
              ) : pendingRecs.map(rec => {
                const isHigh = rec.priority === 'critical';
                return (
                  <div key={rec.id} style={{ background: isHigh ? 'var(--red-soft, rgba(220,50,50,0.06))' : 'var(--surface-2)', border: `1px solid ${isHigh ? 'var(--red, #e05252)' : 'var(--border-soft)'}`, borderRadius: 11, padding: '11px 13px', marginBottom: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <AlertTriangle size={13} style={{ color: isHigh ? 'var(--red, #e05252)' : 'var(--champagne)', flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{rec.title}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4, marginBottom: 8 }}>
                          {rec.description.slice(0, 90)}{rec.description.length > 90 ? '…' : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => updateRecMutation.mutate({ id: rec.id, status: 'approved' })}
                            style={{ padding: '4px 11px', background: 'var(--accent)', color: '#2A1A12', border: 'none', borderRadius: 7, fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                            Apply
                          </button>
                          <button onClick={() => setLearnMoreRec(rec)}
                            style={{ padding: '4px 11px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-2)', cursor: 'pointer' }}>
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* ── 6. Top Creative ── */}
            <Card>
              <SectionLabel>Top creative · {new Date().toLocaleString('en', { month: 'long' })}</SectionLabel>
              {topCreatives.length === 0 ? (
                /* Empty state with context (§43) — table exists, just needs data */
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-soft), var(--surface-2))', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={20} style={{ color: 'var(--text-3)' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>No ad data yet</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                      Run a Meta sync to fetch ad-level insights. Top creatives will be ranked by leads.
                    </div>
                  </div>
                </div>
              ) : topCreatives.slice(0, 1).map((ad: { id: string; ad_name: string; campaign_id: string; spend: number; leads: number; ctr: number; cpl: number; impressions: number; thumbnail_url?: string }) => {
                const campName = campaigns.find(c => c.id === ad.campaign_id)?.name ?? '';
                return (
                  <div key={ad.id}>
                    {/* Winner badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 20, padding: '2px 10px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 500, color: 'var(--accent)' }}>
                        ✦ Winning
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)' }}>top by leads</div>
                    </div>

                    {/* Thumbnail + name */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                        {ad.thumbnail_url
                          ? <img src={ad.thumbnail_url} alt={ad.ad_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--accent-soft), var(--surface-2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={18} style={{ color: 'var(--text-3)' }} /></div>
                        }
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ad.ad_name || 'Unnamed ad'}
                        </div>
                        {campName && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)' }}>{campName}</div>}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[
                        { label: 'CTR', value: ad.ctr > 0 ? `${ad.ctr.toFixed(2)}%` : '—', color: 'var(--blue)' },
                        { label: 'Leads', value: ad.leads > 0 ? String(ad.leads) : '—', color: 'var(--green)' },
                        { label: 'CPL', value: ad.cpl > 0 ? formatCurrency(ad.cpl) : '—', color: 'var(--accent)' },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'var(--surface-2)', borderRadius: 9, padding: '9px 10px', border: '1px solid var(--border-soft)' }}>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{m.label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500, color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Outperforming because */}
                    {topCreatives.length > 1 && (
                      <div style={{ marginTop: 12, padding: '8px 11px', background: 'var(--green-soft, rgba(107,191,138,0.1))', borderRadius: 9, border: '1px solid var(--green)', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--green)' }}>
                        ✓ Outperforming by {Math.round(((ad.leads - (topCreatives[1] as { leads: number }).leads) / Math.max((topCreatives[1] as { leads: number }).leads, 1)) * 100)}% more leads than #2
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>

            {/* ── 7. Live Activity ── */}
            <Card>
              <SectionLabel>Live activity</SectionLabel>
              {activityFeed.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={14} style={{ color: 'var(--text-3)' }} />
                  No events yet. Sync a campaign to see activity.
                </div>
              ) : activityFeed.map((event, idx) => (
                <div key={event.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  {idx < activityFeed.length - 1 && (
                    <div style={{ position: 'absolute', left: 8, top: 20, bottom: 0, width: 1, background: 'var(--border-soft)' }} />
                  )}
                  <div style={{ width: 17, height: 17, borderRadius: '50%', background: event.color, opacity: 0.85, flexShrink: 0, marginTop: 2, zIndex: 1, boxShadow: '0 0 0 3px var(--surface)' }} />
                  <div style={{ paddingBottom: idx < activityFeed.length - 1 ? 14 : 0, flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                      {relTime(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </Card>

          </div>{/* /RIGHT column */}
        </div>{/* /Bento grid */}
      </div>

      {/* ── Learn More Modal ── */}
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
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default Dashboard;
