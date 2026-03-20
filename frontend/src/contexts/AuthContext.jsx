// ============================================================
// Auth Context
// Change from original: register() accepts otp_code as 4th arg
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

  const tokenRef = useRef(token);
  const pollRef  = useRef(null);

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

  const fetchUser = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const res = await api.get('/auth/me');
      mergeUser(res.data.user);
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem('readable_token');
        delete api.defaults.headers.common['Authorization'];
        tokenRef.current = null;
        setToken(null);
        setUser(null);
      }
    }
  }, [mergeUser]);

  useEffect(() => {
    tokenRef.current = token;
    if (!token) { setLoading(false); return; }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchUser().finally(() => setLoading(false));
  }, [token, fetchUser]);

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
  }, [fetchUser]);

  const syncLocalSettings = async () => {
    if (localStorage.getItem('readable_settings_dirty') !== 'true') return;
    const stored = localStorage.getItem('readable_settings');
    if (!stored) return;
    try {
      await api.put('/settings', JSON.parse(stored));
      localStorage.removeItem('readable_settings_dirty');
    } catch (_) {}
  };

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
  }, []); // eslint-disable-line

  // otp_code is the 4th argument — required for the new registration flow
  const register = useCallback(async (username, email, password, otp_code) => {
    const res = await api.post('/auth/register', { username, email, password, otp_code });
    const { token: t, user: u } = res.data;
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    tokenRef.current = t;
    await syncLocalSettings();
    setToken(t);
    setUser(u);
    return u;
  }, []); // eslint-disable-line

  const logout = useCallback(() => {
    clearInterval(pollRef.current);
    localStorage.removeItem('readable_token');
    delete api.defaults.headers.common['Authorization'];
    tokenRef.current = null;
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => fetchUser(), [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
