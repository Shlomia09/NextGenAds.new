import React, { useState, Component } from 'react';

// ── Error boundary — shows actual error instead of blank screen ──
class ConnectErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0F0A07', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 24, maxWidth: 600, width: '100%' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#EF4444', marginBottom: 8 }}>RENDER ERROR</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#F5E6D8', wordBreak: 'break-all' }}>{this.state.error}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Search, Mail, CheckCircle, AlertCircle,
  ArrowRight, RefreshCw, Zap, Trash2, Link2Off,
} from 'lucide-react';


import { getAdAccounts, supabase } from '../lib/supabase';
import { initiateMetaOAuth, syncMetaCampaigns } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ShopifyConnect from '../components/connect/ShopifyConnect';
import WooCommerceConnect from '../components/connect/WooCommerceConnect';

type EcomAccount = {
  id: string;
  user_id: string;
  brand_id?: string;
  platform: string;
  store_url: string;
  status: string;
  last_synced_at?: string;
  connected_at: string;
};


const Connect: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Per-account sync state
  const [syncingId,  setSyncingId]  = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, { synced: number; total: number }>>({});
  const [syncErrors,  setSyncErrors]  = useState<Record<string, string>>({});

  // Disconnect modal
  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; name: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);


  const successParam = searchParams.get('success');
  const errorParam   = searchParams.get('error');

  const { data: adAccounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn:  () => getAdAccounts(user!.id),
    enabled:  !!user,
  });

  const metaAccounts = adAccounts.filter((a) => a.platform === 'meta');

  // ── Brands query ──────────────────────────────────────────────
  const { data: brands = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['brands', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('id, name').eq('user_id', user!.id);
      return (data || []) as { id: string; name: string }[];
    },
    enabled: !!user,
  });

  // ── Ecommerce accounts query ───────────────────────────────────
  const { data: ecomAccounts = [], refetch: refetchEcom } = useQuery<EcomAccount[]>({
    queryKey: ['ecomAccounts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('ecommerce_accounts').select('*').eq('user_id', user!.id).eq('status', 'active');
      return data || [];
    },
    enabled: !!user,
  });

  // ── Ecommerce sync ────────────────────────────────────────────
  const [syncingEcomId, setSyncingEcomId] = useState<string | null>(null);

  const handleEcomSync = async (accountId: string) => {
    setSyncingEcomId(accountId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${supabaseUrl}/functions/v1/ecommerce-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ecommerce_account_id: accountId }),
      });
      refetchEcom();
      queryClient.invalidateQueries({ queryKey: ['ecomAccounts'] });
    } catch (err) {
      console.error('Ecommerce sync failed:', err);
    } finally {
      setSyncingEcomId(null);
    }
  };

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
  const handleDisconnect = async (deleteData: boolean) => {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    const { id: accountId } = disconnectTarget;

    try {
      if (deleteData) {
        // Delete all campaigns associated with this account's brand
        const { data: brands } = await supabase
          .from('brands').select('id').eq('user_id', user!.id);
        if (brands && brands.length > 0) {
          await supabase.from('campaigns')
            .delete()
            .in('brand_id', brands.map((b: { id: string }) => b.id));
        }
      }
      // Always remove the ad account record
      await supabase.from('ad_accounts').delete().eq('id', accountId);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      refetchAccounts();
    } finally {
      setDisconnecting(false);
      setDisconnectTarget(null);
    }
  };


  return (
    <div className="page-container">

      {/* ── Disconnect Confirmation Modal ── */}
      {disconnectTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: '#1C1208', border: '0.5px solid #2a1a0e',
            borderRadius: 8, padding: '32px 36px',
            maxWidth: 440, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {/* Icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, background: 'rgba(239,68,68,0.08)',
                border: '0.5px solid rgba(239,68,68,0.25)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Link2Off size={18} color="#EF4444" strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: '#F5E6D8', marginBottom: 3 }}>
                  Disconnect account?
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#4a2e1e' }}>
                  {disconnectTarget.name}
                </div>
              </div>
            </div>

            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: '#8B6050', lineHeight: 1.65, margin: 0 }}>
              Do you want to keep the campaign data already synced to NextAdsGen, or delete everything?
            </p>

            {/* Two action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Keep data — just disconnect token */}
              <button
                onClick={() => handleDisconnect(false)}
                disabled={disconnecting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(196,131,106,0.08)', border: '0.5px solid rgba(196,131,106,0.3)',
                  borderRadius: 5, padding: '13px 16px', cursor: 'pointer',
                  textAlign: 'left', width: '100%', transition: 'background 0.15s',
                }}
              >
                <Link2Off size={16} color="#C4836A" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500, color: '#C4836A', marginBottom: 2 }}>
                    Disconnect only
                  </div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300, color: '#8B6050' }}>
                    Keep all campaign data — just remove the connection
                  </div>
                </div>
              </button>

              {/* Delete everything */}
              <button
                onClick={() => handleDisconnect(true)}
                disabled={disconnecting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)',
                  borderRadius: 5, padding: '13px 16px', cursor: 'pointer',
                  textAlign: 'left', width: '100%', transition: 'background 0.15s',
                }}
              >
                <Trash2 size={16} color="#EF4444" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500, color: '#EF4444', marginBottom: 2 }}>
                    Delete all data
                  </div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300, color: '#8B6050' }}>
                    Remove connection + delete all synced campaigns
                  </div>
                </div>
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={() => setDisconnectTarget(null)}
              disabled={disconnecting}
              style={{
                background: 'none', border: 'none', fontFamily: "'Outfit', sans-serif",
                fontSize: 10, color: '#4a2e1e', cursor: 'pointer', alignSelf: 'center',
                letterSpacing: '0.06em',
              }}
            >
              {disconnecting ? 'Processing…' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

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
      {successParam === 'shopify_connected' && (
        <div style={{
          background: 'rgba(16,185,129,0.08)', border: '0.5px solid rgba(16,185,129,0.3)',
          borderRadius: 6, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#10B981',
        }}>
          <CheckCircle size={14} strokeWidth={1.5} />
          🛍️ Shopify connected successfully! Click <strong style={{ margin: '0 4px' }}>Sync Now</strong> to import your orders.
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
                        onClick={() => setDisconnectTarget({ id: account.id, name: account.account_name })}
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

      {/* ── eCommerce Integrations ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 9,
          letterSpacing: '0.2em',
          color: 'var(--rose-gold, #C4836A)',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
        >
          eCommerce Integration
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {user && <ShopifyConnect userId={user.id} brands={brands} />}
          {user && <WooCommerceConnect userId={user.id} brands={brands} />}
        </div>

        {/* Connected stores list */}
        {ecomAccounts.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ecomAccounts.map((account) => (
              <div
                key={account.id}
                style={{
                  background: 'var(--app-surface, #1C1208)',
                  border: '0.5px solid rgba(16,185,129,0.3)',
                  borderRadius: 6,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{account.platform === 'shopify' ? '🛍️' : '🛒'}</span>
                  <div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500, color: '#F5E6D8' }}>
                      {account.store_url}
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#4a2e1e', marginTop: 2 }}>
                      {account.platform.toUpperCase()} · Last synced:{' '}
                      {account.last_synced_at
                        ? new Date(account.last_synced_at).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleEcomSync(account.id)}
                  disabled={syncingEcomId === account.id}
                >
                  {syncingEcomId === account.id
                    ? <><RefreshCw size={11} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />Syncing…</>
                    : <><Zap size={11} strokeWidth={1.5} />Sync Now</>}
                </button>
              </div>
            ))}
          </div>
        )}
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

const ConnectWithBoundary: React.FC = () => (
  <ConnectErrorBoundary>
    <Connect />
  </ConnectErrorBoundary>
);

export default ConnectWithBoundary;
