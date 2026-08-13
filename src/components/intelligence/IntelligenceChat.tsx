import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, MessageSquare, Plus, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';

import type { ChatMessage, Brand, Campaign } from '../../types';
import { sendChatMessage, ChatLimitError, type CampaignContext, type ActionProposal } from '../../lib/claude-api';
import { useActiveAccount } from '../../contexts/ActiveAccountContext';
import { supabase } from '../../lib/supabase';

interface IntelligenceChatProps {
  brand: Brand;
  campaigns: Campaign[];
  sessionId?: string;
  initialMessages?: ChatMessage[];
  compact?: boolean;
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

const QUICK_QUESTIONS = [
  'Why is my ROAS dropping?',
  'Should I scale this campaign?',
  'What audience should I test next?',
  'Am I ready to increase budget?',
];

// ─── Light token palette (inline-only, no CSS vars) ──────────────────────────
const T = {
  bgDeep:      '#F8F6F3',
  bgContainer: '#FFFFFF',
  border:      '0.5px solid #E8E4DF',
  borderColor: '#E8E4DF',
  accent:      '#C4836A',
  accentHover: '#A86B52',
  textPrimary: '#1A1410',
  textBody:    '#3D2B1F',
  textMuted:   '#8B6050',
  textHint:    '#A09890',
  radius:      '5px',
  transition:  'all 0.18s ease',
} as const;

const IntelligenceChat: React.FC<IntelligenceChatProps> = ({
  brand,
  campaigns,
  initialMessages = [],
  compact = false,
  onMessagesChange,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredQuick, setHoveredQuick] = useState<string | null>(null);
  const [sendHovered, setSendHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionProposal | null>(null);
  const [executingAction, setExecutingAction] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { activeAccount } = useActiveAccount();

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist messages to DB via parent callback (debounced 1.5 s)
  useEffect(() => {
    if (!onMessagesChange || messages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onMessagesChange(messages);
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, onMessagesChange]);

  /** Build a rich human-readable context summary from campaigns */
  const buildCampaignContextSummary = (camps: Campaign[]): string => {
    if (!camps || camps.length === 0) return '';
    const lines: string[] = [
      `The user has ${camps.length} campaign(s) synced. Full performance data:`,
      '',
    ];
    camps.forEach((c) => {
      const parts: string[] = [`• ${c.name} [${c.status}] | Objective: ${c.objective}`];
      parts.push(`  Spend: €${(c.spend ?? 0).toFixed(2)} | Impressions: ${(c.impressions ?? 0).toLocaleString()} | Clicks: ${(c.clicks ?? 0).toLocaleString()}`);
      // Traffic: Landing Page Views is the primary conversion (more accurate than clicks)
      if ((c.page_views ?? 0) > 0) {
        parts.push(`  Landing Page Views: ${(c.page_views ?? 0).toLocaleString()} (primary conversion for Traffic objective)`);
      }
      if ((c.roas ?? 0) > 0 || (c.purchases ?? 0) > 0) {
        parts.push(`  Purchases: ${c.purchases ?? 0} | Revenue: €${(c.revenue ?? 0).toFixed(2)} | ROAS: ${(c.roas ?? 0).toFixed(2)}x`);
      }
      // Sales: Add to Cart is a key funnel metric
      if ((c.atc ?? 0) > 0) {
        const atcToP = (c.purchases ?? 0) > 0 ? ((c.purchases / c.atc) * 100).toFixed(0) + '%' : 'n/a';
        parts.push(`  Add to Cart (ATC): ${(c.atc ?? 0).toLocaleString()} | ATC-to-Purchase rate: ${atcToP}`);
      }
      if ((c.leads ?? 0) > 0) {
        const cpl = c.cpl ?? ((c.leads > 0 && c.spend > 0) ? c.spend / c.leads : 0);
        parts.push(`  Leads: ${c.leads} | CPL: €${cpl.toFixed(2)} | Qualified leads: ${c.qualified_leads ?? 0} | Lead quality rate: ${((c.lead_quality_rate ?? 0) * 100).toFixed(0)}%`);
      }
      if ((c.bookings ?? 0) > 0) {
        parts.push(`  Bookings: ${c.bookings}`);
      }
      if ((c.frequency ?? 0) > 0 || (c.reach ?? 0) > 0) {
        parts.push(`  Reach: ${(c.reach ?? 0).toLocaleString()} | Frequency: ${(c.frequency ?? 0).toFixed(2)}x`);
      }
      if (c.budget_daily) {
        parts.push(`  Daily budget: €${c.budget_daily.toFixed(2)}`);
      }
      lines.push(parts.join('\n'));
    });
    return lines.join('\n');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Build rich campaign context — full KPIs
      const richCampaigns: CampaignContext[] = (campaigns ?? []).map((c) => ({
        name: c.name,
        status: c.status,
        objective: c.objective,
        spend: c.spend ?? 0,
        impressions: c.impressions ?? 0,
        clicks: c.clicks ?? 0,
        purchases: c.purchases ?? 0,
        revenue: c.revenue ?? 0,
        roas: c.roas ?? 0,
        leads: c.leads ?? 0,
        cpl: c.cpl ?? 0,
        lead_quality_rate: c.lead_quality_rate ?? 0,
        qualified_leads: c.qualified_leads ?? 0,
        bookings: c.bookings ?? 0,
        reach: c.reach ?? 0,
        frequency: c.frequency ?? 0,
        budget_daily: c.budget_daily,
      }));

      const { content, action_proposal } = await sendChatMessage({
        brand_id: brand.id,
        messages: apiMessages,
        campaigns: richCampaigns,
        campaign_context_summary: buildCampaignContextSummary(campaigns ?? []),
        conversion_type: activeAccount?.conversion_type ?? 'ecommerce',
      });

      // Store action proposal for confirmation UI
      if (action_proposal) setPendingAction(action_proposal);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      // ── Chat limit reached ───────────────────────────────
      if (err instanceof ChatLimitError) {
        const limitMsg: ChatMessage = {
          role: 'assistant',
          content: `__LIMIT__${err.used}__${err.limit}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, limitMsg]);
      } else {
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: 'Unable to connect to the Intelligence Engine. Please check your API configuration.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Execute a Heinrick-proposed action ────────────────────────────────────
  const executeAction = async (proposal: ActionProposal, confirmed: boolean) => {
    setPendingAction(null);
    if (!confirmed) {
      const dismissMsg: ChatMessage = {
        role: 'assistant',
        content: 'Understood — action cancelled. Let me know if you change your mind.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, dismissMsg]);
      return;
    }

    setExecutingAction(true);
    try {
      // Route monitored action types through log-direct-action (baseline + monitoring).
      // Non-monitored types (create_campaign, duplicate_ad, duplicate_adset) stay on meta-action.
      const monitoredActions = ['pause_campaign', 'activate_campaign', 'scale_budget'];
      const useMonitored = monitoredActions.includes(proposal.type) && proposal.campaign_id_external;

      let data: Record<string, unknown> | null = null;
      let error: { message: string } | null = null;

      if (useMonitored) {
        // We need campaign_id (internal UUID). Look it up from campaigns by campaign_id_external.
        const { data: campRow } = await supabase
          .from('campaigns')
          .select('id')
          .eq('campaign_id_external', proposal.campaign_id_external!)
          .single();

        const body: Record<string, unknown> = {
          action:               proposal.type,
          ad_account_id:        proposal.ad_account_id,
          campaign_id_external: proposal.campaign_id_external,
          campaign_id:          campRow?.id ?? null,
          brand_id:             brand.id,
          source:               'ai_chat',
          ...((proposal.params as Record<string, unknown> | undefined) ?? {}),
        };
        const res = await supabase.functions.invoke('log-direct-action', { body });
        data  = res.data;
        error = res.error;
      } else {
        const body: Record<string, unknown> = {
          action:               proposal.type,
          ad_account_id:        proposal.ad_account_id,
          campaign_id_external: proposal.campaign_id_external,
          ad_id_external:       proposal.ad_id_external,
          params:               proposal.params,
          value:                (proposal.params as Record<string, unknown> | undefined)?.value,
        };
        const res = await supabase.functions.invoke('meta-action', { body });
        data  = res.data;
        error = res.error;
      }

      const resultMsg: ChatMessage = {
        role: 'assistant',
        content: error
          ? `❌ Action failed: ${error.message}`
          : (data?.message as string) ?? '✅ Action completed successfully.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, resultMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: `❌ Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setExecutingAction(false);
    }
  };


  // Render AI message content — bolds **…** patterns using DM Mono accent
  const renderAIContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong
            key={idx}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              color: T.accent,
            }}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: T.bgContainer,
        border: T.border,
        borderRadius: '8px',
        overflow: 'hidden',
        height: '100%',
        minHeight: compact ? 400 : 500,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 16px',
          background: T.bgContainer,
          borderBottom: T.border,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div
            style={{
              width: 26,
              height: 26,
              background: T.bgDeep,
              border: T.border,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.accent,
              flexShrink: 0,
            }}
          >
            <Sparkles size={12} strokeWidth={1.5} />
          </div>

          <div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 13,
                fontWeight: 400,
                color: T.textPrimary,
                lineHeight: 1.2,
              }}
            >
              Intelligence Engine
            </div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 8,
                fontWeight: 300,
                color: T.textHint,
                letterSpacing: '0.08em',
                marginTop: 2,
                textTransform: 'uppercase',
              }}
            >
              Active brand context · 9yr Beauty benchmark data
            </div>
          </div>

          {/* Campaign context badge — light amber */}
          {campaigns && campaigns.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#FAEEDA',
                border: '0.5px solid rgba(196,131,106,0.25)',
                borderRadius: 4,
                padding: '3px 8px',
                marginLeft: 8,
              }}
            >
              <Database size={9} strokeWidth={1.5} style={{ color: '#633806' }} />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8,
                  fontWeight: 400,
                  color: '#633806',
                  letterSpacing: '0.04em',
                }}
              >
                {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} loaded
              </span>
            </div>
          )}
        </div>

        {/* New button */}
        <button
          onClick={() => setMessages([])}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: T.bgDeep,
            border: T.border,
            borderRadius: T.radius,
            padding: '4px 9px',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 9,
            fontWeight: 300,
            color: T.textMuted,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: T.transition,
          }}
        >
          <Plus size={10} />
          New
        </button>
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: T.bgDeep,
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '32px 16px',
              gap: 8,
              flex: 1,
            }}
          >
            {/* Icon circle */}
            <div
              style={{
                width: 44,
                height: 44,
                background: 'rgba(196,131,106,0.1)',
                border: '0.5px solid rgba(196,131,106,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.accent,
                marginBottom: 6,
              }}
            >
              <MessageSquare size={20} strokeWidth={1.5} />
            </div>

            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 13,
                fontWeight: 400,
                color: T.textPrimary,
                margin: 0,
              }}
            >
              Ask the Intelligence Engine
            </p>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 9,
                fontWeight: 300,
                color: T.textHint,
                maxWidth: 240,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Full context of your brand, campaigns, and 9 years of benchmark data
            </p>

            {/* Suggested questions chips */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                width: '100%',
                maxWidth: 280,
                marginTop: 10,
              }}
            >
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onMouseEnter={() => setHoveredQuick(q)}
                  onMouseLeave={() => setHoveredQuick(null)}
                  onClick={() => sendMessage(q)}
                  style={{
                    background: hoveredQuick === q ? 'rgba(196,131,106,0.05)' : '#FDF6F0',
                    border: hoveredQuick === q ? `0.5px solid ${T.accent}` : '0.5px solid #C4836A',
                    borderRadius: T.radius,
                    padding: '7px 12px',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 10,
                    fontWeight: 300,
                    color: '#C4836A',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: T.transition,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 3,
                border: T.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                // user avatar stays dark (intentional contrast), AI avatar light
                background: msg.role === 'user' ? '#1A1410' : T.bgContainer,
                color: msg.role === 'user' ? '#FFFFFF' : T.accent,
              }}
            >
              {msg.role === 'user'
                ? <User size={11} strokeWidth={1.5} />
                : <Sparkles size={11} strokeWidth={1.5} />}
            </div>

            {/* Body */}
            <div
              style={{
                maxWidth: msg.role === 'user' ? 'calc(80%)' : '90%',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Bubble */}
              <div
                style={
                  msg.role === 'user'
                    ? {
                        // User bubble: dark for intentional contrast
                        background: '#1A1410',
                        color: '#FFFFFF',
                        borderRadius: T.radius,
                        padding: '8px 12px',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 11,
                        fontWeight: 400,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        marginLeft: '20%',
                      }
                    : {
                        // AI bubble: white with light border
                        background: '#FFFFFF',
                        border: '0.5px solid #E8E4DF',
                        color: T.textBody,
                        borderRadius: T.radius,
                        padding: '9px 13px',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 11,
                        fontWeight: 300,
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        marginRight: '10%',
                      }
                }
              >
                {/* Limit reached special card */}
                {msg.role === 'assistant' && msg.content.startsWith('__LIMIT__')
                  ? (() => {
                      const [, used, limit] = msg.content.split('__');
                      return (
                        <div style={{
                          background: 'rgba(196,131,106,0.08)',
                          border: '0.5px solid rgba(196,131,106,0.3)',
                          borderRadius: 4, padding: '12px 14px',
                          marginRight: '10%',
                        }}>
                          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4836A', marginBottom: 6 }}>
                            Monthly limit reached
                          </div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: '#C4836A', marginBottom: 4 }}>
                            {used} / {limit} queries
                          </div>
                          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: '#8B6050', lineHeight: 1.55, margin: '0 0 12px' }}>
                            You've used all {limit} Intelligence Chat queries for this month.
                            Upgrade to Growth for unlimited queries.
                          </p>
                          <a
                            href="/pricing"
                            style={{
                              display: 'inline-block',
                              background: '#C4836A', color: '#FFFFFF',
                              borderRadius: 3, padding: '7px 16px',
                              fontFamily: "'Outfit', sans-serif", fontSize: 9,
                              fontWeight: 500, letterSpacing: '0.12em',
                              textTransform: 'uppercase', textDecoration: 'none',
                            }}
                          >
                            Upgrade to Growth →
                          </a>
                        </div>
                      );
                    })()
                  : msg.role === 'assistant'
                    ? renderAIContent(msg.content)
                    : msg.content}
              </div>

              {/* Timestamp */}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  fontWeight: 400,
                  color: T.textHint,
                }}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 3,
                border: T.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: T.bgContainer,
                color: T.accent,
              }}
            >
              <Sparkles size={11} strokeWidth={1.5} />
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: T.border,
                borderRadius: T.radius,
                padding: '9px 13px',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {/* Animated dots */}
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: T.accent,
                    display: 'inline-block',
                    animation: `ic-dot-bounce 1.2s ease-in-out ${idx * 0.2}s infinite`,
                  }}
                />
              ))}
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 10,
                  fontWeight: 300,
                  color: T.textHint,
                  marginLeft: 2,
                }}
              >
                Analysing your account data…
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Heinrick Action Proposal Card ── */}
      {pendingAction && (
        <div style={{
          margin: '0 14px 8px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(196,131,106,0.12) 0%, rgba(196,131,106,0.06) 100%)',
          border: '1px solid rgba(196,131,106,0.35)',
          borderRadius: 10,
          backdropFilter: 'blur(8px)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Sparkles size={16} style={{ color: T.accent, marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 2, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                Heinrick Proposes an Action
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>
                {pendingAction.label}
              </div>
              <div style={{ fontSize: 12, color: T.textBody, lineHeight: 1.5 }}>
                {pendingAction.description}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => executeAction(pendingAction, true)}
              disabled={executingAction}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 6, border: 'none',
                background: T.accent, color: '#fff', fontSize: 12,
                fontWeight: 600, cursor: executingAction ? 'wait' : 'pointer',
                opacity: executingAction ? 0.7 : 1, transition: T.transition,
              }}
            >
              {executingAction
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Executing…</>
                : <><CheckCircle size={13} /> Yes, execute</>}
            </button>
            <button
              onClick={() => executeAction(pendingAction, false)}
              disabled={executingAction}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 6,
                border: `1px solid ${T.borderColor}`,
                background: 'transparent', color: T.textMuted, fontSize: 12,
                fontWeight: 600, cursor: 'pointer', transition: T.transition,
              }}
            >
              <XCircle size={13} /> No, cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Input area ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          padding: '10px 14px',
          borderTop: T.border,
          background: T.bgContainer,
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          placeholder="Ask about campaigns, ROAS, audiences…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          rows={2}
          style={{
            flex: 1,
            background: '#FFFFFF',
            border: inputFocused ? `1px solid ${T.accent}` : '1px solid #E8E4DF',
            borderRadius: T.radius,
            padding: '8px 12px',
            color: T.textPrimary,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 11,
            fontWeight: 300,
            resize: 'none',
            outline: 'none',
            transition: T.transition,
            lineHeight: 1.45,
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          onMouseEnter={() => setSendHovered(true)}
          onMouseLeave={() => setSendHovered(false)}
          style={{
            width: 32,
            height: 32,
            background: sendHovered && input.trim() && !loading ? T.accentHover : '#C4836A',
            border: 'none',
            borderRadius: T.radius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            opacity: !input.trim() || loading ? 0.35 : 1,
            flexShrink: 0,
            transition: T.transition,
            transform: sendHovered && input.trim() && !loading ? 'translateY(-1px)' : 'none',
          }}
        >
          <Send size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Dot-bounce keyframes */}
      <style>{`
        @keyframes ic-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
        .ic-container textarea::placeholder { color: #A09890; }
      `}</style>
    </div>
  );
};

export default IntelligenceChat;
