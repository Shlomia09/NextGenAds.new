import React, { useMemo } from 'react';
import { Package, Users, DollarSign, Star, TrendingUp } from 'lucide-react';
import type { Brand, Campaign, Recommendation } from '../../types';
import BenchmarkMetricCard from '../ui/BenchmarkMetricCard';
import BenchmarkAvailabilityBadge from '../ui/BenchmarkAvailabilityBadge';
import RecommendationCard from '../recommendations/RecommendationCard';
import IntelligenceChat from '../intelligence/IntelligenceChat';

// ─── Quick questions scoped to Wholesale / B2B ────────────────
const WHOLESALE_QUICK_QUESTIONS = [
  'How do I improve lead quality?',
  'Should I add a lead qualification form?',
  'What targeting works for beauty distributors?',
  'How long is the average B2B sales cycle?',
];

// ─── Props ─────────────────────────────────────────────────────
interface WholesaleDashboardProps {
  brand: Brand;
  campaigns: Campaign[];
  recommendations: Recommendation[];
  onApproveRec: (id: string) => void;
  onDismissRec: (id: string) => void;
  onLearnMoreRec: (rec: Recommendation) => void;
}

// ─── Helpers ───────────────────────────────────────────────────
const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);

const fmtMono = (v: number, decimals = 2, prefix = '€') =>
  `${prefix}${v.toFixed(decimals)}`;

// ─── Component ─────────────────────────────────────────────────
const WholesaleDashboard: React.FC<WholesaleDashboardProps> = ({
  brand,
  campaigns,
  recommendations,
  onApproveRec,
  onDismissRec,
  onLearnMoreRec,
}) => {
  // ── Aggregate totals ────────────────────────────────────────
  const totals = useMemo(() => {
    const spend          = campaigns.reduce((s, c) => s + c.spend, 0);
    const leads          = campaigns.reduce((s, c) => s + c.leads, 0);
    const qualifiedLeads = campaigns.reduce((s, c) => s + c.qualified_leads, 0);
    const impressions    = campaigns.reduce((s, c) => s + c.impressions, 0);
    const clicks         = campaigns.reduce((s, c) => s + c.clicks, 0);

    const cpl           = leads > 0 ? spend / leads : 0;
    const leadQualityRate = leads > 0 ? (qualifiedLeads / leads) * 100 : 0;
    const cpm           = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const ctr           = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpq           = qualifiedLeads > 0 ? spend / qualifiedLeads : 0;

    const avgWholesaleOrder = brand.avg_wholesale_order ?? 2000;
    const pipelineValue = qualifiedLeads * avgWholesaleOrder;

    return { spend, leads, qualifiedLeads, cpl, leadQualityRate, cpm, ctr, cpq, pipelineValue };
  }, [campaigns, brand.avg_wholesale_order]);

  // ── Status pill helper ───────────────────────────────────────
  const statusBadge = (status: Campaign['status']) => {
    const map: Record<Campaign['status'], string> = {
      ACTIVE:   'badge-success',
      PAUSED:   'badge-neutral',
      ARCHIVED: 'badge-neutral',
      DELETED:  'badge-critical',
    };
    return <span className={`badge ${map[status]}`}>{status}</span>;
  };

  return (
    <div className="wd-root">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="wd-page-header">
        <div>
          <div className="section-eyebrow">Wholesale · B2B Intelligence</div>
          <h1 className="wd-page-title">{brand.name}</h1>
          <p className="wd-page-sub">
            Distributor &amp; Retail Lead Generation Dashboard
          </p>
        </div>
        <div className="wd-header-badges">
          {brand.markets?.map((m) => (
            <span key={m} className="badge badge-neutral">{m}</span>
          ))}
          {brand.target_buyers?.map((b) => (
            <span key={b} className="badge" style={{ background: 'var(--rose-gold-light)', color: 'var(--rose-gold-dark)', borderColor: 'var(--rose-gold-pale)' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────── */}
      <div className="wd-kpi-strip">
        <div className="wd-kpi-item">
          <div className="wd-kpi-icon"><DollarSign size={14} /></div>
          <div>
            <div className="wd-kpi-label">Spend</div>
            <div className="wd-kpi-value">{fmtCurrency(totals.spend)}</div>
          </div>
        </div>

        <div className="wd-kpi-divider" />

        <div className="wd-kpi-item">
          <div className="wd-kpi-icon"><Users size={14} /></div>
          <div>
            <div className="wd-kpi-label">Leads</div>
            <div className="wd-kpi-value">{totals.leads.toLocaleString()}</div>
          </div>
        </div>

        <div className="wd-kpi-divider" />

        <div className="wd-kpi-item">
          <div className="wd-kpi-icon"><TrendingUp size={14} /></div>
          <div>
            <div className="wd-kpi-label">CPL</div>
            <div className="wd-kpi-value">{fmtMono(totals.cpl)}</div>
          </div>
        </div>

        <div className="wd-kpi-divider" />

        <div className="wd-kpi-item">
          <div className="wd-kpi-icon"><Star size={14} /></div>
          <div>
            <div className="wd-kpi-label">Qualified Leads</div>
            <div className="wd-kpi-value">{totals.qualifiedLeads.toLocaleString()}</div>
          </div>
        </div>

        <div className="wd-kpi-divider" />

        <div className="wd-kpi-item">
          <div className="wd-kpi-icon"><Package size={14} /></div>
          <div>
            <div className="wd-kpi-label">Pipeline Value</div>
            <div className="wd-kpi-value wd-kpi-highlight">{fmtCurrency(totals.pipelineValue)}</div>
          </div>
        </div>
      </div>

      {/* ── 3-Column Grid ───────────────────────────────────── */}
      <div className="wd-grid">

        {/* ── COLUMN 1: Performance Intelligence ─────────────── */}
        <div className="wd-col wd-col-1">
          <div className="card">
            <div className="wd-col-header">
              <span className="section-eyebrow">Performance Intelligence</span>
            </div>

            <BenchmarkAvailabilityBadge
              availability="partial"
              markets={brand.markets}
            />

            <div className="wd-metrics-grid">
              <BenchmarkMetricCard
                label="CPL"
                yourValue={totals.cpl}
                benchmarkValue={55}
                unit="€"
                higherIsBetter={false}
                benchmarkSource="Beauty B2B · 2021–2024 · EU"
              />
              <BenchmarkMetricCard
                label="Lead Quality Rate"
                yourValue={totals.leadQualityRate}
                benchmarkValue={35}
                unit="%"
                higherIsBetter={true}
                benchmarkSource="Qualified/Total Leads · Beauty Wholesale"
              />
              <BenchmarkMetricCard
                label="CPM"
                yourValue={totals.cpm}
                benchmarkValue={13.5}
                unit="€"
                higherIsBetter={false}
                benchmarkSource="Meta · B2B Beauty · EU average"
              />
              <BenchmarkMetricCard
                label="CTR"
                yourValue={totals.ctr}
                benchmarkValue={1.2}
                unit="%"
                higherIsBetter={true}
                benchmarkSource="Meta · B2B Lead Gen · Beauty"
              />
              <BenchmarkMetricCard
                label="CPQ (Cost per Qualified Lead)"
                yourValue={totals.cpq}
                benchmarkValue={160}
                unit="€"
                higherIsBetter={false}
                benchmarkSource="Spend ÷ Qualified Leads · B2B Beauty"
              />
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: AI Recommendations ────────────────────── */}
        <div className="wd-col wd-col-2">
          <div className="card wd-recs-card">
            <div className="wd-col-header">
              <span className="section-eyebrow">AI Recommendations</span>
              <span className="badge badge-neutral">{recommendations.length}</span>
            </div>

            {recommendations.length === 0 ? (
              <div className="wd-empty-recs">
                <Star size={20} strokeWidth={1.5} />
                <p>No pending recommendations</p>
                <span>Your wholesale campaigns are optimised</span>
              </div>
            ) : (
              <div className="wd-recs-list">
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
        </div>

        {/* ── COLUMN 3: Intelligence Chat ──────────────────────── */}
        <div className="wd-col wd-col-3">
          <IntelligenceChat
            brand={brand}
            campaigns={campaigns}
            initialMessages={[]}
          />
          {/* Quick-question overlay injected via prop passthrough via CSS trick —
              IntelligenceChat uses its own QUICK_QUESTIONS const.
              We surface the wholesale ones as a prompt hint block above the chat. */}
          <div className="wd-quick-hints">
            <div className="wd-quick-hints-label">Suggested questions</div>
            <div className="wd-quick-hints-list">
              {WHOLESALE_QUICK_QUESTIONS.map((q) => (
                <div key={q} className="wd-quick-hint-pill">{q}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Campaigns Table ─────────────────────────────────── */}
      <div className="card wd-table-card">
        <div className="wd-col-header">
          <span className="section-eyebrow">Campaign Breakdown</span>
          <span className="badge badge-neutral">{campaigns.length} campaigns</span>
        </div>

        <div className="wd-table-wrap">
          <table className="wd-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th className="wd-th-num">Spend</th>
                <th className="wd-th-num">Leads</th>
                <th className="wd-th-num">CPL</th>
                <th className="wd-th-num">Qualified</th>
                <th className="wd-th-num">CPQ</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="wd-td-empty">No campaign data available</td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const cpq = c.qualified_leads > 0 ? c.spend / c.qualified_leads : 0;
                  const cpl = c.leads > 0 ? c.spend / c.leads : 0;
                  return (
                    <tr key={c.id} className="wd-tr">
                      <td className="wd-td-name">
                        <span className="wd-campaign-name">{c.name}</span>
                        <span className="wd-campaign-platform">{c.platform}</span>
                      </td>
                      <td>{statusBadge(c.status)}</td>
                      <td className="wd-td-mono">€{c.spend.toFixed(2)}</td>
                      <td className="wd-td-mono">{c.leads.toLocaleString()}</td>
                      <td className="wd-td-mono">€{cpl.toFixed(2)}</td>
                      <td className="wd-td-mono">
                        <span className="wd-qualified-pill">{c.qualified_leads.toLocaleString()}</span>
                      </td>
                      <td className="wd-td-mono">
                        {cpq > 0 ? `€${cpq.toFixed(2)}` : <span style={{ color: 'var(--text-hint)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Component-scoped styles ─────────────────────────── */}
      <style>{`
        /* ── Root layout ── */
        .wd-root {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 28px 32px;
          background: var(--bg-primary);
          min-height: 100vh;
        }

        /* ── Page header ── */
        .wd-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .wd-page-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 4px 0 2px;
          line-height: 1.2;
        }

        .wd-page-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: var(--text-secondary);
        }

        .wd-header-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          padding-top: 6px;
        }

        /* ── KPI Strip ── */
        .wd-kpi-strip {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 0 8px;
          overflow-x: auto;
        }

        .wd-kpi-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          flex-shrink: 0;
        }

        .wd-kpi-icon {
          width: 30px;
          height: 30px;
          border-radius: var(--radius);
          background: var(--rose-gold-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--rose-gold);
          flex-shrink: 0;
        }

        .wd-kpi-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 2px;
        }

        .wd-kpi-value {
          font-family: 'DM Mono', monospace;
          font-size: 18px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1;
        }

        .wd-kpi-highlight {
          color: var(--rose-gold);
        }

        .wd-kpi-divider {
          width: 0.5px;
          height: 36px;
          background: var(--border-light);
          flex-shrink: 0;
        }

        /* ── 3-col grid ── */
        .wd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1100px) {
          .wd-grid {
            grid-template-columns: 1fr 1fr;
          }
          .wd-col-3 {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 700px) {
          .wd-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ── Column card header ── */
        .wd-col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 14px;
        }

        /* ── Metrics grid (col 1) ── */
        .wd-metrics-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
        }

        /* ── Recs card ── */
        .wd-recs-card {
          display: flex;
          flex-direction: column;
        }

        .wd-recs-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .wd-empty-recs {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 32px 16px;
          color: var(--text-muted);
          text-align: center;
        }

        .wd-empty-recs p {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: var(--text-secondary);
          margin: 0;
        }

        .wd-empty-recs span {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-muted);
        }

        /* ── Chat column (col 3) ── */
        .wd-col-3 {
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
        }

        .wd-quick-hints {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 12px 14px;
        }

        .wd-quick-hints-label {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .wd-quick-hints-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .wd-quick-hint-pill {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-secondary);
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-light);
          border-radius: 999px;
          padding: 4px 10px;
          cursor: default;
          line-height: 1.4;
        }

        /* ── Campaigns table ── */
        .wd-table-card {
          overflow: hidden;
        }

        .wd-table-wrap {
          overflow-x: auto;
          margin: 0 -1px;
        }

        .wd-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
        }

        .wd-table thead tr {
          border-bottom: 0.5px solid var(--border-light);
        }

        .wd-table th {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 8px 12px;
          text-align: left;
          white-space: nowrap;
        }

        .wd-th-num {
          text-align: right !important;
        }

        .wd-tr {
          border-bottom: 0.5px solid var(--border-light);
          transition: background var(--transition);
        }

        .wd-tr:last-child {
          border-bottom: none;
        }

        .wd-tr:hover {
          background: var(--bg-secondary);
        }

        .wd-table td {
          padding: 10px 12px;
          vertical-align: middle;
          color: var(--text-primary);
        }

        .wd-td-name {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 160px;
        }

        .wd-campaign-name {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: var(--text-primary);
        }

        .wd-campaign-platform {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 400;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .wd-td-mono {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          text-align: right;
          white-space: nowrap;
        }

        .wd-qualified-pill {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          color: var(--rose-gold-dark);
        }

        .wd-td-empty {
          text-align: center;
          padding: 32px 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

export default WholesaleDashboard;
