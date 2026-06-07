import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Sparkles,
  BarChart3,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import { getBenchmarkMetrics, getAovBracket, formatCurrency, formatNumber } from '../../lib/benchmarks';
import BenchmarkMetricCard from '../ui/BenchmarkMetricCard';
import BenchmarkAvailabilityBadge from '../ui/BenchmarkAvailabilityBadge';
import RecommendationCard from '../recommendations/RecommendationCard';
import IntelligenceChat from '../intelligence/IntelligenceChat';
import type { Brand, Campaign, Recommendation } from '../../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Local mock ROAS trend data ───────────────────────────────
const mockRoasTrend = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${14 - i}`,
  roas: parseFloat((Math.random() * 2 + 1.5).toFixed(2)),
  benchmark: 2.8,
}));

// ─── Props ────────────────────────────────────────────────────
interface EcommerceDashboardProps {
  brand: Brand;
  campaigns: Campaign[];
  recommendations: Recommendation[];
  onApproveRec: (id: string) => void;
  onDismissRec: (id: string) => void;
  onLearnMoreRec: (rec: Recommendation) => void;
}

// ─── Status badge helper ──────────────────────────────────────
const statusColors: Record<string, { bg: string; color: string }> = {
  ACTIVE:   { bg: 'rgba(16,185,129,0.08)',  color: '#065F46' },
  PAUSED:   { bg: 'rgba(245,158,11,0.08)',  color: '#92400E' },
  ARCHIVED: { bg: 'rgba(100,116,139,0.08)', color: '#475569' },
  DELETED:  { bg: 'rgba(239,68,68,0.08)',   color: '#991B1B' },
};

// ─── Component ────────────────────────────────────────────────
const EcommerceDashboard: React.FC<EcommerceDashboardProps> = ({
  brand,
  campaigns,
  recommendations,
  onApproveRec,
  onDismissRec,
  onLearnMoreRec,
}) => {
  const [learnMoreRec, setLearnMoreRec] = useState<Recommendation | null>(null);

  // ── Benchmark data ───────────────────────────────────────────
  const aov = (brand.aov_min + brand.aov_max) / 2;
  const bracket = getAovBracket(aov);
  const benchmarkMetrics = getBenchmarkMetrics(aov, campaigns);

  // ── KPI aggregates ───────────────────────────────────────────
  const totalSpend     = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue   = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);
  const overallRoas    = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // ── Sorted recommendations ───────────────────────────────────
  const criticalRecs = recommendations.filter((r) => r.priority === 'critical');
  const highRecs     = recommendations.filter((r) => r.priority === 'high');
  const mediumRecs   = recommendations.filter((r) => r.priority === 'medium');
  const sortedRecs   = [...criticalRecs, ...highRecs, ...mediumRecs];

  // ── Learn-more handler ───────────────────────────────────────
  const handleLearnMore = (rec: Recommendation) => {
    setLearnMoreRec(rec);
    onLearnMoreRec(rec);
  };

  const aovLabel = bracket?.label ?? 'AOV calibrated';
  const markets  = brand.markets ?? [];

  return (
    <div>
      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div className="ecom-kpi-strip">
        {[
          { icon: <DollarSign   size={11} strokeWidth={1.5} />, label: 'Spend',     value: formatCurrency(totalSpend),           highlight: false },
          { icon: <TrendingUp   size={11} strokeWidth={1.5} />, label: 'Revenue',   value: formatCurrency(totalRevenue),          highlight: false },
          { icon: <ShoppingBag  size={11} strokeWidth={1.5} />, label: 'Purchases', value: formatNumber(totalPurchases),          highlight: false },
          { icon: <BarChart3    size={11} strokeWidth={1.5} />, label: 'ROAS',      value: `${overallRoas.toFixed(2)}x`,          highlight: true  },
        ].map(({ icon, label, value, highlight }) => (
          <div key={label} className={`ecom-kpi-chip${highlight ? ' highlight' : ''}`}>
            <div className="ecom-kpi-label">{icon}{label}</div>
            <div
              className="ecom-kpi-value"
              style={highlight ? { color: '#C4836A' } : {}}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3-Column Intelligence Grid ────────────────────────── */}
      <div className="ecom-grid">

        {/* ── Column 1: Benchmark Intelligence ─────────────────── */}
        <div className="ecom-col">
          <div className="ecom-col-heading">
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <BarChart3 size={11} strokeWidth={1.5} />
              Benchmark Intelligence
            </div>
          </div>

          {/* Availability badge */}
          <BenchmarkAvailabilityBadge
            availability="full"
            aovLabel={aovLabel}
            markets={markets}
          />

          {/* Source tag */}
          <div className="bench-source-tag">
            847 Beauty brands · {bracket.label} · 2015–2024
          </div>

          {/* Metric cards: ROAS / CPM / CAC / CTR / CPC */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {benchmarkMetrics.length === 0
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

          {/* ROAS Trend chart */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="section-eyebrow" style={{ marginBottom: 12, fontSize: 9 }}>
              <TrendingUp size={10} strokeWidth={1.5} />
              ROAS Trend — 14 Days
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={mockRoasTrend}>
                <defs>
                  <linearGradient id="ecom-rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C4836A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C4836A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: 'var(--text-hint)', fontFamily: 'DM Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--text-hint)', fontFamily: 'DM Mono' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '0.5px solid var(--border-light)',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="roas"
                  stroke="#C4836A"
                  fill="url(#ecom-rg)"
                  strokeWidth={1.5}
                  name="Your ROAS"
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke="var(--text-hint)"
                  fill="none"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  name="Benchmark"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Column 2: AI Recommendations ─────────────────────── */}
        <div className="ecom-col">
          <div className="ecom-col-heading">
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <AlertTriangle size={11} strokeWidth={1.5} />
              AI Recommendations
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {criticalRecs.length > 0 && <span className="badge badge-critical">{criticalRecs.length}</span>}
              {highRecs.length     > 0 && <span className="badge badge-high">{highRecs.length}</span>}
              {mediumRecs.length   > 0 && <span className="badge badge-medium">{mediumRecs.length}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommendations.length === 0 ? (
              <div className="ecom-no-recs">
                <Sparkles size={24} strokeWidth={1.5} style={{ color: 'var(--rose-gold)' }} />
                <p>No pending recommendations</p>
                <span>Connect your Meta account and sync campaigns to generate AI insights</span>
              </div>
            ) : (
              sortedRecs.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onApprove={onApproveRec}
                  onDismiss={onDismissRec}
                  onLearnMore={handleLearnMore}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Column 3: Intelligence Chat ───────────────────────── */}
        <div className="ecom-col">
          <div className="ecom-col-heading">
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <Sparkles size={11} strokeWidth={1.5} />
              Intelligence Chat
            </div>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 9,
              color: 'var(--text-hint)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Context-aware
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <IntelligenceChat brand={brand} campaigns={campaigns} compact />
          </div>
        </div>
      </div>

      {/* ── Campaigns Table ───────────────────────────────────── */}
      <div className="card ecom-campaigns-card">
        <div className="section-eyebrow" style={{ marginBottom: 14 }}>
          <BarChart3 size={11} strokeWidth={1.5} />
          Campaigns
        </div>

        {campaigns.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 20px',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            No campaigns synced yet
          </div>
        ) : (
          <div className="ecom-table-wrap">
            <table className="ecom-table">
              <thead>
                <tr>
                  {['Campaign', 'Status', 'Spend', 'ROAS', 'Impressions', 'Purchases', 'Revenue'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const sc = statusColors[c.status] ?? statusColors.ARCHIVED;
                  return (
                    <tr key={c.id}>
                      <td className="ecom-td-name">{c.name}</td>
                      <td>
                        <span className="ecom-status-chip" style={{ background: sc.bg, color: sc.color }}>
                          {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="mono">{formatCurrency(c.spend)}</td>
                      <td className="mono">{c.roas.toFixed(2)}x</td>
                      <td className="mono">{formatNumber(c.impressions)}</td>
                      <td className="mono">{formatNumber(c.purchases)}</td>
                      <td className="mono">{formatCurrency(c.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Learn More Modal ─────────────────────────────────── */}
      {learnMoreRec && (
        <div className="modal-overlay" onClick={() => setLearnMoreRec(null)}>
          <div className="modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="section-eyebrow" style={{ marginBottom: 6 }}>AI Recommendation</div>
            <h3 className="modal-title">{learnMoreRec.title}</h3>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
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
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 300,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
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
        /* ── KPI strip ───────────────────────────────────────── */
        .ecom-kpi-strip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .ecom-kpi-chip {
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

        .ecom-kpi-chip:hover { border-color: var(--rose-gold-pale); }

        .ecom-kpi-chip.highlight {
          border-color: var(--border-rose);
          background: var(--rose-gold-light);
        }

        .ecom-kpi-label {
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

        .ecom-kpi-value {
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        /* ── 3-column grid ───────────────────────────────────── */
        .ecom-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          align-items: start;
          margin-bottom: 20px;
        }

        .ecom-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }

        .ecom-col-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* ── Bench source tag ────────────────────────────────── */
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

        /* ── No recs placeholder ─────────────────────────────── */
        .ecom-no-recs {
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

        .ecom-no-recs p {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: var(--text-secondary);
        }

        .ecom-no-recs span {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-muted);
          max-width: 240px;
          line-height: 1.5;
        }

        /* ── Campaigns table ─────────────────────────────────── */
        .ecom-campaigns-card {
          padding: 20px;
          margin-top: 4px;
        }

        .ecom-table-wrap {
          overflow-x: auto;
        }

        .ecom-table {
          width: 100%;
          border-collapse: collapse;
        }

        .ecom-table th {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-align: left;
          padding: 6px 12px;
          border-bottom: 0.5px solid var(--border-light);
          white-space: nowrap;
        }

        .ecom-table td {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-secondary);
          padding: 10px 12px;
          border-bottom: 0.5px solid var(--border-light);
          vertical-align: middle;
          white-space: nowrap;
        }

        .ecom-table tr:last-child td { border-bottom: none; }

        .ecom-table tr:hover td { background: var(--bg-secondary); }

        .ecom-td-name {
          font-family: 'Outfit', sans-serif !important;
          font-weight: 400 !important;
          color: var(--text-primary) !important;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ecom-table td.mono {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .ecom-status-chip {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.06em;
          padding: 3px 7px;
          border-radius: 3px;
          display: inline-block;
        }

        /* ── Responsive ──────────────────────────────────────── */
        @media (max-width: 1100px) {
          .ecom-grid { grid-template-columns: 1fr 1fr; }
          .ecom-col:last-child { grid-column: 1 / -1; }
        }

        @media (max-width: 768px) {
          .ecom-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default EcommerceDashboard;
