// ============================================================
// LeaderboardPage — top users by XP (no emoji medals)
// ============================================================
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Trophy, Star, User } from 'lucide-react';

// ── Avatar renderer (emoji, uploaded image, or User icon) ─────
function AvatarDisplay({ avatar, size = 36 }) {
  const isImage = !!avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  if (isImage) {
    return (
      <img src={avatar} alt="avatar"
        className="w-full h-full object-cover"
        onError={e => { e.currentTarget.style.display = 'none'; }} />
    );
  }
  // Emoji (short string that isn't 'star')
  if (avatar && avatar !== 'star' && avatar.length <= 4) {
    const textClass = size >= 56 ? 'text-4xl' : size >= 36 ? 'text-2xl' : 'text-lg';
    return <span className={textClass}>{avatar}</span>;
  }
  // Default: person icon
  return <User size={Math.round(size * 0.5)} className="text-sky/50" />;
}

// ── Podium position badge ─────────────────────────────────────
const PODIUM_META = [
  { rank: 2, height: 'py-5',  bgFrom: 'from-slate-300', bgTo: 'to-slate-400', dark: 'dark:from-slate-500 dark:to-slate-600', label: '2nd', labelColor: 'text-slate-700 dark:text-slate-100' },
  { rank: 1, height: 'py-7',  bgFrom: 'from-amber-300', bgTo: 'to-amber-500', dark: '',                                       label: '1st', labelColor: 'text-amber-900'                       },
  { rank: 3, height: 'py-3',  bgFrom: 'from-orange-300',bgTo: 'to-orange-400',dark: '',                                       label: '3rd', labelColor: 'text-orange-900'                      },
];

// ── Rank circle for list rows ─────────────────────────────────
function RankBadge({ rank }) {
  if (rank === 1) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">1</div>
  );
  if (rank === 2) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">2</div>
  );
  if (rank === 3) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">3</div>
  );
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{rank}</div>
  );
}

export default function LeaderboardPage() {
  const { user }   = useAuth();
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
          {[leaders[1], leaders[0], leaders[2]].map((leader, colIdx) => {
            const meta = PODIUM_META[colIdx];
            const avatarSize = colIdx === 1 ? 56 : 44;
            return (
              <div key={leader.username} className="flex-1 flex flex-col items-center">
                {/* Avatar */}
                <div
                  style={{ width: avatarSize, height: avatarSize }}
                  className="mb-2 rounded-2xl bg-gradient-to-br from-sky/20 to-indigo-100
                             dark:from-sky/10 dark:to-indigo-900/30 overflow-hidden
                             flex items-center justify-center ring-2 ring-white/30 flex-shrink-0">
                  <AvatarDisplay avatar={leader.avatar} size={avatarSize} />
                </div>
                {/* Podium block */}
                <div className={`w-full rounded-t-2xl text-center ${meta.height} shadow-lg
                                 bg-gradient-to-b ${meta.bgFrom} ${meta.bgTo} ${meta.dark}`}>
                  <p className={`font-bold text-[11px] ${meta.labelColor} font-display`}>{meta.label}</p>
                  <p className={`font-bold text-xs ${meta.labelColor} truncate px-2 mt-0.5`}>{leader.username}</p>
                  <p className={`text-[10px] ${meta.labelColor} opacity-70`}>Lv {leader.level}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    <Star size={10} className={`${meta.labelColor} fill-current opacity-80`} />
                    <span className={`text-[10px] font-bold ${meta.labelColor}`}>{leader.xp} XP</span>
                  </div>
                </div>
              </div>
            );
          })}
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
          return (
            <div key={leader.username}
              className={`flex items-center gap-3 px-4 py-3 border-b
                          border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors
                          ${isMe ? 'bg-sky/10 dark:bg-sky/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
              <RankBadge rank={idx + 1} />
              {/* Avatar */}
              <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden
                              bg-gradient-to-br from-sky/20 to-indigo-100
                              dark:from-sky/10 dark:to-indigo-900/30 flex items-center justify-center">
                <AvatarDisplay avatar={leader.avatar} size={36} />
              </div>
              {/* Name + level */}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${isMe ? 'text-sky' : 'text-gray-800 dark:text-gray-100'}`}>
                  {leader.username}
                  {isMe && <span className="ml-1 text-xs font-medium text-sky/70">(you)</span>}
                </p>
                <p className="text-xs text-gray-400">Level {leader.level}</p>
              </div>
              {/* XP */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{leader.xp} XP</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
