import React, { useMemo } from 'react';
import {
  BarChart3,
  Sparkles,
  AlertTriangle,
  Leaf,
  CalendarDays,
  TrendingUp,
  DollarSign,
  Users,
} from 'lucide-react';

import type { Brand, Campaign, Recommendation } from '../../types';
import BenchmarkMetricCard from '../ui/BenchmarkMetricCard';
import BenchmarkAvailabilityBadge from '../ui/BenchmarkAvailabilityBadge';
import RecommendationCard from '../recommendations/RecommendationCard';
import IntelligenceChat from '../intelligence/IntelligenceChat';

// ─── Props ────────────────────────────────────────────────────────────────────
interface SpaDashboardProps {
  brand: Brand;
  campaigns: Campaign[];
  recommendations: Recommendation[];
  onApproveRec: (id: string) => void;
  onDismissRec: (id: string) => void;
  onLearnMoreRec: (rec: Recommendation) => void;
}

// ─── Spa quick questions for Intelligence Chat ────────────────────────────────
const SPA_QUICK_QUESTIONS = [
  'How do I run a gift voucher campaign?',
  "What's the best objective for spa bookings?",
  'Should I target couples or individuals?',
  'How do I scale before peak season?',
];

// ─── Seasonal Index helper ────────────────────────────────────────────────────
function getSeasonalIndex(month: number): { label: string; color: string; bgColor: string } {
  // month is 0-indexed (0 = January)
  if (month === 10 || month === 11) {
    // November / December
    return { label: 'Peak Season', color: '#C4836A', bgColor: 'var(--rose-gold-light)' };
  }
  if (month === 0) {
    // January
    return { label: 'Post-Peak', color: 'var(--text-secondary)', bgColor: 'var(--bg-secondary)' };
  }
  if (month === 4) {
    // May — Mother's Day
    return { label: "Mother's Day", color: '#7C3AED', bgColor: 'rgba(124,58,237,0.07)' };
  }
  if (month >= 5 && month <= 7) {
    // June–August — summer bookings
    return { label: 'Summer Peak', color: '#059669', bgColor: 'rgba(5,150,105,0.07)' };
  }
  return { label: 'On Track', color: 'var(--success)', bgColor: 'rgba(5,150,105,0.07)' };
}

// ─── KPI strip pill ───────────────────────────────────────────────────────────
interface KpiPillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

const KpiPill: React.FC<KpiPillProps> = ({ icon, label, value, highlight }) => (
  <div
    style={{
      background: highlight ? 'var(--rose-gold-light)' : 'var(--bg-card)',
      border: `0.5px solid ${highlight ? 'var(--border-rose)' : 'var(--border-light)'}`,
      borderRadius: 4,
      padding: '10px 14px',
      minWidth: 100,
    }}
  >
    <div
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 9,
        fontWeight: 400,
        letterSpacing: '0.16em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
      }}
    >
      {icon}
      {label}
    </div>
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 15,
        fontWeight: 500,
        color: highlight ? 'var(--rose-gold)' : 'var(--text-primary)',
      }}
    >
      {value}
    </div>
  </div>
);

// ─── Seasonal Tip card (shown when no recommendations) ────────────────────────
const SeasonalTip: React.FC = () => (
  <div
    style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-light)',
      borderLeft: '2.5px solid var(--rose-gold)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.1rem',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 8,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: "'Outfit', sans-serif",
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: '0.16em',
        textTransform: 'uppercase' as const,
        color: 'var(--rose-gold)',
      }}
    >
      <Leaf size={11} strokeWidth={1.5} />
      Seasonal Tip
    </div>
    <div
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-primary)',
        lineHeight: 1.35,
      }}
    >
      Gift Vouchers Drive Bookings in Oct–Dec
    </div>
    <p
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 12,
        fontWeight: 300,
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      Check seasonal campaigns — Gift vouchers perform{' '}
      <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: 'var(--rose-gold)' }}>
        3.2×
      </span>{' '}
      better in Oct–Dec. Consider launching a campaign now to capture pre-peak bookings.
    </p>
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        color: 'var(--rose-gold)',
        background: 'var(--rose-gold-light)',
        padding: '3px 8px',
        borderRadius: 2,
        display: 'inline-block',
        width: 'fit-content',
      }}
    >
      Benchmark: Gift voucher CTR peaks +320% in Q4
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const SpaDashboard: React.FC<SpaDashboardProps> = ({
  brand,
  campaigns,
  recommendations,
  onApproveRec,
  onDismissRec,
  onLearnMoreRec,
}) => {
  // Totals from campaigns
  const totals = useMemo(() => {
    const spend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
    const leads = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
    const bookings = campaigns.reduce((s, c) => s + (c.bookings ?? 0), 0);
    const revenue = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0);
    const cpl = leads > 0 ? spend / leads : 0;
    const cpb = bookings > 0 ? spend / bookings : 0;
    return { spend, leads, bookings, revenue, cpl, cpb };
  }, [campaigns]);

  // Per-campaign derived metrics for table
  const campaignRows = useMemo(
    () =>
      campaigns.map((c) => ({
        ...c,
        cpl: c.leads > 0 ? c.spend / c.leads : 0,
        cpb: c.bookings > 0 ? c.spend / c.bookings : 0,
      })),
    [campaigns],
  );

  // Benchmark metric averages across campaigns
  const avgCpm = useMemo(() => {
    const withImp = campaigns.filter((c) => c.impressions > 0);
    if (!withImp.length) return 0;
    const totalSpend = withImp.reduce((s, c) => s + c.spend, 0);
    const totalImp = withImp.reduce((s, c) => s + c.impressions, 0);
    return (totalSpend / totalImp) * 1000;
  }, [campaigns]);

  const avgCtr = useMemo(() => {
    const withImp = campaigns.filter((c) => c.impressions > 0);
    if (!withImp.length) return 0;
    const totalClicks = withImp.reduce((s, c) => s + c.clicks, 0);
    const totalImp = withImp.reduce((s, c) => s + c.impressions, 0);
    return (totalClicks / totalImp) * 100;
  }, [campaigns]);

  // Seasonal index
  const now = new Date();
  const seasonal = getSeasonalIndex(now.getMonth());

  const currency = brand.currency || '€';
  const pendingRecs = recommendations.filter((r) => r.status === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div className="section-eyebrow">
            <div className="live-dot" />
            Spa &amp; Wellness Intelligence
          </div>
          <h1 className="section-title">
            {brand.name} <em>Dashboard</em>
          </h1>
          {brand.services && brand.services.length > 0 && (
            <p className="page-subtitle">
              {brand.services.slice(0, 3).join(' · ')}{' '}
              {brand.avg_treatment_value
                ? `· Avg treatment ${currency}${brand.avg_treatment_value}`
                : ''}
            </p>
          )}
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <KpiPill
            icon={<DollarSign size={10} strokeWidth={1.5} />}
            label="Spend"
            value={`${currency}${totals.spend.toLocaleString()}`}
          />
          <KpiPill
            icon={<Users size={10} strokeWidth={1.5} />}
            label="Leads"
            value={String(totals.leads)}
          />
          <KpiPill
            icon={<TrendingUp size={10} strokeWidth={1.5} />}
            label="Cost per Lead"
            value={totals.cpl > 0 ? `${currency}${totals.cpl.toFixed(2)}` : '—'}
          />
          <KpiPill
            icon={<CalendarDays size={10} strokeWidth={1.5} />}
            label="Bookings"
            value={String(totals.bookings)}
            highlight
          />
          <KpiPill
            icon={<DollarSign size={10} strokeWidth={1.5} />}
            label="Cost per Booking"
            value={totals.cpb > 0 ? `${currency}${totals.cpb.toFixed(2)}` : '—'}
          />
        </div>
      </div>

      {/* ── 3-column grid ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >

        {/* ── COLUMN 1: Performance Intelligence ──────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <BarChart3 size={10} strokeWidth={1.5} />
              Performance Intelligence
            </div>
          </div>

          <BenchmarkAvailabilityBadge availability="partial" />

          {/* Cost per Booking */}
          <BenchmarkMetricCard
            label="Cost per Booking"
            yourValue={totals.cpb > 0 ? totals.cpb : 80}
            benchmarkValue={80}
            unit={currency}
            higherIsBetter={false}
            benchmarkSource="Spa & Wellness · EU · 2021–2024"
          />

          {/* CPL */}
          <BenchmarkMetricCard
            label="Cost per Lead"
            yourValue={totals.cpl > 0 ? totals.cpl : 28}
            benchmarkValue={28}
            unit={currency}
            higherIsBetter={false}
            benchmarkSource="Lead gen · Spa category"
          />

          {/* CPM */}
          <BenchmarkMetricCard
            label="CPM"
            yourValue={avgCpm > 0 ? avgCpm : 10.5}
            benchmarkValue={10.5}
            unit={currency}
            higherIsBetter={false}
            benchmarkSource="Meta · Beauty & Wellness"
          />

          {/* CTR */}
          <BenchmarkMetricCard
            label="CTR"
            yourValue={avgCtr > 0 ? avgCtr : 1.9}
            benchmarkValue={1.9}
            unit="%"
            higherIsBetter={true}
            benchmarkSource="Meta · Spa & Wellness campaigns"
          />

          {/* Seasonal Index card */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '0.18em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-muted)',
              }}
            >
              <Leaf size={10} strokeWidth={1.5} />
              Seasonal Index
            </div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 22,
                fontWeight: 500,
                color: seasonal.color,
                lineHeight: 1,
              }}
            >
              {seasonal.label}
            </div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 10,
                fontWeight: 300,
                color: 'var(--text-muted)',
              }}
            >
              {now.toLocaleString('default', { month: 'long' })} ·{' '}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  background: seasonal.bgColor,
                  color: seasonal.color,
                  padding: '1px 6px',
                  borderRadius: 2,
                }}
              >
                Spa bookings index
              </span>
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: AI Recommendations ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <AlertTriangle size={10} strokeWidth={1.5} />
              AI Recommendations
            </div>
            {pendingRecs.length > 0 && (
              <div style={{ display: 'flex', gap: 5 }}>
                {(['critical', 'high', 'medium'] as const).map((p) => {
                  const count = pendingRecs.filter((r) => r.priority === p).length;
                  if (!count) return null;
                  return (
                    <span
                      key={p}
                      className={`badge badge-${p}`}
                    >
                      {count}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {pendingRecs.length > 0 ? (
            pendingRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onApprove={onApproveRec}
                onDismiss={onDismissRec}
                onLearnMore={onLearnMoreRec}
              />
            ))
          ) : (
            <SeasonalTip />
          )}
        </div>

        {/* ── COLUMN 3: Intelligence Chat ───────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="section-eyebrow" style={{ marginBottom: 0 }}>
              <Sparkles size={10} strokeWidth={1.5} />
              Intelligence Chat
            </div>
          </div>

          <IntelligenceChat
            brand={brand}
            campaigns={campaigns}
            compact={true}
            initialMessages={[]}
          />

          {/* Quick question pills rendered below the chat for context */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 5,
            }}
          >
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 9,
                fontWeight: 400,
                letterSpacing: '0.16em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-muted)',
                marginBottom: 2,
              }}
            >
              Quick Questions
            </div>
            {SPA_QUICK_QUESTIONS.map((q) => (
              <div
                key={q}
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-light)',
                  borderRadius: 'var(--radius)',
                  padding: '7px 12px',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 11,
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  cursor: 'default',
                  lineHeight: 1.4,
                }}
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Campaigns Table ────────────────────────────────────────────── */}
      <div style={{ marginTop: 8 }}>
        <div className="section-eyebrow" style={{ marginBottom: 14 }}>
          <BarChart3 size={10} strokeWidth={1.5} />
          Campaign Performance
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Spend</th>
                <th>Leads</th>
                <th>CPL</th>
                <th>Bookings</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {campaignRows.length > 0 ? (
                campaignRows.map((c) => {
                  const cplColor =
                    c.cpl > 0 && c.cpl <= 28
                      ? 'var(--success)'
                      : c.cpl > 28 && c.cpl <= 45
                      ? 'var(--warning)'
                      : c.cpl > 45
                      ? 'var(--danger)'
                      : 'var(--text-secondary)';
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 400 }}>{c.name}</div>
                        <div
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 9,
                            color: 'var(--text-hint)',
                            marginTop: 1,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {c.objective}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.status === 'ACTIVE' ? 'badge-success' : 'badge-high'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="numeric">
                        {currency}
                        {c.spend.toLocaleString()}
                      </td>
                      <td className="numeric">{c.leads > 0 ? c.leads : '—'}</td>
                      <td className="numeric" style={{ color: cplColor }}>
                        {c.cpl > 0 ? `${currency}${c.cpl.toFixed(2)}` : '—'}
                      </td>
                      <td className="numeric">{c.bookings > 0 ? c.bookings : '—'}</td>
                      <td className="numeric" style={{ color: 'var(--success)' }}>
                        {c.revenue > 0 ? `${currency}${c.revenue.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 12,
                      fontWeight: 300,
                      color: 'var(--text-muted)',
                      padding: '32px 16px',
                    }}
                  >
                    No campaigns found. Connect your ad account to see data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .spa-kpi-strip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
};

export default SpaDashboard;

