// ============================================================
// API utility — axios instance pointed at the backend
// Timeout raised to 30s to handle Render free-tier cold starts.
// ============================================================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 30000,
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
