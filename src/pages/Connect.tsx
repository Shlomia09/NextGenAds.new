import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Search, Mail, CheckCircle, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { getAdAccounts } from '../lib/supabase';
import { initiateMetaOAuth } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';

const Connect: React.FC = () => {
  const { user } = useAuth();

  const { data: adAccounts = [] } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn: () => getAdAccounts(user!.id),
    enabled: !!user,
  });

  const metaAccount = adAccounts.find((a) => a.platform === 'meta');

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">Connect Your Accounts</div>
        <div className="page-subtitle">
          Integrate your ad platforms to unlock real-time benchmark comparisons and AI recommendations
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>

        {/* Meta Ads */}
        <div className="connect-card" style={metaAccount ? { borderColor: 'rgba(16,185,129,0.4)' } : {}}>
          <div className="connect-card-header">
            <div className="connect-icon" style={{ background: '#1877F2' }}>
              <Globe size={20} />
            </div>
            <div>
              <div className="connect-name">Meta Ads</div>
              <div className="connect-desc">Facebook & Instagram campaigns</div>
            </div>
            {metaAccount ? (
              <span className="badge badge-success" style={{ marginLeft: 'auto' }}>
                <CheckCircle size={10} /> Connected
              </span>
            ) : (
              <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>
                <AlertCircle size={10} /> Not connected
              </span>
            )}
          </div>

          {metaAccount ? (
            <div className="connect-account-info">
              <div className="connect-account-name">{metaAccount.account_name}</div>
              <div className="connect-account-id">ID: {metaAccount.account_id}</div>
              <div className="connect-account-status">
                <div className="live-dot" />
                Last synced: {new Date(metaAccount.connected_at).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <>
              <p className="connect-feature-list">
                ✅ Campaign performance sync<br />
                ✅ Real-time ROAS vs benchmarks<br />
                ✅ AI recommendations from your data<br />
                ✅ One-click campaign execution
              </p>
              <button className="btn btn-primary" onClick={initiateMetaOAuth}>
                <Globe size={14} />
                Connect Meta Ads
                <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>

        {/* Google Ads */}
        <div className="connect-card connect-card-soon">
          <div className="connect-card-header">
            <div className="connect-icon" style={{ background: '#4285F4' }}>
              <Search size={20} />
            </div>
            <div>
              <div className="connect-name">Google Ads</div>
              <div className="connect-desc">Search & Display campaigns</div>
            </div>
            <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>Coming Soon</span>
          </div>
          <p className="connect-feature-list" style={{ opacity: 0.5 }}>
            ✅ Google Search + Brand campaigns<br />
            ✅ Cross-platform ROAS view<br />
            ✅ Intent capture analysis
          </p>
          <button className="btn btn-secondary" disabled>
            <Search size={14} />
            Connect Google Ads
          </button>
        </div>

        {/* Klaviyo */}
        <div className="connect-card connect-card-soon">
          <div className="connect-card-header">
            <div className="connect-icon" style={{ background: '#231F20' }}>
              <Mail size={20} />
            </div>
            <div>
              <div className="connect-name">Klaviyo</div>
              <div className="connect-desc">Email flows & revenue attribution</div>
            </div>
            <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>Coming Soon</span>
          </div>
          <p className="connect-feature-list" style={{ opacity: 0.5 }}>
            ✅ Email sequence analysis<br />
            ✅ AOV-based flow recommendations<br />
            ✅ High-AOV closing sequence optimizer
          </p>
          <button className="btn btn-secondary" disabled>
            <Mail size={14} />
            Connect Klaviyo
          </button>
        </div>

      </div>

      {/* Benchmark note */}
      <div className="connect-benchmark-note">
        <Zap size={14} style={{ color: 'var(--accent)' }} />
        <div>
          <strong>Benchmark data is always active</strong> — even before you connect any accounts, NextGenAds
          intelligence is powered by 9 years of Beauty & Cosmetics campaign data. Connect your accounts to layer
          your real performance on top.
        </div>
      </div>

      <style>{`
        .connect-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: border-color var(--transition);
        }

        .connect-card:hover {
          border-color: var(--border-hover);
        }

        .connect-card-soon {
          opacity: 0.7;
        }

        .connect-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .connect-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .connect-name {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .connect-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .connect-account-info {
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .connect-account-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .connect-account-id {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
        }

        .connect-account-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--success);
          margin-top: 4px;
        }

        .connect-feature-list {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.8;
        }

        .connect-benchmark-note {
          margin-top: 24px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: var(--accent-dim);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: var(--radius-lg);
          padding: 16px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .connect-benchmark-note strong {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default Connect;
