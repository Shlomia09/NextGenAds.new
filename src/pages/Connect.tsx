import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Search, Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { getAdAccounts } from '../lib/supabase';
import { initiateMetaOAuth } from '../lib/meta-api';
import { useAuth } from '../hooks/useAuth';

const Connect: React.FC = () => {
  const { user } = useAuth();

  const { data: adAccounts = [] } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn:  () => getAdAccounts(user!.id),
    enabled:  !!user,
  });

  const metaAccount = adAccounts.find((a) => a.platform === 'meta');

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="section-eyebrow">Integrations</div>
        <h1 className="page-title">Connect Your Accounts</h1>
        <p className="page-subtitle">
          Integrate your ad platforms to unlock real-time benchmark comparisons and AI recommendations
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>

        {/* Meta Ads */}
        <div className="conn-card" style={metaAccount ? { borderColor: 'rgba(16,185,129,0.35)' } : {}}>
          <div className="conn-header">
            <div className="conn-icon" style={{ background: '#1877F2' }}>
              <Globe size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="conn-name">Meta Ads</div>
              <div className="conn-desc">Facebook & Instagram campaigns</div>
            </div>
            {metaAccount
              ? <span className="badge badge-success" style={{ marginLeft: 'auto' }}><CheckCircle size={9} strokeWidth={1.5} />Connected</span>
              : <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}><AlertCircle size={9} strokeWidth={1.5} />Not connected</span>}
          </div>

          {metaAccount ? (
            <div className="conn-account-info">
              <div className="conn-account-name">{metaAccount.account_name}</div>
              <div className="conn-account-id">ID: {metaAccount.account_id}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div className="live-dot" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--success)' }}>
                  Connected {new Date(metaAccount.connected_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <>
              <ul className="conn-features">
                <li>Campaign performance sync</li>
                <li>Real-time ROAS vs benchmarks</li>
                <li>AI recommendations from your data</li>
                <li>One-click campaign execution</li>
              </ul>
              <button className="btn btn-primary" onClick={initiateMetaOAuth}>
                <Globe size={13} strokeWidth={1.5} />
                Connect Meta Ads
                <ArrowRight size={13} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {/* Google Ads */}
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

        {/* Klaviyo */}
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

      {/* Benchmark note */}
      <div className="conn-benchmark-note">
        <div className="conn-bench-eyebrow">Always active</div>
        <p>
          Benchmark intelligence is powered by 9 years of Beauty & Cosmetics campaign data — even before
          you connect any accounts. Connect your platforms to layer your real performance on top.
        </p>
      </div>

      <style>{`
        .conn-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: border-color var(--transition), box-shadow var(--transition);
        }

        .conn-card:hover { border-color: var(--rose-gold-pale); box-shadow: var(--shadow-sm); }
        .conn-soon { opacity: 0.65; }

        .conn-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .conn-icon {
          width: 38px;
          height: 38px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .conn-name {
          font-family: 'Playfair Display', serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--text-primary);
        }

        .conn-desc {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .conn-account-info {
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .conn-account-name {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .conn-account-id {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--text-hint);
        }

        .conn-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 0;
        }

        .conn-features li {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-secondary);
          padding-left: 14px;
          position: relative;
        }

        .conn-features li::before {
          content: '—';
          position: absolute;
          left: 0;
          color: var(--rose-gold);
          font-size: 10px;
        }

        .conn-benchmark-note {
          margin-top: 24px;
          background: var(--rose-gold-light);
          border: 0.5px solid var(--border-rose);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
        }

        .conn-bench-eyebrow {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--rose-gold-dark);
          margin-bottom: 6px;
        }

        .conn-benchmark-note p {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: var(--text-secondary);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

export default Connect;
