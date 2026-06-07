import React, { useMemo } from 'react';
import { Activity, TrendingDown, Users, Calendar, DollarSign } from 'lucide-react';
import type { Brand, Campaign, Recommendation } from '../../types';
import {
  formatCurrency,
  formatNumber,
  getBenchmarkAvailability,
  getClinicBenchmarkMetrics,
} from '../../lib/benchmarks';
import BenchmarkMetricCard from '../ui/BenchmarkMetricCard';
import BenchmarkAvailabilityBadge from '../ui/BenchmarkAvailabilityBadge';
import RecommendationCard from '../recommendations/RecommendationCard';
import IntelligenceChat from '../intelligence/IntelligenceChat';

// ─────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────
interface ClinicDashboardProps {
  brand: Brand;
  campaigns: Campaign[];
  recommendations: Recommendation[];
  onApproveRec: (id: string) => void;
  onDismissRec: (id: string) => void;
  onLearnMoreRec: (rec: Recommendation) => void;
}

// ─────────────────────────────────────────────────────────────────
// Clinic-specific quick questions for the Intelligence Chat
// ─────────────────────────────────────────────────────────────────
const CLINIC_QUICK_QUESTIONS = [
  'Why is my CPL increasing?',
  'Should I use Instant Forms or Landing Page?',
  'What creative works best for aesthetics?',
  'How do I improve my show rate?',
];

// ─────────────────────────────────────────────────────────────────
// Mock fallback data when no campaigns exist
// ─────────────────────────────────────────────────────────────────
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'mock-1',
    brand_id: 'mock',
    ad_account_id: 'mock',
    platform: 'meta',
    campaign_id_external: 'mock-1',
    name: 'Aesthetic Treatments — Lead Gen',
    status: 'ACTIVE',
    objective: 'LEAD_GENERATION',
    spend: 3840,
    impressions: 312000,
    clicks: 7488,
    purchases: 0,
    revenue: 0,
    roas: 0,
    leads: 109,
    cpl: 35.23,
    lead_quality_rate: 0.68,
    qualified_leads: 74,
    bookings: 42,
    reach: 198000,
    frequency: 1.58,
    date_start: '2024-01-01',
    synced_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    brand_id: 'mock',
    ad_account_id: 'mock',
    platform: 'meta',
    campaign_id_external: 'mock-2',
    name: 'Botox & Fillers — Retargeting',
    status: 'PAUSED',
    objective: 'LEAD_GENERATION',
    spend: 1120,
    impressions: 88000,
    clicks: 1848,
    purchases: 0,
    revenue: 0,
    roas: 0,
    leads: 28,
    cpl: 40.0,
    lead_quality_rate: 0.71,
    qualified_leads: 20,
    bookings: 11,
    reach: 62000,
    frequency: 1.42,
    date_start: '2024-01-01',
    synced_at: new Date().toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────────
// Helper: status badge
// ─────────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: Campaign['status'] }> = ({ status }) => {
  const config: Record<Campaign['status'], { label: string; color: string; bg: string }> = {
    ACTIVE:   { label: 'Active',   color: '#065F46', bg: 'rgba(16,185,129,0.10)' },
    PAUSED:   { label: 'Paused',   color: '#92400E', bg: 'rgba(245,158,11,0.10)' },
    ARCHIVED: { label: 'Archived', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
    DELETED:  { label: 'Deleted',  color: '#991B1B', bg: 'rgba(239,68,68,0.10)'  },
  };
  const c = config[status] ?? config.ARCHIVED;
  return (
    <span
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: c.color,
        background: c.bg,
        borderRadius: 3,
        padding: '2px 7px',
        whiteSpace: 'nowrap',
      }}
    >
      {c.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
const ClinicDashboard: React.FC<ClinicDashboardProps> = ({
  brand,
  campaigns,
  recommendations,
  onApproveRec,
  onDismissRec,
  onLearnMoreRec,
}) => {
  const hasCampaigns = campaigns.length > 0;
  const activeCampaigns = hasCampaigns ? campaigns : MOCK_CAMPAIGNS;

  // ── Aggregated KPI strip values ──────────────────────────────
  const kpis = useMemo(() => {
    const totalSpend    = activeCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalLeads    = activeCampaigns.reduce((s, c) => s + c.leads, 0);
    const totalBookings = activeCampaigns.reduce((s, c) => s + c.bookings, 0);
    const cpl           = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const cpb           = totalBookings > 0 ? totalSpend / totalBookings : 0;
    return { totalSpend, totalLeads, totalBookings, cpl, cpb };
  }, [activeCampaigns]);

  // ── Benchmark metrics for column 1 ──────────────────────────
  const benchmarkMetrics = useMemo(
    () => getClinicBenchmarkMetrics(activeCampaigns),
    [activeCampaigns]
  );

  const availability = getBenchmarkAvailability(brand.business_type);

  // ── Pending recommendations only ────────────────────────────
  const pendingRecs = recommendations.filter((r) => r.status === 'pending');

  return (
    <div className="clinic-dashboard">
      {/* ══════════════════════════════════════════════════════
          KPI STRIP
      ══════════════════════════════════════════════════════ */}
      <div className="cd-kpi-strip">
        {/* Spend */}
        <div className="cd-kpi-item">
          <div className="cd-kpi-icon">
            <DollarSign size={13} strokeWidth={1.5} />
          </div>
          <div className="cd-kpi-body">
            <div className="cd-kpi-label">Total Spend</div>
            <div className="cd-kpi-value">{formatCurrency(kpis.totalSpend)}</div>
          </div>
        </div>

        <div className="cd-kpi-divider" />

        {/* Leads */}
        <div className="cd-kpi-item">
          <div className="cd-kpi-icon">
            <Users size={13} strokeWidth={1.5} />
          </div>
          <div className="cd-kpi-body">
            <div className="cd-kpi-label">Leads</div>
            <div className="cd-kpi-value">{formatNumber(kpis.totalLeads)}</div>
          </div>
        </div>

        <div className="cd-kpi-divider" />

        {/* CPL */}
        <div className="cd-kpi-item">
          <div className="cd-kpi-icon">
            <TrendingDown size={13} strokeWidth={1.5} />
          </div>
          <div className="cd-kpi-body">
            <div className="cd-kpi-label">Cost per Lead</div>
            <div className="cd-kpi-value">{formatCurrency(kpis.cpl)}</div>
          </div>
        </div>

        <div className="cd-kpi-divider" />

        {/* Bookings */}
        <div className="cd-kpi-item">
          <div className="cd-kpi-icon">
            <Calendar size={13} strokeWidth={1.5} />
          </div>
          <div className="cd-kpi-body">
            <div className="cd-kpi-label">Bookings</div>
            <div className="cd-kpi-value">{formatNumber(kpis.totalBookings)}</div>
          </div>
        </div>

        <div className="cd-kpi-divider" />

        {/* Cost per Booking */}
        <div className="cd-kpi-item">
          <div className="cd-kpi-icon">
            <Activity size={13} strokeWidth={1.5} />
          </div>
          <div className="cd-kpi-body">
            <div className="cd-kpi-label">Cost per Booking</div>
            <div className="cd-kpi-value">{formatCurrency(kpis.cpb)}</div>
          </div>
        </div>

        {!hasCampaigns && (
          <div className="cd-kpi-mock-badge">
            Demo data
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          3-COLUMN MAIN GRID
      ══════════════════════════════════════════════════════ */}
      <div className="cd-grid">

        {/* ── COLUMN 1: Performance Intelligence ──────────── */}
        <div className="cd-col card">
          <div className="section-eyebrow">Performance Intelligence</div>
          <h3 className="cd-col-title">Campaign Benchmarks</h3>

          <BenchmarkAvailabilityBadge availability={availability} />

          <div className="cd-metrics-stack">
            {benchmarkMetrics.map((m) => (
              <BenchmarkMetricCard
                key={m.label}
                label={m.label}
                yourValue={m.your_value}
                benchmarkValue={m.benchmark_value}
                unit={m.unit}
                higherIsBetter={m.higher_is_better}
                benchmarkSource="NextGenAds Beauty Clinic Index · 2024"
              />
            ))}
          </div>
        </div>

        {/* ── COLUMN 2: AI Recommendations ────────────────── */}
        <div className="cd-col card">
          <div className="section-eyebrow">AI Recommendations</div>
          <h3 className="cd-col-title">
            Intelligence Insights
            {pendingRecs.length > 0 && (
              <span className="cd-rec-count">{pendingRecs.length}</span>
            )}
          </h3>

          {pendingRecs.length === 0 ? (
            <div className="cd-empty-state">
              <div className="cd-empty-icon">✨</div>
              <p className="cd-empty-title">All caught up</p>
              <p className="cd-empty-sub">
                No pending recommendations. Your campaigns are performing well.
              </p>
            </div>
          ) : (
            <div className="cd-recs-stack">
              {pendingRecs.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onApprove={onApproveRec}
                  onDismiss={onDismissRec}
                  onLearnMore={onLearnMoreRec}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── COLUMN 3: Intelligence Chat ─────────────────── */}
        <div className="cd-col cd-chat-col">
          <IntelligenceChat
            brand={brand}
            campaigns={activeCampaigns}
            compact={true}
            initialMessages={[]}
            // Pass clinic-specific quick questions via sessionId workaround:
            // The component uses its own QUICK_QUESTIONS const internally,
            // so we wrap it and override the empty-state quick-question buttons
            // by rendering our own overlay panel when no messages exist.
          />
          {/* Clinic quick-question overlay hint rendered as a subtitle below */}
          <div className="cd-chat-hints">
            <div className="cd-hints-label">Clinic quick questions</div>
            <div className="cd-hints-list">
              {CLINIC_QUICK_QUESTIONS.map((q) => (
                <span key={q} className="cd-hint-pill">{q}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          CAMPAIGNS TABLE
      ══════════════════════════════════════════════════════ */}
      <div className="card cd-table-card">
        <div className="cd-table-header">
          <div>
            <div className="section-eyebrow">Campaign Intelligence</div>
            <h3 className="cd-col-title" style={{ marginTop: 4 }}>Active Campaigns</h3>
          </div>
          {!hasCampaigns && (
            <span className="cd-mock-label">Showing demo data</span>
          )}
        </div>

        {activeCampaigns.length === 0 ? (
          <div className="cd-empty-state" style={{ padding: '40px 0' }}>
            <div className="cd-empty-icon">📊</div>
            <p className="cd-empty-title">No campaigns yet</p>
            <p className="cd-empty-sub">Connect your Meta Ad Account to see your campaigns here.</p>
          </div>
        ) : (
          <div className="cd-table-wrap">
            <table className="cd-table">
              <thead>
                <tr>
                  <th className="cd-th">Campaign Name</th>
                  <th className="cd-th cd-th-center">Status</th>
                  <th className="cd-th cd-th-right">Spend</th>
                  <th className="cd-th cd-th-right">Leads</th>
                  <th className="cd-th cd-th-right">CPL</th>
                  <th className="cd-th cd-th-right">Impressions</th>
                  <th className="cd-th cd-th-right">CTR</th>
                  <th className="cd-th cd-th-right">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {activeCampaigns.map((c, idx) => {
                  const ctr = c.impressions > 0
                    ? ((c.clicks / c.impressions) * 100).toFixed(2)
                    : '—';
                  const cpl = c.leads > 0
                    ? formatCurrency(c.spend / c.leads)
                    : '—';

                  return (
                    <tr key={c.id} className={idx % 2 === 0 ? 'cd-tr-even' : ''}>
                      <td className="cd-td cd-td-name">
                        <span className="cd-campaign-name">{c.name}</span>
                        <span className="cd-platform-badge">{c.platform}</span>
                      </td>
                      <td className="cd-td cd-td-center">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="cd-td cd-td-mono cd-td-right">
                        {formatCurrency(c.spend)}
                      </td>
                      <td className="cd-td cd-td-mono cd-td-right">
                        {formatNumber(c.leads)}
                      </td>
                      <td className="cd-td cd-td-mono cd-td-right">
                        {cpl}
                      </td>
                      <td className="cd-td cd-td-mono cd-td-right">
                        {formatNumber(c.impressions)}
                      </td>
                      <td className="cd-td cd-td-mono cd-td-right">
                        {ctr !== '—' ? `${ctr}%` : '—'}
                      </td>
                      <td className="cd-td cd-td-mono cd-td-right">
                        {formatNumber(c.bookings)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="cd-tfoot-row">
                  <td className="cd-td cd-tfoot-label" colSpan={2}>Totals</td>
                  <td className="cd-td cd-td-mono cd-td-right cd-tfoot-val">
                    {formatCurrency(activeCampaigns.reduce((s, c) => s + c.spend, 0))}
                  </td>
                  <td className="cd-td cd-td-mono cd-td-right cd-tfoot-val">
                    {formatNumber(activeCampaigns.reduce((s, c) => s + c.leads, 0))}
                  </td>
                  <td className="cd-td cd-td-mono cd-td-right cd-tfoot-val">
                    {formatCurrency(kpis.cpl)}
                  </td>
                  <td className="cd-td cd-td-mono cd-td-right cd-tfoot-val">
                    {formatNumber(activeCampaigns.reduce((s, c) => s + c.impressions, 0))}
                  </td>
                  <td className="cd-td cd-td-mono cd-td-right cd-tfoot-val">
                    {(() => {
                      const ti = activeCampaigns.reduce((s, c) => s + c.impressions, 0);
                      const tc = activeCampaigns.reduce((s, c) => s + c.clicks, 0);
                      return ti > 0 ? `${((tc / ti) * 100).toFixed(2)}%` : '—';
                    })()}
                  </td>
                  <td className="cd-td cd-td-mono cd-td-right cd-tfoot-val">
                    {formatNumber(activeCampaigns.reduce((s, c) => s + c.bookings, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SCOPED STYLES
      ══════════════════════════════════════════════════════ */}
      <style>{`
        /* ── Dashboard wrapper ── */
        .clinic-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        /* ── KPI Strip ── */
        .cd-kpi-strip {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 16px 24px;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
        }

        .cd-kpi-strip::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--rose-gold), transparent);
        }

        .cd-kpi-item {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 140px;
          padding: 4px 16px;
        }

        .cd-kpi-item:first-of-type { padding-left: 0; }

        .cd-kpi-icon {
          width: 30px;
          height: 30px;
          background: var(--rose-gold-light);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--rose-gold);
          flex-shrink: 0;
        }

        .cd-kpi-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cd-kpi-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .cd-kpi-value {
          font-family: 'DM Mono', monospace;
          font-size: 18px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .cd-kpi-divider {
          width: 0.5px;
          height: 36px;
          background: var(--border-light);
          flex-shrink: 0;
        }

        .cd-kpi-mock-badge {
          position: absolute;
          top: 8px;
          right: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-hint);
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-light);
          border-radius: 3px;
          padding: 2px 7px;
        }

        /* ── 3-column grid ── */
        .cd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          align-items: start;
        }

        @media (max-width: 1100px) {
          .cd-grid {
            grid-template-columns: 1fr 1fr;
          }
          .cd-chat-col {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 720px) {
          .cd-grid {
            grid-template-columns: 1fr;
          }
          .cd-chat-col {
            grid-column: auto;
          }
        }

        .cd-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
        }

        .cd-chat-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 500px;
        }

        .cd-chat-col > .ic-container {
          flex: 1;
        }

        /* ── Column titles ── */
        .cd-col-title {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          font-weight: 400;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cd-rec-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: var(--rose-gold);
          color: #fff;
          border-radius: 50%;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          font-weight: 500;
        }

        /* ── Metrics stack ── */
        .cd-metrics-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── Recommendations stack ── */
        .cd-recs-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          max-height: 560px;
          padding-right: 2px;
        }

        /* ── Chat hints ── */
        .cd-chat-hints {
          padding: 8px 4px 0;
        }

        .cd-hints-label {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-hint);
          margin-bottom: 6px;
        }

        .cd-hints-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .cd-hint-pill {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 300;
          color: var(--text-muted);
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-light);
          border-radius: 10px;
          padding: 3px 9px;
          cursor: default;
        }

        /* ── Empty state ── */
        .cd-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 6px;
          padding: 32px 16px;
          flex: 1;
        }

        .cd-empty-icon {
          font-size: 28px;
          margin-bottom: 4px;
        }

        .cd-empty-title {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 400;
          color: var(--text-primary);
          margin: 0;
        }

        .cd-empty-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-secondary);
          max-width: 240px;
          line-height: 1.5;
          margin: 0;
        }

        /* ── Table card ── */
        .cd-table-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cd-table-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .cd-mock-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 300;
          color: var(--text-hint);
          font-style: italic;
          padding-top: 2px;
        }

        /* ── Table ── */
        .cd-table-wrap {
          overflow-x: auto;
          border-radius: var(--radius);
          border: 0.5px solid var(--border-light);
        }

        .cd-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 820px;
        }

        .cd-th {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 10px 14px;
          text-align: left;
          background: var(--bg-secondary);
          border-bottom: 0.5px solid var(--border-light);
          white-space: nowrap;
        }

        .cd-th-center { text-align: center; }
        .cd-th-right  { text-align: right; }

        .cd-td {
          padding: 11px 14px;
          border-bottom: 0.5px solid var(--border-light);
          vertical-align: middle;
        }

        .cd-td-mono {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .cd-td-center { text-align: center; }
        .cd-td-right  { text-align: right; }

        .cd-tr-even {
          background: rgba(196, 131, 106, 0.02);
        }

        .cd-table tbody tr:hover {
          background: var(--rose-gold-light) !important;
        }

        .cd-td-name {
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: 280px;
        }

        .cd-campaign-name {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
          display: block;
        }

        .cd-platform-badge {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-hint);
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-light);
          border-radius: 2px;
          padding: 1px 5px;
          flex-shrink: 0;
        }

        /* ── Table footer totals ── */
        .cd-tfoot-row {
          background: var(--bg-secondary);
        }

        .cd-tfoot-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          border-bottom: none;
        }

        .cd-tfoot-val {
          font-weight: 500;
          color: var(--text-primary);
          border-bottom: none;
        }

        /* ── rec-benchmark-ref (used by RecommendationCard) ── */
        .rec-benchmark-ref {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 400;
          color: var(--rose-gold);
          background: var(--rose-gold-light);
          border-radius: 3px;
          padding: 2px 7px;
        }
      `}</style>
    </div>
  );
};

export default ClinicDashboard;
