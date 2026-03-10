// ============================================================
// ProfilePage — all-time stats, achievements, avatar/username editor
// ============================================================
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Star, Flame, CheckCircle, BookOpen, TrendingUp, User,
  Camera, Edit2, Check, X, ChevronDown, ChevronUp, History,
} from 'lucide-react';

// ── Achievement definitions ───────────────────────────────────
const ACHIEVEMENTS = [
  { key:'first_star',   title:'First Star!',        desc:'Completed first activity',        Icon: Star     },
  { key:'five_streak',  title:'On Fire!',            desc:'5-day streak',                    Icon: Flame    },
  { key:'level_5',      title:'Word Wizard',         desc:'Reached Level 5',                 Icon: Star     },
  { key:'level_10',     title:'Reading Champion',    desc:'Reached Level 10',                Icon: Star     },
  { key:'xp_100',       title:'Century Club',        desc:'Earned 100 XP',                   Icon: Star     },
  { key:'xp_500',       title:'XP Legend',           desc:'Earned 500 XP',                   Icon: Star     },
  { key:'perfect_3',    title:'Perfectionist',       desc:'3 perfect scores in a row',        Icon: Check    },
  { key:'night_owl',    title:'Night Owl',           desc:'Played 5 late-night sessions',     Icon: Star     },
  { key:'activities_5', title:'Getting Started',     desc:'Completed 5 activities',           Icon: BookOpen },
  { key:'activities_10',title:'Bookworm',            desc:'Completed 10 activities',          Icon: BookOpen },
  { key:'activities_25',title:'Reading Machine',     desc:'Completed 25 activities',          Icon: BookOpen },
  { key:'activities_50',title:'Legend',              desc:'Completed 50 activities',          Icon: Star     },
  { key:'xp_1000',      title:'XP Master',           desc:'Earned 1000 XP',                  Icon: Star     },
  { key:'level_3',      title:'Rising Reader',       desc:'Reached Level 3',                 Icon: TrendingUp},
  { key:'streak_3',     title:'Consistent!',         desc:'3-day streak',                    Icon: Flame    },
  { key:'streak_7',     title:'Weekly Warrior',      desc:'7-day streak',                    Icon: Flame    },
];

// ── Avatar display ────────────────────────────────────────────
function AvatarDisplay({ avatar, username, size = 80 }) {
  const isImage = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  const cls = `rounded-2xl object-cover flex-shrink-0`;
  if (isImage) return <img src={avatar} alt="avatar" className={cls} style={{ width: size, height: size }} />;
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

// ── Avatar/photo upload modal ─────────────────────────────────
const EMOJI_AVATARS = ['⭐','🦁','🐸','🐶','🦊','🐱','🦄','🐢','🦋','🚀','🌈','🎯','🐧','🦕','🐬','🦉'];

function AvatarModal({ current, onClose, onSave }) {
  const [selected, setSelected] = useState(current);
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
        const canvas = document.createElement('canvas');
        const S = 512;
        canvas.width = canvas.height = S;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(S / img.width, S / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setSelected(dataUrl);
        setUploading(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl p-6 animate-pop"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-gray-800 dark:text-gray-100">Choose Avatar</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {/* Current preview */}
        <div className="flex justify-center mb-4">
          <AvatarDisplay avatar={selected} username="?" size={72} />
        </div>
        {/* Emoji grid */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          {EMOJI_AVATARS.map(e => (
            <button key={e} onClick={() => setSelected(e)}
              className={`text-2xl rounded-xl p-1 transition-all hover:scale-110 ${selected === e ? 'ring-2 ring-sky bg-sky/10 scale-110' : ''}`}>
              {e}
            </button>
          ))}
        </div>
        {/* Photo upload */}
        <button onClick={() => fileRef.current.click()}
          className="w-full py-2.5 rounded-2xl border-2 border-dashed text-sm font-semibold
                     text-gray-500 dark:text-gray-400 hover:border-sky hover:text-sky transition-colors mb-4 flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--border-color)' }}>
          <Camera size={16} /> {uploading ? 'Processing…' : 'Upload a Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ borderColor: 'var(--border-color)' }}>Cancel</button>
          <button onClick={() => onSave(selected)}
            className="flex-1 py-2.5 rounded-2xl bg-sky text-white text-sm font-bold hover:bg-sky-dark transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser }  = useAuth();
  const [stats,         setStats]         = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [savingAvatar,  setSavingAvatar]  = useState(false);
  const [editUsername,  setEditUsername]  = useState(false);
  const [newUsername,   setNewUsername]   = useState(user?.username || '');
  const [usernameErr,   setUsernameErr]   = useState('');
  const [savingUsername,setSavingUsername]= useState(false);
  const [showAllAch,    setShowAllAch]    = useState(false);

  // ── Fetch all-time stats ──────────────────────────────────────
  // Deps: user?.id (fires on login/logout), user?.xp & streak (fires after playing games)
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

  const unlocked   = new Set(user?.achievements || []);
  const xpForLevel = 50;
  const currentXP  = (user?.xp || 0) % xpForLevel;
  const xpPct      = Math.min(100, Math.round((currentXP / xpForLevel) * 100));

  // Parsed all-time stats (PostgreSQL COUNT returns strings)
  const allPlayed    = parseInt(stats?.stats?.total_activities ?? 0, 10);
  const allCompleted = parseInt(stats?.stats?.completed_count  ?? 0, 10);
  const allAvg       = Math.round(parseFloat(stats?.stats?.avg_score ?? 0));

  const sortedAch  = [...ACHIEVEMENTS].sort(
    (a, b) => (unlocked.has(b.key) ? 1 : 0) - (unlocked.has(a.key) ? 1 : 0)
  );
  const displayAch = showAllAch ? sortedAch : sortedAch.slice(0, 8);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <h1 className="font-display text-3xl text-gray-800 dark:text-gray-100">My Profile</h1>

      {/* ── Profile card ─────────────────────────────────── */}
      <div className="rounded-2xl p-5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-4">
          {/* Avatar with edit button */}
          <div className="relative flex-shrink-0">
            <AvatarDisplay avatar={user?.avatar} username={user?.username} size={72} />
            <button onClick={() => setShowAvatarModal(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky text-white flex items-center justify-center shadow-md hover:bg-sky-dark transition-colors">
              <Camera size={13} />
            </button>
            {savingAvatar && (
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Name + level */}
          <div className="flex-1 min-w-0">
            {editUsername ? (
              <div className="flex items-center gap-2">
                <input
                  value={newUsername}
                  onChange={e => { setNewUsername(e.target.value); setUsernameErr(''); }}
                  className="flex-1 px-3 py-1.5 rounded-xl border-2 border-sky text-sm font-bold outline-none min-w-0
                             bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  maxLength={30}
                  autoFocus
                />
                <button onClick={handleSaveUsername} disabled={savingUsername}
                  className="w-8 h-8 rounded-xl bg-sky text-white flex items-center justify-center flex-shrink-0">
                  {savingUsername ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
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

        {/* XP progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>To Level {(user?.level || 1) + 1}</span>
            <span>{currentXP}/{xpForLevel} XP</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-gradient-to-r from-sky to-emerald-400 transition-all duration-700"
              style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── All-Time Stats ────────────────────────────────── */}
      <div>
        {/* Section header with "All Time" badge */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-lg text-gray-800 dark:text-gray-100">Stats</h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                           bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <History size={11} /> All Time
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { Icon: BookOpen,    iconCls: 'text-sky',        label: 'Played',     value: statsLoading ? '…' : allPlayed,        bg: 'bg-sky/10 dark:bg-sky/5'               },
            { Icon: CheckCircle, iconCls: 'text-emerald-500',label: 'Completed',  value: statsLoading ? '…' : allCompleted,     bg: 'bg-emerald-50 dark:bg-emerald-900/20'  },
            { Icon: TrendingUp,  iconCls: 'text-indigo-500', label: 'Avg Score',  value: statsLoading ? '…' : `${allAvg}%`,    bg: 'bg-indigo-50 dark:bg-indigo-900/20'    },
            { Icon: Flame,       iconCls: 'text-orange-400', label: 'Day Streak', value: `${user?.streak || 0}d`,               bg: 'bg-orange-50 dark:bg-orange-900/20'    },
          ].map(({ Icon, iconCls, label, value, bg }) => (
            <div key={label} className="rounded-2xl p-4 border transition-opacity"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', opacity: statsLoading && label !== 'Day Streak' ? 0.65 : 1 }}>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
                <Icon size={17} className={iconCls} />
              </div>
              <div className="font-display text-xl text-gray-800 dark:text-gray-100">{value}</div>
              <div className="text-xs text-gray-400 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Achievements ──────────────────────────────────── */}
      <div className="rounded-2xl p-5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-gray-800 dark:text-gray-100">Achievements</h3>
            <p className="text-xs text-gray-400 mt-0.5">{unlocked.size} of {ACHIEVEMENTS.length} earned</p>
          </div>
          <button onClick={() => setShowAllAch(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-sky hover:underline">
            {showAllAch ? <><ChevronUp size={13}/>Show less</> : <><ChevronDown size={13}/>Show all</>}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {displayAch.map(ach => {
            const earned = unlocked.has(ach.key);
            return (
              <div key={ach.key}
                className={`rounded-2xl p-3 text-center border-2 transition-all ${
                  earned
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
                    : 'border-gray-100 dark:border-gray-700 opacity-40 grayscale'
                }`}>
                <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center
                                bg-white dark:bg-gray-800 shadow-sm">
                  <ach.Icon size={20} className={earned ? 'text-amber-500' : 'text-gray-400'} />
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
    </div>
  );
}
