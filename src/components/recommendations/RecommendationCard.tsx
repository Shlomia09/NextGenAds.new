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
    borderColor: '#E24B4A',
    badgeBg: '#FCEBEB',
    badgeColor: '#791F1F',
    badgeBorder: 'rgba(226,75,74,0.25)',
  },
  high: {
    icon: <Zap size={10} strokeWidth={1.5} />,
    label: 'High',
    borderColor: '#C4836A',
    badgeBg: '#FAEEDA',
    badgeColor: '#633806',
    badgeBorder: 'rgba(196,131,106,0.35)',
  },
  medium: {
    icon: <Info size={10} strokeWidth={1.5} />,
    label: 'Medium',
    borderColor: '#C4836A',
    badgeBg: '#FDF6F0',
    badgeColor: '#C4836A',
    badgeBorder: 'rgba(196,131,106,0.25)',
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
        background: '#FFFFFF',
        border: '0.5px solid #E8E4DF',
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
            fontFamily: "'Outfit', sans-serif",
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
            background: '#F8F6F3',
            color: '#6B5044',
            border: '0.5px solid #E8E4DF',
            fontFamily: "'Outfit', sans-serif",
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
            color: '#8B6A5A',
            cursor: 'pointer',
            padding: '3px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C4836A')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8B6A5A')}
        >
          {expanded ? <ChevronUp size={13} strokeWidth={1.5} /> : <ChevronDown size={13} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Title — Playfair Display */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 13,
        fontWeight: 400,
        color: '#1A1410',
        lineHeight: 1.35,
      }}>
        {rec.title}
      </div>

      {/* Description — Outfit 300 */}
      <p style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 11,
        fontWeight: 300,
        color: '#6B5044',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {rec.description}
      </p>

      {/* Benchmark reference pill */}
      <span style={{
        background: 'rgba(196,131,106,0.10)',
        border: '0.5px solid rgba(196,131,106,0.2)',
        color: '#C4836A',
        fontFamily: "'DM Mono', monospace",
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
            background: '#F8F6F3',
            borderRadius: 4,
            border: '0.5px solid #E8E4DF',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 8, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B6A5A' }}>
              Recommended Action
            </div>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: '#6B5044', lineHeight: 1.55, margin: 0 }}>
              {rec.action}
            </p>
          </div>
          {rec.reasoning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 8, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B6A5A' }}>
                AI Reasoning
              </div>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: '#6B5044', lineHeight: 1.55, margin: 0 }}>
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
        borderTop: '0.5px solid #E8E4DF',
      }}>
        <button
          onClick={() => onApprove(rec.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#10B981', color: '#FFFFFF',
            border: 'none', borderRadius: 2,
            padding: '6px 12px',
            fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0DA271')}
          onMouseLeave={e => (e.currentTarget.style.background = '#10B981')}
        >
          <CheckCircle size={11} strokeWidth={1.5} />
          Execute
        </button>
        <button
          onClick={() => onLearnMore(rec)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'transparent', color: '#6B5044',
            border: '0.5px solid #E8E4DF', borderRadius: 2,
            padding: '6px 12px',
            fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 400,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4836A'; e.currentTarget.style.color = '#C4836A'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E4DF'; e.currentTarget.style.color = '#6B5044'; }}
        >
          <Info size={11} strokeWidth={1.5} />
          Details
        </button>
        <button
          onClick={() => onDismiss(rec.id)}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'transparent', color: '#8B6A5A',
            border: 'none',
            padding: '6px',
            fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 400,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C4836A')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8B6A5A')}
        >
          <XCircle size={11} strokeWidth={1.5} />
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default RecommendationCard;
