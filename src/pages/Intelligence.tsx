import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Plus, MessageSquare } from 'lucide-react';
import { getBrands, getCampaigns } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import IntelligenceChat from '../components/intelligence/IntelligenceChat';

const Intelligence: React.FC = () => {
  const { user } = useAuth();

  const { data: brands } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => getBrands(user!.id),
    enabled: !!user,
  });

  const activeBrand = brands?.[0];

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', activeBrand?.id],
    queryFn: () => getCampaigns(activeBrand!.id),
    enabled: !!activeBrand,
  });

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
            Intelligence Engine
          </div>
          <div className="page-subtitle">
            9-year Beauty & Cosmetics benchmark knowledge · Context-aware AI strategist
          </div>
        </div>
        <button className="btn btn-secondary">
          <Plus size={14} />
          New Session
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Sessions sidebar */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Sessions
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            <div className="intelligence-session-item active">
              <MessageSquare size={12} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>Current Session</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Just now</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div style={{ minHeight: 0 }}>
          {activeBrand ? (
            <IntelligenceChat brand={activeBrand} campaigns={campaigns} />
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
              <Sparkles size={32} />
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Set up a brand to start chatting</p>
              <a href="/onboarding" className="btn btn-primary">Get Started</a>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .intelligence-session-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all var(--transition);
          color: var(--text-secondary);
        }

        .intelligence-session-item:hover {
          background: var(--surface-3);
          color: var(--text-primary);
        }

        .intelligence-session-item.active {
          background: var(--accent-dim);
          color: var(--accent);
          border: 1px solid rgba(99,102,241,0.2);
        }
      `}</style>
    </div>
  );
};

export default Intelligence;
