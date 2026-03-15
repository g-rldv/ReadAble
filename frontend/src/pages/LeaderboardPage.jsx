// ============================================================
// LeaderboardPage — fully responsive top readers list
// ============================================================
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Trophy, Star, User, X, BookOpen, CheckCircle, TrendingUp, Flame } from 'lucide-react';

function AvatarDisplay({ avatar, username, size = 36 }) {
  const isImage = !!avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  if (isImage) return (
    <img src={avatar} alt="avatar" className="w-full h-full object-cover"
      onError={e => { e.currentTarget.style.display = 'none'; }}/>
  );
  const isEmoji = avatar && /\p{Emoji_Presentation}/u.test(avatar);
  if (isEmoji) {
    const s = size >= 56 ? 'text-3xl' : size >= 36 ? 'text-xl' : 'text-base';
    return <span className={s}>{avatar}</span>;
  }
  return (
    <span className={`font-bold text-sky/60 ${size >= 56 ? 'text-2xl' : 'text-sm'}`}>
      {username?.[0]?.toUpperCase() || '?'}
    </span>
  );
}

function RankBadge({ rank }) {
  const cfg = {
    1:'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    2:'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    3:'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };
  return (
    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0
                     font-bold text-xs ${cfg[rank] || 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
      {rank}
    </div>
  );
}

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

  const isMe         = username === viewerUsername;
  const allPlayed    = data ? parseInt(data.stats?.total_activities ?? 0, 10) : 0;
  const allCompleted = data ? parseInt(data.stats?.completed_count  ?? 0, 10) : 0;
  const allAvg       = data ? Math.round(parseFloat(data.stats?.avg_score ?? 0)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-rise-up"
        style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)' }}>

        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-gray-800 dark:text-gray-100">Player Profile</span>
            {isMe && (
              <span className="text-xs bg-sky/15 text-sky px-2 py-0.5 rounded-full font-bold">You</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-400"/>
          </button>
        </div>

        <div className="px-5 pb-6 modal-scroll max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : error ? (
            <p className="text-center text-sm text-rose-500 py-6">{error}</p>
          ) : data && (
            <>
              {/* Avatar + name */}
              <div className="flex flex-col items-center pb-4 border-b mb-4"
                style={{ borderColor:'var(--border-color)' }}>
                <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 flex items-center justify-center
                                bg-gradient-to-br from-sky/20 to-indigo-100 dark:from-sky/10 dark:to-indigo-900/30">
                  <AvatarDisplay avatar={data.user?.avatar} username={data.user?.username} size={64}/>
                </div>
                <h3 className="font-display text-xl text-gray-800 dark:text-gray-100">{data.user?.username}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">Level {data.user?.level || 1}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Star size={11} className="fill-current"/> {data.user?.xp || 0} XP
                  </span>
                  {(data.user?.streak > 0) && (
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-500">
                      <Flame size={11}/> {data.user.streak}d
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon:<BookOpen size={15} className="text-sky"/>,         label:'Played',    val:allPlayed    },
                  { icon:<CheckCircle size={15} className="text-emerald-500"/>, label:'Done',   val:allCompleted },
                  { icon:<TrendingUp size={15} className="text-indigo-500"/>, label:'Avg',     val:`${allAvg}%` },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="rounded-2xl p-3 text-center border"
                    style={{ background:'var(--bg-primary)', borderColor:'var(--border-color)' }}>
                    <div className="flex justify-center mb-1">{icon}</div>
                    <div className="font-display text-lg text-gray-800 dark:text-gray-100">{val}</div>
                    <div className="text-[10px] text-gray-400">{label}</div>
                  </div>
                ))}
              </div>

              {/* Achievements count */}
              {data.user?.achievements?.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                  style={{ background:'var(--bg-primary)', border:'1px solid var(--border-color)' }}>
                  <Trophy size={15} className="text-amber-500 flex-shrink-0"/>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong className="font-bold">{data.user.achievements.length}</strong> achievement{data.user.achievements.length !== 1 ? 's' : ''} earned
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

const PODIUM_META = [
  { rank:2, height:'h-20', bg:'from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600', text:'text-slate-800 dark:text-slate-100', label:'2nd' },
  { rank:1, height:'h-28', bg:'from-amber-300 to-amber-500',                                        text:'text-amber-900',                    label:'1st' },
  { rank:3, height:'h-14', bg:'from-orange-300 to-orange-400',                                      text:'text-orange-900',                   label:'3rd' },
];

export default function LeaderboardPage() {
  const { user }                    = useAuth();
  const [leaders,  setLeaders]      = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [selected, setSelected]     = useState(null);

  useEffect(() => {
    api.get('/users/leaderboard')
      .then(r => setLeaders(r.data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-5 sm:mb-7 text-center sm:text-left">
        <h1 className="font-display text-2xl sm:text-4xl text-gray-800 dark:text-gray-100">Leaderboard</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Tap any player to see their profile</p>
      </div>

      {/* Podium */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-2 sm:gap-3 mb-6 px-2">
          {[leaders[1], leaders[0], leaders[2]].map((leader, i) => {
            const m = PODIUM_META[i];
            const sz = i === 1 ? 52 : 40;
            return (
              <button key={leader.username} onClick={() => setSelected(leader.username)}
                className="flex-1 flex flex-col items-center hover:scale-[1.03] transition-transform active:scale-[0.97]">
                <div style={{ width:sz, height:sz }}
                  className="mb-1.5 rounded-xl bg-gradient-to-br from-sky/20 to-indigo-100
                             dark:from-sky/10 dark:to-indigo-900/30 overflow-hidden
                             flex items-center justify-center ring-2 ring-white/30">
                  <AvatarDisplay avatar={leader.avatar} username={leader.username} size={sz}/>
                </div>
                <div className={`w-full rounded-t-xl text-center ${m.height} bg-gradient-to-b ${m.bg} flex flex-col items-center justify-center gap-0.5 px-1`}>
                  <p className={`font-display text-[11px] sm:text-xs ${m.text}`}>{m.label}</p>
                  <p className={`font-bold text-[10px] sm:text-xs ${m.text} truncate w-full text-center px-1`}>{leader.username}</p>
                  <div className="flex items-center gap-0.5">
                    <Star size={9} className={`${m.text} fill-current opacity-80`}/>
                    <span className={`text-[9px] sm:text-[10px] font-bold ${m.text}`}>{leader.xp}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="rounded-2xl overflow-hidden border"
        style={{ background:'var(--bg-card)', borderColor:'var(--border-color)' }}>
        {leaders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Trophy size={36} className="mx-auto mb-3 opacity-30"/>
            <p className="font-semibold text-sm">No players yet — be the first!</p>
          </div>
        ) : leaders.map((leader, idx) => {
          const isMe = leader.username === user?.username;
          return (
            <button key={leader.username} onClick={() => setSelected(leader.username)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-3 border-b w-full text-left
                          last:border-0 transition-colors
                          border-gray-100 dark:border-gray-700/50
                          ${isMe ? 'bg-sky/8 dark:bg-sky/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
              <RankBadge rank={idx + 1}/>
              <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-xl overflow-hidden
                              bg-gradient-to-br from-sky/20 to-indigo-100
                              dark:from-sky/10 dark:to-indigo-900/30 flex items-center justify-center">
                <AvatarDisplay avatar={leader.avatar} username={leader.username} size={36}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${isMe ? 'text-sky' : 'text-gray-800 dark:text-gray-100'}`}>
                  {leader.username}
                  {isMe && <span className="ml-1 text-xs font-normal text-sky/70">(you)</span>}
                </p>
                <p className="text-xs text-gray-400">Level {leader.level}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star size={12} className="text-amber-500 fill-amber-500"/>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{leader.xp}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <UserProfileModal username={selected} viewerUsername={user?.username} onClose={() => setSelected(null)}/>
      )}
    </div>
  );
}
