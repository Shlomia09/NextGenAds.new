import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Search, Mail, CheckCircle, AlertCircle,
  ArrowRight, RefreshCw, Zap, Clock
} from 'lucide-react';
import { getAdAccounts, supabase } from '../lib/supabase';
import { initiateMetaOAuth, syncMetaCampaigns } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';


const Connect: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Per-account sync state
  const [syncingId,  setSyncingId]  = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, { synced: number; total: number }>>({});
  const [syncErrors,  setSyncErrors]  = useState<Record<string, string>>({});

  const successParam = searchParams.get('success');
  const errorParam   = searchParams.get('error');

  const { data: adAccounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn:  () => getAdAccounts(user!.id),
    enabled:  !!user,
  });

  const metaAccounts = adAccounts.filter((a) => a.platform === 'meta');

  // ── Sync a specific account ──────────────────────────────────
  const handleSync = async (accountId: string) => {
    setSyncingId(accountId);
    setSyncResults(prev => { const n = { ...prev }; delete n[accountId]; return n; });
    setSyncErrors(prev  => { const n = { ...prev }; delete n[accountId]; return n; });

    try {
      const { data: brands } = await supabase
        .from('brands')
        .select('id')
        .eq('user_id', user!.id)
        .limit(1)
        .single();

      if (!brands?.id) {
        setSyncErrors(prev => ({ ...prev, [accountId]: 'No brand found. Complete onboarding first.' }));
        return;
      }

      const result = await syncMetaCampaigns(brands.id, accountId);
      setSyncResults(prev => ({ ...prev, [accountId]: { synced: result.synced, total: result.total } }));
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (err) {
      setSyncErrors(prev => ({ ...prev, [accountId]: err instanceof Error ? err.message : 'Sync failed.' }));
    } finally {
      setSyncingId(null);
    }
  };

  // ── Disconnect a specific account ────────────────────────────
  const handleDisconnect = async (accountId: string) => {
    await supabase.from('ad_accounts').delete().eq('id', accountId);
    refetchAccounts();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="section-eyebrow">Integrations</div>
        <h1 className="page-title">Connect Your Accounts</h1>
        <p className="page-subtitle">
          Link your ad platforms to unlock real-time benchmark comparisons and AI recommendations
        </p>
      </div>

      {/* ── OAuth success / error banners ── */}
      {successParam === 'meta_connected' && (
        <div style={{
          background: 'rgba(16,185,129,0.08)', border: '0.5px solid rgba(16,185,129,0.3)',
          borderRadius: 6, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#10B981',
        }}>
          <CheckCircle size={14} strokeWidth={1.5} />
          Meta Ads connected successfully. Click <strong style={{ margin: '0 4px' }}>Sync Now</strong> to pull your campaigns.
        </div>
      )}
      {errorParam && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)',
          borderRadius: 6, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#EF4444',
        }}>
          <AlertCircle size={14} strokeWidth={1.5} />
          Connection error: {errorParam.replace(/_/g, ' ')}. Please try again.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>

        {/* ── Meta Ads ── */}
        <div className="conn-card" style={metaAccounts.length > 0 ? { borderColor: 'rgba(16,185,129,0.35)', gridColumn: metaAccounts.length > 1 ? 'span 2' : undefined } : {}}>
          <div className="conn-header">
            <div className="conn-icon" style={{ background: '#1877F2' }}>
              <Globe size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="conn-name">Meta Ads</div>
              <div className="conn-desc">Facebook & Instagram campaigns</div>
            </div>
            {metaAccounts.length > 0
              ? <span className="badge badge-success" style={{ marginLeft: 'auto' }}>
                  <CheckCircle size={9} strokeWidth={1.5} />{metaAccounts.length} account{metaAccounts.length !== 1 ? 's' : ''} connected
                </span>
              : <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>
                  <AlertCircle size={9} strokeWidth={1.5} />Not connected
                </span>}
          </div>

          {metaAccounts.length > 0 ? (
            <>
              {/* Account list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metaAccounts.map(account => (
                  <div key={account.id} style={{
                    background: 'var(--app-bg, #0F0A07)',
                    border: '0.5px solid var(--app-border, #2a1a0e)',
                    borderRadius: 5, padding: '12px 14px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    {/* Account info row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div className="conn-account-name">{account.account_name}</div>
                        <div className="conn-account-id">ID: {account.account_id}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <div className="live-dot" />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--success, #10B981)' }}>
                            Connected {new Date(account.connected_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {/* Disconnect */}
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        title="Disconnect this account"
                        style={{
                          background: 'none', border: '0.5px solid #2a1a0e',
                          borderRadius: 3, padding: '3px 8px',
                          fontFamily: "'Outfit', sans-serif", fontSize: 9,
                          color: '#8B6050', cursor: 'pointer', flexShrink: 0,
                          letterSpacing: '0.06em',
                        }}
                      >
                        Disconnect
                      </button>
                    </div>

                    {/* Sync result / error for this account */}
                    {syncResults[account.id] && (
                      <div style={{ background: 'rgba(16,185,129,0.06)', border: '0.5px solid rgba(16,185,129,0.2)', borderRadius: 4, padding: '7px 11px', fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={11} strokeWidth={1.5} />
                        Synced {syncResults[account.id].synced} / {syncResults[account.id].total} campaigns
                      </div>
                    )}
                    {syncErrors[account.id] && (
                      <div style={{ background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '7px 11px', fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={11} strokeWidth={1.5} />{syncErrors[account.id]}
                      </div>
                    )}

                    {/* Sync button */}
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSync(account.id)}
                      disabled={syncingId === account.id}
                    >
                      {syncingId === account.id
                        ? <><RefreshCw size={12} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />Syncing…</>
                        : <><Zap size={12} strokeWidth={1.5} />Sync Now</>}
                    </button>
                  </div>
                ))}
              </div>

              {/* Add another account */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={initiateMetaOAuth}
                style={{ alignSelf: 'flex-start' }}
              >
                <Globe size={11} strokeWidth={1.5} />
                + Add another Meta account
              </button>

              {/* Go to dashboard */}
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
                View Intelligence Dashboard
                <ArrowRight size={11} strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <>
              <ul className="conn-features">
                <li>Campaign performance sync (ROAS, CPM, spend)</li>
                <li>Real-time comparison vs Beauty benchmarks</li>
                <li>AI recommendations from your live data</li>
                <li>One-click campaign execution (Growth plan)</li>
              </ul>
              <button className="btn btn-primary" onClick={initiateMetaOAuth}>
                <Globe size={13} strokeWidth={1.5} />
                Connect Meta Ads
                <ArrowRight size={13} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {/* ── Google Ads (Coming Soon) ── */}
        <div className="conn-card conn-soon">
          <div className="conn-header">
            <div className="conn-icon" style={{ background: '#4285F4' }}>
              <Search size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="conn-name">Google Ads</div>
              <div className="conn-desc">Search & Display campaigns</div>
            </div>
            <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>Coming Soon</span>
          </div>
          <ul className="conn-features" style={{ opacity: 0.4 }}>
            <li>Google Search + Brand campaigns</li>
            <li>Cross-platform ROAS view</li>
            <li>Intent capture analysis</li>
          </ul>
          <button className="btn btn-secondary" disabled>
            <Search size={13} strokeWidth={1.5} />
            Connect Google Ads
          </button>
        </div>

        {/* ── Klaviyo (Coming Soon) ── */}
        <div className="conn-card conn-soon">
          <div className="conn-header">
            <div className="conn-icon" style={{ background: '#231F20' }}>
              <Mail size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="conn-name">Klaviyo</div>
              <div className="conn-desc">Email flows & revenue attribution</div>
            </div>
            <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>Coming Soon</span>
          </div>
          <ul className="conn-features" style={{ opacity: 0.4 }}>
            <li>Email sequence analysis</li>
            <li>AOV-based flow recommendations</li>
            <li>High-AOV closing sequence optimizer</li>
          </ul>
          <button className="btn btn-secondary" disabled>
            <Mail size={13} strokeWidth={1.5} />
            Connect Klaviyo
          </button>
        </div>
      </div>

      {/* ── Benchmark note ── */}
      <div className="conn-benchmark-note">
        <div className="conn-bench-eyebrow">Always active</div>
        <p>
          Benchmark intelligence is powered by 9 years of Beauty & Cosmetics campaign data — even before
          you connect any accounts. Connect Meta to layer your real performance on top and get specific AI recommendations.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .conn-card {
          background: var(--app-surface, #1C1208);
          border: 0.5px solid var(--app-border, #2a1a0e);
          border-radius: 6px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .conn-card:hover { border-color: rgba(196,131,106,0.3); box-shadow: 0 4px 20px rgba(196,131,106,0.05); }
        .conn-soon { opacity: 0.65; }

        .conn-header { display: flex; align-items: center; gap: 12px; }

        .conn-icon {
          width: 38px; height: 38px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }

        .conn-name { font-family: 'Playfair Display', serif; font-size: 14px; color: var(--text-primary, #F5E6D8); }
        .conn-desc { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 300; color: var(--text-muted, #8B6050); margin-top: 2px; }

        .conn-account-info {
          background: var(--app-bg, #0F0A07);
          border: 0.5px solid var(--app-border, #2a1a0e);
          border-radius: 4px; padding: 10px 12px;
          display: flex; flex-direction: column; gap: 3px;
        }
        .conn-account-name { font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 500; color: var(--text-primary, #F5E6D8); }
        .conn-account-id  { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text-hint, #4a2e1e); }

        .conn-features { list-style: none; display: flex; flex-direction: column; gap: 6px; padding: 0; }
        .conn-features li {
          font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 300;
          color: var(--text-secondary, #8B6050);
          padding-left: 14px; position: relative;
        }
        .conn-features li::before { content: '—'; position: absolute; left: 0; color: #C4836A; font-size: 10px; }

        .live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10B981;
          animation: pulse-subtle 2.5s ease-in-out infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.5; } 50% { opacity: 1; }
        }

        .conn-benchmark-note {
          margin-top: 24px;
          background: rgba(196,131,106,0.05);
          border: 0.5px solid rgba(196,131,106,0.15);
          border-radius: 6px; padding: 16px 20px;
        }
        .conn-bench-eyebrow {
          font-family: 'Outfit', sans-serif; font-size: 9px;
          font-weight: 400; letter-spacing: 0.22em; text-transform: uppercase;
          color: #C4836A; margin-bottom: 6px;
        }
        .conn-benchmark-note p {
          font-family: 'Outfit', sans-serif; font-size: 13px;
          font-weight: 300; color: var(--text-secondary, #8B6050); line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

export default Connect;
