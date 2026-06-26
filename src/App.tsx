import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';

// ── Global crash reporter ──
class AppErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null; stack: string | null }> {
  state = { error: null, stack: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message, stack: e.stack ?? null };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0F0A07', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#EF4444', letterSpacing: '0.2em' }}>APP CRASH</div>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 24, maxWidth: 700, width: '100%' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: '#F5E6D8', marginBottom: 12 }}>{this.state.error}</div>
            {this.state.stack && <pre style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#8B6050', overflow: 'auto', maxHeight: 300, margin: 0 }}>{this.state.stack}</pre>}
          </div>
          <button onClick={() => window.location.reload()} style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#C4836A', background: 'rgba(196,131,106,0.08)', border: '0.5px solid rgba(196,131,106,0.3)', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { ActiveAccountProvider } from './contexts/ActiveAccountContext';
import Sidebar from './components/ui/Sidebar';
import Topbar from './components/ui/Topbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Intelligence from './pages/Intelligence';
import Campaigns from './pages/Campaigns';
import Brands from './pages/Brands';
import Connect from './pages/Connect';
import Settings from './pages/Settings';
import DemoDashboard from './pages/DemoDashboard';
import Pricing from './pages/Pricing';
import Audit from './pages/Audit';
import MetaCallback from './pages/MetaCallback';
import ShopifyCallback from './pages/ShopifyCallback';
import CampaignWorkshop from './pages/CampaignWorkshop';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

const LoadingScreen: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F0A07', gap: 12 }}>
    <div className="animate-spin" style={{ width: 18, height: 18, border: '1.5px solid #2a1a0e', borderTopColor: '#C4836A', borderRadius: '50%' }} />
    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: '#6b4030', letterSpacing: '0.1em' }}>Loading…</span>
  </div>
);


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Topbar />
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{children}</div>
    </div>
  </div>
);

const AppRoutes: React.FC = () => (
  <Routes>
    {/* ── Public ── */}
    <Route path="/"        element={<Landing />} />
    <Route path="/login"   element={<Login />} />
    <Route path="/demo"    element={<DemoDashboard />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/audit"   element={<Audit />} />

    {/* ── OAuth Callbacks (public, no sidebar) ── */}
    <Route path="/connect/meta/callback"    element={<MetaCallback />} />
    <Route path="/connect/shopify/callback" element={<ShopifyCallback />} />

    {/* ── Onboarding (auth, no sidebar) ── */}
    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

    {/* ── Protected app ── */}
    <Route path="/dashboard"   element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
    <Route path="/intelligence" element={<ProtectedRoute><AppLayout><Intelligence /></AppLayout></ProtectedRoute>} />
    <Route path="/campaigns"   element={<ProtectedRoute><AppLayout><Campaigns /></AppLayout></ProtectedRoute>} />
    <Route path="/brands"      element={<ProtectedRoute><AppLayout><Brands /></AppLayout></ProtectedRoute>} />
    <Route path="/connect"     element={<ProtectedRoute><AppLayout><Connect /></AppLayout></ProtectedRoute>} />
    <Route path="/settings"        element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
    <Route path="/campaign-workshop" element={<ProtectedRoute><AppLayout><CampaignWorkshop /></AppLayout></ProtectedRoute>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <AppErrorBoundary>
    <ActiveAccountProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ActiveAccountProvider>
  </AppErrorBoundary>
);

export default App;
