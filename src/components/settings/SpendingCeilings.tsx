import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

// The daily spend ceiling per ad account. meta-action refuses any action that would take the account's
// total active daily budget above it, and refuses budget increases entirely while no ceiling is set.
interface Row { id: string; account_name: string | null; account_id: string; ceiling: string; step: string; saved: boolean }

export function SpendingCeilings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: accounts } = await supabase
        .from('ad_accounts').select('id, account_name, account_id').eq('platform', 'meta').eq('user_id', user.id);
      const { data: limits } = await supabase
        .from('account_limits').select('ad_account_id, max_daily_spend, max_change_pct_per_action');
      const byId = new Map((limits ?? []).map(l => [l.ad_account_id, l]));
      setRows((accounts ?? []).map(a => {
        const l = byId.get(a.id);
        return { id: a.id, account_name: a.account_name, account_id: a.account_id,
          ceiling: l ? String(l.max_daily_spend) : '', step: l ? String(l.max_change_pct_per_action) : '20', saved: !!l };
      }));
    })();
  }, [user]);

  const save = async (r: Row) => {
    const ceiling = Number(r.ceiling), step = Number(r.step);
    if (!(ceiling > 0) || !(step > 0 && step <= 100)) { setMessage('Enter a ceiling above 0 and a step between 1 and 100%.'); return; }
    const { error } = await supabase.from('account_limits').upsert({
      ad_account_id: r.id, max_daily_spend: ceiling, max_change_pct_per_action: step,
      set_by: user!.id, updated_at: new Date().toISOString(),
    });
    setMessage(error ? `Couldn't save: ${error.message}` : `Saved for ${r.account_name ?? r.account_id}.`);
    if (!error) setRows(rs => rs.map(x => (x.id === r.id ? { ...x, saved: true } : x)));
  };

  const set = (id: string, patch: Partial<Row>) => setRows(rs => rs.map(x => (x.id === id ? { ...x, ...patch, saved: false } : x)));

  return (
    <div className="card">
      <div className="settings-section-title"><Shield size={13} strokeWidth={1.5} />Spending ceilings</div>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
        Rouge never adds budget without your explicit approval, and never beyond the ceiling you set. Until an
        account has a ceiling, Rouge won't raise any budget in it.
      </p>
      {rows.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>No Meta ad accounts connected.</p>
      )}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(r => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px 90px auto', gap: 8, alignItems: 'end' }} className="ceiling-row">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.account_name ?? r.account_id}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{r.saved ? 'ceiling set' : 'no ceiling saved'}</div>
            </div>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Daily ceiling</span>
              <input className="form-input" inputMode="decimal" value={r.ceiling} onChange={e => set(r.id, { ceiling: e.target.value })} placeholder="e.g. 150" />
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Max step %</span>
              <input className="form-input" inputMode="decimal" value={r.step} onChange={e => set(r.id, { step: e.target.value })} />
            </label>
            <button className="btn btn-secondary btn-sm" onClick={() => save(r)} disabled={r.saved}>Save</button>
          </div>
        ))}
      </div>
      {message && <p role="status" style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 10 }}>{message}</p>}
      <style>{`@media (max-width: 600px) { .ceiling-row { grid-template-columns: 1fr 1fr !important; } .ceiling-row > :first-child { grid-column: 1 / -1; } }`}</style>
    </div>
  );
}
