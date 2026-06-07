import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { createBrand } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getAovBracket, MARKETS, CATEGORIES, BUSINESS_TYPE_LABELS, LEFT_PANEL_COPY } from '../lib/benchmarks';
import type { BusinessType, BusinessGoal } from '../types';

const STEPS = ['Brand Basics', 'Business Type', 'Business Details', 'Stage & Launch'];

const AD_SPEND_OPTIONS = [
  'Under €1K/mo', '€1K–3K/mo', '€3K–10K/mo', 'Over €10K/mo',
];

const AOV_OPTIONS_ECOM = [
  { label: 'Under €50', min: 0, max: 50 },
  { label: '€50–100',  min: 50, max: 100 },
  { label: '€100–200', min: 100, max: 200 },
  { label: '€200–400', min: 200, max: 400 },
  { label: 'Over €400', min: 400, max: 600 },
];

const TREATMENT_VALUE_OPTIONS = [
  { label: 'Under €100', min: 0, max: 100 },
  { label: '€100–300',  min: 100, max: 300 },
  { label: '€300–600',  min: 300, max: 600 },
  { label: 'Over €600', min: 600, max: 1200 },
];

const TICKET_OPTIONS_SPA = [
  { label: 'Under €80', min: 0, max: 80 },
  { label: '€80–150',  min: 80, max: 150 },
  { label: '€150–300', min: 150, max: 300 },
  { label: 'Over €300', min: 300, max: 500 },
];

const TICKET_OPTIONS_SALON = [
  { label: 'Under €50', min: 0, max: 50 },
  { label: '€50–100',  min: 50, max: 100 },
  { label: '€100–200', min: 100, max: 200 },
  { label: 'Over €200', min: 200, max: 400 },
];

const WHOLESALE_AOV_OPTIONS = [
  { label: 'Under €500', min: 0, max: 500 },
  { label: '€500–2K',   min: 500, max: 2000 },
  { label: '€2K–10K',  min: 2000, max: 10000 },
  { label: 'Over €10K', min: 10000, max: 20000 },
];

const CLINIC_SERVICES = ['Botox/Fillers', 'Laser', 'Facials', 'Body treatments', 'PRP', 'Other'];
const SPA_SERVICES = ['Massages', 'Facials', 'Body wraps', 'Hydrotherapy', 'Yoga/Pilates', 'Other'];
const SALON_SERVICES = ['Hair', 'Nails', 'Brows & Lashes', 'Makeup', 'Multiple'];
const TARGET_BUYERS = ['Beauty salons', 'SPAs', 'Clinics', 'Retailers', 'Pharmacies', 'Online resellers'];

const ECOM_PLATFORMS = ['Shopify', 'WooCommerce', 'Magento', 'Other'];
const BOOKING_PLATFORMS_CLINIC = ['Treatwell', 'Fresha', 'Doctoralia', 'Own website', 'Phone only'];
const BOOKING_PLATFORMS_SPA = ['Treatwell', 'Fresha', 'Mindbody', 'Own website', 'Phone only'];
const BOOKING_PLATFORMS_SALON = ['Treatwell', 'Fresha', 'Booksy', 'Vagaro', 'Phone only'];
const EMAIL_PLATFORMS = ['Klaviyo', 'Mailchimp', 'ActiveCampaign', 'None'];

interface FormState {
  // Step 0
  name: string;
  category: string;
  // Step 1
  business_type: BusinessType | '';
  // Step 2 — shared
  markets: string[];
  ad_spend_range: string;
  // Ecommerce
  aov_min: number;
  aov_max: number;
  currency: string;
  ecom_platform: string;
  crm_platform: string;
  // Clinic / Spa
  avg_treatment_value: number;
  avg_ticket: number;
  booking_platform: string;
  services: string[];
  goal: BusinessGoal | '';
  // Wholesale
  avg_wholesale_order: number;
  target_buyers: string[];
  // Step 3
  stage: 'new' | 'scaling' | 'mature';
  biggest_challenge: string;
}

const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>({
    name: '', category: '', business_type: '',
    markets: [], ad_spend_range: '',
    aov_min: 80, aov_max: 150, currency: 'EUR',
    ecom_platform: '', crm_platform: '',
    avg_treatment_value: 0, avg_ticket: 0,
    booking_platform: '', services: [], goal: '',
    avg_wholesale_order: 0, target_buyers: [],
    stage: 'new', biggest_challenge: '',
  });

  const bt = form.business_type;
  const avgAov = (form.aov_min + form.aov_max) / 2;
  const bracket = getAovBracket(avgAov);

  const toggleArr = (key: keyof FormState, val: string) => {
    setForm(f => {
      const arr = (f[key] as string[]);
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const toggleMarket = (m: string) => toggleArr('markets', m);
  const toggleService = (s: string) => toggleArr('services', s);
  const toggleBuyer = (b: string) => toggleArr('target_buyers', b);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        name: form.name,
        category: form.category,
        business_type: form.business_type || 'ecommerce',
        markets: form.markets,
        stage: form.stage,
        currency: form.currency,
        biggest_challenge: form.biggest_challenge || null,
        ad_spend_range: form.ad_spend_range || null,
        goal: form.goal || null,
      };

      if (bt === 'ecommerce' || bt === '') {
        payload.aov_min = form.aov_min;
        payload.aov_max = form.aov_max;
        payload.ecom_platform = form.ecom_platform || null;
        payload.crm_platform = form.crm_platform || null;
      } else if (bt === 'clinic') {
        payload.aov_min = form.avg_treatment_value;
        payload.aov_max = form.avg_treatment_value;
        payload.avg_treatment_value = form.avg_treatment_value;
        payload.booking_platform = form.booking_platform || null;
        payload.services = form.services;
      } else if (bt === 'spa') {
        payload.aov_min = form.avg_ticket;
        payload.aov_max = form.avg_ticket;
        payload.avg_ticket = form.avg_ticket;
        payload.booking_platform = form.booking_platform || null;
        payload.services = form.services;
      } else if (bt === 'salon') {
        payload.aov_min = form.avg_ticket;
        payload.aov_max = form.avg_ticket;
        payload.avg_ticket = form.avg_ticket;
        payload.booking_platform = form.booking_platform || null;
        payload.services = form.services;
      } else if (bt === 'wholesale') {
        payload.aov_min = form.avg_wholesale_order;
        payload.aov_max = form.avg_wholesale_order;
        payload.avg_wholesale_order = form.avg_wholesale_order;
        payload.target_buyers = form.target_buyers;
      }

      await createBrand(payload as Parameters<typeof createBrand>[0]);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create brand');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = (): boolean => {
    if (step === 0) return !!(form.name.trim() && form.category);
    if (step === 1) return !!form.business_type;
    if (step === 2) return form.markets.length > 0;
    return true;
  };

  const leftCopy = bt ? LEFT_PANEL_COPY[bt] : LEFT_PANEL_COPY['ecommerce'];

  return (
    <div className="ob-page">
      <div className="ob-left">
        <div className="ob-left-inner">
          <div className="ob-logo">NextGen<em>Ads</em></div>
          <p className="ob-left-tagline">{leftCopy}</p>
          <div className="ob-step-list">
            {STEPS.map((label, i) => (
              <div key={i} className={`ob-step-item ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                <div className="ob-step-num">
                  {i < step ? <Check size={10} strokeWidth={2} /> : i + 1}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {bt && (
            <div className="ob-type-preview">
              <span>{BUSINESS_TYPE_LABELS[bt]?.icon}</span>
              <span>{BUSINESS_TYPE_LABELS[bt]?.title}</span>
            </div>
          )}
        </div>
      </div>

      <div className="ob-right">
        <div className="ob-form-wrap animate-fade-in">
          {/* Progress */}
          <div className="ob-progress-bar">
            <div className="ob-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <div className="ob-step-label-top">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>

          {/* ── Step 0 — Brand Basics ── */}
          {step === 0 && (
            <div className="ob-step-content animate-fade-in">
              <h2 className="ob-title">Tell us about <em>your brand</em></h2>
              <p className="ob-subtitle">We'll use this to pull the right benchmark data immediately</p>
              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input className="form-input" placeholder="e.g. Lumière Paris"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <div className="ob-grid-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat}
                      className={`ob-select-btn ${form.category === cat ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, category: cat })}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1 — Business Type ── */}
          {step === 1 && (
            <div className="ob-step-content animate-fade-in">
              <h2 className="ob-title">What type of <em>business</em>?</h2>
              <p className="ob-subtitle">This determines your KPIs, funnel strategy, and benchmark data</p>
              <div className="ob-type-grid">
                {(Object.entries(BUSINESS_TYPE_LABELS) as [BusinessType, typeof BUSINESS_TYPE_LABELS[string]][]).map(([type, info]) => (
                  <button key={type}
                    className={`ob-type-card ${form.business_type === type ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, business_type: type })}>
                    <div className="ob-type-icon">{info.icon}</div>
                    <div className="ob-type-title">{info.title}</div>
                    <div className="ob-type-sub">{info.sub}</div>
                    <div className="ob-type-desc">{info.desc}</div>
                    {form.business_type === type && <div className="ob-type-check"><Check size={12} strokeWidth={2.5} /></div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2 — Business Details (dynamic by type) ── */}
          {step === 2 && (
            <div className="ob-step-content animate-fade-in">
              <h2 className="ob-title">Business <em>Details</em></h2>
              <p className="ob-subtitle">Help us calibrate your intelligence engine</p>

              {/* ECOMMERCE */}
              {bt === 'ecommerce' && (
                <>
                  <div className="form-group">
                    <label className="form-label">AOV Range</label>
                    <div className="ob-grid-3">
                      {AOV_OPTIONS_ECOM.map(opt => (
                        <button key={opt.label}
                          className={`ob-select-btn ${form.aov_min === opt.min ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, aov_min: opt.min, aov_max: opt.max })}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.aov_min > 0 && (
                    <div className="ob-funnel-rec">
                      <div className="ob-funnel-eyebrow">Recommended Funnel · {bracket.label}</div>
                      <div className="ob-funnel-value">{bracket.recommended_funnel}</div>
                      <div className="ob-funnel-meta">
                        CAC <span>€{bracket.benchmark_cac.min}–€{bracket.benchmark_cac.max}</span>
                        {' · '}Benchmark ROAS <span>{bracket.benchmark_roas}x</span>
                        {' · '}Profitable in <span>{bracket.timeline_days}d</span>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <div className="ob-grid-2">
                      {ECOM_PLATFORMS.map(p => (
                        <button key={p} className={`ob-select-btn ${form.ecom_platform === p ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, ecom_platform: p })}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Platform</label>
                    <div className="ob-grid-2">
                      {EMAIL_PLATFORMS.map(p => (
                        <button key={p} className={`ob-select-btn ${form.crm_platform === p ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, crm_platform: p })}>{p}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* CLINIC */}
              {bt === 'clinic' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Average Treatment Value</label>
                    <div className="ob-grid-2">
                      {TREATMENT_VALUE_OPTIONS.map(opt => (
                        <button key={opt.label}
                          className={`ob-select-btn ${form.avg_treatment_value === opt.min ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, avg_treatment_value: opt.min })}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Main Services</label>
                    <div className="ob-grid-2">
                      {CLINIC_SERVICES.map(s => (
                        <button key={s} className={`ob-select-btn ${form.services.includes(s) ? 'selected' : ''}`}
                          onClick={() => toggleService(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Booking System</label>
                    <div className="ob-grid-2">
                      {BOOKING_PLATFORMS_CLINIC.map(p => (
                        <button key={p} className={`ob-select-btn ${form.booking_platform === p ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, booking_platform: p })}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Goal</label>
                    <div className="ob-grid-2">
                      {['More bookings', 'More consultations', 'Brand awareness'].map(g => (
                        <button key={g} className={`ob-select-btn ${form.goal === g ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, goal: g as BusinessGoal })}>{g}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* SPA */}
              {bt === 'spa' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Average Ticket</label>
                    <div className="ob-grid-2">
                      {TICKET_OPTIONS_SPA.map(opt => (
                        <button key={opt.label}
                          className={`ob-select-btn ${form.avg_ticket === opt.min ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, avg_ticket: opt.min })}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Services</label>
                    <div className="ob-grid-2">
                      {SPA_SERVICES.map(s => (
                        <button key={s} className={`ob-select-btn ${form.services.includes(s) ? 'selected' : ''}`}
                          onClick={() => toggleService(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Booking System</label>
                    <div className="ob-grid-2">
                      {BOOKING_PLATFORMS_SPA.map(p => (
                        <button key={p} className={`ob-select-btn ${form.booking_platform === p ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, booking_platform: p })}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Goal</label>
                    <div className="ob-grid-2">
                      {['Bookings', 'Memberships', 'Gift vouchers'].map(g => (
                        <button key={g} className={`ob-select-btn ${form.goal === g ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, goal: g as BusinessGoal })}>{g}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* SALON */}
              {bt === 'salon' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Average Ticket</label>
                    <div className="ob-grid-2">
                      {TICKET_OPTIONS_SALON.map(opt => (
                        <button key={opt.label}
                          className={`ob-select-btn ${form.avg_ticket === opt.min ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, avg_ticket: opt.min })}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Services</label>
                    <div className="ob-grid-2">
                      {SALON_SERVICES.map(s => (
                        <button key={s} className={`ob-select-btn ${form.services.includes(s) ? 'selected' : ''}`}
                          onClick={() => toggleService(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Booking System</label>
                    <div className="ob-grid-2">
                      {BOOKING_PLATFORMS_SALON.map(p => (
                        <button key={p} className={`ob-select-btn ${form.booking_platform === p ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, booking_platform: p })}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Goal</label>
                    <div className="ob-grid-2">
                      {['New clients', 'Rebooking', 'Gift cards'].map(g => (
                        <button key={g} className={`ob-select-btn ${form.goal === g ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, goal: g as BusinessGoal })}>{g}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* WHOLESALE */}
              {bt === 'wholesale' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Average Order Value</label>
                    <div className="ob-grid-2">
                      {WHOLESALE_AOV_OPTIONS.map(opt => (
                        <button key={opt.label}
                          className={`ob-select-btn ${form.avg_wholesale_order === opt.min ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, avg_wholesale_order: opt.min })}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Buyers</label>
                    <div className="ob-grid-2">
                      {TARGET_BUYERS.map(b => (
                        <button key={b} className={`ob-select-btn ${form.target_buyers.includes(b) ? 'selected' : ''}`}
                          onClick={() => toggleBuyer(b)}>{b}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Goal</label>
                    <div className="ob-grid-2">
                      {['Lead generation', 'Distributor partnerships', 'Brand awareness'].map(g => (
                        <button key={g} className={`ob-select-btn ${form.goal === g ? 'selected' : ''}`}
                          onClick={() => setForm({ ...form, goal: g as BusinessGoal })}>{g}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Markets — all types */}
              <div className="form-group">
                <label className="form-label">Target Markets</label>
                <div className="ob-grid-2">
                  {Object.entries(MARKETS).map(([code, label]) => (
                    <button key={code}
                      className={`ob-select-btn ${form.markets.includes(code) ? 'selected' : ''}`}
                      onClick={() => toggleMarket(code)}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Ad Spend — all types */}
              <div className="form-group">
                <label className="form-label">Monthly Ad Spend</label>
                <div className="ob-grid-2">
                  {AD_SPEND_OPTIONS.map(opt => (
                    <button key={opt}
                      className={`ob-select-btn ${form.ad_spend_range === opt ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, ad_spend_range: opt })}>{opt}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 — Stage & Launch ── */}
          {step === 3 && (
            <div className="ob-step-content animate-fade-in">
              <h2 className="ob-title">Account <em>Stage</em></h2>
              <p className="ob-subtitle">We'll calibrate warm-up protocols and scaling rules accordingly</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  { value: 'new',     label: 'New Account (0–3 months)',      desc: 'Pixel < 2 weeks. We apply the full warm-up protocol.',      dot: '#F59E0B' },
                  { value: 'scaling', label: 'Growing (3–12 months)',         desc: 'Active account with data. Ready to grow budgets.',          dot: '#C4836A' },
                  { value: 'mature',  label: 'Established (1+ year)',         desc: 'Rich history, lookalikes, and retargeting audiences built.', dot: '#10B981' },
                ] as const).map(({ value, label, desc, dot }) => (
                  <button key={value}
                    className={`ob-stage-btn ${form.stage === value ? 'selected' : ''}`}
                    style={form.stage === value ? { borderColor: dot, background: `${dot}0A` } : {}}
                    onClick={() => setForm({ ...form, stage: value })}>
                    <div className="ob-stage-dot" style={{ background: dot }} />
                    <div>
                      <div className="ob-stage-label">{label}</div>
                      <div className="ob-stage-desc">{desc}</div>
                    </div>
                    {form.stage === value && <Check size={13} style={{ color: dot, marginLeft: 'auto', flexShrink: 0 }} strokeWidth={2} />}
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Biggest Challenge <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <textarea className="form-input" rows={3} style={{ resize: 'vertical', minHeight: 80 }}
                  placeholder="e.g. CPL keeps rising, not sure if my creative is the problem or the targeting..."
                  value={form.biggest_challenge}
                  onChange={e => setForm({ ...form, biggest_challenge: e.target.value })} />
              </div>

              {error && (
                <div style={{ background: '#FEE2E2', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#991B1B', fontFamily: 'var(--font-sans)', fontWeight: 300 }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="ob-nav">
            {step > 0 && (
              <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={13} strokeWidth={1.5} /> Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Next <ChevronRight size={13} strokeWidth={1.5} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Creating…' : 'Launch Dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .ob-page { min-height: 100vh; display: flex; }

        .ob-left {
          width: 36%;
          background: #2C1810;
          display: flex; align-items: center;
          padding: 48px;
          position: sticky; top: 0; height: 100vh;
        }

        .ob-left-inner { display: flex; flex-direction: column; gap: 22px; }

        .ob-logo {
          font-family: 'Playfair Display', serif;
          font-size: 20px; font-weight: 400;
          color: #F5E6D8; letter-spacing: 0.03em;
        }
        .ob-logo em { font-style: italic; color: #C4836A; }

        .ob-left-tagline {
          font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 300;
          color: #8B6050; line-height: 1.65;
        }

        .ob-step-list { display: flex; flex-direction: column; gap: 10px; }

        .ob-step-item {
          display: flex; align-items: center; gap: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 300; letter-spacing: 0.06em;
          color: #4d3a2e; transition: color var(--transition);
        }
        .ob-step-item.active { color: #C4A090; }
        .ob-step-item.done   { color: #8B6050; }

        .ob-step-num {
          width: 22px; height: 22px; border-radius: 50%;
          background: #3d2a1e; border: 0.5px solid #4d3a2e;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Mono', monospace; font-size: 10px; color: #6d4a3e;
          flex-shrink: 0; transition: all var(--transition);
        }
        .ob-step-item.active .ob-step-num { border-color: #C4836A; color: #C4836A; }
        .ob-step-item.done  .ob-step-num { background: #C4836A; border-color: #C4836A; color: white; }

        .ob-type-preview {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 300; color: #C4A090;
          padding: 8px 12px; background: #3d2a1e;
          border: 0.5px solid #4d3a2e; border-radius: 4px;
          margin-top: 4px;
        }

        .ob-right {
          flex: 1; background: var(--bg-primary);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 48px 40px; overflow-y: auto;
        }

        .ob-form-wrap {
          width: 100%; max-width: 520px;
          display: flex; flex-direction: column; gap: 20px;
        }

        .ob-progress-bar { height: 2px; background: var(--border-light); border-radius: 1px; overflow: hidden; }
        .ob-progress-fill { height: 100%; background: var(--rose-gold); border-radius: 1px; transition: width 0.4s ease; }

        .ob-step-label-top {
          font-family: 'DM Mono', monospace; font-size: 10px;
          font-weight: 400; color: var(--text-hint); letter-spacing: 0.04em;
        }

        .ob-step-content { display: flex; flex-direction: column; gap: 18px; }

        .ob-title {
          font-family: 'Playfair Display', serif; font-size: 26px;
          font-weight: 400; color: var(--text-primary);
          letter-spacing: -0.01em; line-height: 1.2;
        }
        .ob-title em { font-style: italic; color: var(--rose-gold); }

        .ob-subtitle {
          font-family: 'Outfit', sans-serif; font-size: 12px;
          font-weight: 300; color: var(--text-muted);
          line-height: 1.5; margin-top: -10px;
        }

        .ob-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
        .ob-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }

        .ob-select-btn {
          padding: 9px 10px;
          background: var(--bg-card); border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 300;
          color: var(--text-secondary); cursor: pointer;
          transition: all var(--transition); text-align: center;
        }
        .ob-select-btn:hover { border-color: var(--rose-gold-pale); color: var(--text-primary); }
        .ob-select-btn.selected { border-color: var(--rose-gold); background: var(--rose-gold-light); color: var(--text-primary); }

        /* Business Type Cards */
        .ob-type-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .ob-type-card {
          position: relative;
          padding: 16px 14px;
          background: var(--bg-card); border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          text-align: left; cursor: pointer;
          transition: all var(--transition);
          display: flex; flex-direction: column; gap: 4px;
        }
        .ob-type-card:hover { border-color: var(--rose-gold-pale); box-shadow: var(--shadow-sm); }
        .ob-type-card.selected { border-color: var(--rose-gold); background: var(--rose-gold-light); }

        .ob-type-icon { font-size: 22px; margin-bottom: 4px; }

        .ob-type-title {
          font-family: 'Outfit', sans-serif; font-size: 13px;
          font-weight: 500; color: var(--text-primary);
        }

        .ob-type-sub {
          font-family: 'Outfit', sans-serif; font-size: 11px;
          font-weight: 300; color: var(--text-secondary);
        }

        .ob-type-desc {
          font-family: 'Outfit', sans-serif; font-size: 10px;
          font-weight: 300; color: var(--text-muted);
        }

        .ob-type-check {
          position: absolute; top: 10px; right: 10px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--rose-gold); color: white;
          display: flex; align-items: center; justify-content: center;
        }

        /* Funnel rec */
        .ob-funnel-rec {
          background: var(--rose-gold-light); border: 0.5px solid var(--border-rose);
          border-radius: var(--radius); padding: 12px 14px;
          display: flex; flex-direction: column; gap: 5px;
        }
        .ob-funnel-eyebrow {
          font-family: 'Outfit', sans-serif; font-size: 9px;
          font-weight: 400; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--rose-gold-dark);
        }
        .ob-funnel-value {
          font-family: 'Outfit', sans-serif; font-size: 13px;
          font-weight: 500; color: var(--text-primary);
        }
        .ob-funnel-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text-muted); line-height: 1.6; }
        .ob-funnel-meta span { font-weight: 500; color: var(--rose-gold-dark); }

        /* Stage buttons */
        .ob-stage-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 14px;
          background: var(--bg-card); border: 0.5px solid var(--border-light);
          border-radius: var(--radius); cursor: pointer;
          transition: all var(--transition); text-align: left;
          font-family: var(--font-sans);
        }
        .ob-stage-btn:hover { border-color: var(--rose-gold-pale); }
        .ob-stage-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .ob-stage-label { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 3px; }
        .ob-stage-desc  { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 300; color: var(--text-secondary); line-height: 1.4; }

        .ob-nav {
          display: flex; align-items: center; gap: 10px;
          padding-top: 4px; border-top: 0.5px solid var(--border-light);
        }

        @media (max-width: 768px) {
          .ob-page { flex-direction: column; }
          .ob-left { width: 100%; padding: 32px 24px; position: relative; height: auto; }
          .ob-right { padding: 32px 24px; }
          .ob-type-grid { grid-template-columns: 1fr; }
          .ob-grid-3 { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
