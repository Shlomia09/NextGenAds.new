import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Plus, MessageSquare } from 'lucide-react';
import { getCampaigns } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';
import IntelligenceChat from '../components/intelligence/IntelligenceChat';

const Intelligence: React.FC = () => {
  const { activeBrand } = useBrand();

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', activeBrand?.id],
    queryFn:  () => getCampaigns(activeBrand!.id),
    enabled:  !!activeBrand,
  });


  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="section-eyebrow">
            <Sparkles size={10} strokeWidth={1.5} />
            AI Strategist
          </div>
          <h1 className="page-title">
            Intelligence <em style={{ fontStyle: 'italic', color: 'var(--rose-gold)' }}>Engine</em>
          </h1>
          <p className="page-subtitle">
            9-year Beauty & Cosmetics benchmark knowledge · Context-aware campaign strategist
          </p>
        </div>
        <button className="btn btn-secondary">
          <Plus size={13} strokeWidth={1.5} />
          New Session
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, flex: 1, minHeight: 0 }}>
        {/* Sessions sidebar */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border-light)', fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 400, color: 'var(--text-hint)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Sessions
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '6px' }}>
            <div className="int-session-item active">
              <MessageSquare size={11} strokeWidth={1.5} />
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, color: 'var(--text-primary)' }}>Current Session</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)', marginTop: 2 }}>Just now</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div style={{ minHeight: 0 }}>
          {activeBrand ? (
            <IntelligenceChat brand={activeBrand as any} campaigns={campaigns} />
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 14 }}>
              <Sparkles size={28} strokeWidth={1.5} style={{ color: 'var(--rose-gold)' }} />
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, color: 'var(--text-primary)' }}>Set up a brand to start</p>
              <a href="/onboarding" className="btn btn-primary">Get Started</a>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .int-session-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all var(--transition);
          color: var(--text-muted);
        }

        .int-session-item:hover { background: var(--bg-secondary); color: var(--text-primary); }

        .int-session-item.active {
          background: var(--rose-gold-light);
          color: var(--rose-gold-dark);
          border: 0.5px solid var(--border-rose);
        }
      `}</style>
    </div>
  );
};

export default Intelligence;
