// ============================================================
// ProfilePage — all-time stats, achievements, avatar/username editor
// Achievement keys are kept in sync with backend/routes/activities.js
// ============================================================
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Star, Flame, CheckCircle, BookOpen, TrendingUp, User,
  Camera, Edit2, Check, X, History, Trophy,
} from 'lucide-react';

// ── Achievement definitions — MUST match backend checkAchievements keys ──
const ACHIEVEMENTS = [
  { key:'first_star',   title:'First Star!',        desc:'Complete your first activity',    group:'milestone' },
  { key:'xp_100',       title:'Century Club',        desc:'Earn 100 XP',                    group:'xp'        },
  { key:'xp_500',       title:'XP Legend',           desc:'Earn 500 XP',                    group:'xp'        },
  { key:'xp_1000',      title:'XP Master',           desc:'Earn 1000 XP',                   group:'xp'        },
  { key:'level_3',      title:'Rising Reader',       desc:'Reach Level 3',                  group:'level'     },
  { key:'level_5',      title:'Word Wizard',         desc:'Reach Level 5',                  group:'level'     },
  { key:'level_10',     title:'Reading Champion',    desc:'Reach Level 10',                 group:'level'     },
  { key:'level_20',     title:'Scholar',             desc:'Reach Level 20',                 group:'level'     },
  { key:'streak_3',     title:'Consistent!',         desc:'3-day reading streak',           group:'streak'    },
  { key:'five_streak',  title:'On Fire!',            desc:'5-day reading streak',           group:'streak'    },
  { key:'streak_7',     title:'Weekly Warrior',      desc:'7-day reading streak',           group:'streak'    },
  { key:'ten_streak',   title:'Unstoppable',         desc:'10-day reading streak',          group:'streak'    },
  { key:'complete_5',   title:'Getting Started',     desc:'Complete 5 activities',          group:'progress'  },
  { key:'complete_10',  title:'On a Roll',           desc:'Complete 10 activities',         group:'progress'  },
  { key:'complete_25',  title:'Dedicated Learner',   desc:'Complete 25 activities',         group:'progress'  },
  { key:'completionist',title:'Completionist',       desc:'Complete all activities',        group:'progress'  },
  { key:'perfect_3',    title:'Perfectionist',       desc:'Score 100% on 3 activities',    group:'skill'     },
];

const ACH_KNOWN_KEYS = new Set(ACHIEVEMENTS.map(a => a.key));

const GROUP_ICONS = {
  milestone: Star,
  xp:        TrendingUp,
  level:     Trophy,
  streak:    Flame,
  progress:  BookOpen,
  skill:     CheckCircle,
};

// ── Avatar display ────────────────────────────────────────────
function AvatarDisplay({ avatar, username, size = 80 }) {
  const isImage = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  if (isImage) {
    return (
      <img src={avatar} alt="avatar"
        className="rounded-2xl object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={e => { e.currentTarget.style.display='none'; }} />
    );
  }
  const isEmoji = avatar && /\p{Emoji_Presentation}/u.test(avatar);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-coral to-sunny flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}>
      {isEmoji
        ? <span style={{ fontSize: size * 0.45 }}>{avatar}</span>
        : <span className="font-bold text-white" style={{ fontSize: size * 0.38 }}>
            {username?.[0]?.toUpperCase() || '?'}
          </span>}
    </div>
  );
}

// ── Avatar picker modal ───────────────────────────────────────
const EMOJI_AVATARS = ['⭐','🦁','🐸','🐶','🦊','🐱','🦄','🐢','🦋','🚀','🌈','🎯','🐧','🦕','🐬','🦉'];

function AvatarModal({ current, onClose, onSave }) {
  const [selected,  setSelected]  = useState(current);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const S = 512;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = S;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(S / img.width, S / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        setSelected(canvas.toDataURL('image/jpeg', 0.82));
        setUploading(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl p-6"
        style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-gray-800 dark:text-gray-100">Choose Avatar</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="flex justify-center mb-4">
          <AvatarDisplay avatar={selected} username="?" size={72} />
        </div>
        <div className="grid grid-cols-8 gap-2 mb-4">
          {EMOJI_AVATARS.map(e => (
            <button key={e} onClick={() => setSelected(e)}
              className={`text-2xl rounded-xl p-1 transition-all hover:scale-110
                ${selected === e ? 'ring-2 ring-sky bg-sky/10 scale-110' : ''}`}>
              {e}
            </button>
          ))}
        </div>
        <button onClick={() => fileRef.current.click()}
          className="w-full py-2.5 rounded-2xl border-2 border-dashed text-sm font-semibold
                     text-gray-500 hover:border-sky hover:text-sky transition-colors mb-4
                     flex items-center justify-center gap-2"
          style={{ borderColor:'var(--border-color)' }}>
          <Camera size={16} /> {uploading ? 'Processing…' : 'Upload a Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border text-sm font-semibold
                       text-gray-600 dark:text-gray-300"
            style={{ borderColor:'var(--border-color)' }}>
            Cancel
          </button>
          <button onClick={() => onSave(selected)}
            className="flex-1 py-2.5 rounded-2xl bg-sky text-white text-sm font-bold hover:opacity-90 transition-opacity">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── All Achievements modal ────────────────────────────────────
function AllAchievementsModal({ unlocked, onClose }) {
  const groups = ['milestone','xp','level','streak','progress','skill'];
  const groupLabels = { milestone:'Milestones', xp:'XP', level:'Levels', streak:'Streaks', progress:'Progress', skill:'Skills' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.65)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-3xl flex flex-col max-h-[85vh] overflow-hidden"
        style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b flex-shrink-0"
          style={{ borderColor:'var(--border-color)' }}>
          <div>
            <h3 className="font-display text-xl text-gray-800 dark:text-gray-100">All Achievements</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {unlocked.size} of {ACHIEVEMENTS.length} earned
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {groups.map(g => {
            const items = ACHIEVEMENTS.filter(a => a.group === g);
            const GroupIcon = GROUP_ICONS[g] || Star;
            return (
              <div key={g}>
                <div className="flex items-center gap-2 mb-2">
                  <GroupIcon size={13} className="text-gray-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{groupLabels[g]}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map(ach => {
                    const earned = unlocked.has(ach.key);
                    const GroupIconEl = GROUP_ICONS[ach.group] || Star;
                    return (
                      <div key={ach.key}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all
                          ${earned
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-100 dark:border-gray-700/50 opacity-45 grayscale'
                          }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                          ${earned ? 'bg-amber-100 dark:bg-amber-800/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <GroupIconEl size={18} className={earned ? 'text-amber-500' : 'text-gray-400'} />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-xs leading-tight
                            ${earned ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {ach.title}
                          </p>
                          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{ach.desc}</p>
                          {earned && (
                            <span className="inline-block mt-1 text-[9px] bg-amber-200 dark:bg-amber-800/50
                                             text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                              Earned
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [stats,          setStats]          = useState(null);
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [showAvatarModal,setShowAvatarModal] = useState(false);
  const [savingAvatar,   setSavingAvatar]   = useState(false);
  const [editUsername,   setEditUsername]   = useState(false);
  const [newUsername,    setNewUsername]    = useState(user?.username || '');
  const [usernameErr,    setUsernameErr]    = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [showAllAch,     setShowAllAch]     = useState(false);

  // ── Fetch all-time stats ──────────────────────────────────────
  // Fires on login (user?.id changes null→id) and after every game (user?.xp changes)
  useEffect(() => {
    if (!user?.id) { setStats(null); setStatsLoading(false); return; }
    setStatsLoading(true);
    api.get('/progress/stats')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [user?.id, user?.xp, user?.streak]);

  const handleSaveAvatar = async (avatar) => {
    setSavingAvatar(true);
    setShowAvatarModal(false);
    try {
      await api.put('/users/avatar', { avatar });
      await refreshUser();
    } catch (_) {}
    setSavingAvatar(false);
  };

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (trimmed.length < 3) { setUsernameErr('At least 3 characters'); return; }
    setSavingUsername(true);
    setUsernameErr('');
    try {
      await api.put('/users/username', { username: trimmed });
      await refreshUser();
      setEditUsername(false);
    } catch (err) {
      setUsernameErr(err.message || 'Could not update username');
    }
    setSavingUsername(false);
  };

  // ── Derived values ────────────────────────────────────────────
  // Filter unlocked to only keys that exist in our ACHIEVEMENTS list.
  // This prevents old/stale DB keys from inflating the count.
  const rawUnlocked = new Set(user?.achievements || []);
  const unlocked    = new Set([...rawUnlocked].filter(k => ACH_KNOWN_KEYS.has(k)));
  const earnedCount = unlocked.size;

  const xpForLevel = 50;
  const currentXP  = (user?.xp || 0) % xpForLevel;
  const xpPct      = Math.min(100, Math.round((currentXP / xpForLevel) * 100));

  const allPlayed    = parseInt(stats?.stats?.total_activities ?? 0, 10);
  const allCompleted = parseInt(stats?.stats?.completed_count  ?? 0, 10);
  const allAvg       = Math.round(parseFloat(stats?.stats?.avg_score ?? 0));

  // Show up to 8 achievements preview — earned ones first
  const sortedAch  = [...ACHIEVEMENTS].sort(
    (a, b) => (unlocked.has(b.key) ? 1 : 0) - (unlocked.has(a.key) ? 1 : 0)
  );
  const previewAch = sortedAch.slice(0, 8);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <h1 className="font-display text-2xl sm:text-3xl text-gray-800 dark:text-gray-100">My Profile</h1>

      {/* ── Profile card ─────────────────────────────────── */}
      <div className="rounded-2xl p-4 sm:p-5 border"
        style={{ background:'var(--bg-card)', borderColor:'var(--border-color)' }}>
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <AvatarDisplay avatar={user?.avatar} username={user?.username} size={64} />
            <button onClick={() => setShowAvatarModal(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky text-white
                         flex items-center justify-center shadow-md hover:opacity-90 transition-opacity">
              <Camera size={13} />
            </button>
            {savingAvatar && (
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Name / level */}
          <div className="flex-1 min-w-0">
            {editUsername ? (
              <div className="flex items-center gap-2">
                <input value={newUsername}
                  onChange={e => { setNewUsername(e.target.value); setUsernameErr(''); }}
                  className="flex-1 px-3 py-1.5 rounded-xl border-2 border-sky text-sm font-bold
                             outline-none min-w-0 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  maxLength={30} autoFocus />
                <button onClick={handleSaveUsername} disabled={savingUsername}
                  className="w-8 h-8 rounded-xl bg-sky text-white flex items-center justify-center flex-shrink-0">
                  {savingUsername
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={14} />}
                </button>
                <button onClick={() => { setEditUsername(false); setUsernameErr(''); setNewUsername(user?.username || ''); }}
                  className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <X size={14} className="text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl text-gray-800 dark:text-gray-100 truncate">{user?.username}</h2>
                <button onClick={() => { setEditUsername(true); setNewUsername(user?.username || ''); }}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                  <Edit2 size={13} className="text-gray-400" />
                </button>
              </div>
            )}
            {usernameErr && <p className="text-xs text-rose-500 mt-0.5">{usernameErr}</p>}
            <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            <p className="text-xs text-gray-400">
              Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month:'long', year:'numeric' })}
            </p>
          </div>

          {/* Level badge */}
          <div className="text-center flex-shrink-0">
            <div className="font-display text-3xl text-sky">{user?.level || 1}</div>
            <div className="text-xs font-bold text-gray-400">LEVEL</div>
            <div className="flex items-center gap-1 mt-1 bg-amber-100 dark:bg-amber-900/30 rounded-full px-2 py-0.5">
              <Star size={10} className="text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{user?.xp || 0} XP</span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>To Level {(user?.level || 1) + 1}</span>
            <span>{currentXP}/{xpForLevel} XP</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-gradient-to-r from-sky to-emerald-400 transition-all duration-700"
              style={{ width:`${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── All-Time Stats ────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-lg text-gray-800 dark:text-gray-100">Stats</h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                           bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <History size={11} /> All Time
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { Icon:BookOpen,    cls:'text-sky',          label:'Played',     val: statsLoading ? '…' : allPlayed,       bg:'bg-sky/10'                              },
            { Icon:CheckCircle, cls:'text-emerald-500',  label:'Completed',  val: statsLoading ? '…' : allCompleted,    bg:'bg-emerald-50 dark:bg-emerald-900/20'   },
            { Icon:TrendingUp,  cls:'text-indigo-500',   label:'Avg Score',  val: statsLoading ? '…' : `${allAvg}%`,   bg:'bg-indigo-50 dark:bg-indigo-900/20'     },
            { Icon:Flame,       cls:'text-orange-400',   label:'Day Streak', val:`${user?.streak || 0}d`,               bg:'bg-orange-50 dark:bg-orange-900/20'     },
          ].map(({ Icon, cls, label, val, bg }) => (
            <div key={label} className="rounded-2xl p-4 border transition-opacity"
              style={{ background:'var(--bg-card)', borderColor:'var(--border-color)',
                       opacity: statsLoading && label !== 'Day Streak' ? 0.6 : 1 }}>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
                <Icon size={17} className={cls} />
              </div>
              <div className="font-display text-xl text-gray-800 dark:text-gray-100">{val}</div>
              <div className="text-xs text-gray-400 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Achievements ──────────────────────────────────── */}
      <div className="rounded-2xl p-4 sm:p-5 border"
        style={{ background:'var(--bg-card)', borderColor:'var(--border-color)' }}>

        {/* Section header — See All button at top right */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-gray-800 dark:text-gray-100">Achievements</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {earnedCount} of {ACHIEVEMENTS.length} earned
            </p>
          </div>
          <button onClick={() => setShowAllAch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                       bg-sky/10 text-sky hover:bg-sky/20 transition-colors">
            <Trophy size={12} /> See All
          </button>
        </div>

        {/* 8-item preview grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {previewAch.map(ach => {
            const earned   = unlocked.has(ach.key);
            const AchIcon  = GROUP_ICONS[ach.group] || Star;
            return (
              <div key={ach.key}
                className={`rounded-2xl p-3 text-center border-2 transition-all
                  ${earned
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
                    : 'border-gray-100 dark:border-gray-700 opacity-40 grayscale'
                  }`}>
                <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center
                  ${earned ? 'bg-amber-100 dark:bg-amber-800/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <AchIcon size={20} className={earned ? 'text-amber-500' : 'text-gray-400'} />
                </div>
                <p className="font-bold text-xs text-gray-700 dark:text-gray-200 leading-tight">{ach.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{ach.desc}</p>
                {earned && (
                  <span className="inline-block mt-1.5 text-[10px] bg-amber-200 dark:bg-amber-800/50
                                   text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                    Earned!
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showAvatarModal && (
        <AvatarModal
          current={user?.avatar || ''}
          onClose={() => setShowAvatarModal(false)}
          onSave={handleSaveAvatar}
        />
      )}
      {showAllAch && (
        <AllAchievementsModal unlocked={unlocked} onClose={() => setShowAllAch(false)} />
      )}
    </div>
  );
}
