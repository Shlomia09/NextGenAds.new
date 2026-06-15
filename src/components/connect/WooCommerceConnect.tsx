import React, { useState } from 'react';
import { ArrowRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Brand {
  id: string;
  name: string;
}

interface WooCommerceConnectProps {
  userId: string;
  brands: Brand[];
}

const WooCommerceConnect: React.FC<WooCommerceConnectProps> = ({ userId, brands }) => {
  const [storeUrl,       setStoreUrl]       = useState('');
  const [consumerKey,    setConsumerKey]    = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [brandId,        setBrandId]        = useState(brands[0]?.id ?? '');
  const [loading,        setLoading]        = useState(false);
  const [success,        setSuccess]        = useState(false);
  const [error,          setError]          = useState('');

  const handleConnect = async () => {
    setError('');
    setSuccess(false);

    if (!storeUrl.trim()) { setError('Enter your WooCommerce store URL.'); return; }
    if (!consumerKey.trim()) { setError('Enter your Consumer Key.'); return; }
    if (!consumerSecret.trim()) { setError('Enter your Consumer Secret.'); return; }
    if (!brandId) { setError('Select a brand.'); return; }

    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${supabaseUrl}/functions/v1/woo-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          user_id:         userId,
          brand_id:        brandId,
          store_url:       storeUrl.trim(),
          consumer_key:    consumerKey.trim(),
          consumer_secret: consumerSecret.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.message || 'Connection failed. Check your credentials and try again.');
      } else {
        setSuccess(true);
        setStoreUrl('');
        setConsumerKey('');
        setConsumerSecret('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const font = "'Outfit', sans-serif";
  const mono = "'DM Mono', monospace";

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

  const labelStyle: React.CSSProperties = {
    fontFamily: font,
    fontSize: 9,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: '#8B6050',
  };

  return (
    <div className="conn-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="conn-header">
        <div className="conn-icon" style={{ background: '#7F54B3', fontSize: 18 }}>
          🛒
        </div>
        <div>
          <div className="conn-name">WooCommerce</div>
          <div className="conn-desc">WordPress store attribution</div>
        </div>
      </div>

      {/* Features */}
      <ul className="conn-features">
        <li>REST API key connection</li>
        <li>UTM meta-data extraction</li>
        <li>90-day order history sync</li>
      </ul>

      {/* Store URL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={labelStyle}>Store URL</label>
        <input
          type="url"
          value={storeUrl}
          onChange={(e) => setStoreUrl(e.target.value)}
          placeholder="https://mystore.com"
          style={inputStyle}
          id="woo-store-url"
        />
      </div>

      {/* Consumer Key */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={labelStyle}>Consumer Key</label>
        <input
          type="text"
          value={consumerKey}
          onChange={(e) => setConsumerKey(e.target.value)}
          placeholder="ck_xxxxxxxxxxxx"
          style={inputStyle}
          id="woo-consumer-key"
        />
      </div>

      {/* Consumer Secret */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={labelStyle}>Consumer Secret</label>
        <input
          type="password"
          value={consumerSecret}
          onChange={(e) => setConsumerSecret(e.target.value)}
          placeholder="cs_xxxxxxxxxxxx"
          style={inputStyle}
          id="woo-consumer-secret"
        />
      </div>

      {/* Brand selector */}
      {brands.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={labelStyle}>Brand</label>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            style={{ ...inputStyle, fontFamily: font, cursor: 'pointer' }}
            id="woo-brand-select"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={{
          background: 'rgba(16,185,129,0.06)', border: '0.5px solid rgba(16,185,129,0.2)',
          borderRadius: 4, padding: '7px 11px',
          fontFamily: font, fontSize: 11, color: '#10B981',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <CheckCircle size={11} strokeWidth={1.5} />
          WooCommerce connected successfully!
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)',
          borderRadius: 4, padding: '7px 11px',
          fontFamily: font, fontSize: 11, color: '#EF4444',
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <AlertCircle size={11} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* Connect button */}
      <button
        className="btn btn-primary"
        onClick={handleConnect}
        disabled={loading}
        id="woo-connect-btn"
      >
        {loading
          ? <><RefreshCw size={12} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />Validating…</>
          : <><span style={{ fontSize: 14 }}>🛒</span>Validate &amp; Connect<ArrowRight size={13} strokeWidth={1.5} /></>
        }
      </button>
    </div>
  );
};

export default WooCommerceConnect;
