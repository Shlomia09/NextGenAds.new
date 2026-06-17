import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, MessageSquare, Plus, Database } from 'lucide-react';

import type { ChatMessage, Brand, Campaign } from '../../types';
import { sendChatMessage, ChatLimitError, type CampaignContext } from '../../lib/claude-api';
import { useActiveAccount } from '../../contexts/ActiveAccountContext';

interface IntelligenceChatProps {
  brand: Brand;
  campaigns: Campaign[];
  sessionId?: string;
  initialMessages?: ChatMessage[];
  compact?: boolean;
}

const QUICK_QUESTIONS = [
  'Why is my ROAS dropping?',
  'Should I scale this campaign?',
  'What audience should I test next?',
  'Am I ready to increase budget?',
];

// ─── After-Dark token palette (inline-only, no CSS vars) ──────────────────────
const T = {
  bgDeep:      '#0F0A07',
  bgContainer: '#1C1208',
  border:      '0.5px solid #2a1a0e',
  borderColor: '#2a1a0e',
  accent:      '#C4836A',
  accentHover: '#A86B52',
  textPrimary: '#F5E6D8',
  textBody:    '#C4A090',
  textMuted:   '#8B6050',
  textHint:    '#4a2e1e',
  radius:      '5px',
  transition:  'all 0.18s ease',
} as const;

const IntelligenceChat: React.FC<IntelligenceChatProps> = ({
  brand,
  campaigns,
  initialMessages = [],
  compact = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredQuick, setHoveredQuick] = useState<string | null>(null);
  const [sendHovered, setSendHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { activeAccount } = useActiveAccount();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      if ((c.roas ?? 0) > 0 || (c.purchases ?? 0) > 0) {
        parts.push(`  Purchases: ${c.purchases ?? 0} | Revenue: €${(c.revenue ?? 0).toFixed(2)} | ROAS: ${(c.roas ?? 0).toFixed(2)}x`);
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

      const response = await sendChatMessage({
        brand_id: brand.id,
        messages: apiMessages,
        campaigns: richCampaigns,
        campaign_context_summary: buildCampaignContextSummary(campaigns ?? []),
        conversion_type: activeAccount?.conversion_type ?? 'ecommerce',
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response,
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

          {/* Campaign context badge */}
          {campaigns && campaigns.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(196,131,106,0.08)',
                border: '0.5px solid rgba(196,131,106,0.25)',
                borderRadius: 4,
                padding: '3px 8px',
                marginLeft: 8,
              }}
            >
              <Database size={9} strokeWidth={1.5} style={{ color: '#C4836A' }} />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8,
                  fontWeight: 400,
                  color: '#C4836A',
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
          background: 'transparent',
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

            {/* Suggested questions */}
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
                    background: hoveredQuick === q ? 'rgba(196,131,106,0.05)' : T.bgDeep,
                    border: hoveredQuick === q ? `0.5px solid ${T.accent}` : T.border,
                    borderRadius: T.radius,
                    padding: '7px 12px',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 10,
                    fontWeight: 300,
                    color: T.textMuted,
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
                background: msg.role === 'user' ? T.accent : T.bgDeep,
                color: msg.role === 'user' ? T.bgDeep : T.accent,
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
                        background: T.accent,
                        color: T.bgDeep,
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
                        background: T.bgDeep,
                        border: T.border,
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
                              background: '#C4836A', color: '#0F0A07',
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
                background: T.bgDeep,
                color: T.accent,
              }}
            >
              <Sparkles size={11} strokeWidth={1.5} />
            </div>

            <div
              style={{
                background: T.bgDeep,
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
            background: T.bgDeep,
            border: inputFocused ? `0.5px solid ${T.accent}` : T.border,
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
            background: sendHovered && input.trim() && !loading ? T.accentHover : T.accent,
            border: 'none',
            borderRadius: T.radius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: T.bgDeep,
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
        .ic-container textarea::placeholder { color: #4a2e1e; }
      `}</style>
    </div>
  );
};

export default IntelligenceChat;
