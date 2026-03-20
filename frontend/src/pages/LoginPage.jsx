// ============================================================
// LoginPage + RegisterPage
// • Registration:     form → email OTP → account created
// • Forgot password:  email → OTP → new password → done
// ============================================================
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Eye, EyeOff, ArrowLeft, BookOpen, Mail, Lock, User,
  Check, RefreshCw, ShieldCheck,
} from 'lucide-react';

// ── Shared layout wrapper ─────────────────────────────────────
function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex-shrink-0 px-6 pt-5 pb-2">
        <Link to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400
                     hover:text-sky transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-sky flex items-center justify-center mx-auto mb-3 shadow-lg">
              <BookOpen size={28} className="text-white" />
            </div>
            <span className="font-display text-2xl text-sky">ReadAble</span>
          </div>
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

// ── OTP Input — 6 individual digit boxes ─────────────────────
function OTPInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx]  = char;
    onChange(next.join(''));
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits]; next[idx] = ''; onChange(next.join(''));
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
        const next = [...digits]; next[idx - 1] = ''; onChange(next.join(''));
      }
    }
    if (e.key === 'ArrowLeft'  && idx > 0) inputs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    onChange(pasted.padEnd(6, '').slice(0, 6));
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-11 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none
                     transition-all select-none
                     bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:border-sky focus:bg-white dark:focus:bg-gray-700 focus:scale-105
                     border-gray-200 dark:border-gray-600"
        />
      ))}
    </div>
  );
}

// ── Forgot / Reset Password View ──────────────────────────────
// Steps: 'email' → 'otp' → 'newpass' → 'done'
function ForgotPasswordView({ onBack }) {
  const [step,        setStep]        = useState('email');
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [otpError,    setOtpError]    = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError,   setPassError]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [resendCd,    setResendCd]    = useState(0);

  // ── Step 1: send OTP ─────────────────────────────────────
  const sendOTP = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim(), type: 'reset' });
      setStep('otp');
      startResendCooldown();
    } catch (err) {
      // Even on error we show the same neutral message
      setStep('otp');
      startResendCooldown();
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCd(60);
    const iv = setInterval(() => {
      setResendCd(c => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; });
    }, 1000);
  };

  // ── Step 2: proceed after OTP entered ───────────────────
  const submitOTP = (e) => {
    e.preventDefault();
    if (otp.length < 6) { setOtpError('Please enter all 6 digits.'); return; }
    setOtpError('');
    setStep('newpass');
  };

  // ── Step 3: reset password ───────────────────────────────
  const submitNewPass = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) { setPassError('Password must be at least 6 characters.'); return; }
    if (newPass !== confirmPass) { setPassError('Passwords do not match.'); return; }
    setPassError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(), otp_code: otp, new_password: newPass,
      });
      setStep('done');
    } catch (err) {
      const msg = err.message || '';
      if (/invalid|expired|code/i.test(msg)) {
        setPassError('');
        setOtpError(msg);
        setStep('otp');       // send user back to re-enter OTP
      } else {
        setPassError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-sky mb-5 transition-colors group">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Sign In
      </button>

      {/* ── Step 1: email ────────────────────────────────── */}
      {step === 'email' && (
        <>
          <h2 className="font-display text-2xl text-gray-900 dark:text-white mb-1">Forgot Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Enter your email and we will send you a 6-digit code.
          </p>
          <form onSubmit={sendOTP}>
            <Input label="Email address" type="email" name="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              icon={Mail} required />
            <button type="submit" disabled={loading}
              className="btn-game w-full bg-sky text-white text-base mt-2 disabled:opacity-60">
              {loading ? 'Sending…' : 'Send Reset Code'}
            </button>
          </form>
        </>
      )}

      {/* ── Step 2: OTP entry ────────────────────────────── */}
      {step === 'otp' && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} className="text-sky" />
            <h2 className="font-display text-2xl text-gray-900 dark:text-white">Check your email</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            We sent a 6-digit code to <strong className="text-gray-700 dark:text-gray-200">{email}</strong>.
            It expires in 10 minutes.
          </p>
          <form onSubmit={submitOTP}>
            <div className="mb-4">
              <OTPInput value={otp} onChange={v => { setOtp(v); setOtpError(''); }} />
              {otpError && (
                <p className="text-xs text-rose-500 mt-2 text-center">{otpError}</p>
              )}
            </div>
            <button type="submit" disabled={otp.length < 6}
              className="btn-game w-full bg-sky text-white text-base disabled:opacity-50">
              Verify Code
            </button>
          </form>
          <div className="text-center mt-4">
            {resendCd > 0 ? (
              <p className="text-xs text-gray-400">Resend available in {resendCd}s</p>
            ) : (
              <button onClick={sendOTP}
                className="text-xs font-semibold text-sky hover:underline flex items-center gap-1 mx-auto">
                <RefreshCw size={11} /> Resend code
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Step 3: new password ─────────────────────────── */}
      {step === 'newpass' && (
        <>
          <h2 className="font-display text-2xl text-gray-900 dark:text-white mb-1">New Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Choose a new password for your account.
          </p>
          <form onSubmit={submitNewPass}>
            <Input label="New password" type="password" name="newpass" value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="At least 6 characters" icon={Lock} required />
            <Input label="Confirm new password" type="password" name="confirm" value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Repeat your new password" icon={Lock} required
              error={passError} />
            <button type="submit" disabled={loading}
              className="btn-game w-full bg-sky text-white text-base mt-2 disabled:opacity-60">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </>
      )}

      {/* ── Step 4: done ─────────────────────────────────── */}
      {step === 'done' && (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30
                          flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-500" />
          </div>
          <h3 className="font-display text-xl text-gray-800 dark:text-gray-100 mb-2">Password reset!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Your password has been updated. You can now sign in.
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
  const [form,       setForm]       = useState({ email: '', password: '' });
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (/invalid|password|credentials/i.test(msg)) setError('Incorrect email or password. Please try again.');
      else if (/not found|no account/i.test(msg))    setError('No account found with that email.');
      else                                           setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
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
// Step 'form' → validate → send OTP → step 'otp' → register
export function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [step,    setStep]    = useState('form'); // 'form' | 'otp'
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [otp,     setOtp]     = useState('');
  const [otpErr,  setOtpErr]  = useState('');
  const [resendCd,setResendCd]= useState(0);

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

  // ── Step 1: validate then send OTP ───────────────────────
  const submitForm = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email.trim(), type: 'register' });
      setStep('otp');
      startResendCooldown();
    } catch (err) {
      const msg = err.message || '';
      if (/already exists/i.test(msg)) setErrors({ email: 'An account with that email already exists.' });
      else                             setErrors({ general: msg || 'Failed to send code. Please try again.' });
    } finally { setLoading(false); }
  };

  const startResendCooldown = () => {
    setResendCd(60);
    const iv = setInterval(() => {
      setResendCd(c => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; });
    }, 1000);
  };

  const resendOTP = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email.trim(), type: 'register' });
      startResendCooldown();
      setOtpErr('');
    } catch (_) {}
    finally { setLoading(false); }
  };

  // ── Step 2: verify OTP + create account ──────────────────
  const submitOTP = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { setOtpErr('Please enter all 6 digits.'); return; }
    setOtpErr(''); setLoading(true);
    try {
      await register(form.username.trim(), form.email.trim(), form.password, otp);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (/invalid|expired|code/i.test(msg)) setOtpErr(msg || 'Invalid or expired code.');
      else if (/username.*taken/i.test(msg))  setErrors({ username: 'That username is already taken.' });
      else                                   setOtpErr(msg || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      {step === 'form' && (
        <>
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl text-gray-900 dark:text-white">Join ReadAble!</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your free account in 30 seconds</p>
          </div>
          <form onSubmit={submitForm}>
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
              {loading ? 'Sending code…' : 'Continue →'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-sky font-bold hover:underline">Sign in</Link>
          </p>
        </>
      )}

      {step === 'otp' && (
        <div className="animate-fade-in">
          <button onClick={() => { setStep('form'); setOtp(''); setOtpErr(''); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-sky mb-5 transition-colors group">
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Edit details
          </button>

          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} className="text-coral" />
            <h2 className="font-display text-2xl text-gray-900 dark:text-white">Verify your email</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            We sent a 6-digit code to{' '}
            <strong className="text-gray-700 dark:text-gray-200">{form.email}</strong>.
            Enter it below to confirm your account.
          </p>

          <form onSubmit={submitOTP}>
            <div className="mb-5">
              <OTPInput value={otp} onChange={v => { setOtp(v); setOtpErr(''); }} />
              {otpErr && (
                <p className="text-xs text-rose-500 mt-2 text-center">{otpErr}</p>
              )}
            </div>
            <button type="submit" disabled={otp.length < 6 || loading}
              className="btn-game w-full bg-coral text-white text-base disabled:opacity-50">
              {loading ? 'Creating account…' : 'Start Learning! 🎉'}
            </button>
          </form>

          <div className="text-center mt-4">
            {resendCd > 0 ? (
              <p className="text-xs text-gray-400">Resend available in {resendCd}s</p>
            ) : (
              <button onClick={resendOTP} disabled={loading}
                className="text-xs font-semibold text-sky hover:underline flex items-center gap-1 mx-auto">
                <RefreshCw size={11} /> Resend code
              </button>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default LoginPage;
