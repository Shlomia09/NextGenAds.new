import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Zap, Mail, Globe, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const { user, loading } = useAuth();
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
      {/* Background decorations */}
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />

      <div className="login-container animate-fade-in">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={20} />
          </div>
          <span className="login-logo-text">NextGenAds</span>
        </div>

        {/* Headline */}
        <div className="login-hero">
          <h1 className="login-headline">
            Campaign Intelligence<br />
            <span className="login-headline-accent">Powered by 9-Year Benchmarks</span>
          </h1>
          <p className="login-subheadline">
            Not just your data — know if your ROAS is good before you run out of budget.
          </p>
        </div>

        {/* Benchmark pills */}
        <div className="login-pills">
          <div className="login-pill">
            <div className="login-pill-dot" />
            847 Beauty brands analyzed
          </div>
          <div className="login-pill">
            <div className="login-pill-dot" />
            2015–2024 dataset
          </div>
          <div className="login-pill">
            <div className="login-pill-dot" />
            Meta + Google + Klaviyo
          </div>
        </div>

        {/* Auth card */}
        <div className="login-card">
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => setMode('signin')}
            >
              Sign In
            </button>
            <button
              className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Get Started
            </button>
          </div>

          {/* Google OAuth */}
          <button className="btn-google" onClick={handleGoogleAuth}>
            <Globe size={16} />
            Continue with Google
          </button>

          <div className="login-divider">
            <span>or</span>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="login-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-with-icon">
                <Mail size={14} className="input-icon" />
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
              <div className="input-with-icon">
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
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
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg full-width"
              disabled={submitting}
            >
              {submitting ? (
                <span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
              ) : null}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="login-footer">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .login-bg-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99,102,241,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .login-bg-glow {
          position: fixed;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .login-logo-icon {
          width: 36px;
          height: 36px;
          background: var(--accent);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 0 20px var(--accent-glow);
        }

        .login-logo-text {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .login-hero {
          text-align: center;
        }

        .login-headline {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          margin-bottom: 10px;
        }

        .login-headline-accent {
          background: linear-gradient(135deg, var(--accent), #818CF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subheadline {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .login-pills {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }

        .login-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .login-pill-dot {
          width: 6px;
          height: 6px;
          background: var(--accent);
          border-radius: 50%;
        }

        .login-card {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: var(--shadow-lg);
        }

        .login-tabs {
          display: flex;
          background: var(--surface-3);
          border-radius: var(--radius);
          padding: 3px;
          gap: 2px;
        }

        .login-tab {
          flex: 1;
          padding: 8px;
          border-radius: calc(var(--radius) - 2px);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition);
        }

        .login-tab.active {
          background: var(--surface);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        .btn-google {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 11px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition);
          font-family: var(--font-body);
        }

        .btn-google:hover {
          border-color: var(--border-hover);
          background: var(--surface-2);
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-icon-right {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--danger-dim);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: var(--radius);
          padding: 10px 12px;
          font-size: 12px;
          color: var(--danger);
        }

        .login-footer {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default Login;
