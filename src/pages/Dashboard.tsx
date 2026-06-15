import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Sparkles } from 'lucide-react';
import { getBrands, getCampaigns, getRecommendations, updateRecommendationStatus } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useActiveAccount } from '../contexts/ActiveAccountContext';
import { CONVERSION_META } from '../lib/conversionConfig';
import EcommerceDashboard from '../components/dashboard/EcommerceDashboard';
import ClinicDashboard from '../components/dashboard/ClinicDashboard';
import SpaDashboard from '../components/dashboard/SpaDashboard';
import SalonDashboard from '../components/dashboard/SalonDashboard';
import WholesaleDashboard from '../components/dashboard/WholesaleDashboard';
import type { Recommendation, BusinessType } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [learnMoreRec, setLearnMoreRec] = useState<Recommendation | null>(null);
  const { activeAccount } = useActiveAccount();

  // Derive KPI config for active account's conversion type
  const convType = activeAccount?.conversion_type ?? 'ecommerce';
  const convMeta = CONVERSION_META[convType];

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => getBrands(user!.id),
    enabled: !!user,
  });

  const activeBrand = brands?.[0];

  const { data: campaigns = [], isLoading: _campaignsLoading } = useQuery({
    queryKey: ['campaigns', activeBrand?.id],
    queryFn: () => getCampaigns(activeBrand!.id),
    enabled: !!activeBrand,
  });

  const { data: recommendations = [], isLoading: _recsLoading } = useQuery({
    queryKey: ['recommendations', activeBrand?.id],
    queryFn: () => getRecommendations(activeBrand!.id),
    enabled: !!activeBrand,
  });

  const updateRecMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'dismissed' }) =>
      updateRecommendationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
  });

  const handleApprove = (id: string) => updateRecMutation.mutate({ id, status: 'approved' });
  const handleDismiss = (id: string) => updateRecMutation.mutate({ id, status: 'dismissed' });
  const handleLearnMore = (rec: Recommendation) => setLearnMoreRec(rec);

  // ── Loading ──────────────────────────────────────────────────
  if (brandsLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </div>
    );
  }

  // ── No brand ─────────────────────────────────────────────────
  if (!activeBrand) {
    return (
      <div className="page-container">
        <div className="dash-empty">
          <Sparkles size={32} strokeWidth={1.5} style={{ color: 'var(--rose-gold)' }} />
          <h2 className="dash-empty-title">No Brand Connected Yet</h2>
          <p className="dash-empty-sub">Complete the onboarding to activate your Intelligence Dashboard</p>
          <a href="/onboarding" className="btn btn-primary btn-lg">Set Up Your Brand</a>
        </div>
        <style>{`
          .dash-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 80px 40px; gap: 14px; }
          .dash-empty-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 400; color: var(--text-primary); }
          .dash-empty-sub { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 300; color: var(--text-secondary); }
        `}</style>
      </div>
    );
  }

  const commonProps = {
    brand: activeBrand,
    campaigns,
    recommendations,
    onApproveRec: handleApprove,
    onDismissRec: handleDismiss,
    onLearnMoreRec: handleLearnMore,
  };

  // ── Route by business_type ────────────────────────────────────
  const renderDashboard = (type: BusinessType | undefined) => {
    switch (type) {
      case 'clinic':    return <ClinicDashboard    {...commonProps} />;
      case 'spa':       return <SpaDashboard       {...commonProps} />;
      case 'salon':     return <SalonDashboard     {...commonProps} />;
      case 'wholesale': return <WholesaleDashboard {...commonProps} />;
      default:          return <EcommerceDashboard {...commonProps} />;
    }
  };

  return (
    <>
      {/* Account indicator header */}
      {activeAccount && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 24px 0',
          marginBottom: -4,
        }}>
          <span style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 10,
            fontWeight: 300,
            color: '#6b4030',
            letterSpacing: '0.04em',
          }}>
            {activeAccount.display_name}
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: convMeta.bg,
            border: `0.5px solid ${convMeta.color}30`,
            borderRadius: 3,
            padding: '2px 7px',
            fontFamily: "'DM Mono', monospace",
            fontSize: 8,
            color: convMeta.color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
          }}>
            {convMeta.emoji} {convMeta.label}
          </span>
        </div>
      )}

      {renderDashboard(activeBrand.business_type as BusinessType | undefined)}

      {/* Learn More Modal — shared across all dashboard types */}
      {learnMoreRec && (
        <div className="modal-overlay" onClick={() => setLearnMoreRec(null)}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="section-eyebrow" style={{ marginBottom: 6 }}>AI Recommendation</div>
            <h3 className="modal-title">{learnMoreRec.title}</h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {learnMoreRec.description}
            </p>
            <div className="divider" />
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Benchmark Reference</div>
              <span className="rec-benchmark-ref">{learnMoreRec.benchmark_reference}</span>
            </div>
            <div className="divider" />
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Recommended Action</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {learnMoreRec.action}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setLearnMoreRec(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
