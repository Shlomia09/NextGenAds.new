import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { getCampaigns, getBrands, getAdAccounts } from '../lib/supabase';
import { syncMetaCampaigns } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatNumber, roasStatus } from '../lib/benchmarks';
import type { Campaign } from '../types';

const statusIcon: Record<string, React.ReactNode> = {
  ACTIVE:   <CheckCircle size={11} strokeWidth={1.5} style={{ color: 'var(--success)' }} />,
  PAUSED:   <Clock size={11} strokeWidth={1.5} style={{ color: 'var(--warning)' }} />,
  ARCHIVED: <AlertCircle size={11} strokeWidth={1.5} style={{ color: 'var(--text-hint)' }} />,
};

const CampaignRow: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const status = roasStatus(campaign.roas);
  const roasColor = status === 'success' ? 'var(--success)' : status === 'warning' ? 'var(--warning)' : 'var(--danger)';
  const cpm = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;
  const cpc = campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0;

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {statusIcon[campaign.status] || null}
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.name}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)', marginTop: 2, letterSpacing: '0.06em' }}>
          {campaign.objective}
        </div>
      </td>
      <td>
        <span className={`badge ${campaign.status === 'ACTIVE' ? 'badge-success' : campaign.status === 'PAUSED' ? 'badge-high' : 'badge-neutral'}`}>
          {campaign.status}
        </span>
      </td>
      <td className="numeric">{formatCurrency(campaign.spend)}</td>
      <td className="numeric" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(cpm)}</td>
      <td className="numeric" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(cpc)}</td>
      <td className="numeric">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {campaign.roas >= 3
            ? <TrendingUp size={11} strokeWidth={1.5} style={{ color: 'var(--success)' }} />
            : <TrendingDown size={11} strokeWidth={1.5} style={{ color: 'var(--danger)' }} />}
          <span style={{ fontWeight: 500, color: roasColor }}>{campaign.roas.toFixed(2)}x</span>
        </div>
      </td>
      <td className="numeric" style={{ color: 'var(--text-secondary)' }}>{formatNumber(campaign.impressions)}</td>
      <td className="numeric" style={{ color: 'var(--text-secondary)' }}>{formatNumber(campaign.purchases)}</td>
      <td className="numeric" style={{ color: 'var(--success)' }}>{formatCurrency(campaign.revenue)}</td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)' }}>
        {new Date(campaign.synced_at).toLocaleString()}
      </td>
    </tr>
  );
};

const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const { data: brands } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => getBrands(user!.id),
    enabled: !!user,
  });

  const activeBrand = brands?.[0];

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', activeBrand?.id],
    queryFn: () => getCampaigns(activeBrand!.id),
    enabled: !!activeBrand,
  });

  const { data: adAccounts = [] } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn: () => getAdAccounts(user!.id),
    enabled: !!user,
  });

  const metaAccount = adAccounts.find((a) => a.platform === 'meta');

  const handleSync = async () => {
    if (!activeBrand || !metaAccount) { setSyncMsg('Connect a Meta Ads account first'); return; }
    setSyncing(true); setSyncMsg('');
    try {
      await syncMetaCampaigns(activeBrand.id, metaAccount.id);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSyncMsg(`Synced ${campaigns.length} campaigns`);
    } catch (err: unknown) {
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false); }
  };

  const totalSpend    = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue  = campaigns.reduce((s, c) => s + c.revenue, 0);
  const activeCounts  = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const avgRoas       = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="section-eyebrow">Campaign Data</div>
            <h1 className="page-title">Campaigns</h1>
            <p className="page-subtitle">
              {activeCounts} active · {campaigns.length} total ·{' '}
              {metaAccount
                ? <span style={{ color: 'var(--success)' }}>Meta connected</span>
                : <span style={{ color: 'var(--danger)' }}>No account connected</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

      {/* KPI summary */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Spend',   value: formatCurrency(totalSpend),  color: 'var(--text-primary)' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'var(--success)' },
          { label: 'Active',        value: String(activeCounts),         color: 'var(--rose-gold)' },
          { label: 'Avg ROAS',      value: totalSpend > 0 ? `${avgRoas.toFixed(2)}x` : '—',
            color: avgRoas >= 3 ? 'var(--success)' : avgRoas >= 1.5 ? 'var(--warning)' : 'var(--danger)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="metric-card">
            <div className="metric-label">{label}</div>
            <div className="metric-value" style={{ color, fontSize: 22 }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th><th>Status</th><th>Spend</th><th>CPM</th>
              <th>CPC</th><th>ROAS</th><th>Impressions</th><th>Purchases</th>
              <th>Revenue</th><th>Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 2 }} /></td>
                    ))}
                  </tr>
                ))
              : campaigns.length === 0
              ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', fontFamily: 'var(--font-sans)', fontWeight: 300, color: 'var(--text-muted)' }}>
                    No campaigns synced yet. Click "Sync Meta" to pull your campaign data.
                  </td>
                </tr>
              )
              : campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Campaigns;
