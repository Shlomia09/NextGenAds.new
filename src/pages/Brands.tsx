import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Tag, TrendingUp, Globe, Zap } from 'lucide-react';
import { getBrands } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getAovBracket, MARKETS } from '../lib/benchmarks';
import type { Brand } from '../types';

const BrandCard: React.FC<{ brand: Brand }> = ({ brand }) => {
  const avgAov = (brand.aov_min + brand.aov_max) / 2;
  const bracket = getAovBracket(avgAov);

  const stageColor = {
    new: 'var(--warning)',
    scaling: 'var(--accent)',
    mature: 'var(--success)',
  }[brand.stage];

  return (
    <div className="brand-card">
      <div className="brand-card-header">
        <div className="brand-avatar">
          {brand.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="brand-name">{brand.name}</div>
          <div className="brand-category">{brand.category}</div>
        </div>
        <div className="brand-stage-badge" style={{ background: `${stageColor}15`, color: stageColor, border: `1px solid ${stageColor}30` }}>
          {brand.stage}
        </div>
      </div>

      <div className="brand-metrics">
        <div className="brand-metric">
          <div className="brand-metric-label"><Zap size={10} />AOV Range</div>
          <div className="brand-metric-value">{brand.currency}{brand.aov_min}–{brand.currency}{brand.aov_max}</div>
        </div>
        <div className="brand-metric">
          <div className="brand-metric-label"><TrendingUp size={10} />Bracket</div>
          <div className="brand-metric-value">{bracket.label}</div>
        </div>
        <div className="brand-metric">
          <div className="brand-metric-label"><Globe size={10} />Markets</div>
          <div className="brand-metric-value">{brand.markets.length > 0 ? brand.markets.join(', ') : '—'}</div>
        </div>
      </div>

      <div className="brand-funnel-tag">
        <Zap size={10} />
        {bracket.recommended_funnel}
      </div>

      <div className="brand-markets">
        {brand.markets.slice(0, 5).map((m) => (
          <span key={m} className="market-flag">{MARKETS[m]?.split(' ')[0]}</span>
        ))}
      </div>
    </div>
  );
};

const Brands: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => getBrands(user!.id),
    enabled: !!user,
  });

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">Brands</div>
          <div className="page-subtitle">{brands.length} brand{brands.length !== 1 ? 's' : ''} configured</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
          <Plus size={14} />
          Add Brand
        </button>
      </div>

      {isLoading ? (
        <div className="grid-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 14 }} />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Tag size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 16 }}>No brands yet</p>
          <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
            <Plus size={14} />
            Create Your First Brand
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {brands.map((brand) => <BrandCard key={brand.id} brand={brand} />)}
        </div>
      )}

      <style>{`
        .brand-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: all var(--transition);
        }

        .brand-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }

        .brand-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--accent), #818CF8);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .brand-name {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .brand-category {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 1px;
        }

        .brand-stage-badge {
          margin-left: auto;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .brand-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .brand-metric {
          background: var(--surface-3);
          border-radius: var(--radius-sm);
          padding: 8px;
        }

        .brand-metric-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .brand-metric-value {
          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .brand-funnel-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-dim);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          font-size: 11px;
          color: var(--text-accent);
          font-weight: 500;
        }

        .brand-markets {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .market-flag {
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default Brands;
