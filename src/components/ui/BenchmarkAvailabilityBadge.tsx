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
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '8px 11px',
      borderRadius: 4,
      border: `0.5px solid ${isFull ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
      background: isFull ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
    }}>
      {/* Pulsing dot */}
      <div style={{ display: 'flex', alignItems: 'center', paddingTop: 2 }}>
        <div style={{
          width: 7, height: 7,
          borderRadius: '50%',
          background: isFull ? '#10B981' : '#F59E0B',
          flexShrink: 0,
          animation: 'pulse-subtle 2.5s ease-in-out infinite',
        }} />
      </div>

      <div>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: isFull ? '#10B981' : '#F59E0B',
        }}>
          {isFull ? '9yr Benchmark Active' : 'Partial Benchmark Active'}
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 8,
          fontWeight: 400,
          marginTop: 2,
          lineHeight: 1.4,
          color: isFull ? 'rgba(16,185,129,0.7)' : 'rgba(245,158,11,0.6)',
        }}>
          {isFull
            ? `847 Beauty brands · ${aovLabel ?? 'AOV calibrated'} · ${markets?.join('/') ?? 'EU'} · 2015–2024`
            : 'CPM/CTR data available · Purchase benchmarks: N/A'}
        </div>
      </div>
    </div>
  );
};

export default BenchmarkAvailabilityBadge;
