import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';
import { LogOut, User, Key, Bell } from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();

  const envVars = [
    { key: 'VITE_SUPABASE_URL',    desc: 'Supabase project URL' },
    { key: 'VITE_SUPABASE_ANON_KEY', desc: 'Supabase anonymous key' },
    { key: 'VITE_META_APP_ID',    desc: 'Meta App ID for OAuth' },
    { key: 'ANTHROPIC_API_KEY',   desc: 'Anthropic Claude API key (server-side only)' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="section-eyebrow">Configuration</div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Account & integration configuration</p>
      </div>

      <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Profile */}
        <div className="card">
          <div className="settings-section-title"><User size={13} strokeWidth={1.5} />Profile</div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email || ''} readOnly style={{ opacity: 0.6 }} />
            </div>
            <div className="form-group">
              <label className="form-label">User ID</label>
              <input className="form-input" value={user?.id || ''} readOnly
                style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }} />
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="card">
          <div className="settings-section-title"><Key size={13} strokeWidth={1.5} />Environment Variables</div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
            Configure these in your <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--rose-gold)', background: 'var(--rose-gold-light)', padding: '1px 5px', borderRadius: 2, fontSize: 11 }}>.env</code> file at the project root.
          </p>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {envVars.map(({ key, desc }) => (
              <div key={key} style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--rose-gold)', marginBottom: 2 }}>{key}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="settings-section-title"><Bell size={13} strokeWidth={1.5} />Notifications</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Critical ROAS alerts', 'Weekly benchmark report', 'New AI recommendations'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)' }}>{item}</span>
                <div className="toggle-switch active" />
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-danger" onClick={() => signOut()} style={{ alignSelf: 'flex-start' }}>
          <LogOut size={13} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>

      <style>{`
        .settings-section-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          letter-spacing: 0.04em;
        }

        .toggle-switch {
          width: 34px;
          height: 18px;
          background: var(--border-light);
          border-radius: 9px;
          position: relative;
          cursor: pointer;
          transition: background var(--transition);
          flex-shrink: 0;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          left: 2px; top: 2px;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: white;
          transition: transform var(--transition);
          box-shadow: 0 1px 3px rgba(44,24,16,0.2);
        }

        .toggle-switch.active { background: var(--rose-gold); }
        .toggle-switch.active::after { transform: translateX(16px); }
      `}</style>
    </div>
  );
};

export default Settings;
