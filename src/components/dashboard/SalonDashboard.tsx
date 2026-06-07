import React from 'react';
import type { Brand, Campaign, Recommendation } from '../../types';
import BenchmarkMetricCard from '../ui/BenchmarkMetricCard';
import BenchmarkAvailabilityBadge from '../ui/BenchmarkAvailabilityBadge';
import RecommendationCard from '../recommendations/RecommendationCard';
import IntelligenceChat from '../intelligence/IntelligenceChat';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SalonDashboardProps {
  brand: Brand;
  campaigns: Campaign[];
  recommendations: Recommendation[];
  onApproveRec: (id: string) => void;
  onDismissRec: (id: string) => void;
  onLearnMoreRec: (rec: Recommendation) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Salon-specific quick questions for the Intelligence Engine
// ─────────────────────────────────────────────────────────────────────────────

const SALON_QUICK_QUESTIONS = [
  'My frequency is too high — what should I do?',
  'Should I target a wider radius?',
  'What offer converts best for new clients?',
  'How do I improve rebooking rate?',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString('en-EU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCurrency = (n: number, currency = '€') => `${currency}${fmt(n)}`;

// ─────────────────────────────────────────────────────────────────────────────
// KPI Strip Item
// ─────────────────────────────────────────────────────────────────────────────

interface KpiItemProps {
  label: string;
  value: string;
}

const KpiItem: React.FC<KpiItemProps> = ({ label, value }) => (
  <div className="sd-kpi-item">
    <div className="sd-kpi-label">{label}</div>
    <div className="sd-kpi-value">{value}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

const SalonDashboard: React.FC<SalonDashboardProps> = ({
  brand,
  campaigns,
  recommendations,
  onApproveRec,
  onDismissRec,
  onLearnMoreRec,
}) => {
  // ── Derived metrics ────────────────────────────────────────────────────────
  const totalSpend   = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads   = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalReach   = campaigns.reduce((s, c) => s + c.reach, 0);
  const avgCpl       = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCpm       = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + (c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0), 0) / campaigns.length
    : 0;
  const avgCtr       = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0), 0) / campaigns.length
    : 0;
  const avgReach     = campaigns.length > 0 ? totalReach / campaigns.length : 0;
  const avgFrequency = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + c.frequency, 0) / campaigns.length
    : 0;

  // New clients ≈ qualified leads (bookings as proxy where available)
  const newClients = campaigns.reduce((s, c) => s + (c.bookings > 0 ? c.bookings : c.qualified_leads), 0);
  const avgTicket  = brand.avg_ticket ?? 0;

  // Frequency warning threshold
  const FREQ_BENCHMARK = 3.5;
  const showFreqWarning = avgFrequency > FREQ_BENCHMARK;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="sd-root">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="sd-page-header">
        <div>
          <div className="section-eyebrow">Salon Intelligence</div>
          <h1 className="sd-page-title">{brand.name}</h1>
          <p className="sd-page-sub">
            Hair · Nail · Brow · Lash — Local audience performance dashboard
          </p>
        </div>
        <div className="sd-header-badges">
          <span className="badge badge-neutral">{brand.stage}</span>
          {brand.markets?.map((m) => (
            <span key={m} className="badge badge-neutral">{m}</span>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="sd-kpi-strip card">
        <KpiItem label="Spend"         value={fmtCurrency(totalSpend)} />
        <div className="sd-kpi-divider" />
        <KpiItem label="Leads"         value={String(totalLeads)} />
        <div className="sd-kpi-divider" />
        <KpiItem label="Cost per Lead" value={fmtCurrency(avgCpl)} />
        <div className="sd-kpi-divider" />
        <KpiItem label="New Clients"   value={String(newClients)} />
        <div className="sd-kpi-divider" />
        <KpiItem label="Avg Ticket"    value={avgTicket > 0 ? fmtCurrency(avgTicket) : '—'} />
      </div>

      {/* ── 3-Column Grid ─────────────────────────────────────────────────── */}
      <div className="sd-grid">

        {/* ── COLUMN 1 — Performance Intelligence ───────────────────────── */}
        <div className="sd-col">
          <div className="section-eyebrow" style={{ marginBottom: 12 }}>Performance Intelligence</div>

          <BenchmarkAvailabilityBadge availability="partial" />

          <div className="sd-metric-stack">
            <BenchmarkMetricCard
              label="Cost per Lead"
              yourValue={avgCpl}
              benchmarkValue={22}
              unit="€"
              higherIsBetter={false}
              benchmarkSource="Salon benchmark · EU 2024"
            />
            <BenchmarkMetricCard
              label="CPM"
              yourValue={avgCpm}
              benchmarkValue={8.5}
              unit="€"
              higherIsBetter={false}
              benchmarkSource="Salon benchmark · EU 2024"
            />
            <BenchmarkMetricCard
              label="CTR"
              yourValue={avgCtr}
              benchmarkValue={2.4}
              unit="%"
              higherIsBetter={true}
              benchmarkSource="Salon benchmark · EU 2024"
            />
            <BenchmarkMetricCard
              label="Reach"
              yourValue={avgReach}
              benchmarkValue={5000}
              unit=""
              higherIsBetter={true}
              benchmarkSource="Salon benchmark · local radius"
            />
            <BenchmarkMetricCard
              label="Frequency"
              yourValue={avgFrequency}
              benchmarkValue={FREQ_BENCHMARK}
              unit="x"
              higherIsBetter={false}
              benchmarkSource="Salon benchmark · creative refresh"
            />
          </div>

          {/* ── Frequency / Creative Fatigue Warning ──────────────────────── */}
          {showFreqWarning && (
            <div className="sd-freq-warning animate-fade-in">
              <div className="sd-freq-warning-title">⚠️ Creative Fatigue Warning</div>
              <p className="sd-freq-warning-body">
                Your frequency is{' '}
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                  {avgFrequency.toFixed(2)}x
                </span>{' '}
                — above the{' '}
                <span style={{ fontFamily: "'DM Mono', monospace" }}>3.5x</span>{' '}
                benchmark. Local audiences burn out fast. Refresh creative or pause.
              </p>
            </div>
          )}
        </div>

        {/* ── COLUMN 2 — AI Recommendations ─────────────────────────────── */}
        <div className="sd-col">
          <div className="section-eyebrow" style={{ marginBottom: 12 }}>AI Recommendations</div>

          {recommendations.length === 0 ? (
            <div className="sd-empty-state card">
              <div className="sd-empty-icon">✦</div>
              <p className="sd-empty-text">No pending recommendations</p>
              <p className="sd-empty-sub">Your campaigns are performing well — check back soon.</p>
            </div>
          ) : (
            <div className="sd-rec-stack">
              {recommendations.map((rec) => (
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

        {/* ── COLUMN 3 — Intelligence Chat ───────────────────────────────── */}
        <div className="sd-col sd-col-chat">
          <div className="section-eyebrow" style={{ marginBottom: 12 }}>Intelligence Engine</div>
          <div className="sd-chat-wrap">
            <IntelligenceChat
              brand={brand}
              campaigns={campaigns}
              compact
            />
            {/* Salon-specific quick questions overlay hint rendered via prop */}
          </div>
          {/* Quick-question chips below chat for salon context */}
          <div className="sd-quick-chips">
            {SALON_QUICK_QUESTIONS.map((q) => (
              <div key={q} className="sd-quick-chip">
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Campaigns Table ───────────────────────────────────────────────── */}
      <div className="card sd-table-section">
        <div className="sd-table-header">
          <div className="section-eyebrow">Active Campaigns</div>
          <span className="badge badge-neutral">{campaigns.length} campaigns</span>
        </div>

        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Spend</th>
                <th>Reach</th>
                <th>Frequency</th>
                <th>Leads</th>
                <th>CPL</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const freqHigh = c.frequency > FREQ_BENCHMARK;
                return (
                  <tr key={c.id}>
                    <td className="sd-td-name">{c.name}</td>
                    <td>
                      <span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-neutral'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="sd-td-mono">{fmtCurrency(c.spend)}</td>
                    <td className="sd-td-mono">{c.reach.toLocaleString()}</td>
                    <td
                      className="sd-td-mono"
                      style={{ color: freqHigh ? 'var(--danger)' : 'inherit', fontWeight: freqHigh ? 600 : 400 }}
                      title={freqHigh ? 'Above 3.5x benchmark — creative fatigue risk' : undefined}
                    >
                      {c.frequency.toFixed(2)}x
                      {freqHigh && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
                    </td>
                    <td className="sd-td-mono">{c.leads}</td>
                    <td className="sd-td-mono">{c.cpl > 0 ? fmtCurrency(c.cpl) : '—'}</td>
                  </tr>
                );
              })}

              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="sd-td-empty">No campaigns synced yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Styles ────────────────────────────────────────────────────────── */}
      <style>{`
        /* ── Root / Layout ─────────────────────────────────────────────── */
        .sd-root {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 28px 32px;
          background: var(--bg-primary);
          min-height: 100vh;
        }

        /* ── Page Header ───────────────────────────────────────────────── */
        .sd-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .sd-page-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 400;
          color: var(--text-primary);
          margin: 4px 0 2px;
          line-height: 1.2;
        }

        .sd-page-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: var(--text-secondary);
          margin: 0;
          letter-spacing: 0.02em;
        }

        .sd-header-badges {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-top: 4px;
          flex-wrap: wrap;
        }

        /* ── KPI Strip ─────────────────────────────────────────────────── */
        .sd-kpi-strip {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0;
          padding: 14px 20px;
        }

        .sd-kpi-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 0 24px;
          flex: 1;
          min-width: 100px;
        }

        .sd-kpi-item:first-child { padding-left: 0; }
        .sd-kpi-item:last-child  { padding-right: 0; }

        .sd-kpi-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .sd-kpi-value {
          font-family: 'DM Mono', monospace;
          font-weight: 500;
          font-size: 20px;
          color: var(--text-primary);
          line-height: 1;
        }

        .sd-kpi-divider {
          width: 0.5px;
          height: 36px;
          background: var(--border-light);
          flex-shrink: 0;
        }

        /* ── 3-Column Grid ─────────────────────────────────────────────── */
        .sd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1100px) {
          .sd-grid { grid-template-columns: 1fr 1fr; }
          .sd-col-chat { grid-column: 1 / -1; }
        }

        @media (max-width: 700px) {
          .sd-grid { grid-template-columns: 1fr; }
        }

        /* ── Column ────────────────────────────────────────────────────── */
        .sd-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ── Metric stack ──────────────────────────────────────────────── */
        .sd-metric-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── Frequency Warning Card ────────────────────────────────────── */
        .sd-freq-warning {
          background: #FEF3C7;
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sd-freq-warning-title {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #92400E;
          letter-spacing: 0.01em;
        }

        .sd-freq-warning-body {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: #92400E;
          line-height: 1.6;
          margin: 0;
        }

        /* ── Recommendations ───────────────────────────────────────────── */
        .sd-rec-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sd-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 36px 20px;
          text-align: center;
        }

        .sd-empty-icon {
          font-size: 24px;
          color: var(--rose-gold-pale);
          margin-bottom: 4px;
        }

        .sd-empty-text {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 400;
          color: var(--text-primary);
          margin: 0;
        }

        .sd-empty-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        /* ── Chat Column ───────────────────────────────────────────────── */
        .sd-col-chat { min-height: 540px; }

        .sd-chat-wrap {
          flex: 1;
          min-height: 400px;
        }

        /* ── Quick Chips (salon-specific context hints) ─────────────────── */
        .sd-quick-chips {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 4px;
        }

        .sd-quick-chip {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          padding: 8px 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-secondary);
          cursor: default;
          line-height: 1.4;
          transition: border-color var(--transition);
        }

        .sd-quick-chip:hover {
          border-color: var(--rose-gold-pale);
          color: var(--text-primary);
        }

        /* ── Campaigns Table ───────────────────────────────────────────── */
        .sd-table-section { padding: 0; overflow: hidden; }

        .sd-table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 0.5px solid var(--border-light);
        }

        .sd-table-wrap { overflow-x: auto; }

        .sd-table {
          width: 100%;
          border-collapse: collapse;
        }

        .sd-table th {
          padding: 10px 16px;
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-align: left;
          background: var(--bg-secondary);
          border-bottom: 0.5px solid var(--border-light);
          white-space: nowrap;
        }

        .sd-table td {
          padding: 11px 16px;
          border-bottom: 0.5px solid var(--border-light);
          vertical-align: middle;
        }

        .sd-table tr:last-child td { border-bottom: none; }

        .sd-table tr:hover td {
          background: var(--bg-secondary);
        }

        .sd-td-name {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: var(--text-primary);
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sd-td-mono {
          font-family: 'DM Mono', monospace;
          font-weight: 500;
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .sd-td-empty {
          text-align: center;
          padding: 32px 16px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: var(--text-muted);
        }

        .badge-active {
          background: rgba(16,185,129,0.08);
          color: #047857;
          border: 0.5px solid rgba(16,185,129,0.2);
        }
      `}</style>
    </div>
  );
};

export default SalonDashboard;
