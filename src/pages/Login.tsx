import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mail, Eye, EyeOff, AlertCircle, Globe, LayoutDashboard } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { RougeLogo } from '../components/brand/RougeLogo';

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
            Beauty & Cosmetics benchmark data since 2018, layered on top of your ad account.
          </p>

          <div className="login-proof-list">
            {[
              { stat: '25,620', label: 'Beauty campaigns analysed' },
              { stat: '2018', label: 'First campaign in the dataset' },
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
            Since 2018. 25,620 beauty campaigns. One number that matters.
          </div>
        </div>
      </div>

      {/* Right — cream auth panel */}
      <div className="login-right">
        <div className="login-form-wrap animate-fade-in">
          {/* Logo */}
          <div className="login-logo">
            <RougeLogo variant="lockup" className="login-rouge-logo" />
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
          background: var(--bg);
          display: flex;
          align-items: center;
          padding: 60px 64px;
          position: relative;
          overflow: hidden;
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
          font-family: var(--font-ui);
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--text);
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
          background: var(--border);
        }

        .login-headline {
          font-family: var(--font-display);
          font-size: 42px;
          font-weight: 800;
          line-height: 1.15;
          color: var(--text);
          letter-spacing: -0.02em;
          margin-bottom: 20px;
        }

        .login-headline em {
          color: var(--rose-gold);
        }

        .login-tagline {
          font-family: var(--font-ui);
          font-size: 14px;
          font-weight: 300;
          color: var(--text);
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
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 500;
          color: var(--text);
          line-height: 1;
        }

        .login-proof-label {
          font-family: var(--font-ui);
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-2);
        }

        /* ——— Demo CTA box on dark panel ——— */
        .login-demo-cta {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px 18px;
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .login-demo-label {
          font-family: var(--font-ui);
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-2);
        }

        .login-demo-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          background: transparent;
          border: 1px solid var(--border-control);
          border-radius: 4px;
          padding: 11px 16px;
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: var(--text);
          cursor: pointer;
          transition: background 0.2s;
          width: fit-content;
        }

        .login-demo-btn:hover { background: var(--surface-2); }

        .login-demo-sub {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--text-2);
          letter-spacing: 0.06em;
        }

        .login-quote {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
          color: var(--text-2);
          border-left: 1px solid var(--border);
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
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          margin-bottom: 4px;
        }

        .login-rouge-logo { height: 24px; display: block; }

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
          font-family: var(--font-ui);
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: var(--text-2);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          border-radius: 0;
          cursor: pointer;
          transition: all var(--transition);
        }

        .login-tab.active {
          color: var(--text);
          border-bottom-color: var(--text);
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
          font-family: var(--font-ui);
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
          font-family: var(--font-ui);
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
          background: var(--red-soft);
          border: 0.5px solid rgba(239,68,68,0.2);
          border-radius: var(--radius);
          padding: 10px 12px;
          font-family: var(--font-ui);
          font-size: 12px;
          font-weight: 300;
          color: var(--red);
          line-height: 1.5;
        }

        .login-error svg { flex-shrink: 0; margin-top: 1px; }

        .login-error-hint {
          margin-top: 4px;
          font-size: 11px;
          color: var(--red);
        }

        .login-error-demo {
          background: none;
          border: none;
          font-family: inherit;
          font-size: inherit;
          color: var(--amber);
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
          font-family: var(--font-ui);
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
          font-family: var(--font-ui);
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
