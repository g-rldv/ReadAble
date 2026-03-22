// ============================================================
// DashboardPage — home screen, today's stats
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { ArrowRight, Flame, BookOpen, CheckCircle, TrendingUp, Sun } from 'lucide-react';

const DIFF_STYLE = {
  easy:   { pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', bar: 'bg-emerald-500' },
  medium: { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',         bar: 'bg-amber-400'   },
  hard:   { pill: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',             bar: 'bg-rose-500'    },
};

// Short type labels so they never wrap even at xlarge
const TYPE_LABEL = {
  word_match:    'Word Match',
  fill_blank:    'Fill Blank',
  sentence_sort: 'Sentence',
  picture_word:  'Picture',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayBounds() {
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon, label, val, bg, loading }) {
  return (
    <div className="rounded-2xl p-3 border border-gray-200 dark:border-gray-700 flex flex-col gap-2"
      style={{ background: 'var(--bg-card-grad)', opacity: loading ? 0.6 : 1 }}>
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      {/* Use fixed px so these never blow out at xlarge */}
      <div style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 700, lineHeight: 1.1 }}
        className="font-display text-gray-800 dark:text-gray-100 tabular-nums">
        {val}
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ── Up Next Row ───────────────────────────────────────────────
// All text uses fixed px so it never breaks layout at large/xlarge.
function UpNextRow({ act, ds }) {
  return (
    <Link to={`/game/${act.id}`}
      className="flex items-center rounded-2xl border-2 border-gray-100 dark:border-gray-700
                 hover:border-sky hover:shadow-md transition-all group overflow-hidden relative">
      {/* Difficulty bar — left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 flex-shrink-0 ${ds.bar}`}/>

      {/* Content */}
      <div className="pl-4 pr-3 py-3 flex items-center gap-2 flex-1 min-w-0">
        {/* Difficulty pill — fixed px, never scales */}
        <span style={{
          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
          padding: '2px 8px', borderRadius: 999,
        }} className={ds.pill}>
          {act.difficulty.charAt(0).toUpperCase() + act.difficulty.slice(1)}
        </span>

        {/* Title — truncates cleanly */}
        <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, minWidth: 0 }}
          className="text-gray-800 dark:text-gray-100 truncate flex-1">
          {act.title}
        </span>
      </div>

      {/* Right side — XP badge + arrow, fixed px */}
      <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
        <span style={{
          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
          padding: '3px 8px', borderRadius: 999,
        }} className="text-sky bg-sky/10">
          +{act.xp_reward} XP
        </span>
        <ArrowRight size={15} className="text-gray-300 group-hover:text-sky transition-colors flex-shrink-0"/>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user }                        = useAuth();
  const [activities,   setActivities]   = useState([]);
  const [progress,     setProgress]     = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/activities'), api.get('/progress')])
      .then(([a, p]) => { setActivities(a.data.activities); setProgress(p.data.progress); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchStats = useCallback(() => {
    if (!user) return;
    setStatsLoading(true);
    const { from, to } = getTodayBounds();
    api.get(`/progress/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats, user?.xp, user?.streak]);

  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.activity_id));
  const recommended  = activities.filter(a => !completedIds.has(a.id)).slice(0, 4);
  const currentXP    = (user?.xp || 0) % 50;
  const xpPct        = Math.min(100, Math.round((currentXP / 50) * 100));
  const todayPlayed    = parseInt(stats?.stats?.today_played    ?? 0, 10);
  const todayCompleted = parseInt(stats?.stats?.today_completed ?? 0, 10);
  const todayAvg       = Math.round(parseFloat(stats?.stats?.today_avg_score ?? 0));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">

      {/* ── Welcome banner ── */}
      <div className="rounded-3xl p-4 md:p-6 bg-gradient-to-r from-sky to-indigo-500 text-white shadow-lg">
        {/* Use clamp so text shrinks gracefully on small screens at large font size */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: 13, opacity: 0.75, fontWeight: 500 }}>{greeting()},</p>
            <h1 className="font-display truncate" style={{ fontSize: 'clamp(20px, 5vw, 30px)', lineHeight: 1.2 }}>
              {user?.username}
            </h1>
            <p style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>Keep up the great work!</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-display" style={{ fontSize: 'clamp(18px, 4vw, 26px)', lineHeight: 1.2 }}>
              Level {user?.level || 1}
            </div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>{user?.xp || 0} total XP</div>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mt-4">
          <div className="flex justify-between mb-1.5" style={{ fontSize: 12, opacity: 0.7 }}>
            <span>Progress to Level {(user?.level || 1) + 1}</span>
            <span>{currentXP} / 50 XP</span>
          </div>
          <div className="h-2 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }}/>
          </div>
        </div>
      </div>

      {/* ── Today's stats ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sun size={14} className="text-amber-400 flex-shrink-0"/>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#9ca3af', textTransform: 'uppercase' }}>
            Today
          </span>
          {statsLoading && <span className="w-3 h-3 border-2 border-sky/40 border-t-sky rounded-full animate-spin"/>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<BookOpen    size={18} className="text-sky"/>}         label="Played"     val={statsLoading ? '…' : todayPlayed}      bg="bg-sky/10"                           loading={statsLoading}/>
          <StatCard icon={<CheckCircle size={18} className="text-emerald-500"/>} label="Completed"  val={statsLoading ? '…' : todayCompleted}   bg="bg-emerald-50 dark:bg-emerald-900/20" loading={statsLoading}/>
          <StatCard icon={<TrendingUp  size={18} className="text-indigo-500"/>}  label="Avg Score"  val={statsLoading ? '…' : `${todayAvg}%`}   bg="bg-indigo-50 dark:bg-indigo-900/20"   loading={statsLoading}/>
          <StatCard icon={<Flame       size={18} className="text-orange-400"/>}  label="Day Streak" val={`${user?.streak || 0}d`}               bg="bg-orange-50 dark:bg-orange-900/20"   loading={false}/>
        </div>
      </div>

      {/* ── Up Next ── */}
      <div className="rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-200 dark:border-gray-700"
        style={{ background: 'var(--bg-card-grad)' }}>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="font-display text-gray-800 dark:text-gray-100 flex-shrink-0"
            style={{ fontSize: 'clamp(16px, 4vw, 22px)' }}>
            Up Next
          </h2>
          <Link to="/activities"
            className="text-sky font-bold flex items-center gap-1 hover:underline flex-shrink-0"
            style={{ fontSize: 13 }}>
            See all <ArrowRight size={13}/>
          </Link>
        </div>

        {recommended.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle size={32} className="mx-auto mb-3 text-emerald-400 opacity-70"/>
            <p className="font-semibold" style={{ fontSize: 14 }}>All activities completed!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recommended.map(act => {
              const ds = DIFF_STYLE[act.difficulty] || DIFF_STYLE.easy;
              return <UpNextRow key={act.id} act={act} ds={ds}/>;
            })}
          </div>
        )}
      </div>

      {/* ── Recent Activity ── */}
      {progress.length > 0 && (
        <div className="rounded-2xl md:rounded-3xl p-4 md:p-5 border border-gray-200 dark:border-gray-700"
          style={{ background: 'var(--bg-card-grad)' }}>
          <h2 className="font-display text-gray-800 dark:text-gray-100 mb-3"
            style={{ fontSize: 'clamp(16px, 4vw, 22px)' }}>
            Recent Activity
          </h2>
          <div className="space-y-0">
            {progress.slice(0, 5).map((p, i) => (
              <div key={p.id}
                className={`flex items-center gap-3 py-3 ${i < Math.min(4, progress.length - 1) ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-sky/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} className="text-sky"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-gray-700 dark:text-gray-300" style={{ fontSize: 13 }}>
                    {p.title}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>
                    {new Date(p.last_played).toLocaleDateString()}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, flexShrink: 0 }}
                  className={p.score >= 80
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : p.score >= 50
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}>
                  {p.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
