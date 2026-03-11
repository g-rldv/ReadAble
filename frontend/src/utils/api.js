// ============================================================
// API utility — axios instance pointed at the backend
// Timeout is 12 s: long enough for Render free-tier cold starts,
// short enough that users get feedback quickly when it fails.
// HTTP status is attached to every rejected error so callers
// can distinguish a 401 (bad token) from a network failure.
// ============================================================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.error || err.message || 'Something went wrong';
    const error   = new Error(message);
    error.status  = err.response?.status ?? null;
    return Promise.reject(error);
  }
);

export default api;
