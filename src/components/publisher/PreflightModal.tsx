import React, { useEffect, useState } from 'react';
import {
  X, ExternalLink, CheckCircle, Loader2, AlertTriangle,
  ArrowLeft, Sparkles, Globe, Users, Calendar, DollarSign,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/benchmarks';
import type { CampaignDraft } from '../../types/campaign';
import { markDraftPublished } from '../../lib/drafts';

interface Props {
  draft: CampaignDraft;
  creativeThumbnail?: string;     // dataURL or base64 preview
  imageBase64?: string;           // actual full-res base64 for upload
  imageMediaType?: string;
  onBack: () => void;
  onClose: () => void;
  onSuccess: (result: Record<string, unknown>) => void;
}

const COUNTRY_LABELS: Record<string, string> = {
  IT: 'Italy', ES: 'Spain', DE: 'Germany', FR: 'France',
  GB: 'UK', NL: 'Netherlands', BE: 'Belgium', AT: 'Austria',
  CH: 'Switzerland', PT: 'Portugal', US: 'USA', AU: 'Australia',
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: '📘 Meta Ads', google: '🔍 Google Ads', tiktok: '🎵 TikTok Ads',
};

const PreflightModal: React.FC<Props> = ({
  draft, creativeThumbnail, imageBase64, imageMediaType,
  onBack, onClose, onSuccess,
}) => {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState<Record<string, unknown> | null>(null);
  const [visible, setVisible]   = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);

  const dailyEur = (draft.daily_budget_cents || 0) / 100;
  const lowBudget = dailyEur < 30;

  const publish = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const campaign = {
        draft_id: draft.id,
        brand_id: draft.brand_id,
        platform: draft.platform,
        ad_account_id: draft.ad_account_id,
        objective: draft.conversion_type === 'ecommerce' ? 'sales'
          : draft.conversion_type === 'bookings' ? 'leads' : 'leads',
        conversion_type: draft.conversion_type,
        daily_budget_cents: draft.daily_budget_cents,
        currency: draft.currency || 'EUR',
        start_time: draft.start_time || new Date(Date.now() + 86400000).toISOString(),
        end_time: draft.end_time || undefined,
        targeting: {
          countries: draft.target_countries || ['IT'],
          age_min: draft.age_min || 25,
          age_max: draft.age_max || 55,
          gender: draft.gender || 'all',
        },
        campaign_name: draft.campaign_name || 'NextGenAds Campaign',
        creative: {
          type: 'image',
          image_base64: imageBase64,
          media_type: imageMediaType || 'image/jpeg',
          primary_text: draft.copy_primary,
          headline: (draft.copy_primary || '').slice(0, 40),
          body: draft.copy_body,
          cta: draft.copy_cta || 'SIGN_UP',
          destination_url: draft.destination_url,
        },
      };

      const res = await fetch(`${supabaseUrl}/functions/v1/publish-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ campaign, draft_id: draft.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');

      if (draft.id) await markDraftPublished(draft.id, data);
      setSuccess(data);
      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }} />
        <div style={{
          position: 'fixed', inset: 0, zIndex: 201,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, pointerEvents: 'none',
        }}>
          <div style={{
            background: 'var(--app-surface)', border: '0.5px solid var(--app-border)',
            borderRadius: 16, padding: 40, maxWidth: 480, width: '100%',
            pointerEvents: 'auto', textAlign: 'center',
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(74,222,128,0.1)', border: '0.5px solid rgba(74,222,128,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle size={26} style={{ color: '#4ade80' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 8 }}>
              Campaign Published!
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              {String(success.message || 'Your campaign has been created and is currently paused. Activate it in Meta Ads Manager when you\'re ready.')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {(['campaign_id', 'adset_id', 'ad_id'] as const).map(key => success[key] && (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#F8F6F3', borderRadius: 6 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-hint)', textTransform: 'uppercase' }}>{key.replace('_', ' ')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>{String(success[key])}</span>
                </div>
              )) as React.ReactNode[]}
            </div>

            <a
              href={String(success.ads_manager_url || 'https://adsmanager.facebook.com')}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, var(--rose-gold), #a0554a)',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'white',
                textDecoration: 'none', marginBottom: 12,
              }}
            >
              <ExternalLink size={14} />
              Open in Meta Ads Manager
            </a>
            <button
              onClick={onClose}
              style={{
                width: '100%', background: 'transparent',
                border: '0.5px solid var(--app-border)', borderRadius: 10, padding: '10px 20px',
                fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={!loading ? onClose : undefined} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(560px, 96vw)', zIndex: 201,
        background: 'var(--app-surface)',
        borderLeft: '0.5px solid var(--app-border)',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 22px 14px', borderBottom: '0.5px solid var(--app-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onBack}
              style={{
                background: 'transparent', border: '0.5px solid var(--app-border)',
                borderRadius: 6, padding: '5px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={10} /> Edit
            </button>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
              Pre-flight Review
            </h2>
          </div>
          <button onClick={!loading ? onClose : undefined} style={{ background: 'transparent', border: '0.5px solid var(--app-border)', borderRadius: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-hint)' }}>
            <X size={13} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Creative preview */}
          {creativeThumbnail && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--app-border)' }}>
              <img src={creativeThumbnail} alt="Creative preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {/* Copy */}
          <div style={{ background: 'rgba(196,131,106,0.04)', border: '0.5px solid rgba(196,131,106,0.15)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--rose-gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Ad Copy</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Primary', value: draft.copy_primary },
                { label: 'Body',    value: draft.copy_body },
                { label: 'CTA',     value: draft.copy_cta },
              ].map(({ label, value }) => value && (
                <div key={label}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 8, color: 'var(--text-hint)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign details */}
          <div style={{ background: '#F8F6F3', border: '0.5px solid #E8E4DF', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Campaign Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: <Sparkles size={12} />, label: 'Platform', value: PLATFORM_LABELS[draft.platform || 'meta'] },
                { icon: <DollarSign size={12} />, label: 'Daily Budget', value: `${formatCurrency(dailyEur)}/day` },
                { icon: <Calendar size={12} />, label: 'Schedule', value: draft.end_time ? `${new Date(draft.start_time || '').toLocaleDateString()} – ${new Date(draft.end_time).toLocaleDateString()}` : `Starts ${new Date(draft.start_time || Date.now()).toLocaleDateString()}` },
                { icon: <Globe size={12} />, label: 'Countries', value: (draft.target_countries || ['IT']).map(c => COUNTRY_LABELS[c] || c).join(', ') },
                { icon: <Users size={12} />, label: 'Audience', value: `Age ${draft.age_min || 25}–${draft.age_max || 55} · ${draft.gender === 'male' ? 'Men' : draft.gender === 'female' ? 'Women' : 'All genders'}` },
                { icon: <ExternalLink size={12} />, label: 'Destination', value: draft.destination_url || '—' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ color: 'var(--text-hint)', flexShrink: 0, marginTop: 2 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {lowBudget && (
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '0.5px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
              <AlertTriangle size={13} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                Budget of {formatCurrency(dailyEur)}/day is below the €30 threshold recommended for consistent beauty lead gen results.
              </div>
            </div>
          )}

          {!imageBase64 && (
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '0.5px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
              <AlertTriangle size={13} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                No creative image detected. Campaign and ad set will be created, but the ad will need a creative added manually in Meta Ads Manager.
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.06)', border: '0.5px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 8 }}>
              <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#f87171', lineHeight: 1.6 }}>{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px 20px', borderTop: '0.5px solid var(--app-border)', flexShrink: 0, background: 'var(--app-surface)' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', marginBottom: 10, textAlign: 'center' }}>
            Campaign will be created as <strong style={{ color: '#fbbf24' }}>PAUSED</strong>. Activate manually in Meta Ads Manager when ready.
          </div>
          <button
            onClick={publish}
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'rgba(196,131,106,0.3)' : 'linear-gradient(135deg, var(--rose-gold), #a0554a)',
              border: 'none', borderRadius: 10, padding: '14px 20px',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Publishing to Meta…</>
              : <>Publish to {PLATFORM_LABELS[draft.platform || 'meta']} →</>
            }
          </button>
        </div>
      </div>
    </>
  );
};

export default PreflightModal;
