import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ChevronRight, ChevronLeft, Check } from 'lucide-react';
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
    <div className="onboarding-page">
      <div className="onboarding-bg-glow" />

      <div className="onboarding-container animate-fade-in">
        {/* Header */}
        <div className="ob-header">
          <div className="ob-logo">
            <div className="ob-logo-icon"><Zap size={16} /></div>
            <span>NextGenAds</span>
          </div>
          <div className="ob-step-count">Step {step + 1} of {STEPS.length}</div>
        </div>

        {/* Progress bar */}
        <div className="ob-progress">
          <div className="ob-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Step indicators */}
        <div className="ob-steps">
          {STEPS.map((label, i) => (
            <div key={i} className={`ob-step-dot ${i <= step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
              {i < step ? <Check size={10} /> : i + 1}
              <span className="ob-step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="ob-card">
          {/* ——— Step 0: Brand Basics ——— */}
          {step === 0 && (
            <div className="ob-form animate-fade-in">
              <h2 className="ob-title">Tell us about your brand</h2>
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
                <div className="ob-category-grid">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`ob-category-btn ${form.category === cat ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, category: cat })}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ——— Step 1: AOV & Markets ——— */}
          {step === 1 && (
            <div className="ob-form animate-fade-in">
              <h2 className="ob-title">Average Order Value & Markets</h2>
              <p className="ob-subtitle">This determines your entire funnel strategy and benchmarks</p>

              <div className="form-group">
                <label className="form-label">AOV Range ({form.currency})</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 10 }}>Minimum</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.aov_min}
                      onChange={(e) => setForm({ ...form, aov_min: parseInt(e.target.value) })}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 10 }}>Maximum</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.aov_max}
                      onChange={(e) => setForm({ ...form, aov_max: parseInt(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* Funnel recommendation */}
              <div className="ob-funnel-rec">
                <div className="ob-funnel-label">
                  <Zap size={12} />
                  Recommended Funnel for AOV {bracket.label}
                </div>
                <div className="ob-funnel-value">{bracket.recommended_funnel}</div>
                <div className="ob-funnel-meta">
                  Expected CAC: €{bracket.benchmark_cac.min}–€{bracket.benchmark_cac.max} ·
                  Benchmark ROAS: {bracket.benchmark_roas}x ·
                  Profitability in {bracket.timeline_days} days
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Markets</label>
                <div className="ob-market-grid">
                  {Object.entries(MARKETS).map(([code, label]) => (
                    <button
                      key={code}
                      className={`ob-market-btn ${form.markets.includes(code) ? 'selected' : ''}`}
                      onClick={() => toggleMarket(code)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ——— Step 2: Stage ——— */}
          {step === 2 && (
            <div className="ob-form animate-fade-in">
              <h2 className="ob-title">Account Stage</h2>
              <p className="ob-subtitle">We'll calibrate warm-up protocols and scaling rules accordingly</p>

              <div className="ob-stage-options">
                {([
                  { value: 'new', label: 'New Account', desc: 'Pixel < 2 weeks, no history. We apply warm-up protocol.', color: 'var(--warning)' },
                  { value: 'scaling', label: 'Scaling', desc: 'Active account with some data. Ready to grow budgets.', color: 'var(--accent)' },
                  { value: 'mature', label: 'Mature', desc: 'Established account with rich history and lookalikes.', color: 'var(--success)' },
                ] as const).map(({ value, label, desc, color }) => (
                  <button
                    key={value}
                    className={`ob-stage-btn ${form.stage === value ? 'selected' : ''}`}
                    style={form.stage === value ? { borderColor: color, background: `${color}10` } : {}}
                    onClick={() => setForm({ ...form, stage: value })}
                  >
                    <div className="ob-stage-dot" style={{ background: color }} />
                    <div>
                      <div className="ob-stage-label">{label}</div>
                      <div className="ob-stage-desc">{desc}</div>
                    </div>
                    {form.stage === value && <Check size={14} style={{ color, marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>

              {error && (
                <div className="login-error" style={{ marginTop: 8 }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="ob-nav">
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={14} />
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
            >
              Next
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Launch Dashboard'}
              <Zap size={14} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .onboarding-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .onboarding-bg-glow {
          position: fixed;
          bottom: -200px;
          right: -200px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .onboarding-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 540px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ob-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ob-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .ob-logo-icon {
          width: 28px;
          height: 28px;
          background: var(--accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .ob-step-count {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .ob-progress {
          height: 3px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
        }

        .ob-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), #818CF8);
          border-radius: 2px;
          transition: width 0.4s ease;
        }

        .ob-steps {
          display: flex;
          justify-content: space-between;
        }

        .ob-step-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--surface-3);
          border: 2px solid var(--border);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          justify-content: center;
          transition: all var(--transition);
        }

        .ob-step-dot.active {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-dim);
        }

        .ob-step-dot.done {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .ob-step-label {
          position: absolute;
          margin-top: 36px;
          font-size: 10px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .ob-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 28px;
          min-height: 380px;
        }

        .ob-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ob-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .ob-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: -12px;
          line-height: 1.5;
        }

        .ob-category-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .ob-category-btn {
          padding: 10px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition);
          font-family: var(--font-body);
        }

        .ob-category-btn:hover,
        .ob-category-btn.selected {
          border-color: var(--accent);
          color: var(--text-primary);
          background: var(--accent-dim);
        }

        .ob-funnel-rec {
          background: var(--accent-dim);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: var(--radius);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ob-funnel-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .ob-funnel-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ob-funnel-meta {
          font-size: 11px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        .ob-market-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .ob-market-btn {
          padding: 10px 12px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition);
          text-align: left;
          font-family: var(--font-body);
        }

        .ob-market-btn:hover,
        .ob-market-btn.selected {
          border-color: var(--accent);
          color: var(--text-primary);
          background: var(--accent-dim);
        }

        .ob-stage-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ob-stage-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all var(--transition);
          text-align: left;
          font-family: var(--font-body);
        }

        .ob-stage-btn:hover {
          border-color: var(--border-hover);
        }

        .ob-stage-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ob-stage-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 3px;
        }

        .ob-stage-desc {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .ob-nav {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
