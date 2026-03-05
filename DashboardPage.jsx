// ============================================================
// DashboardPage — home screen after login
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import api from '../utils/api';
import { ArrowRight, Flame, BookOpen, CheckCircle, Star } from 'lucide-react';

const DIFFICULTY_COLORS = {
  easy:   'bg-mint/15 text-mint-dark border-mint/30',
  medium: 'bg-sunny/15 text-yellow-700 border-sunny/30',
  hard:   'bg-coral/15 text-coral-dark border-coral/30',
};

const TYPE_ICONS = {
  word_match:     '🔗',
  fill_blank:     '✏️',
  sentence_sort:  '🔀',
  picture_word:   '🖼️',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { speak } = useSettings();
  const [activities, setActivities] = useState([]);
  const [stats, setStats]           = useState(null);
  const [progress, setProgress]     = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/activities'),
      api.get('/progress/stats'),
      api.get('/progress'),
    ]).then(([actRes, statsRes, progRes]) => {
      setActivities(actRes.data.activities);
      setStats(statsRes.data);
      setProgress(progRes.data.progress);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.activity_id));
  const recommended  = activities.filter(a => !completedIds.has(a.id)).slice(0, 3);
  const xpForLevel   = (user?.level || 1) * 50;
  const currentXP    = (user?.xp || 0) % 50;
  const xpPct        = Math.min(100, Math.round((currentXP / 50) * 100));

  const greetings = ['Good morning', 'Hello', 'Hey there', 'Welcome back'];
  const greeting  = greetings[new Date().getHours() < 12 ? 0 : new Date().getHours() < 18 ? 1 : 2];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-4xl animate-bounce">📚</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* ── Welcome Header ──────────────────────────────────── */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-sky to-mint text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-semibold opacity-80 text-sm">{greeting},</p>
            <h1 className="font-display text-3xl">{user?.username}! 👋</h1>
            <p className="text-sm opacity-80 mt-1">Keep up the great work!</p>
          </div>
          <div className="text-right">
            <div className="font-display text-4xl">Level {user?.level || 1}</div>
            <div className="text-sm opacity-80">{user?.xp || 0} total XP</div>
          </div>
        </div>
        {/* Level XP bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs opacity-80 mb-1.5">
            <span>Progress to Level {(user?.level || 1) + 1}</span>
            <span>{currentXP}/50 XP</span>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Quick Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <BookOpen size={22} className="text-sky" />, label: 'Activities',    value: stats?.stats?.total_activities || 0,    bg: 'bg-sky/10' },
          { icon: <CheckCircle size={22} className="text-mint" />, label: 'Completed', value: stats?.stats?.completed_count || 0,      bg: 'bg-mint/10' },
          { icon: <Star size={22} className="text-sunny fill-sunny" />, label: 'Avg Score', value: `${Math.round(stats?.stats?.avg_score || 0)}%`, bg: 'bg-sunny/10' },
          { icon: <Flame size={22} className="text-coral" />, label: 'Streak',         value: `${user?.streak || 0} days`,           bg: 'bg-coral/10' },
        ].map(({ icon, label, value, bg }) => (
          <div key={label} className={`rounded-2xl p-4 ${bg} border border-gray-100 dark:border-gray-700`}
            style={{ background: 'var(--bg-card)' }}>
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-2`}>{icon}</div>
            <div className="font-display text-2xl text-gray-800 dark:text-gray-200">{value}</div>
            <div className="text-xs text-gray-500 font-semibold">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Achievements ─────────────────────────────────────── */}
      {(user?.achievements?.length > 0) && (
        <div className="rounded-3xl p-6" style={{ background: 'var(--bg-card)' }}>
          <h2 className="font-display text-xl mb-4 text-gray-800 dark:text-gray-200">🏅 My Badges</h2>
          <div className="flex flex-wrap gap-3">
            {user.achievements.map(key => (
              <span key={key} className="px-4 py-2 bg-sunny/20 rounded-full text-sm font-bold text-yellow-700 dark:text-yellow-300">
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommended Activities ─────────────────────────── */}
      <div className="rounded-3xl p-6" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-gray-800 dark:text-gray-200">✨ Up Next</h2>
          <Link to="/activities" className="text-sky text-sm font-bold flex items-center gap-1 hover:underline">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-3">
          {recommended.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-semibold">You've completed all activities!</p>
            </div>
          ) : recommended.map(act => (
            <Link key={act.id} to={`/game/${act.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-sky hover:shadow-md transition-all group">
              <div className="text-3xl w-12 text-center">{TYPE_ICONS[act.type] || '📖'}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 truncate">{act.title}</h3>
                <p className="text-xs text-gray-500 truncate">{act.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${DIFFICULTY_COLORS[act.difficulty]}`}>
                  {act.difficulty}
                </span>
                <span className="text-xs font-bold text-sky bg-sky/10 px-2 py-1 rounded-full">+{act.xp_reward} XP</span>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-sky transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────── */}
      {progress.length > 0 && (
        <div className="rounded-3xl p-6" style={{ background: 'var(--bg-card)' }}>
          <h2 className="font-display text-xl mb-4 text-gray-800 dark:text-gray-200">📜 Recent Activity</h2>
          <div className="space-y-2">
            {progress.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xl">{TYPE_ICONS[p.type] || '📖'}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">{p.title}</p>
                  <p className="text-xs text-gray-400">{new Date(p.last_played).toLocaleDateString()}</p>
                </div>
                <div className={`font-bold text-sm px-3 py-1 rounded-full ${
                  p.score >= 80 ? 'bg-mint/15 text-mint-dark' :
                  p.score >= 50 ? 'bg-sunny/15 text-yellow-700' :
                  'bg-coral/15 text-coral'
                }`}>{p.score}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
