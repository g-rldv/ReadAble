// ============================================================
// LandingPage — Hero page with trial game and sign-up prompt
// No emoji characters — all icons use Lucide React SVGs
// ============================================================
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  BookOpen, Zap, ArrowRight, Volume2,
  Gamepad2, BarChart2, Trophy, Heart,
  TrendingUp, Palette, Check, Star, CheckCircle,
} from 'lucide-react';

// ── Feature pills (no emoji, uses Lucide icons) ───────────────
const FEATURE_PILLS = [
  { Icon: Gamepad2,  label: 'Fun Games'         },
  { Icon: Volume2,   label: 'Read-Aloud'        },
  { Icon: BarChart2, label: 'Progress Tracking' },
  { Icon: Trophy,    label: 'Achievements'      },
  { Icon: Heart,     label: 'Accessible'        },
];

// ── Feature cards (no emoji) ──────────────────────────────────
const FEATURES = [
  { Icon: Gamepad2,   color: 'from-coral/20 to-coral/5',   title: 'Fun Word Games',     desc: 'Match words, fill blanks, sort sentences — learning feels like play!'    },
  { Icon: Volume2,    color: 'from-sky/20 to-sky/5',       title: 'Read Aloud',         desc: 'Every activity can be read to you using natural-sounding voices.'         },
  { Icon: TrendingUp, color: 'from-mint/20 to-mint/5',     title: 'Track Progress',     desc: 'Level up, earn badges, and watch your skills grow over time.'             },
  { Icon: Palette,    color: 'from-grape/20 to-grape/5',   title: 'Customisable',       desc: 'Adjust text size, switch themes, and make it work for you.'               },
  { Icon: Heart,      color: 'from-sunny/20 to-sunny/5',   title: 'Accessible Design', desc: 'Built with everyone in mind — simple, clear, and easy to use.'            },
  { Icon: Trophy,     color: 'from-coral/20 to-sunny/10',  title: 'Earn Rewards',       desc: 'Collect badges and climb the leaderboard as you learn!'                  },
];

// ── Mini trial game data (emoji OK here — it's game content) ──
const TRIAL_ITEMS = [
  { emoji: '🌞', answer: 'Sun',     options: ['Moon', 'Sun', 'Star', 'Cloud'] },
  { emoji: '🐶', answer: 'Dog',     options: ['Cat', 'Bird', 'Dog', 'Fish']   },
  { emoji: '🌈', answer: 'Rainbow', options: ['Rainbow', 'Sunset', 'Storm', 'Sky'] },
];

export default function LandingPage() {
  const { user }   = useAuth();
  const { speak }  = useSettings();
  const navigate   = useNavigate();
  const [trialStep,  setTrialStep]  = useState(0);
  const [trialScore, setTrialScore] = useState(0);
  const [selected,   setSelected]   = useState(null);
  const [trialDone,  setTrialDone]  = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  if (user) { navigate('/dashboard'); return null; }

  const current = TRIAL_ITEMS[trialStep];

  const handlePick = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    const correct = opt === current.answer;
    if (correct) { setTrialScore(s => s + 1); speak('Correct! Well done!'); }
    else { speak(`The answer was ${current.answer}. Keep trying!`); }
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      setSelected(null);
      if (trialStep + 1 < TRIAL_ITEMS.length) setTrialStep(s => s + 1);
      else setTrialDone(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-display text-2xl text-sky">ReadAble</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login"
            className="px-5 py-2 rounded-2xl font-bold text-sky border-2 border-sky hover:bg-sky/10 transition-colors text-sm">
            Sign In
          </Link>
          <Link to="/register"
            className="px-5 py-2 rounded-2xl font-bold text-white bg-sky hover:bg-sky-dark transition-colors text-sm shadow-md">
            Join Free
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-sunny/20 text-yellow-700 dark:text-yellow-300 px-4 py-1.5 rounded-full text-sm font-bold mb-5">
            <Zap size={14} className="fill-current" /> Made for everyone
          </div>
          <h1 className="font-display text-5xl lg:text-6xl text-gray-900 dark:text-white leading-tight mb-5">
            Reading made<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral to-sky">
              fun & easy
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md font-medium">
            Interactive word games and reading activities designed for all learners.
            Track progress, earn rewards, and grow your reading skills every day!
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/register"
              className="btn-game bg-coral text-white hover:bg-coral-dark flex items-center gap-2">
              Start for Free <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="btn-game bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600">
              I have an account
            </Link>
          </div>
          {/* Feature pills — Lucide icons */}
          <div className="flex flex-wrap gap-3 mt-8">
            {FEATURE_PILLS.map(({ Icon, label }) => (
              <span key={label}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-800 shadow-sm
                           text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                <Icon size={13} className="text-sky flex-shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Trial Game Card ────────────────────────────── */}
        <div className="animate-pop">
          <div className="rounded-3xl p-6 shadow-xl border-2 border-sky/20" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Gamepad2 size={20} className="text-sky" /> Try a Quick Game!
              </h3>
              <span className="text-sm font-bold text-sky bg-sky/10 px-3 py-1 rounded-full">
                No sign-up needed
              </span>
            </div>

            {!trialDone ? (
              <>
                {/* Progress dots */}
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
                {/* Game emoji (content, not decoration) */}
                <div className="text-center text-7xl mb-6 animate-float" role="img">
                  {current.emoji}
                </div>
                {/* Answer buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {current.options.map(opt => {
                    const isSelected = selected === opt;
                    const isCorrect  = opt === current.answer;
                    let style = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-sky/10 hover:text-sky';
                    if (showFeedback && isSelected) {
                      style = isCorrect ? 'bg-mint text-white scale-105' : 'bg-coral text-white shake';
                    }
                    if (showFeedback && !isSelected && isCorrect) {
                      style = 'bg-mint/50 text-mint-dark';
                    }
                    return (
                      <button key={opt} onClick={() => handlePick(opt)}
                        className={`py-3 rounded-2xl font-bold text-sm transition-all duration-200 border-2 border-transparent ${style}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Trial complete — no emoji, use Lucide */
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-amber-100 dark:bg-amber-900/30">
                  {trialScore === 3
                    ? <Trophy    size={36} className="text-amber-500" />
                    : trialScore >= 2
                    ? <Star      size={36} className="text-yellow-500 fill-yellow-500" />
                    : <CheckCircle size={36} className="text-emerald-500" />
                  }
                </div>
                <h4 className="font-display text-2xl mb-2">
                  {trialScore === 3 ? 'Perfect Score!' : `${trialScore}/3 Correct!`}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm">
                  {trialScore === 3
                    ? 'Amazing! Create an account to unlock all activities and track your progress!'
                    : 'Good try! Sign up to access more games and see how you improve!'}
                </p>
                <Link to="/register"
                  className="btn-game bg-coral text-white inline-flex items-center gap-2 mx-auto">
                  Save My Progress <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-display text-4xl text-center mb-12 text-gray-800 dark:text-gray-200">
          Why learners love ReadAble
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(({ Icon, color, title, desc }) => (
            <div key={title}
              className={`rounded-3xl p-6 bg-gradient-to-br ${color} border border-gray-100 dark:border-gray-700`}>
              <div className="w-11 h-11 rounded-2xl bg-white/70 dark:bg-gray-800/70 flex items-center justify-center mb-3 shadow-sm">
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
          <Link to="/register"
            className="inline-flex items-center gap-2 bg-white text-sky font-display text-lg px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition-transform">
            Create Free Account <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
