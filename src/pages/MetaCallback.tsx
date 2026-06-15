import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

import { supabase } from '../lib/supabase';

/**
 * MetaCallback — handles the OAuth redirect from Meta after the user
 * authorizes access to their ad account.
 *
 * Meta redirects to: /connect/meta/callback?code=xxx&state=yyy
 *
 * This page calls our meta-oauth Edge Function which:
 *   1. Exchanges the code for an access token
 *   2. Fetches the user's ad accounts
 *   3. Stores the token in `ad_accounts` table
 *   4. Redirects back here with ?success=true or ?error=xxx
 */

type Status = 'loading' | 'success' | 'error';

const MetaCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code  = params.get('code');
      const error = params.get('error');
      const errorReason = params.get('error_reason');

      // ── User denied access ──────────────────────────────────
      if (error || errorReason) {
        setStatus('error');
        setErrorMsg('You cancelled the Meta connection. You can try again from the Connect page.');
        return;
      }

      // ── No code received ────────────────────────────────────
      if (!code) {
        setStatus('error');
        setErrorMsg('No authorization code received from Meta. Please try again.');
        return;
      }

      // ── Get current user ────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // ── Call meta-oauth Edge Function ──────────────────────
        // The edge function exchanges code → token, stores ad account, returns JSON
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch(
          `${supabaseUrl}/functions/v1/meta-oauth?code=${encodeURIComponent(code)}&state=${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              apikey: anonKey,
            },
          }
        );

        // Edge function redirects on success/error — if we got a response body
        // it means something went wrong before the redirect
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        // If we're here, the edge function processed successfully
        // (it may have redirected, but the fetch followed it)
        setStatus('success');

        // Auto-navigate after 2 seconds
        setTimeout(() => navigate('/connect?success=meta_connected'), 2000);

      } catch (err) {
        console.error('Meta OAuth callback error:', err);
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Connection failed. Please try again.');
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F0A07',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#1C1208',
        border: '0.5px solid #2a1a0e',
        borderRadius: 8,
        padding: '40px 48px',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>

        {/* ── Loading ── */}
        {status === 'loading' && (
          <>
            <div style={{
              width: 52, height: 52,
              border: '1.5px solid #2a1a0e',
              borderTopColor: '#C4836A',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
            }} />
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#F5E6D8' }}>
              Connecting Meta Ads…
            </div>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: '#8B6050', lineHeight: 1.6, margin: 0 }}>
              Exchanging authorization code and fetching your ad accounts. This takes a moment.
            </p>
          </>
        )}

        {/* ── Success ── */}
        {status === 'success' && (
          <>
            <div style={{
              width: 52, height: 52,
              background: 'rgba(16,185,129,0.1)',
              border: '0.5px solid rgba(16,185,129,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={24} color="#10B981" strokeWidth={1.5} />
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#F5E6D8' }}>
              Meta Ads Connected
            </div>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: '#8B6050', lineHeight: 1.6, margin: 0 }}>
              Your ad account has been linked. Redirecting to the Connect page…
            </p>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#10B981',
              animation: 'pulse-subtle 1.5s ease-in-out infinite',
            }} />
          </>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <>
            <div style={{
              width: 52, height: 52,
              background: 'rgba(239,68,68,0.1)',
              border: '0.5px solid rgba(239,68,68,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <XCircle size={24} color="#EF4444" strokeWidth={1.5} />
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#F5E6D8' }}>
              Connection Failed
            </div>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: '#8B6050', lineHeight: 1.6, margin: 0 }}>
              {errorMsg}
            </p>
            <button
              onClick={() => navigate('/connect')}
              style={{
                background: '#C4836A', color: '#0F0A07',
                border: 'none', borderRadius: 4,
                padding: '10px 24px',
                fontFamily: "'Outfit', sans-serif", fontSize: 10,
                fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              Back to Connect
            </button>
          </>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-subtle {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.3); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default MetaCallback;
