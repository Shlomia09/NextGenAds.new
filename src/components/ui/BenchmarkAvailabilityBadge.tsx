import React from 'react';
import type { BenchmarkAvailability } from '../../types';

interface Props {
  availability: BenchmarkAvailability;
  aovLabel?: string;
  markets?: string[];
}

const BenchmarkAvailabilityBadge: React.FC<Props> = ({ availability, aovLabel, markets }) => {
  const isFull = availability === 'full';

  return (
    <div className={`bab-wrap ${isFull ? 'full' : 'partial'}`}>
      <div className="bab-dot-wrap">
        <div className={`bab-dot ${isFull ? 'full' : 'partial'}`} />
      </div>
      <div className="bab-text">
        <div className="bab-title">
          {isFull ? '9yr Benchmark Active' : 'Partial Benchmark Active'}
        </div>
        <div className="bab-sub">
          {isFull
            ? `847 Beauty brands · ${aovLabel ?? 'AOV calibrated'} · ${markets?.join('/') ?? 'EU'} · 2015–2024`
            : 'CPM/CTR data available · Purchase benchmarks: N/A'}
        </div>
      </div>

      <style>{`
        .bab-wrap {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 4px;
          border: 0.5px solid;
        }

        .bab-wrap.full {
          background: rgba(16,185,129,0.04);
          border-color: rgba(16,185,129,0.2);
        }

        .bab-wrap.partial {
          background: rgba(245,158,11,0.04);
          border-color: rgba(245,158,11,0.2);
        }

        .bab-dot-wrap { display: flex; align-items: center; padding-top: 2px; }

        .bab-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          animation: pulse-subtle 2.5s ease-in-out infinite;
          flex-shrink: 0;
        }

        .bab-dot.full    { background: #10B981; }
        .bab-dot.partial { background: #F59E0B; }

        .bab-title {
          font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.04em;
        }

        .bab-wrap.full .bab-title    { color: #065F46; }
        .bab-wrap.partial .bab-title { color: #92400E; }

        .bab-sub {
          font-family: 'DM Mono', monospace;
          font-size: 9px; font-weight: 400;
          margin-top: 2px;
          line-height: 1.4;
        }

        .bab-wrap.full .bab-sub    { color: #6EE7B7; color: #047857; }
        .bab-wrap.partial .bab-sub { color: #D97706; }
      `}</style>
    </div>
  );
};

export default BenchmarkAvailabilityBadge;
