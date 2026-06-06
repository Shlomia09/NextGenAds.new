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

  const statusColor = isNeutral ? 'var(--warning)' : isBeating ? 'var(--success)' : 'var(--danger)';
  const statusBg = isNeutral ? 'var(--warning-dim)' : isBeating ? 'var(--success-dim)' : 'var(--danger-dim)';

  const formatVal = (v: number) => {
    if (unit === '%') return `${v.toFixed(2)}%`;
    if (unit === 'x') return `${v.toFixed(2)}x`;
    return `${unit}${v.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bm-card">
        <div className="skeleton" style={{ height: 12, width: 60, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 32, width: 80, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 10, width: 120 }} />
      </div>
    );
  }

  return (
    <div className="bm-card">
      <div className="bm-label">
        <div className="live-dot" />
        {label}
      </div>

      <div className="bm-your-value" style={{ color: statusColor }}>
        {formatVal(yourValue)}
      </div>

      <div className="bm-benchmark-row">
        <span className="bm-bench-label">Benchmark</span>
        <span className="bm-bench-value">{formatVal(benchmarkValue)}</span>
      </div>

      <div className="bm-delta-row" style={{ background: statusBg, color: statusColor }}>
        {isNeutral ? (
          <><Minus size={11} /> At benchmark</>
        ) : isBeating ? (
          <><TrendingUp size={11} /> +{Math.abs(diffPct).toFixed(1)}% above</>
        ) : (
          <><TrendingDown size={11} /> {Math.abs(diffPct).toFixed(1)}% below</>
        )}
      </div>

      {benchmarkSource && (
        <div className="bm-source">{benchmarkSource}</div>
      )}

      <style>{`
        .bm-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color var(--transition), transform var(--transition);
        }

        .bm-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-1px);
        }

        .bm-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
        }

        .bm-your-value {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .bm-benchmark-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          background: var(--surface-3);
          border-radius: var(--radius-sm);
        }

        .bm-bench-label {
          font-size: 11px;
          color: var(--text-muted);
        }

        .bm-bench-value {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .bm-delta-row {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }

        .bm-source {
          font-size: 10px;
          color: var(--text-muted);
          font-style: italic;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
};

export default BenchmarkMetricCard;
