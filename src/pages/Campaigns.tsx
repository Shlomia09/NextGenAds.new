import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock, ChevronDown } from 'lucide-react';

import { getCampaigns, getBrands, getAdAccounts } from '../lib/supabase';
import { syncMetaCampaigns } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatNumber } from '../lib/benchmarks';
import { classifyObjective, GOAL_META } from '../lib/objective';
import type { GoalType } from '../lib/objective';
import type { Campaign } from '../types';



// ─── Status icons ─────────────────────────────────────────────
const statusIcon: Record<string, React.ReactNode> = {
  ACTIVE:   <CheckCircle size={10} strokeWidth={1.5} style={{ color: 'var(--success)' }} />,
  PAUSED:   <Clock       size={10} strokeWidth={1.5} style={{ color: 'var(--warning)' }} />,
  ARCHIVED: <AlertCircle size={10} strokeWidth={1.5} style={{ color: 'var(--text-hint)' }} />,
};

// ─── Smart conversion cell ────────────────────────────────────
const ConversionCell: React.FC<{ campaign: Campaign; goal: GoalType }> = ({ campaign, goal }) => {
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;

  switch (goal) {
    case 'sales':
      return (
        <td className="numeric">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ color: campaign.roas >= 3 ? 'var(--success)' : campaign.roas >= 1.5 ? 'var(--warning)' : 'var(--danger)', fontWeight: 500 }}>
              {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-hint)' }}>
              {campaign.purchases > 0 ? `${campaign.purchases} purch.` : 'no sales'}
            </span>
          </div>
        </td>
      );
    case 'leads':
      return (
        <td className="numeric">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ color: 'var(--rose-gold)', fontWeight: 500 }}>
              {campaign.leads > 0 ? formatNumber(campaign.leads) + ' leads' : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-hint)' }}>
              {campaign.cpl > 0 ? `CPL ${formatCurrency(campaign.cpl)}` : 'no leads'}
            </span>
          </div>
        </td>
      );
    case 'traffic':
      return (
        <td className="numeric">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ color: '#60A5FA', fontWeight: 500 }}>
              {campaign.clicks > 0 ? formatNumber(campaign.clicks) + ' clicks' : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-hint)' }}>
              {ctr > 0 ? `CTR ${ctr.toFixed(2)}%` : 'no clicks'}
            </span>
          </div>
        </td>
      );
    case 'awareness':
      return (
        <td className="numeric">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ color: '#A78BFA', fontWeight: 500 }}>
              {campaign.reach > 0 ? formatNumber(campaign.reach) + ' reach' : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-hint)' }}>
              {campaign.frequency > 0 ? `${campaign.frequency.toFixed(1)}x freq.` : ''}
            </span>
          </div>
        </td>
      );
    default:
      return (
        <td className="numeric" style={{ color: 'var(--text-hint)' }}>
          {campaign.clicks > 0 ? formatNumber(campaign.clicks) + ' clicks' : '—'}
        </td>
      );
  }
};

// ─── Campaign row ─────────────────────────────────────────────
const CampaignRow: React.FC<{ campaign: Campaign; showBrand?: string }> = ({ campaign, showBrand }) => {
  const goal = classifyObjective(campaign.objective);
  const meta = GOAL_META[goal];
  const cpm  = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;

  return (
    <tr>
      {/* Campaign name + objective badge */}
      <td style={{ minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {statusIcon[campaign.status] || null}
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 400,
            background: meta.bg, color: meta.color,
            borderRadius: 3, padding: '1px 6px', border: `0.5px solid ${meta.color}22`,
          }}>
            {meta.emoji} {meta.label}
          </span>
          {showBrand && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-hint)' }}>
              · {showBrand}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td>
        <span className={`badge ${campaign.status === 'ACTIVE' ? 'badge-success' : campaign.status === 'PAUSED' ? 'badge-high' : 'badge-neutral'}`}>
          {campaign.status}
        </span>
      </td>

      {/* Spend */}
      <td className="numeric">{formatCurrency(campaign.spend)}</td>

      {/* CPM */}
      <td className="numeric" style={{ color: 'var(--text-secondary)' }}>
        {cpm > 0 ? formatCurrency(cpm) : '—'}
      </td>

      {/* Impressions */}
      <td className="numeric" style={{ color: 'var(--text-secondary)' }}>
        {campaign.impressions > 0 ? formatNumber(campaign.impressions) : '—'}
      </td>

      {/* Smart conversion column */}
      <ConversionCell campaign={campaign} goal={goal} />

      {/* Last sync */}
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)', whiteSpace: 'nowrap' }}>
        {new Date(campaign.synced_at).toLocaleString()}
      </td>
    </tr>
  );
};

// ─── Smart KPI strip ──────────────────────────────────────────
const SmartKpis: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
  const totalSpend  = campaigns.reduce((s, c) => s + c.spend, 0);
  const active      = campaigns.filter(c => c.status === 'ACTIVE').length;

  // Detect majority goal
  const goalCounts: Record<GoalType, number> = { sales: 0, leads: 0, traffic: 0, awareness: 0, engagement: 0, unknown: 0 };
  campaigns.forEach(c => { goalCounts[classifyObjective(c.objective)]++; });
  const dominantGoal = (Object.keys(goalCounts) as GoalType[]).reduce((a, b) => goalCounts[a] > goalCounts[b] ? a : b);

  const kpis = useMemo(() => {
    const base = [
      { label: 'Total Spend',    value: formatCurrency(totalSpend), color: 'var(--text-primary)' },
      { label: 'Active',         value: String(active),             color: 'var(--rose-gold)' },
      { label: 'Total',          value: String(campaigns.length),   color: 'var(--text-secondary)' },
    ];

    if (dominantGoal === 'sales') {
      const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
      const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);
      const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      return [
        ...base,
        { label: 'Revenue',    value: formatCurrency(totalRevenue), color: 'var(--success)' },
        { label: 'Purchases',  value: formatNumber(totalPurchases),  color: 'var(--success)' },
        { label: 'Avg ROAS',   value: avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—', color: avgRoas >= 3 ? 'var(--success)' : avgRoas >= 1.5 ? 'var(--warning)' : 'var(--danger)' },
      ];
    }

    if (dominantGoal === 'leads') {
      const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
      const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
      const qualLeads = campaigns.reduce((s, c) => s + c.qualified_leads, 0);
      return [
        ...base,
        { label: 'Total Leads', value: formatNumber(totalLeads), color: 'var(--rose-gold)' },
        { label: 'Avg CPL',     value: avgCpl > 0 ? formatCurrency(avgCpl) : '—', color: 'var(--text-primary)' },
        { label: 'Qualified',   value: formatNumber(qualLeads), color: 'var(--success)' },
      ];
    }

    if (dominantGoal === 'traffic') {
      const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
      const totalImpr   = campaigns.reduce((s, c) => s + c.impressions, 0);
      const avgCtr      = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0;
      const avgCpc      = totalClicks > 0 ? totalSpend / totalClicks : 0;
      return [
        ...base,
        { label: 'Clicks', value: formatNumber(totalClicks), color: '#60A5FA' },
        { label: 'CTR',    value: avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '—', color: 'var(--text-primary)' },
        { label: 'Avg CPC', value: avgCpc > 0 ? formatCurrency(avgCpc) : '—', color: 'var(--text-primary)' },
      ];
    }

    if (dominantGoal === 'awareness') {
      const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
      const totalImpr  = campaigns.reduce((s, c) => s + c.impressions, 0);
      const avgCpm     = totalImpr > 0 ? (totalSpend / totalImpr) * 1000 : 0;
      const avgFreq    = campaigns.filter(c => c.frequency > 0).length > 0
        ? campaigns.reduce((s, c) => s + c.frequency, 0) / campaigns.filter(c => c.frequency > 0).length : 0;
      return [
        ...base,
        { label: 'Reach',     value: formatNumber(totalReach), color: '#A78BFA' },
        { label: 'Avg CPM',   value: avgCpm > 0 ? formatCurrency(avgCpm) : '—', color: 'var(--text-primary)' },
        { label: 'Avg Freq.', value: avgFreq > 0 ? `${avgFreq.toFixed(1)}x` : '—', color: avgFreq > 3.5 ? 'var(--warning)' : 'var(--success)' },
      ];
    }

    // Mixed / unknown — show general stats
    const totalImpr = campaigns.reduce((s, c) => s + c.impressions, 0);
    const avgCpm    = totalImpr > 0 ? (totalSpend / totalImpr) * 1000 : 0;
    return [
      ...base,
      { label: 'Impressions', value: formatNumber(totalImpr), color: 'var(--text-secondary)' },
      { label: 'Avg CPM',     value: avgCpm > 0 ? formatCurrency(avgCpm) : '—', color: 'var(--text-primary)' },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, dominantGoal, totalSpend, active]);

  return (
    <div className="grid-4" style={{ marginBottom: 20, gridTemplateColumns: `repeat(${Math.min(kpis.length, 6)}, 1fr)` }}>
      {kpis.map(({ label, value, color }) => (
        <div key={label} className="metric-card">
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ color, fontSize: 20 }}>{value}</div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Campaigns page ──────────────────────────────────────
const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">Campaign Data</div>
            <h1 className="page-title">Campaigns</h1>
            <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{campaigns.filter(c => c.status === 'ACTIVE').length} active</span>
              <span style={{ color: 'var(--text-hint)' }}>·</span>
              <span>{campaigns.length} total</span>
              {metaAccounts.length > 0
                ? <span style={{ color: 'var(--success)' }}>· {metaAccounts.length} Meta account{metaAccounts.length > 1 ? 's' : ''}</span>
                : <span style={{ color: 'var(--danger)' }}>· No account connected</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {syncMsg && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{syncMsg}</span>
            )}
            <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={13} strokeWidth={1.5} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync Meta'}
            </button>
            <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              <ExternalLink size={12} strokeWidth={1.5} />
              Ads Manager
            </a>
          </div>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>

        {/* Brand selector */}
        {brands.length > 1 && (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              style={{
                appearance: 'none', background: 'var(--app-surface)', border: '0.5px solid var(--app-border)',
                borderRadius: 4, padding: '7px 32px 7px 12px',
                fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-primary)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="all">All Brands</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-hint)', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Objective / goal filter chips */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(['all', 'sales', 'leads', 'traffic', 'awareness', 'engagement'] as const).map(g => {
            const count = g === 'all' ? brandCampaigns.length : goalCounts[g as GoalType];
            if (g !== 'all' && count === 0) return null;
            const meta = g === 'all' ? null : GOAL_META[g as GoalType];
            const active = goalFilter === g;
            return (
              <button
                key={g}
                onClick={() => setGoalFilter(g)}
                style={{
                  background: active ? (meta?.bg || 'rgba(196,131,106,0.15)') : 'transparent',
                  border: `0.5px solid ${active ? (meta?.color || 'var(--rose-gold)') : 'var(--app-border)'}`,
                  borderRadius: 4, padding: '5px 11px',
                  fontFamily: 'var(--font-sans)', fontSize: 10,
                  color: active ? (meta?.color || 'var(--rose-gold)') : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {meta && <span>{meta.emoji}</span>}
                {g === 'all' ? 'All' : GOAL_META[g as GoalType].label}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Smart KPI strip ── */}
      {campaigns.length > 0 && <SmartKpis campaigns={campaigns} />}

      {/* ── Table ── */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Spend</th>
              <th>CPM</th>
              <th>Impressions</th>
              <th>Conversion</th>
              <th>Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 2 }} /></td>
                  ))}</tr>
                ))
              : campaigns.length === 0
              ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', fontFamily: 'var(--font-sans)', fontWeight: 300, color: 'var(--text-muted)' }}>
                    {allCampaigns.length > 0
                      ? 'No campaigns match this filter.'
                      : 'No campaigns synced yet. Click "Sync Meta" to pull your campaign data.'}
                  </td>
                </tr>
              )
              : campaigns.map(c => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    showBrand={selectedBrand === 'all' && brands.length > 1 ? getBrandName(c.brand_id) : undefined}
                  />
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Campaigns;
