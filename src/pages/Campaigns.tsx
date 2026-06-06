import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { getCampaigns, getBrands, getAdAccounts } from '../lib/supabase';
import { syncMetaCampaigns } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatNumber, roasStatus } from '../lib/benchmarks';
import type { Campaign } from '../types';

const statusIcon: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle size={12} style={{ color: 'var(--success)' }} />,
  PAUSED: <Clock size={12} style={{ color: 'var(--warning)' }} />,
  ARCHIVED: <AlertCircle size={12} style={{ color: 'var(--text-muted)' }} />,
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
          <span style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.name}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          {campaign.objective}
        </div>
      </td>
      <td>
        <span className={`badge badge-${campaign.status === 'ACTIVE' ? 'success' : campaign.status === 'PAUSED' ? 'high' : 'neutral'}`}>
          {campaign.status}
        </span>
      </td>
      <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
        {formatCurrency(campaign.spend)}
      </td>
      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {formatCurrency(cpm)}
      </td>
      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {formatCurrency(cpc)}
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {campaign.roas >= 3 ? <TrendingUp size={12} style={{ color: 'var(--success)' }} /> : <TrendingDown size={12} style={{ color: 'var(--danger)' }} />}
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: roasColor }}>
            {campaign.roas.toFixed(2)}x
          </span>
        </div>
      </td>
      <td style={{ color: 'var(--text-secondary)' }}>
        {formatNumber(campaign.impressions)}
      </td>
      <td style={{ color: 'var(--text-secondary)' }}>
        {formatNumber(campaign.purchases)}
      </td>
      <td style={{ color: 'var(--success)', fontWeight: 600 }}>
        {formatCurrency(campaign.revenue)}
      </td>
      <td style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
    if (!activeBrand || !metaAccount) {
      setSyncMsg('Connect a Meta Ads account first');
      return;
    }
    setSyncing(true);
    setSyncMsg('');
    try {
      await syncMetaCampaigns(activeBrand.id, metaAccount.id);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSyncMsg(`✅ Synced ${campaigns.length} campaigns`);
    } catch (err: unknown) {
      setSyncMsg(`❌ ${err instanceof Error ? err.message : 'Sync failed'}`);
    } finally {
      setSyncing(false);
    }
  };

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Campaigns</div>
            <div className="page-subtitle">
              {activeCampaigns} active · {campaigns.length} total ·{' '}
              {metaAccount ? (
                <span style={{ color: 'var(--success)' }}>Meta connected</span>
              ) : (
                <span style={{ color: 'var(--danger)' }}>No account connected</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {syncMsg && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{syncMsg}</span>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Meta'}
            </button>
            <a
              href="https://adsmanager.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              <ExternalLink size={14} />
              Ads Manager
            </a>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Spend', value: formatCurrency(totalSpend), color: 'var(--text-primary)' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'var(--success)' },
          { label: 'Active Campaigns', value: activeCampaigns.toString(), color: 'var(--accent)' },
          { label: 'Avg ROAS', value: totalSpend > 0 ? `${(totalRevenue / totalSpend).toFixed(2)}x` : '—', color: totalSpend > 0 && totalRevenue / totalSpend >= 3 ? 'var(--success)' : 'var(--warning)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ gap: 8 }}>
            <div className="metric-label">{label}</div>
            <div className="metric-value" style={{ color, fontSize: 22 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Spend</th>
              <th>CPM</th>
              <th>CPC</th>
              <th>ROAS</th>
              <th>Impressions</th>
              <th>Purchases</th>
              <th>Revenue</th>
              <th>Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j}>
                      <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                  No campaigns synced yet. Click "Sync Meta" to pull your campaign data.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Campaigns;
