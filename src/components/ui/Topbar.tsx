import React, { useState } from 'react';
import { Search, Mail, Bell, ExternalLink } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import NotificationsPanel from './NotificationsPanel';

// ── KPI Strip icons (inline SVG) ──────────────────────────────
const EuroIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M14.5 7.5a5 5 0 1 0 0 9"/><path d="M6 10h8M6 14h8"/></svg>;
const UsersIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const TargetIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const CalIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>;
const ReceiptIcon= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M14 8H8M16 12H8M13 16H8"/></svg>;

export interface KpiItem {
  icon:  React.ReactNode;
  label: string;
  value: string;
}

interface TopbarProps {
  kpis?:           KpiItem[];
  conversionType?: 'leads' | 'ecommerce' | 'bookings';
  title?:          string;
}

function getInitials(email: string | undefined): string {
  if (!email) return '??';
  const local = email.split('@')[0];
  const parts = local.split('.');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

// ── Styles ───────────────────────────────────────────────────────────────────
const topbarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16,
  padding: '13px 28px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg)',
};
const searchPillStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9,
  padding: '9px 16px', borderRadius: 30,
  border: '1px solid var(--border)', background: 'var(--surface)',
  maxWidth: 360, flex: 1,
};
const searchInputStyle: React.CSSProperties = {
  border: 'none', outline: 'none', background: 'transparent',
  color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: 13, width: '100%',
};
const topRightStyle: React.CSSProperties = {
  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0,
};
const iconBtnStyle: React.CSSProperties = {
  position: 'relative' as const,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text-2)', cursor: 'pointer',
  background: 'none', border: 'none', padding: 4, lineHeight: 1,
  borderRadius: 6, transition: 'background 0.15s, color 0.15s',
};
const adsManagerLinkStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)',
  textDecoration: 'none', transition: 'color 0.15s', whiteSpace: 'nowrap' as const,
};
const avatarStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: '50%',
  background: 'linear-gradient(135deg, #E3A88E, #C97B5E)',
  color: '#2A1A12', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.02em', flexShrink: 0, cursor: 'default', userSelect: 'none' as const,
};

// ── Component ─────────────────────────────────────────────────────────────────
const Topbar: React.FC<TopbarProps> = ({ kpis, conversionType: _ct, title: _t }) => {
  const { user } = useAuth();
  const initials = getInitials(user?.email);

  const [showNotif, setShowNotif] = useState(false);
  const [showMail,  setShowMail]  = useState(false);

  return (
    <div style={{ flexShrink: 0, zIndex: 10 }}>
      {/* ── Main bar ── */}
      <div style={topbarStyle}>
        {/* Search */}
        <div style={searchPillStyle}>
          <Search size={14} color="var(--text-3)" strokeWidth={2} />
          <input style={searchInputStyle} placeholder="Search campaigns, brands…" aria-label="Search" />
        </div>

        {/* Right cluster */}
        <div style={topRightStyle}>

          {/* Mail — messages panel (simple: links to settings) */}
          <div style={{ position: 'relative' }}>
            <button
              id="topbar-mail-btn"
              style={iconBtnStyle}
              aria-label="Messages"
              onClick={() => { setShowMail(v => !v); setShowNotif(false); }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
            >
              <Mail size={18} strokeWidth={1.75} />
            </button>

            {/* Mail mini-panel — quick links to billing + support */}
            {showMail && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 10,
                width: 280, background: 'var(--bg-card)',
                border: '0.5px solid var(--border)', borderRadius: 10,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 9999,
                overflow: 'hidden', animation: 'notif-slide-in 0.18s ease',
              }}>
                <div style={{ padding: '13px 16px', borderBottom: '0.5px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Quick Links
                </div>
                {[
                  { label: 'Billing & Invoices',     href: '/settings',       emoji: '💳' },
                  { label: 'Connect Ad Account',      href: '/connect',        emoji: '🔗' },
                  { label: 'Meta Ads Manager',        href: 'https://adsmanager.facebook.com', emoji: '📊', external: true },
                  { label: 'Support',                 href: 'mailto:support@nextadsgen.com',   emoji: '✉️', external: true },
                ].map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={() => setShowMail(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 16px', textDecoration: 'none',
                      borderBottom: '0.5px solid var(--border-light)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 14 }}>{item.emoji}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{item.label}</span>
                    {item.external && <ExternalLink size={10} strokeWidth={1.5} style={{ marginLeft: 'auto', color: 'var(--text-hint)' }} />}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Bell — notifications panel */}
          <div style={{ position: 'relative' }}>
            <button
              id="topbar-bell-btn"
              style={iconBtnStyle}
              aria-label="Notifications"
              onClick={() => { setShowNotif(v => !v); setShowMail(false); }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
            >
              <Bell size={18} strokeWidth={1.75} />
              {/* Unread dot */}
              <span style={{
                position: 'absolute', top: 2, right: 2,
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)',
                border: '1.5px solid var(--bg)',
              }} />
            </button>

            {showNotif && (
              <NotificationsPanel onClose={() => setShowNotif(false)} />
            )}
          </div>

          {/* Ads Manager link */}
          <a
            href="https://adsmanager.facebook.com"
            target="_blank" rel="noopener noreferrer"
            style={adsManagerLinkStyle}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            aria-label="Open Ads Manager"
          >
            <ExternalLink size={13} strokeWidth={1.75} />
            Ads Manager
          </a>

          {/* Avatar */}
          <div style={avatarStyle} title={user?.email ?? ''}>{initials}</div>
        </div>
      </div>

      {/* ── KPI Strip 48px (optional) ── */}
      {kpis && kpis.length > 0 && (
        <div style={{ height: 48, background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'stretch' }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', borderRight: i < kpis.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <div style={{ width: 26, height: 26, background: 'var(--bg-secondary)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--copper)', flexShrink: 0 }}>
                {k.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-3)', lineHeight: 1 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500, color: 'var(--text-1)', lineHeight: 1.3, marginTop: 2 }}>{k.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export { EuroIcon, UsersIcon, TargetIcon, CalIcon, ReceiptIcon };
export default Topbar;
