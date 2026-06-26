/**
 * BrandSwitcher — replaces AccountSwitcher in the sidebar.
 * Shows all brands for the current user; selecting one updates BrandContext
 * which propagates across Dashboard, Campaigns, Intelligence, etc.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, Building2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../../contexts/BrandContext';

const BrandSwitcher: React.FC = () => {
  const { brands, activeBrand, setActiveBrand, loading } = useBrand();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const categoryEmoji: Record<string, string> = {
    beauty:         '💄',
    wellness:       '🧘',
    aesthetic:      '✨',
    ecommerce:      '🛍️',
    fashion:        '👗',
    health:         '🏥',
    food:           '🍽️',
    tech:           '💻',
    finance:        '💰',
    education:      '📚',
    travel:         '✈️',
    hospitality:    '🏨',
    real_estate:    '🏠',
    automotive:     '🚗',
    other:          '🏢',
  };

  const getEmoji = (brand: typeof activeBrand) => {
    if (!brand) return '🏢';
    const cat = (brand.category ?? brand.business_type ?? 'other').toLowerCase();
    return categoryEmoji[cat] ?? '🏢';
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, width: '100%',
          background: open ? 'var(--surface-2)' : 'var(--surface)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10, padding: '8px 10px',
          cursor: 'pointer', transition: 'all .15s',
          boxShadow: open ? '0 0 0 3px var(--accent-soft)' : 'none',
        }}
      >
        {loading
          ? <Loader2 size={13} style={{ color: 'var(--accent)', animation: 'wspin 1s linear infinite', flexShrink: 0 }} />
          : activeBrand
            ? <span style={{ fontSize: 14, flexShrink: 0 }}>{getEmoji(activeBrand)}</span>
            : <Building2 size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        }
        <span style={{
          flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500,
          color: activeBrand ? 'var(--text)' : 'var(--text-3)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left',
        }}>
          {loading ? 'Loading…' : activeBrand ? activeBrand.name : 'Select brand…'}
        </span>
        <ChevronDown size={12} strokeWidth={1.5} style={{
          color: 'var(--text-3)', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, zIndex: 300, overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
          minWidth: 200,
        }}>
          {brands.length === 0 ? (
            <div style={{
              padding: '14px 14px 10px',
              fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)',
              textAlign: 'center',
            }}>
              No brands yet
            </div>
          ) : (
            <>
              {/* Header label */}
              <div style={{
                padding: '9px 14px 6px',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--text-3)',
              }}>
                Your brands
              </div>
              {brands.map(brand => {
                const isActive = activeBrand?.id === brand.id;
                return (
                  <button
                    key={brand.id}
                    onClick={() => { setActiveBrand(brand); setOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 14px',
                      background: isActive ? 'var(--accent-soft)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left', transition: '.12s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>
                      {getEmoji(brand)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--accent)' : 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {brand.name}
                      </div>
                      {brand.category && (
                        <div style={{
                          fontFamily: 'var(--font-ui)', fontSize: 10.5, color: 'var(--text-3)',
                          textTransform: 'capitalize', marginTop: 1,
                        }}>
                          {brand.category}
                          {brand.currency && ` · ${brand.currency}`}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <Check size={13} strokeWidth={2.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            </>
          )}
          {/* Add brand */}
          <button
            onClick={() => { setOpen(false); navigate('/brands'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '9px 14px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', textAlign: 'left', transition: '.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Plus size={13} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--accent)',
            }}>
              Add brand
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandSwitcher;
