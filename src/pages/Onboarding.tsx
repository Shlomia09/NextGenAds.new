import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { createBrand } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getAovBracket, MARKETS, CATEGORIES } from '../lib/benchmarks';

const STEPS = ['Brand Basics', 'AOV & Markets', 'Stage & Launch'];

const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    category: '',
    aov_min: 80,
    aov_max: 150,
    currency: 'EUR',
    markets: [] as string[],
    stage: 'new' as 'new' | 'scaling' | 'mature',
  });

  const avgAov = (form.aov_min + form.aov_max) / 2;
  const bracket = getAovBracket(avgAov);

  const toggleMarket = (market: string) => {
    setForm((f) => ({
      ...f,
      markets: f.markets.includes(market)
        ? f.markets.filter((m) => m !== market)
        : [...f.markets, market],
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      await createBrand({ ...form, user_id: user.id });
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create brand');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.category;
    if (step === 1) return form.markets.length > 0;
    return true;
  };

  return (
    <div className="ob-page">
      <div className="ob-left">
        <div className="ob-left-inner">
          <div className="ob-logo">Next<em>Gen</em>Ads</div>
          <p className="ob-left-tagline">
            Tell us about your brand and we'll immediately calibrate 9 years of benchmark data to your exact AOV and markets.
          </p>
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
        </div>
      </div>

      <div className="ob-right">
        <div className="ob-form-wrap animate-fade-in">
          {/* Progress */}
          <div className="ob-progress-bar">
            <div className="ob-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <div className="ob-step-label-top">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>

          {/* ── Step 0 ── */}
          {step === 0 && (
            <div className="ob-step-content animate-fade-in">
              <h2 className="ob-title">Tell us about <em>your brand</em></h2>
              <p className="ob-subtitle">We'll use this to pull the right benchmark data immediately</p>

              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Lumière Paris"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <div className="ob-grid-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`ob-select-btn ${form.category === cat ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, category: cat })}
                    >{cat}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="ob-step-content animate-fade-in">
              <h2 className="ob-title">AOV & <em>Markets</em></h2>
              <p className="ob-subtitle">This determines your entire funnel strategy and benchmarks</p>

              <div className="form-group">
                <label className="form-label">AOV Range ({form.currency})</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 9 }}>Minimum</label>
                    <input type="number" className="form-input"
                      value={form.aov_min}
                      onChange={(e) => setForm({ ...form, aov_min: parseInt(e.target.value) })}
                      min={0} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 9 }}>Maximum</label>
                    <input type="number" className="form-input"
                      value={form.aov_max}
                      onChange={(e) => setForm({ ...form, aov_max: parseInt(e.target.value) })}
                      min={0} />
                  </div>
                </div>
              </div>

              {/* Funnel recommendation */}
              <div className="ob-funnel-rec">
                <div className="ob-funnel-eyebrow">Recommended Funnel · {bracket.label}</div>
                <div className="ob-funnel-value">{bracket.recommended_funnel}</div>
                <div className="ob-funnel-meta">
                  CAC <span>€{bracket.benchmark_cac.min}–€{bracket.benchmark_cac.max}</span>
                  {' · '}
                  Benchmark ROAS <span>{bracket.benchmark_roas}x</span>
                  {' · '}
                  Profitable in <span>{bracket.timeline_days}d</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Markets</label>
                <div className="ob-grid-2">
                  {Object.entries(MARKETS).map(([code, label]) => (
                    <button
                      key={code}
                      className={`ob-select-btn ${form.markets.includes(code) ? 'selected' : ''}`}
                      onClick={() => toggleMarket(code)}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="ob-step-content animate-fade-in">
              <h2 className="ob-title">Account <em>Stage</em></h2>
              <p className="ob-subtitle">We'll calibrate warm-up protocols and scaling rules accordingly</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  { value: 'new',     label: 'New Account',  desc: 'Pixel < 2 weeks. We apply the full warm-up protocol.',        dot: '#F59E0B' },
                  { value: 'scaling', label: 'Scaling',       desc: 'Active account with data. Ready to grow budgets.',            dot: '#C4836A' },
                  { value: 'mature',  label: 'Mature',        desc: 'Established account with rich history and lookalikes.',       dot: '#10B981' },
                ] as const).map(({ value, label, desc, dot }) => (
                  <button
                    key={value}
                    className={`ob-stage-btn ${form.stage === value ? 'selected' : ''}`}
                    style={form.stage === value ? { borderColor: dot, background: `${dot}0A` } : {}}
                    onClick={() => setForm({ ...form, stage: value })}
                  >
                    <div className="ob-stage-dot" style={{ background: dot }} />
                    <div>
                      <div className="ob-stage-label">{label}</div>
                      <div className="ob-stage-desc">{desc}</div>
                    </div>
                    {form.stage === value && <Check size={13} style={{ color: dot, marginLeft: 'auto', flexShrink: 0 }} strokeWidth={2} />}
                  </button>
                ))}
              </div>

              {error && (
                <div style={{ background: '#FEE2E2', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#991B1B', fontFamily: 'var(--font-sans)', fontWeight: 300, marginTop: 8 }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="ob-nav">
            {step > 0 && (
              <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={13} strokeWidth={1.5} />
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Next
                <ChevronRight size={13} strokeWidth={1.5} />
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
        .ob-page {
          min-height: 100vh;
          display: flex;
        }

        .ob-left {
          width: 38%;
          background: #2C1810;
          display: flex;
          align-items: center;
          padding: 48px 48px;
        }

        .ob-left-inner {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .ob-logo {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 400;
          color: #F5E6D8;
          letter-spacing: 0.03em;
        }

        .ob-logo em { font-style: italic; color: #C4836A; }

        .ob-left-tagline {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: #8B6050;
          line-height: 1.65;
        }

        .ob-step-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 8px;
        }

        .ob-step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          letter-spacing: 0.06em;
          color: #4d3a2e;
          transition: color var(--transition);
        }

        .ob-step-item.active { color: #C4A090; }
        .ob-step-item.done   { color: #8B6050; }

        .ob-step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #3d2a1e;
          border: 0.5px solid #4d3a2e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #6d4a3e;
          flex-shrink: 0;
          transition: all var(--transition);
        }

        .ob-step-item.active .ob-step-num { border-color: #C4836A; color: #C4836A; }
        .ob-step-item.done  .ob-step-num { background: #C4836A; border-color: #C4836A; color: white; }

        .ob-right {
          flex: 1;
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
        }

        .ob-form-wrap {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ob-progress-bar {
          height: 2px;
          background: var(--border-light);
          border-radius: 1px;
          overflow: hidden;
        }

        .ob-progress-fill {
          height: 100%;
          background: var(--rose-gold);
          border-radius: 1px;
          transition: width 0.4s ease;
        }

        .ob-step-label-top {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          font-weight: 400;
          color: var(--text-hint);
          letter-spacing: 0.04em;
        }

        .ob-step-content {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .ob-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 400;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          line-height: 1.2;
        }

        .ob-title em { font-style: italic; color: var(--rose-gold); }

        .ob-subtitle {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-muted);
          line-height: 1.5;
          margin-top: -10px;
        }

        .ob-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .ob-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7px;
        }

        .ob-select-btn {
          padding: 9px 10px;
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition);
          text-align: center;
        }

        .ob-select-btn:hover { border-color: var(--rose-gold-pale); color: var(--text-primary); }
        .ob-select-btn.selected { border-color: var(--rose-gold); background: var(--rose-gold-light); color: var(--text-primary); }

        .ob-funnel-rec {
          background: var(--rose-gold-light);
          border: 0.5px solid var(--border-rose);
          border-radius: var(--radius);
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .ob-funnel-eyebrow {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose-gold-dark);
        }

        .ob-funnel-value {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .ob-funnel-meta {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .ob-funnel-meta span {
          font-weight: 500;
          color: var(--rose-gold-dark);
        }

        .ob-stage-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all var(--transition);
          text-align: left;
          font-family: var(--font-sans);
        }

        .ob-stage-btn:hover { border-color: var(--rose-gold-pale); }

        .ob-stage-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ob-stage-label {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 3px;
        }

        .ob-stage-desc {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .ob-nav {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 4px;
          border-top: 0.5px solid var(--border-light);
        }

        @media (max-width: 768px) {
          .ob-page { flex-direction: column; }
          .ob-left { width: 100%; padding: 32px 24px; }
          .ob-right { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
