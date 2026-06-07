import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TrendingUp, AlertTriangle, Sparkles, BarChart3, Users, DollarSign } from 'lucide-react';
import {
  getBrands, getCampaigns, getRecommendations, updateRecommendationStatus,
} from '../lib/supabase';
import { getBenchmarkMetrics, getAovBracket, formatCurrency, formatNumber } from '../lib/benchmarks';
import { useAuth } from '../hooks/useAuth';
import BenchmarkMetricCard from '../components/ui/BenchmarkMetricCard';
import RecommendationCard from '../components/recommendations/RecommendationCard';
import IntelligenceChat from '../components/intelligence/IntelligenceChat';
import type { Recommendation } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const mockRoasTrend = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${14 - i}`,
  roas: parseFloat((Math.random() * 2 + 1.5).toFixed(2)),
  benchmark: 2.8,
}));

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [learnMoreRec, setLearnMoreRec] = useState<Recommendation | null>(null);

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => getBrands(user!.id),
    enabled: !!user,
  });

  const activeBrand = brands?.[0];

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', activeBrand?.id],
    queryFn: () => getCampaigns(activeBrand!.id),
    enabled: !!activeBrand,
  });

  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ['recommendations', activeBrand?.id],
    queryFn: () => getRecommendations(activeBrand!.id),
    enabled: !!activeBrand,
  });

  const updateRecMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'dismissed' }) =>
      updateRecommendationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
  });

  const benchmarkMetrics = activeBrand
    ? getBenchmarkMetrics((activeBrand.aov_min + activeBrand.aov_max) / 2, campaigns)
    : [];

  const bracket = activeBrand
    ? getAovBracket((activeBrand.aov_min + activeBrand.aov_max) / 2)
    : null;

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const criticalRecs = recommendations.filter((r) => r.priority === 'critical');
  const highRecs = recommendations.filter((r) => r.priority === 'high');
  const mediumRecs = recommendations.filter((r) => r.priority === 'medium');

  if (brandsLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </div>
    );
  }

  if (!activeBrand) {
    return (
      <div className="page-container">
        <div className="dash-empty">
          <Sparkles size={32} strokeWidth={1.5} style={{ color: 'var(--rose-gold)' }} />
          <h2 className="dash-empty-title">No Brand Connected Yet</h2>
          <p className="dash-empty-sub">Complete the onboarding to activate your Intelligence Dashboard</p>
          <a href="/onboarding" className="btn btn-primary btn-lg">Set Up Your Brand</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="dash-top-bar">
        <div>
          <div className="section-eyebrow">
            <div className="live-dot" />
            Live Intelligence
          </div>
          <h1 className="section-title">
            {activeBrand.name} <em>Dashboard</em>
          </h1>
          <p className="page-subtitle">
            AOV {activeBrand.currency}{activeBrand.aov_min}–{activeBrand.aov_max} ·{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--rose-gold)' }}>{bracket?.label}</span> bracket ·{' '}
            {bracket?.recommended_funnel}
          </p>
        </div>

        {/* KPI strip */}
        <div className="dash-kpi-strip">
          {[
            { icon: <DollarSign size={11} strokeWidth={1.5} />, label: 'Spend',     value: formatCurrency(totalSpend),                    highlight: false },
            { icon: <TrendingUp size={11} strokeWidth={1.5} />, label: 'Revenue',   value: formatCurrency(totalRevenue),                   highlight: false },
            { icon: <Users size={11} strokeWidth={1.5} />,      label: 'Purchases', value: formatNumber(totalPurchases),                   highlight: false },
            { icon: <BarChart3 size={11} strokeWidth={1.5} />,  label: 'ROAS',      value: `${overallRoas.toFixed(2)}x`,                  highlight: true  },
          ].map(({ icon, label, value, highlight }) => (
            <div key={label} className={`dash-kpi-chip ${highlight ? 'highlight' : ''}`}>
              <div className="dash-kpi-label">{icon}{label}</div>
              <div
                className="dash-kpi-value"
                style={highlight ? { color: '#C4836A', fontWeight: 500 } : {}}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3-Column Intelligence Grid */}
      <div className="dash-grid">

        {/* ── Column 1: Benchmark Intelligence ── */}
        <div className="dash-col">
          <div className="dash-col-heading">
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <BarChart3 size={11} strokeWidth={1.5} />
              Benchmark Intelligence
            </div>
          </div>

          <div className="bench-source-tag">
            847 Beauty brands · {bracket?.label} · 2015–2024
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {benchmarkMetrics.length === 0 || campaignsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <BenchmarkMetricCard key={i} label="" yourValue={0} benchmarkValue={0} unit="" higherIsBetter loading />
                ))
              : benchmarkMetrics.map((m) => (
                  <BenchmarkMetricCard
                    key={m.label}
                    label={m.label}
                    yourValue={m.your_value}
                    benchmarkValue={m.benchmark_value}
                    unit={m.unit}
                    higherIsBetter={m.higher_is_better}
                  />
                ))}
          </div>

          {/* ROAS Trend */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="section-eyebrow" style={{ marginBottom: 12, fontSize: 9 }}>
              <TrendingUp size={10} strokeWidth={1.5} />
              ROAS Trend — 14 Days
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={mockRoasTrend}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C4836A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C4836A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--text-hint)', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-hint)', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-light)', borderRadius: 4, fontSize: 11, fontFamily: 'DM Mono' }}
                />
                <Area type="monotone" dataKey="roas" stroke="#C4836A" fill="url(#rg)" strokeWidth={1.5} name="Your ROAS" />
                <Area type="monotone" dataKey="benchmark" stroke="var(--text-hint)" fill="none" strokeDasharray="3 3" strokeWidth={1} name="Benchmark" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Column 2: AI Recommendations ── */}
        <div className="dash-col">
          <div className="dash-col-heading">
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <AlertTriangle size={11} strokeWidth={1.5} />
              AI Recommendations
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {criticalRecs.length > 0 && <span className="badge badge-critical">{criticalRecs.length}</span>}
              {highRecs.length > 0 && <span className="badge badge-high">{highRecs.length}</span>}
              {mediumRecs.length > 0 && <span className="badge badge-medium">{mediumRecs.length}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 130, borderRadius: 6 }} />
                ))
              : recommendations.length === 0
              ? (
                <div className="dash-no-recs">
                  <Sparkles size={24} strokeWidth={1.5} style={{ color: 'var(--rose-gold)' }} />
                  <p>No pending recommendations</p>
                  <span>Connect your Meta account and sync campaigns to generate AI insights</span>
                </div>
              )
              : [...criticalRecs, ...highRecs, ...mediumRecs].map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    onApprove={(id) => updateRecMutation.mutate({ id, status: 'approved' })}
                    onDismiss={(id) => updateRecMutation.mutate({ id, status: 'dismissed' })}
                    onLearnMore={setLearnMoreRec}
                  />
                ))}
          </div>
        </div>

        {/* ── Column 3: Intelligence Chat ── */}
        <div className="dash-col">
          <div className="dash-col-heading">
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <Sparkles size={11} strokeWidth={1.5} />
              Intelligence Chat
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Context-aware
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <IntelligenceChat brand={activeBrand} campaigns={campaigns} compact />
          </div>
        </div>
      </div>

      {/* Learn More Modal */}
      {learnMoreRec && (
        <div className="modal-overlay" onClick={() => setLearnMoreRec(null)}>
          <div className="modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="section-eyebrow" style={{ marginBottom: 6 }}>AI Recommendation</div>
            <h3 className="modal-title">{learnMoreRec.title}</h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {learnMoreRec.description}
            </p>
            <div className="divider" />
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Benchmark Reference</div>
              <span className="rec-benchmark-ref">{learnMoreRec.benchmark_reference}</span>
            </div>
            <div className="divider" />
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Recommended Action</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {learnMoreRec.action}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setLearnMoreRec(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dash-top-bar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dash-kpi-strip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dash-kpi-chip {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 88px;
          transition: border-color var(--transition);
        }

        .dash-kpi-chip:hover { border-color: var(--rose-gold-pale); }

        .dash-kpi-chip.highlight {
          border-color: var(--border-rose);
          background: var(--rose-gold-light);
        }

        .dash-kpi-label {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dash-kpi-value {
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .dash-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          align-items: start;
        }

        .dash-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }

        .dash-col-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bench-source-tag {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 400;
          color: var(--text-hint);
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-light);
          border-radius: 2px;
          padding: 4px 8px;
          letter-spacing: 0.04em;
        }

        .dash-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 40px;
          gap: 14px;
        }

        .dash-empty-title {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 400;
          color: var(--text-primary);
        }

        .dash-empty-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: var(--text-secondary);
        }

        .dash-no-recs {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          gap: 8px;
          background: var(--bg-card);
          border: 0.5px dashed var(--border-light);
          border-radius: var(--radius-lg);
        }

        .dash-no-recs p {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: var(--text-secondary);
        }

        .dash-no-recs span {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-muted);
          max-width: 240px;
          line-height: 1.5;
        }

        @media (max-width: 1100px) {
          .dash-grid { grid-template-columns: 1fr 1fr; }
          .dash-col:last-child { grid-column: 1 / -1; }
        }

        @media (max-width: 768px) {
          .dash-grid { grid-template-columns: 1fr; }
          .dash-top-bar { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
