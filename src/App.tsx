import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/ui/Sidebar';
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
      {children}
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
    <Route path="/connect/meta/callback" element={<MetaCallback />} />

    {/* ── Onboarding (auth, no sidebar) ── */}
    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

    {/* ── Protected app ── */}
    <Route path="/dashboard"   element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
    <Route path="/intelligence" element={<ProtectedRoute><AppLayout><Intelligence /></AppLayout></ProtectedRoute>} />
    <Route path="/campaigns"   element={<ProtectedRoute><AppLayout><Campaigns /></AppLayout></ProtectedRoute>} />
    <Route path="/brands"      element={<ProtectedRoute><AppLayout><Brands /></AppLayout></ProtectedRoute>} />
    <Route path="/connect"     element={<ProtectedRoute><AppLayout><Connect /></AppLayout></ProtectedRoute>} />
    <Route path="/settings"    element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
