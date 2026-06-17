import React, { useEffect, useState } from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatNumber } from '../../lib/benchmarks';
import { classifyObjective, GOAL_META } from '../../lib/objective';
import type { Campaign } from '../../types';

// ─── Benchmark data per objective ─────────────────────────────
const BENCHMARKS: Record<string, { cpl?: number; cpm?: number; ctr?: number; roas?: number; cpc?: number }> = {
  leads:     { cpl: 32, cpm: 11.2, ctr: 2.1, cpc: 1.8 },
  sales:     { roas: 3.5, cpm: 14, ctr: 1.8 },
  traffic:   { ctr: 2.5, cpm: 8, cpc: 0.6 },
  awareness: { cpm: 6, ctr: 1.2 },
  default:   { cpm: 11, ctr: 1.8 },
};

// ─── Metric comparison card ────────────────────────────────────
const MetricVsBenchmark: React.FC<{
  label: string;
  value: number;
  benchmark: number;
  unit: string;
  higherIsBetter: boolean;
  format?: 'currency' | 'number' | 'percent' | 'multiplier';
}> = ({ label, value, benchmark, unit, higherIsBetter, format = 'currency' }) => {
  if (value <= 0) return null;

  const diff   = ((value - benchmark) / benchmark) * 100;
  const better = higherIsBetter ? diff > 0 : diff < 0;
  const neutral = Math.abs(diff) < 5;

  const color  = neutral ? 'var(--text-secondary)' : better ? '#4ade80' : '#f87171';
  const Icon   = neutral ? Minus : better ? TrendingUp : TrendingDown;

  const fmt = (v: number) => {
    if (format === 'currency') return formatCurrency(v);
    if (format === 'number')   return formatNumber(v);
    if (format === 'percent')  return `${v.toFixed(2)}%`;
    if (format === 'multiplier') return `${v.toFixed(2)}x`;
    return String(v);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-primary)' }}>
          {fmt(value)}
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)' }}>{unit}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={10} style={{ color }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color }}>
          {Math.abs(diff).toFixed(0)}% {better ? 'better' : 'worse'} than benchmark
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)' }}>
          (bench: {fmt(benchmark)})
        </span>
      </div>
    </div>
  );
};

// ─── AI Analysis Section ──────────────────────────────────────
const AIAnalysis: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const [loading, setLoading]   = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError]       = useState('');

  const goal  = classifyObjective(campaign.objective);
  const cpm   = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;
  const ctr   = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const bench = BENCHMARKS[goal] || BENCHMARKS.default;

  const generateAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const campaignContext = `
Campaign: "${campaign.name}"
Status: ${campaign.status}
Objective: ${campaign.objective}
Spend: ${formatCurrency(campaign.spend)}
Impressions: ${formatNumber(campaign.impressions)}
CPM: ${formatCurrency(cpm)}
CTR: ${ctr.toFixed(2)}%
${campaign.leads > 0 ? `Leads: ${campaign.leads} | CPL: ${formatCurrency(campaign.cpl)}` : ''}
${campaign.purchases > 0 ? `Purchases: ${campaign.purchases} | ROAS: ${campaign.roas.toFixed(2)}x` : ''}
${campaign.revenue > 0 ? `Revenue: ${formatCurrency(campaign.revenue)}` : ''}

Industry benchmarks for ${goal}:
${bench.cpl ? `CPL benchmark: €${bench.cpl}` : ''}
${bench.cpm ? `CPM benchmark: €${bench.cpm}` : ''}
${bench.ctr ? `CTR benchmark: ${bench.ctr}%` : ''}
${bench.roas ? `ROAS benchmark: ${bench.roas}x` : ''}
      `.trim();

      const prompt = `You are a senior Meta Ads strategist analyzing a campaign for a beauty brand.

${campaignContext}

Give a concise, actionable analysis in 3 parts:
1. **Performance Summary** (1-2 sentences on what's working or not)
2. **Key Issues** (bullet points of specific problems if any)
3. **Next Actions** (2-3 concrete recommendations)

Be specific with numbers. Speak like a consultant, not a chatbot.`;

      const res = await fetch(`${supabaseUrl}/functions/v1/claude-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Analysis failed');

      setAnalysis(body.content?.[0]?.text || body.message || body.response || JSON.stringify(body));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} style={{ color: 'var(--rose-gold)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>
            AI Analysis
          </span>
        </div>
        {!analysis && !loading && (
          <button
            onClick={generateAnalysis}
            style={{
              background: 'linear-gradient(135deg, var(--rose-gold) 0%, #a0554a 100%)',
              border: 'none', borderRadius: 5, padding: '6px 14px',
              fontFamily: 'var(--font-sans)', fontSize: 10, color: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              transition: 'opacity 0.2s',
            }}
          >
            <Zap size={10} />
            Generate Analysis
          </button>
        )}
      </div>

      {loading && (
        <div style={{
          background: 'rgba(196,131,106,0.06)',
          border: '0.5px solid rgba(196,131,106,0.2)',
          borderRadius: 8, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rose-gold)', animation: 'pulse 1s infinite' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
              Analyzing campaign performance…
            </span>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '0.5px solid rgba(248,113,113,0.2)',
          borderRadius: 8, padding: 12,
          fontFamily: 'var(--font-sans)', fontSize: 11, color: '#f87171',
        }}>
          {error}
        </div>
      )}

      {analysis && (
        <div style={{
          background: 'rgba(196,131,106,0.04)',
          border: '0.5px solid rgba(196,131,106,0.15)',
          borderRadius: 8, padding: 16,
        }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)',
            lineHeight: 1.7, whiteSpace: 'pre-wrap',
          }}>
            {analysis.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{part.slice(2, -2)}</strong>
                : part
            )}
          </div>
          <button
            onClick={() => { setAnalysis(''); setError(''); }}
            style={{
              background: 'transparent', border: '0.5px solid var(--app-border)',
              borderRadius: 4, padding: '4px 10px', marginTop: 10,
              fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)',
              cursor: 'pointer',
            }}
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────
interface Props {
  campaign: Campaign | null;
  onClose: () => void;
}

const CampaignDetailPanel: React.FC<Props> = ({ campaign, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (campaign) {
      setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
    }
  }, [campaign]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!campaign) return null;

  const goal = classifyObjective(campaign.objective);
  const meta = GOAL_META[goal];
  const cpm  = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;
  const ctr  = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const bench = BENCHMARKS[goal] || BENCHMARKS.default;

  const statusColor = campaign.status === 'ACTIVE'  ? '#4ade80'
                    : campaign.status === 'PAUSED'   ? '#fbbf24'
                    : 'var(--text-hint)';

  const metaUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${campaign.ad_account_id}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.4)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 90vw)',
          background: 'var(--app-surface)',
          borderLeft: '0.5px solid var(--app-border)',
          zIndex: 51,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '0.5px solid var(--app-border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 400,
                background: meta.bg, color: meta.color,
                borderRadius: 3, padding: '1px 6px', border: `0.5px solid ${meta.color}22`,
              }}>
                {meta.emoji} {meta.label}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 8,
                color: statusColor, textTransform: 'uppercase',
              }}>
                ● {campaign.status}
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 400,
              color: 'var(--text-primary)', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {campaign.name}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <a
              href={metaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 4,
                border: '0.5px solid var(--app-border)',
                fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-secondary)',
                textDecoration: 'none', cursor: 'pointer',
              }}
            >
              <ExternalLink size={10} />
              Ads Manager
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: '0.5px solid var(--app-border)',
                borderRadius: 4, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-hint)',
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Main KPIs */}
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Key Metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'rgba(196,131,106,0.06)', border: '0.5px solid rgba(196,131,106,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Total Spend</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--rose-gold)', marginTop: 4 }}>
                  {formatCurrency(campaign.spend)}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Impressions</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
                  {formatNumber(campaign.impressions)}
                </div>
              </div>
              {campaign.leads > 0 && (
                <>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Total Leads</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: '#a78bfa', marginTop: 4 }}>
                      {formatNumber(campaign.leads)}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Cost per Lead</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, marginTop: 4,
                      color: campaign.cpl < (bench.cpl || 32) ? '#4ade80' : campaign.cpl < (bench.cpl || 32) * 1.5 ? '#fbbf24' : '#f87171',
                    }}>
                      {formatCurrency(campaign.cpl)}
                    </div>
                  </div>
                </>
              )}
              {campaign.purchases > 0 && (
                <>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>ROAS</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, marginTop: 4,
                      color: campaign.roas >= 3 ? '#4ade80' : campaign.roas >= 1.5 ? '#fbbf24' : '#f87171',
                    }}>
                      {campaign.roas.toFixed(2)}x
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Revenue</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: '#4ade80', marginTop: 4 }}>
                      {formatCurrency(campaign.revenue)}
                    </div>
                  </div>
                </>
              )}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>CPM</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {cpm > 0 ? formatCurrency(cpm) : '—'}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>CTR</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {ctr > 0 ? `${ctr.toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Benchmark comparisons */}
          {(campaign.spend > 0) && (
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                vs Industry Benchmark
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {campaign.cpl > 0 && bench.cpl && (
                  <MetricVsBenchmark label="CPL" value={campaign.cpl} benchmark={bench.cpl} unit="€/lead" higherIsBetter={false} format="currency" />
                )}
                {campaign.roas > 0 && bench.roas && (
                  <MetricVsBenchmark label="ROAS" value={campaign.roas} benchmark={bench.roas} unit="x" higherIsBetter={true} format="multiplier" />
                )}
                {cpm > 0 && bench.cpm && (
                  <MetricVsBenchmark label="CPM" value={cpm} benchmark={bench.cpm} unit="€/1k" higherIsBetter={false} format="currency" />
                )}
                {ctr > 0 && bench.ctr && (
                  <MetricVsBenchmark label="CTR" value={ctr} benchmark={bench.ctr} unit="%" higherIsBetter={true} format="percent" />
                )}
              </div>
            </div>
          )}

          {/* Quick signals */}
          {campaign.spend > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Performance Signals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {campaign.cpl > 0 && bench.cpl && campaign.cpl < bench.cpl * 0.8 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.15)', borderRadius: 6 }}>
                    <CheckCircle size={12} style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      Excellent CPL — {Math.round((1 - campaign.cpl / bench.cpl) * 100)}% below benchmark. Consider scaling budget.
                    </span>
                  </div>
                )}
                {campaign.cpl > 0 && bench.cpl && campaign.cpl > bench.cpl * 1.3 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(251,191,36,0.06)', border: '0.5px solid rgba(251,191,36,0.15)', borderRadius: 6 }}>
                    <AlertTriangle size={12} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      CPL is {Math.round((campaign.cpl / bench.cpl - 1) * 100)}% above benchmark. Test new creatives or refine audience.
                    </span>
                  </div>
                )}
                {ctr > 0 && bench.ctr && ctr < bench.ctr * 0.7 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(251,191,36,0.06)', border: '0.5px solid rgba(251,191,36,0.15)', borderRadius: 6 }}>
                    <AlertTriangle size={12} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      CTR of {ctr.toFixed(2)}% is below benchmark ({bench.ctr}%). Creative refresh recommended.
                    </span>
                  </div>
                )}
                {campaign.status === 'PAUSED' && campaign.spend === 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
                    <Minus size={12} style={{ color: 'var(--text-hint)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      Campaign paused — no spend data available.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <AIAnalysis campaign={campaign} />

          {/* Campaign details */}
          <div style={{ borderTop: '0.5px solid var(--app-border)', paddingTop: 16 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['Campaign ID', campaign.campaign_id_external],
                ['Last Sync', new Date(campaign.synced_at).toLocaleString()],
                ['Date Start', campaign.date_start ? new Date(campaign.date_start).toLocaleDateString() : '—'],
                ['Budget (Daily)', campaign.budget_daily ? formatCurrency(campaign.budget_daily) : '—'],
                ['Budget (Lifetime)', campaign.budget_lifetime ? formatCurrency(campaign.budget_lifetime) : '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-hint)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CampaignDetailPanel;
