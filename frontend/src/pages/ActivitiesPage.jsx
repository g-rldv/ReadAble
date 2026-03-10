// ============================================================
// ActivitiesPage — browse activities by type and difficulty
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle } from 'lucide-react';

// ── Difficulty colour system ──────────────────────────────────
const DIFF = {
  easy: {
    bar:         'bg-emerald-500',
    border:      'border-emerald-400/50 dark:border-emerald-600/50',
    cardBg:      'dark:bg-emerald-950/20',
    pill:        'bg-emerald-500 text-white',
    activePill:  'bg-emerald-600 text-white shadow-sm',
    label:       'Easy',
  },
  medium: {
    bar:         'bg-amber-400',
    border:      'border-amber-400/50 dark:border-amber-600/50',
    cardBg:      'dark:bg-amber-950/20',
    pill:        'bg-amber-400 text-white',
    activePill:  'bg-amber-500 text-white shadow-sm',
    label:       'Medium',
  },
  hard: {
    bar:         'bg-rose-500',
    border:      'border-rose-400/50 dark:border-rose-600/50',
    cardBg:      'dark:bg-rose-950/20',
    pill:        'bg-rose-500 text-white',
    activePill:  'bg-rose-600 text-white shadow-sm',
    label:       'Hard',
  },
};

const TYPES = [
  { key: 'all',           label: 'All Games'      },
  { key: 'word_match',    label: 'Word Match'     },
  { key: 'fill_blank',    label: 'Fill the Blank' },
  { key: 'sentence_sort', label: 'Sentence Sort'  },
  { key: 'picture_word',  label: 'Picture & Word' },
];

const DIFFICULTIES = [
  { key: 'all',    label: 'All'    },
  { key: 'easy',   label: 'Easy'   },
  { key: 'medium', label: 'Medium' },
  { key: 'hard',   label: 'Hard'   },
];

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const TYPE_ORDER = { word_match: 0, fill_blank: 1, sentence_sort: 2, picture_word: 3 };

// ── Activity Card ─────────────────────────────────────────────
// Float animation via CSS transform + transition on hover
const CARD_HOVER_STYLE = {
  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease',
};

function ActivityCard({ activity, progress }) {
  const [hovered, setHovered] = useState(false);
  const prog      = progress[activity.id];
  const completed = prog?.completed;
  const score     = prog?.score ?? null;
  const d         = DIFF[activity.difficulty] || DIFF.easy;

  return (
    <Link
      to={`/game/${activity.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...CARD_HOVER_STYLE,
        transform:  hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow:  hovered
          ? '0 16px 32px -8px rgba(0,0,0,0.18), 0 4px 8px -2px rgba(0,0,0,0.10)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        background: 'var(--bg-card)',
      }}
      className={`group flex flex-col rounded-2xl border-2 ${d.border} ${d.cardBg} overflow-hidden`}
    >
      {/* Thick difficulty colour strip */}
      <div className={`h-2 w-full flex-shrink-0 ${d.bar}`} />

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Pills row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${d.pill}`}>
            {d.label}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky/15 text-sky dark:bg-sky/20">
            +{activity.xp_reward} XP
          </span>
          {completed && <CheckCircle size={13} className="text-emerald-500 ml-auto flex-shrink-0" />}
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-snug">
          {activity.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed line-clamp-2 flex-1">
          {activity.description}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-1">
          {score !== null ? (
            <span className={`text-xs font-semibold ${
              score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-gray-400'
            }`}>{score}%</span>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-600">Not played</span>
          )}
          <span
            className="text-xs font-semibold text-sky"
            style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }}>
            Play →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Type section (All view) ───────────────────────────────────
function TypeSection({ typeKey, activities, progress }) {
  const label = TYPES.find(t => t.key === typeKey)?.label;
  if (!activities.length) return null;
  const sorted = [...activities].sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</h2>
        <span className="text-xs text-gray-300 dark:text-gray-600">({activities.length})</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(act => <ActivityCard key={act.id} activity={act} progress={progress} />)}
      </div>
    </section>
  );
}

// ── Filter pill ───────────────────────────────────────────────
function FilterPill({ active, onClick, children, activeClass }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
        active
          ? activeClass || 'bg-sky text-white shadow-sm'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}>
      {children}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [progress,   setProgress]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [activeDiff, setActiveDiff] = useState('all');

  useEffect(() => {
    Promise.all([api.get('/activities'), api.get('/progress')])
      .then(([actRes, progRes]) => {
        setActivities(actRes.data.activities);
        const map = {};
        progRes.data.progress.forEach(p => { map[p.activity_id] = p; });
        setProgress(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const filtered = activities
    .filter(a => activeDiff === 'all' || a.difficulty === activeDiff)
    .filter(a => activeType === 'all' || a.type === activeType);

  const sorted = [...filtered].sort((a, b) => {
    if (a.type !== b.type) return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
    return DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty];
  });

  const grouped = {};
  ['word_match','fill_blank','sentence_sort','picture_word'].forEach(t => {
    grouped[t] = sorted.filter(a => a.type === t);
  });

  const completedCount = Object.values(progress).filter(p => p.completed).length;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-5">

      {/* ── Header ─────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-3xl text-gray-800 dark:text-gray-100">Activities</h1>
        <p className="text-sm text-gray-400 mt-0.5">{completedCount} of {activities.length} completed</p>
      </div>

      {/* ── Filter Bar ─────────────────────────────────── */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)' }}>
        {/* Row 1: Game type */}
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <FilterPill key={t.key} active={activeType === t.key}
              onClick={() => setActiveType(t.key)}
              activeClass="bg-indigo-500 text-white shadow-sm">
              {t.label}
            </FilterPill>
          ))}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* Row 2: Difficulty */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">Level</span>
          <FilterPill active={activeDiff === 'all'} onClick={() => setActiveDiff('all')}
            activeClass="bg-gray-600 text-white shadow-sm">
            All
          </FilterPill>
          {DIFFICULTIES.filter(d => d.key !== 'all').map(d => (
            <FilterPill key={d.key} active={activeDiff === d.key}
              onClick={() => setActiveDiff(d.key)}
              activeClass={DIFF[d.key]?.activePill}>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${DIFF[d.key]?.bar}`} />
                {d.label}
              </span>
            </FilterPill>
          ))}
          {(activeType !== 'all' || activeDiff !== 'all') && (
            <button onClick={() => { setActiveType('all'); setActiveDiff('all'); }}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="font-semibold text-base">No activities found</p>
          <p className="text-sm mt-1">Try a different filter</p>
        </div>
      ) : activeType === 'all' ? (
        <div className="space-y-8">
          {['word_match','fill_blank','sentence_sort','picture_word'].map(t => (
            <TypeSection key={t} typeKey={t} activities={grouped[t] || []} progress={progress} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map(act => <ActivityCard key={act.id} activity={act} progress={progress} />)}
        </div>
      )}
    </div>
  );
}
