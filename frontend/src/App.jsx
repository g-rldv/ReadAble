// ============================================================
// App.jsx — root router (leaderboard removed)
// ============================================================
import React, { Component, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

import LandingPage    from './pages/LandingPage';
import LoginPage, { RegisterPage } from './pages/LoginPage';
import AppLayout      from './components/layout/AppLayout';

const DashboardPage  = React.lazy(() => import('./pages/DashboardPage'));
const ActivitiesPage = React.lazy(() => import('./pages/ActivitiesPage'));
const GamePage       = React.lazy(() => import('./pages/GamePage'));
const ProfilePage    = React.lazy(() => import('./pages/ProfilePage'));
const SettingsPage   = React.lazy(() => import('./pages/SettingsPage'));
const ShopPage       = React.lazy(() => import('./pages/ShopPage'));

function Spinner({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-primary, #FFF8F0)' }}>
      <div className="w-10 h-10 rounded-full border-4 border-sky border-t-transparent animate-spin" />
      <p className="font-display text-lg text-sky">{message}</p>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e) { console.error('[ErrorBoundary]', e); }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8"
          style={{ background: 'var(--bg-primary)' }}>
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-rose-500">!</span>
          </div>
          <h2 className="font-display text-2xl text-gray-800 dark:text-gray-100">Something went wrong</h2>
          <p className="text-sm text-gray-500 text-center max-w-sm">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
            className="px-6 py-2.5 rounded-2xl bg-sky text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner message="Loading ReadAble…" />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <Spinner message="Loading ReadAble…" />;

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/activities"  element={<ActivitiesPage />} />
          <Route path="/game/:id"    element={<GamePage />} />
          <Route path="/profile"     element={<ProfilePage />} />
          <Route path="/settings"    element={<SettingsPage />} />
          <Route path="/shop"        element={<ShopPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
