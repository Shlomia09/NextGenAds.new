import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
   NextAdsGen — Cinematic Landing Page
   Design-system: §56-58 (business model), reference: nextadsgen-landing-cinematic-v2.html
   Rules:
   • No "free" / "trial" anywhere — only "Get started"
   • 30-day money-back guarantee (exact, not 60 days)
   • Performance numbers (−38%, ×3) = placeholder, marked [PLACEHOLDER]
   ───────────────────────────────────────────────────────────── */

// ── Count-up animation ────────────────────────────────────────
function countUp(el: HTMLElement) {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  const end  = parseFloat(el.dataset.count ?? '0');
  const dec  = +(el.dataset.dec  ?? '0');
  const pre  = el.dataset.prefix  ?? '';
  const suf  = el.dataset.suffix  ?? '';
  const dur  = 1400;
  const t0   = performance.now();
  const tick = (t: number) => {
    const p   = Math.min((t - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val  = (end * ease).toFixed(dec);
    el.textContent = pre + (dec ? val : Math.round(+val).toLocaleString()) + suf;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export default function Landing() {
  const navigate   = useNavigate();
  const navRef     = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  /* Nav scroll effect */
  useEffect(() => {
    const onScroll = () => {
      if (navRef.current)
        navRef.current.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Scroll-reveal via IntersectionObserver */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          (e.target as HTMLElement).querySelectorAll<HTMLElement>('[data-count]')
            .forEach(countUp);
        }
      }),
      { threshold: 0.2 },
    );
    document.querySelectorAll<HTMLElement>('.reveal')
      .forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Hero count-up fires 900 ms after page load */
  useEffect(() => {
    const t = setTimeout(() => {
      previewRef.current?.querySelectorAll<HTMLElement>('[data-count]')
        .forEach(countUp);
    }, 900);
    return () => clearTimeout(t);
  }, []);

  const handleGetStarted = () => navigate('/login');
  const handleHowItWorks = () => {
    document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* ── Inline CSS (matches reference exactly) ──────────── */}
      <style>{`
        :root {
          --bg:#0B0A09;--bg2:#120F0D;--surface:#1A1614;--border:#2A2420;
          --text:#F4EEE8;--text-2:#A39A91;--text-3:#6B635B;
          --accent:#E3A88E;--accent-deep:#C97B5E;--accent-soft:rgba(227,168,142,0.12);
          --green:#6BBF8A;
          --font-display:'Fraunces',serif;
          --font-ui:'Inter',sans-serif;
          --font-mono:'JetBrains Mono',monospace;
        }
        .lp-root { background:var(--bg); color:var(--text); font-family:var(--font-ui);
                   -webkit-font-smoothing:antialiased; overflow-x:hidden; }
        .lp-root *{ box-sizing:border-box; margin:0; padding:0; }
        .lp-root ::selection{ background:var(--accent); color:#2A1A12; }

        /* ── NAV ─────────────────────────────────────────────── */
        .lp-nav {
          position:fixed;top:0;left:0;right:0;z-index:100;
          display:flex;align-items:center;justify-content:space-between;
          padding:20px 48px;transition:.4s;backdrop-filter:blur(0px);
        }
        .lp-nav.scrolled {
          background:rgba(11,10,9,0.72);backdrop-filter:blur(16px);
          border-bottom:1px solid var(--border);padding:14px 48px;
        }
        .lp-logo { display:flex;align-items:center;gap:11px;text-decoration:none; }
        .lp-logo-mark {
          width:36px;height:36px;border-radius:10px;
          background:linear-gradient(135deg,#E3A88E,#C97B5E);
          display:flex;align-items:center;justify-content:center;
          color:#2A1A12;font-family:var(--font-display);font-weight:600;font-size:19px;
          box-shadow:0 4px 16px rgba(201,123,94,0.4);flex-shrink:0;
        }
        .lp-logo-name { font-size:18px;font-weight:500;letter-spacing:.2px;color:var(--text); }
        .lp-logo-name em { color:var(--accent);font-style:normal; }
        .lp-nav-links { display:flex;align-items:center;gap:34px; }
        .lp-nav-links a { color:var(--text-2);text-decoration:none;font-size:14px;transition:.2s; }
        .lp-nav-links a:hover { color:var(--text); }
        .lp-nav-cta {
          background:var(--accent);color:#2A1A12;padding:10px 20px;
          border-radius:30px;font-size:14px;font-weight:500;text-decoration:none;
          transition:.2s;cursor:pointer;border:none;
        }
        .lp-nav-cta:hover { background:var(--accent-deep);transform:translateY(-1px); }

        /* ── HERO ─────────────────────────────────────────────── */
        .lp-hero {
          min-height:100vh;display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          text-align:center;position:relative;
          padding:120px 24px 80px;overflow:hidden;
        }

        /* ── VIDEO SLOT (commented out — uncomment to enable) ──
           .lp-hero-media { position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none; }
           .lp-hero-media video { width:100%;height:100%;object-fit:cover;opacity:.55; }
           .lp-hero-media::after { content:"";position:absolute;inset:0;
             background:radial-gradient(circle at 50% 38%,transparent,rgba(11,10,9,0.55) 70%),
                        linear-gradient(180deg,rgba(11,10,9,0.4),rgba(11,10,9,0.85)); }
        ─────────────────────────────────────────────────────── */

        /* Default: animated golden glow */
        .lp-hero-glow {
          position:absolute;width:1200px;height:1200px;border-radius:50%;
          background:radial-gradient(circle,rgba(227,168,142,0.20),rgba(201,123,94,0.08) 40%,transparent 64%);
          top:-46%;left:50%;transform:translateX(-50%);pointer-events:none;
          animation:lp-breathe 9s ease-in-out infinite;z-index:1;
        }
        .lp-hero-glow::after {
          content:"";position:absolute;inset:0;border-radius:50%;
          background:radial-gradient(circle at 60% 60%,rgba(214,170,120,0.12),transparent 55%);
        }
        .lp-hero-grain {
          position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.5;
          background-image:
            radial-gradient(1px 1px at 20% 30%,rgba(227,168,142,.5),transparent),
            radial-gradient(1px 1px at 70% 20%,rgba(227,168,142,.4),transparent),
            radial-gradient(1px 1px at 40% 70%,rgba(214,170,120,.5),transparent),
            radial-gradient(1px 1px at 85% 60%,rgba(227,168,142,.35),transparent),
            radial-gradient(1px 1px at 55% 45%,rgba(227,168,142,.45),transparent);
          animation:lp-twinkle 6s ease-in-out infinite;
        }
        @keyframes lp-twinkle { 0%,100%{opacity:.35;} 50%{opacity:.7;} }
        @keyframes lp-breathe {
          0%,100%{opacity:.7;transform:translateX(-50%) scale(1);}
          50%{opacity:1;transform:translateX(-50%) scale(1.08);}
        }

        .lp-badge {
          display:inline-flex;align-items:center;gap:8px;
          border:1px solid var(--border);background:rgba(26,22,20,0.6);
          padding:8px 16px;border-radius:30px;font-size:12.5px;color:var(--text-2);
          margin-bottom:30px;opacity:0;animation:lp-rise .9s .1s forwards;
          position:relative;z-index:2;
        }
        .lp-badge .pulse-dot {
          width:7px;height:7px;border-radius:50%;background:var(--green);
          box-shadow:0 0 0 3px rgba(107,191,138,0.2);flex-shrink:0;
        }

        .lp-hero h1 {
          font-family:var(--font-display);font-weight:500;
          font-size:clamp(42px,7vw,86px);line-height:1.02;letter-spacing:-2px;
          max-width:14ch;opacity:0;animation:lp-rise 1s .25s forwards;
          position:relative;z-index:2;
        }
        .lp-hero h1 em { font-style:italic;color:var(--accent); }
        .lp-hero p {
          font-size:clamp(16px,2vw,20px);color:var(--text-2);max-width:52ch;
          margin:28px auto 0;line-height:1.6;
          opacity:0;animation:lp-rise 1s .45s forwards;
          position:relative;z-index:2;
        }
        .lp-actions {
          display:flex;gap:14px;margin-top:40px;
          opacity:0;animation:lp-rise 1s .65s forwards;
          flex-wrap:wrap;justify-content:center;position:relative;z-index:2;
        }
        .btn-primary {
          background:var(--accent);color:#2A1A12;padding:15px 30px;
          border-radius:30px;font-size:15px;font-weight:500;
          text-decoration:none;transition:.2s;
          display:inline-flex;align-items:center;gap:8px;
          border:none;cursor:pointer;
        }
        .btn-primary:hover {
          background:var(--accent-deep);transform:translateY(-2px);
          box-shadow:0 12px 30px rgba(201,123,94,0.35);
        }
        .btn-ghost {
          border:1px solid var(--border);color:var(--text);padding:15px 30px;
          border-radius:30px;font-size:15px;font-weight:500;
          text-decoration:none;transition:.2s;
          display:inline-flex;align-items:center;gap:8px;
          background:none;cursor:pointer;
        }
        .btn-ghost:hover { background:var(--surface);border-color:var(--accent); }

        @keyframes lp-rise { to{opacity:1;transform:translateY(0);} }
        .lp-badge,.lp-hero h1,.lp-hero p,.lp-actions { transform:translateY(24px); }

        .lp-guarantee {
          display:flex;align-items:center;gap:8px;justify-content:center;
          color:var(--text-3);font-size:12.5px;margin-top:20px;
          opacity:0;animation:lp-rise 1s .78s forwards;
          transform:translateY(16px);position:relative;z-index:2;
        }
        .lp-guarantee svg { color:var(--accent);flex-shrink:0; }

        /* ── FLOATING DASHBOARD PREVIEW ──────────────────────── */
        .lp-preview {
          margin-top:64px;width:min(1000px,92vw);border-radius:18px;
          border:1px solid var(--border);
          background:linear-gradient(180deg,var(--surface),var(--bg2));
          box-shadow:0 40px 100px rgba(0,0,0,0.6);overflow:hidden;
          opacity:0;animation:lp-rise 1.2s .85s forwards;
          position:relative;z-index:2;
        }
        .lp-hp-bar { display:flex;gap:7px;padding:14px 18px;border-bottom:1px solid var(--border); }
        .lp-hp-bar i { width:11px;height:11px;border-radius:50%;background:var(--border); }
        .lp-hp-body { padding:26px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px; }
        .lp-kpi { background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:left; }
        .lp-kpi .l { font-size:9px;letter-spacing:1px;color:var(--text-3); }
        .lp-kpi .v { font-family:var(--font-mono);font-size:22px;font-weight:500;margin-top:7px; }
        .lp-kpi .v.a { color:var(--accent); }
        .lp-kpi .v.g { color:var(--green); }
        .lp-hp-chart {
          grid-column:1/-1;height:120px;background:var(--bg2);
          border:1px solid var(--border);border-radius:12px;
          position:relative;overflow:hidden;
        }
        .lp-hp-chart svg { position:absolute;inset:0;width:100%;height:100%; }

        .lp-scroll-hint {
          position:absolute;bottom:30px;left:50%;transform:translateX(-50%);
          color:var(--text-3);font-size:11px;letter-spacing:2px;
          display:flex;flex-direction:column;align-items:center;gap:9px;
          opacity:0;animation:lp-rise 1s 1.3s forwards;z-index:2;
        }
        .lp-mouse {
          width:22px;height:34px;border:1.5px solid var(--text-3);border-radius:12px;position:relative;
        }
        .lp-mouse::after {
          content:"";position:absolute;top:6px;left:50%;transform:translateX(-50%);
          width:3px;height:6px;border-radius:3px;background:var(--accent);
          animation:lp-scroll 1.6s infinite;
        }
        @keyframes lp-scroll {
          0%{opacity:0;top:6px;} 40%{opacity:1;} 80%{opacity:0;top:16px;} 100%{opacity:0;}
        }

        /* ── REVEAL ──────────────────────────────────────────── */
        .reveal {
          opacity:0;transform:translateY(40px);
          transition:opacity .9s cubic-bezier(.2,.7,.3,1),transform .9s cubic-bezier(.2,.7,.3,1);
        }
        .reveal.in { opacity:1;transform:none; }
        .reveal.d1 { transition-delay:.1s; }
        .reveal.d2 { transition-delay:.2s; }
        .reveal.d3 { transition-delay:.3s; }

        /* ── SECTIONS ─────────────────────────────────────────── */
        .lp-section { padding:120px 48px;max-width:1200px;margin:0 auto; }
        .eyebrow {
          font-size:12px;letter-spacing:3px;color:var(--accent);text-transform:uppercase;
          margin-bottom:18px;display:flex;align-items:center;gap:10px;justify-content:center;
        }
        .eyebrow::before,.eyebrow::after { content:"";width:30px;height:1px;background:var(--border); }
        .section-title {
          font-family:var(--font-display);font-weight:500;
          font-size:clamp(32px,5vw,56px);line-height:1.08;letter-spacing:-1px;
          text-align:center;max-width:18ch;margin:0 auto;
        }
        .section-sub {
          color:var(--text-2);font-size:17px;text-align:center;
          max-width:54ch;margin:22px auto 0;line-height:1.6;
        }

        /* ── STATS ───────────────────────────────────────────── */
        .lp-stats {
          background:var(--bg2);border-top:1px solid var(--border);
          border-bottom:1px solid var(--border);padding:80px 48px;
        }
        .lp-stats-inner {
          max-width:1100px;margin:0 auto;
          display:grid;grid-template-columns:repeat(4,1fr);gap:30px;text-align:center;
        }
        .lp-stat .num {
          font-family:var(--font-display);font-weight:500;
          font-size:clamp(38px,5vw,60px);color:var(--accent);letter-spacing:-1.5px;line-height:1;
        }
        .lp-stat .lbl { color:var(--text-2);font-size:13.5px;margin-top:12px;letter-spacing:.3px; }

        /* ── FEATURES ────────────────────────────────────────── */
        .feat-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:64px; }
        .feat {
          background:var(--surface);border:1px solid var(--border);border-radius:18px;
          padding:30px;transition:.3s;position:relative;overflow:hidden;
        }
        .feat:hover { transform:translateY(-6px);border-color:var(--accent);box-shadow:0 24px 50px rgba(0,0,0,0.4); }
        .feat-ic {
          width:50px;height:50px;border-radius:13px;background:var(--accent-soft);
          display:flex;align-items:center;justify-content:center;
          color:var(--accent);font-size:24px;margin-bottom:20px;
        }
        .feat h3 { font-family:var(--font-display);font-size:21px;font-weight:500;margin-bottom:11px; }
        .feat p { color:var(--text-2);font-size:14.5px;line-height:1.65; }

        /* ── STEPS / SCROLLYTELLING ──────────────────────────── */
        .lp-steps { display:flex;flex-direction:column;gap:0;margin-top:60px; }
        .step-row {
          display:grid;grid-template-columns:1fr 1fr;gap:60px;
          align-items:center;padding:60px 0;border-top:1px solid var(--border);
        }
        .step-row:nth-child(even) .step-visual { order:-1; }
        .step-n { font-family:var(--font-mono);font-size:13px;color:var(--accent);margin-bottom:16px; }
        .step-row h3 {
          font-family:var(--font-display);font-size:clamp(26px,3.5vw,38px);
          font-weight:500;line-height:1.15;letter-spacing:-.5px;
        }
        .step-row p { color:var(--text-2);font-size:16px;line-height:1.65;margin-top:16px;max-width:42ch; }
        .step-visual {
          height:280px;border-radius:18px;border:1px solid var(--border);
          background:linear-gradient(160deg,var(--surface),var(--bg2));
          display:flex;align-items:center;justify-content:center;
          color:var(--accent);font-size:54px;position:relative;overflow:hidden;
          box-shadow:0 24px 60px rgba(0,0,0,0.35);
        }
        .step-visual::after {
          content:"";position:absolute;width:300px;height:300px;border-radius:50%;
          background:radial-gradient(circle,var(--accent-soft),transparent 65%);
          top:-30%;right:-20%;
        }

        /* ── FINAL CTA ───────────────────────────────────────── */
        .lp-cta-final { text-align:center;padding:140px 48px;position:relative;overflow:hidden; }
        .lp-cta-final .glow {
          position:absolute;width:900px;height:900px;border-radius:50%;
          background:radial-gradient(circle,rgba(227,168,142,0.13),transparent 60%);
          top:50%;left:50%;transform:translate(-50%,-50%);
        }
        .lp-cta-final h2 {
          font-family:var(--font-display);font-weight:500;
          font-size:clamp(34px,5.5vw,64px);letter-spacing:-1.5px;line-height:1.05;
          max-width:16ch;margin:0 auto;position:relative;
        }
        .lp-cta-final h2 em { font-style:italic;color:var(--accent); }
        .lp-cta-final p {
          color:var(--text-2);font-size:18px;margin:24px auto 36px;
          max-width:48ch;position:relative;
        }

        /* ── FOOTER ──────────────────────────────────────────── */
        .lp-footer {
          border-top:1px solid var(--border);padding:50px 48px;
          display:flex;justify-content:space-between;align-items:center;
          color:var(--text-3);font-size:13px;flex-wrap:wrap;gap:20px;
        }

        /* ── RESPONSIVE ──────────────────────────────────────── */
        @media(max-width:860px){
          .lp-nav,.lp-nav.scrolled{padding:14px 22px;}
          .lp-nav-links{display:none;}
          .lp-section{padding:80px 22px;}
          .lp-stats{padding:60px 22px;}
          .lp-stats-inner{grid-template-columns:repeat(2,1fr);gap:40px 20px;}
          .feat-grid{grid-template-columns:1fr;}
          .step-row{grid-template-columns:1fr;gap:30px;}
          .step-row:nth-child(even) .step-visual{order:0;}
          .lp-hp-body{grid-template-columns:repeat(2,1fr);}
          .lp-cta-final{padding:80px 22px;}
          .lp-footer{padding:36px 22px;flex-direction:column;text-align:center;}
        }
        @media(max-width:480px){
          .lp-actions{flex-direction:column;align-items:center;}
          .btn-primary,.btn-ghost{width:100%;justify-content:center;}
        }
      `}</style>

      <div className="lp-root">
        {/* ── GOOGLE FONTS ──────────────────────────────────── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,400;9..144,0,500;9..144,1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />

        {/* ── NAV ───────────────────────────────────────────── */}
        <nav ref={navRef} className="lp-nav">
          <a href="/" className="lp-logo">
            <div className="lp-logo-mark">N</div>
            <div className="lp-logo-name">NextAds<em>Gen</em></div>
          </a>
          <div className="lp-nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <button className="lp-nav-cta" onClick={handleGetStarted}>Get started</button>
          </div>
        </nav>

        {/* ── HERO ──────────────────────────────────────────── */}
        <header className="lp-hero">
          {/*
            ── VIDEO HERO SLOT (disabled — uncomment to activate) ──────────
            To go cinematic: uncomment the block below and point src to your
            beauty b-roll. Keep muted + loop + playsinline. Overlay is in CSS.
            <div className="lp-hero-media">
              <video autoPlay muted loop playsInline poster="hero-poster.jpg">
                <source src="hero.mp4" type="video/mp4" />
              </video>
            </div>
            ── END VIDEO SLOT ───────────────────────────────────────────────
          */}
          <div className="lp-hero-glow" />
          <div className="lp-hero-grain" />

          <div className="lp-badge">
            <span className="pulse-dot" />
            Trained on 9 years of beauty campaign data
          </div>

          <h1>Campaign intelligence for <em>beauty</em> brands</h1>

          <p>
            Upload a creative. AI writes the copy, launches to Meta &amp; Google,
            and optimizes your budget — around the clock.
          </p>

          <div className="lp-actions">
            <button className="btn-primary" onClick={handleGetStarted}>
              Get started <span style={{ fontSize: 17 }}>→</span>
            </button>
            <button className="btn-ghost" onClick={handleHowItWorks}>
              See how it works
            </button>
          </div>

          {/* §56-58: 30-day money-back guarantee — exact wording, no alterations */}
          <div className="lp-guarantee">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            30-day money-back guarantee — no risk to try it
          </div>

          {/* Floating dashboard preview */}
          <div className="lp-preview" ref={previewRef}>
            <div className="lp-hp-bar">
              <i /><i /><i />
            </div>
            <div className="lp-hp-body">
              <div className="lp-kpi">
                <div className="l">TOTAL SPEND</div>
                <div className="v a" data-count="7080" data-prefix="€">€0</div>
              </div>
              <div className="lp-kpi">
                <div className="l">LEADS</div>
                <div className="v g" data-count="745">0</div>
              </div>
              <div className="lp-kpi">
                <div className="l">AVG CPL</div>
                <div className="v" data-count="9.5" data-prefix="€" data-dec="2">€0</div>
              </div>
              <div className="lp-kpi">
                <div className="l">CTR</div>
                <div className="v" data-count="2.53" data-suffix="%" data-dec="2">0%</div>
              </div>
              <div className="lp-hp-chart">
                <svg viewBox="0 0 1000 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lpg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#E3A88E" stopOpacity="0.4"/>
                      <stop offset="1" stopColor="#E3A88E" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,95 C120,90 180,70 280,72 C400,74 460,40 580,45 C700,50 760,25 880,20 L1000,15 L1000,120 L0,120 Z" fill="url(#lpg)"/>
                  <path d="M0,95 C120,90 180,70 280,72 C400,74 460,40 580,45 C700,50 760,25 880,20 L1000,15" fill="none" stroke="#E3A88E" strokeWidth="2"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="lp-scroll-hint">
            <div className="lp-mouse" />
            SCROLL
          </div>
        </header>

        {/* ── STATS BAND ────────────────────────────────────────
            [PLACEHOLDER NUMBERS — need sign-off before going live]
            9 years = confirmed real
            38% / 24/7 / ×3 = placeholder, to be replaced with verified data
        ───────────────────────────────────────────────────────── */}
        <div className="lp-stats">
          <div className="lp-stats-inner">
            <div className="lp-stat reveal">
              <div className="num" data-count="9">0</div>
              <div className="lbl">Years of beauty benchmark data</div>
            </div>
            <div className="lp-stat reveal d1">
              {/* [PLACEHOLDER] −38% CPL — verify before launch */}
              <div className="num" data-count="38" data-suffix="%">0%</div>
              <div className="lbl">Average drop in cost-per-lead*</div>
            </div>
            <div className="lp-stat reveal d2">
              <div className="num" data-count="24" data-suffix="/7">0</div>
              <div className="lbl">Always-on budget optimization</div>
            </div>
            <div className="lp-stat reveal d3">
              {/* [PLACEHOLDER] ×3 faster — verify before launch */}
              <div className="num" data-count="3" data-prefix="×">×0</div>
              <div className="lbl">Faster campaign launches*</div>
            </div>
          </div>
        </div>

        {/* ── FEATURES ──────────────────────────────────────── */}
        <section className="lp-section" id="features">
          <div className="eyebrow reveal">What it does</div>
          <h2 className="section-title reveal d1">An entire ads team, in one platform</h2>
          <p className="section-sub reveal d2">
            From creative to copy to optimization — NextAdsGen runs the parts
            that used to take a team of specialists.
          </p>
          <div className="feat-grid">
            <div className="feat reveal">
              <div className="feat-ic">✦</div>
              <h3>AI copy that converts</h3>
              <p>Upload your creative and the engine writes headlines and copy tuned to your beauty audience, drawing on what actually converted.</p>
            </div>
            <div className="feat reveal d1">
              <div className="feat-ic">◎</div>
              <h3>Launch to Meta &amp; Google</h3>
              <p>Build once and publish directly to your connected ad accounts. No more juggling Ads Manager tabs.</p>
            </div>
            <div className="feat reveal d2">
              <div className="feat-ic">⟳</div>
              <h3>Always-on optimization</h3>
              <p>The engine watches your campaigns around the clock, shifting budget to winners and flagging fatigue before it costs you.</p>
            </div>
            <div className="feat reveal">
              <div className="feat-ic">◈</div>
              <h3>9-year benchmark</h3>
              <p>Every metric is judged against nearly a decade of real beauty &amp; clinic campaign data — so you always know what "good" is.</p>
            </div>
            <div className="feat reveal d1">
              <div className="feat-ic">◇</div>
              <h3>Intelligence chat</h3>
              <p>Ask anything — "why is my CPM rising?" — and get a real answer grounded in your data, not a generic tip.</p>
            </div>
            <div className="feat reveal d2">
              <div className="feat-ic">◊</div>
              <h3>Built for beauty</h3>
              <p>Not a generic dashboard. Every benchmark, audience and recommendation is calibrated for beauty &amp; aesthetics brands.</p>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS / SCROLLYTELLING ─────────────────── */}
        <section className="lp-section" id="how">
          <div className="eyebrow reveal">How it works</div>
          <h2 className="section-title reveal d1">Four steps from creative to conversions</h2>
          <div className="lp-steps">
            <div className="step-row">
              <div className="reveal">
                <div className="step-n">01</div>
                <h3>Upload your creative</h3>
                <p>Drop in an image or video. The engine reads it and understands what it's looking at.</p>
              </div>
              <div className="step-visual reveal d1">✦</div>
            </div>
            <div className="step-row">
              <div className="reveal">
                <div className="step-n">02</div>
                <h3>AI writes the campaign</h3>
                <p>Headlines, primary text, audience, budget — drafted for you, tuned to beauty buyers, ready to edit.</p>
              </div>
              <div className="step-visual reveal d1">✎</div>
            </div>
            <div className="step-row">
              <div className="reveal">
                <div className="step-n">03</div>
                <h3>Publish to your platform</h3>
                <p>One click pushes the campaign live to your connected Meta or Google account, in a safe paused state for final review.</p>
              </div>
              <div className="step-visual reveal d1">◎</div>
            </div>
            <div className="step-row">
              <div className="reveal">
                <div className="step-n">04</div>
                <h3>The engine optimizes</h3>
                <p>From there it runs itself — reallocating budget, catching fatigue, and reporting what it did while you slept.</p>
              </div>
              <div className="step-visual reveal d1">⟳</div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────── */}
        <section className="lp-cta-final" id="results">
          <div className="glow" />
          <h2 className="reveal">Your campaigns deserve an <em>intelligence engine</em></h2>
          <p className="reveal d1">Join the beauty brands running smarter campaigns with less effort.</p>
          <div className="reveal d2">
            <button
              className="btn-primary"
              style={{ display: 'inline-flex' }}
              onClick={handleGetStarted}
            >
              Get started <span style={{ fontSize: 17 }}>→</span>
            </button>
            {/* §56-58: Short form guarantee for final CTA */}
            <div className="lp-guarantee" style={{ opacity: 1, transform: 'none', animation: 'none', marginTop: 20 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              30-day money-back guarantee
            </div>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <footer className="lp-footer">
          <a href="/" className="lp-logo" style={{ textDecoration: 'none' }}>
            <div className="lp-logo-mark" style={{ width: 30, height: 30, fontSize: 16 }}>N</div>
            <div className="lp-logo-name" style={{ fontSize: 15 }}>NextAds<em>Gen</em></div>
          </a>
          <div>© 2026 NextAdsGen · Campaign Intelligence for Beauty</div>
        </footer>
      </div>
    </>
  );
}
