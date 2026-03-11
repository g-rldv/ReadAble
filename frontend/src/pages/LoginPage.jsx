// ============================================================
// LoginPage + RegisterPage — fixed layout, forgot password, confirm password
// ============================================================
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, BookOpen, Mail, Lock, User, Check } from 'lucide-react';

// ── Shared layout wrapper ─────────────────────────────────────
function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Fixed back-to-home bar at very top */}
      <div className="flex-shrink-0 px-6 pt-5 pb-2">
        <Link to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400
                     hover:text-sky transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-sky flex items-center justify-center mx-auto mb-3 shadow-lg">
              <BookOpen size={28} className="text-white" />
            </div>
            <span className="font-display text-2xl text-sky">ReadAble</span>
          </div>
          {/* Card */}
          <div className="rounded-3xl p-8 shadow-card animate-pop"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable input ────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, placeholder, name, required, icon: Icon, error }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="mb-4">
      <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon size={16} className="text-gray-400" />
          </div>
        )}
        <input
          name={name}
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full px-4 py-3 rounded-2xl border-2 text-sm font-medium outline-none transition-all
                      bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                      focus:bg-white dark:focus:bg-gray-700
                      ${Icon ? 'pl-9' : ''}
                      ${error ? 'border-rose-400' : 'border-gray-200 dark:border-gray-600 focus:border-sky'}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Forgot Password view ──────────────────────────────────────
function ForgotPasswordView({ onBack }) {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    // Simulate an API call — replace with real endpoint when available
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-sky mb-5 transition-colors group">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Sign In
      </button>

      {!sent ? (
        <>
          <h2 className="font-display text-2xl text-gray-900 dark:text-white mb-1">Forgot Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Enter your email and we will send you a reset link.
          </p>
          <form onSubmit={handleSubmit}>
            <Input label="Email address" type="email" name="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              icon={Mail} required />
            <button type="submit" disabled={loading}
              className="btn-game w-full bg-sky text-white text-base mt-2 disabled:opacity-60">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30
                          flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-500" />
          </div>
          <h3 className="font-display text-xl text-gray-800 dark:text-gray-100 mb-2">Check your email</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            If an account with <strong>{email}</strong> exists, a reset link has been sent.
          </p>
          <button onClick={onBack} className="text-sm font-bold text-sky hover:underline">
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,      setForm]      = useState({ email: '', password: '' });
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showForgot,setShowForgot]= useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (/invalid|password|credentials/i.test(msg)) setError('Incorrect email or password. Please try again.');
      else if (/not found|no account/i.test(msg))   setError('No account found with that email.');
      else                                           setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {showForgot ? (
        <ForgotPasswordView onBack={() => setShowForgot(false)} />
      ) : (
        <>
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl text-gray-900 dark:text-white">Welcome back!</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to continue your journey</p>
          </div>
          <form onSubmit={submit}>
            <Input label="Email" type="email" name="email" value={form.email} onChange={handle}
              placeholder="you@example.com" icon={Mail} required />
            <Input label="Password" type="password" name="password" value={form.password} onChange={handle}
              placeholder="Your password" icon={Lock} required />
            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600
                              dark:text-rose-400 text-sm font-semibold border border-rose-200 dark:border-rose-800">
                {error}
              </div>
            )}
            <div className="flex justify-end mb-4 -mt-1">
              <button type="button" onClick={() => setShowForgot(true)}
                className="text-xs font-semibold text-sky hover:underline">
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="btn-game w-full bg-sky text-white text-base disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            New here?{' '}
            <Link to="/register" className="text-sky font-bold hover:underline">Create an account</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}

// ── Register Page ─────────────────────────────────────────────
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const handle = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (form.username.trim().length < 3) e.username = 'Username must be at least 3 characters.';
    if (!form.email.includes('@'))       e.email    = 'Please enter a valid email address.';
    if (form.password.length < 6)        e.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirm)  e.confirm  = 'Passwords do not match.';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register(form.username.trim(), form.email.trim(), form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (/username.*taken|already.*use/i.test(msg)) setErrors({ username: 'That username is already taken.' });
      else if (/email.*taken/i.test(msg))           setErrors({ email: 'An account with that email already exists.' });
      else                                          setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-6">
        <h1 className="font-display text-2xl text-gray-900 dark:text-white">Join ReadAble!</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your free account in 30 seconds</p>
      </div>
      <form onSubmit={submit}>
        <Input label="Username" name="username" value={form.username} onChange={handle}
          placeholder="SuperReader" icon={User} required error={errors.username} />
        <Input label="Email" type="email" name="email" value={form.email} onChange={handle}
          placeholder="you@example.com" icon={Mail} required error={errors.email} />
        <Input label="Password" type="password" name="password" value={form.password} onChange={handle}
          placeholder="At least 6 characters" icon={Lock} required error={errors.password} />
        <Input label="Confirm Password" type="password" name="confirm" value={form.confirm} onChange={handle}
          placeholder="Repeat your password" icon={Lock} required error={errors.confirm} />
        {errors.general && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600
                          dark:text-rose-400 text-sm font-semibold border border-rose-200 dark:border-rose-800">
            {errors.general}
          </div>
        )}
        <button type="submit" disabled={loading}
          className="btn-game w-full bg-coral text-white text-base mt-2 disabled:opacity-60">
          {loading ? 'Creating account…' : 'Start Learning!'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-sky font-bold hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
