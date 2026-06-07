import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Globe } from 'lucide-react';
import { getBrands } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getAovBracket, MARKETS } from '../lib/benchmarks';
import type { Brand } from '../types';

const BrandCard: React.FC<{ brand: Brand }> = ({ brand }) => {
  const avgAov  = (brand.aov_min + brand.aov_max) / 2;
  const bracket = getAovBracket(avgAov);

  const stageDot: Record<string, string> = {
    new:     '#F59E0B',
    scaling: '#C4836A',
    mature:  '#10B981',
  };

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
          <div className="brand-metric-value">{brand.markets.length || '—'}</div>
        </div>
      </div>

      <div className="brand-funnel-pill">{bracket.recommended_funnel}</div>

      {brand.markets.length > 0 && (
        <div className="brand-flags">
          {brand.markets.slice(0, 5).map((m) => (
            <span key={m} style={{ fontSize: 16 }}>{MARKETS[m]?.split(' ')[0]}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const Brands: React.FC = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn:  () => getBrands(user!.id),
    enabled:  !!user,
  });

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
        ? <div className="grid-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 6 }} />)}</div>
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
        : <div className="grid-3">{brands.map((b) => <BrandCard key={b.id} brand={b} />)}</div>}

      <style>{`
        .brand-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: box-shadow var(--transition), border-color var(--transition);
        }

        .brand-card:hover {
          border-color: var(--rose-gold-pale);
          box-shadow: var(--shadow-sm);
        }

        .brand-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-avatar {
          width: 38px;
          height: 38px;
          background: #2C1810;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          font-weight: 400;
          color: #C4836A;
          flex-shrink: 0;
        }

        .brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--text-primary);
        }

        .brand-cat {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .brand-stage-pill {
          margin-left: auto;
          padding: 3px 8px;
          border-radius: 2px;
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .brand-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .brand-metric {
          background: var(--bg-secondary);
          border-radius: 2px;
          padding: 8px;
        }

        .brand-metric-label {
          display: flex;
          align-items: center;
          gap: 3px;
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-hint);
          margin-bottom: 4px;
        }

        .brand-metric-value {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .brand-funnel-pill {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--rose-gold-dark);
          background: var(--rose-gold-light);
          border: 0.5px solid var(--border-rose);
          border-radius: 2px;
          padding: 5px 10px;
          line-height: 1.4;
        }

        .brand-flags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
};

export default Brands;
