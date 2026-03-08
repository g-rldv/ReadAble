// ============================================================
// AuthContext — stable sessions, no false logouts, auto-refresh
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

// How often to proactively refresh the token (every 20 days)
const REFRESH_INTERVAL_MS = 20 * 24 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('readable_token'));
  const [loading, setLoading] = useState(true);
  const refreshTimer          = useRef(null);

  // ── Apply a new token everywhere ─────────────────────────────
  const applyToken = useCallback((t) => {
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
  }, []);

  // ── Clear session ─────────────────────────────────────────────
  const clearSession = useCallback(() => {
    localStorage.removeItem('readable_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    if (refreshTimer.current) clearInterval(refreshTimer.current);
  }, []);

  // ── Listen for forced logout from api interceptor ─────────────
  useEffect(() => {
    const handler = () => clearSession();
    window.addEventListener('readable:logout', handler);
    return () => window.removeEventListener('readable:logout', handler);
  }, [clearSession]);

  // ── Proactive token refresh every 20 days ─────────────────────
  const scheduleRefresh = useCallback((currentToken) => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(async () => {
      try {
        const res = await api.post('/auth/refresh');
        applyToken(res.data.token);
        if (res.data.user) setUser(res.data.user);
      } catch (_) {
        // Silently fail — don't log out on a background refresh failure
      }
    }, REFRESH_INTERVAL_MS);
  }, [applyToken]);

  // ── Restore session on mount ──────────────────────────────────
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    let attempts = 0;
    const tryFetch = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        scheduleRefresh(token);
      } catch (err) {
        // Only clear session if the server explicitly says unauthorized (401)
        // Network errors, 500s, timeouts should NOT log the user out
        if (err.response?.status === 401) {
          clearSession();
        } else if (attempts < 2) {
          // Retry up to 2 times for network issues (Render cold start, etc.)
          attempts++;
          setTimeout(tryFetch, 3000);
          return;
        }
        // After retries exhausted on non-401 errors, leave the token in place
        // so the user is still "logged in" and can retry actions manually
      } finally {
        setLoading(false);
      }
    };

    tryFetch();

    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, []); // eslint-disable-line — intentionally runs once on mount

  // ── Login ─────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    applyToken(t);
    setUser(u);
    scheduleRefresh(t);
    return u;
  }, [applyToken, scheduleRefresh]);

  // ── Register ──────────────────────────────────────────────────
  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    const { token: t, user: u } = res.data;
    applyToken(t);
    setUser(u);
    scheduleRefresh(t);
    return u;
  }, [applyToken, scheduleRefresh]);

  // ── Logout ────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  // ── Refresh user data (after XP earned, profile update, etc.) ─
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (_) {
      // Silently fail — don't affect the session
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
