// ============================================================
// API Utility — axios instance with base URL + error handling
// CRITICAL: we preserve the HTTP status code on every error so
// callers can distinguish a 401 (bad token) from a 5xx / network
// error (server sleeping on Render free tier, etc.)
// ============================================================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 20000,  // 20 s — generous for Render cold-starts
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — unwrap error messages but KEEP the status code
api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.error || err.message || 'Something went wrong';
    const error   = new Error(message);
    // Attach status so AuthContext can act on 401 vs network errors
    error.status  = err.response?.status ?? null;
    return Promise.reject(error);
  }
);

export default api;
