// ============================================================
// Auth Context — global user/token state
// Cross-device settings sync: pushes local settings to server
// on login when user has made local changes (dirty flag).
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('readable_token'));
  const [loading, setLoading] = useState(true);

  // Fetch current user when token is available (page load / refresh)
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('readable_token');
        delete api.defaults.headers.common['Authorization'];
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // ── Helpers ──────────────────────────────────────────────────
  // After login, if the user changed settings locally (e.g. theme on landing page)
  // we push those to the server so they sync cross-device.
  // The 'readable_settings_dirty' flag is set by SettingsContext.updateSettings.
  const maybeSyncLocalSettings = useCallback(async () => {
    const dirty = localStorage.getItem('readable_settings_dirty') === 'true';
    if (!dirty) return;
    const stored = localStorage.getItem('readable_settings');
    if (!stored) return;
    try {
      await api.put('/settings', JSON.parse(stored));
      localStorage.removeItem('readable_settings_dirty');
    } catch (_) {}
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    // Sync any local setting changes to server BEFORE setting token
    // (setting token triggers SettingsContext to fetch from server)
    try {
      const dirty   = localStorage.getItem('readable_settings_dirty') === 'true';
      const stored  = localStorage.getItem('readable_settings');
      if (dirty && stored) {
        await api.put('/settings', JSON.parse(stored));
        localStorage.removeItem('readable_settings_dirty');
      }
    } catch (_) {}
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    // New account: push local settings (mainly theme/size user set while browsing)
    try {
      const stored = localStorage.getItem('readable_settings');
      if (stored) await api.put('/settings', JSON.parse(stored));
      localStorage.removeItem('readable_settings_dirty');
    } catch (_) {}
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('readable_token');
    // Keep settings in localStorage so landing page still has the user's theme
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (_) {}
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
