// ============================================================
// Auth Context — global user/token state
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => localStorage.getItem('readable_token'));
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount / token change
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => { localStorage.removeItem('readable_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('readable_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('readable_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  // Refresh user data (after earning XP, etc.)
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
