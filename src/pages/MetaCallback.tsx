import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Status = 'loading' | 'selecting' | 'saving' | 'success' | 'error';

interface AdAccount {
  id: string;
  account_id: string;
  account_name: string;
  status: string;
}

const T = {
  bg:      '#0F0A07',
  surface: '#1C1208',
  border:  '0.5px solid #2a1a0e',
  accent:  '#C4836A',
  text:    '#F5E6D8',
  muted:   '#8B6050',
  hint:    '#4a2e1e',
};

const MetaCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status,   setStatus]   = useState<Status>('loading');
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const run = async () => {
      const params      = new URLSearchParams(window.location.search);
      const code        = params.get('code');
      const errorParam  = params.get('error');

      if (errorParam || !code) {
        setStatus('error');
        setErrorMsg(errorParam
          ? 'You cancelled the Meta connection.'
          : 'No authorization code received from Meta.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch(
          `${supabaseUrl}/functions/v1/meta-oauth?code=${encodeURIComponent(code)}&state=${user.id}`,
          { headers: { Authorization: `Bearer ${session?.access_token}`, apikey: anonKey } }
        );

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(body.error || body.message || `HTTP ${res.status}`);
        }

        // ── Fetch the PENDING accounts stored by edge function ─────
        const { data: pendingAccounts } = await supabase
          .from('ad_accounts')
          .select('id, account_id, account_name, status')
          .eq('user_id', user.id)
          .eq('platform', 'meta')
          .eq('status', 'pending')
          .order('account_name');

        if (!pendingAccounts || pendingAccounts.length === 0) {
          throw new Error('No ad accounts found on this Meta account.');
        }

        setAccounts(pendingAccounts);
        setSelected(new Set()); // Start with nothing selected — user must choose
        setStatus('selecting');



      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Connection failed.');
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAccount = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setStatus('saving');

    const selectedIds   = accounts.filter(a =>  selected.has(a.id)).map(a => a.id);
    const unselectedIds = accounts.filter(a => !selected.has(a.id)).map(a => a.id);

    // 1. Activate the selected accounts
    if (selectedIds.length > 0) {
      await supabase
        .from('ad_accounts')
        .update({ status: 'active' })
        .in('id', selectedIds);
    }

    // 2. Delete the accounts the user did NOT select
    if (unselectedIds.length > 0) {
      await supabase.from('ad_accounts').delete().in('id', unselectedIds);
    }

    setStatus('success');
    setTimeout(() => navigate('/connect?success=meta_connected'), 1200);
  };


  // ── Card wrapper ───────────────────────────────────────────
  const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: T.surface, border: T.border, borderRadius: 8,
        padding: '36px 40px', maxWidth: 480, width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        textAlign: 'center',
      }}>
        {children}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Loading ────────────────────────────────────────────────
  if (status === 'loading') return (
    <Card>
      <div style={{ width: 48, height: 48, border: `1.5px solid ${T.hint}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text }}>Connecting Meta Ads…</div>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: T.muted, lineHeight: 1.6, margin: 0 }}>
        Fetching your ad accounts. This takes a moment.
      </p>
    </Card>
  );

  // ── Account picker ─────────────────────────────────────────
  if (status === 'selecting') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        background: T.surface, border: T.border, borderRadius: 8,
        padding: '36px 40px', maxWidth: 520, width: '100%',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.accent, marginBottom: 8 }}>
            Meta Ads · {accounts.length} account{accounts.length !== 1 ? 's' : ''} found
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.text, marginBottom: 8 }}>
            Select accounts to connect
          </div>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: T.muted, lineHeight: 1.55, margin: 0 }}>
            Choose which ad accounts NextAdsGen should monitor. You can change this later.
          </p>
        </div>

        {/* Select all / none */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <button onClick={() => setSelected(new Set(accounts.map(a => a.id)))}
            style={{ background: 'none', border: 'none', fontFamily: "'Outfit', sans-serif", fontSize: 10, color: T.accent, cursor: 'pointer', padding: 0 }}>
            Select all
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ background: 'none', border: 'none', fontFamily: "'Outfit', sans-serif", fontSize: 10, color: T.muted, cursor: 'pointer', padding: 0 }}>
            Clear all
          </button>
        </div>

        {/* Account list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', marginBottom: 20 }}>
          {accounts.map(account => {
            const isSelected = selected.has(account.id);
            return (
              <div
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isSelected ? 'rgba(196,131,106,0.07)' : T.bg,
                  border: isSelected ? `0.5px solid rgba(196,131,106,0.4)` : T.border,
                  borderRadius: 6, padding: '12px 14px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                  background: isSelected ? T.accent : 'transparent',
                  border: isSelected ? 'none' : `0.5px solid ${T.hint}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <Check size={11} color="#0F0A07" strokeWidth={2.5} />}
                </div>

                {/* Account info */}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 400, color: T.text }}>
                    {account.account_name}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.hint, marginTop: 2 }}>
                    ID: {account.account_id}
                  </div>
                </div>

                {/* Status dot */}
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: account.status === 'active' ? '#10B981' : '#F59E0B', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0}
          style={{
            width: '100%', background: selected.size > 0 ? T.accent : T.hint,
            color: '#0F0A07', border: 'none', borderRadius: 5,
            padding: '13px 0', fontFamily: "'Outfit', sans-serif",
            fontSize: 11, fontWeight: 500, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          Connect {selected.size} account{selected.size !== 1 ? 's' : ''} →
        </button>

        <button onClick={() => navigate('/connect')}
          style={{ background: 'none', border: 'none', fontFamily: "'Outfit', sans-serif", fontSize: 10, color: T.hint, cursor: 'pointer', marginTop: 4 }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ── Saving ─────────────────────────────────────────────────
  if (status === 'saving') return (
    <Card>
      <div style={{ width: 48, height: 48, border: `1.5px solid ${T.hint}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text }}>Saving selection…</div>
    </Card>
  );

  // ── Success ────────────────────────────────────────────────
  if (status === 'success') return (
    <Card>
      <div style={{ width: 52, height: 52, background: 'rgba(16,185,129,0.1)', border: '0.5px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle size={24} color="#10B981" strokeWidth={1.5} />
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text }}>Connected!</div>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: T.muted, margin: 0 }}>Redirecting…</p>
    </Card>
  );

  // ── Error ──────────────────────────────────────────────────
  return (
    <Card>
      <div style={{ width: 52, height: 52, background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <XCircle size={24} color="#EF4444" strokeWidth={1.5} />
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text }}>Connection Failed</div>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 300, color: T.muted, lineHeight: 1.6, margin: 0 }}>{errorMsg}</p>
      <button onClick={() => navigate('/connect')}
        style={{ background: T.accent, color: '#0F0A07', border: 'none', borderRadius: 4, padding: '10px 24px', fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
        Back to Connect
      </button>
    </Card>
  );
};

export default MetaCallback;
