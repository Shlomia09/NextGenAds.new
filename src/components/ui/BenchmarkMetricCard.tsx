import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BenchmarkMetricCardProps {
  label: string;
  yourValue: number;
  benchmarkValue: number;
  unit: string;
  higherIsBetter: boolean;
  loading?: boolean;
  benchmarkSource?: string;
}

const BenchmarkMetricCard: React.FC<BenchmarkMetricCardProps> = ({
  label,
  yourValue,
  benchmarkValue,
  unit,
  higherIsBetter,
  loading = false,
  benchmarkSource,
}) => {
  const diff = yourValue - benchmarkValue;
  const diffPct = benchmarkValue !== 0 ? (diff / benchmarkValue) * 100 : 0;
  const isBeating = higherIsBetter ? yourValue >= benchmarkValue : yourValue <= benchmarkValue;
  const isNeutral = Math.abs(diffPct) < 5;

  const statusClass = isNeutral ? 'neutral' : isBeating ? 'above' : 'below';
  const statusColor = isNeutral
    ? 'var(--benchmark-neutral)'
    : isBeating
    ? 'var(--benchmark-above)'
    : 'var(--benchmark-below)';

  const formatVal = (v: number) => {
    if (unit === '%') return `${v.toFixed(2)}%`;
    if (unit === 'x') return `${v.toFixed(2)}x`;
    return `${unit}${v.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bm-card">
        <div className="skeleton" style={{ height: 10, width: 50, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 28, width: 80, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 9, width: 120 }} />
      </div>
    );
  }

  return (
    <div className="bm-card">
      {/* Eyebrow label */}
      <div className="bm-label">
        <div className="live-dot" />
        {label}
      </div>

      {/* Your value — DM Mono always */}
      <div className="bm-your-value" style={{ color: statusColor }}>
        {formatVal(yourValue)}
      </div>

      {/* Benchmark row */}
      <div className="bm-benchmark-row">
        <span className="bm-bench-label">Benchmark</span>
        <span className="bm-bench-value">{formatVal(benchmarkValue)}</span>
      </div>

      {/* Delta pill — correct semantics for cost vs performance metrics */}
      <div className={`metric-benchmark ${statusClass}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {isNeutral ? (
          <><Minus size={10} /> At benchmark</>
        ) : isBeating ? (
          higherIsBetter
            ? <><TrendingUp size={10} /> +{Math.abs(diffPct).toFixed(1)}% above benchmark</>
            : <><TrendingDown size={10} /> {Math.abs(diffPct).toFixed(1)}% below benchmark ✓</>
        ) : (
          higherIsBetter
            ? <><TrendingDown size={10} /> {Math.abs(diffPct).toFixed(1)}% below benchmark</>
            : <><TrendingUp size={10} /> {Math.abs(diffPct).toFixed(1)}% above benchmark ↑</>
        )}
      </div>

      {benchmarkSource && (
        <div className="bm-source">{benchmarkSource}</div>
      )}

      <style>{`
        .bm-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          transition: border-color var(--transition), box-shadow var(--transition);
        }

        .bm-card:hover {
          border-color: var(--rose-gold-pale);
          box-shadow: var(--shadow-sm);
        }

        .bm-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .bm-your-value {
          font-family: 'DM Mono', monospace;
          font-size: 26px;
          font-weight: 500;
          line-height: 1;
        }

        .bm-benchmark-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 8px;
          background: var(--bg-secondary);
          border-radius: 2px;
        }

        .bm-bench-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 300;
          color: var(--text-muted);
        }

        .bm-bench-value {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 400;
          color: var(--text-secondary);
        }

        .bm-source {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 300;
          color: var(--text-hint);
          font-style: italic;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
};

export default BenchmarkMetricCard;
