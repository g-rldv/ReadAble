// ============================================================
// ProfilePage — profile, avatar editor, stats, achievements
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Flame, CheckCircle, BookOpen, TrendingUp,
  Camera, X, Check, ChevronRight, Upload, Pencil,
} from 'lucide-react';

// ── Image helpers ─────────────────────────────────────────────
function isImageAvatar(avatar) {
  return !!avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
}

// Resize + compress any image file to ≤ 512×512 JPEG (~60–100 KB)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const MAX     = 512;
    const QUALITY = 0.82;
    const img     = new Image();
    const url     = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else        { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ── Avatar display ────────────────────────────────────────────
function AvatarDisplay({ avatar, size = 64 }) {
  if (isImageAvatar(avatar)) {
    return (
      <img src={avatar} alt="avatar" className="w-full h-full object-cover"
        onError={e => { e.currentTarget.style.display = 'none'; }} />
    );
  }
  const display   = (!avatar || avatar === 'star') ? '⭐' : avatar;
  const textClass = size >= 80 ? 'text-5xl' : size >= 48 ? 'text-2xl' : 'text-lg';
  return <span className={textClass}>{display}</span>;
}

// ── Achievement definitions (16) ──────────────────────────────
const ALL_ACHIEVEMENTS = [
  { key: 'first_star',    title: 'First Star',        icon: '⭐', desc: 'Complete your first activity',  condition: { type: 'activity_count', threshold: 1   } },
  { key: 'complete_5',    title: 'Getting Started',   icon: '✅', desc: 'Complete 5 activities',         condition: { type: 'activity_count', threshold: 5   } },
  { key: 'complete_10',   title: 'On a Roll',         icon: '🎯', desc: 'Complete 10 activities',        condition: { type: 'activity_count', threshold: 10  } },
  { key: 'complete_25',   title: 'Dedicated Learner', icon: '📚', desc: 'Complete 25 activities',        condition: { type: 'activity_count', threshold: 25  } },
  { key: 'completionist', title: 'Completionist',     icon: '🌈', desc: 'Complete all 48 activities',    condition: { type: 'activity_count', threshold: 48  } },
  { key: 'xp_100',        title: 'Century Club',      icon: '💯', desc: 'Earn 100 XP',                  condition: { type: 'xp',             threshold: 100  } },
  { key: 'xp_500',        title: 'XP Legend',         icon: '🌟', desc: 'Earn 500 XP',                  condition: { type: 'xp',             threshold: 500  } },
  { key: 'xp_1000',       title: 'XP Master',         icon: '🏅', desc: 'Earn 1,000 XP',               condition: { type: 'xp',             threshold: 1000 } },
  { key: 'level_5',       title: 'Word Wizard',       icon: '🧙', desc: 'Reach Level 5',               condition: { type: 'level',          threshold: 5    } },
  { key: 'level_10',      title: 'Reading Champion',  icon: '🏆', desc: 'Reach Level 10',              condition: { type: 'level',          threshold: 10   } },
  { key: 'level_20',      title: 'Scholar',           icon: '🎓', desc: 'Reach Level 20',              condition: { type: 'level',          threshold: 20   } },
  { key: 'five_streak',   title: 'On Fire',           icon: '🔥', desc: 'Reach a 5-day streak',        condition: { type: 'streak',         threshold: 5    } },
  { key: 'ten_streak',    title: 'Unstoppable',       icon: '⚡', desc: 'Reach a 10-day streak',       condition: { type: 'streak',         threshold: 10   } },
  { key: 'perfect_3',     title: 'Perfectionist',     icon: '💎', desc: '3 perfect scores in a row',   condition: { type: 'perfect_streak',  threshold: 3   } },
  { key: 'night_owl',     title: 'Night Owl',         icon: '🦉', desc: 'Play 5 sessions after 8 PM',  condition: { type: 'night_sessions',  threshold: 5   } },
  { key: 'early_bird',    title: 'Early Bird',        icon: '🌅', desc: 'Play 5 sessions before 9 AM', condition: { type: 'early_sessions',  threshold: 5   } },
];

function getProgress(condition, user, stats) {
  const { type, threshold } = condition;
  let current = 0;
  if (type === 'activity_count') current = parseInt(stats?.stats?.completed_count || 0);
  else if (type === 'xp')        current = user?.xp || 0;
  else if (type === 'level')     current = user?.level || 1;
  else if (type === 'streak')    current = user?.streak || 0;
  const clamped = Math.min(current, threshold);
  return { current: clamped, threshold, pct: Math.round((clamped / threshold) * 100) };
}

function AchievementCard({ ach, earned, user, stats }) {
  const prog = getProgress(ach.condition, user, stats);
  return (
    <div className={`rounded-xl border p-3 transition-all ${
      earned
        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 opacity-70'
    }`}>
      <div className="flex items-start gap-2.5">
        <span className={`text-2xl flex-shrink-0 ${!earned && 'grayscale opacity-60'}`}>{ach.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{ach.title}</p>
            {earned && <CheckCircle size={13} className="text-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ach.desc}</p>
          <div className="mt-2">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-400">{earned ? 'Completed' : `${prog.current} / ${prog.threshold}`}</span>
              {!earned && <span className="text-[10px] font-semibold text-gray-500">{prog.pct}%</span>}
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${earned ? 'bg-amber-400' : 'bg-sky'}`}
                style={{ width: `${earned ? 100 : prog.pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── All Achievements Modal ────────────────────────────────────
function AchievementsModal({ onClose, user, stats }) {
  const unlocked = new Set(user?.achievements || []);
  const earned   = ALL_ACHIEVEMENTS.filter(a => unlocked.has(a.key));
  const locked   = ALL_ACHIEVEMENTS.filter(a => !unlocked.has(a.key));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="font-display text-lg text-gray-800 dark:text-gray-100">All Achievements</h3>
            <p className="text-xs text-gray-400">{earned.length} of {ALL_ACHIEVEMENTS.length} earned</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {earned.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-500 mb-2">Earned ({earned.length})</p>
              <div className="space-y-2">
                {earned.map(a => <AchievementCard key={a.key} ach={a} earned user={user} stats={stats} />)}
              </div>
            </div>
          )}
          {locked.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">In Progress ({locked.length})</p>
              <div className="space-y-2">
                {locked.map(a => <AchievementCard key={a.key} ach={a} earned={false} user={user} stats={stats} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Avatar / Profile Edit Modal ───────────────────────────────
const EMOJI_AVATARS = [
  '⭐','🦁','🐸','🐶','🦊','🐱','🦄','🐢',
  '🦋','🚀','🌈','🎯','🐼','🦈','🌙','🔥',
];

function AvatarEditModal({ user, onClose, onSave }) {
  const currentAvatar = user?.avatar || '⭐';
  const [selectedEmoji,  setSelectedEmoji]  = useState(isImageAvatar(currentAvatar) ? '' : currentAvatar);
  const [previewImage,   setPreviewImage]   = useState(isImageAvatar(currentAvatar) ? currentAvatar : null);
  const [username,       setUsername]       = useState(user?.username || '');
  const [saving,         setSaving]         = useState(false);
  const [uploadError,    setUploadError]    = useState('');
  const [usernameError,  setUsernameError]  = useState('');
  const [compressing,    setCompressing]    = useState(false);
  const fileRef = useRef(null);

  const displayAvatar = previewImage || selectedEmoji || '⭐';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, GIF, WebP, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10 MB.');
      return;
    }

    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setPreviewImage(compressed);
      setSelectedEmoji('');
    } catch {
      setUploadError('Could not read this image. Please try another file.');
    } finally {
      setCompressing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleEmojiPick = (emoji) => {
    setSelectedEmoji(emoji);
    setPreviewImage(null);
    setUploadError('');
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmed = username.trim();
    if (trimmed.length < 3)  { setUsernameError('Username must be at least 3 characters.'); return; }
    if (trimmed.length > 30) { setUsernameError('Username must be 30 characters or less.'); return; }

    setSaving(true);
    setUploadError('');
    setUsernameError('');
    try {
      const avatarToSave = previewImage || selectedEmoji;
      if (avatarToSave && avatarToSave !== user?.avatar) {
        await api.put('/users/avatar', { avatar: avatarToSave });
      }
      if (trimmed !== user?.username) {
        await api.put('/users/username', { username: trimmed });
      }
      await onSave();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save. Please try again.';
      if (msg.toLowerCase().includes('username')) setUsernameError(msg);
      else setUploadError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-display text-lg text-gray-800 dark:text-gray-100">Edit Profile</h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar preview + upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky/20 to-indigo-100
                            dark:from-sky/10 dark:to-indigo-900/30 flex items-center justify-center
                            overflow-hidden shadow-md ring-2 ring-sky/20">
              <AvatarDisplay avatar={displayAvatar} size={80} />
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={compressing}
              className="flex items-center gap-1.5 text-xs font-semibold text-sky hover:text-sky/80 transition-colors disabled:opacity-50">
              {compressing
                ? <><span className="w-3 h-3 border-2 border-sky border-t-transparent rounded-full animate-spin inline-block" /> Processing…</>
                : <><Upload size={13} /> Upload photo</>}
            </button>
            <p className="text-[10px] text-gray-400">JPG · PNG · GIF · WebP · HEIC &nbsp;·&nbsp; max 10 MB</p>
            <input ref={fileRef} type="file"
              accept="image/*,image/heic,image/heif"
              className="hidden" onChange={handleFileChange} />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input value={username}
              onChange={e => { setUsername(e.target.value); setUsernameError(''); }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm
                          bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
                          outline-none transition-colors
                          ${usernameError ? 'border-rose-400' : 'border-gray-200 dark:border-gray-600 focus:border-sky'}`}
              placeholder="Enter username" maxLength={30} />
            {usernameError && <p className="text-xs text-rose-500 mt-1">{usernameError}</p>}
          </div>

          {/* Emoji picker */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Or choose an emoji
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_AVATARS.map(emoji => (
                <button key={emoji} onClick={() => handleEmojiPick(emoji)}
                  className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                    !previewImage && selectedEmoji === emoji
                      ? 'bg-sky/15 ring-2 ring-sky scale-110'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {uploadError && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
              {uploadError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         text-sm font-semibold text-gray-600 dark:text-gray-300
                         hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-sky text-white text-sm font-bold
                         hover:bg-sky/90 disabled:opacity-60 transition-colors
                         flex items-center justify-center gap-2">
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check size={15} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser }     = useAuth();
  const [stats,           setStats]           = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAllAch,      setShowAllAch]      = useState(false);

  useEffect(() => {
    api.get('/progress/stats').then(r => setStats(r.data)).catch(console.error);
  }, []);

  const unlocked   = new Set(user?.achievements || []);
  const xpForLevel = 50;
  const currentXP  = (user?.xp || 0) % xpForLevel;
  const xpPct      = Math.min(100, Math.round((currentXP / xpForLevel) * 100));

  const sortedAch  = [...ALL_ACHIEVEMENTS].sort((a, b) =>
    (unlocked.has(a.key) ? 0 : 1) - (unlocked.has(b.key) ? 0 : 1)
  );
  const previewAch = sortedAch.slice(0, 6);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">

      {/* ── Profile Card ─────────────────────────────── */}
      <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowAvatarModal(true)}
            className="relative flex-shrink-0 group" title="Edit avatar">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky/20 to-indigo-100
                            dark:from-sky/10 dark:to-indigo-900/30
                            flex items-center justify-center overflow-hidden shadow-sm">
              <AvatarDisplay avatar={user?.avatar} size={64} />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center
                            opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={18} className="text-white" />
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl text-gray-800 dark:text-gray-100 truncate">
                {user?.username}
              </h2>
              <button onClick={() => setShowAvatarModal(true)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                title="Edit username">
                <Pencil size={13} className="text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">
              Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="font-display text-2xl text-sky">Lv {user?.level || 1}</div>
            <div className="text-xs text-gray-400 font-semibold">{user?.xp || 0} XP total</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Progress to Level {(user?.level || 1) + 1}</span>
            <span>{currentXP} / {xpForLevel} XP</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky to-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Today's Stats ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BookOpen    size={18} className="text-sky"          />, label: 'Played Today',    value: stats?.stats?.today_played    || 0,           bg: 'bg-sky/10 dark:bg-sky/5'              },
          { icon: <CheckCircle size={18} className="text-emerald-500"  />, label: 'Completed Today', value: stats?.stats?.today_completed  || 0,           bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { icon: <TrendingUp  size={18} className="text-indigo-500"   />, label: "Today's Avg",     value: `${Math.round(stats?.stats?.today_avg_score || 0)}%`, bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { icon: <Flame       size={18} className="text-orange-400"   />, label: 'Day Streak',      value: `${user?.streak || 0}d`,                       bg: 'bg-orange-50 dark:bg-orange-900/20'  },
        ].map(({ icon, label, value, bg }) => (
          <div key={label} className="rounded-2xl p-4 border border-gray-200 dark:border-gray-700"
            style={{ background: 'var(--bg-card)' }}>
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>{icon}</div>
            <div className="font-display text-xl text-gray-800 dark:text-gray-100">{value}</div>
            <div className="text-xs text-gray-400 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Achievements ──────────────────────────────── */}
      <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-gray-800 dark:text-gray-100">Achievements</h3>
            <p className="text-xs text-gray-400 mt-0.5">{unlocked.size} of {ALL_ACHIEVEMENTS.length} earned</p>
          </div>
          <button onClick={() => setShowAllAch(true)}
            className="flex items-center gap-1 text-xs font-semibold text-sky hover:text-sky/80 transition-colors">
            See all <ChevronRight size={14} />
          </button>
        </div>
        {/* Grid — NO bottom "View all" button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {previewAch.map(ach => (
            <AchievementCard key={ach.key} ach={ach} earned={unlocked.has(ach.key)} user={user} stats={stats} />
          ))}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────── */}
      {showAvatarModal && (
        <AvatarEditModal user={user} onClose={() => setShowAvatarModal(false)} onSave={refreshUser} />
      )}
      {showAllAch && (
        <AchievementsModal onClose={() => setShowAllAch(false)} user={user} stats={stats} />
      )}
    </div>
  );
}
