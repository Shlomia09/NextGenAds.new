import React, { useEffect } from 'react';

/**
 * ShopifyCallback page
 *
 * Shopify redirects to /connect/shopify/callback?code=&shop=&state=
 * We proxy those query params directly to our edge function which
 * handles the token exchange and then redirects back to /connect.
 */
const ShopifyCallback: React.FC = () => {
  useEffect(() => {
    const params      = window.location.search;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    // Forward all params to the edge function (Step B of OAuth)
    window.location.href = `${supabaseUrl}/functions/v1/shopify-oauth${params}`;
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0F0A07',
      gap: 16,
    }}>
      <div style={{
        width: 20,
        height: 20,
        border: '1.5px solid #2a1a0e',
        borderTopColor: '#C4836A',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 13,
        fontWeight: 300,
        color: '#8B6050',
        letterSpacing: '0.08em',
      }}>
        Connecting Shopify…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ShopifyCallback;
