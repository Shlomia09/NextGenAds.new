import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Sparkles } from 'lucide-react';
import { getBrands, getCampaigns, getRecommendations, updateRecommendationStatus } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useActiveAccount } from '../contexts/ActiveAccountContext';
import {
  getBenchmarkMetricsByType,
  getBenchmarkAvailability,
  getAovBracket,
} from '../lib/benchmarks';
import BenchmarkMetricCard from '../components/ui/BenchmarkMetricCard';
import BenchmarkAvailabilityBadge from '../components/ui/BenchmarkAvailabilityBadge';
import RecommendationCard from '../components/recommendations/RecommendationCard';
import IntelligenceChat from '../components/intelligence/IntelligenceChat';
import type { Recommendation, BusinessType } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [learnMoreRec, setLearnMoreRec] = useState<Recommendation | null>(null);
  useActiveAccount();

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => getBrands(user!.id),
    enabled: !!user,
  });

  const activeBrand = brands?.[0];

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', activeBrand?.id],
    queryFn: () => getCampaigns(activeBrand!.id),
    enabled: !!activeBrand,
  });

  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 44px)' }}>
        <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </div>
    );
  }

  // ── No brand ─────────────────────────────────────────────────
  if (!activeBrand) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 44px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 40px', gap: 14 }}>
          <Sparkles size={32} strokeWidth={1.5} style={{ color: 'var(--rose-gold)' }} />
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
            No Brand Connected Yet
          </h2>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', margin: 0 }}>
            Complete the onboarding to activate your Intelligence Dashboard
          </p>
          <a href="/onboarding" className="btn btn-primary btn-lg">Set Up Your Brand</a>
        </div>
      </div>
    );
  }

  // ── Benchmark metrics (universal, routed by business_type) ───
  const businessType = (activeBrand.business_type as BusinessType) ?? 'ecommerce';
  const aov = (activeBrand.aov_min + activeBrand.aov_max) / 2;
  const benchmarkMetrics = getBenchmarkMetricsByType(businessType, aov, campaigns);
  const benchmarkAvailability = getBenchmarkAvailability(businessType);
  const aovBracket = getAovBracket(aov);

  // ── Sorted recommendations ───────────────────────────────────
  const pendingRecs = recommendations.filter((r) => r.status === 'pending');
  const criticalRecs = pendingRecs.filter((r) => r.priority === 'critical');
  const highRecs = pendingRecs.filter((r) => r.priority === 'high');
  const mediumRecs = pendingRecs.filter((r) => r.priority === 'medium');
  const sortedRecs = [...criticalRecs, ...highRecs, ...mediumRecs];

  const isLoading = campaignsLoading || recsLoading;

  return (
    <>
      {/* ── 3-Panel Grid ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr 256px',
          height: 'calc(100vh - 44px)',
          overflow: 'hidden',
        }}
      >
        {/* ══════════════════════════════════════════════════════
            LEFT PANEL — Campaign Benchmarks (300px)
        ══════════════════════════════════════════════════════ */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRight: '0.5px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            gap: 0,
          }}
        >
          {/* Panel header */}
          <div style={{ padding: '16px 16px 12px', flexShrink: 0 }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                textTransform: 'uppercase',
                color: 'var(--text-3, var(--text-muted))',
                letterSpacing: '0.6px',
                marginBottom: 4,
              }}
            >
              PERFORMANCE INTELLIGENCE
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 400,
                color: 'var(--text-1, var(--text-primary))',
              }}
            >
              Campaign Benchmarks
            </div>
          </div>

          {/* Alert bar */}
          {benchmarkMetrics.length > 0 && (
            <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'var(--warning-bg, rgba(245,158,11,0.06))',
                  border: '0.5px solid var(--alert-dot, #F59E0B)',
                  borderRadius: 6,
                  padding: '7px 10px',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--alert-dot, #F59E0B)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 11,
                    color: 'var(--warning-text, #92400E)',
                    lineHeight: 1.4,
                  }}
                >
                  Benchmarks based on 9yr Beauty &amp; Clinic dataset
                </span>
              </div>
            </div>
          )}

          {/* Availability badge */}
          <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
            <BenchmarkAvailabilityBadge
              availability={benchmarkAvailability}
              aovLabel={businessType === 'ecommerce' ? aovBracket.label : undefined}
              markets={activeBrand.markets}
            />
          </div>

          {/* Benchmark metric cards */}
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <BenchmarkMetricCard
                    key={i}
                    label=""
                    yourValue={0}
                    benchmarkValue={0}
                    unit=""
                    higherIsBetter
                    loading
                  />
                ))
              : benchmarkMetrics.map((m) => (
                  <BenchmarkMetricCard
                    key={m.label}
                    label={m.label}
                    yourValue={m.your_value}
                    benchmarkValue={m.benchmark_value}
                    unit={m.unit}
                    higherIsBetter={m.higher_is_better}
                  />
                ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            MIDDLE PANEL — Intelligence Insights (1fr)
        ══════════════════════════════════════════════════════ */}
        <div
          style={{
            background: 'var(--bg-page, var(--bg-secondary))',
            padding: 20,
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                fontWeight: 400,
                color: 'var(--text-1, var(--text-primary))',
                marginBottom: 4,
              }}
            >
              Intelligence{' '}
              <em style={{ color: 'var(--copper, var(--rose-gold))', fontStyle: 'italic' }}>
                Insights
              </em>
            </div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 12,
                color: 'var(--text-3, var(--text-muted))',
                fontWeight: 300,
              }}
            >
              AI-powered recommendations for your campaigns
            </div>
          </div>

          {/* Recommendation cards */}
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-card)',
                    border: '0.5px solid var(--border-light)',
                    borderRadius: 6,
                    padding: '16px',
                    height: 120,
                    animation: 'shimmer 1.8s infinite',
                    backgroundImage: 'linear-gradient(90deg, #F8F6F3 25%, #FFFFFF 50%, #F8F6F3 75%)',
                    backgroundSize: '200% 100%',
                  }}
                />
              ))}
            </div>
          ) : sortedRecs.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300,
                gap: 12,
              }}
            >
              <div style={{ fontSize: 28 }}>✨</div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 14,
                  color: 'var(--text-1, var(--text-primary))',
                }}
              >
                All caught up
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--text-2, var(--text-secondary))',
                  textAlign: 'center',
                  maxWidth: 240,
                }}
              >
                No active recommendations. Your campaigns are performing well.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedRecs.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                  onLearnMore={handleLearnMore}
                />
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            RIGHT PANEL — Intelligence Engine (256px)
        ══════════════════════════════════════════════════════ */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderLeft: '0.5px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Panel header */}
          <div style={{ padding: '16px 14px 12px', flexShrink: 0, borderBottom: '0.5px solid var(--border)' }}>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--text-1, var(--text-primary))',
                marginBottom: 3,
              }}
            >
              Intelligence{' '}
              <em style={{ color: 'var(--copper, var(--rose-gold))', fontStyle: 'italic' }}>
                Engine
              </em>
            </div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 10,
                color: 'var(--text-3, var(--text-muted))',
                fontWeight: 300,
                marginBottom: 8,
              }}
            >
              Active brand context · 9yr beauty benchmark data
            </div>
            {campaigns.length > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--warning-bg, rgba(245,158,11,0.06))',
                  color: 'var(--warning-text, #92400E)',
                  border: '0.5px solid rgba(245,158,11,0.2)',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} loaded
              </span>
            )}
          </div>

          {/* Intelligence Chat — fills remaining height */}
          <div style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
            <IntelligenceChat
              brand={activeBrand}
              campaigns={campaigns}
              compact
            />
          </div>
        </div>
      </div>

      {/* ── Learn More Modal ───────────────────────────────────── */}
      {learnMoreRec && (
        <div className="modal-overlay" onClick={() => setLearnMoreRec(null)}>
          <div className="modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="section-eyebrow" style={{ marginBottom: 6 }}>AI Recommendation</div>
            <h3 className="modal-title">{learnMoreRec.title}</h3>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 300,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
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
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                {learnMoreRec.action}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setLearnMoreRec(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};

export default Dashboard;
