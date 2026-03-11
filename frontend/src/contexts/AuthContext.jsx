// ============================================================
// Auth Context — global user/token state
//
// Multi-device safety rules:
//  1. NEVER clear the token on a network error or server timeout.
//     Only a genuine HTTP 401 means the token is invalid.
//  2. Poll /auth/me every 30 s while the tab is visible so XP,
//     level, streak and achievements stay in sync across devices.
//  3. On tab focus (visibilitychange) do an immediate poll so the
//     user always sees fresh data after switching back.
//  4. On login/register, flush any pending local settings to the
//     server so the theme chosen on the landing page carries over.
// ============================================================
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

// How often to auto-refresh user data (ms)
const POLL_INTERVAL = 30_000;

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('readable_token'));
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────
  // Only replace user object when something meaningful changed.
  // This avoids cascading re-renders on every 30-second poll.
  const mergeUser = useCallback((next) => {
    if (!next) return;
    setUser(prev => {
      if (!prev) return next;
      const changed =
        prev.xp           !== next.xp           ||
        prev.level        !== next.level         ||
        prev.streak       !== next.streak        ||
        prev.username     !== next.username      ||
        prev.avatar       !== next.avatar        ||
        prev.achievements?.length !== next.achievements?.length;
      return changed ? next : prev;
    });
  }, []);

  // Fetch fresh user from server — used by polling + refreshUser.
  // Returns true on success, false on network error, throws on 401.
  const fetchUser = useCallback(async (tkn) => {
    const t = tkn ?? token;
    if (!t) return false;
    try {
      const res = await api.get('/auth/me');
      mergeUser(res.data.user);
      return true;
    } catch (err) {
      if (err.status === 401) {
        // Token is genuinely invalid / expired — log out cleanly
        localStorage.removeItem('readable_token');
        delete api.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
        throw err; // re-throw so callers know
      }
      // Network error, timeout, Render cold-start (503/502) etc.
      // Keep the user logged in — the token is still valid.
      console.warn('[Auth] Temporary fetch error (keeping session):', err.message);
      return false;
    }
  }, [token, mergeUser]);

  // ── Initial load on mount / token change ─────────────────────
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchUser(token).finally(() => setLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 30-second polling for multi-device sync ──────────────────
  useEffect(() => {
    if (!token) return;
    pollRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fetchUser();
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [token, fetchUser]);

  // ── Immediate refresh on tab focus ───────────────────────────
  useEffect(() => {
    if (!token) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [token, fetchUser]);

  // ── Settings dirty-flag sync ─────────────────────────────────
  // If the user changed settings while not logged in (e.g. theme on
  // landing page), push those settings to the server right after login.
  const syncLocalSettings = async () => {
    const dirty  = localStorage.getItem('readable_settings_dirty') === 'true';
    const stored = localStorage.getItem('readable_settings');
    if (dirty && stored) {
      try {
        await api.put('/settings', JSON.parse(stored));
        localStorage.removeItem('readable_settings_dirty');
      } catch (_) {}
    }
  };

  // ── Login ─────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    await syncLocalSettings();
    setToken(t);
    setUser(u);
    return u;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register ──────────────────────────────────────────────────
  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    await syncLocalSettings();
    setToken(t);
    setUser(u);
    return u;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Logout ────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearInterval(pollRef.current);
    localStorage.removeItem('readable_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  // ── Manual refresh (called after earning XP, changing avatar…) ─
  const refreshUser = useCallback(async () => {
    if (!token) return;
    await fetchUser();
  }, [token, fetchUser]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
