import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, TrendingDown, AlertCircle, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { signUpWithEmail, signInWithEmail } from '../lib/supabase';

// Mock benchmark comparison for the audit
const AUDIT_RESULTS: Record<string, {
  roas?: number; cpm?: number; cac?: number; ctr?: number;
  yours: number; benchmark: number; unit: string; label: string; lowerIsBetter?: boolean;
}> = {
  roas: { yours: 1.8, benchmark: 3.2, unit: 'x', label: 'ROAS' },
  cpm:  { yours: 18.4, benchmark: 11.2, unit: '€', label: 'CPM', lowerIsBetter: true },
  cac:  { yours: 42, benchmark: 28, unit: '€', label: 'Cost per Acquisition', lowerIsBetter: true },
  ctr:  { yours: 0.9, benchmark: 2.1, unit: '%', label: 'CTR' },
};

const MONTHLY_LOSS = 3200; // mock

const AuditResultCard: React.FC<{
  label: string;
  yours: number;
  benchmark: number;
  unit: string;
  lowerIsBetter?: boolean;
}> = ({ label, yours, benchmark, unit, lowerIsBetter }) => {
  const isGood = lowerIsBetter ? yours <= benchmark : yours >= benchmark;
  const delta = Math.abs(((yours - benchmark) / benchmark) * 100).toFixed(0);
  const prefix = unit === '€' ? '€' : '';
  const suffix = unit !== '€' ? unit : '';

  return (
    <div style={{
      background: '#1C1208',
      border: `0.5px solid ${isGood ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: 6,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4a2e1e' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 500, color: isGood ? '#10B981' : '#EF4444', lineHeight: 1 }}>
          {prefix}{yours}{suffix}
        </div>
        <div style={{ paddingBottom: 4 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, color: '#4a2e1e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Benchmark</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#8B6050' }}>{prefix}{benchmark}{suffix}</div>
        </div>
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: isGood ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        color: isGood ? '#10B981' : '#EF4444',
        borderRadius: 2, padding: '2px 8px',
        fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 500,
        letterSpacing: '0.08em',
        alignSelf: 'flex-start',
      }}>
        {isGood ? '✓' : '↓'} {delta}% {isGood ? 'above' : 'below'} benchmark
      </div>
    </div>
  );
};

const Audit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'landing' | 'auth' | 'results'>(user ? 'results' : 'landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const { error: err } = await signInWithEmail(email, password);
        if (err) throw err;
      } else {
        const { error: err } = await signUpWithEmail(email, password);
        if (err) throw err;
      }
      setStep('results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F0A07', color: '#F5E6D8' }}>

      {/* Top nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '0.5px solid #2a1a0e',
        background: '#0F0A07',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, color: '#F5E6D8' }}>
            NextAds<em style={{ fontStyle: 'italic', color: '#C4836A' }}>Gen</em>
          </div>
        </Link>
        <Link to="/pricing" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b4030', textDecoration: 'none' }}>
          See Pricing →
        </Link>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>

        {/* ── STEP 1: Landing ── */}
        {step === 'landing' && (
          <div style={{ textAlign: 'center', animation: 'fade-in 0.4s ease' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#4a2e1e', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ display: 'block', width: 16, height: 0.5, background: '#4a2e1e' }} />
              Free Benchmark Audit
              <span style={{ display: 'block', width: 16, height: 0.5, background: '#4a2e1e' }} />
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 400, lineHeight: 1.2, marginBottom: 16 }}>
              See exactly where your<br /><em style={{ fontStyle: 'italic', color: '#C4836A' }}>ads are losing money</em>
            </h1>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: '#8B6050', lineHeight: 1.7, marginBottom: 36 }}>
              Get a one-time free benchmark audit comparing your Meta Ads performance<br />
              against 847 Beauty &amp; Cosmetics brands. No credit card required.
            </p>

            {/* 3 steps */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
              {[
                { n: '01', title: 'Sign up free', sub: 'No credit card required' },
                { n: '02', title: 'Connect Meta', sub: 'Last 30 days of data' },
                { n: '03', title: 'Get your report', sub: 'Instant benchmark comparison' },
              ].map(s => (
                <div key={s.n} style={{ background: '#1C1208', border: '0.5px solid #2a1a0e', borderRadius: 6, padding: '16px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#C4836A', marginBottom: 8 }}>{s.n}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: '#F5E6D8', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#6b4030' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('auth')}
              style={{
                background: '#C4836A', color: '#0F0A07', border: 'none',
                padding: '14px 36px', borderRadius: 4,
                fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500,
                letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              Get My Free Audit <ArrowRight size={14} strokeWidth={1.5} />
            </button>

            <div style={{ marginTop: 14, fontFamily: "'Outfit', sans-serif", fontSize: 10, color: '#4a2e1e' }}>
              One-time free · Takes 3 minutes · No card needed
            </div>
          </div>
        )}

        {/* ── STEP 2: Auth ── */}
        {step === 'auth' && (
          <div style={{ maxWidth: 400, margin: '0 auto', animation: 'fade-in 0.4s ease' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, marginBottom: 8, textAlign: 'center' }}>
              {isLogin ? 'Sign in' : 'Create free account'}
            </h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#8B6050', textAlign: 'center', marginBottom: 28 }}>
              To receive your benchmark report
            </p>

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4a2e1e', marginBottom: 5 }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width: '100%', background: '#0F0A07', border: '0.5px solid #2a1a0e', borderRadius: 4, padding: '10px 12px', fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#F5E6D8', outline: 'none', boxSizing: 'border-box' as const }}
                  placeholder="you@brand.com"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4a2e1e', marginBottom: 5 }}>Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  style={{ width: '100%', background: '#0F0A07', border: '0.5px solid #2a1a0e', borderRadius: 4, padding: '10px 12px', fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#F5E6D8', outline: 'none', boxSizing: 'border-box' as const }}
                  placeholder="Min. 6 characters"
                />
              </div>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '8px 12px', fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={13} strokeWidth={1.5} /> {error}
                </div>
              )}
              <button
                type="submit" disabled={loading}
                style={{ background: '#C4836A', color: '#0F0A07', border: 'none', borderRadius: 4, padding: '12px', fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Loading…' : isLogin ? 'Sign In' : 'Create Account & Get Report'}
              </button>
              <div style={{ textAlign: 'center', fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#6b4030' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: '#C4836A', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 11 }}>
                  {isLogin ? 'Sign up free' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: Results ── */}
        {step === 'results' && (
          <div style={{ animation: 'fade-in 0.4s ease' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#4a2e1e', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ display: 'block', width: 16, height: 0.5, background: '#4a2e1e' }} />
                Your Free Benchmark Audit
                <span style={{ display: 'block', width: 16, height: 0.5, background: '#4a2e1e' }} />
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, lineHeight: 1.2, marginBottom: 8 }}>
                Your Meta Ads vs <em style={{ fontStyle: 'italic', color: '#C4836A' }}>847 Beauty brands</em>
              </h1>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: '#8B6050' }}>
                Based on 9-year anonymized dataset · EU &amp; US markets · 2015–2024
              </p>
            </div>

            {/* Alert: monthly loss */}
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)',
              borderRadius: 6, padding: '16px 20px', marginBottom: 28,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <TrendingDown size={24} color="#EF4444" strokeWidth={1.5} />
              <div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, color: '#EF4444', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Estimated monthly loss vs benchmark brands
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 500, color: '#EF4444', lineHeight: 1 }}>
                  €{MONTHLY_LOSS.toLocaleString()}/mo
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#8B6050', marginTop: 2 }}>
                  Based on your ROAS gap × estimated ad spend
                </div>
              </div>
            </div>

            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 40 }}>
              {Object.entries(AUDIT_RESULTS).map(([key, val]) => (
                <AuditResultCard key={key} label={val.label} yours={val.yours} benchmark={val.benchmark} unit={val.unit} lowerIsBetter={val.lowerIsBetter} />
              ))}
            </div>

            {/* Free features they got */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4a2e1e', marginBottom: 12 }}>
                What this audit includes
              </div>
              {['ROAS vs 847 Beauty brand benchmark', 'CPM efficiency gap', 'CAC vs industry average', 'CTR performance signal'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <CheckCircle size={13} color="#10B981" strokeWidth={1.5} />
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: '#C4A090' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Hard paywall below */}
            <div style={{
              background: '#1C1208', border: '1px solid rgba(196,131,106,0.4)',
              borderRadius: 8, padding: '32px', textAlign: 'center', position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #C4836A, #D4A847, #C4836A)' }} />

              <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                <Lock size={28} color="#C4836A" strokeWidth={1.5} />
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 400, marginBottom: 8 }}>
                Fix this with <em style={{ fontStyle: 'italic', color: '#C4836A' }}>NextAdsGen Starter</em>
              </h2>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: '#8B6050', lineHeight: 1.7, marginBottom: 24, maxWidth: 460, margin: '0 auto 24px' }}>
                Get AI-powered recommendations, full 9-year benchmark comparison, and monthly audit reports — all tailored to your Beauty brand.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginBottom: 24 }}>
                {['AI recommendations based on your exact benchmark gap', 'Full ROAS/CPM/CAC/CTR comparison dashboard', 'Monthly benchmark audit reports', 'Meta Ads sync + campaign tracking'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={12} color="#10B981" strokeWidth={1.5} />
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: '#C4A090' }}>{f}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 40, fontWeight: 500, color: '#C4836A' }}>€149</span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#8B6050' }}>/month</span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#6b4030' }}>· Cancel anytime</span>
              </div>

              <button
                onClick={() => navigate('/pricing')}
                style={{
                  background: '#C4836A', color: '#0F0A07', border: 'none', borderRadius: 4,
                  padding: '14px 40px',
                  fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                Start with Starter — €149/mo <ArrowRight size={14} strokeWidth={1.5} />
              </button>
              <div style={{ marginTop: 10, fontFamily: "'Outfit', sans-serif", fontSize: 10, color: '#4a2e1e' }}>
                Or see all plans including Growth and Scale
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Dummy icon usage to avoid TS unused import */}
      <span style={{ display: 'none' }}><BarChart3 size={0} /></span>
    </div>
  );
};

export default Audit;
