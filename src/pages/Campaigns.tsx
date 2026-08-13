import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ChevronDown, CalendarDays } from 'lucide-react';
import {
  Chart,
  registerables,
  type ChartConfiguration,
  type Chart as ChartType,
} from 'chart.js';

import { getCampaigns, getBrands, getAdAccounts, getDailyKpis, getDailyCampaignStats, checkHasDailyStats } from '../lib/supabase';
import type { DailyKpiResult, CampaignRangeStats } from '../lib/supabase';
import { syncMetaCampaigns } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';
import { useBrand } from '../contexts/BrandContext';
import { formatCurrency, formatNumber } from '../lib/benchmarks';
import { classifyObjective, GOAL_META } from '../lib/objective';
import { resolvePrimaryConversion } from '../lib/conversions';
import CampaignDetailPanel from '../components/campaigns/CampaignDetailPanel';
import { exportCampaignsCsv } from '../lib/exportCsv';
import type { GoalType } from '../lib/objective';
import type { Campaign } from '../types';

Chart.register(...registerables);

// ─── Read CSS variable at runtime ────────────────────────────
const cssv = (n: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ─── Date range helpers ──────────────────────────────────────
export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'last_month' | 'custom';

const isoDate = (d: Date) => d.toISOString().split('T')[0];

export function resolvePreset(preset: DatePreset, customFrom: string, customTo: string): { from: string; to: string; label: string } {
  const now  = new Date();
  const zero = (d: Date) => { d.setHours(0, 0, 0, 0); return d; };
  switch (preset) {
    case 'today': {
      const d = isoDate(zero(now));
      return { from: d, to: d, label: 'Today' };
    }
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1); zero(y);
      const d = isoDate(y);
      return { from: d, to: d, label: 'Yesterday' };
    }
    case '7d': {
      const f = new Date(now); f.setDate(f.getDate() - 6); zero(f);
      return { from: isoDate(f), to: isoDate(zero(new Date(now))), label: 'Last 7 days' };
    }
    case '30d': {
      const f = new Date(now); f.setDate(f.getDate() - 29); zero(f);
      return { from: isoDate(f), to: isoDate(zero(new Date(now))), label: 'Last 30 days' };
    }
    case 'month': {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: isoDate(f), to: isoDate(zero(new Date(now))), label: 'This month' };
    }
    case 'last_month': {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: isoDate(f), to: isoDate(t), label: 'Last month' };
    }
    case 'custom':
      return { from: customFrom || isoDate(new Date(now.setDate(now.getDate() - 29))), to: customTo || isoDate(new Date()), label: `${customFrom} → ${customTo}` };
  }
}

// ─── DateRangeBar component ───────────────────────────────────
interface DateRangeBarProps {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  onPreset: (p: DatePreset) => void;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
}
const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today',      label: 'Today'      },
  { id: 'yesterday',  label: 'Yesterday'  },
  { id: '7d',         label: '7 days'     },
  { id: '30d',        label: '30 days'    },
  { id: 'month',      label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'custom',     label: 'Custom'     },
];
const DateRangeBar: React.FC<DateRangeBarProps> = ({ preset, customFrom, customTo, onPreset, onCustomFrom, onCustomTo }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
    <CalendarDays size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
    {PRESETS.map(({ id, label }) => (
      <button
        key={id}
        onClick={() => onPreset(id)}
        style={{
          padding: '5px 11px', borderRadius: 20, fontSize: 11.5,
          fontFamily: 'var(--font-ui)', fontWeight: 500, cursor: 'pointer',
          border: '1px solid', transition: 'all 0.13s',
          background: preset === id ? 'var(--accent)'      : 'var(--surface)',
          color:      preset === id ? '#fff'               : 'var(--text-2)',
          borderColor: preset === id ? 'var(--accent)'     : 'var(--border)',
        }}
      >
        {label}
      </button>
    ))}
    {preset === 'custom' && (
      <>
        <input
          type="date"
          value={customFrom}
          onChange={e => onCustomFrom(e.target.value)}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11.5, padding: '4px 8px',
            border: '1px solid var(--border)', borderRadius: 6,
            background: 'var(--surface)', color: 'var(--text-2)', outline: 'none',
          }}
        />
        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>→</span>
        <input
          type="date"
          value={customTo}
          onChange={e => onCustomTo(e.target.value)}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11.5, padding: '4px 8px',
            border: '1px solid var(--border)', borderRadius: 6,
            background: 'var(--surface)', color: 'var(--text-2)', outline: 'none',
          }}
        />
      </>
    )}
  </div>
);

// ─── Simulate 30-day daily series from a total ───────────────
// Kept as fallback when campaign_daily_stats has no data for selected range
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

// ─── Results cell — shows the event the campaign is OPTIMIZING for ────────────────────────
// Primary: campaign.conversion_event (from Meta's promoted_object.custom_event_type)
// 'Multiple' = campaign has adsets with different conversion goals (mirrors Meta behavior)
// Fallback: inferred from objective + per-field DB columns (atc, page_views, leads, reach)
const ResultsCell: React.FC<{ campaign: Campaign; goal: GoalType; isLast: boolean }> = ({ campaign, goal, isLast }) => {
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const cellStyle = {
    padding: '16px 22px',
    borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
    textAlign: 'right' as const,
  };
  const numStyle = { fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 500 };
  const subStyle = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 };
  const dash     = <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>;

  // ── Special case: Multiple conversions (different adsets have different goals) ──
  if (campaign.conversion_event === 'Multiple') {
    return (
      <td style={cellStyle}>
        <div style={{ ...numStyle, color: 'var(--accent)', fontSize: 12 }}>Multiple</div>
        <div style={subStyle}>conv. goals · open for details</div>
      </td>
    );
  }

  // ── Primary: use the actual Meta conversion_event label synced from promoted_object ──
  if (campaign.conversion_event) {
    const evt = campaign.conversion_event;
    let value: number = 0;
    let color = 'var(--accent)';

    // Map event label → the correct per-field column in DB
    if (evt === 'ATC' || evt === 'Checkout' || evt === 'Add Payment Info') {
      value = campaign.atc ?? campaign.conversion_value ?? 0;
      color = 'var(--champagne)';
    } else if (evt === 'View Content' || evt === 'Page Views' || evt === 'Clicks') {
      // View Content uses conversion_value (fb_pixel_view_content), Page Views uses page_views
      value = evt === 'Page Views' ? (campaign.page_views ?? 0)
             : evt === 'Clicks'    ? campaign.clicks
             : (campaign.conversion_value ?? 0); // View Content
      color = 'var(--blue)';
    } else if (evt === 'Leads' || evt === 'Registrations' || evt === 'Subscriptions') {
      value = campaign.leads > 0 ? campaign.leads : (campaign.conversion_value ?? 0);
      color = 'var(--green)';
    } else if (evt === 'Reach') {
      value = campaign.reach ?? 0;
      color = 'var(--blue)';
    } else if (evt === 'Purchases') {
      // Purchases as results: show count (Sales column shows revenue)
      value = campaign.purchases ?? campaign.conversion_value ?? 0;
      color = campaign.roas >= 3 ? 'var(--green)' : campaign.roas >= 1.5 ? 'var(--champagne)' : 'var(--accent)';
    } else {
      value = campaign.conversion_value ?? 0;
    }

    return (
      <td style={cellStyle}>
        <div style={{ ...numStyle, color }}>
          {value > 0 ? formatNumber(value) : dash}
        </div>
        <div style={subStyle}>
          {evt}{ctr > 0 && ` · CTR ${ctr.toFixed(1)}%`}
        </div>
      </td>
    );
  }

  // ── Fallback: data not yet synced with promoted_object — infer from objective ──
  switch (goal) {
    case 'sales':
      return (
        <td style={cellStyle}>
          <div style={{ ...numStyle, color: (campaign.atc ?? 0) > 0 ? 'var(--champagne)' : 'var(--text-3)' }}>
            {(campaign.atc ?? 0) > 0 ? formatNumber(campaign.atc!) : dash}
          </div>
          <div style={subStyle}>
            {(campaign.atc ?? 0) > 0 ? `ATC · CTR ${ctr.toFixed(1)}%` : 'Sync for goal data'}
          </div>
        </td>
      );
    case 'leads':
      return (
        <td style={cellStyle}>
          <div style={{ ...numStyle, color: campaign.leads > 0 ? 'var(--green)' : 'var(--text-3)' }}>
            {campaign.leads > 0 ? formatNumber(campaign.leads) : dash}
          </div>
          <div style={subStyle}>
            {campaign.leads > 0 ? `Leads · CPL ${formatCurrency(campaign.cpl)}` : '—'}
          </div>
        </td>
      );
    case 'traffic':
      return (
        <td style={cellStyle}>
          <div style={{ ...numStyle, color: 'var(--blue)' }}>
            {(campaign.page_views ?? 0) > 0
              ? formatNumber(campaign.page_views!)
              : campaign.clicks > 0 ? formatNumber(campaign.clicks) : dash}
          </div>
          <div style={subStyle}>
            {(campaign.page_views ?? 0) > 0 ? 'Page Views' : 'Clicks'}{ctr > 0 && ` · CTR ${ctr.toFixed(1)}%`}
          </div>
        </td>
      );
    case 'awareness':
      return (
        <td style={cellStyle}>
          <div style={{ ...numStyle, color: 'var(--blue)' }}>
            {campaign.reach > 0 ? formatNumber(campaign.reach) : dash}
          </div>
          <div style={subStyle}>
            {campaign.reach > 0 ? `Reach · ${campaign.frequency.toFixed(1)}x freq.` : '—'}
          </div>
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

// ─── Sales cell — always shows purchase/revenue regardless of campaign objective ─
const SalesCell: React.FC<{ campaign: Campaign; isLast: boolean }> = ({ campaign, isLast }) => {
  const cellStyle = {
    padding: '16px 22px',
    borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
    textAlign: 'right' as const,
  };
  const numStyle = { fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 500 };
  const subStyle = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 };

  const purchases = campaign.purchases ?? 0;
  const revenue   = campaign.revenue   ?? 0;
  const roas      = campaign.roas      ?? 0;

  if (purchases > 0 || revenue > 0) {
    const color = roas >= 3 ? 'var(--green)' : roas >= 1.5 ? 'var(--champagne)' : 'var(--accent)';
    return (
      <td style={cellStyle}>
        <div style={{ ...numStyle, color }}>
          {revenue > 0 ? formatCurrency(revenue) : `${purchases}`}
        </div>
        <div style={subStyle}>
          {[purchases > 0 && `${purchases} purch.`, roas > 0 && `${roas.toFixed(1)}x ROAS`].filter(Boolean).join(' · ')}
        </div>
      </td>
    );
  }

  return (
    <td style={cellStyle}>
      <span style={{ ...numStyle, color: 'var(--text-3)', fontWeight: 400 }}>—</span>
    </td>
  );
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
  dailyRows: { date: string; spend: number; leads: number; purchases: number; conversion_value: number }[];
  totalSpend: number;
  totalConversions: number;
  conversionLabel: string;  // e.g. "Leads", "Purchases", "Results"
  totalImpressions: number;
  dateLabel: string;
}
const TrendPanel: React.FC<TrendPanelProps> = ({ dailyRows, totalSpend, totalConversions, conversionLabel, totalImpressions, dateLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<ChartType | null>(null);

  const hasRealData = dailyRows.length > 0;
  const chartLabels = hasRealData ? dailyRows.map(r => r.date.slice(5)) : DAYS_LABELS;
  const spendData   = hasRealData ? dailyRows.map(r => r.spend) : simulateDailySeries(totalSpend);
  // Pick the right daily series based on what conversion type is active
  const convData = hasRealData
    ? dailyRows.map(r =>
        conversionLabel === 'Leads'     ? r.leads
      : conversionLabel === 'Purchases' ? r.purchases
      : r.conversion_value)
    : simulateDailySeries(totalConversions);

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

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: chartLabels,
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
            label: conversionLabel,
            data: convData,
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
  }, [spendData, convData, chartLabels]);

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
          Performance · <span style={{ color: 'var(--accent)' }}>{dateLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { color: 'var(--accent)', label: 'Spend' },
            { color: 'var(--green)', label: conversionLabel },
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
          { label: 'TOTAL SPEND',              value: formatCurrency(totalSpend),   color: 'var(--accent)' },
          { label: `TOTAL ${conversionLabel.toUpperCase()}`, value: String(totalConversions), color: 'var(--green)'  },
          { label: 'IMPRESSIONS',               value: fmt(totalImpressions),        color: 'var(--blue)'   },
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
      {!hasRealData && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8, fontFamily: 'var(--font-ui)', fontStyle: 'italic' }}>
          * Daily distribution estimated — run Sync Meta to load real daily data.
        </div>
      )}
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
            {campaigns.filter(c => c.spend === 0).length} draft / inactive · €0
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
      <ResultsCell campaign={campaign} goal={goal} isLast={isLast} />

      {/* Sales — always shows purchases/revenue regardless of objective */}
      <SalesCell campaign={campaign} isLast={isLast} />
    </tr>
  );
};

// ─── Main Campaigns page ────────────────────────────────────
const Campaigns: React.FC = () => {
  const { user }        = useAuth();
  const queryClient     = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<{ filtered: Campaign; raw: Campaign } | null>(null);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [goalFilter,    setGoalFilter]    = useState<GoalType | 'all'>('all');
  const [statusFilter,  setStatusFilter]  = useState<'all' | 'ACTIVE' | 'PAUSED'>('all');

  // Sorting state
  const [sortField, setSortField] = useState<'name' | 'spend' | 'cpm' | 'results' | 'sales'>('spend');
  const [sortAsc,   setSortAsc]   = useState<boolean>(false);

  // ── Date range state ──────────────────────────────────────
  const [datePreset,  setDatePreset]  = useState<DatePreset>('30d');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');
  const { from, to, label: dateLabel } = useMemo(
    () => resolvePreset(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  );

  const { data: brands = [] } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn:  () => getBrands(user!.id),
    enabled:  !!user,
  });

  // Sync selectedBrand with global BrandContext (sidebar brand switcher)
  const { activeBrand: ctxActiveBrand } = useBrand();
  useEffect(() => {
    if (ctxActiveBrand && selectedBrand === 'all') {
      setSelectedBrand(ctxActiveBrand.id);
    } else if (ctxActiveBrand && selectedBrand !== 'all') {
      setSelectedBrand(ctxActiveBrand.id);
    }
  }, [ctxActiveBrand?.id]);

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

  // ── Daily KPIs for the selected date range ────────────────
  const activeBrandId = selectedBrand !== 'all' ? selectedBrand : (brands[0]?.id ?? '');
  const { data: dailyKpis } = useQuery<DailyKpiResult>({
    queryKey: ['daily-kpis', activeBrandId, from, to],
    queryFn:  () => getDailyKpis(activeBrandId, from, to),
    enabled:  !!activeBrandId,
    staleTime: 60_000,
  });

  // ── Global daily stats check for the brand ────────────────
  // Checks if the brand has ANY daily breakdown history stored in the database.
  // If it does, we can safely zero-out campaigns that had no activity in the selected range.
  // If it does not, we fall back to displaying all-time totals so we don't show empty zeros.
  const { data: hasDailyHistory = false } = useQuery<boolean>({
    queryKey: ['has-daily-stats', activeBrandId],
    queryFn:  () => checkHasDailyStats(activeBrandId),
    enabled:  !!activeBrandId,
    staleTime: 60_000,
  });

  // ── Per-campaign date-range stats — drives campaign table + donut chart ──
  // Queries campaign_daily_stats grouped by campaign_id for the selected range.
  // Returns empty {} when no daily data exists for this period (meta-sync hasn't run).
  const { data: campaignDailyStats } = useQuery<Record<string, CampaignRangeStats>>({
    queryKey: ['campaign-range-stats', activeBrandId, from, to],
    queryFn:  () => getDailyCampaignStats(activeBrandId, from, to),
    enabled:  !!activeBrandId,
    staleTime: 60_000,
  });

  const brandCampaigns = useMemo(() =>
    selectedBrand === 'all' ? allCampaigns : allCampaigns.filter(c => c.brand_id === selectedBrand),
    [allCampaigns, selectedBrand]
  );

  // Filter campaigns by objective and active status
  const campaigns = useMemo(() => {
    let list = goalFilter === 'all' ? brandCampaigns : brandCampaigns.filter(c => classifyObjective(c.objective) === goalFilter);
    if (statusFilter !== 'all') {
      list = list.filter(c => c.status === statusFilter);
    }
    return list;
  }, [brandCampaigns, goalFilter, statusFilter]);

  // ── Merge campaigns with date-filtered stats ──────────────────────────────────────
  // When campaignDailyStats is populated, override the all-time campaign fields
  // with date-filtered values. This makes the campaign table, donut chart, and
  // aggregations all respond correctly when the user changes the date range.
  const mergedCampaigns = useMemo(() => {
    if (!hasDailyHistory) return campaigns;

    return campaigns.map(c => {
      const ds = campaignDailyStats?.[c.id];
      if (!ds) {
        // No daily data for this campaign in the range means it had zero spend/actions in this range
        return {
          ...c,
          spend:            0,
          impressions:      0,
          clicks:           0,
          leads:            0,
          purchases:        0,
          revenue:          0,
          roas:             0,
          atc:              0,
          page_views:       0,
          reach:            0,
          frequency:        0,
          conversion_value: 0,
          cpl:              0,
          cpm:              0,
        };
      }
      const frequency = ds.reach > 0 ? ds.impressions / ds.reach : 0;
      const roas = ds.spend > 0 ? ds.revenue / ds.spend : 0;
      return {
        ...c,
        spend:            ds.spend,
        impressions:      ds.impressions,
        clicks:           ds.clicks,
        leads:            ds.leads,
        purchases:        ds.purchases,
        revenue:          ds.revenue,
        atc:              ds.atc,
        page_views:       ds.page_views,
        reach:            ds.reach,
        conversion_value: ds.conversion_value,
        frequency,
        roas,
        cpl:              ds.leads > 0       ? ds.spend / ds.leads : 0,
        cpm:              ds.impressions > 0 ? (ds.spend / ds.impressions) * 1000 : 0,
      };
    });
  }, [campaigns, campaignDailyStats, hasDailyHistory]);

  // ── Sort campaigns ──────────────────────────────────────────
  const sortedCampaigns = useMemo(() => {
    return [...mergedCampaigns].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'name') {
        return sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (sortField === 'spend') {
        valA = a.spend;
        valB = b.spend;
      } else if (sortField === 'cpm') {
        valA = a.impressions > 0 ? (a.spend / a.impressions) * 1000 : 0;
        valB = b.impressions > 0 ? (b.spend / b.impressions) * 1000 : 0;
      } else if (sortField === 'results') {
        valA = a.conversion_value ?? 0;
        valB = b.conversion_value ?? 0;
      } else if (sortField === 'sales') {
        valA = a.revenue > 0 ? a.revenue : (a.purchases ?? 0);
        valB = b.revenue > 0 ? b.revenue : (b.purchases ?? 0);
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [mergedCampaigns, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' ? true : false);
    }
  };

  const goalCounts = useMemo(() => {
    const counts: Record<GoalType, number> = { sales: 0, leads: 0, traffic: 0, awareness: 0, engagement: 0, unknown: 0 };
    brandCampaigns.forEach(c => { counts[classifyObjective(c.objective)]++; });
    return counts;
  }, [brandCampaigns]);

  const metaAccounts  = adAccounts.filter(a => a.platform === 'meta');
  const getBrandName  = (id: string) => brands.find(b => b.id === id)?.name || '';

  // ─── KPI aggregations — dynamic conversion type ───────────────────────────
  // resolvePrimaryConversion inspects campaign.conversion_event across all visible
  // campaigns and returns the dominant type (or "mixed" if multiple types exist).
  const convSummary = useMemo(() => resolvePrimaryConversion(mergedCampaigns), [mergedCampaigns]);

  const aggSpend = useMemo(() => mergedCampaigns.reduce((s, c) => s + c.spend,       0), [mergedCampaigns]);
  const aggImpr  = useMemo(() => mergedCampaigns.reduce((s, c) => s + c.impressions, 0), [mergedCampaigns]);

  const totalSpend       = dailyKpis?.hasData ? dailyKpis.spend       : aggSpend;
  const totalConversions = convSummary.totalValue;  // already computed from mergedCampaigns
  const totalImpr        = dailyKpis?.hasData ? dailyKpis.impressions : aggImpr;
  const activeCnt        = useMemo(() => campaigns.filter(c => c.status === 'ACTIVE').length, [campaigns]);
  const avgCpa           = totalConversions > 0 ? totalSpend / totalConversions : 0;

  // Bar percentages
  const spendPct  = Math.min(100, totalSpend        > 0 ? 75 : 0);
  const convPct   = Math.min(100, totalConversions  > 0 ? (totalConversions / Math.max(totalConversions, 1000)) * 100 : 0);
  const cpaPct    = avgCpa > 0 ? Math.max(10, 100 - (avgCpa / 50) * 100) : 0;

  // ─── Sync ─────────────────────────────────────────────────
  const handleSync = async () => {
    if (!metaAccounts.length) { setSyncMsg('Connect a Meta Ads account first'); return; }
    setSyncing(true); setSyncMsg('');
    try {
      const brand = selectedBrand === 'all' ? brands[0] : brands.find(b => b.id === selectedBrand);
      if (!brand) { setSyncMsg('Select a brand first'); return; }

      // ── Find the ad account that is actually linked to this brand ──
      // Bug fix: previously always used metaAccounts[0], causing ALL brands
      // to sync from the same first account regardless of which was selected.
      const accountForBrand = adAccounts.find(
        (a) => (a as any).brand_id === brand.id && a.platform === 'meta'
      );
      const accountToSync = accountForBrand ?? metaAccounts[0];

      if (!accountToSync) { setSyncMsg('No Meta account linked. Go to Connect → Change brand.'); return; }

      // Warn in UI if falling back to unlinked account
      if (!accountForBrand) {
        setSyncMsg(`⚠ No account linked to "${brand.name}" — syncing from default account. Go to Connect to link.`);
      }

      await syncMetaCampaigns(brand.id, accountToSync.id);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSyncMsg(accountForBrand ? 'Synced ✓' : `Synced ✓ (from default account)`);
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally { setSyncing(false); }
  };

  // ─── Skeleton loading ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-container">
        <div className="camp-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
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
          <button
            className="btn btn-secondary"
            onClick={() => exportCampaignsCsv(mergedCampaigns, {
              dateLabel,
              brandName: brands.find(b => b.id === activeBrandId)?.name,
            })}
            disabled={mergedCampaigns.length === 0}
            title={mergedCampaigns.length === 0 ? 'No campaigns to export' : `Export ${mergedCampaigns.length} campaign${mergedCampaigns.length !== 1 ? 's' : ''} as CSV`}
            style={{ display: 'flex', alignItems: 'center', gap: 7, boxShadow: 'var(--shadow)' }}
          >
            ↓ Export CSV
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

        {/* Divider */}
        <span style={{ width: 1, height: 22, background: 'var(--border)', display: 'inline-block', margin: '0 2px' }} />

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(['all', 'ACTIVE', 'PAUSED'] as const).map(s => {
            const label = s === 'all' ? 'All Status' : s === 'ACTIVE' ? '🟢 Active' : '⏸ Paused';
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 13px',
                  borderRadius: 30,
                  fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  transition: 'all 0.15s',
                  background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Date Range Bar ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 16, padding: '10px 14px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, flexWrap: 'wrap',
      }}>
        <DateRangeBar
          preset={datePreset}
          customFrom={customFrom}
          customTo={customTo}
          onPreset={setDatePreset}
          onCustomFrom={setCustomFrom}
          onCustomTo={setCustomTo}
        />
        {dailyKpis?.hasData && (
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--green)', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Real data
          </span>
        )}
        {!dailyKpis?.hasData && activeBrandId && (
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
            Sync Meta to load data for this range
          </span>
        )}
      </div>

      {/* ── KPI Row (§28) — 4 colored cards ─────────────── */}
      <div className="camp-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        <KpiCard
          label="TOTAL SPEND"
          value={formatCurrency(totalSpend)}
          icon="₠"
          kcVar="--accent"
          barPct={spendPct}
          trendUp={true}
          subText={`${activeCnt} active campaign${activeCnt !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label={convSummary.cardLabel}
          value={totalConversions > 0 ? formatNumber(totalConversions) : '—'}
          icon="◎"
          kcVar="--green"
          barPct={convPct}
          trendUp={true}
          subText={
            totalConversions > 0
              ? convSummary.mixed
                ? convSummary.breakdown.slice(0, 2).map(b => `${formatNumber(b.value)} ${b.label}`).join(' · ')
                : `avg ${convSummary.cpaLabel.replace('AVG ', '')} ${formatCurrency(avgCpa)}`
              : 'No conversion data yet'
          }
        />
        <KpiCard
          label={convSummary.cpaLabel}
          value={avgCpa > 0 ? formatCurrency(avgCpa) : '—'}
          icon="◈"
          kcVar="--blue"
          barPct={cpaPct}
          subText={
            avgCpa > 0
              ? `${formatNumber(totalConversions)} ${convSummary.eventLabel || 'results'}`
              : convSummary.totalValue === 0 ? 'No conversion data yet' : 'awaiting data'
          }
        />
        <KpiCard
          label="ACTIVE CAMPAIGNS"
          value={String(activeCnt)}
          icon="✦"
          kcVar="--amber"
          barPct={campaigns.length > 0 ? (activeCnt / campaigns.length) * 100 : 0}
          subText={campaigns.length > 0 ? `${campaigns.length} total` : 'no campaigns yet'}
        />
      </div>

      {/* ── Chart panels (§29) — trend + donut ──────────── */}
      {campaigns.length > 0 && (
        <div className="camp-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 14, marginBottom: 16 }}>
          <TrendPanel
            dailyRows={dailyKpis?.dailyRows ?? []}
            totalSpend={totalSpend}
            totalConversions={totalConversions}
            conversionLabel={convSummary.eventLabel || 'Results'}
            totalImpressions={totalImpr}
            dateLabel={dateLabel}
          />
          <DonutPanel campaigns={mergedCampaigns} />
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
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {([
                  { key: 'name',    label: 'CAMPAIGN',  align: 'left'  },
                  { key: null,      label: 'STATUS',    align: 'left'  },
                  { key: 'spend',   label: 'SPEND',     align: 'right' },
                  { key: 'cpm',     label: 'CPM',       align: 'right' },
                  { key: 'results', label: 'RESULTS',   align: 'right' },
                  { key: 'sales',   label: 'SALES',     align: 'right' },
                ] as const).map(({ key, label, align }) => (
                  <th
                    key={label}
                    onClick={key ? () => handleSort(key as 'name' | 'spend' | 'cpm' | 'results' | 'sales') : undefined}
                    style={{
                      padding: '13px 22px', textAlign: align as 'left' | 'right',
                      fontSize: 10, letterSpacing: 1.2, color: key ? 'var(--text-2)' : 'var(--text-3)',
                      fontFamily: 'var(--font-ui)', fontWeight: 500,
                      whiteSpace: 'nowrap',
                      cursor: key ? 'pointer' : 'default',
                      userSelect: 'none',
                      transition: 'color 0.15s',
                    }}
                  >
                    {label}
                    {key && sortField === key && (
                      <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>
                        {sortAsc ? '▲' : '▼'}
                      </span>
                    )}
                    {key && sortField !== key && (
                      <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.25 }}>▼</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCampaigns.map((c, idx) => {
                // Find the original all-time row to pass alongside the date-filtered row
                const rawC = campaigns.find(r => r.id === c.id) ?? c;
                return (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    showBrand={brands.length > 1 ? getBrandName(c.brand_id) : undefined}
                    onClick={() => setSelectedCampaign({ filtered: c, raw: rawC })}
                    isLast={idx === sortedCampaigns.length - 1}
                  />
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Detail panel ─────────────────────────────────── */}
      {selectedCampaign && (
        <CampaignDetailPanel
          campaign={selectedCampaign.filtered}
          rawCampaign={selectedCampaign.raw}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
};

export default Campaigns;
