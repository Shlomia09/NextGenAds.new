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

  // Light mode value colors: above benchmark = dark green, below = red, neutral = copper
  const yourValueColor = (() => {
    if (isNeutral) return 'var(--accent)';
    if (higherIsBetter) {
      return yourValue >= benchmarkValue ? 'var(--green)' : 'var(--red)';
    } else {
      return yourValue <= benchmarkValue ? 'var(--green)' : 'var(--red)';
    }
  })();

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

        <style>{`
          @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          .bm-card {
            background: var(--surface);
            border: 0.5px solid var(--border);
            border-radius: 4px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 7px;
          }

          .skeleton {
            border-radius: 3px;
            background: linear-gradient(90deg, var(--surface) 25%, var(--surface) 50%, var(--surface) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.8s infinite;
          }
        `}</style>
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

      {/* Your value — --font-mono always */}
      <div className="bm-your-value" style={{ color: yourValueColor }}>
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
            ? <><TrendingUp size={10} /> ↑ +{Math.abs(diffPct).toFixed(1)}% above benchmark</>
            : <><TrendingDown size={10} /> ↓ {Math.abs(diffPct).toFixed(1)}% below benchmark ✓</>
        ) : (
          higherIsBetter
            ? <><TrendingDown size={10} /> ↓ {Math.abs(diffPct).toFixed(1)}% below benchmark</>
            : <><TrendingUp size={10} /> ↑ {Math.abs(diffPct).toFixed(1)}% above benchmark</>
        )}
      </div>

      {benchmarkSource && (
        <div className="bm-source">{benchmarkSource}</div>
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .bm-card {
          background: var(--surface);
          border: 0.5px solid var(--border);
          border-radius: 4px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .bm-card:hover {
          border-color: var(--accent);
          box-shadow: 0 2px 12px var(--accent-soft);
        }

        .bm-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-ui);
          font-size: 8px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-secondary, var(--text-2));
        }

        .live-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--green);
          flex-shrink: 0;
        }

        .bm-your-value {
          font-family: var(--font-mono);
          font-size: 26px;
          font-weight: 500;
          line-height: 1;
        }

        .bm-benchmark-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 8px;
          background: var(--surface);
          border-radius: 2px;
        }

        .bm-bench-label {
          font-family: var(--font-ui);
          font-size: 8px;
          font-weight: 300;
          color: var(--text-secondary, var(--text-2));
        }

        .bm-bench-value {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 400;
          color: var(--text-hint);
        }

        .metric-benchmark {
          font-family: var(--font-ui);
          font-size: 8px;
          font-weight: 400;
          padding: 3px 7px;
          border-radius: 20px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          width: fit-content;
        }

        .metric-benchmark.above {
          background: var(--green-soft);
          color: var(--green);
        }

        .metric-benchmark.below {
          background: var(--red-soft);
          color: var(--red);
        }

        .metric-benchmark.neutral {
          background: var(--accent-soft);
          color: var(--text);
        }

        .bm-source {
          font-family: var(--font-ui);
          font-size: 7px;
          font-weight: 300;
          color: var(--text-hint);
          font-style: italic;
          margin-top: 2px;
        }

        .skeleton {
          border-radius: 3px;
          background: linear-gradient(90deg, var(--surface) 25%, var(--surface) 50%, var(--surface) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.8s infinite;
        }
      `}</style>
    </div>
  );
};

export default BenchmarkMetricCard;
