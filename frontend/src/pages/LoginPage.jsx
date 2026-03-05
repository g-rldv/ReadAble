// ============================================================
// Auth Pages — Login & Register
// ============================================================
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}>
      <Link to="/" className="flex items-center gap-2 mb-8 self-start max-w-sm w-full">
        <ArrowLeft size={18} className="text-gray-400" />
        <span className="text-sm text-gray-500">Back to home</span>
      </Link>
      <div className="w-full max-w-sm rounded-3xl p-8 shadow-card border border-gray-100 dark:border-gray-700 animate-pop"
        style={{ background: 'var(--bg-card)' }}>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📚</div>
          <h1 className="font-display text-3xl text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, name, required }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="mb-4">
      <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800
                     text-gray-900 dark:text-white font-medium text-sm outline-none
                     focus:border-sky focus:bg-white dark:focus:bg-gray-700 transition-all"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back!" subtitle="Sign in to continue your journey">
      <form onSubmit={submit}>
        <Input label="Email" type="email" name="email" value={form.email} onChange={handle}
          placeholder="you@example.com" required />
        <Input label="Password" type="password" name="password" value={form.password} onChange={handle}
          placeholder="Your password" required />
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-coral/10 text-coral text-sm font-semibold border border-coral/20">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading}
          className="btn-game w-full bg-sky text-white text-base mt-2 disabled:opacity-60">
          {loading ? '⏳ Signing in…' : '✨ Sign In'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        New here?{' '}
        <Link to="/register" className="text-sky font-bold hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

// ── Register Page ─────────────────────────────────────────────
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Join ReadAble!" subtitle="Create your free account — it takes 30 seconds">
      <form onSubmit={submit}>
        <Input label="Username" name="username" value={form.username} onChange={handle}
          placeholder="SuperReader" required />
        <Input label="Email" type="email" name="email" value={form.email} onChange={handle}
          placeholder="you@example.com" required />
        <Input label="Password" type="password" name="password" value={form.password} onChange={handle}
          placeholder="At least 6 characters" required />
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-coral/10 text-coral text-sm font-semibold border border-coral/20">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading}
          className="btn-game w-full bg-coral text-white text-base mt-2 disabled:opacity-60">
          {loading ? '⏳ Creating account…' : '🚀 Start Learning!'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-sky font-bold hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
