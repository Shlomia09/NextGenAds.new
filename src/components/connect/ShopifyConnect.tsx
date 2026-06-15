import React, { useState } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
}

interface ShopifyConnectProps {
  userId: string;
  brands: Brand[];
}

const ShopifyConnect: React.FC<ShopifyConnectProps> = ({ userId, brands }) => {
  const [domain,   setDomain]   = useState('');
  const [brandId,  setBrandId]  = useState(brands[0]?.id ?? '');
  const [error,    setError]    = useState('');

  const handleConnect = () => {
    setError('');

    // Basic validation
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (!clean) {
      setError('Enter your Shopify store domain.');
      return;
    }
    if (!brandId) {
      setError('Select a brand first.');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${supabaseUrl}/functions/v1/shopify-oauth?action=initiate&user_id=${encodeURIComponent(userId)}&store=${encodeURIComponent(clean)}&brand_id=${encodeURIComponent(brandId)}`;
    window.location.href = url;
  };

  const font  = "'Outfit', sans-serif";
  const mono  = "'DM Mono', monospace";

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--app-bg, #0F0A07)',
    border: '0.5px solid var(--app-border, #2a1a0e)',
    borderRadius: 4,
    padding: '9px 12px',
    fontFamily: mono,
    fontSize: 11,
    color: 'var(--text-primary, #F5E6D8)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    fontFamily: font,
    cursor: 'pointer',
  };

  return (
    <div className="conn-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="conn-header">
        <div className="conn-icon" style={{ background: '#96BF48', fontSize: 18 }}>
          🛍️
        </div>
        <div>
          <div className="conn-name">Shopify</div>
          <div className="conn-desc">Real order revenue attribution</div>
        </div>
      </div>

      {/* Features */}
      <ul className="conn-features">
        <li>Verify Meta ROAS vs actual orders</li>
        <li>UTM-based attribution tracking</li>
        <li>90-day order history sync</li>
      </ul>

      {/* Domain input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontFamily: font, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B6050' }}>
          Store domain
        </label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="mystore.myshopify.com"
          style={inputStyle}
          id="shopify-domain-input"
        />
      </div>

      {/* Brand selector */}
      {brands.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontFamily: font, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B6050' }}>
            Brand
          </label>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            style={selectStyle}
            id="shopify-brand-select"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)',
          borderRadius: 4, padding: '7px 11px',
          fontFamily: font, fontSize: 11, color: '#EF4444',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <AlertCircle size={11} strokeWidth={1.5} />{error}
        </div>
      )}

      {/* Connect button */}
      <button
        className="btn btn-primary"
        onClick={handleConnect}
        id="shopify-connect-btn"
      >
        <span style={{ fontSize: 14 }}>🛍️</span>
        Connect Shopify
        <ArrowRight size={13} strokeWidth={1.5} />
      </button>
    </div>
  );
};

export default ShopifyConnect;
