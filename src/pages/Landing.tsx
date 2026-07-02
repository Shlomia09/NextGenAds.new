import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
   NextAdsGen — Cinematic Landing Page
   Design-system: §56-58 (business model), §60 (hero wall + spotlight)
   Reference: nextadsgen-landing-home-v3.html
   Rules:
   • No "free" / "trial" anywhere — only "Get started"
   • 30-day money-back guarantee (exact, not 60 days)
   • All hotspot values marked [PLACEHOLDER] — §56, connect real data before launch
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

// ── Fixed hotspot definitions ─────────────────────────────────
// [PLACEHOLDER] — §56: connect to real per-creative data before launch.
// Never show fabricated numbers — remove hotspot if no real data available.
const HOTSPOTS = [
  { xPct: 11, yPct: 20, label: 'CTR',  val: '—'   },
  { xPct: 89, yPct: 17, label: 'CPC',  val: '—'   },
  { xPct:  7, yPct: 78, label: 'ROAS', val: '—'   },
  { xPct: 93, yPct: 76, label: 'CPM',  val: '—'   },
  { xPct: 17, yPct: 50, label: 'CVR',  val: '—'   },
  { xPct: 83, yPct: 48, label: 'CTR',  val: '—'   },
] as const;
// TODO: replace all '—' values with real data from Meta API / Supabase — see design-system §56

export default function Landing() {
  const navigate        = useNavigate();
  const navRef          = useRef<HTMLElement>(null);
  const previewRef      = useRef<HTMLDivElement>(null);
  const heroWrapperRef  = useRef<HTMLDivElement>(null);
  const wallRef         = useRef<HTMLDivElement>(null);
  const spotlightRef    = useRef<HTMLDivElement>(null);
  const vignetteRef     = useRef<HTMLDivElement>(null);

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

  /* ── Spotlight: cursor-following lantern with lerp (§60) ──── */
  useEffect(() => {
    const wrapper  = heroWrapperRef.current;
    const spotlight = spotlightRef.current;
    if (!wrapper || !spotlight) return;

    const stage = wrapper.querySelector<HTMLElement>('.lp-hero-stage');
    if (!stage) return;

    const hasHover     = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Touch / mobile fallback: ambient breathing glow centred on stage
    if (!hasHover) {
      spotlight.classList.add('ambient');
      if (reducedMotion) spotlight.style.animation = 'none';
      // Tap on hotspot toggles active class
      stage.querySelectorAll<HTMLElement>('.lp-hotspot').forEach((hs) => {
        hs.style.pointerEvents = 'auto';
        hs.addEventListener('click', () => hs.classList.toggle('active'));
      });
      return;
    }

    // prefers-reduced-motion: keep spotlight static, skip lerp
    if (reducedMotion) {
      spotlight.style.left = '50%';
      spotlight.style.top  = '42%';
      spotlight.style.transition = 'none';
      return;
    }

    let curX = window.innerWidth  * 0.5;
    let curY = window.innerHeight * 0.42;
    let tgtX = curX, tgtY = curY;
    let rafId: number;
    const LERP      = 0.14;
    const PROXIMITY = 95; // px — hotspot activation radius

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      curX = lerp(curX, tgtX, LERP);
      curY = lerp(curY, tgtY, LERP);
      spotlight.style.left = `${curX}px`;
      spotlight.style.top  = `${curY}px`;

      // Check proximity to each hotspot
      const rect = stage.getBoundingClientRect();
      HOTSPOTS.forEach((hs, i) => {
        const hx   = (hs.xPct / 100) * rect.width;
        const hy   = (hs.yPct / 100) * rect.height;
        const dist = Math.hypot(curX - hx, curY - hy);
        const el   = stage.querySelector<HTMLElement>(`.lp-hotspot[data-idx="${i}"]`);
        if (el) el.classList.toggle('active', dist < PROXIMITY);
      });

      rafId = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const rect = stage.getBoundingClientRect();
      tgtX = e.clientX - rect.left;
      tgtY = e.clientY - rect.top;
      spotlight.style.opacity = '1';
    };
    const onLeave = () => { spotlight.style.opacity = '0'; };

    rafId = requestAnimationFrame(tick);
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(rafId);
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  /* ── Scroll parallax: wall zoom + vignette fade (§60) ────── */
  useEffect(() => {
    const wrapper = heroWrapperRef.current;
    if (!wrapper) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return; // skip parallax for reduced-motion

    const onScroll = () => {
      const rect      = wrapper.getBoundingClientRect();
      const scrollable = wrapper.offsetHeight - window.innerHeight; // 200vh
      const progress  = Math.max(0, Math.min(1, -rect.top / scrollable));

      // Wall: scale 1.06 → 1.16 (§60)
      if (wallRef.current)
        wallRef.current.style.transform = `scale(${1.06 + 0.10 * progress})`;

      // Vignette: weakens gently as page scrolls (§60)
      if (vignetteRef.current)
        vignetteRef.current.style.opacity = String(1 - progress * 0.4);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleGetStarted = () => navigate('/login');
  const handleHowItWorks = () => {
    document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* ── Inline CSS ──────────────────────────────────────── */}
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

        /* ── HERO: Wall of Creatives + Spotlight (§60) ──────── */
        /* 300vh wrapper enables scroll parallax without scroll-jacking */
        .lp-hero-wrapper { position:relative; height:300vh; }
        .lp-hero-stage {
          position:sticky; top:0; height:100vh; min-height:640px;
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; text-align:center;
          padding:120px 24px 80px; overflow:hidden; isolation:isolate;
          cursor:none;
        }
        @media (hover:none),(pointer:coarse){ .lp-hero-stage{ cursor:auto; } }

        /* Layer 1 — wall image: very dark by default (§60) */
        .wall {
          position:absolute; inset:0;
          background:url('/assets/hero-wall.png') center/cover no-repeat;
          filter:brightness(0.46) saturate(0.9);
          transform:scale(1.06); transform-origin:center;
          will-change:transform;
        }

        /* Layer 2 — film grain texture (SVG data-URI, §60) */
        .grain {
          position:absolute; inset:0; z-index:1; pointer-events:none;
          opacity:.05; mix-blend-mode:overlay;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        /* Layer 3 — multi-layer vignette (§60 reference): keeps headline readable */
        .vignette {
          position:absolute; inset:0; z-index:2; pointer-events:none;
          background:
            radial-gradient(ellipse at 50% 44%, rgba(14,12,11,0.45) 0%, rgba(14,12,11,0.82) 62%, rgba(14,12,11,0.9) 100%),
            linear-gradient(to top, var(--bg) 0%, rgba(14,12,11,0.35) 26%, transparent 50%),
            linear-gradient(to bottom, rgba(14,12,11,0.7) 0%, transparent 22%);
          will-change:opacity;
        }

        /* Layer 4 — cursor spotlight: soft lantern, not a laser (§60) */
        .spotlight {
          position:absolute; z-index:3; pointer-events:none;
          width:460px; height:460px; border-radius:50%;
          background:radial-gradient(circle, rgba(227,168,142,0.36) 0%, transparent 65%);
          mix-blend-mode:screen; filter:blur(22px);
          transform:translate(-50%,-50%);
          left:50%; top:42%;
          opacity:0; transition:opacity .5s;
          will-change:left, top, opacity;
        }
        @keyframes lp-ambient-breathe {
          0%,100%{ opacity:.4; transform:translate(-50%,-50%) scale(1); }
          50%    { opacity:.6; transform:translate(-50%,-50%) scale(1.12); }
        }
        /* Mobile fallback: ambient breathing glow centred (§60) */
        .spotlight.ambient {
          animation:lp-ambient-breathe 6s ease-in-out infinite;
          opacity:.4;
        }
        @media (prefers-reduced-motion:reduce){
          .spotlight.ambient{ animation:none; opacity:.4; }
        }

        /* Layer 5 — hotspots (§60) */
        /* [PLACEHOLDER] — connect all values to real data before launch (§56) */
        .lp-hotspot {
          position:absolute; z-index:4;
          width:10px; height:10px; border-radius:50%;
          background:var(--accent); opacity:.45;
          pointer-events:none; cursor:default;
          transition:opacity .3s, box-shadow .3s;
        }
        .lp-hotspot.active {
          opacity:1;
          box-shadow:0 0 0 4px rgba(227,168,142,0.2), 0 0 12px rgba(227,168,142,0.4);
        }
        .lp-hotspot-bubble {
          position:absolute; bottom:calc(100% + 12px); left:50%;
          transform:translateX(-50%) translateY(8px);
          background:rgba(18,15,13,0.88); border:1px solid var(--border);
          backdrop-filter:blur(8px); border-radius:8px;
          padding:8px 12px; white-space:nowrap;
          opacity:0; transition:opacity .25s, transform .25s;
          pointer-events:none; box-shadow:0 8px 24px rgba(0,0,0,0.5);
        }
        .lp-hotspot-bubble .hs-label {
          color:var(--text-3); font-size:9px; letter-spacing:1.5px;
          font-family:var(--font-ui); text-transform:uppercase; display:block;
        }
        .lp-hotspot-bubble .hs-val {
          color:var(--accent); font-size:15px; font-weight:500;
          font-family:var(--font-mono);
        }
        .lp-hotspot.active .lp-hotspot-bubble {
          opacity:1; transform:translateX(-50%) translateY(0);
        }

        /* Layer 6 — hero content sits above all layers */
        .hero-inner {
          position:relative; z-index:5;
          display:flex; flex-direction:column; align-items:center; width:100%;
        }

        /* ── HERO CONTENT ───────────────────────────────────── */
        .lp-badge {
          display:inline-flex;align-items:center;gap:8px;
          border:1px solid var(--border);background:rgba(26,22,20,0.6);
          padding:8px 16px;border-radius:30px;font-size:12.5px;color:var(--text-2);
          margin-bottom:30px;opacity:0;animation:lp-rise .9s .1s forwards;
        }
        .lp-badge .pulse-dot {
          width:7px;height:7px;border-radius:50%;background:var(--green);
          box-shadow:0 0 0 3px rgba(107,191,138,0.2);flex-shrink:0;
        }

        .lp-hero-stage h1 {
          font-family:var(--font-display);font-weight:500;
          font-size:clamp(42px,7vw,86px);line-height:1.02;letter-spacing:-2px;
          max-width:14ch;opacity:0;animation:lp-rise 1s .25s forwards;
        }
        .lp-hero-stage h1 em { font-style:italic;color:var(--accent); }
        .lp-hero-stage p {
          font-size:clamp(16px,2vw,20px);color:var(--text-2);max-width:52ch;
          margin:28px auto 0;line-height:1.6;
          opacity:0;animation:lp-rise 1s .45s forwards;
        }
        .lp-actions {
          display:flex;gap:14px;margin-top:40px;
          opacity:0;animation:lp-rise 1s .65s forwards;
          flex-wrap:wrap;justify-content:center;
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
        .lp-badge,.lp-hero-stage h1,.lp-hero-stage p,.lp-actions { transform:translateY(24px); }

        .lp-guarantee {
          display:flex;align-items:center;gap:8px;justify-content:center;
          color:var(--text-3);font-size:12.5px;margin-top:20px;
          opacity:0;animation:lp-rise 1s .78s forwards;
          transform:translateY(16px);
        }
        .lp-guarantee svg { color:var(--accent);flex-shrink:0; }

        /* ── FLOATING DASHBOARD PREVIEW ──────────────────────── */
        .lp-preview {
          margin-top:64px;width:min(1000px,92vw);border-radius:18px;
          border:1px solid var(--border);
          background:linear-gradient(180deg,var(--surface),var(--bg2));
          box-shadow:0 40px 100px rgba(0,0,0,0.6);overflow:hidden;
          opacity:0;animation:lp-rise 1.2s .85s forwards;
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
          opacity:0;animation:lp-rise 1s 1.3s forwards;z-index:6;
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
          max-width:700px;margin:0 auto;
          /* 2 columns — performance stats removed until live-system data available (§56) */
          display:grid;grid-template-columns:repeat(2,1fr);gap:30px;text-align:center;
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

        {/* ── HERO: Wall of Creatives + Cursor Spotlight (§60) ─
            300vh wrapper = sticky stage scrolls without scroll-jacking.
            Image: public/assets/hero-wall.png (~9 MB PNG — compress to WebP before prod!)
        ────────────────────────────────────────────────────── */}
        <div className="lp-hero-wrapper" ref={heroWrapperRef}>
          <div className="lp-hero-stage">

            {/* Layer 1: wall image — very dark at rest, brightened by spotlight */}
            <div className="wall" ref={wallRef} />

            {/* Layer 2: film grain — background-image data-URI, mix-blend-mode:overlay */}
            <div className="grain" aria-hidden="true" />

            {/* Layer 3: vignette — keeps headline readable over busy wall */}
            <div className="vignette" ref={vignetteRef} />

            {/* Layer 4: spotlight — follows cursor with lag (lerp 0.14), blur:22px, mix:screen */}
            <div className="spotlight" ref={spotlightRef} aria-hidden="true" />

            {/* Layer 5: hotspots — 6 fixed data points, activate on spotlight proximity
                [PLACEHOLDER] ALL values are '—' until connected to real Meta/Supabase data.
                TODO: restore real per-creative stats once available — see design-system §56
                NOTE: on mobile/touch, tap on dot toggles the bubble. */}
            {HOTSPOTS.map((hs, i) => (
              <div
                key={i}
                className="lp-hotspot"
                data-idx={i}
                style={{ left: `${hs.xPct}%`, top: `${hs.yPct}%` }}
                aria-label={`${hs.label}: ${hs.val}`}
              >
                <div className="lp-hotspot-bubble">
                  <span className="hs-label">{hs.label}</span>
                  <span className="hs-val">{hs.val}</span>
                </div>
              </div>
            ))}

            {/* Layer 6: hero content — badge → h1 → p → actions → guarantee → preview */}
            <div className="hero-inner">
              <div className="lp-badge">
                <span className="pulse-dot" />
                Trained on 9 years of beauty campaign data
              </div>

              <h1>Campaign intelligence for <em>beauty</em> brands</h1>

              <p>
                Upload a creative. AI writes the copy, launches to Meta &amp; Google,
                and optimizes your budget, around the clock.
              </p>

              <div className="lp-actions">
                <button className="btn-primary" onClick={handleGetStarted}>
                  Get started <span style={{ fontSize: 17 }}>→</span>
                </button>
                <button className="btn-ghost" onClick={handleHowItWorks}>
                  See how it works
                </button>
              </div>

              {/* §56-57: 30-day money-back guarantee — exact wording, no alterations */}
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
            </div>{/* /hero-inner */}

            <div className="lp-scroll-hint">
              <div className="lp-mouse" />
              SCROLL
            </div>
          </div>{/* /lp-hero-stage */}
        </div>{/* /lp-hero-wrapper */}

        {/* ── STATS BAND ────────────────────────────────────────
            Two factual stats only. Performance stats (CPL improvement, launch speed)
            removed until verified data is available from live system.
            // TODO: restore real performance stat once available from live system — see design-system §56
        ───────────────────────────────────────────────────────── */}
        <div className="lp-stats">
          <div className="lp-stats-inner">
            {/* ✓ REAL — 9 years of beauty data is confirmed factual */}
            <div className="lp-stat reveal">
              <div className="num" data-count="9">0</div>
              <div className="lbl">Years of beauty benchmark data</div>
            </div>
            {/* ✓ REAL — 24/7 is a system capability claim, not a measured outcome */}
            <div className="lp-stat reveal d1">
              <div className="num" data-count="24" data-suffix="/7">0</div>
              <div className="lbl">Always-on budget optimization</div>
            </div>
            {/*
              // TODO: restore real performance stat once available from live system — see design-system §56
              // −38% CPL card was here — removed, unverified
              // ×3 faster card was here — removed, unverified
            */}
          </div>
        </div>

        {/* ── FEATURES ──────────────────────────────────────── */}
        <section className="lp-section" id="features">
          <div className="eyebrow reveal">What it does</div>
          <h2 className="section-title reveal d1">An entire ads team, in one platform</h2>
          <p className="section-sub reveal d2">
            From creative to copy to optimization. NextAdsGen runs the parts
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
              <p>Every metric is judged against nearly a decade of real beauty &amp; clinic campaign data, so you always know what "good" is.</p>
            </div>
            <div className="feat reveal d1">
              <div className="feat-ic">◇</div>
              <h3>Intelligence chat</h3>
              <p>Ask anything: "why is my CPM rising?" Get a real answer grounded in your data, not a generic tip.</p>
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
                <p>Headlines, primary text, audience, budget. All drafted for you, tuned to beauty buyers, ready to edit.</p>
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
                <p>From there it runs itself: reallocating budget, catching fatigue, and reporting what it did while you slept.</p>
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
            {/* §56-57: Short-form guarantee for final CTA */}
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
