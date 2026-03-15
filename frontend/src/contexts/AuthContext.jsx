// ============================================================
// Auth Context — stable multi-device session management
//
// Key design decisions:
//  • Token is stored in a ref so polling callbacks never go stale
//    without recreating the interval.
//  • Only a genuine HTTP 401 clears the session. Network errors,
//    timeouts, and Render cold-start 502/503s keep the user logged in.
//  • Polls /auth/me every 30 s (only while tab is visible) so XP,
//    level, streak and achievements stay in sync across devices.
//  • Fires an immediate refresh when the tab regains focus.
// ============================================================
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);
const POLL_MS = 30_000;

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('readable_token'));
  const [loading, setLoading] = useState(true);

  // Keep a ref to the latest token so poll/focus handlers
  // always have the current value without recreating effects.
  const tokenRef   = useRef(token);
  const pollRef    = useRef(null);

  // ── Merge user — only triggers re-render when something changed ─
  const mergeUser = useCallback((next) => {
    if (!next) return;
    setUser(prev => {
      if (!prev) return next;
      const same =
        prev.xp           === next.xp     &&
        prev.level        === next.level  &&
        prev.streak       === next.streak &&
        prev.username     === next.username &&
        prev.avatar       === next.avatar &&
        (prev.achievements?.length ?? 0) === (next.achievements?.length ?? 0);
      return same ? prev : next;
    });
  }, []);

  // ── Core fetch — never clears session on network errors ────────
  const fetchUser = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const res = await api.get('/auth/me');
      mergeUser(res.data.user);
    } catch (err) {
      if (err.status === 401) {
        // Genuine invalid/expired token — log out
        localStorage.removeItem('readable_token');
        delete api.defaults.headers.common['Authorization'];
        tokenRef.current = null;
        setToken(null);
        setUser(null);
      }
      // All other errors (timeout, 502, network) — keep session alive
    }
  }, [mergeUser]);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    tokenRef.current = token;
    if (!token) { setLoading(false); return; }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchUser().finally(() => setLoading(false));
  }, [token, fetchUser]);

  // ── Polling — single stable interval, never recreated ─────────
  useEffect(() => {
    const start = () => {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        if (tokenRef.current && document.visibilityState === 'visible') fetchUser();
      }, POLL_MS);
    };
    const onVisible = () => {
      if (tokenRef.current && document.visibilityState === 'visible') fetchUser();
    };
    start();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchUser]); // fetchUser is stable (useCallback with stable deps)

  // ── Settings dirty-flag sync ─────────────────────────────────
  // Only push local settings to server if the user explicitly changed
  // something (dirty flag) AND the token header is already set.
  // We purposely do NOT overwrite server settings on a new device that
  // hasn't changed anything — the server is the source of truth once
  // the user is logged in.
  const syncLocalSettings = async () => {
    if (localStorage.getItem('readable_settings_dirty') !== 'true') return;
    const stored = localStorage.getItem('readable_settings');
    if (!stored) return;
    try {
      await api.put('/settings', JSON.parse(stored));
      localStorage.removeItem('readable_settings_dirty');
    } catch (_) {}
    // After pushing, immediately re-fetch so UI reflects server state
  };

  // ── Login ─────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    tokenRef.current = t;
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
    tokenRef.current = t;
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
    tokenRef.current = null;
    setToken(null);
    setUser(null);
  }, []);

  // ── Manual refresh (after earning XP, changing avatar…) ───────
  const refreshUser = useCallback(() => fetchUser(), [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
