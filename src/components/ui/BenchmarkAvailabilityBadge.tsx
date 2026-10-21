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
          background: isFull ? 'var(--green)' : 'var(--amber)',
          flexShrink: 0,
          animation: 'pulse-subtle 2.5s ease-in-out infinite',
        }} />
      </div>

      <div>
        <div style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: isFull ? 'var(--green)' : 'var(--amber)',
        }}>
          {isFull ? 'Benchmark active · since 2018' : 'Partial Benchmark Active'}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          fontWeight: 400,
          marginTop: 2,
          lineHeight: 1.4,
          color: isFull ? 'rgba(16,185,129,0.7)' : 'rgba(245,158,11,0.6)',
        }}>
          {isFull
            ? `25,620 beauty campaigns · ${aovLabel ?? 'AOV calibrated'} · ${markets?.join('/') ?? 'EU'} · since 2018`
            : 'CPM/CTR data available · Purchase benchmarks: N/A'}
        </div>
      </div>
    </div>
  );
};

export default BenchmarkAvailabilityBadge;
