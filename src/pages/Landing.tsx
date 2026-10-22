import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/marketing.css';
import { MarketingNav, MarketingFooter } from '../components/marketing/MarketingChrome';
import { DecayLines } from '../components/marketing/DecayLines';
import { PricingSection } from '../components/marketing/PricingSection';
import { ProductShot, Material } from '../components/marketing/Figures';

/* ─────────────────────────────────────────────────────────────
   Rouge — landing. Spec: Docs/landing-spec.md (v2) + Docs/landing-spec-v3.md (visual layer).
   • Always Bone: the root pins data-theme="light".
   • No number without a source: only 25,620, 2018 and the plan prices.
   • CTA is always "Get started". 30-day money-back, nothing else.
   ───────────────────────────────────────────────────────────── */

const CAPABILITIES = [
  {
    title: 'Watches',
    body: 'It names the cause of death — not just that the number dropped. Frequency, hook-rate, CPM, or landing page. Each needs a different fix.',
  },
  {
    title: 'Runs it',
    body: 'Pausing, pacing, reallocation and audience tests run on their own, inside the ceiling you set. Anything that spends more waits for you.',
  },
  {
    title: 'Builds',
    body: 'New campaigns constructed with you. Structure, objective, audience, budget — from what already worked in your account.',
  },
  {
    title: 'Writes the copy',
    body: 'Pulled from the ads that already won in your account. Never from thin air.',
  },
  {
    title: 'Your tool. Your credits.',
    body: 'Visuals run on the creative account you connect, on your credits, at your request. We never resell you pixels.',
  },
];

const RUNS_ON_ITS_OWN = [
  'Pauses creatives below break-even.',
  'Moves budget between ads inside a campaign.',
  'Tests audiences within the budget you set.',
  "Kills what's dying before it drains the week.",
];

const ASKS_YOU_FIRST = [
  'Raising the budget.',
  'Launching a new campaign.',
  'Scaling past your ceiling.',
  'Anything that spends more than yesterday.',
];

function Card({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="mk-card">
      <span className="mk-card-num">{String(n).padStart(2, '0')}</span>
      <h3 className="mk-h3">{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  // Reveal on scroll — movement only, no fade (flat, no transparency)
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.15 },
    );
    rootRef.current?.querySelectorAll('.mk-reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const getStarted = () => navigate('/login');
  const howItWorks = () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="mk-root" data-theme="light" ref={rootRef}>
      <MarketingNav />

      {/* ── 1 · Hero ───────────────────────────────────────── */}
      <header className="mk-hero">
        <div className="mk-wrap mk-hero-grid">
          <div className="mk-hero-copy">
          <div className="mk-eyebrow">Beauty campaign intelligence</div>
          <h1 className="mk-h1">
            How many good days does this ad have <span className="mk-accent">left</span>?
          </h1>
          <p className="mk-lead">
            Nobody can tell you that from outside your account. Rouge reads yours
            every morning, names the creative that's dying, and tells you why —
            frequency, hook-rate, CPM, or landing page.
            All four look identical on a ROAS chart.
          </p>
          <div className="mk-actions">
            <button className="btn btn-primary btn-lg" onClick={getStarted}>Get started</button>
            <button className="btn btn-secondary btn-lg" onClick={howItWorks}>See how it works</button>
          </div>
          <p className="mk-fineprint">30-day money-back guarantee · No setup fee</p>
          </div>
          <div className="mk-hero-shot">
            <ProductShot name="shot-obituary" lazy={false} />
          </div>
        </div>
      </header>

      {/* ── 2 · Proof strip ────────────────────────────────── */}
      <div className="mk-proof">
        <div className="mk-wrap mk-proof-inner">
          <div className="mk-proof-item">
            <span className="mk-proof-num">25,620</span>
            <span className="mk-proof-lbl">Beauty campaigns analysed</span>
          </div>
          <div className="mk-proof-item">
            <span className="mk-proof-num">2018</span>
            <span className="mk-proof-lbl">First campaign in the dataset</span>
          </div>
          <div className="mk-proof-item">
            <span className="mk-proof-num">1</span>
            <span className="mk-proof-lbl">Vertical. Nothing else.</span>
          </div>
        </div>
      </div>

      {/* ── 3 · The problem ────────────────────────────────── */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section-head mk-reveal">
            <div className="mk-eyebrow">The problem</div>
            <h2 className="mk-h2">There is no<br />calendar for this.</h2>
          </div>
          <div className="mk-split">
          <div className="mk-body mk-lead">
            <p>
              A creative stops being profitable long before the ROAS chart admits it.
              Frequency climbs, hook-rate drops, CPM drifts, the landing page stalls —
              and all four look the same on the chart you're watching.
            </p>
            <p>
              How long it takes is different for every brand, every price point,
              every market. That's exactly why it can't be scheduled, and exactly
              why something has to be watching each one.
            </p>
            <p>By the time the number moves, the budget is already spent.</p>
          </div>
          <Material name="lipstick-section" className="mk-split-img" />
          </div>
          <div className="mk-problem-visual">
            <DecayLines />
            <p className="mk-caption">Four creatives. One account. Four different lifespans.</p>
          </div>
        </div>
      </section>

      {/* ── 4 · What it does ───────────────────────────────── */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section-head mk-reveal">
            <div className="mk-eyebrow">What it does</div>
            <h2 className="mk-h2">An operator,<br />not an advisor.</h2>
          </div>
          <div className="mk-cards">
            {CAPABILITIES.slice(0, 3).map((c, i) => <Card key={c.title} n={i + 1} title={c.title} body={c.body} />)}
          </div>
          <figure className="mk-figure">
            <ProductShot name="shot-dashboard" />
            <figcaption className="mk-figcaption">Live account. Demo data.</figcaption>
          </figure>
          <div className="mk-cards mk-cards-2">
            {CAPABILITIES.slice(3).map((c, i) => <Card key={c.title} n={i + 4} title={c.title} body={c.body} />)}
          </div>
        </div>
      </section>

      {/* ── 5 · How it works — the trust mechanism ─────────── */}
      <section className="mk-section" id="how">
        <div className="mk-wrap">
          <div className="mk-section-head mk-reveal">
            <div className="mk-eyebrow">How it works</div>
            <h2 className="mk-h2">It does the work.<br />You approve the spend.</h2>
          </div>
          <div className="mk-cols">
            <div className="mk-col">
              <div className="mk-eyebrow">Runs on its own</div>
              <ul>{RUNS_ON_ITS_OWN.map(t => <li key={t}>{t}</li>)}</ul>
            </div>
            <div className="mk-col">
              <div className="mk-eyebrow">Asks you first</div>
              <ul>{ASKS_YOU_FIRST.map(t => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
          <p className="mk-summary-sub">Every action is watched for 48 hours after it runs.</p>
        </div>
      </section>

      {/* ── 6 · Brand safety ───────────────────────────────── */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section-head mk-reveal">
            <div className="mk-eyebrow">Brand safety</div>
            <h2 className="mk-h2">Your brand book<br />stays yours.</h2>
          </div>
          <p className="mk-statement">Your visuals are your brand's — built by the people you pay to build them.</p>
          <div className="mk-body mk-lead">
            <p>
              Rouge doesn't generate your creative and doesn't make art-direction calls.
            </p>
            <p>
              What Rouge does is make them perform: it tells you which one is dying
              and why, drafts copy from the structures that already won in your
              account, and — if you connect your own creative tool — runs it on
              your credits, at your request.
            </p>
            <p>Inside beauty accounts since 2018. Your brand book untouched.</p>
          </div>
        </div>
      </section>

      {/* ── Band before pricing — no text ─────────────────── */}
      <div className="mk-band" aria-hidden="true">
        <Material name="powder-arc" />
      </div>

      {/* ── 7 · Pricing and CTA ────────────────────────────── */}
      <section className="mk-section" id="pricing">
        <div className="mk-wrap">
          <PricingSection />
        </div>
      </section>

      {/* ── 8 · Final CTA ──────────────────────────────────── */}
      <div className="mk-band mk-band-tall" aria-hidden="true">
        <Material name="pipette-drop" />
      </div>
      <section className="mk-final">
        <div className="mk-wrap">
          <h2 className="mk-h2 mk-reveal">
            Connect the account.<br />Read tomorrow's <span className="mk-accent">obituary</span>.
          </h2>
          <p className="mk-lead mk-final-sub">
            Thirty days. If Rouge doesn't find what your reporting missed, you don't pay for the month.
          </p>
          <div className="mk-actions">
            <button className="btn btn-primary btn-lg" onClick={getStarted}>Get started</button>
            <button className="btn btn-secondary btn-lg" onClick={howItWorks}>See how it works</button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
