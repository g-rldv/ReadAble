// ============================================================
// api.js — Axios instance with retry, timeout, 401 handling
// ============================================================
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15s — handles Render free tier cold starts
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach token to every request ────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('readable_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle 401 and retry on network fail
let isRefreshing  = false;
let refreshQueue  = []; // pending requests while refreshing

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  // Success — pass through
  (response) => response,

  async (error) => {
    const original = error.config;

    // ── Network error / timeout: retry once after 2s ──────────
    if (!error.response && !original._retried) {
      original._retried = true;
      await new Promise(r => setTimeout(r, 2000));
      return api(original);
    }

    // ── 401 Unauthorized: try to refresh token once ───────────
    if (error.response?.status === 401 && !original._refreshed) {
      original._refreshed = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const token = localStorage.getItem('readable_token');
        if (!token) throw new Error('No token');

        const res = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newToken = res.data.token;
        localStorage.setItem('readable_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);

      } catch (refreshError) {
        processQueue(refreshError, null);
        // Only clear session if refresh itself got a 401 (truly expired)
        if (refreshError.response?.status === 401) {
          localStorage.removeItem('readable_token');
          window.dispatchEvent(new Event('readable:logout'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
