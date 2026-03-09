// ============================================================
// ActivitiesPage — browse activities by type and difficulty
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle, Star } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────
const TYPES = [
  { key: 'all',           label: 'All Games',      icon: '🎮' },
  { key: 'word_match',    label: 'Word Match',      icon: '🔗' },
  { key: 'fill_blank',    label: 'Fill the Blank',  icon: '✏️'  },
  { key: 'sentence_sort', label: 'Sentence Sort',   icon: '🔀' },
  { key: 'picture_word',  label: 'Picture & Word',  icon: '🖼️'  },
];

const DIFFICULTIES = [
  { key: 'all',    label: 'All Levels' },
  { key: 'easy',   label: 'Easy'       },
  { key: 'medium', label: 'Medium'     },
  { key: 'hard',   label: 'Hard'       },
];

const DIFF_STYLE = {
  easy:   { badge: 'bg-emerald-100 text-emerald-700',  bar: 'bg-emerald-400' },
  medium: { badge: 'bg-amber-100 text-amber-700',      bar: 'bg-amber-400'   },
  hard:   { badge: 'bg-rose-100 text-rose-600',        bar: 'bg-rose-400'    },
};

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

// ── Activity Card ─────────────────────────────────────────────
function ActivityCard({ activity, progress }) {
  const prog       = progress[activity.id];
  const isComplete = prog?.completed;
  const score      = prog?.score ?? null;
  const diff       = DIFF_STYLE[activity.difficulty];
  const typeInfo   = TYPES.find(t => t.key === activity.type);

  return (
    <Link
      to={`/game/${activity.id}`}
      className="group flex flex-col rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-sky hover:shadow-md transition-all overflow-hidden"
      style={{ background: 'var(--bg-card)' }}
    >
      {/* Difficulty colour bar */}
      <div className={`h-1.5 w-full ${diff.bar}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Top row: type icon + badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-2xl" role="img">{typeInfo?.icon}</span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${diff.badge}`}>
              {activity.difficulty}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky/10 text-sky">
              +{activity.xp_reward} XP
            </span>
          </div>
        </div>

        {/* Title & description */}
        <h3 className="font-display text-base text-gray-800 dark:text-gray-100 mb-1 leading-snug">
          {activity.title}
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 flex-1 leading-relaxed">
          {activity.description}
        </p>

        {/* Bottom: progress or play prompt */}
        <div className="mt-4 flex items-center justify-between">
          {isComplete ? (
            <div className="flex items-center gap-1.5 text-emerald-500 text-sm font-bold">
              <CheckCircle size={16} />
              <span>Completed</span>
              {score !== null && (
                <span className="ml-1 text-xs text-gray-400 font-normal">{score}%</span>
              )}
            </div>
          ) : score !== null ? (
            <div className="flex items-center gap-1 text-amber-500 text-sm font-semibold">
              <Star size={14} />
              <span>Best: {score}%</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Not played yet</span>
          )}
          <span className="text-xs font-bold text-sky group-hover:translate-x-1 transition-transform">
            Play →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Type Section (used in "All" view) ─────────────────────────
function TypeSection({ typeKey, activities, progress }) {
  const typeInfo = TYPES.find(t => t.key === typeKey);
  if (!activities.length) return null;

  const sorted = [...activities].sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{typeInfo?.icon}</span>
        <h2 className="font-display text-lg text-gray-700 dark:text-gray-300">{typeInfo?.label}</h2>
        <span className="text-xs text-gray-400 ml-1">({activities.length})</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(act => (
          <ActivityCard key={act.id} activity={act} progress={progress} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [progress,   setProgress]   = useState({});
  const [loading,    setLoading]     = useState(true);
  const [activeType, setActiveType]  = useState('all');
  const [activeDiff, setActiveDiff]  = useState('all');

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
      <div className="text-4xl animate-bounce">🎮</div>
    </div>
  );

  // Apply difficulty filter
  const diffFiltered = activeDiff === 'all'
    ? activities
    : activities.filter(a => a.difficulty === activeDiff);

  // Apply type filter
  const typeFiltered = activeType === 'all'
    ? diffFiltered
    : diffFiltered.filter(a => a.type === activeType);

  // Sort: by type order, then difficulty
  const typeOrder = { word_match: 0, fill_blank: 1, sentence_sort: 2, picture_word: 3 };
  const sorted = [...typeFiltered].sort((a, b) => {
    if (a.type !== b.type) return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    return DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty];
  });

  // Group by type for "All" view
  const grouped = {};
  if (activeType === 'all') {
    ['word_match', 'fill_blank', 'sentence_sort', 'picture_word'].forEach(t => {
      grouped[t] = sorted.filter(a => a.type === t);
    });
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-3xl text-gray-800 dark:text-gray-100">Activities</h1>
        <p className="text-sm text-gray-400 mt-1">{activities.length} games across 4 categories</p>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)' }}>

        {/* Game type */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Game Type</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                  activeType === t.key
                    ? 'bg-sky text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-sky/15 hover:text-sky'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Difficulty</p>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d.key}
                onClick={() => setActiveDiff(d.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                  activeDiff === d.key
                    ? d.key === 'easy'   ? 'bg-emerald-400 text-white shadow-sm'
                    : d.key === 'medium' ? 'bg-amber-400 text-white shadow-sm'
                    : d.key === 'hard'   ? 'bg-rose-400 text-white shadow-sm'
                    :                     'bg-sky text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🎯</div>
          <p className="font-display text-lg">No activities found</p>
          <p className="text-sm mt-1">Try a different filter</p>
        </div>
      ) : activeType === 'all' ? (
        // Grouped view
        <div className="space-y-8">
          {['word_match', 'fill_blank', 'sentence_sort', 'picture_word'].map(t => (
            <TypeSection key={t} typeKey={t} activities={grouped[t] || []} progress={progress} />
          ))}
        </div>
      ) : (
        // Flat grid for single type
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map(act => (
            <ActivityCard key={act.id} activity={act} progress={progress} />
          ))}
        </div>
      )}

    </div>
  );
}
