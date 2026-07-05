import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Globe, Link, RefreshCw } from 'lucide-react';
import { getBrands, relinkAdAccount, getAdAccounts } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getAovBracket, MARKETS } from '../lib/benchmarks';
import type { Brand } from '../types';

// ── Brand Card ────────────────────────────────────────────────────────────────
interface BrandCardProps {
  brand: Brand;
  linkedAccounts: { id: string; account_name: string; account_id: string; brand_id: string | null }[];
  allAccounts:    { id: string; account_name: string; account_id: string; brand_id: string | null }[];
  onRelink: (adAccountId: string, brandId: string | null) => Promise<void>;
}

const BrandCard: React.FC<BrandCardProps> = ({ brand, linkedAccounts, allAccounts, onRelink }) => {
  const avgAov  = (brand.aov_min + brand.aov_max) / 2;
  const bracket = getAovBracket(avgAov);
  const [linkingOpen, setLinkingOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const stageDot: Record<string, string> = {
    new:     '#F59E0B',
    scaling: '#C4836A',
    mature:  '#10B981',
  };

  const handleLink = async (adAccountId: string) => {
    setSaving(true);
    try {
      await onRelink(adAccountId, brand.id);
      setLinkingOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (adAccountId: string) => {
    setSaving(true);
    try {
      await onRelink(adAccountId, null);
    } finally {
      setSaving(false);
    }
  };

  // Accounts not linked to ANY brand (available to link)
  const availableAccounts = allAccounts.filter(a => !a.brand_id);

  return (
    <div className="brand-card">
      <div className="brand-card-top">
        <div className="brand-avatar">{brand.name.charAt(0).toUpperCase()}</div>
        <div>
          <div className="brand-name">{brand.name}</div>
          <div className="brand-cat">{brand.category}</div>
        </div>
        <div className="brand-stage-pill" style={{ background: `${stageDot[brand.stage]}15`, color: stageDot[brand.stage], border: `0.5px solid ${stageDot[brand.stage]}40` }}>
          {brand.stage}
        </div>
      </div>

      <div className="brand-metrics">
        <div className="brand-metric">
          <div className="brand-metric-label"><TrendingUp size={9} strokeWidth={1.5} />AOV</div>
          <div className="brand-metric-value">{brand.currency}{brand.aov_min}–{brand.currency}{brand.aov_max}</div>
        </div>
        <div className="brand-metric">
          <div className="brand-metric-label">Bracket</div>
          <div className="brand-metric-value">{bracket.label}</div>
        </div>
        <div className="brand-metric">
          <div className="brand-metric-label"><Globe size={9} strokeWidth={1.5} />Mkts</div>
          <div className="brand-metric-value">{brand.markets?.length || '—'}</div>
        </div>
      </div>

      <div className="brand-funnel-pill">{bracket.recommended_funnel}</div>

      {/* ── Linked Ad Accounts ─────────────────────────────────── */}
      <div style={{ borderTop: '0.5px solid var(--border-light)', paddingTop: 10 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-hint)', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Link size={9} strokeWidth={1.5} /> Ad Accounts
        </div>

        {linkedAccounts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 5 }}>
              ⚠ No Meta account linked
            </span>
            {/* Link button */}
            {allAccounts.length > 0 && (
              linkingOpen ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {allAccounts.map(a => (
                    <button
                      key={a.id}
                      onClick={() => handleLink(a.id)}
                      disabled={saving}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--bg-secondary)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 4, padding: '6px 10px',
                        fontFamily: 'var(--font-sans)', fontSize: 11,
                        color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                        opacity: a.brand_id && a.brand_id !== brand.id ? 0.5 : 1,
                      }}
                    >
                      {saving ? <RefreshCw size={10} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} /> : '→'}
                      {a.account_name}
                      {a.brand_id && a.brand_id !== brand.id && <span style={{ fontSize: 9, color: 'var(--text-hint)', marginLeft: 'auto' }}>currently linked elsewhere</span>}
                    </button>
                  ))}
                  <button
                    onClick={() => setLinkingOpen(false)}
                    style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-hint)', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setLinkingOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(196,131,106,0.08)',
                    border: '0.5px solid rgba(196,131,106,0.25)',
                    borderRadius: 4, padding: '5px 10px',
                    fontFamily: 'var(--font-sans)', fontSize: 11,
                    color: 'var(--accent)', cursor: 'pointer', alignSelf: 'flex-start',
                  }}
                >
                  <Link size={10} strokeWidth={1.5} /> Link account
                </button>
              )
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {linkedAccounts.map(a => (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-secondary)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 4, padding: '6px 10px',
                }}
              >
                {/* Meta logo mini */}
                <div style={{ width: 16, height: 16, background: '#0082FB', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
                    <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.account_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)' }}>
                    {a.account_id}
                  </div>
                </div>
                <button
                  onClick={() => handleUnlink(a.id)}
                  disabled={saving}
                  title="Unlink this account"
                  style={{ background: 'none', border: 'none', color: 'var(--text-hint)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
            {/* Add another link */}
            {availableAccounts.length > 0 && (
              <button
                onClick={() => setLinkingOpen(!linkingOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none',
                  fontFamily: 'var(--font-sans)', fontSize: 10,
                  color: 'var(--text-hint)', cursor: 'pointer',
                  padding: '2px 0', alignSelf: 'flex-start',
                }}
              >
                + Link another account
              </button>
            )}
            {linkingOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {availableAccounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleLink(a.id)}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                      borderRadius: 4, padding: '5px 8px',
                      fontFamily: 'var(--font-sans)', fontSize: 11,
                      color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    → {a.account_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {(brand.markets?.length ?? 0) > 0 && (
        <div className="brand-flags">
          {brand.markets!.slice(0, 5).map((m) => (
            <span key={m} style={{ fontSize: 16 }}>{MARKETS[m]?.split(' ')[0]}</span>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────
const Brands: React.FC = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn:  () => getBrands(user!.id),
    enabled:  !!user,
  });

  const { data: adAccounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn:  () => getAdAccounts(user!.id),
    enabled:  !!user,
  });

  const handleRelink = async (adAccountId: string, brandId: string | null) => {
    await relinkAdAccount(adAccountId, brandId);
    await refetchAccounts();
    qc.invalidateQueries({ queryKey: ['campaigns'] });
  };

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="section-eyebrow">Brand Management</div>
          <h1 className="page-title">Brands</h1>
          <p className="page-subtitle">{brands.length} brand{brands.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
          <Plus size={13} strokeWidth={1.5} />
          Add Brand
        </button>
      </div>

      {isLoading
        ? <div className="grid-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 6 }} />)}</div>
        : brands.length === 0
        ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-primary)', marginBottom: 12 }}>No brands yet</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 20 }}>Create your first brand to activate benchmark intelligence</p>
            <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
              <Plus size={13} strokeWidth={1.5} />
              Create Your First Brand
            </button>
          </div>
        )
        : (
          <div className="grid-3">
            {brands.map((b) => {
              const linked = adAccounts.filter(a => (a as any).brand_id === b.id);
              return (
                <BrandCard
                  key={b.id}
                  brand={b}
                  linkedAccounts={linked as any}
                  allAccounts={adAccounts as any}
                  onRelink={handleRelink}
                />
              );
            })}
          </div>
        )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .brand-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex; flex-direction: column; gap: 14px;
          transition: box-shadow var(--transition), border-color var(--transition);
        }
        .brand-card:hover {
          border-color: var(--rose-gold-pale);
          box-shadow: var(--shadow-sm);
        }
        .brand-card-top { display: flex; align-items: center; gap: 12px; }
        .brand-avatar {
          width: 38px; height: 38px;
          background: #2C1810; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Playfair Display', serif; font-size: 16px;
          font-weight: 400; color: #C4836A; flex-shrink: 0;
        }
        .brand-name { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 400; color: var(--text-primary); }
        .brand-cat { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 300; color: var(--text-muted); margin-top: 2px; }
        .brand-stage-pill {
          margin-left: auto; padding: 3px 8px; border-radius: 2px;
          font-family: 'Outfit', sans-serif; font-size: 9px; font-weight: 400;
          letter-spacing: 0.12em; text-transform: uppercase;
        }
        .brand-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .brand-metric { background: var(--bg-secondary); border-radius: 2px; padding: 8px; }
        .brand-metric-label {
          display: flex; align-items: center; gap: 3px;
          font-family: 'Outfit', sans-serif; font-size: 9px; font-weight: 400;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--text-hint); margin-bottom: 4px;
        }
        .brand-metric-value { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; color: var(--text-primary); }
        .brand-funnel-pill {
          font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 300;
          color: var(--rose-gold-dark); background: var(--rose-gold-light);
          border: 0.5px solid var(--border-rose); border-radius: 2px;
          padding: 5px 10px; line-height: 1.4;
        }
        .brand-flags { display: flex; gap: 4px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
};

export default Brands;
