// ============================================================
// LeaderboardPage — top users by XP
// ============================================================
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Trophy, Star } from 'lucide-react';

const RANK_STYLES = [
  { bg: 'from-yellow-400 to-yellow-500', text: 'text-yellow-900', icon: '🥇' },
  { bg: 'from-gray-300 to-gray-400',     text: 'text-gray-800',   icon: '🥈' },
  { bg: 'from-orange-400 to-orange-500', text: 'text-orange-900', icon: '🥉' },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/leaderboard')
      .then(res => setLeaders(res.data.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-4xl animate-bounce">🏆</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl text-gray-800 dark:text-gray-200 mb-2">🏆 Leaderboard</h1>
        <p className="text-gray-500">Top readers this week — keep playing to climb the ranks!</p>
      </div>

      {/* Top 3 podium */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8 px-4">
          {/* 2nd */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-4xl mb-2">{leaders[1]?.avatar === 'star' ? '⭐' : leaders[1]?.avatar || '⭐'}</div>
            <div className="w-full rounded-t-3xl bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-center py-6 shadow-lg">
              <div className="text-2xl mb-1">🥈</div>
              <p className="font-bold text-sm text-gray-700 dark:text-gray-200 truncate px-2">{leaders[1]?.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lv.{leaders[1]?.level}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{leaders[1]?.xp} XP</span>
              </div>
            </div>
          </div>
          {/* 1st */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-4xl mb-2 animate-bounce">{leaders[0]?.avatar === 'star' ? '⭐' : leaders[0]?.avatar || '⭐'}</div>
            <div className="w-full rounded-t-3xl bg-gradient-to-b from-yellow-300 to-yellow-500 text-center py-8 shadow-xl">
              <div className="text-3xl mb-1">🥇</div>
              <p className="font-bold text-sm text-yellow-900 truncate px-2">{leaders[0]?.username}</p>
              <p className="text-xs text-yellow-800">Lv.{leaders[0]?.level}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star size={12} className="text-yellow-800 fill-yellow-800" />
                <span className="text-xs font-bold text-yellow-800">{leaders[0]?.xp} XP</span>
              </div>
            </div>
          </div>
          {/* 3rd */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-4xl mb-2">{leaders[2]?.avatar === 'star' ? '⭐' : leaders[2]?.avatar || '⭐'}</div>
            <div className="w-full rounded-t-3xl bg-gradient-to-b from-orange-300 to-orange-400 text-center py-4 shadow-lg">
              <div className="text-2xl mb-1">🥉</div>
              <p className="font-bold text-sm text-orange-900 truncate px-2">{leaders[2]?.username}</p>
              <p className="text-xs text-orange-800">Lv.{leaders[2]?.level}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star size={12} className="text-orange-800 fill-orange-800" />
                <span className="text-xs font-bold text-orange-800">{leaders[2]?.xp} XP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700"
        style={{ background: 'var(--bg-card)' }}>
        {leaders.map((leader, idx) => {
          const isMe = leader.username === user?.username;
          return (
            <div key={leader.username}
              className={`flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors
                ${isMe ? 'bg-sky/10 dark:bg-sky/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-lg
                ${idx === 0 ? 'bg-yellow-100 text-yellow-600' :
                  idx === 1 ? 'bg-gray-100 text-gray-600' :
                  idx === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-bold'}`}>
                {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1}
              </div>
              <div className="text-2xl">{leader.avatar === 'star' ? '⭐' : leader.avatar || '⭐'}</div>
              <div className="flex-1">
                <p className={`font-bold text-sm ${isMe ? 'text-sky' : 'text-gray-800 dark:text-gray-200'}`}>
                  {leader.username} {isMe && '(You)'}
                </p>
                <p className="text-xs text-gray-400">Level {leader.level}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{leader.xp} XP</span>
              </div>
            </div>
          );
        })}
        {leaders.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Trophy size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No players yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}
