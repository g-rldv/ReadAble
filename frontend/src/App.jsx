// ============================================================
// App.jsx — Root component with routing and context providers
// ============================================================
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ActivitiesPage from './pages/ActivitiesPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import LeaderboardPage from './pages/LeaderboardPage';

// Layout
import AppLayout from './components/layout/AppLayout';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream dark:bg-gray-900">
      <div className="text-6xl animate-bounce">📚</div>
      <p className="font-display text-2xl text-sky mt-4">Loading ReadAble…</p>
    </div>
  );
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"          element={<LandingPage />} />
      <Route path="/login"     element={<LoginPage />} />
      <Route path="/register"  element={<RegisterPage />} />

      {/* Protected app routes inside AppLayout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard"   element={<DashboardPage />} />
        <Route path="/activities"  element={<ActivitiesPage />} />
        <Route path="/game/:id"    element={<GamePage />} />
        <Route path="/profile"     element={<ProfilePage />} />
        <Route path="/settings"    element={<SettingsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppRoutes />
      </SettingsProvider>
    </AuthProvider>
  );
}
