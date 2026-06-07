import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Sparkles, BarChart3, Plug, Tag, Settings, ChevronRight, Menu, X,
} from 'lucide-react';
import type { Brand } from '../../types';

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
            <div className="sidebar-logo-text">
              {/* "NextGen" Playfair regular, "Ads" Playfair italic */}
              <span>NextGen</span><em>Ads</em>
            </div>
            <button className="sb-close-btn" onClick={() => setOpen(false)} aria-label="Close">
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
          {/* Subtitle: Outfit 300, letter-spacing 0.2em, #7A5A48 */}
          <div className="sidebar-logo-sub">Campaign Intelligence</div>
        </div>

        {/* ── Active brand ── */}
        {brand && (
          <div className="sidebar-brand-pill">
            <div className="sidebar-brand-dot" />
            <span className="truncate">{brand.name}</span>
            <ChevronRight size={11} style={{ color: '#7A5A48', flexShrink: 0 }} />
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
                <Icon size={14} strokeWidth={1.5} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="sidebar-footer">
          <div className="sidebar-benchmark-badge">
            <div className="live-dot" style={{ background: '#C4836A' }} />
            <span>9-Year Benchmark Active</span>
          </div>
        </div>
      </aside>

      <style>{`
        /* ─── Shell ─── */
        .sidebar {
          width: 220px;
          background: #2C1810;
          border-right: 0.5px solid #3d2a1e;
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
          background: #2C1810;
          border: 0.5px solid #3d2a1e;
          border-radius: 4px;
          color: #C4A090;
          width: 36px; height: 36px;
          align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(44,24,16,0.25);
        }

        .sb-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(44,24,16,0.55);
          z-index: 99;
          backdrop-filter: blur(3px);
        }

        .sb-close-btn {
          display: none;
          background: none; border: none;
          color: #7A5A48; cursor: pointer; padding: 2px; line-height: 1;
        }

        @media (max-width: 900px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.sidebar-open { transform: translateX(0); box-shadow: 8px 0 32px rgba(44,24,16,0.4); }
          .sb-hamburger { display: flex; }
          .sb-overlay { display: block; }
          .sb-close-btn { display: flex; }
        }

        /* ─── Logo ─── */
        .sidebar-logo-wrap {
          padding: 22px 20px 16px;
          border-bottom: 0.5px solid #3d2a1e;
          flex-shrink: 0;
        }

        .sidebar-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 400;        /* regular weight for "NextGen" */
          color: #F5E6D8;          /* ✅ #F5E6D8 as specified */
          letter-spacing: 0.02em;
          line-height: 1;
        }

        /* "Ads" = italic */
        .sidebar-logo-text em {
          font-style: italic;
          color: #C4836A;
        }

        .sidebar-logo-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 300;            /* ✅ Outfit 300 */
          letter-spacing: 0.2em;       /* ✅ 0.2em as specified */
          text-transform: uppercase;
          color: #7A5A48;              /* ✅ #7A5A48 as specified */
          margin-top: 6px;
        }

        /* ─── Brand pill ─── */
        .sidebar-brand-pill {
          margin: 10px 12px;
          background: #3d2a1e;
          border: 0.5px solid #4d3a2e;
          border-radius: 3px; padding: 7px 10px;
          display: flex; align-items: center; gap: 7px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 300; color: #C4A090;
          overflow: hidden; cursor: pointer;
          transition: border-color 0.2s;
          flex-shrink: 0;
        }
        .sidebar-brand-pill:hover { border-color: #6d4a3e; }

        .sidebar-brand-dot {
          width: 5px; height: 5px;
          border-radius: 50%; background: #C4836A; flex-shrink: 0;
        }

        /* ─── Nav ─── */
        .sidebar-nav {
          flex: 1; padding: 8px 10px;
          display: flex; flex-direction: column; gap: 1px;
          overflow-y: auto;
        }

        .sidebar-nav-item {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 12px; border-radius: 2px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 300;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #C4A090;                      /* ✅ #C4A090 inactive */
          text-decoration: none;
          transition: all 0.18s ease;
          border-left: 2px solid transparent;
        }

        .sidebar-nav-item:hover {
          color: #F5E6D8;                      /* ✅ #F5E6D8 on hover */
          background: rgba(196,131,106,0.07);
        }

        .sidebar-nav-item.active {
          color: #F5E6D8;                      /* ✅ #F5E6D8 active */
          border-left-color: #C4836A;
          background: rgba(196,131,106,0.10);
        }

        /* ─── Footer ─── */
        .sidebar-footer {
          padding: 14px 12px;
          border-top: 0.5px solid #3d2a1e;
          flex-shrink: 0;
        }

        .sidebar-benchmark-badge {
          display: flex; align-items: center; gap: 7px;
          font-family: 'Outfit', sans-serif;
          font-size: 10px; font-weight: 300;
          letter-spacing: 0.08em; color: #7A5A48;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
