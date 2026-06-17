import React, { useEffect, useRef, useState } from 'react';
import {
  X, ExternalLink, TrendingUp, TrendingDown, Minus,
  Sparkles, AlertTriangle, CheckCircle,
  Send, Pause, Play, ArrowUpRight, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatNumber } from '../../lib/benchmarks';
import { classifyObjective, GOAL_META } from '../../lib/objective';
import type { Campaign } from '../../types';

// ─── Benchmark data per objective ─────────────────────────────
const BENCHMARKS: Record<string, { cpl?: number; cpm?: number; ctr?: number; roas?: number }> = {
  leads:    { cpl: 32, cpm: 11.2, ctr: 2.1 },
  sales:    { roas: 3.5, cpm: 14, ctr: 1.8 },
  traffic:  { ctr: 2.5, cpm: 8 },
  awareness:{ cpm: 6, ctr: 1.2 },
  default:  { cpm: 11, ctr: 1.8 },
};

// ─── Helpers ───────────────────────────────────────────────────
const callEdge = async (fn: string, body: object, accessToken: string) => {
  const url   = import.meta.env.VITE_SUPABASE_URL;
  const anon  = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res   = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: anon },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error || data));
  return data;
};

const renderMarkdown = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{part.slice(2, -2)}</strong>
      : part
  );

// ─── Metric vs Benchmark ────────────────────────────────────────
const MetricVsBenchmark: React.FC<{
  label: string; value: number; benchmark: number;
  unit: string; higherIsBetter: boolean; format?: 'currency' | 'percent' | 'multiplier';
}> = ({ label, value, benchmark, unit, higherIsBetter, format = 'currency' }) => {
  if (value <= 0) return null;
  const diff    = ((value - benchmark) / benchmark) * 100;
  const better  = higherIsBetter ? diff > 0 : diff < 0;
  const neutral = Math.abs(diff) < 5;
  const color   = neutral ? 'var(--text-secondary)' : better ? '#4ade80' : '#f87171';
  const Icon    = neutral ? Minus : better ? TrendingUp : TrendingDown;
  const fmt = (v: number) =>
    format === 'currency' ? formatCurrency(v) :
    format === 'percent'  ? `${v.toFixed(2)}%` :
    `${v.toFixed(2)}x`;
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-primary)' }}>{fmt(value)}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)' }}>{unit}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <Icon size={10} style={{ color }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color }}>{Math.abs(diff).toFixed(0)}% {better ? 'better' : 'worse'}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)' }}>(bench: {fmt(benchmark)})</span>
      </div>
    </div>
  );
};

// ─── Quick Actions ──────────────────────────────────────────────
const QuickActions: React.FC<{ campaign: Campaign; onAction: (msg: string) => void }> = ({ campaign, onAction }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const execAction = async (action: string, label: string, value?: number) => {
    setLoading(action);
    setFeedback('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const result = await callEdge('meta-action', {
        action,
        campaign_id_external: campaign.campaign_id_external,
        ad_account_id: campaign.ad_account_id,
        value,
      }, session.access_token);
      setFeedback(`✓ ${result.message || label + ' successful'}`);
      onAction(`Action "${label}" was executed: ${result.message}`);
    } catch (err) {
      setFeedback(`✗ ${err instanceof Error ? err.message : 'Action failed'}`);
    } finally {
      setLoading(null);
    }
  };

  const isActive = campaign.status === 'ACTIVE';

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Quick Actions
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isActive ? (
          <button
            onClick={() => execAction('pause_campaign', 'Pause')}
            disabled={loading !== null}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
              background: 'rgba(251,191,36,0.08)', border: '0.5px solid rgba(251,191,36,0.3)',
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 10, color: '#fbbf24',
            }}
          >
            {loading === 'pause_campaign' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Pause size={11} />}
            Pause Campaign
          </button>
        ) : (
          <button
            onClick={() => execAction('activate_campaign', 'Activate')}
            disabled={loading !== null}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
              background: 'rgba(74,222,128,0.08)', border: '0.5px solid rgba(74,222,128,0.3)',
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 10, color: '#4ade80',
            }}
          >
            {loading === 'activate_campaign' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={11} />}
            Activate Campaign
          </button>
        )}

        {isActive && (
          <button
            onClick={() => execAction('scale_budget', 'Scale +20%', 1.2)}
            disabled={loading !== null}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
              background: 'rgba(196,131,106,0.08)', border: '0.5px solid rgba(196,131,106,0.3)',
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--rose-gold)',
            }}
          >
            {loading === 'scale_budget' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowUpRight size={11} />}
            Scale Budget +20%
          </button>
        )}
      </div>
      {feedback && (
        <div style={{
          marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 10, padding: '6px 10px',
          background: feedback.startsWith('✓') ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
          border: `0.5px solid ${feedback.startsWith('✓') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          borderRadius: 5,
          color: feedback.startsWith('✓') ? '#4ade80' : '#f87171',
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
};

// ─── Campaign Chat ──────────────────────────────────────────────
interface ChatMsg { role: 'user' | 'assistant'; content: string }

const CampaignChat: React.FC<{ campaign: Campaign; initialMsg?: string }> = ({ campaign, initialMsg }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const cpm = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;

  const campaignSummary = [
    `Campaign: "${campaign.name}"`,
    `Status: ${campaign.status} | Objective: ${campaign.objective}`,
    `Spend: ${formatCurrency(campaign.spend)} | Impressions: ${formatNumber(campaign.impressions)}`,
    `CPM: ${formatCurrency(cpm)} | CTR: ${ctr.toFixed(2)}%`,
    campaign.leads > 0   ? `Leads: ${campaign.leads} | CPL: ${formatCurrency(campaign.cpl)}` : '',
    campaign.purchases > 0 ? `Purchases: ${campaign.purchases} | ROAS: ${campaign.roas.toFixed(2)}x | Revenue: ${formatCurrency(campaign.revenue)}` : '',
    campaign.frequency > 0 ? `Reach: ${formatNumber(campaign.reach)} | Frequency: ${campaign.frequency.toFixed(1)}x` : '',
  ].filter(Boolean).join('\n');

  const QUICK_QUESTIONS = [
    'How can I lower my CPL?',
    'Should I scale this campaign?',
    'What creative should I test next?',
    'Is my audience saturated?',
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const systemContext = `You are an expert Meta Ads strategist. The user is asking about a specific campaign. Here is the campaign data:

${campaignSummary}

Industry benchmarks: CPL €32, CPM €11.2, CTR 2.1% for beauty leads campaigns.

Be concise, specific to this campaign's numbers, and actionable. If asked about ads/ad-sets level data, explain you see campaign-level data and suggest what to check in Meta Ads Manager.`;

      const result = await callEdge('claude-chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        campaign_context_summary: systemContext,
      }, session.access_token);

      const assistantContent = typeof result.content === 'string'
        ? result.content
        : result.content?.[0]?.text || 'No response';

      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Failed'}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Handle initialMsg from actions
  useEffect(() => {
    if (initialMsg) sendMessage(`[System] ${initialMsg}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMsg]);

  return (
    <div style={{ borderTop: '0.5px solid var(--app-border)', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Sparkles size={12} style={{ color: 'var(--rose-gold)' }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>
          Campaign Intelligence Chat
        </span>
      </div>

      {/* Quick suggestions (shown only when no messages) */}
      {messages.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              style={{
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(196,131,106,0.06)', border: '0.5px solid rgba(196,131,106,0.2)',
                fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Message history */}
      {messages.length > 0 && (
        <div style={{
          maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10,
          paddingRight: 4,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
            }}>
              <div style={{
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, rgba(196,131,106,0.15), rgba(160,85,74,0.1))'
                  : 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${m.role === 'user' ? 'rgba(196,131,106,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                padding: '8px 12px',
                fontFamily: 'var(--font-sans)', fontSize: 11,
                color: 'var(--text-secondary)', lineHeight: 1.6,
              }}>
                {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: '10px 10px 10px 2px', padding: '8px 14px',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0,1,2].map(d => (
                  <div key={d} style={{
                    width: 5, height: 5, borderRadius: '50%', background: 'var(--rose-gold)',
                    animation: `pulse 1.2s ${d * 0.2}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Ask about this campaign…"
          disabled={loading}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid var(--app-border)',
            borderRadius: 8, padding: '8px 12px',
            fontFamily: 'var(--font-sans)', fontSize: 11,
            color: 'var(--text-primary)', outline: 'none',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: 'linear-gradient(135deg, var(--rose-gold), #a0554a)',
            border: 'none', borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {loading ? <Loader2 size={13} color="white" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} color="white" />}
        </button>
      </div>
    </div>
  );
};

// ─── Main Panel ─────────────────────────────────────────────────
interface Props { campaign: Campaign | null; onClose: () => void }

const CampaignDetailPanel: React.FC<Props> = ({ campaign, onClose }) => {
  const [visible, setVisible]     = useState(false);
  const [actionMsg, setActionMsg] = useState<string | undefined>();

  useEffect(() => {
    if (campaign) setTimeout(() => setVisible(true), 10);
    else { setVisible(false); setActionMsg(undefined); }
  }, [campaign]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!campaign) return null;

  const goal  = classifyObjective(campaign.objective);
  const meta  = GOAL_META[goal];
  const cpm   = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;
  const ctr   = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const bench = BENCHMARKS[goal] || BENCHMARKS.default;

  const statusColor = campaign.status === 'ACTIVE' ? '#4ade80' : campaign.status === 'PAUSED' ? '#fbbf24' : 'var(--text-hint)';
  const metaUrl     = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${campaign.ad_account_id}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.4)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(500px, 92vw)',
        background: 'var(--app-surface)',
        borderLeft: '0.5px solid var(--app-border)',
        zIndex: 51,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '0.5px solid var(--app-border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 9,
                background: meta.bg, color: meta.color,
                borderRadius: 3, padding: '1px 6px', border: `0.5px solid ${meta.color}22`,
              }}>
                {meta.emoji} {meta.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: statusColor, textTransform: 'uppercase' }}>
                ● {campaign.status}
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 400,
              color: 'var(--text-primary)', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {campaign.name}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <a
              href={metaUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                borderRadius: 4, border: '0.5px solid var(--app-border)',
                fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={10} />Ads Manager
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: '0.5px solid var(--app-border)',
                borderRadius: 4, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-hint)',
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* KPIs */}
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Key Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'rgba(196,131,106,0.06)', border: '0.5px solid rgba(196,131,106,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Total Spend</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--rose-gold)', marginTop: 4 }}>{formatCurrency(campaign.spend)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Impressions</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>{formatNumber(campaign.impressions)}</div>
              </div>
              {campaign.leads > 0 && <>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Leads</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: '#a78bfa', marginTop: 4 }}>{formatNumber(campaign.leads)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>CPL</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, marginTop: 4, color: campaign.cpl < (bench.cpl || 32) ? '#4ade80' : '#fbbf24' }}>
                    {formatCurrency(campaign.cpl)}
                  </div>
                </div>
              </>}
              {campaign.purchases > 0 && <>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>ROAS</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, marginTop: 4, color: campaign.roas >= 3 ? '#4ade80' : '#fbbf24' }}>{campaign.roas.toFixed(2)}x</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>Revenue</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: '#4ade80', marginTop: 4 }}>{formatCurrency(campaign.revenue)}</div>
                </div>
              </>}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>CPM</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>{cpm > 0 ? formatCurrency(cpm) : '—'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-muted)' }}>CTR</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>{ctr > 0 ? `${ctr.toFixed(2)}%` : '—'}</div>
              </div>
            </div>
          </div>

          {/* Benchmarks */}
          {campaign.spend > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>vs Industry Benchmark</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {campaign.cpl > 0 && bench.cpl && <MetricVsBenchmark label="CPL" value={campaign.cpl} benchmark={bench.cpl} unit="€/lead" higherIsBetter={false} />}
                {campaign.roas > 0 && bench.roas && <MetricVsBenchmark label="ROAS" value={campaign.roas} benchmark={bench.roas} unit="x" higherIsBetter format="multiplier" />}
                {cpm > 0 && bench.cpm && <MetricVsBenchmark label="CPM" value={cpm} benchmark={bench.cpm} unit="€/1k" higherIsBetter={false} />}
                {ctr > 0 && bench.ctr && <MetricVsBenchmark label="CTR" value={ctr} benchmark={bench.ctr} unit="%" higherIsBetter format="percent" />}
              </div>
            </div>
          )}

          {/* Performance signals */}
          {campaign.spend > 0 && (campaign.cpl > 0 || ctr > 0) && (
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Signals</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {campaign.cpl > 0 && bench.cpl && campaign.cpl < bench.cpl * 0.8 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.15)', borderRadius: 6 }}>
                    <CheckCircle size={12} style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      Excellent CPL — {Math.round((1 - campaign.cpl / bench.cpl) * 100)}% below benchmark. Consider scaling budget now.
                    </span>
                  </div>
                )}
                {campaign.cpl > 0 && bench.cpl && campaign.cpl > bench.cpl * 1.3 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(251,191,36,0.06)', border: '0.5px solid rgba(251,191,36,0.15)', borderRadius: 6 }}>
                    <AlertTriangle size={12} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      CPL {Math.round((campaign.cpl / bench.cpl - 1) * 100)}% above benchmark. Test new creatives or narrow audience.
                    </span>
                  </div>
                )}
                {ctr > 0 && bench.ctr && ctr < bench.ctr * 0.7 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(251,191,36,0.06)', border: '0.5px solid rgba(251,191,36,0.15)', borderRadius: 6 }}>
                    <AlertTriangle size={12} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      CTR {ctr.toFixed(2)}% below benchmark {bench.ctr}%. Creative refresh needed.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <QuickActions campaign={campaign} onAction={msg => setActionMsg(msg)} />

          {/* Campaign Chat */}
          <CampaignChat campaign={campaign} initialMsg={actionMsg} />

          {/* Details */}
          <div style={{ borderTop: '0.5px solid var(--app-border)', paddingTop: 16 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['ID', campaign.campaign_id_external],
                ['Last Sync', new Date(campaign.synced_at).toLocaleString()],
                ['Start', campaign.date_start ? new Date(campaign.date_start).toLocaleDateString() : '—'],
                ['Daily Budget', campaign.budget_daily ? formatCurrency(campaign.budget_daily) : '—'],
                ['Lifetime Budget', campaign.budget_lifetime ? formatCurrency(campaign.budget_lifetime) : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-hint)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default CampaignDetailPanel;
