import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { ArrowRight } from 'lucide-react';

const TRIAL_ITEMS = [
  { emoji: '🌞', answer: 'Sun',     options: ['Moon', 'Sun', 'Star', 'Cloud'] },
  { emoji: '🐶', answer: 'Dog',     options: ['Cat', 'Bird', 'Dog', 'Fish'] },
  { emoji: '🌈', answer: 'Rainbow', options: ['Rainbow', 'Sunset', 'Storm', 'Sky'] },
];

const FEATURES = [
  { icon: '🎮', title: 'Fun Word Games',     desc: 'Match words, fill blanks, sort sentences.', from: '#4D96FF', to: '#6BCB77' },
  { icon: '🔊', title: 'Read Aloud',         desc: 'Every activity can be read out loud.',       from: '#6BCB77', to: '#FFD93D' },
  { icon: '📈', title: 'Track Progress',     desc: 'Level up and earn badges as you learn.',     from: '#FF9A3C', to: '#FF6B6B' },
  { icon: '♿', title: 'Built for Everyone', desc: 'Simple, clear, and easy to use for all.',    from: '#9B59B6', to: '#4D96FF' },
];

// Each answer button gets its own gradient color pair
const ANSWER_COLORS = [
  { from: '#4D96FF', to: '#6BCB77' },
  { from: '#FF6B6B', to: '#FFD93D' },
  { from: '#9B59B6', to: '#4D96FF' },
  { from: '#FF9A3C', to: '#FF6B6B' },
];

// ── Reusable mouse-tracking gradient card/button ─────────────
function GlowCard({ children, from, to, onClick, isButton = false, style = {}, disabled = false }) {
  const ref     = useRef(null);
  const [pos, setPos]         = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  };

  const Tag = isButton ? 'button' : 'div';

  return (
    <Tag
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: isButton ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease',
        transform: hovered && !disabled ? 'translateY(-3px)' : 'translateY(0)',
        background: hovered && !disabled
          ? `linear-gradient(135deg, ${from}20, ${to}20)`
          : 'white',
        border: hovered && !disabled
          ? `2px solid ${from}80`
          : '2px solid #E5E7EB',
        boxShadow: hovered && !disabled
          ? `0 6px 24px ${from}35`
          : '0 1px 4px rgba(0,0,0,0.05)',
        ...style,
      }}
    >
      {/* Bright radial spotlight following cursor */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: hovered && !disabled ? 1 : 0,
        transition: 'opacity 0.2s ease',
        background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${from}80 0%, ${to}50 40%, transparent 70%)`,
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </Tag>
  );
}

// ── Feature card ─────────────────────────────────────────────
function FeatureCard({ icon, title, desc, from, to }) {
  const ref     = useRef(null);
  const [pos, setPos]         = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '16px', padding: '20px',
        position: 'relative', overflow: 'hidden',
        cursor: 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        background: hovered ? `linear-gradient(135deg, ${from}18, ${to}18)` : 'white',
        border: hovered ? `2px solid ${from}60` : '2px solid #EEF0F8',
        boxShadow: hovered ? `0 8px 32px ${from}40` : '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.25s ease',
        background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${from}70 0%, ${to}40 35%, transparent 65%)`,
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', marginBottom: '12px',
          background: hovered ? `linear-gradient(135deg, ${from}, ${to})` : `linear-gradient(135deg, ${from}25, ${to}25)`,
          transition: 'background 0.25s ease',
        }}>
          {icon}
        </div>
        <h3 style={{
          fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px',
          color: hovered ? from : '#1A1A2E',
          transition: 'color 0.2s ease',
        }}>{title}</h3>
        <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#6B7280' }}>{desc}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function LandingPage() {
  const { user } = useAuth();
  const { speak } = useSettings();
  const navigate  = useNavigate();
  const [trialStep, setTrialStep]       = useState(0);
  const [trialScore, setTrialScore]     = useState(0);
  const [selected, setSelected]         = useState(null);
  const [trialDone, setTrialDone]       = useState(false);
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
    <div style={{ background: '#F7F9FF', minHeight: '100vh', fontFamily: 'Nunito, sans-serif' }}>

      {/* ── Navbar ────────────────────────────────────────── */}
      <nav style={{ background: 'white', borderBottom: '2px solid #EEF0F8' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.8rem' }}>📚</span>
            <span className="font-display text-xl" style={{ color: '#4D96FF' }}>ReadAble</span>
          </div>
            <GlowCard
              isButton={false}
              from="#4D96FF"
              to="#6BCB77"
              style={{ borderRadius: '12px', padding: '8px 20px', display: 'inline-block' }}
            >
              <Link to="/login"
                style={{ color: '#4D96FF', fontWeight: 800, fontSize: '0.875rem', display: 'block' }}>
                Sign In
              </Link>
            </GlowCard>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6"
              style={{ background: '#FFF8E7', color: '#D97706', border: '2px solid #FDE68A' }}>
              ✨ Made for every learner
            </div>
            <h1 className="font-display mb-5"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', color: '#1A1A2E', lineHeight: 1.25 }}>
              Reading made<br />
              <span style={{ color: '#4D96FF' }}>fun &amp; easy! 🌟</span>
            </h1>
            <p className="mb-6 font-medium"
              style={{ color: '#4B5563', fontSize: '1.1rem', lineHeight: 1.8, maxWidth: '400px' }}>
              Interactive word games and reading activities designed for all learners —
              especially those who need a little extra support.
            </p>
            <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>
              Try the game on the right — no sign-up needed! →
            </p>
          </div>

          {/* Right — trial game card */}
          <div className="rounded-3xl p-7"
            style={{ background: 'white', border: '2px solid #E8EFFF', boxShadow: '0 8px 40px rgba(77,150,255,0.10)' }}>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl" style={{ color: '#1A1A2E' }}>🎮 Try a Quick Game!</h3>
                <p className="text-xs font-bold mt-0.5" style={{ color: '#9CA3AF' }}>No sign-up needed</p>
              </div>
              <div className="flex gap-1.5 items-center">
                {TRIAL_ITEMS.map((_, i) => (
                  <div key={i} className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: i === trialStep ? '22px' : '10px',
                      background: i < trialStep ? '#6BCB77' : i === trialStep ? '#4D96FF' : '#E5E7EB',
                    }} />
                ))}
              </div>
            </div>

            {!trialDone ? (
              <>
                {/* Emoji */}
                <div className="flex items-center justify-center mb-5">
                  <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl animate-float"
                    style={{ background: 'linear-gradient(135deg, #EEF4FF, #EDFAEF)', border: '2px solid #DCE8FF' }}>
                    {current.emoji}
                  </div>
                </div>
                <p className="text-center text-sm font-bold mb-4" style={{ color: '#6B7280' }}>
                  👆 What is this? Tap the right answer!
                </p>

                {/* Answer buttons with glow effect */}
                <div className="grid grid-cols-2 gap-3">
                  {current.options.map((opt, idx) => {
                    const isSelected = selected === opt;
                    const isCorrect  = opt === current.answer;
                    const colors     = ANSWER_COLORS[idx];

                    // After answering — override styles for feedback
                    if (showFeedback && isSelected) {
                      const bg = isCorrect ? '#6BCB77' : '#FF6B6B';
                      return (
                        <button key={opt}
                          className="py-3.5 rounded-2xl font-bold text-base"
                          style={{
                            background: bg, color: 'white',
                            border: `2px solid ${bg}`,
                            boxShadow: isCorrect
                              ? '0 4px 16px rgba(107,203,119,0.5)'
                              : '0 4px 16px rgba(255,107,107,0.5)',
                            transform: isCorrect ? 'scale(1.04)' : 'scale(1)',
                            transition: 'all 0.2s ease',
                          }}>
                          {isCorrect ? '✓ ' : '✗ '}{opt}
                        </button>
                      );
                    }
                    if (showFeedback && !isSelected && isCorrect) {
                      return (
                        <button key={opt}
                          className="py-3.5 rounded-2xl font-bold text-base"
                          style={{ background: '#EDFAEF', color: '#16A34A', border: '2px solid #6BCB77' }}>
                          ✓ {opt}
                        </button>
                      );
                    }

                    // Normal idle state — use GlowCard
                    return (
                      <GlowCard
                        key={opt}
                        isButton
                        from={colors.from}
                        to={colors.to}
                        onClick={() => handlePick(opt)}
                        disabled={selected !== null}
                        style={{ borderRadius: '16px', padding: '14px 8px', fontWeight: 800, fontSize: '1rem', color: '#374151', width: '100%' }}
                      >
                        {opt}
                      </GlowCard>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-5xl mb-3 animate-bounce">
                  {trialScore === 3 ? '🏆' : trialScore >= 2 ? '⭐' : '👍'}
                </div>
                <h4 className="font-display text-2xl mb-2" style={{ color: '#1A1A2E' }}>
                  {trialScore === 3 ? 'Perfect Score!' : `${trialScore} / 3 Correct!`}
                </h4>
                <p className="text-sm mb-5 font-medium" style={{ color: '#6B7280' }}>
                  {trialScore === 3
                    ? 'Amazing! Create an account to unlock all activities!'
                    : 'Great try! Sign up to track how much you improve!'}
                </p>
                <Link to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #4D96FF, #6BCB77)', boxShadow: '0 4px 14px rgba(77,150,255,0.3)' }}>
                  Create Free Account <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="font-display text-center mb-8"
          style={{ fontSize: '1.6rem', color: '#1A1A2E' }}>
          Why learners love ReadAble 💛
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="rounded-3xl px-10 py-10 text-center"
          style={{ background: 'linear-gradient(135deg, #4D96FF 0%, #6BCB77 100%)' }}>
          <h2 className="font-display text-2xl text-white mb-2">Ready to start reading?</h2>
          <p className="text-sm font-medium mb-6" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Join learners who are improving every day.
          </p>
          <GlowCard
            isButton={false}
            from="#ffffff"
            to="#ffffff"
            style={{ borderRadius: '16px', display: 'inline-block', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
          >
            <Link to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 font-display text-base"
              style={{ color: '#17a0aa', display: 'flex' }}>
              Create Free Account <ArrowRight size={17} />
            </Link>
          </GlowCard>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="text-center pb-10">
        <p className="text-sm" style={{ color: '#5c5c5c' }}>
          📚 ReadAble · Built with care for inclusive learning
        </p>
      </footer>

    </div>
  );
}
