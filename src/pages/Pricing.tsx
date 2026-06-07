import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../hooks/useSubscription';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 149, yearly: 1490, monthlyEquiv: 124 },
    badge: null,
    description: 'For brands finding their benchmark',
    features: [
      '1 brand · 1 ad account',
      'Full benchmark comparison',
      'AI recommendations (read-only)',
      'Intelligence Chat — 20 queries/mo',
      'Monthly benchmark audit report',
      'Meta Ads sync',
      'Email support',
    ],
    cta: 'Start with Starter',
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: { monthly: 349, yearly: 3490, monthlyEquiv: 291 },
    badge: 'Most Popular',
    description: 'For scaling brands ready to execute',
    features: [
      '2 brands · 2 ad accounts',
      'Everything in Starter',
      'Campaign execution (human-approved)',
      'Klaviyo intelligence layer',
      'Intelligence Chat — unlimited',
      'Google Ads sync',
      'Priority support + onboarding call',
    ],
    cta: 'Start with Growth',
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: { monthly: 749, yearly: 7490, monthlyEquiv: 624 },
    badge: null,
    description: 'For agencies and multi-brand operators',
    features: [
      'Up to 5 brands · 5 ad accounts',
      'Everything in Growth',
      'White-label PDF reports',
      'Agency dashboard view',
      'Dedicated account manager',
      'Custom benchmark vertical',
      'API access (beta)',
    ],
    cta: 'Start with Scale',
    popular: false,
  },
];

const comparisonRows = [
  { feature: 'Beauty-specific benchmarks', nextads: true, madgicx: false, revealbot: false },
  { feature: 'AI recommendations',         nextads: true, madgicx: true,  revealbot: false },
  { feature: 'Campaign execution',          nextads: true, madgicx: true,  revealbot: true  },
  { feature: '9-year data depth',           nextads: true, madgicx: false, revealbot: false },
  { feature: 'Klaviyo integration',         nextads: true, madgicx: false, revealbot: false },
  { feature: 'Agency PDF reports',          nextads: true, madgicx: false, revealbot: false },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const { url } = await createCheckoutSession(planId, billingCycle);
      window.location.href = url;
    } catch (err) {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatPrice = (plan: typeof plans[0]) => {
    if (billingCycle === 'monthly') {
      return { main: `€${plan.price.monthly.toLocaleString()}`, suffix: '/mo', sub: null };
    }
    return {
      main: `€${plan.price.yearly.toLocaleString()}`,
      suffix: '/yr',
      sub: `€${plan.price.monthlyEquiv}/mo`,
    };
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .pricing-page * {
          box-sizing: border-box;
        }

        .pricing-page {
          background: #0F0A07;
          color: #F5E6D8;
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
          padding: 80px 24px 120px;
        }

        .pricing-inner {
          max-width: 1080px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .pricing-eyebrow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .pricing-eyebrow-line {
          width: 36px;
          height: 1px;
          background: #C4836A;
        }
        .pricing-eyebrow-text {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #C4836A;
        }

        .pricing-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 5vw, 52px);
          font-weight: 700;
          color: #F5E6D8;
          text-align: center;
          margin: 0 0 14px;
          line-height: 1.15;
        }
        .pricing-h1 em {
          font-style: italic;
          color: #C4836A;
        }

        .pricing-subtitle {
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          font-size: 15px;
          color: #8B6050;
          text-align: center;
          margin: 0 0 48px;
        }

        /* ── Toggle ── */
        .billing-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 40px;
          border: 1px solid #2a1a0e;
          border-radius: 6px;
          overflow: hidden;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }
        .toggle-btn {
          padding: 10px 22px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          outline: none;
          transition: background 0.2s, color 0.2s;
          letter-spacing: 0.02em;
        }
        .toggle-btn.active {
          background: #C4836A;
          color: #0F0A07;
        }
        .toggle-btn.inactive {
          background: transparent;
          color: #6b4030;
        }
        .toggle-btn.inactive:hover {
          color: #C4836A;
        }

        /* ── Free Audit Banner ── */
        .free-audit-card {
          background: #1C1208;
          border: 0.5px solid #2a1a0e;
          border-left: 2.5px solid #C4836A;
          border-radius: 6px;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .free-audit-label {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #C4836A;
          margin-bottom: 4px;
        }
        .free-audit-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: #F5E6D8;
          margin: 0 0 3px;
        }
        .free-audit-sub {
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          font-size: 12px;
          color: #8B6050;
          margin: 0;
        }

        /* ── Plan Cards ── */
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 64px;
          align-items: start;
        }

        @media (max-width: 820px) {
          .plans-grid {
            grid-template-columns: 1fr;
          }
        }

        .plan-card {
          background: #1C1208;
          border: 0.5px solid #2a1a0e;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .plan-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(196, 131, 106, 0.08);
        }
        .plan-card.popular {
          border: 1px solid #C4836A;
        }

        .popular-bar {
          background: #C4836A;
          padding: 6px 14px;
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #0F0A07;
          text-align: center;
        }

        .plan-body {
          padding: 28px 24px 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .plan-name {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 600;
          color: #F5E6D8;
          margin: 0 0 12px;
        }

        .plan-price-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
          flex-wrap: wrap;
        }
        .plan-price-main {
          font-family: 'DM Mono', monospace;
          font-size: 48px;
          font-weight: 500;
          line-height: 1;
          color: #F5E6D8;
        }
        .plan-price-main.rose {
          color: #C4836A;
        }
        .plan-price-suffix {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: #8B6050;
          align-self: flex-end;
          padding-bottom: 4px;
        }
        .plan-price-sub {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #8B6050;
          margin-top: 4px;
        }

        .plan-description {
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          font-size: 12px;
          color: #8B6050;
          margin: 6px 0 0;
        }

        .plan-divider {
          border: none;
          border-top: 0.5px solid #2a1a0e;
          margin: 16px 0;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
          flex: 1;
        }
        .plan-feature {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
        }
        .feature-check {
          color: #10B981;
          font-size: 13px;
          line-height: 1.6;
          flex-shrink: 0;
        }
        .feature-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          font-size: 12px;
          color: #C4A090;
          line-height: 1.6;
        }

        /* ── Buttons ── */
        .btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 20px;
          background: #C4836A;
          color: #0F0A07;
          border: none;
          border-radius: 5px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .btn-primary:hover:not(:disabled) {
          background: #d4957c;
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 20px;
          background: transparent;
          color: #C4836A;
          border: 1px solid #C4836A;
          border-radius: 5px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, transform 0.15s;
        }
        .btn-secondary:hover:not(:disabled) {
          background: rgba(196, 131, 106, 0.1);
          transform: translateY(-1px);
        }
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(15,10,7,0.3);
          border-top-color: #0F0A07;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        .spinner.light {
          border-color: rgba(196,131,106,0.3);
          border-top-color: #C4836A;
        }

        /* ── Comparison Table ── */
        .comparison-section {
          margin-top: 16px;
        }
        .comparison-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: #F5E6D8;
          margin: 0 0 20px;
          text-align: center;
        }
        .comparison-table-wrap {
          overflow-x: auto;
          border-radius: 6px;
          border: 0.5px solid #2a1a0e;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          background: #1C1208;
        }
        .comparison-table th,
        .comparison-table td {
          padding: 13px 20px;
          text-align: center;
          border-bottom: 0.5px solid #2a1a0e;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
        }
        .comparison-table th {
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.04em;
          color: #8B6050;
          background: #150e06;
        }
        .comparison-table th.nextads-col {
          background: rgba(196,131,106,0.15);
          color: #C4836A;
        }
        .comparison-table td:first-child {
          text-align: left;
          color: #C4A090;
          font-weight: 400;
        }
        .comparison-table tbody tr:last-child td {
          border-bottom: none;
        }
        .comparison-table tbody tr:hover td {
          background: rgba(196,131,106,0.04);
        }
        .cell-check {
          color: #10B981;
          font-size: 16px;
          font-weight: 600;
        }
        .cell-cross {
          color: #4a2e1e;
          font-size: 16px;
          font-weight: 600;
        }
      `}</style>

      <div className="pricing-page">
        <div className="pricing-inner">

          {/* ── Page Header ── */}
          <div className="pricing-eyebrow">
            <span className="pricing-eyebrow-line" />
            <span className="pricing-eyebrow-text">Pricing</span>
            <span className="pricing-eyebrow-line" />
          </div>

          <h1 className="pricing-h1">
            Invest in <em>Intelligence</em>
          </h1>

          <p className="pricing-subtitle">
            Every plan includes our 9-year Beauty &amp; Cosmetics benchmark dataset
          </p>

          {/* ── Billing Toggle ── */}
          <div className="billing-toggle" role="group" aria-label="Billing cycle">
            <button
              className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : 'inactive'}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : 'inactive'}`}
              onClick={() => setBillingCycle('yearly')}
            >
              Annually — Save 17%
            </button>
          </div>

          {/* ── Free Audit Banner ── */}
          <div className="free-audit-card">
            <div>
              <div className="free-audit-label">Free Benchmark Audit</div>
              <p className="free-audit-title">Get your free benchmark report</p>
              <p className="free-audit-sub">No credit card · One-time · Takes 3 minutes</p>
            </div>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '10px 22px', whiteSpace: 'nowrap' }}
              onClick={() => navigate('/audit')}
            >
              Get Free Audit
            </button>
          </div>

          {/* ── Plan Cards ── */}
          <div className="plans-grid">
            {plans.map((plan) => {
              const pricing = formatPrice(plan);
              const isLoading = loadingPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`plan-card${plan.popular ? ' popular' : ''}`}
                >
                  {plan.popular && (
                    <div className="popular-bar">Most Popular</div>
                  )}

                  <div className="plan-body">
                    <h2 className="plan-name">{plan.name}</h2>

                    {/* Price */}
                    <div>
                      <div className="plan-price-row">
                        <span className={`plan-price-main${plan.popular ? ' rose' : ''}`}>
                          {pricing.main}
                        </span>
                        <span className="plan-price-suffix">{pricing.suffix}</span>
                      </div>
                      {pricing.sub && (
                        <div className="plan-price-sub">{pricing.sub}</div>
                      )}
                    </div>

                    <p className="plan-description">{plan.description}</p>

                    <hr className="plan-divider" />

                    <ul className="plan-features">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="plan-feature">
                          <span className="feature-check">✓</span>
                          <span className="feature-text">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className={plan.popular ? 'btn-primary' : 'btn-secondary'}
                      disabled={isLoading}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isLoading ? (
                        <>
                          <span className={`spinner${plan.popular ? '' : ' light'}`} />
                          Processing…
                        </>
                      ) : (
                        plan.cta
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Comparison Table ── */}
          <div className="comparison-section">
            <h2 className="comparison-title">How we compare</h2>
            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Feature</th>
                    <th className="nextads-col">NextAdsGen</th>
                    <th>Madgicx</th>
                    <th>Revealbot</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.feature}</td>
                      <td>
                        {row.nextads
                          ? <span className="cell-check">✓</span>
                          : <span className="cell-cross">✗</span>}
                      </td>
                      <td>
                        {row.madgicx
                          ? <span className="cell-check">✓</span>
                          : <span className="cell-cross">✗</span>}
                      </td>
                      <td>
                        {row.revealbot
                          ? <span className="cell-check">✓</span>
                          : <span className="cell-cross">✗</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
