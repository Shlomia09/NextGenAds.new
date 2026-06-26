import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, ChevronDown } from 'lucide-react';

import { getCampaigns, getBrands, getAdAccounts } from '../lib/supabase';
import { syncMetaCampaigns } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatNumber } from '../lib/benchmarks';
import { classifyObjective, GOAL_META } from '../lib/objective';
import CampaignDetailPanel from '../components/campaigns/CampaignDetailPanel';
import type { GoalType } from '../lib/objective';
import type { Campaign } from '../types';


// ─── Status pill ───────────────────────────────────────────────
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'ACTIVE') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 11px', borderRadius: 30,
        background: 'var(--green-soft)', color: 'var(--green)',
        fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        Active
      </span>
    );
  }
  if (status === 'PAUSED') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 11px', borderRadius: 30,
        background: 'var(--champagne-soft)', color: 'var(--champagne)',
        fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--champagne)', flexShrink: 0 }} />
        Paused
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 11px', borderRadius: 30,
      background: 'var(--surface-2)', color: 'var(--text-3)',
      fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--font-ui)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-3)', flexShrink: 0 }} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

// ─── Smart conversion cell ────────────────────────────────────
const ConversionCell: React.FC<{ campaign: Campaign; goal: GoalType }> = ({ campaign, goal }) => {
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;

  switch (goal) {
    case 'sales':
      return (
        <td style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
              color: campaign.roas >= 3 ? 'var(--green)' : campaign.roas >= 1.5 ? 'var(--champagne)' : 'var(--red)',
            }}>
              {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)' }}>
              {campaign.purchases > 0 ? `${campaign.purchases} purch.` : 'no sales'}
            </span>
          </div>
        </td>
      );
    case 'leads':
      return (
        <td style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>
              {campaign.leads > 0 ? formatNumber(campaign.leads) + ' leads' : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)' }}>
              {campaign.cpl > 0 ? `CPL ${formatCurrency(campaign.cpl)}` : 'no leads'}
            </span>
          </div>
        </td>
      );
    case 'traffic':
      return (
        <td style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>
              {campaign.clicks > 0 ? formatNumber(campaign.clicks) + ' clicks' : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)' }}>
              {ctr > 0 ? `CTR ${ctr.toFixed(2)}%` : 'no clicks'}
            </span>
          </div>
        </td>
      );
    case 'awareness':
      return (
        <td style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: '#A78BFA' }}>
              {campaign.reach > 0 ? formatNumber(campaign.reach) + ' reach' : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)' }}>
              {campaign.frequency > 0 ? `${campaign.frequency.toFixed(1)}x freq.` : ''}
            </span>
          </div>
        </td>
      );
    default:
      return (
        <td style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-soft)', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-3)' }}>
          {campaign.clicks > 0 ? formatNumber(campaign.clicks) + ' clicks' : '—'}
        </td>
      );
  }
};

// ─── Campaign row ───────────────────────────────────────────────
const CampaignRow: React.FC<{ campaign: Campaign; showBrand?: string; onClick: () => void; isLast: boolean }> = ({ campaign, showBrand, onClick, isLast }) => {
  const goal = classifyObjective(campaign.objective);
  const meta = GOAL_META[goal];
  const cpm  = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;

  const cellStyle: React.CSSProperties = {
    padding: '16px 22px',
    borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
    verticalAlign: 'middle',
  };

  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Campaign name + objective badge */}
      <td style={{ ...cellStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            fontFamily: 'var(--font-ui)', fontWeight: 400, fontSize: 13,
            color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {campaign.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 500,
            background: meta.bg, color: meta.color,
            borderRadius: 3, padding: '1px 6px', border: `0.5px solid ${meta.color}30`,
            letterSpacing: '0.4px',
          }}>
            {meta.emoji} {meta.label}
          </span>
          {showBrand && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)' }}>
              · {showBrand}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
        <StatusPill status={campaign.status} />
      </td>

      {/* Spend */}
      <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {formatCurrency(campaign.spend)}
      </td>

      {/* CPM / Impressions */}
      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>
            {cpm > 0 ? formatCurrency(cpm) : '—'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)' }}>
            {campaign.impressions > 0 ? formatNumber(campaign.impressions) + ' impr.' : '—'}
          </span>
        </div>
      </td>

      {/* Smart conversion column */}
      <ConversionCell campaign={campaign} goal={goal} />
    </tr>
  );
};

// ─── Hero KPI section ──────────────────────────────────────────
const HeroKpis: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
  const totalSpend  = campaigns.reduce((s, c) => s + c.spend, 0);
  const active      = campaigns.filter(c => c.status === 'ACTIVE').length;

  // Detect majority goal
  const goalCounts: Record<GoalType, number> = { sales: 0, leads: 0, traffic: 0, awareness: 0, engagement: 0, unknown: 0 };
  campaigns.forEach(c => { goalCounts[classifyObjective(c.objective)]++; });
  const dominantGoal = (Object.keys(goalCounts) as GoalType[]).reduce((a, b) => goalCounts[a] > goalCounts[b] ? a : b);

  const kpis = useMemo(() => {
    if (dominantGoal === 'leads') {
      const totalLeads  = campaigns.reduce((s, c) => s + c.leads, 0);
      const avgCpl      = totalLeads > 0 ? totalSpend / totalLeads : 0;
      const qualLeads   = campaigns.reduce((s, c) => s + c.qualified_leads, 0);
      return [
        { label: 'Total Leads', value: formatNumber(totalLeads) },
        { label: 'Avg CPL',     value: avgCpl > 0 ? formatCurrency(avgCpl) : '—' },
        { label: 'Campaigns',   value: String(campaigns.length) },
        { label: 'Qualified',   value: formatNumber(qualLeads) },
      ];
    }
    if (dominantGoal === 'sales') {
      const totalRevenue   = campaigns.reduce((s, c) => s + c.revenue, 0);
      const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);
      const avgRoas        = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      return [
        { label: 'Revenue',   value: formatCurrency(totalRevenue) },
        { label: 'Purchases', value: formatNumber(totalPurchases) },
        { label: 'Campaigns', value: String(campaigns.length) },
        { label: 'Avg ROAS',  value: avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—' },
      ];
    }
    if (dominantGoal === 'traffic') {
      const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
      const totalImpr   = campaigns.reduce((s, c) => s + c.impressions, 0);
      const avgCtr      = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0;
      const avgCpc      = totalClicks > 0 ? totalSpend / totalClicks : 0;
      return [
        { label: 'Clicks',    value: formatNumber(totalClicks) },
        { label: 'Avg CTR',   value: avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '—' },
        { label: 'Campaigns', value: String(campaigns.length) },
        { label: 'Avg CPC',   value: avgCpc > 0 ? formatCurrency(avgCpc) : '—' },
      ];
    }
    if (dominantGoal === 'awareness') {
      const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
      const totalImpr  = campaigns.reduce((s, c) => s + c.impressions, 0);
      const avgCpm     = totalImpr > 0 ? (totalSpend / totalImpr) * 1000 : 0;
      const freqCamps  = campaigns.filter(c => c.frequency > 0);
      const avgFreq    = freqCamps.length > 0 ? freqCamps.reduce((s, c) => s + c.frequency, 0) / freqCamps.length : 0;
      return [
        { label: 'Reach',     value: formatNumber(totalReach) },
        { label: 'Avg CPM',   value: avgCpm > 0 ? formatCurrency(avgCpm) : '—' },
        { label: 'Campaigns', value: String(campaigns.length) },
        { label: 'Avg Freq.', value: avgFreq > 0 ? `${avgFreq.toFixed(1)}x` : '—' },
      ];
    }
    // Mixed / default
    const totalImpr = campaigns.reduce((s, c) => s + c.impressions, 0);
    const avgCpm    = totalImpr > 0 ? (totalSpend / totalImpr) * 1000 : 0;
    return [
      { label: 'Active',      value: String(active) },
      { label: 'Impressions', value: formatNumber(totalImpr) },
      { label: 'Campaigns',   value: String(campaigns.length) },
      { label: 'Avg CPM',     value: avgCpm > 0 ? formatCurrency(avgCpm) : '—' },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, dominantGoal, totalSpend, active]);

  // Format the hero spend number: split dollars and cents
  const spendStr = formatCurrency(totalSpend);
  const dotIdx   = spendStr.lastIndexOf('.');
  const dollars  = dotIdx >= 0 ? spendStr.slice(0, dotIdx)  : spendStr;
  const cents    = dotIdx >= 0 ? spendStr.slice(dotIdx)      : '';

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Hero spend */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400,
          color: 'var(--accent)', letterSpacing: '-1px', lineHeight: 1,
        }}>
          {dollars}
          {cents && (
            <span style={{ fontSize: 28, letterSpacing: '-0.5px', opacity: 0.75 }}>{cents}</span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', marginTop: 5, letterSpacing: '0.5px' }}>
          TOTAL SPEND
        </div>
      </div>

      {/* 4 KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {kpis.map(({ label, value }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--border-soft)',
            borderRadius: 13, padding: '15px 17px',
          }}>
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 500,
              color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '1.2px',
              marginBottom: 6,
            }}>
              {label}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 23, fontWeight: 500,
              color: 'var(--text)', lineHeight: 1.1,
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Campaigns page ──────────────────────────────────────
const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [goalFilter,    setGoalFilter]    = useState<GoalType | 'all'>('all');

  const { data: brands = [] } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => getBrands(user!.id),
    enabled: !!user,
  });

  const { data: adAccounts = [] } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn: () => getAdAccounts(user!.id),
    enabled: !!user,
  });

  // Load campaigns for ALL brands
  const { data: allCampaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', 'all', brands.map(b => b.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(brands.map(b => getCampaigns(b.id)));
      return results.flat();
    },
    enabled: brands.length > 0,
  });

  // Filter by brand
  const brandCampaigns = useMemo(() => {
    if (selectedBrand === 'all') return allCampaigns;
    return allCampaigns.filter(c => c.brand_id === selectedBrand);
  }, [allCampaigns, selectedBrand]);

  // Filter by goal
  const campaigns = useMemo(() => {
    if (goalFilter === 'all') return brandCampaigns;
    return brandCampaigns.filter(c => classifyObjective(c.objective) === goalFilter);
  }, [brandCampaigns, goalFilter]);

  // Detect goals across filtered campaigns
  const goalCounts = useMemo(() => {
    const counts: Record<GoalType, number> = { sales: 0, leads: 0, traffic: 0, awareness: 0, engagement: 0, unknown: 0 };
    brandCampaigns.forEach(c => { counts[classifyObjective(c.objective)]++; });
    return counts;
  }, [brandCampaigns]);

  const metaAccounts = adAccounts.filter(a => a.platform === 'meta');

  const handleSync = async () => {
    if (!metaAccounts.length) { setSyncMsg('Connect a Meta Ads account first'); return; }
    setSyncing(true); setSyncMsg('');
    try {
      const activeBrand = selectedBrand === 'all' ? brands[0] : brands.find(b => b.id === selectedBrand);
      if (!activeBrand) { setSyncMsg('Select a brand first'); return; }
      await syncMetaCampaigns(activeBrand.id, metaAccounts[0].id);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSyncMsg('Synced successfully');
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally { setSyncing(false); }
  };

  const getBrandName = (brandId: string) => brands.find(b => b.id === brandId)?.name || '';

  const activeCount = allCampaigns.filter(c => c.status === 'ACTIVE').length;

  // Button styles
  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 9, padding: '9px 15px',
    fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500,
    border: '1px solid var(--accent)', color: 'var(--accent)',
    background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
    textDecoration: 'none',
  };
  const btnSecondary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 9, padding: '9px 15px',
    fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500,
    border: '1px solid var(--border)', color: 'var(--text-2)',
    background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
    textDecoration: 'none',
  };

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            {/* Eyebrow */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
            }}>
              <div style={{ height: 1, width: 22, background: 'var(--border)' }} />
              <span style={{
                fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-3)',
              }}>
                CAMPAIGN DATA
              </span>
            </div>

            {/* H1 */}
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 500,
              color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.1,
              marginBottom: 6,
            }}>
              Campaigns
            </h1>

            {/* Subline */}
            <p style={{
              fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-2)',
              display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap',
            }}>
              <span>{activeCount} active</span>
              <span style={{ color: 'var(--text-3)' }}>·</span>
              <span>{allCampaigns.length} total</span>
              <span style={{ color: 'var(--text-3)' }}>·</span>
              {metaAccounts.length > 0
                ? <span><span style={{ color: 'var(--accent)' }}>Meta</span> account</span>
                : <span style={{ color: 'var(--red)' }}>No account connected</span>}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {syncMsg && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
                {syncMsg}
              </span>
            )}
            <button style={btnPrimary} onClick={handleSync} disabled={syncing}>
              <RefreshCw size={13} strokeWidth={1.5} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
              {syncing ? 'Syncing…' : 'Sync Meta'}
            </button>
            <a
              href="https://adsmanager.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              style={btnSecondary}
            >
              <ExternalLink size={12} strokeWidth={1.5} />
              Ads Manager
            </a>
          </div>
        </div>
      </div>

      {/* ── Filter pills row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Brand selector */}
        {brands.length > 1 && (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              style={{
                appearance: 'none', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 9, padding: '7px 32px 7px 12px',
                fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="all">All Brands</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Goal filter chips */}
        {(['all', 'sales', 'leads', 'traffic', 'awareness', 'engagement'] as const).map(g => {
          const count = g === 'all' ? brandCampaigns.length : goalCounts[g as GoalType];
          if (g !== 'all' && count === 0) return null;
          const meta = g === 'all' ? null : GOAL_META[g as GoalType];
          const isActive = goalFilter === g;
          return (
            <button
              key={g}
              onClick={() => setGoalFilter(g)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: isActive ? (meta?.bg || 'var(--accent-soft)') : 'transparent',
                border: `1px solid ${isActive ? (meta?.color || 'var(--accent)') : 'var(--border)'}`,
                borderRadius: 30, padding: '5px 13px',
                fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
                color: isActive ? (meta?.color || 'var(--accent)') : 'var(--text-3)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {meta && <span>{meta.emoji}</span>}
              <span>{g === 'all' ? 'All' : GOAL_META[g as GoalType].label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.75 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Hero KPI section ── */}
      {campaigns.length > 0 && <HeroKpis campaigns={campaigns} />}

      {/* ── Table ── */}
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--border)', background: 'var(--surface)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '34%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Campaign', 'Status', 'Spend', 'CPM / Impr.', 'Conversion'].map(h => (
                <th key={h} style={{
                  padding: '13px 22px',
                  fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: '1.2px',
                  color: 'var(--text-3)', textAlign: 'left',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-soft)' }}>
                        <div style={{
                          height: 12, width: j === 0 ? '70%' : '50%',
                          borderRadius: 3, background: 'var(--surface-2)',
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                      </td>
                    ))}
                  </tr>
                ))
              : campaigns.length === 0
              ? (
                <tr>
                  <td colSpan={5} style={{
                    textAlign: 'center', padding: '56px 24px',
                    fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-3)',
                  }}>
                    {allCampaigns.length > 0
                      ? 'No campaigns match this filter.'
                      : 'No campaigns synced yet. Click "Sync Meta" to pull your campaign data.'}
                  </td>
                </tr>
              )
              : campaigns.map((c, idx) => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    showBrand={selectedBrand === 'all' && brands.length > 1 ? getBrandName(c.brand_id) : undefined}
                    onClick={() => setSelectedCampaign(c)}
                    isLast={idx === campaigns.length - 1}
                  />
                ))}
          </tbody>
        </table>
      </div>

      {/* ── Campaign detail panel ── */}
      <CampaignDetailPanel
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
    </div>
  );
};

export default Campaigns;
