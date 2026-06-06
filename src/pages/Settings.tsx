import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';
import { LogOut, User, Key, Bell } from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();

  const envVars = [
    { key: 'VITE_SUPABASE_URL', desc: 'Supabase project URL' },
    { key: 'VITE_SUPABASE_ANON_KEY', desc: 'Supabase anonymous key' },
    { key: 'VITE_META_APP_ID', desc: 'Meta App ID for OAuth' },
    { key: 'ANTHROPIC_API_KEY', desc: 'Anthropic Claude API key (server-side only)' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Account & integration configuration</div>
      </div>

      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Profile */}
        <div className="card">
          <div className="settings-section-title">
            <User size={14} />
            Profile
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email || ''} readOnly style={{ opacity: 0.7 }} />
            </div>
            <div className="form-group">
              <label className="form-label">User ID</label>
              <input className="form-input" value={user?.id || ''} readOnly style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="card">
          <div className="settings-section-title">
            <Key size={14} />
            Environment Variables
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
            Configure these in your <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 4px', borderRadius: 3 }}>.env</code> file at the project root.
          </p>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {envVars.map(({ key, desc }) => (
              <div key={key} style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-accent)', marginBottom: 3 }}>{key}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="settings-section-title">
            <Bell size={14} />
            Notifications
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Critical ROAS alerts',
              'Weekly benchmark report',
              'New AI recommendations',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</span>
                <div className="toggle-switch active" />
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button className="btn btn-danger" onClick={() => signOut()} style={{ alignSelf: 'flex-start' }}>
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      <style>{`
        .settings-section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .toggle-switch {
          width: 36px;
          height: 20px;
          background: var(--border);
          border-radius: 10px;
          position: relative;
          cursor: pointer;
          transition: background var(--transition);
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          left: 2px;
          top: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          transition: transform var(--transition);
        }

        .toggle-switch.active {
          background: var(--accent);
        }

        .toggle-switch.active::after {
          transform: translateX(16px);
        }
      `}</style>
    </div>
  );
};

export default Settings;
