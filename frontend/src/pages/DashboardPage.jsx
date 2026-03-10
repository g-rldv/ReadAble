// ============================================================
// DashboardPage — home screen after login
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { ArrowRight, Flame, BookOpen, CheckCircle, TrendingUp, Clock } from 'lucide-react';

const DIFF_STYLE = {
  easy:   { pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', bar: 'bg-emerald-500' },
  medium: { pill: 'bg-amber-100   text-amber-700   dark:bg-amber-900/40   dark:text-amber-400',   bar: 'bg-amber-400'   },
  hard:   { pill: 'bg-rose-100    text-rose-600    dark:bg-rose-900/40    dark:text-rose-400',     bar: 'bg-rose-500'    },
};

const TYPE_LABEL = {
  word_match:    'Word Match',
  fill_blank:    'Fill the Blank',
  sentence_sort: 'Sentence Sort',
  picture_word:  'Picture & Word',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user }                    = useAuth();
  const [activities, setActivities] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [progress,   setProgress]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Initial load: activities + progress (stable, only needed once) ──
  useEffect(() => {
    Promise.all([
      api.get('/activities'),
      api.get('/progress'),
    ]).then(([actRes, progRes]) => {
      setActivities(actRes.data.activities);
      setProgress(progRes.data.progress);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Stats: refetch whenever the user's XP changes (i.e. after every game) ──
  // This runs on mount AND every time refreshUser() is called after a game
  const fetchStats = useCallback(() => {
    setStatsLoading(true);
    api.get('/progress/stats')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, user?.xp, user?.streak]); // re-run when XP/streak changes

  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.activity_id));
  const recommended  = activities.filter(a => !completedIds.has(a.id)).slice(0, 3);
  const currentXP    = (user?.xp || 0) % 50;
  const xpPct        = Math.min(100, Math.round((currentXP / 50) * 100));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Today stats with fallback to 0
  const todayPlayed    = parseInt(stats?.stats?.today_played    ?? 0);
  const todayCompleted = parseInt(stats?.stats?.today_completed ?? 0);
  const todayAvg       = Math.round(parseFloat(stats?.stats?.today_avg_score ?? 0));

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">

      {/* ── Welcome Banner ──────────────────────────────── */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-sky to-indigo-500 text-white shadow-lg">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-white/70 font-medium">{greeting()},</p>
            <h1 className="font-display text-3xl mt-0.5">{user?.username}</h1>
            <p className="text-sm text-white/70 mt-1">Keep up the great work!</p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl">Level {user?.level || 1}</div>
            <div className="text-sm text-white/70">{user?.xp || 0} total XP</div>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-xs text-white/70 mb-1.5">
            <span>Progress to Level {(user?.level || 1) + 1}</span>
            <span>{currentXP} / 50 XP</span>
          </div>
          <div className="h-2 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Today's Stats ───────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Today</span>
          {statsLoading && (
            <span className="w-3 h-3 border-2 border-sky/40 border-t-sky rounded-full animate-spin ml-1" />
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon:  <BookOpen    size={20} className="text-sky"         />,
              label: 'Played',
              value: todayPlayed,
              bg:    'bg-sky/10 dark:bg-sky/5',
            },
            {
              icon:  <CheckCircle size={20} className="text-emerald-500" />,
              label: 'Completed',
              value: todayCompleted,
              bg:    'bg-emerald-50 dark:bg-emerald-900/20',
            },
            {
              icon:  <TrendingUp  size={20} className="text-indigo-500"  />,
              label: 'Avg Score',
              value: `${todayAvg}%`,
              bg:    'bg-indigo-50 dark:bg-indigo-900/20',
            },
            {
              icon:  <Flame       size={20} className="text-orange-400"  />,
              label: 'Day Streak',
              value: `${user?.streak || 0}d`,
              bg:    'bg-orange-50 dark:bg-orange-900/20',
            },
          ].map(({ icon, label, value, bg }) => (
            <div key={label}
              className="rounded-2xl p-4 border border-gray-200 dark:border-gray-700 transition-opacity"
              style={{ background: 'var(--bg-card)', opacity: statsLoading ? 0.6 : 1 }}>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>{icon}</div>
              <div className="font-display text-2xl text-gray-800 dark:text-gray-100">{value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Up Next ─────────────────────────────────────── */}
      <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-gray-800 dark:text-gray-100">Up Next</h2>
          <Link to="/activities"
            className="text-sky text-xs font-bold flex items-center gap-1 hover:underline">
            See all <ArrowRight size={13} />
          </Link>
        </div>

        {recommended.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle size={36} className="mx-auto mb-3 text-emerald-400 opacity-70" />
            <p className="font-semibold text-sm">You've completed all activities!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recommended.map(act => {
              const ds = DIFF_STYLE[act.difficulty] || DIFF_STYLE.easy;
              return (
                <Link key={act.id} to={`/game/${act.id}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl
                             border border-gray-200 dark:border-gray-700
                             hover:border-sky/60 hover:shadow-sm transition-all group
                             overflow-hidden relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${ds.bar}`} />
                  <div className="pl-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ds.pill}`}>
                        {act.difficulty}
                      </span>
                      <span className="text-[10px] text-gray-400">{TYPE_LABEL[act.type] || act.type}</span>
                    </div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{act.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-sky bg-sky/10 dark:bg-sky/20 px-2 py-0.5 rounded-full">
                      +{act.xp_reward} XP
                    </span>
                    <ArrowRight size={15} className="text-gray-300 group-hover:text-sky transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Activity ─────────────────────────────── */}
      {progress.length > 0 && (
        <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700"
          style={{ background: 'var(--bg-card)' }}>
          <h2 className="font-display text-lg text-gray-800 dark:text-gray-100 mb-4">Recent Activity</h2>
          <div className="space-y-1">
            {progress.slice(0, 5).map(p => (
              <div key={p.id}
                className="flex items-center gap-3 py-2.5 px-1
                           border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-700 dark:text-gray-200 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {TYPE_LABEL[p.type] || p.type} &middot; {new Date(p.last_played).toLocaleDateString()}
                  </p>
                </div>
                <div className={`font-bold text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${
                  p.score >= 80
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : p.score >= 50
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>{p.score}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
