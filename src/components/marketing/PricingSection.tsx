import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLAN_META, type PlanId } from '../../hooks/usePlan';
import { createCheckoutSession } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';

// Prices come from PLAN_META only. The copy below describes what each plan
// unlocks, matched to the plan limits in supabase/billing_schema.sql.
const PAID: { id: Exclude<PlanId, 'free'>; for: string; includes: string[]; recommended?: boolean }[] = [
  {
    id: 'starter',
    for: 'For brands that want the diagnosis first.',
    includes: [
      '1 brand · 1 ad account',
      'Half-life and cause of death for every creative',
      'Copy drafted from your own winners',
      'Rouge in chat · 20 questions a month',
      'Watches and reports — does not act in the account',
    ],
  },
  {
    id: 'growth',
    for: 'For brands handing over the day-to-day.',
    recommended: true,
    includes: [
      '2 brands · 2 ad accounts',
      'Everything in Starter',
      'Proposes every change with its reason, and executes the ones you approve',
      'Rouge in chat · unlimited',
    ],
  },
  {
    id: 'scale',
    for: 'For agencies and multi-brand operators.',
    includes: [
      'Up to 5 brands · 5 ad accounts',
      'Everything in Growth',
      'White-label reports',
      'Agency view across brands',
      'API access (beta)',
    ],
  },
];

const eur = (n: number) => `€${n.toLocaleString('en-US')}`;

// aside: an optional image beside the heading (the landing passes the powder still; /pricing does not)
export function PricingSection({ headingLevel = 'h2', aside }: { headingLevel?: 'h1' | 'h2'; aside?: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);   // plan id whose checkout failed

  // Annual saving, derived from the prices themselves (not a separate claim)
  const s = PLAN_META.starter;
  const saving = Math.round((1 - s.yearly / (s.monthly * 12)) * 100);

  const choose = async (id: string) => {
    if (!user) { navigate('/login'); return; }
    setLoading(id);
    setFailed(null);
    try {
      const { url } = await createCheckoutSession(id, cycle);
      window.location.href = url;
    } catch (err) {
      setLoading(null);
      // An expired session is still a signed-out user; anything else stays on the page.
      if (err instanceof Error && err.message === 'Not authenticated') { navigate('/login'); return; }
      console.error('[pricing] checkout failed', { plan: id, cycle, err });
      setFailed(id);
    }
  };

  const Heading = headingLevel;

  return (
    <>
      <div className={aside ? 'mk-split mk-split-pricing' : undefined}>
        <div className="mk-section-head">
          <div className="mk-eyebrow">Pricing</div>
          <Heading className="mk-h2">Cheaper than<br />the hire.</Heading>
          <p className="mk-lead" style={{ maxWidth: '56ch' }}>
            A performance manager who knows beauty is a salary line.
            Rouge is a software line.
          </p>
        </div>
        {aside}
      </div>

      <div className="mk-toggle" role="group" aria-label="Billing cycle">
        <button className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
        <button className={cycle === 'yearly' ? 'on' : ''} onClick={() => setCycle('yearly')}>Annually · save {saving}%</button>
      </div>

      <div className="mk-plans">
        {PAID.map(p => {
          const meta = PLAN_META[p.id];
          const amount = cycle === 'monthly' ? meta.monthly : meta.yearly;
          return (
            <div key={p.id} className={`mk-plan${p.recommended ? ' recommended' : ''}`}>
              {p.recommended && <span className="mk-plan-tag">Recommended</span>}
              <div className="mk-plan-name">{meta.label}</div>
              <div>
                <div className="mk-plan-price">
                  <span className="mk-plan-amount">{eur(amount)}</span>
                  <span className="mk-plan-period">{cycle === 'monthly' ? '/ month' : '/ year'}</span>
                </div>
                {cycle === 'yearly' && <div className="mk-plan-sub">{eur(Math.round(meta.yearly / 12))} / month</div>}
              </div>
              <p className="mk-plan-for">{p.for}</p>
              <ul>{p.includes.map(f => <li key={f}>{f}</li>)}</ul>
              <button
                className="btn btn-lg btn-secondary"
                disabled={loading === p.id}
                onClick={() => choose(p.id)}
              >
                {loading === p.id ? 'Opening checkout…' : 'Get started'}
              </button>
              {failed === p.id && (
                <p className="mk-plan-error" role="alert">
                  Checkout isn't available yet — we'll be in touch.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mk-guarantee">
        30-day money-back guarantee. If Rouge doesn't find what your reporting
        missed, you don't pay for the month.
      </p>
    </>
  );
}
