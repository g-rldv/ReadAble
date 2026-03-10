// ============================================================
// LeaderboardPage — top users by XP
// ============================================================
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Trophy, Star } from 'lucide-react';

// ── Shared avatar renderer ────────────────────────────────────
// Handles emoji strings, base64 data URLs, and http image URLs
function AvatarDisplay({ avatar, className = '', fallback = '⭐', textClass = 'text-2xl' }) {
  const isImage = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  if (isImage) {
    return (
      <img
        src={avatar}
        alt="avatar"
        className={`object-cover rounded-xl ${className}`}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  const display = (!avatar || avatar === 'star') ? fallback : avatar;
  return <span className={textClass}>{display}</span>;
}

// ── Podium avatar wrapper ─────────────────────────────────────
function PodiumAvatar({ avatar }) {
  const isImage = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  return (
    <div className="w-14 h-14 mb-2 flex items-center justify-center">
      {isImage ? (
        <img src={avatar} alt="avatar"
          className="w-14 h-14 object-cover rounded-2xl ring-2 ring-white/30"
          onError={e => { e.currentTarget.style.display = 'none'; }} />
      ) : (
        <span className="text-4xl">{(!avatar || avatar === 'star') ? '⭐' : avatar}</span>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user }    = useAuth();
  const [leaders,  setLeaders]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/users/leaderboard')
      .then(res => setLeaders(res.data.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl text-gray-800 dark:text-gray-100 mb-2">Leaderboard</h1>
        <p className="text-gray-500 text-sm">Top readers — keep playing to climb the ranks!</p>
      </div>

      {/* ── Podium ─────────────────────────────────────── */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8 px-2">

          {/* 2nd place */}
          <div className="flex-1 flex flex-col items-center">
            <PodiumAvatar avatar={leaders[1]?.avatar} />
            <div className="w-full rounded-t-2xl text-center py-5 shadow-lg
                            bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600">
              <div className="text-xl mb-1">🥈</div>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate px-2">{leaders[1]?.username}</p>
              <p className="text-[10px] text-slate-600 dark:text-slate-300">Lv {leaders[1]?.level}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{leaders[1]?.xp} XP</span>
              </div>
            </div>
          </div>

          {/* 1st place */}
          <div className="flex-1 flex flex-col items-center">
            <PodiumAvatar avatar={leaders[0]?.avatar} />
            <div className="w-full rounded-t-2xl text-center py-7 shadow-xl
                            bg-gradient-to-b from-yellow-300 to-yellow-500">
              <div className="text-2xl mb-1">🥇</div>
              <p className="font-bold text-xs text-yellow-900 truncate px-2">{leaders[0]?.username}</p>
              <p className="text-[10px] text-yellow-800">Lv {leaders[0]?.level}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star size={10} className="text-yellow-800 fill-yellow-800" />
                <span className="text-[10px] font-bold text-yellow-800">{leaders[0]?.xp} XP</span>
              </div>
            </div>
          </div>

          {/* 3rd place */}
          <div className="flex-1 flex flex-col items-center">
            <PodiumAvatar avatar={leaders[2]?.avatar} />
            <div className="w-full rounded-t-2xl text-center py-3 shadow-lg
                            bg-gradient-to-b from-orange-300 to-orange-400">
              <div className="text-xl mb-1">🥉</div>
              <p className="font-bold text-xs text-orange-900 truncate px-2">{leaders[2]?.username}</p>
              <p className="text-[10px] text-orange-800">Lv {leaders[2]?.level}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star size={10} className="text-orange-800 fill-orange-800" />
                <span className="text-[10px] font-bold text-orange-800">{leaders[2]?.xp} XP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Full list ──────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        style={{ background: 'var(--bg-card)' }}>
        {leaders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Trophy size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No players yet. Be the first!</p>
          </div>
        ) : leaders.map((leader, idx) => {
          const isMe = leader.username === user?.username;
          const isImage = leader.avatar && (leader.avatar.startsWith('data:') || leader.avatar.startsWith('http'));
          return (
            <div key={leader.username}
              className={`flex items-center gap-3 px-4 py-3 border-b
                          border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors
                          ${isMe
                            ? 'bg-sky/10 dark:bg-sky/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>

              {/* Rank */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                               text-xs font-bold
                               ${idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700' :
                                 idx === 1 ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                                 idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                                 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1}
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center
                              rounded-xl overflow-hidden
                              bg-gradient-to-br from-sky/20 to-indigo-100 dark:from-sky/10 dark:to-indigo-900/30">
                {isImage ? (
                  <img src={leader.avatar} alt="avatar"
                    className="w-9 h-9 object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span className="text-lg">
                    {(!leader.avatar || leader.avatar === 'star') ? '⭐' : leader.avatar}
                  </span>
                )}
              </div>

              {/* Name + level */}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${isMe ? 'text-sky' : 'text-gray-800 dark:text-gray-100'}`}>
                  {leader.username}{isMe && <span className="ml-1 text-xs font-medium text-sky/70">(you)</span>}
                </p>
                <p className="text-xs text-gray-400">Level {leader.level}</p>
              </div>

              {/* XP */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star size={13} className="text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{leader.xp} XP</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
