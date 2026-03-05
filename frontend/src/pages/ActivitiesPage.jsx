// ============================================================
// ActivitiesPage — browse and filter all activities
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { ArrowRight, Search } from 'lucide-react';

const DIFFICULTY_COLORS = {
  easy:   { badge: 'bg-mint/15 text-green-700 border-mint/30',   dot: 'bg-mint' },
  medium: { badge: 'bg-sunny/15 text-yellow-700 border-sunny/30', dot: 'bg-sunny' },
  hard:   { badge: 'bg-coral/15 text-red-600 border-coral/30',   dot: 'bg-coral' },
};

const TYPE_LABELS = {
  word_match:    { icon: '🔗', label: 'Word Match' },
  fill_blank:    { icon: '✏️', label: 'Fill in the Blank' },
  sentence_sort: { icon: '🔀', label: 'Sentence Sort' },
  picture_word:  { icon: '🖼️', label: 'Picture & Word' },
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [progress,   setProgress]   = useState({});
  const [loading,    setLoading]     = useState(true);
  const [filter, setFilter] = useState({ difficulty: 'all', type: 'all', search: '' });

  useEffect(() => {
    Promise.all([api.get('/activities'), api.get('/progress')])
      .then(([actRes, progRes]) => {
        setActivities(actRes.data.activities);
        const progMap = {};
        progRes.data.progress.forEach(p => { progMap[p.activity_id] = p; });
        setProgress(progMap);
      }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = activities.filter(a => {
    if (filter.difficulty !== 'all' && a.difficulty !== filter.difficulty) return false;
    if (filter.type !== 'all' && a.type !== filter.type) return false;
    if (filter.search && !a.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-4xl animate-bounce">📚</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="font-display text-3xl text-gray-800 dark:text-gray-200 mb-6">📚 All Activities</h1>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="rounded-3xl p-4 mb-6 flex flex-wrap gap-3 items-center"
        style={{ background: 'var(--bg-card)' }}>
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
          <Search size={16} className="text-gray-400" />
          <input
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Search activities…"
            className="bg-transparent text-sm outline-none flex-1 text-gray-700 dark:text-gray-300"
          />
        </div>
        {/* Difficulty */}
        <div className="flex gap-2">
          {['all', 'easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setFilter(f => ({ ...f, difficulty: d }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                filter.difficulty === d
                  ? 'bg-sky text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-sky/10'
              }`}>{d}</button>
          ))}
        </div>
        {/* Type */}
        <div className="flex gap-2">
          {['all', 'word_match', 'fill_blank', 'sentence_sort', 'picture_word'].map(t => (
            <button key={t} onClick={() => setFilter(f => ({ ...f, type: t }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filter.type === t
                  ? 'bg-coral text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-coral/10'
              }`}>
              {t === 'all' ? 'All Types' : TYPE_LABELS[t]?.icon || t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map(act => {
          const prog = progress[act.id];
          const isComplete = prog?.completed;
          const score = prog?.score || 0;
          const typeInfo = TYPE_LABELS[act.type] || { icon: '📖', label: act.type };
          return (
            <Link key={act.id} to={`/game/${act.id}`}
              className="rounded-3xl p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-sky hover:shadow-lg transition-all group"
              style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{typeInfo.icon}</div>
                <div className="flex items-center gap-2">
                  {isComplete && (
                    <span className="px-2 py-0.5 bg-mint/15 text-green-700 text-xs font-bold rounded-full border border-mint/30">
                      ✓ Done
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full border capitalize ${DIFFICULTY_COLORS[act.difficulty]?.badge}`}>
                    {act.difficulty}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">{act.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{act.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{typeInfo.icon} {typeInfo.label}</span>
                  <span className="text-sky font-bold">+{act.xp_reward} XP</span>
                </div>
                {prog && (
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    score >= 80 ? 'bg-mint/15 text-green-700' :
                    score >= 50 ? 'bg-sunny/15 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{score}%</div>
                )}
                <ArrowRight size={16} className="text-gray-300 group-hover:text-sky transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-semibold">No activities match your filters</p>
        </div>
      )}
    </div>
  );
}
