// ============================================================
// LandingPage — hero, trial game with connected progress bars,
// red/green answer feedback, quick settings
// Added: Forgot Password flow inside SignInModal
// ============================================================
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  BookOpen, Zap, ArrowRight, Volume2,
  Gamepad2, BarChart2, Trophy, Heart, Cloud,
  TrendingUp, Palette, Check, Star, X, UserPlus,
  Eye, EyeOff, Mail, Lock, User, Settings,
  Sun, Moon, Sparkles, Leaf, LogIn,
  ArrowLeft, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { launchConfetti } from '../utils/confetti';
import api from '../utils/api';

// ── Trial game data ───────────────────────────────────────────
const TRIAL_ITEMS = [
  { emoji:'🌞', answer:'Sun',     options:['Moon','Sun','Star','Cloud']        },
  { emoji:'🐶', answer:'Dog',     options:['Cat','Bird','Dog','Fish']           },
  { emoji:'🌈', answer:'Rainbow', options:['Rainbow','Sunset','Storm','Sky']   },
];

const FEATURES = [
  { Icon:Gamepad2,   title:'Fun Word Games',    desc:'Match words, fill blanks, sort sentences — learning feels like play!'   },
  { Icon:Volume2,    title:'Read Aloud',        desc:'Every activity can be read to you using natural-sounding voices.'        },
  { Icon:TrendingUp, title:'Track Progress',    desc:'Level up, earn badges, and watch your skills grow over time.'            },
  { Icon:Palette,    title:'Customisable',      desc:'Choose from 9 themes, adjust text size, and make it yours.'              },
  { Icon:Heart,      title:'Accessible Design', desc:'Built with everyone in mind — simple, clear, and easy to use.'           },
  { Icon:Trophy,     title:'Earn Rewards',      desc:'Collect badges and climb the leaderboard as you learn!'                  },
];

const FEATURE_PILLS = [
  { Icon:Gamepad2,  label:'Fun Games'         },
  { Icon:Volume2,   label:'Read-Aloud'        },
  { Icon:BarChart2, label:'Progress Tracking' },
  { Icon:Trophy,    label:'Achievements'      },
  { Icon:Heart,     label:'Accessible'        },
];

const QUICK_THEMES = [
  { key:'cotton',   Icon:Sun,      label:'Light'  },
  { key:'sky',      Icon:Heart,    label:'Berry'  },
  { key:'mint',     Icon:Leaf,     label:'Meadow' },
  { key:'sunshine', Icon:Cloud,    label:'Sunrise'},
  { key:'lavender', Icon:Sparkles, label:'Purple' },
  { key:'night',    Icon:Moon,     label:'Night'  },
];

// ── Helpers ───────────────────────────────────────────────────
function spawnWinStars() {
  launchConfetti(80);
  const colors = ['#FFD700','#FFA500','#FF6B6B','#4D96FF','#6BCB77'];
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.textContent = '★';
      el.style.cssText = `
        position:fixed;left:${35+Math.random()*30}vw;top:${30+Math.random()*20}vh;
        font-size:${24+Math.random()*24}px;color:${colors[Math.floor(Math.random()*colors.length)]};
        pointer-events:none;z-index:9999;animation:starBurst 0.8s ease-out forwards;`;
      document.body.appendChild(el);
      setTimeout(()=>el.remove(),900);
    }, i*60);
  }
}

// ── Auth input ────────────────────────────────────────────────
function AuthInput({ label, type='text', value, onChange, placeholder, name, icon:Icon, error }) {
  const [show, setShow] = useState(false);
  const isPwd = type === 'password';
  return (
    <div className="mb-3.5">
      <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Icon size={14} className="text-gray-400"/></div>}
        <input name={name} type={isPwd?(show?'text':'password'):type}
          value={value} onChange={onChange} placeholder={placeholder}
          className={`w-full py-2.5 pr-4 rounded-xl border-2 text-sm font-medium outline-none transition-all
                      bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                      focus:bg-white dark:focus:bg-gray-700
                      ${Icon?'pl-9':'pl-3.5'}
                      ${error?'border-rose-400':'border-gray-200 dark:border-gray-600 focus:border-sky'}`}/>
        {isPwd && (
          <button type="button" onClick={()=>setShow(s=>!s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show?<EyeOff size={15}/>:<Eye size={15}/>}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ── OTP digit input ───────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[idx] = char;
    onChange(next.join(''));
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const n = [...digits]; n[idx] = ''; onChange(n.join(''));
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
        const n = [...digits]; n[idx - 1] = ''; onChange(n.join(''));
      }
    }
    if (e.key === 'ArrowLeft'  && idx > 0) inputs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!p) return;
    onChange(p.padEnd(6, '').slice(0, 6));
    inputs.current[Math.min(p.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-1.5 justify-center">
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
          className="w-10 h-12 text-center text-xl font-bold rounded-xl border-2 outline-none
                     transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:border-sky focus:bg-white dark:focus:bg-gray-700 focus:scale-105
                     border-gray-200 dark:border-gray-600"
        />
      ))}
    </div>
  );
}

// ── Resend cooldown hook ──────────────────────────────────────
function useResendCooldown() {
  const [cd, setCd] = useState(0);
  const start = () => {
    setCd(60);
    const iv = setInterval(() => setCd(c => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; }), 1000);
  };
  return [cd, start];
}

// ── Sign-In loading overlay ───────────────────────────────────
const SIGN_IN_TIPS = [
  '📚 Loading your books…',
  '🏆 Fetching your achievements…',
  '⭐ Counting your XP…',
  '🎮 Warming up your games…',
];

function SignInLoadingOverlay() {
  const [tipIdx, setTipIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % SIGN_IN_TIPS.length), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 animate-fade-in">
      <div className="flex items-end gap-2 mb-6 h-8">
        {[0, 1, 2].map(i => (
          <span key={i} className="block w-3 h-3 rounded-full bg-sky" style={{
            animation: 'signInBounce 0.9s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }}/>
        ))}
      </div>
      <div className="w-full max-w-[180px] h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-5">
        <div className="h-full rounded-full bg-gradient-to-r from-sky to-indigo-400"
          style={{ animation: 'signInBar 1.8s ease-in-out infinite' }}/>
      </div>
      <p key={tipIdx} className="text-sm font-semibold text-gray-500 dark:text-gray-400 animate-fade-in text-center">
        {SIGN_IN_TIPS[tipIdx]}
      </p>
      <style>{`
        @keyframes signInBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-14px); opacity: 1; }
        }
        @keyframes signInBar {
          0%   { width: 0%;  margin-left: 0; }
          50%  { width: 70%; margin-left: 0; }
          100% { width: 0%;  margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── Forgot Password View (inside SignInModal) ─────────────────
// Steps: 'email' → 'otp' → 'newpass' → 'done'
function ForgotPasswordView({ onBack }) {
  const [step,     setStep]     = useState('email');
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [otpErr,   setOtpErr]   = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [passErr,  setPassErr]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resendCd, startResend] = useResendCooldown();

  // Step 1 — send OTP
  const sendOTP = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim(), type: 'reset' });
    } catch (_) {
      // always advance — prevents account enumeration
    } finally {
      setLoading(false);
      setStep('otp');
      startResend();
    }
  };

  // Step 2 — verify digits (client-side gate; server validates on reset)
  const verifyOTP = (e) => {
    e.preventDefault();
    if (otp.length < 6) { setOtpErr('Please enter all 6 digits.'); return; }
    setOtpErr('');
    setStep('newpass');
  };

  // Step 3 — set new password
  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 6)   { setPassErr('Password must be at least 6 characters.'); return; }
    if (newPass !== confirm)   { setPassErr('Passwords do not match.'); return; }
    setPassErr(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(), otp_code: otp, new_password: newPass,
      });
      setStep('done');
    } catch (err) {
      const msg = err.message || '';
      if (/invalid|expired|code/i.test(msg)) {
        setOtpErr(msg);
        setStep('otp');
      } else {
        setPassErr(msg || 'Something went wrong. Please try again.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400
                   hover:text-sky mb-4 transition-colors group">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Sign In
      </button>

      {/* ── Step 1: email ──────────────────────────────── */}
      {step === 'email' && (
        <>
          <h2 className="font-display text-xl mb-0.5 text-gray-900 dark:text-white">Forgot Password?</h2>
          <p className="text-xs text-gray-500 mb-4">
            Enter your email and we'll send you a reset code.
          </p>
          <form onSubmit={sendOTP}>
            <AuthInput label="Email address" type="email" name="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" icon={Mail}/>
            <button type="submit" disabled={loading || !email.trim()}
              className="btn-game w-full bg-sky text-white text-sm mt-1 disabled:opacity-60">
              {loading ? 'Sending…' : 'Send Reset Code'}
            </button>
          </form>
        </>
      )}

      {/* ── Step 2: OTP ────────────────────────────────── */}
      {step === 'otp' && (
        <>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck size={18} className="text-sky flex-shrink-0" />
            <h2 className="font-display text-xl text-gray-900 dark:text-white">Check your email</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            We sent a 6-digit code to{' '}
            <strong className="text-gray-700 dark:text-gray-200">{email}</strong>.
            It expires in 10 minutes.
          </p>
          <form onSubmit={verifyOTP}>
            <div className="mb-4">
              <OTPInput value={otp} onChange={v => { setOtp(v); setOtpErr(''); }} />
              {otpErr && <p className="text-xs text-rose-500 mt-2 text-center">{otpErr}</p>}
            </div>
            <button type="submit" disabled={otp.length < 6}
              className="btn-game w-full bg-sky text-white text-sm disabled:opacity-50">
              Verify Code
            </button>
          </form>
          <div className="text-center mt-3">
            {resendCd > 0
              ? <p className="text-xs text-gray-400">Resend in {resendCd}s</p>
              : <button onClick={sendOTP}
                  className="text-xs font-semibold text-sky hover:underline inline-flex items-center gap-1">
                  <RefreshCw size={11} /> Resend code
                </button>
            }
          </div>
        </>
      )}

      {/* ── Step 3: new password ───────────────────────── */}
      {step === 'newpass' && (
        <>
          <h2 className="font-display text-xl mb-0.5 text-gray-900 dark:text-white">New Password</h2>
          <p className="text-xs text-gray-500 mb-4">Choose a new password for your account.</p>
          <form onSubmit={resetPassword}>
            <AuthInput label="New password" type="password" name="np" value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="At least 6 characters" icon={Lock}/>
            <AuthInput label="Confirm password" type="password" name="cp" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your new password" icon={Lock} error={passErr}/>
            <button type="submit" disabled={loading}
              className="btn-game w-full bg-sky text-white text-sm mt-1 disabled:opacity-60">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </>
      )}

      {/* ── Step 4: done ───────────────────────────────── */}
      {step === 'done' && (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30
                          flex items-center justify-center mx-auto mb-3">
            <Check size={28} className="text-emerald-500" />
          </div>
          <h3 className="font-display text-xl text-gray-800 dark:text-gray-100 mb-1">Password reset!</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
            Your password has been updated. You can now sign in.
          </p>
          <button onClick={onBack}
            className="btn-game bg-sky text-white text-sm w-full">
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sign-In Modal ─────────────────────────────────────────────
function SignInModal({ onClose, onSwitchToRegister }) {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]         = useState({ email:'', password:'' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handle = e => setForm(f=>({...f,[e.target.name]:e.target.value}));

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace:true });
    } catch (err) {
      const raw = err.response?.data?.error || err.message || '';
      if (/invalid|password|credentials/i.test(raw)) setError('Incorrect email or password.');
      else setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      onClick={e=>{if(e.target===e.currentTarget&&!loading)onClose();}}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-rise-up"
        style={{ background:'var(--bg-card-grad)', border:'1px solid var(--border-color)' }}>

        {/* Header — hidden while loading */}
        {!loading && (
          <div className="flex items-center justify-between px-5 pt-5 pb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky flex items-center justify-center">
                <BookOpen size={16} className="text-white"/>
              </div>
              <span className="font-display text-lg text-sky">ReadAble</span>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X size={18} className="text-gray-400"/>
            </button>
          </div>
        )}

        <div className="px-6 pb-6 pt-3">
          {/* Loading overlay while signing in */}
          {loading ? (
            <SignInLoadingOverlay/>
          ) : showForgot ? (
            /* ── Forgot password view ── */
            <ForgotPasswordView onBack={() => setShowForgot(false)} />
          ) : (
            /* ── Main sign-in form ── */
            <>
              <h2 className="font-display text-2xl mb-0.5 text-gray-900 dark:text-white">Welcome back!</h2>
              <p className="text-xs text-gray-500 mb-4">Sign in to continue your journey</p>
              <form onSubmit={submit}>
                <AuthInput label="Email" type="email" name="email" value={form.email}
                  onChange={handle} placeholder="you@example.com" icon={Mail}/>
                <AuthInput label="Password" type="password" name="password" value={form.password}
                  onChange={handle} placeholder="Your password" icon={Lock}/>

                {/* Forgot password link */}
                <div className="flex justify-end -mt-2 mb-3">
                  <button type="button" onClick={() => setShowForgot(true)}
                    className="text-xs font-semibold text-sky hover:underline transition-colors">
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600
                                  dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-800">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="btn-game w-full bg-sky text-white text-sm disabled:opacity-60">
                  Sign In
                </button>
              </form>
              <p className="text-center text-xs text-gray-500 mt-4">
                No account?{' '}
                <button onClick={onSwitchToRegister} className="text-sky font-bold hover:underline">
                  Create one free
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Register loading overlay ──────────────────────────────────
const REGISTER_TIPS = [
  '🎉 Creating your account…',
  '🏅 Setting up achievements…',
  '🎨 Picking your theme…',
  '🚀 Almost ready!',
];

function RegisterLoadingOverlay() {
  const [tipIdx, setTipIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % REGISTER_TIPS.length), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 animate-fade-in">
      <div className="flex items-end gap-2 mb-6 h-8">
        {[0, 1, 2].map(i => (
          <span key={i} className="block w-3 h-3 rounded-full bg-coral" style={{
            animation: 'signInBounce 0.9s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }}/>
        ))}
      </div>
      <div className="w-full max-w-[180px] h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-5">
        <div className="h-full rounded-full bg-gradient-to-r from-coral to-sunny"
          style={{ animation: 'signInBar 1.8s ease-in-out infinite' }}/>
      </div>
      <p key={tipIdx} className="text-sm font-semibold text-gray-500 dark:text-gray-400 animate-fade-in text-center">
        {REGISTER_TIPS[tipIdx]}
      </p>
    </div>
  );
}

// ── Register Modal ────────────────────────────────────────────
function RegisterModal({ onClose, onSwitchToLogin }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username:'', email:'', password:'', confirm:'' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handle = e => {
    setForm(f=>({...f,[e.target.name]:e.target.value}));
    setErrors(er=>({...er,[e.target.name]:'',general:''}));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.username.trim().length < 3) errs.username = 'At least 3 characters.';
    if (!form.email.includes('@'))       errs.email    = 'Valid email required.';
    if (form.password.length < 6)        errs.password = 'At least 6 characters.';
    if (form.password !== form.confirm)  errs.confirm  = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register(form.username.trim(), form.email.trim(), form.password);
      navigate('/dashboard', { replace:true });
    } catch (err) {
      const raw = err.response?.data?.error || err.message || '';
      if (/username.*taken/i.test(raw))  setErrors({ username:'Username already taken.' });
      else if (/email.*taken/i.test(raw))setErrors({ email:'Email already registered.' });
      else                               setErrors({ general:'Something went wrong. Please try again.' });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      onClick={e=>{if(e.target===e.currentTarget&&!loading)onClose();}}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-rise-up"
        style={{ background:'var(--bg-card-grad)', border:'1px solid var(--border-color)' }}>
        {!loading && (
          <div className="flex items-center justify-between px-5 pt-5 pb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-coral flex items-center justify-center"><BookOpen size={16} className="text-white"/></div>
              <span className="font-display text-lg text-coral">ReadAble</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X size={18} className="text-gray-400"/></button>
          </div>
        )}
        <div className="px-6 pb-6 pt-3">
          {loading ? (
            <RegisterLoadingOverlay/>
          ) : (
            <>
              <h2 className="font-display text-2xl mb-0.5 text-gray-900 dark:text-white">Join ReadAble!</h2>
              <p className="text-xs text-gray-500 mb-4">Free account — takes 30 seconds</p>
              <form onSubmit={submit}>
                <AuthInput label="Username" name="username" value={form.username} onChange={handle} placeholder="SuperReader" icon={User} error={errors.username}/>
                <AuthInput label="Email" type="email" name="email" value={form.email} onChange={handle} placeholder="you@example.com" icon={Mail} error={errors.email}/>
                <AuthInput label="Password" type="password" name="password" value={form.password} onChange={handle} placeholder="At least 6 characters" icon={Lock} error={errors.password}/>
                <AuthInput label="Confirm Password" type="password" name="confirm" value={form.confirm} onChange={handle} placeholder="Repeat password" icon={Lock} error={errors.confirm}/>
                {errors.general && <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-semibold border border-rose-200 dark:border-rose-800">{errors.general}</div>}
                <button type="submit" disabled={loading}
                  className="btn-game w-full bg-coral text-white text-sm mt-1 disabled:opacity-60">
                  Start Learning!
                </button>
              </form>
              <p className="text-center text-xs text-gray-500 mt-4">
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="text-sky font-bold hover:underline">Sign in</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Quick Settings Dropdown ───────────────────────────────────
function QuickSettings({ onClose }) {
  const { settings, updateSettings } = useSettings();
  return (
    <>
      <div className="md:hidden fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/50" onClick={onClose}>
        <div className="w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-pop"
          style={{ background:'var(--bg-card-grad)', border:'1px solid var(--border-color)' }}
          onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor:'var(--border-color)' }}>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Quick Theme</p>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X size={16} className="text-gray-400"/></button>
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            {QUICK_THEMES.map(t=>(
              <button key={t.key} onClick={()=>{ updateSettings({theme:t.key}); onClose(); }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all
                  ${settings.theme===t.key?'bg-sky/15 text-sky ring-2 ring-sky/40':'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <t.Icon size={20}/><span className="text-xs font-semibold leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="hidden md:block absolute right-0 top-12 z-40 w-56 rounded-2xl shadow-2xl border overflow-hidden animate-pop"
        style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)' }}>
        <div className="px-3 py-2.5 border-b" style={{ borderColor:'var(--border-color)' }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quick Theme</p>
        </div>
        <div className="p-2 grid grid-cols-3 gap-1">
          {QUICK_THEMES.map(t=>(
            <button key={t.key} onClick={()=>{ updateSettings({theme:t.key}); onClose(); }}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-center transition-all
                ${settings.theme===t.key?'bg-sky/10 text-sky':'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              <t.Icon size={16}/><span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="px-3 pb-2.5">
          <Link to="/settings" onClick={onClose} className="text-xs text-sky font-semibold hover:underline flex items-center gap-1">
            All settings <ArrowRight size={11}/>
          </Link>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const { user }  = useAuth();
  const { speak } = useSettings();
  const navigate  = useNavigate();

  // Trial game state
  const [trialStep,    setTrialStep]    = useState(0);
  const [trialScore,   setTrialScore]   = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [trialDone,    setTrialDone]    = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [stepResults,  setStepResults]  = useState([null, null, null]);

  const [showLogin,    setShowLogin]    = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace:true });
  }, [user, navigate]);

  if (user) return null;

  const current   = TRIAL_ITEMS[trialStep];
  const isPerfect = trialDone && trialScore === TRIAL_ITEMS.length;

  // ── Handle answer pick ─────────────────────────────────────
  const handlePick = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    const correct = opt === current.answer;

    setStepResults(r => {
      const next = [...r];
      next[trialStep] = correct ? 'correct' : 'wrong';
      return next;
    });

    if (correct) { setTrialScore(s=>s+1); speak('Correct! Well done!'); }
    else         { speak(`The answer was ${current.answer}. Keep trying!`); }

    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      setSelected(null);
      if (trialStep + 1 < TRIAL_ITEMS.length) {
        setTrialStep(s=>s+1);
      } else {
        setTrialDone(true);
        if (trialScore + (correct ? 1 : 0) === TRIAL_ITEMS.length) {
          setTimeout(spawnWinStars, 100);
        }
      }
    }, 900);
  };

  return (
    <div className="min-h-screen" style={{ background:'var(--bg-primary)', overflowX:'hidden' }}>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-sky flex items-center justify-center"><BookOpen size={16} className="text-white"/></div>
          <span className="font-display text-2xl text-sky">ReadAble</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative">
            <button onClick={()=>setShowSettings(s=>!s)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Quick theme">
              <Settings size={18} className="text-gray-500 dark:text-gray-400"/>
            </button>
            {showSettings && <QuickSettings onClose={()=>setShowSettings(false)}/>}
          </div>
          <button onClick={()=>{ setShowSettings(false); setShowLogin(true); }}
            className="flex items-center justify-center gap-1.5 rounded-2xl font-bold border-2 border-sky text-sky hover:bg-sky/10 transition-colors w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:text-sm"
            title="Sign In">
            <LogIn size={16} className="flex-shrink-0"/>
            <span className="hidden sm:inline">Sign In</span>
          </button>
          <button onClick={()=>{ setShowSettings(false); setShowRegister(true); }}
            className="flex items-center justify-center gap-1.5 rounded-2xl font-bold bg-sky text-white hover:bg-sky-dark transition-colors shadow-md w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:text-sm"
            title="Join Free">
            <UserPlus size={16} className="flex-shrink-0"/>
            <span className="hidden sm:inline">Join Free</span>
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-8 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

        {/* Left copy */}
        <div className="animate-slide-up w-full min-w-0">
          <div className="inline-flex items-center gap-2 bg-sunny/20 text-yellow-700 dark:text-yellow-300 px-4 py-1.5 rounded-full text-sm font-bold mb-5">
            <Zap size={14} className="fill-current"/> Made for everyone
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white leading-tight mb-4">
            Reading made<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral to-sky">fun &amp; easy</span>
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mb-6 font-medium">
            Interactive word games and reading activities designed for all learners.
            Track progress, earn rewards, and grow your reading skills every day!
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <button onClick={()=>setShowRegister(true)}
              className="btn-game bg-coral text-white relative flex items-center justify-center w-full sm:w-auto sm:min-w-[200px]">
              <span>Start for Free</span>
              <ArrowRight size={18} className="absolute right-5"/>
            </button>
            <button onClick={()=>setShowLogin(true)}
              className="btn-game bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600">
              I have an account
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {FEATURE_PILLS.map(({Icon,label})=>(
              <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                <Icon size={13} className="text-sky flex-shrink-0"/>{label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Trial game card ──────────────────────────── */}
        <div className="animate-pop w-full min-w-0">
          <div className="rounded-3xl p-4 md:p-6 shadow-xl border-2 border-sky/20 overflow-hidden w-full"
            style={{ background:'var(--bg-card-grad)' }}>

            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="font-display text-lg sm:text-xl text-gray-800 dark:text-gray-200 flex items-center gap-1.5 min-w-0">
                <Gamepad2 size={18} className="text-sky flex-shrink-0"/>
                <span className="truncate">Try a Quick Game!</span>
              </h3>
              <span className="text-xs font-bold bg-sky/10 text-sky px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">No sign-up</span>
            </div>

            {!trialDone ? (
              <>
                {/* Progress bars */}
                <div className="flex gap-2 mb-6">
                  {TRIAL_ITEMS.map((_, i) => {
                    const result    = stepResults[i];
                    const isCurrent = i === trialStep;
                    let bg = 'bg-gray-200 dark:bg-gray-700';
                    if      (result === 'correct') bg = 'bg-emerald-400';
                    else if (result === 'wrong')   bg = 'bg-rose-500';
                    else if (isCurrent)            bg = 'bg-sky animate-pulse';
                    return (
                      <div key={i} className={`flex-1 h-2.5 rounded-full transition-all duration-400 ${bg}`}/>
                    );
                  })}
                </div>

                <p className="text-center text-sm font-semibold text-gray-500 mb-3">
                  What is this? Tap the right answer!
                </p>

                <div className="text-center text-7xl mb-6 animate-float" role="img">{current.emoji}</div>

                <div className="grid grid-cols-2 gap-3">
                  {current.options.map(opt => {
                    const isSel  = selected === opt;
                    const isCorr = opt === current.answer;

                    let cls = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-transparent hover:bg-sky/10 hover:text-sky hover:border-sky/40';

                    if (showFeedback) {
                      if (isSel && isCorr) {
                        cls = 'bg-emerald-500 text-white border-2 border-emerald-400 scale-105 shadow-lg shadow-emerald-500/30';
                      } else if (isSel && !isCorr) {
                        cls = 'bg-rose-600 text-white border-2 border-rose-400 shake shadow-lg shadow-rose-600/30';
                      } else if (!isSel && isCorr && selected !== null) {
                        cls = 'bg-emerald-400/20 text-emerald-600 dark:text-emerald-300 border-2 border-emerald-400/60';
                      } else {
                        cls = 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-2 border-transparent opacity-50';
                      }
                    }

                    return (
                      <button key={opt} onClick={()=>handlePick(opt)}
                        className={`py-4 rounded-2xl font-bold text-sm transition-all duration-200 ${cls}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              // ── Result screen ──────────────────────────────
              <div className="text-center py-4 animate-result-reveal">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className={`absolute inset-0 rounded-full animate-glow-ring
                    ${isPerfect?'bg-amber-400/40':trialScore>=2?'bg-yellow-400/30':'bg-emerald-400/30'}`}/>
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center animate-icon-spin shadow-lg
                    ${isPerfect?'bg-gradient-to-br from-amber-300 to-amber-500':trialScore>=2?'bg-gradient-to-br from-yellow-300 to-yellow-500':'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                    {isPerfect?<Trophy size={36} className="text-white drop-shadow"/>
                      :trialScore>=2?<Star size={36} className="text-white fill-white drop-shadow"/>
                      :<Check size={36} className="text-white drop-shadow" strokeWidth={3}/>}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mb-3">
                  {stepResults.map((r, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full ${r==='correct'?'bg-emerald-400':r==='wrong'?'bg-rose-500':'bg-gray-300'}`}/>
                  ))}
                </div>

                <div className="animate-score-sweep">
                  {isPerfect && <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500 mb-1">✦ Perfect Score ✦</p>}
                  <h4 className="font-display text-3xl mb-1 text-gray-800 dark:text-gray-100">
                    {isPerfect?'Amazing!':trialScore>=2?'Well done!':`${trialScore}/${TRIAL_ITEMS.length} Correct`}
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                    {isPerfect?'You nailed every question! Sign up to track your progress.':'Sign up to access more games and see how you improve!'}
                  </p>
                </div>

                <button onClick={()=>setShowRegister(true)}
                  className={`mt-5 btn-game inline-flex items-center gap-2 mx-auto text-white ${isPerfect?'animate-shimmer':'bg-coral'}`}>
                  {isPerfect?'Claim Your Score!':'Save My Progress'}
                  <ArrowRight size={17}/>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <h2 className="font-display text-3xl md:text-4xl text-center mb-8 md:mb-12 text-gray-800 dark:text-gray-200">
          Why learners love ReadAble
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(({Icon,title,desc})=>(
            <div key={title} className="rounded-3xl p-6 border border-gray-100 dark:border-gray-700"
              style={{ background:'var(--bg-card-grad)' }}>
              <div className="w-11 h-11 rounded-2xl bg-sky/10 dark:bg-sky/20 flex items-center justify-center mb-3 shadow-sm">
                <Icon size={22} className="text-sky"/>
              </div>
              <h3 className="font-display text-xl mb-2 text-gray-800 dark:text-gray-200">{title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/*   { ── CTA ─────────────────────────────────────────── }
      <section className="max-w-2xl mx-auto px-4 pb-20 text-center">
        <div className="rounded-3xl p-10 bg-gradient-to-br from-sky to-mint text-white">
          <h2 className="font-display text-4xl mb-3">Ready to start reading?</h2>
          <p className="mb-6 opacity-90">Join thousands of learners improving every day!</p>
          <button onClick={()=>setShowRegister(true)}
            className="inline-flex items-center gap-2 bg-white text-sky font-display text-lg px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition-transform">
            Create Free Account <ArrowRight size={20}/>
          </button>
        </div>
      </section>
     */}
      {/* ── Modals ──────────────────────────────────────── */}
      {showLogin    && <SignInModal    onClose={()=>setShowLogin(false)}    onSwitchToRegister={()=>{ setShowLogin(false); setShowRegister(true); }}/>}
      {showRegister && <RegisterModal onClose={()=>setShowRegister(false)} onSwitchToLogin={()=>{ setShowRegister(false); setShowLogin(true); }}/>}
      {showSettings && <div className="fixed inset-0 z-30" onClick={()=>setShowSettings(false)}/>}
    </div>
  );
}
