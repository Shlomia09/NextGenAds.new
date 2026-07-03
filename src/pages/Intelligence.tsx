import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, MessageSquare, Loader2 } from 'lucide-react';
import {
  getCampaigns,
  getIntelligenceSessions,
  createIntelligenceSession,
  updateIntelligenceSession,
  updateSessionTitle,
} from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../hooks/useAuth';
import IntelligenceChat from '../components/intelligence/IntelligenceChat';
import type { ChatMessage } from '../types';

// ── Relative time formatter ──────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Title from first user message (max 42 chars) ─────────────────────────────
function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first?.content) return 'Session';
  const t = first.content.trim().replace(/\s+/g, ' ');
  return t.length > 42 ? t.slice(0, 42) + '…' : t;
}

const Intelligence: React.FC = () => {
  const { activeBrand } = useBrand();
  const { user } = useAuth();
  const qc = useQueryClient();

  // ── Sessions ────────────────────────────────────────────────────────────────
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
  } = useQuery({
    queryKey: ['intelligence-sessions', activeBrand?.id],
    queryFn:  () => getIntelligenceSessions(activeBrand!.id),
    enabled:  !!activeBrand,
    staleTime: 30_000,
  });

  // ── Campaigns (context for AI) ───────────────────────────────────────────
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', activeBrand?.id],
    queryFn:  () => getCampaigns(activeBrand!.id),
    enabled:  !!activeBrand,
  });

  // ── Active session ─────────────────────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Auto-select first (most recent) session when they load
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  // ── New session ────────────────────────────────────────────────────────────
  const [creating, setCreating] = useState(false);

  const handleNewSession = async () => {
    if (!activeBrand || !user || creating) return;
    setCreating(true);
    try {
      const s = await createIntelligenceSession({
        brand_id: activeBrand.id,
        user_id:  user.id,
        title:    'New Session',
        messages: [],
      });
      // Switch to new session immediately, refetch list
      setActiveSessionId(s.id);
      qc.invalidateQueries({ queryKey: ['intelligence-sessions', activeBrand.id] });
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setCreating(false);
    }
  };

  // ── Persist messages (called by IntelligenceChat debounced) ───────────────
  const handleMessagesChange = useCallback(
    async (msgs: ChatMessage[]) => {
      if (!activeSessionId) return;
      try {
        await updateIntelligenceSession(activeSessionId, msgs);
        // Auto-update title from first user message if still "New Session"
        const currentTitle = sessions.find((s) => s.id === activeSessionId)?.title;
        if (!currentTitle || currentTitle === 'New Session') {
          const t = deriveTitle(msgs);
          if (t !== 'Session') await updateSessionTitle(activeSessionId, t);
        }
        qc.invalidateQueries({ queryKey: ['intelligence-sessions', activeBrand?.id] });
      } catch (err) {
        console.warn('Session save failed:', err);
      }
    },
    [activeSessionId, sessions, activeBrand, qc],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="section-eyebrow">
            <Sparkles size={10} strokeWidth={1.5} />
            AI Strategist
          </div>
          <h1 className="page-title">
            Intelligence <em style={{ fontStyle: 'italic', color: 'var(--rose-gold)' }}>Engine</em>
          </h1>
          <p className="page-subtitle">
            9-year Beauty &amp; Cosmetics benchmark knowledge · Context-aware campaign strategist
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleNewSession}
          disabled={creating || !activeBrand}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {creating
            ? <Loader2 size={13} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
            : <Plus size={13} strokeWidth={1.5} />
          }
          New Session
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 14, flex: 1, minHeight: 0 }}>

        {/* ── Sessions sidebar ─────────────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '0.5px solid var(--border-light)',
            fontFamily: 'var(--font-sans)',
            fontSize: 9,
            fontWeight: 400,
            color: 'var(--text-hint)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            Sessions
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '6px' }}>
            {sessionsLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20, opacity: 0.5 }}>
                <Loader2 size={14} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-hint)' }} />
              </div>
            )}

            {!sessionsLoading && sessions.length === 0 && (
              <div style={{
                padding: '20px 12px',
                textAlign: 'center',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--text-hint)',
                lineHeight: 1.5,
              }}>
                No sessions yet.<br />
                <span style={{ color: 'var(--rose-gold)' }}>Ask your first question</span> to start.
              </div>
            )}

            {sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              const msgs = (s.messages as ChatMessage[] | null) ?? [];
              const msgCount = msgs.length;
              return (
                <button
                  key={s.id}
                  className={`int-session-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSessionId(s.id)}
                  title={s.title ?? 'Session'}
                >
                  <MessageSquare size={11} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'var(--rose-gold-dark)' : 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {s.title || 'Session'}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--text-hint)',
                      marginTop: 2,
                      display: 'flex',
                      gap: 6,
                    }}>
                      <span>{relativeTime(s.updated_at ?? s.created_at ?? '')}</span>
                      {msgCount > 0 && <span>{msgCount} msg{msgCount !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat panel ───────────────────────────────────────────────────── */}
        <div style={{ minHeight: 0 }}>
          {!activeBrand ? (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 14 }}>
              <Sparkles size={28} strokeWidth={1.5} style={{ color: 'var(--rose-gold)' }} />
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, color: 'var(--text-primary)' }}>
                Set up a brand to start
              </p>
              <a href="/onboarding" className="btn btn-primary">Get Started</a>
            </div>
          ) : (
            /* key={activeSessionId} ensures the chat remounts on session switch,
               clearing message state and re-initialising with the session's messages */
            <IntelligenceChat
              key={activeSessionId ?? 'no-session'}
              brand={activeBrand as any}
              campaigns={campaigns}
              sessionId={activeSessionId ?? undefined}
              initialMessages={(activeSession?.messages as ChatMessage[]) ?? []}
              onMessagesChange={handleMessagesChange}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .int-session-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 10px;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all var(--transition);
          color: var(--text-muted);
          width: 100%;
          text-align: left;
          background: none;
          border: none;
        }
        .int-session-item:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .int-session-item.active {
          background: var(--rose-gold-light);
          color: var(--rose-gold-dark);
          border: 0.5px solid var(--border-rose);
        }
      `}</style>
    </div>
  );
};

export default Intelligence;
