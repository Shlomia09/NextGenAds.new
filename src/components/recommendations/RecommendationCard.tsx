import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, AlertTriangle, Zap, Info } from 'lucide-react';
import type { Recommendation } from '../../types';

interface RecommendationCardProps {
  rec: Recommendation;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onLearnMore: (rec: Recommendation) => void;
}

const priorityConfig = {
  critical: {
    icon: <AlertTriangle size={10} strokeWidth={1.5} />,
    label: 'Critical',
    borderColor: 'var(--red)',
    badgeBg: 'var(--red-soft)',
    badgeColor: 'var(--red)',
    badgeBorder: 'var(--red-soft)',
  },
  high: {
    icon: <Zap size={10} strokeWidth={1.5} />,
    label: 'High',
    borderColor: 'var(--accent)',
    badgeBg: 'var(--amber-soft)',
    badgeColor: 'var(--amber)',
    badgeBorder: 'var(--accent-soft)',
  },
  medium: {
    icon: <Info size={10} strokeWidth={1.5} />,
    label: 'Medium',
    borderColor: 'var(--accent)',
    badgeBg: 'var(--surface)',
    badgeColor: 'var(--accent)',
    badgeBorder: 'var(--accent-soft)',
  },
};

const typeLabel: Record<string, string> = {
  funnel_structure: 'Funnel',
  audience:         'Audience',
  budget:           'Budget',
  creative:         'Creative',
  scaling:          'Scaling',
};

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  rec,
  onApprove,
  onDismiss,
  onLearnMore,
}) => {
  const [expanded, setExpanded] = useState(false);
  const config = priorityConfig[rec.priority];

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderLeft: `2.5px solid ${config.borderColor}`,
        borderRadius: 6,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Priority badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: config.badgeBg,
            color: config.badgeColor,
            border: `0.5px solid ${config.badgeBorder}`,
            fontFamily: 'var(--font-ui)',
            fontSize: 8,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            padding: '2px 8px',
            borderRadius: 2,
          }}>
            {config.icon}
            {config.label}
          </span>
          {/* Type badge */}
          <span style={{
            background: 'var(--surface)',
            color: 'var(--text-2)',
            border: '0.5px solid var(--border)',
            fontFamily: 'var(--font-ui)',
            fontSize: 8,
            fontWeight: 400,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            padding: '2px 8px',
            borderRadius: 2,
          }}>
            {typeLabel[rec.type] || rec.type}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-3)',
            cursor: 'pointer',
            padding: '3px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          {expanded ? <ChevronUp size={13} strokeWidth={1.5} /> : <ChevronDown size={13} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Title — display font */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text)',
        lineHeight: 1.35,
      }}>
        {rec.title}
      </div>

      {/* Description — font-ui 300 */}
      <p style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        fontWeight: 300,
        color: 'var(--text-2)',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {rec.description}
      </p>

      {/* Benchmark reference pill */}
      <span style={{
        background: 'var(--accent-soft)',
        border: '0.5px solid var(--accent-soft)',
        color: 'var(--text)',
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        padding: '3px 8px',
        display: 'inline-block',
        borderRadius: 2,
        alignSelf: 'flex-start',
      }}>
        {rec.benchmark_reference}
      </span>

      {/* Expanded details */}
      {expanded && (
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '10px 12px',
            background: 'var(--surface)',
            borderRadius: 4,
            border: '0.5px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Recommended Action
            </div>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 300, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
              {rec.action}
            </p>
          </div>
          {rec.reasoning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                AI Reasoning
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 300, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
                {rec.reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        paddingTop: 6,
        borderTop: '0.5px solid var(--border)',
      }}>
        <button
          onClick={() => onApprove(rec.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--green)', color: 'var(--text)',
            border: 'none', borderRadius: 2,
            padding: '6px 12px',
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--green)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--green)')}
        >
          <CheckCircle size={11} strokeWidth={1.5} />
          Execute
        </button>
        <button
          onClick={() => onLearnMore(rec)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'transparent', color: 'var(--text-2)',
            border: '0.5px solid var(--border)', borderRadius: 2,
            padding: '6px 12px',
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 400,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          <Info size={11} strokeWidth={1.5} />
          Details
        </button>
        <button
          onClick={() => onDismiss(rec.id)}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'transparent', color: 'var(--text-3)',
            border: 'none',
            padding: '6px',
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 400,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          <XCircle size={11} strokeWidth={1.5} />
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default RecommendationCard;
