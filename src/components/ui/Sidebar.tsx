import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  BarChart3,
  Plug,
  Tag,
  Settings,
  Zap,
  ChevronRight,
} from 'lucide-react';
import type { Brand } from '../../types';

interface SidebarProps {
  brand?: Brand | null;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/intelligence', icon: Sparkles, label: 'Intelligence' },
  { path: '/campaigns', icon: BarChart3, label: 'Campaigns' },
  { path: '/brands', icon: Tag, label: 'Brands' },
  { path: '/connect', icon: Plug, label: 'Connect' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ brand }) => {
  const location = useLocation();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Zap size={16} />
        </div>
        <span className="logo-text">NextGenAds</span>
      </div>

      {/* Active brand indicator */}
      {brand && (
        <div className="sidebar-brand-pill">
          <div className="brand-dot" />
          <span className="truncate">{brand.name}</span>
          <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
          return (
            <NavLink key={path} to={path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              <span>{label}</span>
              {isActive && <div className="nav-active-bar" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="sidebar-footer">
        <div className="benchmark-badge">
          <div className="live-dot" />
          <span>9-Year Benchmark Active</span>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 240px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          position: fixed;
          left: 0; top: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
        }

        .logo-icon {
          width: 30px;
          height: 30px;
          background: var(--accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 0 12px var(--accent-glow);
        }

        .logo-text {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .sidebar-brand-pill {
          margin: 12px 14px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          overflow: hidden;
          cursor: pointer;
          transition: border-color var(--transition);
        }

        .sidebar-brand-pill:hover {
          border-color: var(--border-hover);
        }

        .brand-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
        }

        .sidebar-nav {
          flex: 1;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: var(--radius);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all var(--transition);
          position: relative;
          overflow: hidden;
        }

        .nav-item:hover {
          color: var(--text-primary);
          background: var(--surface-3);
        }

        .nav-item.active {
          color: var(--text-primary);
          background: var(--accent-dim);
        }

        .nav-item.active svg {
          color: var(--accent);
        }

        .nav-active-bar {
          position: absolute;
          right: 0; top: 20%; bottom: 20%;
          width: 3px;
          background: var(--accent);
          border-radius: 2px;
        }

        .sidebar-footer {
          padding: 16px 14px;
          border-top: 1px solid var(--border);
        }

        .benchmark-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 500;
          color: var(--success);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
