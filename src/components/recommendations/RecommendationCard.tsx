import React, { useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import type { Recommendation } from '../../types';

interface RecommendationCardProps {
  rec: Recommendation;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onLearnMore: (rec: Recommendation) => void;
}

const priorityConfig = {
  critical: {
    badge: 'badge-critical',
    icon: <AlertTriangle size={14} />,
    label: 'Critical',
    borderColor: 'rgba(239,68,68,0.3)',
    glow: 'rgba(239,68,68,0.08)',
  },
  high: {
    badge: 'badge-high',
    icon: <Zap size={14} />,
    label: 'High Priority',
    borderColor: 'rgba(245,158,11,0.3)',
    glow: 'rgba(245,158,11,0.06)',
  },
  medium: {
    badge: 'badge-medium',
    icon: <Info size={14} />,
    label: 'Medium',
    borderColor: 'rgba(99,102,241,0.2)',
    glow: 'rgba(99,102,241,0.05)',
  },
};

const typeIcon: Record<string, string> = {
  funnel_structure: '🔀',
  audience: '👥',
  budget: '💰',
  creative: '🎨',
  scaling: '📈',
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
      className="rec-card"
      style={{
        borderColor: config.borderColor,
        background: `linear-gradient(135deg, var(--surface) 0%, ${config.glow} 100%)`,
      }}
    >
      {/* Header */}
      <div className="rec-header">
        <div className="rec-badges">
          <span className={`badge ${config.badge}`}>
            {config.icon}
            {config.label}
          </span>
          <span className="rec-type-emoji">{typeIcon[rec.type] || '⚡'}</span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded(!expanded)}
          aria-label="Toggle details"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Title */}
      <h3 className="rec-title">{rec.title}</h3>

      {/* Description */}
      <p className="rec-description">{rec.description}</p>

      {/* Expanded content */}
      {expanded && (
        <div className="rec-expanded animate-fade-in">
          <div className="rec-section">
            <div className="rec-section-label">📊 Benchmark Reference</div>
            <p className="rec-section-text">{rec.benchmark_reference}</p>
          </div>
          <div className="rec-section">
            <div className="rec-section-label">⚡ Recommended Action</div>
            <p className="rec-section-text">{rec.action}</p>
          </div>
          <div className="rec-section">
            <div className="rec-section-label">🧠 AI Reasoning</div>
            <p className="rec-section-text">{rec.reasoning}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rec-actions">
        <button
          className="btn btn-success btn-sm"
          onClick={() => onApprove(rec.id)}
        >
          <CheckCircle size={13} />
          Execute with Approval
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onLearnMore(rec)}
        >
          <Info size={13} />
          Learn More
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onDismiss(rec.id)}
          style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}
        >
          <XCircle size={13} />
          Dismiss
        </button>
      </div>

      <style>{`
        .rec-card {
          border: 1px solid;
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: transform var(--transition), border-color var(--transition);
        }

        .rec-card:hover {
          transform: translateY(-1px);
        }

        .rec-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .rec-badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rec-type-emoji {
          font-size: 16px;
        }

        .rec-title {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .rec-description {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .rec-expanded {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
          background: var(--surface-3);
          border-radius: var(--radius);
          border: 1px solid var(--border);
        }

        .rec-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .rec-section-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .rec-section-text {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .rec-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 4px;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
};

export default RecommendationCard;
