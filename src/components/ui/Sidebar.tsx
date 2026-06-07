import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  BarChart3,
  Plug,
  Tag,
  Settings,
  ChevronRight,
} from 'lucide-react';
import type { Brand } from '../../types';

interface SidebarProps {
  brand?: Brand | null;
}

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

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo-wrap">
        <div className="sidebar-logo-text">
          Next<span>Gen</span>Ads
        </div>
        <div className="sidebar-logo-sub">Campaign Intelligence</div>
      </div>

      {/* Active brand indicator */}
      {brand && (
        <div className="sidebar-brand-pill">
          <div className="sidebar-brand-dot" />
          <span className="truncate">{brand.name}</span>
          <ChevronRight size={11} style={{ color: 'var(--text-dark-muted)', flexShrink: 0 }} />
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
          return (
            <NavLink
              key={path}
              to={path}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Benchmark badge */}
      <div className="sidebar-footer">
        <div className="sidebar-benchmark-badge">
          <div className="live-dot" style={{ background: 'var(--rose-gold)' }} />
          <span>9-Year Benchmark Active</span>
        </div>
      </div>

      <style>{`
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
        }

        .sidebar-logo-wrap {
          padding: 22px 20px 16px;
          border-bottom: 0.5px solid #3d2a1e;
        }

        .sidebar-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 400;
          color: #F5E6D8;
          letter-spacing: 0.04em;
          line-height: 1;
        }

        .sidebar-logo-text span {
          font-style: italic;
          color: #C4836A;
        }

        .sidebar-logo-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 300;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #7A5A48;
          margin-top: 5px;
        }

        .sidebar-brand-pill {
          margin: 10px 12px;
          background: #3d2a1e;
          border: 0.5px solid #4d3a2e;
          border-radius: 3px;
          padding: 7px 10px;
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: #C4A090;
          overflow: hidden;
          cursor: pointer;
          transition: border-color var(--transition);
        }

        .sidebar-brand-pill:hover {
          border-color: #6d4a3e;
        }

        .sidebar-brand-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #C4836A;
          flex-shrink: 0;
        }

        .sidebar-nav {
          flex: 1;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          overflow-y: auto;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 12px;
          border-radius: 2px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #7A5A48;
          text-decoration: none;
          transition: all var(--transition);
          border-left: 2px solid transparent;
          position: relative;
        }

        .sidebar-nav-item:hover {
          color: #C4A090;
          background: rgba(196, 131, 106, 0.06);
        }

        .sidebar-nav-item.active {
          color: #C4A090;
          border-left-color: #C4836A;
          background: rgba(196, 131, 106, 0.08);
        }

        .sidebar-footer {
          padding: 14px 12px;
          border-top: 0.5px solid #3d2a1e;
        }

        .sidebar-benchmark-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.08em;
          color: #8B6050;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
