import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mail, Eye, EyeOff, AlertCircle, Globe, LayoutDashboard } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  return (
    <div className="login-page">
      {/* Left — dark editorial panel */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-eyebrow">Campaign Intelligence</div>
          <h1 className="login-headline">
            Know if your ROAS<br />is good <em>before</em> you<br />run out of budget
          </h1>
          <p className="login-tagline">
            9 years of Beauty & Cosmetics benchmark data, layered on top of your ad account.
          </p>

          <div className="login-proof-list">
            {[
              { stat: '847', label: 'Beauty brands analysed' },
              { stat: '9yr',  label: 'Benchmark dataset' },
              { stat: '€100+', label: 'Avg AOV served' },
            ].map(({ stat, label }) => (
              <div key={label} className="login-proof-item">
                <div className="login-proof-stat">{stat}</div>
                <div className="login-proof-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Demo access CTA — prominent on the dark panel */}
          <div className="login-demo-cta">
            <p className="login-demo-label">No Supabase account yet?</p>
            <button className="login-demo-btn" onClick={() => navigate('/demo')}>
              <LayoutDashboard size={14} strokeWidth={1.5} />
              Enter Full Demo Dashboard
            </button>
            <p className="login-demo-sub">All features · Mock data · No setup required</p>
          </div>

          <div className="login-quote">
            <em>"Feminine intelligence meets hard data."</em>
          </div>
        </div>
      </div>

      {/* Right — cream auth panel */}
      <div className="login-right">
        <div className="login-form-wrap animate-fade-in">
          {/* Logo */}
          <div className="login-logo">
            Next<em>Gen</em>Ads
          </div>

          {/* Tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => setMode('signin')}
            >Sign In</button>
            <button
              className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >Get Started</button>
          </div>

          {/* Google */}
          <button className="login-google-btn" onClick={handleGoogleAuth}>
            <Globe size={15} strokeWidth={1.5} />
            Continue with Google
          </button>

          <div className="login-or">
            <span>or</span>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="login-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="login-input-wrap">
                <Mail size={13} className="login-input-icon" strokeWidth={1.5} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@yourbrand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="login-input-wrap">
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
                </button>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={13} strokeWidth={1.5} />
                <div>
                  <div>{error}</div>
                  {error.toLowerCase().includes('fetch') && (
                    <div className="login-error-hint">
                      Supabase is not configured yet.{' '}
                      <button type="button" className="login-error-demo" onClick={() => navigate('/demo')}>
                        Try the Demo Dashboard instead →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg full-width"
              disabled={submitting}
            >
              {submitting
                ? 'Please wait…'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {/* Demo bypass button — always visible */}
          <div className="login-demo-bypass">
            <div className="login-bypass-divider">
              <span>or explore without account</span>
            </div>
            <button
              className="btn btn-secondary btn-lg full-width"
              onClick={() => navigate('/demo')}
              style={{ justifyContent: 'center', gap: 8 }}
            >
              <LayoutDashboard size={14} strokeWidth={1.5} />
              View Demo Dashboard
            </button>
          </div>

          <p className="login-footer">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
        }

        /* ——— Left dark panel ——— */
        .login-left {
          width: 52%;
          background: #2C1810;
          display: flex;
          align-items: center;
          padding: 60px 64px;
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: -120px;
          right: -120px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(196,131,106,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-left-content {
          position: relative;
          z-index: 1;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .login-eyebrow {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--rose-gold);
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .login-eyebrow::before {
          content: '';
          display: block;
          width: 24px;
          height: 0.5px;
          background: var(--rose-gold);
        }

        .login-headline {
          font-family: 'Playfair Display', serif;
          font-size: 42px;
          font-weight: 400;
          line-height: 1.15;
          color: #F5E6D8;
          letter-spacing: -0.01em;
          margin-bottom: 20px;
        }

        .login-headline em {
          font-style: italic;
          color: var(--rose-gold);
        }

        .login-tagline {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 300;
          color: #C4A090;
          line-height: 1.6;
          margin-bottom: 32px;
          max-width: 360px;
        }

        .login-proof-list {
          display: flex;
          gap: 32px;
          margin-bottom: 32px;
        }

        .login-proof-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .login-proof-stat {
          font-family: 'DM Mono', monospace;
          font-size: 22px;
          font-weight: 500;
          color: #F5E6D8;
          line-height: 1;
        }

        .login-proof-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #7A5A48;
        }

        /* ——— Demo CTA box on dark panel ——— */
        .login-demo-cta {
          background: rgba(196,131,106,0.08);
          border: 0.5px solid rgba(196,131,106,0.25);
          border-radius: 6px;
          padding: 16px 18px;
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .login-demo-label {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8B6050;
        }

        .login-demo-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          background: #C4836A;
          border: none;
          border-radius: 4px;
          padding: 11px 16px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: #FDF6F0;
          cursor: pointer;
          transition: background 0.2s;
          width: fit-content;
        }

        .login-demo-btn:hover { background: #B06E55; }

        .login-demo-sub {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #6B4A38;
          letter-spacing: 0.06em;
        }

        .login-quote {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 14px;
          color: #8B6050;
          border-left: 1px solid #3d2a1e;
          padding-left: 16px;
          line-height: 1.6;
        }

        /* ——— Right cream panel ——— */
        .login-right {
          flex: 1;
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
        }

        .login-form-wrap {
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-logo {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 400;
          color: var(--text-primary);
          letter-spacing: 0.02em;
          margin-bottom: 4px;
        }

        .login-logo em {
          font-style: italic;
          color: var(--rose-gold);
        }

        .login-tabs {
          display: flex;
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          padding: 3px;
          gap: 2px;
        }

        .login-tab {
          flex: 1;
          padding: 8px;
          border-radius: calc(var(--radius) - 1px);
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition);
        }

        .login-tab.active {
          background: var(--bg-card);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        .login-google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          padding: 11px;
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all var(--transition);
        }

        .login-google-btn:hover {
          border-color: var(--rose-gold-pale);
          background: var(--bg-secondary);
        }

        .login-or {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          color: var(--text-hint);
        }

        .login-or::before,
        .login-or::after {
          content: '';
          flex: 1;
          height: 0.5px;
          background: var(--border-light);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .login-input-wrap {
          position: relative;
        }

        .login-input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-hint);
          pointer-events: none;
        }

        .login-input-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-hint);
          cursor: pointer;
          padding: 2px;
          display: flex;
        }

        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          background: #FEE2E2;
          border: 0.5px solid rgba(239,68,68,0.2);
          border-radius: var(--radius);
          padding: 10px 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: #991B1B;
          line-height: 1.5;
        }

        .login-error svg { flex-shrink: 0; margin-top: 1px; }

        .login-error-hint {
          margin-top: 4px;
          font-size: 11px;
          color: #7f1d1d;
        }

        .login-error-demo {
          background: none;
          border: none;
          font-family: inherit;
          font-size: inherit;
          color: #B45309;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          font-weight: 500;
        }

        /* ——— Demo bypass section ——— */
        .login-demo-bypass {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .login-bypass-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-hint);
        }

        .login-bypass-divider::before,
        .login-bypass-divider::after {
          content: '';
          flex: 1;
          height: 0.5px;
          background: var(--border-light);
        }

        .login-footer {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 300;
          color: var(--text-hint);
          text-align: center;
          line-height: 1.5;
          letter-spacing: 0.02em;
        }

        @media (max-width: 768px) {
          .login-page { flex-direction: column; }
          .login-left { width: 100%; padding: 40px 24px; }
          .login-left .login-demo-btn { width: 100%; justify-content: center; }
          .login-right { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
};

export default Login;
