import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ExternalLink, TrendingUp, TrendingDown, Minus,
  Sparkles, AlertTriangle, CheckCircle,
  Send, Pause, Play, ArrowUpRight, Loader2, PlusCircle, Maximize2, Minimize2,
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

// ─── Edge function helper ──────────────────────────────────────
const callEdge = async (fn: string, body: object, accessToken: string) => {
  const url  = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res  = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: anon },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error || data));
  return data;
};

// ─── Inline markdown parser (bold, italic) ────────────────────
const parseInline = (text: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ fontWeight: 500, color: 'var(--text)' }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</em>;
    return part;
  });

// ─── StyledAIOutput (§35) — replaces raw markdown ────────────
// Parses markdown to structured React elements.
// Detects "working" / "critical" headings → side-bordered blocks.
const StyledAIOutput: React.FC<{ content: string; compact?: boolean }> = ({ content, compact }) => {
  const baseFontSize   = compact ? 13 : 14;
  const headFontSize   = compact ? 13.5 : 15;
  const lineHeight     = 1.65;
  const paraGap        = compact ? 8 : 12;
  const headMarginTop  = compact ? 14 : 18;

  const isPositiveHeader = (t: string) => /work|performing|strength|winning|positive|good|great|excellent/i.test(t);
  const isNegativeHeader = (t: string) => /critical|issue|fix|concern|problem|warning|lower|worst|bad|fail/i.test(t);

  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const collectUntilHeading = (startIdx: number): [string[], number] => {
    const collected: string[] = [];
    let j = startIdx;
    while (j < lines.length && !lines[j].startsWith('#')) {
      collected.push(lines[j]);
      j++;
    }
    return [collected, j];
  };

  const renderBulletBlock = (items: string[], bulletColor: string) => (
    <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, idx) => {
        const text = item.replace(/^[-*]\s+/, '').trim();
        if (!text) return null;
        return (
          <li key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: baseFontSize, lineHeight, color: 'var(--text-2)', fontFamily: 'var(--font-ui)' }}>
            <span style={{ color: bulletColor, flexShrink: 0, marginTop: 4, fontSize: 6, lineHeight: 0 }}>●</span>
            <span>{parseInline(text)}</span>
          </li>
        );
      })}
    </ul>
  );

  while (i < lines.length) {
    const line = lines[i];

    // H2 / H3 headings
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const level = line.startsWith('### ') ? 3 : 2;
      const heading = line.slice(level + 1).trim();
      const isPos = isPositiveHeader(heading);
      const isNeg = isNegativeHeader(heading);

      if (isPos || isNeg) {
        // Collect block content
        const [blockLines, nextIdx] = collectUntilHeading(i + 1);
        const bulletItems = blockLines.filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
        const paraLines   = blockLines.filter(l => !l.trim().startsWith('-') && !l.trim().startsWith('*') && l.trim());

        const borderColor = isPos ? 'var(--green)' : isNeg ? 'var(--amber)' : 'var(--border)';
        const bgColor     = isPos ? 'var(--green-soft)' : isNeg ? 'var(--amber-soft)' : 'var(--surface-2)';
        const iconColor   = isPos ? 'var(--green)' : isNeg ? 'var(--amber)' : 'var(--text-3)';
        const bulletColor = isPos ? 'var(--green)' : isNeg ? 'var(--amber)' : 'var(--text-3)';
        const Icon        = isPos ? CheckCircle : AlertTriangle;

        nodes.push(
          <div key={nodes.length} style={{
            borderLeft: `3px solid ${borderColor}`,
            background: bgColor,
            borderRadius: '0 8px 8px 0',
            padding: '12px 14px',
            marginTop: headMarginTop,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
              <Icon size={13} style={{ color: iconColor, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: headFontSize, fontWeight: 500, color: 'var(--text)' }}>
                {heading}
              </span>
            </div>
            {paraLines.length > 0 && (
              <p style={{ margin: '0 0 8px', fontSize: baseFontSize, lineHeight, color: 'var(--text-2)', fontFamily: 'var(--font-ui)' }}>
                {parseInline(paraLines.join(' '))}
              </p>
            )}
            {bulletItems.length > 0 && renderBulletBlock(bulletItems, bulletColor)}
          </div>
        );
        i = nextIdx;
        continue;

      } else {
        // Regular heading
        nodes.push(
          <div key={nodes.length} style={{
            fontFamily: 'var(--font-ui)', fontSize: headFontSize, fontWeight: 500,
            color: 'var(--text)', marginTop: headMarginTop, marginBottom: 6,
          }}>
            {parseInline(heading)}
          </div>
        );
      }

    // Bullet list
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const items: string[] = [line];
      while (i + 1 < lines.length && (lines[i + 1].trim().startsWith('- ') || lines[i + 1].trim().startsWith('* '))) {
        i++;
        items.push(lines[i]);
      }
      nodes.push(
        <div key={nodes.length} style={{ marginBottom: paraGap }}>
          {renderBulletBlock(items, 'var(--accent)')}
        </div>
      );

    // Empty line — paragraph break
    } else if (line.trim() === '') {
      // just space

    // Paragraph text
    } else if (line.trim()) {
      // Accumulate contiguous non-empty non-special lines
      const paraLines = [line];
      while (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].startsWith('#') && !lines[i + 1].trim().startsWith('-') && !lines[i + 1].trim().startsWith('*')) {
        i++;
        paraLines.push(lines[i]);
      }
      nodes.push(
        <p key={nodes.length} style={{
          margin: `0 0 ${paraGap}px`,
          fontFamily: 'var(--font-ui)', fontSize: baseFontSize,
          lineHeight, color: 'var(--text-2)',
        }}>
          {parseInline(paraLines.join(' '))}
        </p>
      );
    }

    i++;
  }

  return (
    <div style={{ fontFamily: 'var(--font-ui)', fontSize: baseFontSize, lineHeight, color: 'var(--text-2)' }}>
      {nodes}
    </div>
  );
};

// ─── Metric vs Benchmark card (§35.2) ─────────────────────────
// All colors via CSS variables.
const MetricVsBenchmark: React.FC<{
  label: string; value: number; benchmark: number;
  unit: string; higherIsBetter: boolean; format?: 'currency' | 'percent' | 'multiplier';
}> = ({ label, value, benchmark, unit, higherIsBetter, format = 'currency' }) => {
  if (value <= 0) return null;
  const diff    = ((value - benchmark) / benchmark) * 100;
  const better  = higherIsBetter ? diff > 0 : diff < 0;
  const neutral = Math.abs(diff) < 5;

  // CSS variable-based colors (§2 tokens)
  const tagBg    = neutral ? 'var(--surface-2)' : better ? 'var(--green-soft)' : 'var(--red-soft)';
  const tagColor = neutral ? 'var(--text-3)'    : better ? 'var(--green)'      : 'var(--red)';
  const Icon     = neutral ? Minus : better ? TrendingUp : TrendingDown;

  const fmt = (v: number) =>
    format === 'currency' ? formatCurrency(v) :
    format === 'percent'  ? `${v.toFixed(2)}%` :
    `${v.toFixed(2)}x`;

  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border-soft)',
      borderRadius: 10, padding: '13px 15px',
    }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>
          {fmt(value)}
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-3)' }}>{unit}</span>
        {/* Comparison tag */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: tagBg, color: tagColor,
          borderRadius: 20, padding: '2px 8px',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
        }}>
          <Icon size={9} />
          {Math.abs(diff).toFixed(0)}% {better ? 'better' : neutral ? '~same' : 'worse'}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
        Benchmark: {fmt(benchmark)}
      </div>
    </div>
  );
};

// ─── Signal alert (§35.4 + §14) — CSS vars ────────────────────
const SignalAlert: React.FC<{ type: 'good' | 'warning' | 'error'; children: React.ReactNode }> = ({ type, children }) => {
  const bg    = type === 'good'    ? 'var(--green-soft)'     : type === 'warning' ? 'var(--champagne-soft)' : 'var(--red-soft)';
  const color = type === 'good'    ? 'var(--green)'          : type === 'warning' ? 'var(--champagne)'      : 'var(--red)';
  const Icon  = type === 'good'    ? CheckCircle             : AlertTriangle;
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      padding: '9px 12px', background: bg, borderRadius: 8,
    }}>
      <Icon size={12} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{children}</span>
    </div>
  );
};

// ─── Status pill ──────────────────────────────────────────────
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status === 'ACTIVE';
  const isPaused = status === 'PAUSED';
  const bg    = isActive ? 'var(--green-soft)'     : isPaused ? 'var(--champagne-soft)' : 'var(--surface-2)';
  const color = isActive ? 'var(--green)'           : isPaused ? 'var(--champagne)'      : 'var(--text-3)';
  const dot   = isActive ? 'var(--green)'           : isPaused ? 'var(--champagne)'      : 'var(--text-3)';
  const label = isActive ? 'Active' : isPaused ? 'Paused' : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 30,
      background: bg, color,
      fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
};

// ─── Quick Actions (§35.5) — CSS variable colors ──────────────
const QuickActions: React.FC<{ campaign: Campaign; onAction: (msg: string) => void }> = ({ campaign, onAction }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const execAction = async (action: string, label: string, value?: number) => {
    setLoading(action); setFeedback('');
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
    } finally { setLoading(null); }
  };

  const isActive = campaign.status === 'ACTIVE';

  // Secondary-style buttons with colored borders (§35.5)
  const actionBtn = (
    label: string, icon: React.ReactNode, onClick: () => void,
    borderColor: string, textColor: string, disabled = false
  ) => (
    <button
      onClick={onClick}
      disabled={disabled || loading !== null}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 9,
        background: 'var(--surface)',
        border: `1px solid ${borderColor}`,
        color: textColor,
        fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
        cursor: disabled || loading !== null ? 'not-allowed' : 'pointer',
        opacity: disabled || loading !== null ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
        Quick Actions
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isActive
          ? actionBtn('Pause Campaign',
              loading === 'pause_campaign' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Pause size={11} />,
              () => execAction('pause_campaign', 'Pause'),
              'var(--champagne)', 'var(--champagne)')
          : actionBtn('Activate Campaign',
              loading === 'activate_campaign' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={11} />,
              () => execAction('activate_campaign', 'Activate'),
              'var(--green)', 'var(--green)')}

        {isActive && actionBtn('Scale +20%',
          loading === 'scale_budget' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowUpRight size={11} />,
          () => execAction('scale_budget', 'Scale +20%', 1.2),
          'var(--accent)', 'var(--accent)')}

        {actionBtn('New from this',
          <PlusCircle size={11} />,
          () => navigate('/creative-studio', {
            state: { prefill: {
              brandId: campaign.brand_id,
              conversionType: campaign.objective?.toLowerCase().includes('lead') ? 'leads'
                : campaign.objective?.toLowerCase().includes('sale') ? 'ecommerce' : 'leads',
              target_countries: ['IT'], age_min: 25, age_max: 55, gender: 'all',
            }}
          }),
          'var(--blue)', 'var(--blue)')}
      </div>
      {feedback && (
        <div style={{
          marginTop: 8, padding: '7px 11px', borderRadius: 7,
          background: feedback.startsWith('✓') ? 'var(--green-soft)' : 'var(--red-soft)',
          border: `1px solid ${feedback.startsWith('✓') ? 'var(--green)' : 'var(--red)'}`,
          fontFamily: 'var(--font-ui)', fontSize: 11,
          color: feedback.startsWith('✓') ? 'var(--green)' : 'var(--red)',
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
};

// ─── Campaign Chat (§35.6) ─────────────────────────────────────
interface ChatMsg { role: 'user' | 'assistant'; content: string }

const CampaignChat: React.FC<{ campaign: Campaign; initialMsg?: string }> = ({ campaign, initialMsg }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const cpm = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100  : 0;

  const campaignSummary = [
    `Campaign: "${campaign.name}"`,
    `Status: ${campaign.status} | Objective: ${campaign.objective}`,
    `Spend: ${formatCurrency(campaign.spend)} | Impressions: ${formatNumber(campaign.impressions)}`,
    `CPM: ${formatCurrency(cpm)} | CTR: ${ctr.toFixed(2)}%`,
    campaign.leads     > 0 ? `Leads: ${campaign.leads} | CPL: ${formatCurrency(campaign.cpl)}` : '',
    campaign.purchases > 0 ? `Purchases: ${campaign.purchases} | ROAS: ${campaign.roas.toFixed(2)}x | Revenue: ${formatCurrency(campaign.revenue)}` : '',
    campaign.frequency > 0 ? `Reach: ${formatNumber(campaign.reach)} | Frequency: ${campaign.frequency.toFixed(1)}x` : '',
  ].filter(Boolean).join('\n');

  const QUICK_QUESTIONS = [
    'How can I lower my CPL?',
    'Should I scale this campaign?',
    'What creative should I test next?',
    'Is my audience saturated?',
  ];

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const systemContext = `You are an expert Meta Ads strategist. The user is asking about a specific campaign.\n\n${campaignSummary}\n\nIndustry benchmarks: CPL €32, CPM €11.2, CTR 2.1% for beauty leads campaigns.\n\nBe concise, specific, and actionable. Format your response with markdown: use ## for sections, - for bullet points. Start with a "## What's working" section if there are positives, then "## What to fix" for issues.`;

      const result = await callEdge('claude-chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        campaign_context_summary: systemContext,
      }, session.access_token);

      const assistantContent = typeof result.content === 'string'
        ? result.content
        : result.content?.[0]?.text || 'No response';

      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Analysis unavailable: ${err instanceof Error ? err.message : 'Connection failed'}` }]);
    } finally { setLoading(false); }
  }, [messages, loading, campaignSummary]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (initialMsg) sendMessage(`[System] ${initialMsg}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMsg]);

  return (
    <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 18 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <Sparkles size={12} style={{ color: 'var(--accent)' }} />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
          Campaign Intelligence Chat
        </span>
      </div>

      {/* Quick suggestion pills */}
      {messages.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              style={{
                padding: '5px 11px', borderRadius: 20,
                background: 'var(--surface-2)', border: '1px solid var(--border-soft)',
                fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-2)',
                cursor: 'pointer', transition: 'all 0.15s',
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
          maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          gap: 10, marginBottom: 12, paddingRight: 2,
        }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
            }}>
              {m.role === 'user' ? (
                /* User bubble: accent-soft bg, right-aligned (§35.6) */
                <div style={{
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent)',
                  borderRadius: '12px 12px 2px 12px',
                  padding: '9px 13px',
                  fontFamily: 'var(--font-ui)', fontSize: 13,
                  color: 'var(--text)', lineHeight: 1.5,
                }}>
                  {m.content}
                </div>
              ) : (
                /* AI bubble: surface-2 bg, styled output (§35.6) */
                <div style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '11px 14px',
                }}>
                  <StyledAIOutput content={m.content} compact />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border-soft)',
                borderRadius: '12px 12px 12px 2px', padding: '10px 16px',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{
                    width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)',
                    animation: `pulse 1.2s ${d * 0.2}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Sticky input row (§35.6: dark icon on --accent bg) */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Ask about this campaign…"
          disabled={loading}
          style={{
            flex: 1, background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: 9,
            padding: '9px 13px',
            fontFamily: 'var(--font-ui)', fontSize: 13,
            color: 'var(--text)', outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
        />
        {/* Send button — dark icon on accent bg (§34, §35.6) */}
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? 'var(--border)' : 'var(--accent)',
            border: 'none', borderRadius: 9, width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0, transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!loading && input.trim()) (e.currentTarget.style.background = 'var(--accent-deep)'); }}
          onMouseLeave={e => { if (!loading && input.trim()) (e.currentTarget.style.background = 'var(--accent)'); }}
        >
          {loading
            ? <Loader2 size={14} color="#2A1A12" style={{ animation: 'spin 1s linear infinite' }} />
            : <Send size={14} color="#2A1A12" />}
        </button>
      </div>
    </div>
  );
};

// ─── Main Drawer (§33) ──────────────────────────────────────────
interface Props { campaign: Campaign | null; onClose: () => void }

const CampaignDetailPanel: React.FC<Props> = ({ campaign, onClose }) => {
  const [visible,   setVisible]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);   // 480px → 720px
  const [actionMsg, setActionMsg] = useState<string | undefined>();

  useEffect(() => {
    if (campaign) { setExpanded(false); setTimeout(() => setVisible(true), 10); }
    else           { setVisible(false); setActionMsg(undefined); }
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
  const ctr   = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100  : 0;
  const bench = BENCHMARKS[goal] || BENCHMARKS.default;

  const metaUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${campaign.ad_account_id}`;

  // §33: 480px default, 720px expanded
  const drawerWidth = expanded ? 720 : 480;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.45)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Drawer panel (§33) */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: `min(${drawerWidth}px, 96vw)`,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        /* §33: deep shadow */
        boxShadow: '0 0 40px rgba(0,0,0,0.50)',
        zIndex: 51,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), width 0.25s ease',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* §33: Sticky header */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
          background: 'var(--surface)',
          position: 'sticky', top: 0, zIndex: 2,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Goal badge + status pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-ui)', fontSize: 10,
                background: meta.bg, color: meta.color,
                borderRadius: 5, padding: '2px 8px',
                border: `0.5px solid ${meta.color}22`, fontWeight: 500,
              }}>
                {meta.emoji} {meta.label}
              </span>
              <StatusPill status={campaign.status} />
            </div>
            {/* §33: Campaign name in Fraunces 20px */}
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500,
              color: 'var(--text)', margin: 0, letterSpacing: -0.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {campaign.name}
            </h2>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <a
              href={metaUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                borderRadius: 7, border: '1px solid var(--border)',
                fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-2)',
                textDecoration: 'none', transition: 'all 0.15s',
              }}
            >
              <ExternalLink size={11} />
              Ads Manager
            </a>
            {/* §33: Expand/Collapse button (ti-arrows-diagonal equiv → Maximize2/Minimize2) */}
            <button
              onClick={() => setExpanded(prev => !prev)}
              title={expanded ? 'Collapse' : 'Expand to 720px'}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 7, width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s',
              }}
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 7, width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s',
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Scrollable body — padding 22px (§33) */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '22px 24px 32px',
          display: 'flex', flexDirection: 'column', gap: 22,
        }}>

          {/* ── Key Metrics grid ────────────────────────── */}
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
              Key Metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {/* Spend — hero metric */}
              <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 11, padding: '13px 15px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Spend</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--accent)' }}>{formatCurrency(campaign.spend)}</div>
              </div>
              {/* Impressions */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '13px 15px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Impressions</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>{formatNumber(campaign.impressions)}</div>
              </div>
              {/* Leads + CPL */}
              {campaign.leads > 0 && <>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '13px 15px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leads</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--green)' }}>{formatNumber(campaign.leads)}</div>
                </div>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '13px 15px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CPL</div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, marginTop: 0,
                    color: campaign.cpl < (bench.cpl || 32) ? 'var(--green)' : 'var(--champagne)',
                  }}>{formatCurrency(campaign.cpl)}</div>
                </div>
              </>}
              {/* ROAS + Revenue */}
              {campaign.purchases > 0 && <>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '13px 15px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ROAS</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: campaign.roas >= 3 ? 'var(--green)' : 'var(--champagne)' }}>
                    {campaign.roas.toFixed(2)}x
                  </div>
                </div>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '13px 15px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--green)' }}>{formatCurrency(campaign.revenue)}</div>
                </div>
              </>}
              {/* CPM + CTR */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '13px 15px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CPM</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: cpm > 0 ? 'var(--text-2)' : 'var(--text-3)' }}>
                  {cpm > 0 ? formatCurrency(cpm) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 11, padding: '13px 15px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CTR</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: ctr > 0 ? 'var(--text-2)' : 'var(--text-3)' }}>
                  {ctr > 0 ? `${ctr.toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* ── vs Industry Benchmark (§35.2) ──────────── */}
          {campaign.spend > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
                vs Industry Benchmark
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {campaign.cpl > 0 && bench.cpl  && <MetricVsBenchmark label="CPL"  value={campaign.cpl}   benchmark={bench.cpl}  unit="€/lead" higherIsBetter={false} />}
                {campaign.roas > 0 && bench.roas && <MetricVsBenchmark label="ROAS" value={campaign.roas}  benchmark={bench.roas} unit="x"     higherIsBetter format="multiplier" />}
                {cpm > 0 && bench.cpm            && <MetricVsBenchmark label="CPM"  value={cpm}            benchmark={bench.cpm}  unit="€/1k"  higherIsBetter={false} />}
                {ctr > 0 && bench.ctr            && <MetricVsBenchmark label="CTR"  value={ctr}            benchmark={bench.ctr}  unit="%"     higherIsBetter format="percent" />}
              </div>
            </div>
          )}

          {/* ── Signals (§35.4) — CSS var colors ──────── */}
          {campaign.spend > 0 && (campaign.cpl > 0 || ctr > 0) && (
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                Signals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {campaign.cpl > 0 && bench.cpl && campaign.cpl < bench.cpl * 0.8 && (
                  <SignalAlert type="good">
                    Excellent CPL — {Math.round((1 - campaign.cpl / bench.cpl) * 100)}% below benchmark. Consider scaling budget now.
                  </SignalAlert>
                )}
                {campaign.cpl > 0 && bench.cpl && campaign.cpl > bench.cpl * 1.3 && (
                  <SignalAlert type="warning">
                    CPL {Math.round((campaign.cpl / bench.cpl - 1) * 100)}% above benchmark. Test new creatives or narrow the audience.
                  </SignalAlert>
                )}
                {ctr > 0 && bench.ctr && ctr < bench.ctr * 0.7 && (
                  <SignalAlert type="warning">
                    CTR {ctr.toFixed(2)}% is below benchmark {bench.ctr}%. A creative refresh is needed.
                  </SignalAlert>
                )}
                {cpm > 0 && bench.cpm && cpm > bench.cpm * 1.4 && (
                  <SignalAlert type="error">
                    CPM {formatCurrency(cpm)} is {Math.round((cpm / bench.cpm - 1) * 100)}% above benchmark. Audience may be too narrow.
                  </SignalAlert>
                )}
              </div>
            </div>
          )}

          {/* ── Generate AI Analysis CTA (§34: dark text on accent) ── */}
          <button
            onClick={() => setActionMsg('Please give me a full performance analysis of this campaign with specific recommendations. Use ## What\'s working and ## What to fix sections with bullet points.')}
            style={{
              background: 'var(--accent)',
              color: '#2A1A12',        /* §34: dark-ink text on rose-gold */
              borderRadius: 10,
              width: '100%',
              fontFamily: 'var(--font-ui)',
              fontSize: 13, fontWeight: 500,
              padding: '12px 16px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-deep)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {/* Icon also dark (§34) */}
            <Sparkles size={14} color="#2A1A12" />
            Generate AI Analysis
          </button>

          {/* ── Quick Actions (§35.5) ────────────────── */}
          <QuickActions campaign={campaign} onAction={msg => setActionMsg(msg)} />

          {/* ── Campaign Chat (§35.6) ────────────────── */}
          <CampaignChat campaign={campaign} initialMsg={actionMsg} />

          {/* ── Details ──────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 18 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
              Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Campaign ID', campaign.campaign_id_external],
                ['Last Sync',   new Date(campaign.synced_at).toLocaleString()],
                ['Start date',  campaign.date_start ? new Date(campaign.date_start).toLocaleDateString() : '—'],
                ['Daily Budget', campaign.budget_daily   ? formatCurrency(campaign.budget_daily)   : '—'],
                ['Lifetime Budget', campaign.budget_lifetime ? formatCurrency(campaign.budget_lifetime) : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', textAlign: 'right' }}>{v}</span>
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
