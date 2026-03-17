// ============================================================
// LandingPage — hero, inline auth modals, win effects, quick settings
// ============================================================
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  BookOpen, Zap, ArrowRight, Volume2,
  Gamepad2, BarChart2, Trophy, Heart, Cloud,
  TrendingUp, Palette, Check, Star, X,
  Eye, EyeOff, Mail, Lock, User, Settings,
  Sun, Moon, Sparkles, Waves, Flame, Leaf,
} from 'lucide-react';
import { launchConfetti } from '../utils/confetti';

// ── Mini trial game data ──────────────────────────────────────
const TRIAL_ITEMS = [
  { emoji: '🌞', answer: 'Sun',     options: ['Moon', 'Sun', 'Star', 'Cloud'] },
  { emoji: '🐶', answer: 'Dog',     options: ['Cat', 'Bird', 'Dog', 'Fish']   },
  { emoji: '🌈', answer: 'Rainbow', options: ['Rainbow', 'Sunset', 'Storm', 'Sky'] },
];

const FEATURES = [
  { Icon: Gamepad2,   color: 'from-coral/20 to-coral/5',   title: 'Fun Word Games',    desc: 'Match words, fill blanks, sort sentences — learning feels like play!'   },
  { Icon: Volume2,    color: 'from-sky/20 to-sky/5',       title: 'Read Aloud',        desc: 'Every activity can be read to you using natural-sounding voices.'        },
  { Icon: TrendingUp, color: 'from-mint/20 to-mint/5',     title: 'Track Progress',    desc: 'Level up, earn badges, and watch your skills grow over time.'            },
  { Icon: Palette,    color: 'from-grape/20 to-grape/5',   title: 'Customisable',      desc: 'Choose from 9 themes, adjust text size, and make it yours.'              },
  { Icon: Heart,      color: 'from-sunny/20 to-sunny/5',   title: 'Accessible Design', desc: 'Built with everyone in mind — simple, clear, and easy to use.'           },
  { Icon: Trophy,     color: 'from-coral/20 to-sunny/10',  title: 'Earn Rewards',      desc: 'Collect badges and climb the leaderboard as you learn!'                  },
];

const FEATURE_PILLS = [
  { Icon: Gamepad2,  label: 'Fun Games'         },
  { Icon: Volume2,   label: 'Read-Aloud'        },
  { Icon: BarChart2, label: 'Progress Tracking' },
  { Icon: Trophy,    label: 'Achievements'      },
  { Icon: Heart,     label: 'Accessible'        },
];

// Quick theme swatches in the nav settings dropdown
const QUICK_THEMES = [
  { key: 'cotton',    Icon: Sun,      label: 'Light'    },
  { key: 'sky',       Icon: Heart,    label: 'Berry'    },
  { key: 'mint',      Icon: Leaf,     label: 'Meadow'   },
  { key: 'sunshine',  Icon: Cloud,    label: 'Sunrise'  },
  { key: 'lavender',  Icon: Sparkles, label: 'Purple'   },
  { key: 'night',     Icon: Moon,     label: 'Night'    },
];

// ── Win stars burst ───────────────────────────────────────────
function spawnWinStars() {
  launchConfetti(80);
  // Extra large star pieces from center
  const colors = ['#FFD700','#FFA500','#FF6B6B','#4D96FF','#6BCB77'];
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.textContent = '★';
      el.style.cssText = `
        position:fixed;
        left:${35 + Math.random()*30}vw;
        top:${30 + Math.random()*20}vh;
        font-size:${24+Math.random()*24}px;
        color:${colors[Math.floor(Math.random()*colors.length)]};
        pointer-events:none;
        z-index:9999;
        animation:starBurst 0.8s ease-out forwards;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 900);
    }, i * 60);
  }
}

// ── Auth input ────────────────────────────────────────────────
function AuthInput({ label, type='text', value, onChange, placeholder, name, icon: Icon, error }) {
  const [show, setShow] = useState(false);
  const isPwd = type === 'password';
  return (
    <div className="mb-3.5">
      <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Icon size={14} className="text-gray-400" /></div>}
        <input name={name} type={isPwd ? (show ? 'text' : 'password') : type}
          value={value} onChange={onChange} placeholder={placeholder}
          className={`w-full py-2.5 pr-4 rounded-xl border-2 text-sm font-medium outline-none transition-all
                      bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                      focus:bg-white dark:focus:bg-gray-700
                      ${Icon ? 'pl-9' : 'pl-3.5'}
                      ${error ? 'border-rose-400' : 'border-gray-200 dark:border-gray-600 focus:border-sky'}`} />
        {isPwd && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ── Sign-In Modal ─────────────────────────────────────────────
function SignInModal({ onClose, onSwitchToRegister }) {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,       setForm]       = useState({ email: '', password: '' });
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail,setForgotEmail]= useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoad, setForgotLoad] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const raw = err.response?.data?.error || err.message || '';
      if (/invalid|password|credentials/i.test(raw)) setError('Incorrect email or password.');
      else if (/not found/i.test(raw))               setError('No account found with that email.');
      else                                           setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoad(true);
    await new Promise(r => setTimeout(r, 700));
    setForgotLoad(false);
    setForgotSent(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-rise-up"
        style={{ background: 'var(--bg-card-grad)', border: '1px solid var(--border-color)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-display text-lg text-sky">ReadAble</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-3">
          {showForgot ? (
            <div className="animate-fade-in">
              <button onClick={() => { setShowForgot(false); setForgotSent(false); }}
                className="text-xs font-semibold text-gray-400 hover:text-sky mb-4 flex items-center gap-1 transition-colors">
                ← Back to Sign In
              </button>
              {!forgotSent ? (
                <>
                  <h2 className="font-display text-xl mb-1 text-gray-900 dark:text-white">Forgot Password</h2>
                  <p className="text-xs text-gray-500 mb-4">We will send a reset link to your email.</p>
                  <form onSubmit={submitForgot}>
                    <AuthInput label="Email" type="email" name="fe" value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" icon={Mail} />
                    <button type="submit" disabled={forgotLoad}
                      className="btn-game w-full bg-sky text-white text-sm mt-2 disabled:opacity-60">
                      {forgotLoad ? 'Sending…' : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                    <Check size={24} className="text-emerald-500" />
                  </div>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mb-1">Check your inbox</p>
                  <p className="text-xs text-gray-500">If <strong>{forgotEmail}</strong> has an account, a link was sent.</p>
                  <button onClick={() => { setShowForgot(false); setForgotSent(false); }}
                    className="mt-4 text-sm font-bold text-sky hover:underline">Back to Sign In</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl mb-0.5 text-gray-900 dark:text-white">Welcome back!</h2>
              <p className="text-xs text-gray-500 mb-4">Sign in to continue your journey</p>
              <form onSubmit={submit}>
                <AuthInput label="Email" type="email" name="email" value={form.email} onChange={handle}
                  placeholder="you@example.com" icon={Mail} />
                <AuthInput label="Password" type="password" name="password" value={form.password} onChange={handle}
                  placeholder="Your password" icon={Lock} />
                {error && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-800">
                    {error}
                  </div>
                )}
                <div className="flex justify-end -mt-1 mb-3">
                  <button type="button" onClick={() => setShowForgot(true)}
                    className="text-xs font-semibold text-sky hover:underline">Forgot password?</button>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-game w-full bg-sky text-white text-sm disabled:opacity-60">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <p className="text-center text-xs text-gray-500 mt-4">
                No account?{' '}
                <button onClick={onSwitchToRegister} className="text-sky font-bold hover:underline">Create one free</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Register Modal ────────────────────────────────────────────
function RegisterModal({ onClose, onSwitchToLogin }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ username:'', email:'', password:'', confirm:'' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const handle = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: '', general: '' }));
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
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const raw = err.response?.data?.error || err.message || '';
      if (/username.*taken/i.test(raw))  setErrors({ username: 'Username already taken.' });
      else if (/email.*taken/i.test(raw))setErrors({ email: 'Email already registered.' });
      else                               setErrors({ general: 'Something went wrong. Please try again.' });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-rise-up"
        style={{ background: 'var(--bg-card-grad)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-coral flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-display text-lg text-coral">ReadAble</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="px-6 pb-6 pt-3">
          <h2 className="font-display text-2xl mb-0.5 text-gray-900 dark:text-white">Join ReadAble!</h2>
          <p className="text-xs text-gray-500 mb-4">Free account — takes 30 seconds</p>
          <form onSubmit={submit}>
            <AuthInput label="Username" name="username" value={form.username} onChange={handle}
              placeholder="SuperReader" icon={User} error={errors.username} />
            <AuthInput label="Email" type="email" name="email" value={form.email} onChange={handle}
              placeholder="you@example.com" icon={Mail} error={errors.email} />
            <AuthInput label="Password" type="password" name="password" value={form.password} onChange={handle}
              placeholder="At least 6 characters" icon={Lock} error={errors.password} />
            <AuthInput label="Confirm Password" type="password" name="confirm" value={form.confirm} onChange={handle}
              placeholder="Repeat password" icon={Lock} error={errors.confirm} />
            {errors.general && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-semibold border border-rose-200 dark:border-rose-800">
                {errors.general}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="btn-game w-full bg-coral text-white text-sm mt-1 disabled:opacity-60">
              {loading ? 'Creating account…' : 'Start Learning!'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-4">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="text-sky font-bold hover:underline">Sign in</button>
          </p>
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
      {/* ── Mobile: full-screen centered modal ────────────── */}
      <div className="md:hidden fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/50"
        onClick={onClose}>
        <div className="w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-pop"
          style={{ background: 'var(--bg-card-grad)', border: '1px solid var(--border-color)' }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Quick Theme</p>
            <button onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X size={16} className="text-gray-400"/>
            </button>
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            {QUICK_THEMES.map(t => (
              <button key={t.key}
                onClick={() => { updateSettings({ theme: t.key }); onClose(); }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all
                  ${settings.theme === t.key
                    ? 'bg-sky/15 text-sky ring-2 ring-sky/40'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <t.Icon size={20}/>
                <span className="text-xs font-semibold leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="px-4 pb-3">
            <Link to="/settings" onClick={onClose}
              className="text-xs text-sky font-semibold hover:underline flex items-center gap-1">
              All settings <ArrowRight size={11}/>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Desktop: anchored dropdown ─────────────────────── */}
      <div className="hidden md:block absolute right-0 top-12 z-40 w-56 rounded-2xl shadow-2xl border overflow-hidden animate-pop"
        style={{ background: 'var(--bg-card-grad)', borderColor: 'var(--border-color)' }}>
        <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quick Theme</p>
        </div>
        <div className="p-2 grid grid-cols-3 gap-1">
          {QUICK_THEMES.map(t => (
            <button key={t.key} onClick={() => { updateSettings({ theme: t.key }); onClose(); }}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-center transition-all
                ${settings.theme === t.key ? 'bg-sky/10 text-sky' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              <t.Icon size={16}/>
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="px-3 pb-2.5">
          <Link to="/settings" onClick={onClose}
            className="text-xs text-sky font-semibold hover:underline flex items-center gap-1">
            All settings <ArrowRight size={11}/>
          </Link>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const { user }   = useAuth();
  const { speak }  = useSettings();
  const navigate   = useNavigate();

  const [trialStep,    setTrialStep]    = useState(0);
  const [trialScore,   setTrialScore]   = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [trialDone,    setTrialDone]    = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showLogin,    setShowLogin]    = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSettings, setShowSettings]= useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  if (user) return null;

  const current = TRIAL_ITEMS[trialStep];
  const isPerfect = trialDone && trialScore === TRIAL_ITEMS.length;

  const handlePick = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    const correct = opt === current.answer;
    if (correct) { setTrialScore(s => s + 1); speak('Correct! Well done!'); }
    else         { speak(`The answer was ${current.answer}. Keep trying!`); }
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      setSelected(null);
      if (trialStep + 1 < TRIAL_ITEMS.length) setTrialStep(s => s + 1);
      else {
        setTrialDone(true);
        if (trialScore + (correct ? 1 : 0) === TRIAL_ITEMS.length) {
          // Perfect score — trigger effects
          setTimeout(spawnWinStars, 100);
        }
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-display text-2xl text-sky">ReadAble</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick settings */}
          <div className="relative">
            <button onClick={() => setShowSettings(s => !s)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Quick theme">
              <Settings size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
            {showSettings && <QuickSettings onClose={() => setShowSettings(false)} />}
          </div>
          <button onClick={() => { setShowSettings(false); setShowLogin(true); }}
            className="px-3 py-1.5 md:px-5 md:py-2 rounded-2xl font-bold text-sky border-2 border-sky hover:bg-sky/10 transition-colors text-xs md:text-sm">
            Sign In
          </button>
          <button onClick={() => { setShowSettings(false); setShowRegister(true); }}
            className="px-3 py-1.5 md:px-5 md:py-2 rounded-2xl font-bold text-white bg-sky hover:bg-sky-dark transition-colors text-xs md:text-sm shadow-md">
            Join Free
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-8 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-sunny/20 text-yellow-700 dark:text-yellow-300 px-4 py-1.5 rounded-full text-sm font-bold mb-5">
            <Zap size={14} className="fill-current" /> Made for everyone
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white leading-tight mb-4">
            Reading made<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral to-sky">
              fun &amp; easy
            </span>
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mb-6 font-medium">
            Interactive word games and reading activities designed for all learners.
            Track progress, earn rewards, and grow your reading skills every day!
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <button onClick={() => setShowRegister(true)}
              className="btn-game bg-coral text-white hover:bg-coral-dark flex items-center gap-2">
              Start for Free <ArrowRight size={18} />
            </button>
            <button onClick={() => setShowLogin(true)}
              className="btn-game bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600">
              I have an account
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {FEATURE_PILLS.map(({ Icon, label }) => (
              <span key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm
                           text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                <Icon size={13} className="text-sky flex-shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Trial game ──────────────────────────────────── */}
        <div className="animate-pop">
          <div className="rounded-3xl p-4 md:p-6 shadow-xl border-2 border-sky/20"
            style={{ background: 'var(--bg-card-grad)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Gamepad2 size={20} className="text-sky" /> Try a Quick Game!
              </h3>
              <span className="text-sm font-bold text-sky bg-sky/10 px-3 py-1 rounded-full">No sign-up</span>
            </div>

            {!trialDone ? (
              <>
                <div className="flex gap-2 mb-6">
                  {TRIAL_ITEMS.map((_, i) => (
                    <div key={i} className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      i < trialStep ? 'bg-mint' : i === trialStep ? 'bg-sky' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  ))}
                </div>
                <p className="text-center text-sm font-semibold text-gray-500 mb-3">
                  What is this? Tap the right answer!
                </p>
                <div className="text-center text-7xl mb-6 animate-float" role="img">{current.emoji}</div>
                <div className="grid grid-cols-2 gap-3">
                  {current.options.map(opt => {
                    const isSel  = selected === opt;
                    const isCorr = opt === current.answer;
                    let style = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-sky/10 hover:text-sky';
                    if (showFeedback && isSel)  style = isCorr ? 'bg-mint text-white scale-105' : 'bg-coral text-white shake';
                    if (showFeedback && !isSel && isCorr) style = 'bg-mint/50 text-mint-dark';
                    return (
                      <button key={opt} onClick={() => handlePick(opt)}
                        className={`py-4 rounded-2xl font-bold text-sm transition-all duration-200 border-2 border-transparent ${style}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-4 animate-result-reveal">

                {/* ── Icon with glow ring ─────────────────── */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {/* Expanding glow ring behind icon */}
                  <div className={`absolute inset-0 rounded-full animate-glow-ring
                    ${isPerfect ? 'bg-amber-400/40' : trialScore >= 2 ? 'bg-yellow-400/30' : 'bg-emerald-400/30'}`}/>
                  {/* Icon circle */}
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center
                                   animate-icon-spin shadow-lg
                    ${isPerfect
                      ? 'bg-gradient-to-br from-amber-300 to-amber-500'
                      : trialScore >= 2
                      ? 'bg-gradient-to-br from-yellow-300 to-yellow-500'
                      : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                    {isPerfect
                      ? <Trophy size={36} className="text-white drop-shadow" />
                      : trialScore >= 2
                      ? <Star size={36} className="text-white fill-white drop-shadow" />
                      : <Check size={36} className="text-white drop-shadow" strokeWidth={3}/>
                    }
                  </div>
                </div>

                {/* ── Score label ─────────────────────────── */}
                <div className="animate-score-sweep">
                  {isPerfect && (
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500 mb-1">
                      ✦ Perfect Score ✦
                    </p>
                  )}
                  <h4 className="font-display text-3xl mb-1 text-gray-800 dark:text-gray-100">
                    {isPerfect ? 'Amazing!' : trialScore >= 2 ? 'Well done!' : `${trialScore}/${TRIAL_ITEMS.length} Correct`}
                  </h4>
                  {/* Score dots */}
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    {TRIAL_ITEMS.map((_, i) => (
                      <div key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          i < trialScore ? 'bg-emerald-400 scale-110' : 'bg-gray-200 dark:bg-gray-600'
                        }`}/>
                    ))}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                    {isPerfect
                      ? 'You nailed every question! Sign up to track your progress.'
                      : 'Sign up to access more games and see how you improve!'}
                  </p>
                </div>

                {/* ── CTA button with shimmer ─────────────── */}
                <button onClick={() => setShowRegister(true)}
                  className={`mt-5 btn-game inline-flex items-center gap-2 mx-auto text-white
                    ${isPerfect ? 'animate-shimmer' : 'bg-coral'}`}
                  style={isPerfect ? {} : undefined}>
                  {isPerfect ? 'Claim Your Score!' : 'Save My Progress'}
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
          {FEATURES.map(({ Icon, color, title, desc }) => (
            <div key={title} className={`rounded-3xl p-6 bg-gradient-to-br ${color} border border-gray-100 dark:border-gray-700`}
              style={{ background: undefined, backgroundColor: 'var(--bg-card-grad)' }}>
              <div className="w-11 h-11 rounded-2xl bg-sky/10 dark:bg-sky/20 flex items-center justify-center mb-3 shadow-sm">
                <Icon size={22} className="text-sky" />
              </div>
              <h3 className="font-display text-xl mb-2 text-gray-800 dark:text-gray-200">{title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <div className="rounded-3xl p-10 bg-gradient-to-br from-sky to-mint text-white">
          <h2 className="font-display text-4xl mb-3">Ready to start reading?</h2>
          <p className="mb-6 opacity-90">Join thousands of learners improving every day!</p>
          <button onClick={() => setShowRegister(true)}
            className="inline-flex items-center gap-2 bg-white text-sky font-display text-lg px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition-transform">
            Create Free Account <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Modals ──────────────────────────────────────── */}
      {showLogin    && <SignInModal    onClose={() => setShowLogin(false)}    onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }} />}

      {/* Close settings dropdown when clicking outside */}
      {showSettings && <div className="fixed inset-0 z-30" onClick={() => setShowSettings(false)} />}
    </div>
  );
}
