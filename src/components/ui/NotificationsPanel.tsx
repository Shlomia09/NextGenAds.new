import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CreditCard, RefreshCw, Sparkles, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { getUserNotifications } from '../../lib/supabase';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────
interface NotifItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  time: string;
  category: 'billing' | 'sync' | 'ai' | 'alert' | 'system';
  accentColor: string;
  unread: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const SEEN_KEY = 'nag_notif_seen_at';

// ── Event → NotifItem mapper ──────────────────────────────────────────────────
function mapEvent(e: { id: string; type: string; label: string; metadata: Record<string, unknown> | null; created_at: string }, seenAt: number): NotifItem {
  const ts = new Date(e.created_at).getTime();
  const unread = ts > seenAt;

  switch (e.type) {
    case 'meta_sync_complete':
    case 'sync_complete':
      return {
        id: e.id, title: 'Sync complete', body: e.label || 'Meta campaigns updated successfully.',
        time: e.created_at, category: 'sync', unread,
        icon: <RefreshCw size={14} strokeWidth={1.5} />,
        accentColor: '#10B981',
      };
    case 'recommendation_generated':
      return {
        id: e.id, title: 'New AI recommendations', body: e.label || 'Your AI strategist has new insights.',
        time: e.created_at, category: 'ai', unread,
        icon: <Sparkles size={14} strokeWidth={1.5} />,
        accentColor: '#C4836A',
      };
    case 'roas_alert':
    case 'budget_alert':
      return {
        id: e.id, title: 'Performance alert', body: e.label || 'A campaign needs attention.',
        time: e.created_at, category: 'alert', unread,
        icon: <AlertTriangle size={14} strokeWidth={1.5} />,
        accentColor: '#F59E0B',
      };
    default:
      return {
        id: e.id, title: e.label || 'System event', body: String(e.metadata?.summary ?? ''),
        time: e.created_at, category: 'system', unread,
        icon: <CheckCircle size={14} strokeWidth={1.5} />,
        accentColor: '#6B7280',
      };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
}

const NotificationsPanel: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const { subscription, plan, isLoading: subLoading } = useSubscription();
  const panelRef = useRef<HTMLDivElement>(null);

  const [seenAt] = useState<number>(() => {
    const stored = localStorage.getItem(SEEN_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  // Mark all as seen when panel opens
  useEffect(() => {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Fetch system events
  const { data: rawEvents = [] } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn:  () => getUserNotifications(user!.id),
    enabled:  !!user,
    staleTime: 60_000,
  });

  // Build notification list
  const notifications: NotifItem[] = useMemo(() => {
    const items: NotifItem[] = [];

    // 1. Billing notification from subscription
    if (!subLoading && subscription && subscription.status === 'active') {
      const renewalDate = subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
      const periodStart = subscription.current_period_start ?? new Date().toISOString();

      items.push({
        id:       'billing-active',
        title:    'Payment processed successfully',
        body:     `${plan?.name ?? 'Your'} plan is active${renewalDate ? `. Next renewal: ${renewalDate}` : ''}. Invoice sent to your email.`,
        time:     periodStart,
        category: 'billing',
        icon:     <CreditCard size={14} strokeWidth={1.5} />,
        accentColor: '#10B981',
        unread: new Date(periodStart).getTime() > seenAt,
      });
    } else if (!subLoading && !subscription) {
      // Free plan / no subscription yet
      items.push({
        id:       'billing-free',
        title:    'Benchmark Audit active',
        body:     'You have full access to the benchmark engine. Upgrade to unlock AI recommendations and campaign execution.',
        time:     new Date().toISOString(),
        category: 'billing',
        icon:     <CreditCard size={14} strokeWidth={1.5} />,
        accentColor: '#C4836A',
        unread:   false,
      });
    }

    // 2. System events
    rawEvents.forEach(e => items.push(mapEvent(e as any, seenAt)));

    // 3. Fallback if empty
    if (items.length <= 1 && rawEvents.length === 0) {
      items.push({
        id: 'benchmark-active',
        title: '9-year benchmark active',
        body: 'Beauty & Cosmetics benchmark intelligence is running. Connect Meta Ads to layer real campaign data.',
        time: new Date().toISOString(),
        category: 'system',
        icon: <Bell size={14} strokeWidth={1.5} />,
        accentColor: '#C4836A',
        unread: false,
      });
    }

    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [rawEvents, subscription, plan, subLoading, seenAt]);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div
      ref={panelRef}
      style={{
        position:    'absolute',
        top:         '100%',
        right:        0,
        marginTop:   10,
        width:       360,
        background:  'var(--bg-card)',
        border:      '0.5px solid var(--border)',
        borderRadius: 10,
        boxShadow:   '0 20px 60px rgba(0,0,0,0.4)',
        zIndex:      9999,
        overflow:    'hidden',
        animation:   'notif-slide-in 0.18s ease',
      }}
    >
      {/* Header */}
      <div style={{
        padding:      '14px 16px',
        borderBottom: '0.5px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily:    'var(--font-sans)',
            fontSize:       13,
            fontWeight:     500,
            color:          'var(--text-primary)',
          }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span style={{
              background:   'var(--accent)',
              color:        '#2A1A12',
              borderRadius:  10,
              fontFamily:   'var(--font-mono)',
              fontSize:       9,
              fontWeight:     700,
              padding:       '1px 6px',
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-hint)', padding: 2, lineHeight: 1,
          }}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* List */}
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {notifications.map((n, i) => (
          <div
            key={n.id}
            style={{
              padding:      '12px 16px',
              borderBottom: i < notifications.length - 1 ? '0.5px solid var(--border-light)' : 'none',
              display:      'flex',
              gap:           12,
              background:   n.unread ? 'rgba(196,131,106,0.04)' : 'transparent',
              transition:   'background 0.15s',
            }}
          >
            {/* Icon */}
            <div style={{
              width:          30,
              height:         30,
              borderRadius:    8,
              background:     `${n.accentColor}15`,
              border:         `0.5px solid ${n.accentColor}30`,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:           n.accentColor,
              flexShrink:     0,
              marginTop:       2,
            }}>
              {n.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily:  'var(--font-sans)',
                fontSize:     12,
                fontWeight:   n.unread ? 500 : 400,
                color:        'var(--text-primary)',
                marginBottom:  3,
                display:      'flex',
                alignItems:   'center',
                gap:           6,
              }}>
                {n.title}
                {n.unread && (
                  <span style={{
                    width:        5, height: 5, borderRadius: '50%',
                    background:   'var(--accent)', flexShrink: 0,
                    display:      'inline-block',
                  }} />
                )}
              </div>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize:    11,
                fontWeight:   300,
                color:       'var(--text-muted)',
                lineHeight:   1.5,
              }}>
                {n.body}
              </div>
              <div style={{
                fontFamily:   'var(--font-mono)',
                fontSize:      9,
                color:        'var(--text-hint)',
                marginTop:     5,
                letterSpacing: '0.05em',
              }}>
                {relTime(n.time)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding:      '10px 16px',
        borderTop:    '0.5px solid var(--border)',
        display:      'flex',
        justifyContent: 'center',
      }}>
        <a
          href="/settings"
          style={{
            fontFamily:    'var(--font-sans)',
            fontSize:       11,
            fontWeight:     400,
            color:          'var(--text-hint)',
            textDecoration: 'none',
            letterSpacing:  '0.05em',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
        >
          Notification settings
        </a>
      </div>

      <style>{`
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationsPanel;

// ── Helper: count unread for badge ───────────────────────────────────────────
export function getUnreadCount(userId: string | undefined): number {
  if (!userId) return 0;
  const stored = localStorage.getItem(SEEN_KEY);
  const seenAt = stored ? parseInt(stored, 10) : 0;
  // Badge = number of events since last open (we don't know without querying,
  // so we show "1" if seenAt is old enough to indicate something might be new)
  const hoursSinceSeen = (Date.now() - seenAt) / 3_600_000;
  return hoursSinceSeen > 2 ? 1 : 0;
}
