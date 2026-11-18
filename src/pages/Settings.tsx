import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';
import { LogOut, User, Bell } from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();

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
          font-family: var(--font-ui);
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
