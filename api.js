// ============================================================
// API Utility — axios instance with base URL
// ============================================================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — unwrap errors into readable messages
api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.error || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
