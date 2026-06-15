import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Sparkles, BarChart3, Plug, Tag, Settings, Menu, X,
} from 'lucide-react';
import type { Brand } from '../../types';
import AccountSwitcher from './AccountSwitcher';

interface SidebarProps { brand?: Brand | null; }

const navItems = [
  { path: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/intelligence', icon: Sparkles,         label: 'Intelligence' },
  { path: '/campaigns',    icon: BarChart3,        label: 'Campaigns' },
  { path: '/brands',       icon: Tag,              label: 'Brands' },
  { path: '/connect',      icon: Plug,             label: 'Connect' },
  { path: '/settings',     icon: Settings,         label: 'Settings' },
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
            {/* "NextAds" regular + "Gen" italic rose gold — per spec */}
            <div className="sidebar-logo">
              NextAds<em>Gen</em>
            </div>
            <button className="sb-close-btn" onClick={() => setOpen(false)} aria-label="Close">
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
          <div className="sidebar-tagline">Campaign Intelligence</div>
        </div>

        {/* ── Account Switcher ── */}
        <div style={{ padding: '0 16px 8px', borderBottom: '0.5px solid #1a0e05' }}>
          <AccountSwitcher />
        </div>

        {/* ── Active brand pill ── */}
        {brand && (
          <div className="sidebar-brand-pill">
            <div className="sidebar-brand-dot" />
            <span className="truncate">{brand.name}</span>
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
                <Icon size={13} strokeWidth={1.5} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* ── Footer — 9yr benchmark indicator ── */}
        <div className="sidebar-benchmark">
          <span className="sidebar-benchmark-dot" />
          <span className="sidebar-benchmark-text">9-Year Benchmark Active</span>
        </div>

      </aside>

      <style>{`
        /* ─── Shell ─── */
        .sidebar {
          width: 220px;
          background: #0F0A07;
          border-right: 0.5px solid #2a1a0e;
          position: fixed;
          left: 0; top: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
          transition: transform 0.26s ease;
        }

        /* ─── Mobile controls ─── */
        .sb-hamburger {
          display: none;
          position: fixed;
          top: 12px; left: 14px;
          z-index: 110;
          background: #0F0A07;
          border: 0.5px solid #2a1a0e;
          border-radius: 4px;
          color: #8B6050;
          width: 36px; height: 36px;
          align-items: center; justify-content: center;
          cursor: pointer;
        }
        .sb-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 99;
          backdrop-filter: blur(4px);
        }
        .sb-close-btn {
          display: none;
          background: none; border: none;
          color: #4a2e1e; cursor: pointer;
          padding: 2px; line-height: 1;
        }
        @media (max-width: 900px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.sidebar-open { transform: translateX(0); box-shadow: 8px 0 40px rgba(0,0,0,0.5); }
          .sb-hamburger { display: flex; }
          .sb-overlay { display: block; }
          .sb-close-btn { display: flex; }
        }

        /* ─── Logo ─── */
        .sidebar-logo-wrap {
          padding: 22px 20px 16px;
          border-bottom: 0.5px solid #2a1a0e;
          flex-shrink: 0;
        }

        /* "NextAds" regular + "Gen" italic rose gold */
        .sidebar-logo {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 400;
          color: #F5E6D8;
          letter-spacing: 0.03em;
          line-height: 1;
        }
        .sidebar-logo em {
          font-style: italic;
          color: #C4836A;
        }

        .sidebar-tagline {
          font-family: 'Outfit', sans-serif;
          font-size: 7px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #4a2e1e;
          margin-top: 5px;
        }

        /* ─── Brand pill ─── */
        .sidebar-brand-pill {
          margin: 10px 12px;
          background: #1C1208;
          border: 0.5px solid #2a1a0e;
          border-radius: 3px;
          padding: 7px 10px;
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: #8B6050;
          overflow: hidden;
          flex-shrink: 0;
          transition: border-color 0.18s;
        }
        .sidebar-brand-pill:hover { border-color: #C4836A; }
        .sidebar-brand-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #C4836A;
          flex-shrink: 0;
        }

        /* ─── Nav ─── */
        .sidebar-nav {
          flex: 1;
          padding: 8px 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
          overflow-y: auto;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6b4030;
          text-decoration: none;
          transition: color 0.15s, background 0.15s;
          border-left: 2px solid transparent;
        }
        .sidebar-nav-item:hover {
          color: #8B6050;
          background: rgba(196,131,106,0.04);
        }
        .sidebar-nav-item.active {
          color: #C4A090;
          border-left-color: #C4836A;
          padding-left: calc(20px - 2px);
          background: rgba(196,131,106,0.06);
        }

        /* ─── Footer / Benchmark indicator ─── */
        .sidebar-benchmark {
          padding: 14px 20px;
          border-top: 0.5px solid #2a1a0e;
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }
        .sidebar-benchmark-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #10B981;
          flex-shrink: 0;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .sidebar-benchmark-text {
          font-family: 'Outfit', sans-serif;
          font-size: 8px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4a2e1e;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
