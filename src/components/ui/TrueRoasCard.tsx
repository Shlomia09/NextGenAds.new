import React from 'react';
import type { TrueRoasResult } from '../../lib/trueRoas';

interface TrueRoasCardProps {
  data: TrueRoasResult;
  loading?: boolean;
}

const font = "'Outfit', sans-serif";
const mono = "'DM Mono', monospace";

function getRoasColor(roas: number) {
  if (roas > 2.0) return '#10B981';
  if (roas > 1.0) return '#F59E0B';
  return '#EF4444';
}

function getGapColor(gap_pct: number) {
  if (gap_pct > 40) return '#EF4444';
  if (gap_pct > 25) return '#F59E0B';
  return '#10B981';
}

const TrueRoasCard: React.FC<TrueRoasCardProps> = ({ data, loading }) => {
  const roasColor = getRoasColor(data.true_roas);
  const gapColor  = getGapColor(data.gap_pct);

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-card, #1C1208)',
        border: '0.5px solid var(--border-light, #2a1a0e)',
        borderRadius: 8,
        padding: '16px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1,
        marginBottom: 16,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 9, width: 80, background: '#2a1a0e', borderRadius: 2 }} />
            <div style={{ height: 22, width: 60, background: '#2a1a0e', borderRadius: 2 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data.has_ecommerce) {
    return (
      <div style={{
        background: 'var(--bg-card, #1C1208)',
        border: '0.5px solid rgba(196,131,106,0.2)',
        borderRadius: 8,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: font, fontSize: 9, letterSpacing: '0.2em', color: '#C4836A', textTransform: 'uppercase' }}>
            True ROAS
          </div>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 300, color: '#8B6050' }}>
            🔗 Connect Shopify or WooCommerce to see True ROAS
          </div>
        </div>
        <a
          href="/connect"
          style={{
            fontFamily: font,
            fontSize: 11,
            fontWeight: 500,
            color: '#C4836A',
            background: 'rgba(196,131,106,0.08)',
            border: '0.5px solid rgba(196,131,106,0.3)',
            borderRadius: 4,
            padding: '7px 14px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          Connect Store →
        </a>
      </div>
    );
  }



  return (
    <div style={{
      background: 'var(--bg-card, #1C1208)',
      border: '0.5px solid var(--border-light, #2a1a0e)',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      {/* 3-panel header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        borderBottom: data.utm_coverage_pct < 80 ? '0.5px solid var(--border-light, #2a1a0e)' : 'none',
      }}>

        {/* Panel 1: Meta ROAS */}
        <div style={{
          padding: '16px 18px',
          borderRight: '0.5px solid var(--border-light, #2a1a0e)',
        }}>
          <div style={{ fontFamily: font, fontSize: 9, letterSpacing: '0.18em', color: '#C4836A', textTransform: 'uppercase', marginBottom: 6 }}>
            Meta ROAS
          </div>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600, color: '#C4836A', lineHeight: 1.1, marginBottom: 6 }}>
            {data.meta_roas.toFixed(1)}x
          </div>
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 300, color: '#6B4030', lineHeight: 1.4 }}>
            Meta claimed<br />
            <span style={{ fontSize: 9, color: '#4a2e1e' }}>(view-through included)</span>
          </div>
        </div>

        {/* Panel 2: True ROAS */}
        <div style={{
          padding: '16px 18px',
          borderRight: '0.5px solid var(--border-light, #2a1a0e)',
          background: data.true_roas > 0 ? `${roasColor}06` : 'transparent',
        }}>
          <div style={{ fontFamily: font, fontSize: 9, letterSpacing: '0.18em', color: '#8B6050', textTransform: 'uppercase', marginBottom: 6 }}>
            True ROAS
          </div>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600, color: data.true_roas > 0 ? roasColor : '#4a2e1e', lineHeight: 1.1, marginBottom: 6 }}>
            {data.true_roas > 0 ? `${data.true_roas.toFixed(1)}x` : '—'}
          </div>
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 300, color: '#6B4030', lineHeight: 1.4 }}>
            Verified revenue<br />
            <span style={{ fontSize: 9, color: '#4a2e1e' }}>UTM: facebook orders</span>
          </div>
        </div>

        {/* Panel 3: Attribution Gap */}
        <div style={{
          padding: '16px 18px',
          background: data.gap_pct > 0 ? `${gapColor}06` : 'transparent',
        }}>
          <div style={{ fontFamily: font, fontSize: 9, letterSpacing: '0.18em', color: '#8B6050', textTransform: 'uppercase', marginBottom: 6 }}>
            Attribution Gap
          </div>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600, color: gapColor, lineHeight: 1.1, marginBottom: 6 }}>
            {data.gap_pct > 0 ? `-${data.gap_pct.toFixed(0)}%` : '—'}
          </div>
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 300, color: '#6B4030', lineHeight: 1.4 }}>
            {data.gap_pct > 35
              ? '⚠ Above industry avg'
              : data.gap_pct > 0
              ? '✓ Within normal range'
              : 'No gap detected'}<br />
            <span style={{ fontSize: 9, color: '#4a2e1e' }}>Industry: 25–35%</span>
          </div>
        </div>
      </div>

      {/* UTM coverage warning */}
      {data.utm_coverage_pct < 80 && (
        <div style={{
          padding: '10px 18px',
          background: 'rgba(245,158,11,0.05)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span style={{ fontSize: 12, marginTop: 1, flexShrink: 0 }}>⚠</span>
          <div style={{ fontFamily: font, fontSize: 11, fontWeight: 300, color: '#B45309', lineHeight: 1.5 }}>
            <strong>{(100 - data.utm_coverage_pct).toFixed(0)}%</strong> of your orders have no UTM source.
            Add <code style={{ fontFamily: mono, fontSize: 10, background: 'rgba(245,158,11,0.1)', padding: '1px 4px', borderRadius: 2 }}>?utm_source=facebook</code> to your Meta ad URLs for accurate attribution.
          </div>
        </div>
      )}
    </div>
  );
};

export default TrueRoasCard;
