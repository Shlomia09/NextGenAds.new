import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Zap, Target, Shield, Globe, Users, Menu, X,
} from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../lib/supabase';

/* ────────────────────────────────────────────
   HERO TILE — dark panel campaign result card
──────────────────────────────────────────── */
const HeroTile: React.FC<{
  brand: string; roas: string; revenue: string; spend: string; badge?: string;
}> = ({ brand, roas, revenue, spend, badge }) => (
  <div className="ht-tile">
    {badge && <div className="ht-badge">{badge}</div>}
    <div className="ht-roas">{roas}</div>
    <div className="ht-row">
      <div>
        <div className="ht-val">{revenue}</div>
        <div className="ht-lbl">Revenue</div>
      </div>
      <div>
        <div className="ht-val dim">{spend}</div>
        <div className="ht-lbl">Spend</div>
      </div>
    </div>
    <div className="ht-brand">{brand}</div>
  </div>
);

/* ────────────────────────────────────────────
   CAMPAIGN CARD — showcase section
──────────────────────────────────────────── */
const CampaignCard: React.FC<{
  flag: string; brand: string; category: string; roas: string;
  revenue: string; spend: string; spend_label?: string; tag: string;
}> = ({ flag, brand, category, roas, revenue, spend, tag }) => (
  <div className="cc-card">
    <div className="cc-image">
      <div className="cc-image-inner" />
      <div className="cc-tag">{tag}</div>
    </div>
    <div className="cc-body">
      <div className="cc-flag-row"><span>{flag}</span> <span className="cc-cat">{category}</span></div>
      <div className="cc-brand">{brand}</div>
      <div className="cc-metrics">
        <div><div className="cc-mval">{roas}</div><div className="cc-mlbl">ROAS</div></div>
        <div><div className="cc-mval">{revenue}</div><div className="cc-mlbl">Revenue</div></div>
        <div><div className="cc-mval dim">{spend}</div><div className="cc-mlbl">Spend</div></div>
      </div>
      <div className="cc-cta-row">
        <span className="cc-benchmark-tag">↑ above benchmark</span>
      </div>
    </div>
  </div>
);

/* ────────────────────────────────────────────
   DIFFERENTIATOR CARD — dark section
──────────────────────────────────────────── */
const DiffCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="dc-card">
    <div className="dc-icon">{icon}</div>
    <div className="dc-title">{title}</div>
    <p className="dc-desc">{desc}</p>
  </div>
);

/* ────────────────────────────────────────────
   TESTIMONIAL
──────────────────────────────────────────── */
const Testimonial: React.FC<{
  initials: string; name: string; role: string; quote: string; roas: string;
}> = ({ initials, name, role, quote, roas }) => (
  <div className="tt-card">
    <div className="tt-header">
      <div className="tt-avatar">{initials}</div>
      <div className="tt-meta">
        <div className="tt-name">{name}</div>
        <div className="tt-role">{role}</div>
      </div>
      <div className="tt-roas">{roas}</div>
    </div>
    <p className="tt-quote">"{quote}"</p>
  </div>
);

/* ════════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════════ */
const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  /* Auth form state */
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(''); setAuthLoading(true);
    try {
      const { error } = authMode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);
      if (error) throw error;
      navigate('/dashboard');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally { setAuthLoading(false); }
  };

  const handleGoogle = async () => {
    setAuthError('');
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  return (
    <div className="lp">

      {/* ════ NAV ════ */}
      <nav className="lp-nav">
        <div className="lp-nav-logo">Next<em>Gen</em>Ads</div>

        <div className={`lp-nav-center ${menuOpen ? 'open' : ''}`}>
          <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
          <a href="#benchmarks" onClick={() => setMenuOpen(false)}>Benchmark Data</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
          <button className="btn btn-primary" onClick={() => { navigate('/login'); setMenuOpen(false); }}>
            Get Access
          </button>
        </div>

        <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
        </button>
      </nav>

      {/* ════ HERO ════ */}
      <section className="lp-hero" id="platform">
        {/* Left */}
        <div className="lp-hero-left">
          <div className="lp-eyebrow">Beauty & Cosmetics Intelligence</div>
          <h1 className="lp-hero-h1">
            Launch like you've<br />
            run ads for<br />
            <em>nine years</em>
          </h1>
          <p className="lp-hero-sub">
            NextGenAds layers 9 years of proprietary Beauty & Cosmetics benchmark data on your campaigns — so you know what works before you spend a single euro.
          </p>
          <div className="lp-hero-ctas">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>
              Request Early Access
              <ArrowRight size={14} strokeWidth={1.5} />
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/demo')}>
              View Live Demo
            </button>
          </div>
          <p className="lp-hero-note">No credit card required · Setup in 5 minutes</p>
        </div>

        {/* Right — dark tiles */}
        <div className="lp-hero-right">
          <div className="lp-hero-tiles">
            <HeroTile brand="Skincare Launch · ES" roas="5.2x" revenue="€7,500" spend="€1.4K" badge="AOV €140" />
            <HeroTile brand="Milano Collection · IT" roas="€7,300" revenue="€7,300" spend="€1.9K" />
            <HeroTile brand="Market Entry · DE" roas="€280" revenue="€280" spend="€1.1K" badge="New Account" />
            <HeroTile brand="Scaling Phase · NL" roas="-0.2x" revenue="vs bench" spend="€2.1K" />
          </div>
        </div>
      </section>

      {/* ════ STATS BAR ════ */}
      <section className="lp-stats">
        {[
          { num: '9yr',   lbl: 'Benchmark Dataset' },
          { num: '500%',  lbl: 'Avg ROAS Improvement' },
          { num: '€100+', lbl: 'Average AOV' },
          { num: '3',     lbl: 'AI Models Active' },
        ].map(({ num, lbl }) => (
          <div key={lbl} className="lp-stat">
            <div className="lp-stat-num">{num}</div>
            <div className="lp-stat-lbl">{lbl}</div>
          </div>
        ))}
      </section>

      {/* ════ CAMPAIGN SHOWCASE ════ */}
      <section className="lp-section" id="benchmarks">
        <div className="lp-sh-header">
          <div className="lp-eyebrow-light">Real Results</div>
          <h2 className="lp-sh-title">
            Campaigns built on<br /><em>benchmark intelligence</em>
          </h2>
          <p className="lp-sh-sub">
            Real campaigns powered by 9 years of Beauty & Cosmetics data — not guesswork, not generic advice.
          </p>
        </div>
        <div className="lp-cc-grid">
          <CampaignCard flag="🇪🇸" brand="Luxury Skincare Launch" category="Skincare · Spain" roas="5.8x" revenue="€7.5K" spend="€1.3K" tag="AOV-FIRST FUNNEL" />
          <CampaignCard flag="🇮🇹" brand="Cosmetic Collection" category="Cosmetics · Italy" roas="3.8x" revenue="€4.2K" spend="€1.1K" tag="BRAND FIRST" />
          <CampaignCard flag="🇩🇪" brand="DE Market Entry" category="Anti-aging · Germany" roas="4.4x" revenue="€3.4K" spend="€800" tag="BENCHMARK TO LAUNCH" />
        </div>
      </section>

      {/* ════ DIFFERENTIATORS (dark) ════ */}
      <section className="lp-diff" id="platform-features">
        <div className="lp-diff-inner">
          <div className="lp-eyebrow-dark" style={{ justifyContent: 'center' }}>What sets us apart</div>
          <h2 className="lp-diff-title">
            Not just your data.<br /><em>Nine years of ours.</em>
          </h2>
          <div className="lp-diff-grid">
            <DiffCard icon={<BarChart3 size={16} strokeWidth={1.5} />} title="Benchmark Intelligence" desc="Compare your ROAS, CAC, and CPM against 847 Beauty brands in real-time — not just your own history." />
            <DiffCard icon={<Zap size={16} strokeWidth={1.5} />} title="Cold-Start Solved" desc="New account? Get recommendations immediately as if you had 9 years of data. No learning phase wasted." />
            <DiffCard icon={<Target size={16} strokeWidth={1.5} />} title="Full Funnel Stack" desc="Meta → Google → Klaviyo. The complete multi-channel strategy for your exact AOV bracket." />
            <DiffCard icon={<Shield size={16} strokeWidth={1.5} />} title="Human Approved" desc="AI recommendations, human execution. Every action requires your approval before anything runs." />
            <DiffCard icon={<Globe size={16} strokeWidth={1.5} />} title="Market Intelligence" desc="Spain, Germany, Italy, Netherlands — market-specific insights built from real performance data." />
            <DiffCard icon={<Users size={16} strokeWidth={1.5} />} title="AOV-First Logic" desc="€80 vs €300 AOV need completely different funnel strategies. We prescribe the right one automatically." />
          </div>
        </div>
        <div className="lp-diff-separator">NextGenAds · Benchmark · your data</div>
      </section>

      {/* ════ TESTIMONIALS ════ */}
      <section className="lp-testi-section">
        <div className="lp-eyebrow-light" style={{ marginBottom: 10 }}>What beauty brands are saying</div>
        <h2 className="lp-testi-title">
          What beauty brands<br /><em>are saying</em>
        </h2>
        <div className="lp-testi-grid">
          <Testimonial
            initials="SM" name="Sofia M." role="CMO, Skincare Brand · Spain"
            quote="I launched knowing NextGenAds had benchmark data from similar skincare brands in the ES market. The funnel they prescribed worked from day one — no wasted spend."
            roas="5.8x" />
          <Testimonial
            initials="CR" name="Chiara R." role="Founder, Cosmetics Italia"
            quote="I was running Trademark campaigns on a €200 AOV product. NextGenAds told me exactly why it wasn't working and fixed it in 24 hours."
            roas="3.8x" />
          <Testimonial
            initials="AK" name="Anna K." role="Media Buyer, Anti-aging · DE"
            quote="The market-specific benchmarks for Germany completely recalibrated our EU expansion. For every single euro for the market."
            roas="4.4x" />
        </div>
      </section>

      {/* ════ CTA + AUTH ════ */}
      <section className="lp-bottom">
        {/* Left — dark editorial */}
        <div className="lp-bottom-left">
          <div className="lp-eyebrow-dark" style={{ marginBottom: 16 }}>Early Access</div>
          <h2 className="lp-bottom-title">
            Intelligence built for brands<br />that build <em>iconic beauty</em>
          </h2>
          <p className="lp-bottom-sub">
            Connect your Meta, Google and Klaviyo accounts. Get brand-level results and recommendations in minutes.
          </p>
          <div className="lp-bottom-stats">
            {[
              { n: '9yr',  l: 'Data' },
              { n: '500%', l: 'ROI' },
              { n: '5',    l: 'Min setup' },
              { n: 'EU',   l: 'Focused' },
            ].map(({ n, l }) => (
              <div key={l} className="lp-bs">
                <div className="lp-bs-num">{n}</div>
                <div className="lp-bs-lbl">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — cream auth panel */}
        <div className="lp-bottom-right">
          <div className="lp-auth-box">
            <div className="lp-auth-eyebrow">Early Access</div>
            <h3 className="lp-auth-title">Sign in</h3>
            <p className="lp-auth-sub">Connect your intelligence dashboard</p>

            <button className="lp-google-btn" onClick={handleGoogle}>
              <Globe size={14} strokeWidth={1.5} />
              Continue with Google
            </button>

            <div className="lp-auth-or"><span>or</span></div>

            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@yourbrand.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {authError && (
                <div className="lp-auth-error">{authError}</div>
              )}
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={authLoading}>
                {authLoading ? 'Please wait…' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <button className="lp-auth-toggle" onClick={() => setAuthMode(m => m === 'signin' ? 'signup' : 'signin')}>
              {authMode === 'signin' ? "Don't have an account? Get started" : "Already have an account? Sign in"}
            </button>
            <p className="lp-auth-legal">By continuing you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">Next<em>Gen</em>Ads</div>
        <p className="lp-footer-copy">AI-powered campaign intelligence for Beauty & Cosmetics brands with high AOV.</p>
        <div className="lp-footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Contact</span>
        </div>
        <p className="lp-footer-copy" style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.5 }}>
          © 2024 NextGenAds · 9-year Beauty benchmark dataset
        </p>
      </footer>

      {/* ════ STYLES ════ */}
      <style>{`
        /* ─── Root ─── */
        .lp {
          font-family: var(--font-sans);
          background: var(--bg-primary);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ─── Nav ─── */
        .lp-nav {
          position: sticky; top: 0; z-index: 200;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 48px; height: 54px;
          background: rgba(253,246,240,0.94);
          backdrop-filter: blur(14px);
          border-bottom: 0.5px solid var(--border-light);
        }

        .lp-nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 18px; font-weight: 400;
          color: var(--text-primary);
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .lp-nav-logo em { font-style: italic; color: var(--rose-gold); }

        .lp-nav-center {
          display: flex; align-items: center; gap: 32px;
        }
        .lp-nav-center a {
          font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 300;
          letter-spacing: 0.06em;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color var(--transition);
        }
        .lp-nav-center a:hover { color: var(--text-primary); }

        .lp-hamburger {
          display: none;
          background: none; border: none;
          color: var(--text-primary);
          cursor: pointer; padding: 4px;
        }

        /* ─── Hero ─── */
        .lp-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: calc(100vh - 54px);
        }

        .lp-hero-left {
          padding: 72px 64px 72px 64px;
          display: flex; flex-direction: column;
          justify-content: center; gap: 0;
          background: var(--bg-primary);
        }

        .lp-eyebrow {
          font-family: 'Outfit', sans-serif;
          font-size: 10px; font-weight: 400;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--rose-gold);
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 20px;
        }
        .lp-eyebrow::before {
          content: ''; display: block;
          width: 24px; height: 0.5px;
          background: var(--rose-gold); flex-shrink: 0;
        }

        .lp-hero-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(36px, 4.5vw, 58px);
          font-weight: 400; line-height: 1.1;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin: 0 0 22px;
        }
        .lp-hero-h1 em { font-style: italic; color: var(--rose-gold); }

        .lp-hero-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 300;
          color: var(--text-secondary); line-height: 1.7;
          max-width: 420px; margin-bottom: 32px;
        }

        .lp-hero-ctas {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .lp-hero-note {
          font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 300;
          color: var(--text-hint); letter-spacing: 0.04em;
        }

        /* Hero right */
        .lp-hero-right {
          background: #2C1810;
          padding: 48px 40px;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }
        .lp-hero-right::before {
          content: '';
          position: absolute; top: -80px; right: -80px;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(196,131,106,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .lp-hero-tiles {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; width: 100%; max-width: 460px;
          position: relative; z-index: 1;
        }

        /* Hero tile */
        .ht-tile {
          background: linear-gradient(135deg, #3d2a1e 0%, #2C1810 100%);
          border: 0.5px solid rgba(196,131,106,0.12);
          border-radius: 6px; padding: 18px 16px;
          display: flex; flex-direction: column; gap: 10px;
          position: relative;
          transition: border-color 0.2s;
        }
        .ht-tile:nth-child(2n) { background: linear-gradient(135deg, #2C1810 0%, #1a0e08 100%); }
        .ht-tile:hover { border-color: rgba(196,131,106,0.3); }

        .ht-badge {
          position: absolute; top: 10px; right: 10px;
          font-family: 'DM Mono', monospace;
          font-size: 8px; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #C4836A; background: rgba(196,131,106,0.12);
          border: 0.5px solid rgba(196,131,106,0.25);
          padding: 2px 6px; border-radius: 2px;
        }

        .ht-roas {
          font-family: 'DM Mono', monospace;
          font-size: 26px; font-weight: 500;
          color: #C4836A; line-height: 1;
        }

        .ht-row { display: flex; gap: 16px; }
        .ht-val {
          font-family: 'DM Mono', monospace;
          font-size: 13px; font-weight: 500;
          color: #F5E6D8; line-height: 1;
        }
        .ht-val.dim { color: rgba(245,230,216,0.4); }

        .ht-lbl {
          font-family: 'Outfit', sans-serif;
          font-size: 8px; font-weight: 300;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(196,160,144,0.45); margin-top: 3px;
        }

        .ht-brand {
          font-family: 'Outfit', sans-serif;
          font-size: 10px; font-weight: 300;
          color: rgba(196,160,144,0.4);
          letter-spacing: 0.04em;
        }

        /* ─── Stats bar ─── */
        .lp-stats {
          background: #1a0e08;
          display: flex; align-items: stretch;
        }

        .lp-stat {
          flex: 1; padding: 30px 20px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 7px;
          border-right: 0.5px solid #2C1810;
        }
        .lp-stat:last-child { border-right: none; }

        .lp-stat-num {
          font-family: 'DM Mono', monospace;
          font-size: 30px; font-weight: 500;
          color: #C4836A; line-height: 1;
        }
        .lp-stat-lbl {
          font-family: 'Outfit', sans-serif;
          font-size: 9px; font-weight: 300;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: #6B4A38; text-align: center;
        }

        /* ─── Section common ─── */
        .lp-section {
          padding: 80px 80px;
          background: var(--bg-primary);
        }

        .lp-sh-header { margin-bottom: 44px; }

        .lp-eyebrow-light {
          font-family: 'Outfit', sans-serif;
          font-size: 10px; font-weight: 400;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--text-muted);
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 10px;
        }
        .lp-eyebrow-light::before {
          content: ''; width: 20px; height: 0.5px;
          background: var(--text-hint); flex-shrink: 0;
        }

        .lp-sh-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3.5vw, 44px);
          font-weight: 400; line-height: 1.15;
          color: var(--text-primary); margin-bottom: 14px;
        }
        .lp-sh-title em { font-style: italic; color: var(--rose-gold); }

        .lp-sh-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 300;
          color: var(--text-secondary); line-height: 1.65;
          max-width: 500px;
        }

        /* ─── Campaign cards grid ─── */
        .lp-cc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .cc-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: 8px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .cc-card:hover { box-shadow: var(--shadow); border-color: var(--rose-gold-pale); }

        .cc-image {
          height: 140px;
          background: linear-gradient(135deg, #C4836A 0%, #8B5A42 40%, #2C1810 100%);
          position: relative; overflow: hidden;
        }
        .cc-card:nth-child(2) .cc-image {
          background: linear-gradient(135deg, #8B5A42 0%, #5d3520 40%, #2C1810 100%);
        }
        .cc-card:nth-child(3) .cc-image {
          background: linear-gradient(135deg, #6B4030 0%, #3d2a1e 40%, #1a0e08 100%);
        }
        .cc-image-inner {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.3) 100%);
        }
        .cc-tag {
          position: absolute; bottom: 10px; right: 10px;
          font-family: 'DM Mono', monospace;
          font-size: 8px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(245,230,216,0.8);
          background: rgba(0,0,0,0.35);
          border: 0.5px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(4px);
          padding: 3px 7px; border-radius: 2px;
        }

        .cc-body { padding: 18px; display: flex; flex-direction: column; gap: 10px; }

        .cc-flag-row {
          display: flex; align-items: center; gap: 6px;
          font-size: 16px;
        }
        .cc-cat {
          font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 300; color: var(--text-muted);
        }

        .cc-brand {
          font-family: 'Playfair Display', serif;
          font-size: 16px; font-weight: 400; color: var(--text-primary);
        }

        .cc-metrics {
          display: flex; gap: 18px;
          padding: 10px 0;
          border-top: 0.5px solid var(--border-light);
          border-bottom: 0.5px solid var(--border-light);
        }

        .cc-mval {
          font-family: 'DM Mono', monospace;
          font-size: 14px; font-weight: 500; color: var(--text-primary);
        }
        .cc-mval.dim { color: var(--text-muted); }

        .cc-mlbl {
          font-family: 'Outfit', sans-serif;
          font-size: 9px; font-weight: 300;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--text-hint); margin-top: 3px;
        }

        .cc-cta-row { display: flex; align-items: center; }
        .cc-benchmark-tag {
          font-family: 'DM Mono', monospace;
          font-size: 10px; font-weight: 500;
          color: var(--success);
          display: flex; align-items: center; gap: 4px;
        }

        /* ─── Differentiators ─── */
        .lp-diff {
          background: #2C1810;
          padding: 80px 80px 0;
        }
        .lp-diff-inner {
          display: flex; flex-direction: column; align-items: center;
          gap: 0;
        }

        .lp-eyebrow-dark {
          font-family: 'Outfit', sans-serif;
          font-size: 10px; font-weight: 400;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--rose-gold);
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 16px;
        }
        .lp-eyebrow-dark::before {
          content: ''; width: 20px; height: 0.5px;
          background: var(--rose-gold); flex-shrink: 0;
        }

        .lp-diff-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3.5vw, 44px);
          font-weight: 400; line-height: 1.15;
          color: #F5E6D8; text-align: center;
          margin-bottom: 52px;
        }
        .lp-diff-title em { font-style: italic; color: var(--rose-gold); }

        .lp-diff-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0; width: 100%;
          border: 0.5px solid #3d2a1e;
        }

        .dc-card {
          padding: 32px 28px;
          border-right: 0.5px solid #3d2a1e;
          border-bottom: 0.5px solid #3d2a1e;
          display: flex; flex-direction: column; gap: 12px;
          transition: background 0.2s;
        }
        .dc-card:hover { background: rgba(196,131,106,0.04); }
        .dc-card:nth-child(3),
        .dc-card:nth-child(6) { border-right: none; }
        .dc-card:nth-child(4),
        .dc-card:nth-child(5),
        .dc-card:nth-child(6) { border-bottom: none; }

        .dc-icon {
          width: 34px; height: 34px;
          background: rgba(196,131,106,0.1);
          border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          color: #C4836A;
        }
        .dc-title {
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 500; color: #F5E6D8;
        }
        .dc-desc {
          font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 300;
          color: #8B6050; line-height: 1.65;
        }

        .lp-diff-separator {
          font-family: 'DM Mono', monospace;
          font-size: 10px; font-weight: 400;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #4d3a2e;
          text-align: center;
          padding: 20px;
          border-top: 0.5px solid #3d2a1e;
          width: 100%; margin-top: 40px;
        }

        /* ─── Testimonials ─── */
        .lp-testi-section {
          padding: 80px 80px;
          background: var(--bg-primary);
        }

        .lp-testi-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3.5vw, 40px);
          font-weight: 400; line-height: 1.2;
          color: var(--text-primary); margin-bottom: 44px;
        }
        .lp-testi-title em { font-style: italic; color: var(--rose-gold); }

        .lp-testi-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .tt-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: 8px; padding: 24px;
          display: flex; flex-direction: column; gap: 16px;
          transition: box-shadow 0.2s;
        }
        .tt-card:hover { box-shadow: var(--shadow-sm); }

        .tt-header { display: flex; align-items: center; gap: 12px; }

        .tt-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: #2C1810;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 14px; font-weight: 400; color: #C4836A;
          flex-shrink: 0;
        }

        .tt-name {
          font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 500; color: var(--text-primary);
        }
        .tt-role {
          font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 300; color: var(--text-muted);
          margin-top: 1px;
        }

        .tt-roas {
          margin-left: auto;
          font-family: 'DM Mono', monospace;
          font-size: 13px; font-weight: 500;
          color: var(--rose-gold-dark);
          background: var(--rose-gold-light);
          border: 0.5px solid var(--border-rose);
          padding: 3px 9px; border-radius: 2px;
          flex-shrink: 0;
        }

        .tt-quote {
          font-family: 'Playfair Display', serif;
          font-style: italic; font-size: 14px; font-weight: 400;
          color: var(--text-secondary); line-height: 1.65;
        }

        /* ─── Bottom CTA + Auth ─── */
        .lp-bottom {
          display: grid; grid-template-columns: 1.1fr 0.9fr;
          min-height: 520px;
        }

        .lp-bottom-left {
          background: #2C1810;
          padding: 72px 64px;
          display: flex; flex-direction: column;
          justify-content: center; gap: 0;
          position: relative; overflow: hidden;
        }
        .lp-bottom-left::before {
          content: '';
          position: absolute; bottom: -80px; left: -80px;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(196,131,106,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        .lp-bottom-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(24px, 3vw, 38px);
          font-weight: 400; line-height: 1.2; color: #F5E6D8;
          margin-bottom: 16px;
          position: relative; z-index: 1;
        }
        .lp-bottom-title em { font-style: italic; color: #C4836A; }

        .lp-bottom-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 300; color: #8B6050;
          line-height: 1.65; max-width: 380px;
          margin-bottom: 36px; position: relative; z-index: 1;
        }

        .lp-bottom-stats {
          display: flex; gap: 32px; flex-wrap: wrap;
          position: relative; z-index: 1;
        }

        .lp-bs { display: flex; flex-direction: column; gap: 4px; }
        .lp-bs-num {
          font-family: 'DM Mono', monospace;
          font-size: 22px; font-weight: 500; color: #F5E6D8; line-height: 1;
        }
        .lp-bs-lbl {
          font-family: 'Outfit', sans-serif;
          font-size: 9px; font-weight: 300;
          letter-spacing: 0.14em; text-transform: uppercase; color: #7A5A48;
        }

        .lp-bottom-right {
          background: var(--bg-primary);
          display: flex; align-items: center; justify-content: center;
          padding: 60px 40px;
        }

        .lp-auth-box {
          width: 100%; max-width: 360px;
          display: flex; flex-direction: column; gap: 16px;
        }

        .lp-auth-eyebrow {
          font-family: 'Outfit', sans-serif;
          font-size: 9px; font-weight: 400;
          letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--rose-gold);
          display: flex; align-items: center; gap: 8px;
        }
        .lp-auth-eyebrow::before {
          content: ''; width: 16px; height: 0.5px;
          background: var(--rose-gold);
        }

        .lp-auth-title {
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 400; color: var(--text-primary);
        }

        .lp-auth-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 300; color: var(--text-muted);
          margin-top: -8px;
        }

        .lp-google-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 9px; width: 100%; padding: 11px 16px;
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 400; letter-spacing: 0.04em;
          color: var(--text-primary); cursor: pointer;
          transition: all var(--transition);
        }
        .lp-google-btn:hover {
          border-color: var(--rose-gold-pale);
          background: var(--bg-secondary);
        }

        .lp-auth-or {
          display: flex; align-items: center; gap: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px; color: var(--text-hint);
        }
        .lp-auth-or::before, .lp-auth-or::after {
          content: ''; flex: 1;
          height: 0.5px; background: var(--border-light);
        }

        .lp-auth-error {
          background: #FEE2E2;
          border: 0.5px solid rgba(239,68,68,0.2);
          border-radius: var(--radius);
          padding: 9px 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 300; color: #991B1B;
        }

        .lp-auth-toggle {
          background: none; border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 300;
          color: var(--rose-gold); cursor: pointer;
          text-align: center; text-decoration: underline;
          text-underline-offset: 2px;
          transition: color var(--transition);
        }
        .lp-auth-toggle:hover { color: var(--rose-gold-dark); }

        .lp-auth-legal {
          font-family: 'Outfit', sans-serif;
          font-size: 10px; font-weight: 300;
          color: var(--text-hint); text-align: center;
          line-height: 1.5; letter-spacing: 0.02em;
        }

        /* ─── Footer ─── */
        .lp-footer {
          background: #1a0e08;
          padding: 40px 80px;
          display: flex; flex-direction: column;
          align-items: center; gap: 8px; text-align: center;
        }

        .lp-footer-logo {
          font-family: 'Playfair Display', serif;
          font-size: 16px; font-weight: 400;
          color: #C4A090; letter-spacing: 0.06em;
        }
        .lp-footer-logo em { font-style: italic; color: #C4836A; }

        .lp-footer-copy {
          font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 300; color: #7A5A48;
          letter-spacing: 0.04em; max-width: 400px; line-height: 1.5;
        }

        .lp-footer-links {
          display: flex; gap: 24px; margin-top: 6px;
        }
        .lp-footer-links span {
          font-family: 'Outfit', sans-serif;
          font-size: 10px; font-weight: 300;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #7A5A48; cursor: pointer;
          transition: color var(--transition);
        }
        .lp-footer-links span:hover { color: #C4A090; }

        /* ════════════════════════════════════════
           RESPONSIVE — Tablet (≤ 1100px)
        ════════════════════════════════════════ */
        @media (max-width: 1100px) {
          .lp-nav { padding: 0 28px; }
          .lp-nav-center { display: none; flex-direction: column; position: fixed;
            top: 54px; left: 0; right: 0; background: var(--bg-primary);
            border-bottom: 0.5px solid var(--border-light);
            padding: 20px 28px; gap: 16px; z-index: 190;
            box-shadow: var(--shadow-lg);
          }
          .lp-nav-center.open { display: flex; }
          .lp-nav-center a { font-size: 14px; }
          .lp-hamburger { display: flex; }

          .lp-hero { grid-template-columns: 1fr; }
          .lp-hero-left { padding: 60px 40px; }
          .lp-hero-right {
            display: grid; grid-template-columns: 1fr;
            padding: 40px 40px;
          }
          .lp-hero-tiles { max-width: 100%; }

          .lp-stats { flex-wrap: wrap; }
          .lp-stat { flex: 0 0 50%; border-right: none; border-bottom: 0.5px solid #2C1810; padding: 24px; }
          .lp-stat:nth-child(odd) { border-right: 0.5px solid #2C1810; }
          .lp-stat:last-child, .lp-stat:nth-last-child(2):nth-child(odd) { border-bottom: none; }

          .lp-section { padding: 60px 40px; }
          .lp-cc-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-cc-grid .cc-card:last-child { grid-column: 1 / -1; }

          .lp-diff { padding: 60px 40px 0; }
          .lp-diff-grid { grid-template-columns: repeat(2, 1fr); }
          .dc-card:nth-child(2n) { border-right: none; }
          .dc-card:nth-child(3),
          .dc-card:nth-child(4),
          .dc-card:nth-child(6) { border-right: none; }
          .dc-card:nth-child(3) { border-right: 0.5px solid #3d2a1e; }
          .dc-card:nth-child(4),
          .dc-card:nth-child(5) { border-bottom: 0.5px solid #3d2a1e; }
          .dc-card:nth-child(5) { border-right: 0.5px solid #3d2a1e; }

          .lp-testi-section { padding: 60px 40px; }
          .lp-testi-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-testi-grid .tt-card:last-child { grid-column: 1 / -1; }

          .lp-bottom { grid-template-columns: 1fr; }
          .lp-bottom-left { padding: 60px 40px; }
          .lp-bottom-right { padding: 48px 40px; }

          .lp-footer { padding: 40px 40px; }
        }

        /* ════════════════════════════════════════
           RESPONSIVE — Mobile (≤ 768px)
        ════════════════════════════════════════ */
        @media (max-width: 768px) {
          .lp-nav { padding: 0 20px; }

          .lp-hero-left { padding: 48px 20px; }
          .lp-hero-h1 { font-size: 34px; }
          .lp-hero-sub { font-size: 13px; }
          .lp-hero-ctas { flex-direction: column; }
          .lp-hero-ctas .btn { width: 100%; justify-content: center; }

          .lp-hero-right { padding: 32px 20px; }
          .lp-hero-tiles { grid-template-columns: 1fr 1fr; gap: 8px; }

          .lp-stat { flex: 0 0 100%; border-right: none !important; }

          .lp-section { padding: 48px 20px; }
          .lp-cc-grid { grid-template-columns: 1fr; }
          .lp-cc-grid .cc-card:last-child { grid-column: auto; }

          .lp-diff { padding: 48px 20px 0; }
          .lp-diff-grid { grid-template-columns: 1fr; }
          .dc-card { border-right: none !important; }
          .dc-card:not(:last-child) { border-bottom: 0.5px solid #3d2a1e !important; }

          .lp-testi-section { padding: 48px 20px; }
          .lp-testi-grid { grid-template-columns: 1fr; }
          .lp-testi-grid .tt-card:last-child { grid-column: auto; }

          .lp-bottom-left { padding: 48px 20px; }
          .lp-bottom-right { padding: 40px 20px; }
          .lp-bottom-stats { gap: 20px; }

          .lp-footer { padding: 32px 20px; }
          .lp-footer-links { flex-direction: column; gap: 12px; align-items: center; }
        }

        /* ════════════════════════════════════════
           RESPONSIVE — Small mobile (≤ 390px)
        ════════════════════════════════════════ */
        @media (max-width: 390px) {
          .lp-hero-tiles { grid-template-columns: 1fr; }
          .ht-tile { padding: 14px 12px; }
          .lp-hero-h1 { font-size: 30px; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
