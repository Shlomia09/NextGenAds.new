import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Sparkles, BarChart3, Wrench, Store, Plug, Settings, Menu, X,
} from 'lucide-react';
import type { Brand } from '../../types';
import AccountSwitcher from './AccountSwitcher';
import ThemeToggle from './ThemeToggle';

interface SidebarProps { brand?: Brand | null; }

const navItems = [
  { path: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/intelligence',      icon: Sparkles,        label: 'Intelligence' },
  { path: '/campaigns',         icon: BarChart3,       label: 'Campaigns' },
  { path: '/campaign-workshop', icon: Wrench,          label: 'Campaign Workshop' },
  { path: '/brands',            icon: Store,           label: 'Brands' },
  { path: '/connect',           icon: Plug,            label: 'Connect' },
  { path: '/settings',          icon: Settings,        label: 'Settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ brand }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button className="sb-hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={18} strokeWidth={1.5} />
      </button>

      {/* Backdrop */}
      {open && <div className="sb-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>

        {/* ── Logo ── */}
        <div className="sidebar-logo-wrap">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              {/* 38×38 logo box */}
              <div style={{
                width: '38px',
                height: '38px',
                background: 'var(--logo-grad)',
                color: '#2A1A12',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Fraunces', serif",
                fontSize: '20px',
                fontWeight: 600,
                flexShrink: 0,
                lineHeight: 1,
              }}>
                N
              </div>
              {/* Wordmark */}
              <div>
                <div className="sidebar-logo">NextAds<em>Gen</em></div>
                <div className="sidebar-tagline">Campaign Intelligence</div>
              </div>
            </div>
            <button className="sb-close-btn" onClick={() => setOpen(false)} aria-label="Close">
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Account Switcher ── */}
        <div style={{ padding: '10px 10px 4px' }}>
          <AccountSwitcher />
        </div>

        {/* ── Active brand pill ── */}
        {brand && (
          <div className="sidebar-brand-pill">
            <div className="sidebar-brand-dot" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {brand.name}
            </span>
          </div>
        )}

        {/* ── Nav ── */}
        <nav className="sidebar-nav">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
            return (
              <NavLink
                key={path}
                to={path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} strokeWidth={1.5} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* ── Bottom Section ── */}
        <div className="sidebar-bottom">
          {/* ThemeToggle */}
          <div className="sidebar-theme-toggle-wrap">
            <ThemeToggle />
          </div>

          {/* 9YR BENCH ACTIVE badge */}
          <div className="sidebar-benchmark-badge">
            <span>9YR</span>
            <span>BENCH</span>
            <span>ACTIVE</span>
          </div>
        </div>

      </aside>

      <style>{`
        /* ── Shell ── */
        .sidebar {
          width: 230px;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border);
          position: fixed;
          left: 0; top: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
          transition: transform 0.26s ease, background 0.35s ease, border-color 0.35s ease;
        }

        /* ── Mobile controls ── */
        .sb-hamburger {
          display: none;
          position: fixed;
          top: 12px; left: 14px;
          z-index: 110;
          background: var(--bg-sidebar);
          border: 1px solid var(--border);
          border-radius: 9px;
          color: var(--text-2);
          width: 36px; height: 36px;
          align-items: center; justify-content: center;
          cursor: pointer;
        }
        .sb-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 99;
          backdrop-filter: blur(4px);
        }
        .sb-close-btn {
          display: none;
          background: none; border: none;
          color: var(--text-3); cursor: pointer;
          padding: 2px; line-height: 1;
        }
        @media (max-width: 900px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.sidebar-open { transform: translateX(0); box-shadow: 8px 0 40px rgba(0,0,0,0.4); }
          .sb-hamburger { display: flex; }
          .sb-overlay { display: block; }
          .sb-close-btn { display: flex; }
        }

        /* ── Logo ── */
        .sidebar-logo-wrap {
          padding: 22px 20px 14px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .sidebar-logo {
          font-family: 'Inter', sans-serif;
          font-size: 17px;
          font-weight: 500;
          color: var(--text);
          letter-spacing: 0.2px;
          line-height: 1.2;
        }
        .sidebar-logo em {
          font-style: normal;
          color: var(--accent);
        }
        .sidebar-tagline {
          font-family: 'Inter', sans-serif;
          font-size: 8.5px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: var(--text-3);
          margin-top: 3px;
        }

        /* ── Brand pill ── */
        .sidebar-brand-pill {
          margin: 6px 10px 2px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 7px 11px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: var(--text-2);
          overflow: hidden;
          flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
          cursor: pointer;
        }
        .sidebar-brand-pill:hover { background: var(--surface-hover); color: var(--text); }
        .sidebar-brand-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
        }

        /* ── Nav ── */
        .sidebar-nav {
          flex: 1;
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 9px;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: 0.3px;
          color: var(--text-2);
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .sidebar-nav-item:hover {
          background: var(--surface-hover);
          color: var(--text);
        }
        .sidebar-nav-item.active {
          background: var(--accent-soft);
          color: var(--accent);
        }

        /* ── Bottom ── */
        .sidebar-bottom {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-top: 1px solid var(--border);
        }
        .sidebar-theme-toggle-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 12px 16px;
        }
        .sidebar-benchmark-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 6px 0 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 3px;
          color: var(--text-3);
          line-height: 2;
        }
        .sidebar-benchmark-badge span { display: block; text-transform: uppercase; }
      `}</style>
    </>
  );
};

export default Sidebar;
