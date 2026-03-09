// ============================================================
// ActivitiesPage — browse activities by type and difficulty
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle, Clock } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────
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

const DIFF_STYLE = {
  easy:   { bar: 'bg-emerald-400', pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', active: 'bg-emerald-500 text-white' },
  medium: { bar: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',       active: 'bg-amber-500 text-white'   },
  hard:   { bar: 'bg-rose-400',    pill: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',           active: 'bg-rose-500 text-white'    },
};

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const TYPE_ORDER = { word_match: 0, fill_blank: 1, sentence_sort: 2, picture_word: 3 };

// ── Activity Card ─────────────────────────────────────────────
function ActivityCard({ activity, progress }) {
  const prog      = progress[activity.id];
  const completed = prog?.completed;
  const score     = prog?.score ?? null;
  const ds        = DIFF_STYLE[activity.difficulty];

  return (
    <Link
      to={`/game/${activity.id}`}
      className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700
                 hover:border-sky/60 hover:shadow-md transition-all duration-200 overflow-hidden"
      style={{ background: 'var(--bg-card)' }}
    >
      {/* difficulty colour strip */}
      <div className={`h-1 w-full flex-shrink-0 ${ds.bar}`} />

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* top row: diff pill + XP */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${ds.pill}`}>
            {activity.difficulty}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky/10 text-sky dark:bg-sky/20">
            +{activity.xp_reward} XP
          </span>
          {completed && (
            <CheckCircle size={13} className="text-emerald-500 ml-auto flex-shrink-0" />
          )}
        </div>

        {/* title */}
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-snug">
          {activity.title}
        </h3>

        {/* description */}
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed line-clamp-2 flex-1">
          {activity.description}
        </p>

        {/* bottom row */}
        <div className="flex items-center justify-between pt-1">
          {score !== null ? (
            <span className={`text-xs font-semibold ${
              score >= 80 ? 'text-emerald-500' :
              score >= 50 ? 'text-amber-500' : 'text-gray-400'
            }`}>{score}%</span>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-600">Not played</span>
          )}
          <span className="text-xs font-semibold text-sky opacity-0 group-hover:opacity-100 transition-opacity">
            Play →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Type Section (used in "All" view) ─────────────────────────
function TypeSection({ typeKey, activities, progress }) {
  const label = TYPES.find(t => t.key === typeKey)?.label;
  if (!activities.length) return null;

  const sorted = [...activities].sort(
    (a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </h2>
        <span className="text-xs text-gray-300 dark:text-gray-600">({activities.length})</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(act => (
          <ActivityCard key={act.id} activity={act} progress={progress} />
        ))}
      </div>
    </section>
  );
}

// ── Filter pill button ────────────────────────────────────────
function FilterPill({ active, onClick, children, activeClass }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
        active
          ? activeClass || 'bg-sky text-white shadow-sm'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
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

  // Filter
  const diffFiltered = activeDiff === 'all'
    ? activities
    : activities.filter(a => a.difficulty === activeDiff);

  const typeFiltered = activeType === 'all'
    ? diffFiltered
    : diffFiltered.filter(a => a.type === activeType);

  // Sort
  const sorted = [...typeFiltered].sort((a, b) => {
    if (a.type !== b.type) return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
    return DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty];
  });

  // Group by type for "All" view
  const grouped = {};
  ['word_match','fill_blank','sentence_sort','picture_word'].forEach(t => {
    grouped[t] = sorted.filter(a => a.type === t);
  });

  const completedCount = Object.values(progress).filter(p => p.completed).length;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-5">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-gray-800 dark:text-gray-100">Activities</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {completedCount} of {activities.length} completed
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)' }}>

        {/* Row 1: Game type */}
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <FilterPill
              key={t.key}
              active={activeType === t.key}
              onClick={() => setActiveType(t.key)}
              activeClass="bg-indigo-500 text-white shadow-sm"
            >
              {t.label}
            </FilterPill>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* Row 2: Difficulty */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">Level</span>
          {DIFFICULTIES.map(d => (
            <FilterPill
              key={d.key}
              active={activeDiff === d.key}
              onClick={() => setActiveDiff(d.key)}
              activeClass={
                d.key === 'easy'   ? DIFF_STYLE.easy.active   :
                d.key === 'medium' ? DIFF_STYLE.medium.active :
                d.key === 'hard'   ? DIFF_STYLE.hard.active   :
                'bg-sky text-white shadow-sm'
              }
            >
              {d.label}
            </FilterPill>
          ))}
          {(activeType !== 'all' || activeDiff !== 'all') && (
            <button
              onClick={() => { setActiveType('all'); setActiveDiff('all'); }}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results ────────────────────────────────────── */}
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
          {sorted.map(act => (
            <ActivityCard key={act.id} activity={act} progress={progress} />
          ))}
        </div>
      )}
    </div>
  );
}
