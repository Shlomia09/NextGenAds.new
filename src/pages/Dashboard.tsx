import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Users,
  DollarSign,
} from 'lucide-react';
import {
  getBrands,
  getCampaigns,
  getRecommendations,
  updateRecommendationStatus,
} from '../lib/supabase';
import { getBenchmarkMetrics, getAovBracket, formatCurrency, formatNumber } from '../lib/benchmarks';
import { useAuth } from '../hooks/useAuth';
import BenchmarkMetricCard from '../components/ui/BenchmarkMetricCard';
import RecommendationCard from '../components/recommendations/RecommendationCard';
import IntelligenceChat from '../components/intelligence/IntelligenceChat';
import type { Recommendation } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Mock ROAS trend data (replaced with real data when synced)
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
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
          <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    );
  }

  if (!activeBrand) {
    return (
      <div className="page-container">
        <div className="dash-empty-state">
          <Sparkles size={40} />
          <h2>No Brand Connected Yet</h2>
          <p>Complete the onboarding to activate your Intelligence Dashboard</p>
          <a href="/onboarding" className="btn btn-primary btn-lg">
            Set Up Your Brand
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="dash-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="live-dot" />
            Intelligence Dashboard
          </div>
          <div className="page-subtitle">
            {activeBrand.name} · AOV {activeBrand.currency}{activeBrand.aov_min}–{activeBrand.aov_max} ·{' '}
            <span style={{ color: 'var(--accent)' }}>{bracket?.label} bracket</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div className="dash-kpi">
            <span className="dash-kpi-label"><DollarSign size={11} />Spend</span>
            <span className="dash-kpi-value">{formatCurrency(totalSpend)}</span>
          </div>
          <div className="dash-kpi">
            <span className="dash-kpi-label"><TrendingUp size={11} />Revenue</span>
            <span className="dash-kpi-value">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="dash-kpi">
            <span className="dash-kpi-label"><Users size={11} />Purchases</span>
            <span className="dash-kpi-value">{formatNumber(totalPurchases)}</span>
          </div>
          <div className="dash-kpi dash-kpi-roas">
            <span className="dash-kpi-label"><BarChart3 size={11} />Overall ROAS</span>
            <span className="dash-kpi-value"
              style={{ color: overallRoas >= bracket!.benchmark_roas ? 'var(--success)' : overallRoas >= 1.5 ? 'var(--warning)' : 'var(--danger)' }}>
              {overallRoas.toFixed(2)}x
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="dash-grid">

        {/* ===== Column 1: Benchmark Intelligence ===== */}
        <div className="dash-col">
          <div className="dash-col-header">
            <div className="dash-col-title">
              <BarChart3 size={14} />
              Benchmark Intelligence
            </div>
            <span className="dash-col-subtitle">vs {bracket?.label} bracket</span>
          </div>

          <div className="bench-source-tag">
            Based on 847 Beauty brands · AOV {bracket?.label} · 2015–2024
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {benchmarkMetrics.length === 0 || campaignsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <BenchmarkMetricCard
                  key={i}
                  label="" yourValue={0} benchmarkValue={0}
                  unit="" higherIsBetter loading
                />
              ))
            ) : (
              benchmarkMetrics.map((m) => (
                <BenchmarkMetricCard
                  key={m.label}
                  label={m.label}
                  yourValue={m.your_value}
                  benchmarkValue={m.benchmark_value}
                  unit={m.unit}
                  higherIsBetter={m.higher_is_better}
                />
              ))
            )}
          </div>

          {/* ROAS Trend Chart */}
          <div className="card" style={{ marginTop: 4 }}>
            <div className="dash-col-title" style={{ marginBottom: 12 }}>
              <TrendingUp size={14} />
              ROAS Trend (14d)
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={mockRoasTrend}>
                <defs>
                  <linearGradient id="roasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <Area type="monotone" dataKey="roas" stroke="var(--accent)" fill="url(#roasGrad)" strokeWidth={2} name="Your ROAS" />
                <Area type="monotone" dataKey="benchmark" stroke="var(--text-muted)" fill="none" strokeDasharray="4 4" strokeWidth={1} name="Benchmark" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ===== Column 2: AI Recommendations ===== */}
        <div className="dash-col">
          <div className="dash-col-header">
            <div className="dash-col-title">
              <AlertTriangle size={14} />
              AI Recommendations
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {criticalRecs.length > 0 && <span className="badge badge-critical">{criticalRecs.length}</span>}
              {highRecs.length > 0 && <span className="badge badge-high">{highRecs.length}</span>}
              {mediumRecs.length > 0 && <span className="badge badge-medium">{mediumRecs.length}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {recsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 140, borderRadius: 10 }} />
              ))
            ) : recommendations.length === 0 ? (
              <div className="dash-no-recs">
                <Sparkles size={28} />
                <p>No pending recommendations</p>
                <span>Connect your Meta account and sync campaigns to generate AI insights</span>
              </div>
            ) : (
              [...criticalRecs, ...highRecs, ...mediumRecs].map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onApprove={(id) => updateRecMutation.mutate({ id, status: 'approved' })}
                  onDismiss={(id) => updateRecMutation.mutate({ id, status: 'dismissed' })}
                  onLearnMore={setLearnMoreRec}
                />
              ))
            )}
          </div>
        </div>

        {/* ===== Column 3: Intelligence Chat ===== */}
        <div className="dash-col">
          <div className="dash-col-header">
            <div className="dash-col-title">
              <Sparkles size={14} />
              Intelligence Chat
            </div>
            <span className="dash-col-subtitle">Context-aware</span>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <IntelligenceChat
              brand={activeBrand}
              campaigns={campaigns}
              compact
            />
          </div>
        </div>
      </div>

      {/* Learn More Modal */}
      {learnMoreRec && (
        <div className="modal-overlay" onClick={() => setLearnMoreRec(null)}>
          <div className="modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{learnMoreRec.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{learnMoreRec.description}</p>
            <div className="divider" />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Benchmark Reference:</strong><br />
              {learnMoreRec.benchmark_reference}
            </div>
            <div className="divider" />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Recommended Action:</strong><br />
              {learnMoreRec.action}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setLearnMoreRec(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dash-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dash-kpi {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 90px;
        }

        .dash-kpi-roas {
          border-color: rgba(99,102,241,0.3);
          background: var(--accent-dim);
        }

        .dash-kpi-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dash-kpi-value {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
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
          gap: 12px;
          min-width: 0;
        }

        .dash-col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dash-col-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .dash-col-subtitle {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .bench-source-tag {
          font-size: 10px;
          color: var(--text-muted);
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          font-family: var(--font-mono);
        }

        .dash-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 40px;
          gap: 12px;
          color: var(--text-muted);
        }

        .dash-empty-state h2 {
          font-family: var(--font-display);
          font-size: 20px;
          color: var(--text-primary);
        }

        .dash-empty-state p {
          font-size: 13px;
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
          color: var(--text-muted);
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: var(--radius-lg);
          flex: 1;
        }

        .dash-no-recs p {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .dash-no-recs span {
          font-size: 12px;
          color: var(--text-muted);
          max-width: 240px;
          line-height: 1.5;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
          backdrop-filter: blur(4px);
        }

        .modal-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 28px;
          max-width: 520px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: var(--shadow-lg);
        }

        .modal-title {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        @media (max-width: 1100px) {
          .dash-grid {
            grid-template-columns: 1fr 1fr;
          }

          .dash-col:last-child {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 768px) {
          .dash-grid {
            grid-template-columns: 1fr;
          }

          .dash-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
