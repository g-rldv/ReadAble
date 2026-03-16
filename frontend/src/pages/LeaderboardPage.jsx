// ============================================================
// LeaderboardPage — top users + clickable profile modal
// ============================================================
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Trophy, Star, User, X, BookOpen,
  CheckCircle, TrendingUp, Flame,
} from 'lucide-react';

// ── Avatar renderer ───────────────────────────────────────────
function AvatarDisplay({ avatar, username, size = 36 }) {
  const isImage = !!avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  if (isImage) {
    return (
      <img src={avatar} alt="avatar" className="w-full h-full object-cover"
        onError={e => { e.currentTarget.style.display = 'none'; }} />
    );
  }
  const isEmoji = avatar && /\p{Emoji_Presentation}/u.test(avatar);
  if (isEmoji) {
    const textClass = size >= 56 ? 'text-4xl' : size >= 36 ? 'text-2xl' : 'text-lg';
    return <span className={textClass}>{avatar}</span>;
  }
  // Initial letter fallback
  const initClass = size >= 56 ? 'text-2xl' : size >= 36 ? 'text-base' : 'text-sm';
  return (
    <span className={`font-bold text-sky/60 ${initClass}`}>
      {username?.[0]?.toUpperCase() || <User size={Math.round(size * 0.5)} className="text-sky/40" />}
    </span>
  );
}

// ── Rank badge ────────────────────────────────────────────────
function RankBadge({ rank }) {
  const cfg = {
    1: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    2: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    3: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs
                     ${cfg[rank] || 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
      {rank}
    </div>
  );
}

// ── User Profile Modal ────────────────────────────────────────
function UserProfileModal({ username, viewerUsername, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/users/${encodeURIComponent(username)}/stats`)
      .then(r => setData(r.data))
      .catch(err => setError(err.message || 'Could not load profile'))
      .finally(() => setLoading(false));
  }, [username]);

  const isMe = username === viewerUsername;

  const allPlayed    = data ? parseInt(data.stats?.total_activities ?? 0, 10) : 0;
  const allCompleted = data ? parseInt(data.stats?.completed_count  ?? 0, 10) : 0;
  const allAvg       = data ? Math.round(parseFloat(data.stats?.avg_score ?? 0)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-rise-up"
        style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="font-display text-lg text-gray-800 dark:text-gray-100">Player Profile</span>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="px-5 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center py-8 text-sm text-rose-500">{error}</p>
          ) : (
            <>
              {/* Avatar + name */}
              <div className="flex flex-col items-center mb-5 pt-2">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky/20 to-indigo-100
                                dark:from-sky/10 dark:to-indigo-900/30 overflow-hidden
                                flex items-center justify-center mb-3 ring-2 ring-white/20 shadow-lg">
                  <AvatarDisplay avatar={data.user.avatar} username={data.user.username} size={80} />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl text-gray-800 dark:text-gray-100">{data.user.username}</h2>
                  {isMe && <span className="text-xs font-bold text-sky bg-sky/10 px-2 py-0.5 rounded-full">You</span>}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-sm font-bold text-sky">Level {data.user.level || 1}</span>
                  <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 rounded-full px-2.5 py-0.5">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{data.user.xp || 0} XP</span>
                  </div>
                  {(data.user.streak || 0) > 0 && (
                    <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 rounded-full px-2.5 py-0.5">
                      <Flame size={12} className="text-orange-500" />
                      <span className="text-xs font-bold text-orange-700 dark:text-orange-300">{data.user.streak}d</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { Icon:BookOpen,    cls:'text-sky',        label:'Played',    value:allPlayed,        bg:'bg-sky/10'               },
                  { Icon:CheckCircle, cls:'text-emerald-500',label:'Completed', value:allCompleted,     bg:'bg-emerald-50 dark:bg-emerald-900/20'},
                  { Icon:TrendingUp,  cls:'text-indigo-500', label:'Avg Score', value:`${allAvg}%`,    bg:'bg-indigo-50 dark:bg-indigo-900/20'},
                ].map(({ Icon, cls, label, value, bg }) => (
                  <div key={label} className="rounded-2xl p-3 text-center border"
                    style={{ borderColor:'var(--border-color)', background:'var(--bg-primary)' }}>
                    <div className={`w-7 h-7 rounded-xl ${bg} flex items-center justify-center mx-auto mb-1.5`}>
                      <Icon size={15} className={cls} />
                    </div>
                    <div className="font-display text-lg text-gray-800 dark:text-gray-100">{value}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{label}</div>
                  </div>
                ))}
              </div>

              {/* Achievement count */}
              {(data.user.achievements?.length > 0) && (
                <div className="flex items-center gap-2 p-3 rounded-2xl"
                  style={{ background:'var(--bg-primary)', border:'1px solid var(--border-color)' }}>
                  <Trophy size={16} className="text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {data.user.achievements.length} achievement{data.user.achievements.length !== 1 ? 's' : ''} earned
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Podium column ─────────────────────────────────────────────
const PODIUM_META = [
  { rank:2, height:'py-5', bgFrom:'from-slate-300', bgTo:'to-slate-400', dark:'dark:from-slate-500 dark:to-slate-600', labelColor:'text-slate-700 dark:text-slate-100', label:'2nd' },
  { rank:1, height:'py-7', bgFrom:'from-amber-300', bgTo:'to-amber-500', dark:'',                                       labelColor:'text-amber-900',                       label:'1st' },
  { rank:3, height:'py-3', bgFrom:'from-orange-300',bgTo:'to-orange-400',dark:'',                                       labelColor:'text-orange-900',                      label:'3rd' },
];

// ── Page ──────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user }          = useAuth();
  const [leaders, setLeaders]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected,setSelected]      = useState(null); // username to show in modal

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
        <p className="text-gray-500 text-sm">Top readers — click a player to see their profile!</p>
      </div>

      {/* ── Podium ─────────────────────────────────────── */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8 px-2">
          {[leaders[1], leaders[0], leaders[2]].map((leader, colIdx) => {
            const meta = PODIUM_META[colIdx];
            const avatarSize = colIdx === 1 ? 56 : 44;
            return (
              <button key={leader.username}
                onClick={() => setSelected(leader.username)}
                className="flex-1 flex flex-col items-center hover:scale-[1.02] transition-transform">
                <div style={{ width:avatarSize, height:avatarSize }}
                  className="mb-2 rounded-2xl bg-gradient-to-br from-sky/20 to-indigo-100
                             dark:from-sky/10 dark:to-indigo-900/30 overflow-hidden
                             flex items-center justify-center ring-2 ring-white/30 flex-shrink-0">
                  <AvatarDisplay avatar={leader.avatar} username={leader.username} size={avatarSize} />
                </div>
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
              </button>
            );
          })}
        </div>
      )}

      {/* ── Full list ──────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border"
        style={{ background:'var(--bg-card)', borderColor:'var(--border-color)' }}>
        {leaders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Trophy size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No players yet. Be the first!</p>
          </div>
        ) : leaders.map((leader, idx) => {
          const isMe = leader.username === user?.username;
          return (
            <button key={leader.username}
              onClick={() => setSelected(leader.username)}
              className={`flex items-center gap-3 px-4 py-3 border-b w-full text-left
                          last:border-0 transition-colors cursor-pointer
                          border-gray-100 dark:border-gray-700/50
                          ${isMe
                            ? 'bg-sky/10 dark:bg-sky/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          }`}>
              <RankBadge rank={idx + 1} />
              <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden
                              bg-gradient-to-br from-sky/20 to-indigo-100
                              dark:from-sky/10 dark:to-indigo-900/30 flex items-center justify-center">
                <AvatarDisplay avatar={leader.avatar} username={leader.username} size={36} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${isMe ? 'text-sky' : 'text-gray-800 dark:text-gray-100'}`}>
                  {leader.username}
                  {isMe && <span className="ml-1 text-xs font-medium text-sky/70">(you)</span>}
                </p>
                <p className="text-xs text-gray-400">Level {leader.level}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{leader.xp} XP</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">Tap any player to view their profile</p>

      {selected && (
        <UserProfileModal
          username={selected}
          viewerUsername={user?.username}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
