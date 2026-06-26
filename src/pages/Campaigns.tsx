import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ChevronDown } from 'lucide-react';
import {
  Chart,
  registerables,
  type ChartConfiguration,
  type Chart as ChartType,
} from 'chart.js';

import { getCampaigns, getBrands, getAdAccounts } from '../lib/supabase';
import { syncMetaCampaigns } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatNumber } from '../lib/benchmarks';
import { classifyObjective, GOAL_META } from '../lib/objective';
import CampaignDetailPanel from '../components/campaigns/CampaignDetailPanel';
import type { GoalType } from '../lib/objective';
import type { Campaign } from '../types';

Chart.register(...registerables);

// ─── Read CSS variable at runtime ────────────────────────────
const cssv = (n: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ─── Simulate 30-day daily series from a total ───────────────
// Uses a realistic ad-spend ramp-up curve (actual daily data unavailable)
function simulateDailySeries(total: number): number[] {
  const weights = [
    1, 1.2, 1.5, 2, 2.5, 3, 3.5, 4, 3.8, 4.2,
    4.8, 5, 4.5, 5.2, 5.5, 5.8, 5.5, 6, 6.2, 6.5,
    6, 6.5, 6.8, 7, 6.8, 7.2, 7.5, 7.8, 7.5, 8,
  ];
  const totalW = weights.reduce((s, w) => s + w, 0);
  return weights.map(w => parseFloat(((w / totalW) * total).toFixed(2)));
}

const DAYS_LABELS = Array.from({ length: 30 }, (_, i) => String(i + 1));

// ─── Status pill ─────────────────────────────────────────────
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status === 'ACTIVE';
  const isPaused = status === 'PAUSED';
  const bg    = isActive ? 'var(--green-soft)'     : isPaused ? 'var(--champagne-soft)' : 'var(--surface-2)';
  const color = isActive ? 'var(--green)'           : isPaused ? 'var(--champagne)'      : 'var(--text-3)';
  const dot   = isActive ? 'var(--green)'           : isPaused ? 'var(--champagne)'      : 'var(--text-3)';
  const label = isActive ? 'Active' : isPaused ? 'Paused' : status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 11px', borderRadius: 30,
      background: bg, color,
      fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--font-ui)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: dot, flexShrink: 0,
        ...(isActive ? { boxShadow: '0 0 0 3px var(--green-soft)' } : {}),
      }} />
      {label}
    </span>
  );
};

// ─── Conversion cell (goal-adaptive) ─────────────────────────
const ConvCell: React.FC<{ campaign: Campaign; goal: GoalType }> = ({ campaign, goal }) => {
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const cellStyle = { padding: '16px 22px', borderBottom: '1px solid var(--border-soft)', textAlign: 'right' as const };
  const numStyle  = { fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 500 };
  const subStyle  = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 };

  switch (goal) {
    case 'sales':
      return (
        <td style={cellStyle}>
          <div style={{ ...numStyle, color: campaign.roas >= 3 ? 'var(--green)' : campaign.roas >= 1.5 ? 'var(--champagne)' : 'var(--red)' }}>
            {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>}
          </div>
          <div style={subStyle}>{campaign.purchases > 0 ? `${campaign.purchases} purch.` : 'no sales'}</div>
        </td>
      );
    case 'leads':
      return (
        <td style={cellStyle}>
          <div style={{ ...numStyle, color: 'var(--accent)' }}>
            {campaign.leads > 0 ? `${formatNumber(campaign.leads)} leads` : <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>}
          </div>
          <div style={subStyle}>{campaign.cpl > 0 ? `CPL ${formatCurrency(campaign.cpl)}` : 'no leads'}</div>
        </td>
      );
    case 'traffic':
      return (
        <td style={cellStyle}>
          <div style={{ ...numStyle, color: 'var(--blue)' }}>
            {campaign.clicks > 0 ? `${formatNumber(campaign.clicks)} clicks` : <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>}
          </div>
          <div style={subStyle}>{ctr > 0 ? `CTR ${ctr.toFixed(2)}%` : 'no clicks'}</div>
        </td>
      );
    case 'awareness':
      return (
        <td style={cellStyle}>
          <div style={{ ...numStyle, color: 'var(--blue)' }}>
            {campaign.reach > 0 ? `${formatNumber(campaign.reach)} reach` : <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>}
          </div>
          <div style={subStyle}>{campaign.frequency > 0 ? `${campaign.frequency.toFixed(1)}x freq.` : ''}</div>
        </td>
      );
    default:
      return (
        <td style={cellStyle}>
          <span style={{ ...numStyle, color: 'var(--text-3)', fontWeight: 400 }}>
            {campaign.clicks > 0 ? formatNumber(campaign.clicks) + ' clicks' : '—'}
          </span>
        </td>
      );
  }
};

// ─── Colored KPI card (design system §28) ────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  icon: string;
  kcVar: string;          // CSS variable name e.g. '--accent'
  barPct: number;         // 0–100
  trendUp?: boolean;
  trendPct?: string;
  subText?: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, kcVar, barPct, trendUp, trendPct, subText }) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '17px 18px',
    boxShadow: 'var(--shadow)',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Left color stripe */}
    <div style={{
      position: 'absolute', top: 0, left: 0,
      width: 3, height: '100%',
      background: `var(${kcVar})`,
    }} />

    {/* Label row */}
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 10.5, letterSpacing: 1, color: 'var(--text-2)',
      marginBottom: 9, textTransform: 'uppercase',
      fontFamily: 'var(--font-ui)', fontWeight: 500,
    }}>
      <span>{label}</span>
      {/* Icon from lucide substitute — using CSS text */}
      <span style={{ fontSize: 15, color: `var(${kcVar})`, lineHeight: 1 }}>{icon}</span>
    </div>

    {/* Value */}
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500,
      color: 'var(--text)', lineHeight: 1,
    }}>
      {value}
    </div>

    {/* Progress bar */}
    <div style={{
      height: 4, background: 'var(--border-soft)',
      borderRadius: 4, margin: '13px 0 8px', overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', borderRadius: 4,
        background: `var(${kcVar})`,
        width: `${Math.min(100, Math.max(1, barPct))}%`,
        transition: 'width 0.6s ease',
      }} />
    </div>

    {/* Trend / sub-text */}
    <div style={{
      fontSize: 11, color: 'var(--text-3)',
      display: 'flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-ui)',
    }}>
      {trendPct !== undefined && (
        <span style={{ color: trendUp ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
          {trendUp ? '▲' : '▼'} {trendPct}
        </span>
      )}
      <span>{subText}</span>
    </div>
  </div>
);

// ─── Chart panel (§29) ───────────────────────────────────────
interface TrendPanelProps {
  totalSpend: number;
  totalLeads: number;
  totalImpressions: number;
}
const TrendPanel: React.FC<TrendPanelProps> = ({ totalSpend, totalLeads, totalImpressions }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<ChartType | null>(null);

  const buildChart = useCallback(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const accent = cssv('--accent');
    const green  = cssv('--green');
    const text2  = cssv('--text-2');
    const text3  = cssv('--text-3');
    const grid   = cssv('--grid');
    const surface = cssv('--surface');
    const border  = cssv('--border');
    const textC   = cssv('--text');

    const ctx = canvasRef.current.getContext('2d')!;
    const g1  = ctx.createLinearGradient(0, 0, 0, 240);
    g1.addColorStop(0, accent + '55');
    g1.addColorStop(1, accent + '05');
    const g2  = ctx.createLinearGradient(0, 0, 0, 240);
    g2.addColorStop(0, green + '40');
    g2.addColorStop(1, green + '03');

    const spendData = simulateDailySeries(totalSpend);
    const leadsData = simulateDailySeries(totalLeads);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: DAYS_LABELS,
        datasets: [
          {
            label: 'Spend',
            data: spendData,
            borderColor: accent,
            backgroundColor: g1,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: accent,
            yAxisID: 'y',
          },
          {
            label: 'Leads',
            data: leadsData,
            borderColor: green,
            backgroundColor: g2,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
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
            titleColor: textC,
            bodyColor: text2,
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: text3, maxTicksLimit: 7, font: { family: "'JetBrains Mono',monospace", size: 10.5 } },
          },
          y: {
            position: 'left',
            grid: { color: grid },
            ticks: { color: text3, callback: (v) => '€' + v, font: { family: "'JetBrains Mono',monospace", size: 10.5 } },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            ticks: { color: text3, font: { family: "'JetBrains Mono',monospace", size: 10.5 } },
          },
        },
      },
    };

    Chart.defaults.font.family = "'JetBrains Mono','Inter',monospace";
    Chart.defaults.font.size   = 10.5;
    Chart.defaults.color       = text2;

    chartRef.current = new Chart(ctx, config);
  }, [totalSpend, totalLeads]);

  useEffect(() => {
    buildChart();
    const observer = new MutationObserver(() => { setTimeout(buildChart, 60); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { observer.disconnect(); chartRef.current?.destroy(); };
  }, [buildChart]);

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, boxShadow: 'var(--shadow)', padding: '20px 22px',
    }}>
      {/* Panel header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, letterSpacing: -0.2 }}>
          Performance · last 30 days
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { color: 'var(--accent)', label: 'Spend' },
            { color: 'var(--green)', label: 'Leads' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-2)', fontFamily: 'var(--font-ui)' }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 30, marginBottom: 8 }}>
        {[
          { label: 'TOTAL SPEND',   value: formatCurrency(totalSpend),   color: 'var(--accent)' },
          { label: 'TOTAL LEADS',   value: String(totalLeads),           color: 'var(--green)'  },
          { label: 'IMPRESSIONS',   value: fmt(totalImpressions),        color: 'var(--blue)'   },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10.5, letterSpacing: 1, color: 'var(--text-2)', marginBottom: 5, fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart canvas */}
      <div style={{ position: 'relative', height: 240, marginTop: 6 }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8, fontFamily: 'var(--font-ui)', fontStyle: 'italic' }}>
        * Daily distribution estimated from campaign totals. Live daily data coming soon.
      </div>
    </div>
  );
};

// ─── Donut panel (§29.2) ────────────────────────────────────
interface DonutPanelProps { campaigns: Campaign[] }
const DonutPanel: React.FC<DonutPanelProps> = ({ campaigns }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<ChartType | null>(null);

  const activeSpenders = useMemo(() =>
    campaigns.filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend),
    [campaigns]
  );
  const totalSpend = useMemo(() => campaigns.reduce((s, c) => s + c.spend, 0), [campaigns]);

  const SERIES_COLORS = [
    '--accent', '--champagne', '--blue', '--amber', '--green',
  ];

  const buildChart = useCallback(() => {
    if (!canvasRef.current || activeSpenders.length === 0) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const surface = cssv('--surface');
    const border  = cssv('--border');
    const text2   = cssv('--text-2');
    const textC   = cssv('--text');
    const text3   = cssv('--text-3');

    const colors = activeSpenders.map((_, i) => cssv(SERIES_COLORS[i % SERIES_COLORS.length]));
    // Add a placeholder slice if all zero
    const data   = activeSpenders.length > 0
      ? activeSpenders.map(c => c.spend)
      : [0.001];

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: activeSpenders.map(c => c.name),
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: surface,
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: surface,
            borderColor: border,
            borderWidth: 1,
            titleColor: textC,
            bodyColor: text2,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (c) => ` €${(c.raw as number).toLocaleString('en-EU', { minimumFractionDigits: 2 })}`,
            },
          },
        },
      },
    };

    Chart.defaults.color = text3;
    chartRef.current = new Chart(canvasRef.current.getContext('2d')!, config);
  }, [activeSpenders]);

  useEffect(() => {
    buildChart();
    const observer = new MutationObserver(() => { setTimeout(buildChart, 60); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { observer.disconnect(); chartRef.current?.destroy(); };
  }, [buildChart]);

  const pct = (spend: number) => totalSpend > 0 ? ((spend / totalSpend) * 100).toFixed(0) + '%' : '0%';

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, boxShadow: 'var(--shadow)', padding: '20px 22px',
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, letterSpacing: -0.2 }}>
          Spend by campaign
        </div>
      </div>

      {/* Donut canvas with center text */}
      <div style={{ position: 'relative', height: 200, margin: '10px 0' }}>
        <canvas ref={canvasRef} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
            color: 'var(--accent)', lineHeight: 1,
          }}>
            {formatCurrency(totalSpend)}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-ui)' }}>
            TOTAL
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 6 }}>
        {activeSpenders.map((c, i) => (
          <span key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11.5, color: 'var(--text-2)', fontFamily: 'var(--font-ui)',
          }}>
            <span style={{
              width: 9, height: 9, borderRadius: 3,
              background: `var(${SERIES_COLORS[i % SERIES_COLORS.length]})`,
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.name}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text)', flexShrink: 0 }}>
              {formatCurrency(c.spend)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', flexShrink: 0 }}>
              · {pct(c.spend)}
            </span>
          </span>
        ))}
        {campaigns.filter(c => c.spend === 0).length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--text-3)', display: 'inline-block', flexShrink: 0 }} />
            {campaigns.filter(c => c.spend === 0).length} draft / inactive — €0
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Campaign table row ───────────────────────────────────────
const CampaignRow: React.FC<{ campaign: Campaign; showBrand?: string; onClick: () => void; isLast: boolean }> = ({
  campaign, showBrand, onClick, isLast,
}) => {
  const [hovered, setHovered] = useState(false);
  const goal = classifyObjective(campaign.objective);
  const meta = GOAL_META[goal];
  const cpm  = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;

  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        background: hovered ? 'var(--surface-hover)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {/* Campaign name */}
      <td style={{
        padding: '16px 22px',
        borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
        maxWidth: 0, overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: campaign.spend > 0 ? 'var(--text)' : 'var(--text-2)',
          fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {campaign.name}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', marginTop: 4,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{
            background: meta.bg, color: meta.color,
            borderRadius: 4, padding: '1px 6px',
            border: `0.5px solid ${meta.color}22`,
            fontFamily: 'var(--font-ui)', fontSize: 9.5,
          }}>
            {meta.emoji} {meta.label}
          </span>
          {campaign.impressions > 0 && (
            <span>{formatNumber(campaign.impressions)} impr.</span>
          )}
          {showBrand && <span>· {showBrand}</span>}
        </div>
      </td>

      {/* Status */}
      <td style={{
        padding: '16px 22px',
        borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
      }}>
        <StatusPill status={campaign.status} />
      </td>

      {/* Spend */}
      <td style={{
        padding: '16px 22px', textAlign: 'right',
        borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 500,
          color: campaign.spend > 0 ? 'var(--text)' : 'var(--text-3)',
        }}>
          {campaign.spend > 0 ? formatCurrency(campaign.spend) : '—'}
        </span>
      </td>

      {/* CPM */}
      <td style={{
        padding: '16px 22px', textAlign: 'right',
        borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13.5,
          color: cpm > 0 ? 'var(--text-2)' : 'var(--text-3)',
          fontWeight: cpm > 0 ? 500 : 400,
        }}>
          {cpm > 0 ? formatCurrency(cpm) : '—'}
        </span>
      </td>

      {/* Conversion (goal-adaptive) */}
      <ConvCell campaign={campaign} goal={goal} />
    </tr>
  );
};

// ─── Main Campaigns page ────────────────────────────────────
const Campaigns: React.FC = () => {
  const { user }        = useAuth();
  const queryClient     = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [goalFilter,    setGoalFilter]    = useState<GoalType | 'all'>('all');

  const { data: brands = [] } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn:  () => getBrands(user!.id),
    enabled:  !!user,
  });
  const { data: adAccounts = [] } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn:  () => getAdAccounts(user!.id),
    enabled:  !!user,
  });
  const { data: allCampaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', 'all', brands.map(b => b.id).join(',')],
    queryFn:  async () => {
      const res = await Promise.all(brands.map(b => getCampaigns(b.id)));
      return res.flat();
    },
    enabled: brands.length > 0,
  });

  const brandCampaigns = useMemo(() =>
    selectedBrand === 'all' ? allCampaigns : allCampaigns.filter(c => c.brand_id === selectedBrand),
    [allCampaigns, selectedBrand]
  );
  const campaigns = useMemo(() =>
    goalFilter === 'all' ? brandCampaigns : brandCampaigns.filter(c => classifyObjective(c.objective) === goalFilter),
    [brandCampaigns, goalFilter]
  );

  const goalCounts = useMemo(() => {
    const counts: Record<GoalType, number> = { sales: 0, leads: 0, traffic: 0, awareness: 0, engagement: 0, unknown: 0 };
    brandCampaigns.forEach(c => { counts[classifyObjective(c.objective)]++; });
    return counts;
  }, [brandCampaigns]);

  const metaAccounts  = adAccounts.filter(a => a.platform === 'meta');
  const getBrandName  = (id: string) => brands.find(b => b.id === id)?.name || '';

  // ─── KPI aggregations ─────────────────────────────────────
  const totalSpend  = useMemo(() => campaigns.reduce((s, c) => s + c.spend,       0), [campaigns]);
  const totalLeads  = useMemo(() => campaigns.reduce((s, c) => s + c.leads,       0), [campaigns]);
  const totalImpr   = useMemo(() => campaigns.reduce((s, c) => s + c.impressions, 0), [campaigns]);
  const totalQual   = useMemo(() => campaigns.reduce((s, c) => s + c.qualified_leads, 0), [campaigns]);
  const activeCnt   = useMemo(() => campaigns.filter(c => c.status === 'ACTIVE').length, [campaigns]);
  const avgCpl      = totalLeads > 0 ? totalSpend / totalLeads : 0;

  // Bar percentages (relative to campaign max, or reference values)
  const spendPct  = Math.min(100, totalSpend  > 0 ? 75 : 0);   // 75% → "in budget"
  const leadsPct  = Math.min(100, totalLeads  > 0 ? (totalLeads / Math.max(totalLeads, 1000)) * 100 : 0);
  const cplPct    = avgCpl > 0 ? Math.max(10, 100 - (avgCpl / 50) * 100) : 0; // inverse: lower CPL = taller bar
  const qualPct   = totalLeads > 0 ? (totalQual / totalLeads) * 100 : 0;

  // ─── Sync ─────────────────────────────────────────────────
  const handleSync = async () => {
    if (!metaAccounts.length) { setSyncMsg('Connect a Meta Ads account first'); return; }
    setSyncing(true); setSyncMsg('');
    try {
      const brand = selectedBrand === 'all' ? brands[0] : brands.find(b => b.id === selectedBrand);
      if (!brand) { setSyncMsg('Select a brand first'); return; }
      await syncMetaCampaigns(brand.id, metaAccounts[0].id);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSyncMsg('Synced ✓');
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally { setSyncing(false); }
  };

  // ─── Skeleton loading ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              background: 'var(--surface-2)', borderRadius: 14, height: 120,
              backgroundImage: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-hover) 50%, var(--surface-2) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.8s infinite',
            }} />
          ))}
        </div>
        <div style={{ height: 320, background: 'var(--surface-2)', borderRadius: 16,
          backgroundImage: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-hover) 50%, var(--surface-2) 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.8s infinite',
        }} />
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* ── Page header ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, letterSpacing: 2, color: 'var(--text-3)', marginBottom: 11, fontFamily: 'var(--font-ui)', fontWeight: 500, textTransform: 'uppercase' }}>
            <span style={{ display: 'inline-block', width: 22, height: 1, background: 'var(--text-3)' }} />
            Campaign Intelligence
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: -0.5, lineHeight: 1 }}>
            Campaigns
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, color: 'var(--text-2)', fontSize: 13, marginTop: 9, fontFamily: 'var(--font-ui)', flexWrap: 'wrap' }}>
            <span>{activeCnt} active</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block' }} />
            <span>{campaigns.length} total</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block' }} />
            {metaAccounts.length > 0
              ? <span style={{ color: 'var(--accent)' }}>{metaAccounts.length} Meta account{metaAccounts.length > 1 ? 's' : ''}</span>
              : <span style={{ color: 'var(--red)' }}>No account connected</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {syncMsg && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{syncMsg}</span>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSync}
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 7, boxShadow: 'var(--shadow)' }}
          >
            <RefreshCw size={14} strokeWidth={1.5} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Meta'}
          </button>
          <a
            href="https://adsmanager.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', boxShadow: 'var(--shadow)' }}
          >
            Ads Manager
          </a>
        </div>
      </div>

      {/* ── Filters bar ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {brands.length > 1 && (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              style={{
                appearance: 'none', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 9,
                padding: '8px 32px 8px 12px',
                fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-2)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="all">All Brands</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={12} style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none',
            }} />
          </div>
        )}

        {/* Goal filter pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(['all', 'sales', 'leads', 'traffic', 'awareness', 'engagement'] as const).map(g => {
            const count   = g === 'all' ? brandCampaigns.length : goalCounts[g as GoalType];
            if (g !== 'all' && count === 0) return null;
            const goalMeta  = g === 'all' ? null : GOAL_META[g as GoalType];
            const isActive  = goalFilter === g;
            return (
              <button
                key={g}
                onClick={() => setGoalFilter(g as GoalType | 'all')}
                style={{
                  padding: '6px 13px',
                  borderRadius: 30,
                  fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  transition: 'all 0.15s',
                  background: isActive ? (goalMeta?.bg ?? 'var(--accent-soft)') : 'var(--surface)',
                  color:      isActive ? (goalMeta?.color ?? 'var(--accent)')   : 'var(--text-2)',
                  borderColor: isActive ? (goalMeta?.color ?? 'var(--accent)')  : 'var(--border)',
                }}
              >
                {goalMeta ? `${goalMeta.emoji} ${g.charAt(0).toUpperCase() + g.slice(1)} ${count}` : `All ${count}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPI Row (§28) — 4 colored cards ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        <KpiCard
          label="TOTAL SPEND"
          value={formatCurrency(totalSpend)}
          icon="₠"
          kcVar="--accent"
          barPct={spendPct}
          trendUp={true}
          trendPct={totalSpend > 0 ? undefined : undefined}
          subText={`${activeCnt} active campaign${activeCnt !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label="TOTAL LEADS"
          value={formatNumber(totalLeads)}
          icon="◎"
          kcVar="--green"
          barPct={leadsPct}
          trendUp={true}
          trendPct={totalLeads > 0 ? undefined : undefined}
          subText={totalLeads > 0 ? `avg CPL ${formatCurrency(avgCpl)}` : 'no leads yet'}
        />
        <KpiCard
          label="AVG CPL"
          value={avgCpl > 0 ? formatCurrency(avgCpl) : '—'}
          icon="◈"
          kcVar="--blue"
          barPct={cplPct}
          subText={avgCpl > 0 ? `${totalLeads} total leads` : 'awaiting leads data'}
        />
        <KpiCard
          label="QUALIFIED"
          value={formatNumber(totalQual)}
          icon="✦"
          kcVar="--amber"
          barPct={qualPct}
          subText={totalQual > 0 ? `${qualPct.toFixed(0)}% of leads` : 'awaiting qualification'}
        />
      </div>

      {/* ── Chart panels (§29) — trend + donut ──────────── */}
      {campaigns.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 14, marginBottom: 16 }}>
          <TrendPanel
            totalSpend={totalSpend}
            totalLeads={totalLeads}
            totalImpressions={totalImpr}
          />
          <DonutPanel campaigns={campaigns} />
        </div>
      )}

      {/* ── Campaign table (§11) ─────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {campaigns.length === 0 ? (
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
              No campaigns yet
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
              Connect your Meta Ads account to import campaigns.
            </div>
            <button className="btn btn-primary" onClick={handleSync}>
              Sync Meta
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['CAMPAIGN', 'STATUS', 'SPEND', 'CPM', 'CONVERSION'].map((h, i) => (
                  <th key={h} style={{
                    padding: '13px 22px', textAlign: i >= 2 ? 'right' : 'left',
                    fontSize: 10, letterSpacing: 1.2, color: 'var(--text-3)',
                    fontFamily: 'var(--font-ui)', fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, idx) => (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  showBrand={brands.length > 1 ? getBrandName(c.brand_id) : undefined}
                  onClick={() => setSelectedCampaign(c)}
                  isLast={idx === campaigns.length - 1}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detail panel ─────────────────────────────────── */}
      {selectedCampaign && (
        <CampaignDetailPanel
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
};

export default Campaigns;
