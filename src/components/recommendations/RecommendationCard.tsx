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
    badgeClass: 'badge-critical',
    icon: <AlertTriangle size={11} />,
    label: 'Critical',
    borderColor: 'var(--danger)',
  },
  high: {
    badgeClass: 'badge-high',
    icon: <Zap size={11} />,
    label: 'High',
    borderColor: 'var(--warning)',
  },
  medium: {
    badgeClass: 'badge-medium',
    icon: <Info size={11} />,
    label: 'Medium',
    borderColor: 'var(--rose-gold)',
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
      className={`rec-card-wrap ${rec.priority}`}
      style={{ borderLeftColor: config.borderColor }}
    >
      {/* Header row */}
      <div className="rcw-header">
        <div className="rcw-badges">
          <span className={`badge ${config.badgeClass}`}>
            {config.icon}
            {config.label}
          </span>
          <span className="badge badge-neutral">{typeLabel[rec.type] || rec.type}</span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded(!expanded)}
          style={{ padding: '4px 6px', textTransform: 'none', letterSpacing: 0 }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Title — Outfit 500 */}
      <div className="rcw-title">{rec.title}</div>

      {/* Description — Outfit 300 */}
      <p className="rcw-description">{rec.description}</p>

      {/* Expanded details */}
      {expanded && (
        <div className="rcw-expanded animate-fade-in">
          <div className="rcw-detail-block">
            <div className="rcw-detail-label">Benchmark Reference</div>
            <span className="rec-benchmark-ref">{rec.benchmark_reference}</span>
          </div>
          <div className="rcw-detail-block">
            <div className="rcw-detail-label">Recommended Action</div>
            <p className="rcw-detail-text">{rec.action}</p>
          </div>
          <div className="rcw-detail-block">
            <div className="rcw-detail-label">AI Reasoning</div>
            <p className="rcw-detail-text">{rec.reasoning}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rcw-actions">
        <button className="btn btn-success btn-sm" onClick={() => onApprove(rec.id)}>
          <CheckCircle size={12} />
          Execute
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onLearnMore(rec)}>
          <Info size={12} />
          Details
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onDismiss(rec.id)}
          style={{ marginLeft: 'auto', color: 'var(--text-hint)' }}
        >
          <XCircle size={12} />
          Dismiss
        </button>
      </div>

      <style>{`
        .rec-card-wrap {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-left: 2.5px solid;
          border-radius: var(--radius-lg);
          padding: 1rem 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: box-shadow var(--transition);
        }

        .rec-card-wrap:hover {
          box-shadow: var(--shadow-sm);
        }

        .rcw-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .rcw-badges {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rcw-title {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.35;
        }

        .rcw-description {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .rcw-expanded {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 10px 12px;
          background: var(--bg-secondary);
          border-radius: var(--radius);
          border: 0.5px solid var(--border-light);
        }

        .rcw-detail-block {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .rcw-detail-label {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .rcw-detail-text {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .rcw-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          padding-top: 6px;
          border-top: 0.5px solid var(--border-light);
        }
      `}</style>
    </div>
  );
};

export default RecommendationCard;
