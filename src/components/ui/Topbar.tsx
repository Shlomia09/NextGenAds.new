import React from 'react';
import { ExternalLink } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

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

const CONV_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  leads:     { bg: '#FAEEDA', color: '#633806', label: 'Leads'     },
  ecommerce: { bg: '#E6F1FB', color: '#0C447C', label: 'eCommerce' },
  bookings:  { bg: '#EAF3DE', color: '#27500A', label: 'Bookings'  },
};

const Topbar: React.FC<TopbarProps> = ({ kpis, conversionType, title }) => {
  const conv = conversionType ? CONV_BADGE[conversionType] : null;

  return (
    <div style={{ flexShrink: 0, zIndex: 10 }}>
      {/* ── Main bar 44px ── */}
      <div style={{
        height: 44,
        background: 'var(--bg-card)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        gap: 12,
      }}>
        {/* Left: optional page title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              fontWeight: 400,
              color: 'var(--text-1)',
            }}>
              {title}
            </span>
          )}
        </div>

        {/* Right: Conversion badge + Ads Manager + ThemeToggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {conv && (
            <span style={{
              background: conv.bg, color: conv.color,
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
              padding: '3px 10px', borderRadius: 20,
            }}>
              {conv.label}
            </span>
          )}
          <a
            href="https://adsmanager.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--font-sans)', fontSize: 12,
              color: 'var(--text-3)', textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            <ExternalLink size={12} />
            Ads Manager
          </a>
          <ThemeToggle placement="topbar" />
        </div>
      </div>

      {/* ── KPI Strip 48px (optional) ── */}
      {kpis && kpis.length > 0 && (
        <div style={{
          height: 48,
          background: 'var(--bg-card)',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'stretch',
        }}>
          {kpis.map((k, i) => (
            <div key={i} style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              borderRight: i < kpis.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 26, height: 26,
                background: 'var(--bg-secondary)',
                borderRadius: 5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--copper)', flexShrink: 0,
              }}>
                {k.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  color: 'var(--text-3)', lineHeight: 1,
                }}>
                  {k.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500,
                  color: 'var(--text-1)', lineHeight: 1.3, marginTop: 2,
                }}>
                  {k.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { EuroIcon, UsersIcon, TargetIcon, CalIcon, ReceiptIcon };
export default Topbar;
