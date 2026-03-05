// ============================================================
// ProfilePage — user achievements, stats, and avatar picker
// ============================================================
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Star, Flame, CheckCircle, BookOpen, TrendingUp } from 'lucide-react';

const AVATARS = ['⭐','🦁','🐸','🐶','🦊','🐱','🦄','🐢','🦋','🚀','🌈','🎯'];

const ACHIEVEMENT_INFO = {
  first_star:   { title: 'First Star!',       icon: '⭐', desc: 'Completed first activity' },
  five_streak:  { title: 'On Fire!',          icon: '🔥', desc: '5 correct in a row' },
  level_5:      { title: 'Word Wizard',       icon: '🧙', desc: 'Reached Level 5' },
  level_10:     { title: 'Reading Champion',  icon: '🏆', desc: 'Reached Level 10' },
  xp_100:       { title: 'Century Club',      icon: '💯', desc: 'Earned 100 XP' },
  xp_500:       { title: 'XP Legend',         icon: '🌟', desc: 'Earned 500 XP' },
  perfect_3:    { title: 'Perfectionist',     icon: '💎', desc: '3 perfect scores in a row' },
  night_owl:    { title: 'Night Owl',         icon: '🦉', desc: 'Played 5 late-night sessions' },
};

const ALL_ACHIEVEMENTS = Object.entries(ACHIEVEMENT_INFO).map(([key, val]) => ({ key, ...val }));

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'star');

  useEffect(() => {
    api.get('/progress/stats').then(r => setStats(r.data)).catch(console.error);
  }, []);

  const handleAvatarPick = async (emoji) => {
    setSelectedAvatar(emoji);
    setSavingAvatar(true);
    try {
      await api.put('/users/avatar', { avatar: emoji });
      await refreshUser();
    } catch (_) {}
    setSavingAvatar(false);
  };

  const unlockedAchievements = new Set(user?.achievements || []);
  const xpForLevel = 50;
  const currentXP  = (user?.xp || 0) % xpForLevel;
  const xpPct      = Math.min(100, Math.round((currentXP / xpForLevel) * 100));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="font-display text-3xl text-gray-800 dark:text-gray-200">👤 My Profile</h1>

      {/* ── Profile Card ──────────────────────────────────── */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-sky/10 to-mint/10 border border-sky/20"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-5">
          <div className="text-6xl w-20 h-20 rounded-3xl bg-gradient-to-br from-coral to-sunny flex items-center justify-center shadow-lg">
            {selectedAvatar === 'star' ? '⭐' : selectedAvatar}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-3xl text-gray-800 dark:text-gray-200">{user?.username}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <p className="text-gray-400 text-xs mt-1">Joined {new Date(user?.created_at).toLocaleDateString()}</p>
          </div>
          <div className="text-center">
            <div className="font-display text-4xl text-sky">Level {user?.level || 1}</div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Star size={14} className="text-sunny fill-sunny" />
              <span className="font-bold">{user?.xp || 0} XP</span>
            </div>
          </div>
        </div>
        {/* XP Bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progress to Level {(user?.level || 1) + 1}</span>
            <span>{currentXP}/{xpForLevel} XP</span>
          </div>
          <div className="xp-bar"><div className="xp-bar-fill" style={{ width: `${xpPct}%` }} /></div>
        </div>
      </div>

      {/* ── Avatar Picker ────────────────────────────────── */}
      <div className="rounded-3xl p-6" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-display text-xl mb-4 text-gray-800 dark:text-gray-200">🎨 Choose Your Avatar</h3>
        <div className="flex flex-wrap gap-3">
          {AVATARS.map(emoji => (
            <button key={emoji} onClick={() => handleAvatarPick(emoji)}
              className={`text-3xl w-14 h-14 rounded-2xl border-2 transition-all hover:-translate-y-1 ${
                selectedAvatar === emoji
                  ? 'border-sky bg-sky/15 scale-110 shadow-md'
                  : 'border-gray-200 dark:border-gray-600 hover:border-sky/50'
              }`}>
              {emoji}
            </button>
          ))}
        </div>
        {savingAvatar && <p className="text-sm text-sky mt-2 animate-pulse">Saving…</p>}
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <BookOpen size={20} className="text-sky" />,         label: 'Activities',    value: stats?.stats?.total_activities || 0,    bg: 'bg-sky/10' },
          { icon: <CheckCircle size={20} className="text-mint" />,     label: 'Completed',     value: stats?.stats?.completed_count || 0,      bg: 'bg-mint/10' },
          { icon: <TrendingUp size={20} className="text-grape" />,     label: 'Avg Score',     value: `${Math.round(stats?.stats?.avg_score || 0)}%`, bg: 'bg-grape/10' },
          { icon: <Flame size={20} className="text-coral" />,          label: 'Day Streak',    value: user?.streak || 0,                      bg: 'bg-coral/10' },
        ].map(({ icon, label, value, bg }) => (
          <div key={label} className={`rounded-2xl p-4 border border-gray-100 dark:border-gray-700`}
            style={{ background: 'var(--bg-card)' }}>
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>{icon}</div>
            <div className="font-display text-2xl text-gray-800 dark:text-gray-200">{value}</div>
            <div className="text-xs text-gray-500 font-semibold">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Achievements ─────────────────────────────────── */}
      <div className="rounded-3xl p-6" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-display text-xl mb-5 text-gray-800 dark:text-gray-200">🏅 Achievements</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ALL_ACHIEVEMENTS.map(ach => {
            const earned = unlockedAchievements.has(ach.key);
            return (
              <div key={ach.key} className={`rounded-2xl p-4 text-center border-2 transition-all ${
                earned
                  ? 'border-sunny/50 bg-sunny/10 shadow-sm'
                  : 'border-gray-100 dark:border-gray-700 opacity-40 grayscale'
              }`}>
                <div className="text-4xl mb-2">{ach.icon}</div>
                <p className="font-bold text-xs text-gray-700 dark:text-gray-300">{ach.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{ach.desc}</p>
                {earned && <span className="inline-block mt-2 text-xs bg-sunny/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-bold">Earned!</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
