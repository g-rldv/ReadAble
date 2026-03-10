// ============================================================
// ProfilePage — profile, avatar editor, all-time stats, achievements
// ============================================================
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Flame, CheckCircle, BookOpen, TrendingUp,
  Camera, X, Check, ChevronRight, Upload, Pencil, User,
  Star, CheckSquare, Target, Award, Zap, Crown, Wand2,
  Trophy, GraduationCap, Sparkles, Moon, Sun,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Achievement icon map — Lucide icons only, no emoji
// ─────────────────────────────────────────────────────────────
const ACH_ICON = {
  first_star:    { Icon: Star,           color: 'text-amber-500',   bg: 'bg-amber-100 dark:bg-amber-900/30'   },
  complete_5:    { Icon: CheckSquare,    color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  complete_10:   { Icon: Target,         color: 'text-sky',         bg: 'bg-sky/10'                            },
  complete_25:   { Icon: BookOpen,       color: 'text-indigo-500',  bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  completionist: { Icon: Award,          color: 'text-purple-500',  bg: 'bg-purple-100 dark:bg-purple-900/30' },
  xp_100:        { Icon: Zap,            color: 'text-yellow-500',  bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  xp_500:        { Icon: TrendingUp,     color: 'text-orange-500',  bg: 'bg-orange-100 dark:bg-orange-900/30' },
  xp_1000:       { Icon: Crown,          color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/30'   },
  level_5:       { Icon: Wand2,          color: 'text-violet-500',  bg: 'bg-violet-100 dark:bg-violet-900/30' },
  level_10:      { Icon: Trophy,         color: 'text-yellow-600',  bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  level_20:      { Icon: GraduationCap,  color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30'     },
  five_streak:   { Icon: Flame,          color: 'text-orange-500',  bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ten_streak:    { Icon: Zap,            color: 'text-red-500',     bg: 'bg-red-100 dark:bg-red-900/30'       },
  perfect_3:     { Icon: Sparkles,       color: 'text-blue-500',    bg: 'bg-blue-100 dark:bg-blue-900/30'     },
  night_owl:     { Icon: Moon,           color: 'text-indigo-400',  bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  early_bird:    { Icon: Sun,            color: 'text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/30'   },
};

function AchIcon({ achKey, size = 22, earned = true }) {
  const entry = ACH_ICON[achKey] || { Icon: Star, color: 'text-gray-400', bg: 'bg-gray-100' };
  const { Icon, color, bg } = entry;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${!earned ? 'opacity-40 grayscale' : ''}`}>
      <Icon size={size} className={color} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Image helpers
// ─────────────────────────────────────────────────────────────
function isImageAvatar(avatar) {
  return !!avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const MAX = 512, QUALITY = 0.82;
    const tryCanvas = () => new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          let { width: w, height: h } = img;
          if (w > MAX || h > MAX) {
            if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
            else        { w = Math.round(w * MAX / h); h = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { rej(new Error('Canvas unavailable')); return; }
          ctx.drawImage(img, 0, 0, w, h);
          const data = canvas.toDataURL('image/jpeg', QUALITY);
          if (!data || data === 'data:,') { rej(new Error('Canvas export failed')); return; }
          res(data);
        } catch (e) { rej(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not decode image')); };
      img.src = url;
    });

    const tryRaw = () => new Promise((res, rej) => {
      if (file.size > 800_000) {
        rej(new Error('Image too large. Please use a JPG or PNG under 800 KB.'));
        return;
      }
      const reader = new FileReader();
      reader.onload  = () => res(reader.result);
      reader.onerror = () => rej(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });

    tryCanvas().then(resolve).catch(() => tryRaw().then(resolve).catch(reject));
  });
}

// ─────────────────────────────────────────────────────────────
// Avatar display
// ─────────────────────────────────────────────────────────────
function AvatarDisplay({ avatar, size = 64 }) {
  if (isImageAvatar(avatar)) {
    return <img src={avatar} alt="avatar" className="w-full h-full object-cover"
      onError={e => { e.currentTarget.style.display = 'none'; }} />;
  }
  // Emoji avatars from the picker (non-image strings that aren't 'star')
  if (avatar && avatar !== 'star' && avatar.length <= 4) {
    const textClass = size >= 80 ? 'text-5xl' : size >= 48 ? 'text-3xl' : 'text-xl';
    return <span className={textClass}>{avatar}</span>;
  }
  // Default: User icon
  return <User size={Math.round(size * 0.55)} className="text-sky/60" />;
}

// ─────────────────────────────────────────────────────────────
// Achievement definitions (16)
// ─────────────────────────────────────────────────────────────
const ALL_ACHIEVEMENTS = [
  { key: 'first_star',    title: 'First Star',        desc: 'Complete your first activity',  condition: { type: 'activity_count', threshold: 1   } },
  { key: 'complete_5',    title: 'Getting Started',   desc: 'Complete 5 activities',         condition: { type: 'activity_count', threshold: 5   } },
  { key: 'complete_10',   title: 'On a Roll',         desc: 'Complete 10 activities',        condition: { type: 'activity_count', threshold: 10  } },
  { key: 'complete_25',   title: 'Dedicated Learner', desc: 'Complete 25 activities',        condition: { type: 'activity_count', threshold: 25  } },
  { key: 'completionist', title: 'Completionist',     desc: 'Complete all 48 activities',    condition: { type: 'activity_count', threshold: 48  } },
  { key: 'xp_100',        title: 'Century Club',      desc: 'Earn 100 XP',                  condition: { type: 'xp',             threshold: 100  } },
  { key: 'xp_500',        title: 'XP Legend',         desc: 'Earn 500 XP',                  condition: { type: 'xp',             threshold: 500  } },
  { key: 'xp_1000',       title: 'XP Master',         desc: 'Earn 1,000 XP',                condition: { type: 'xp',             threshold: 1000 } },
  { key: 'level_5',       title: 'Word Wizard',       desc: 'Reach Level 5',                condition: { type: 'level',          threshold: 5    } },
  { key: 'level_10',      title: 'Reading Champion',  desc: 'Reach Level 10',               condition: { type: 'level',          threshold: 10   } },
  { key: 'level_20',      title: 'Scholar',           desc: 'Reach Level 20',               condition: { type: 'level',          threshold: 20   } },
  { key: 'five_streak',   title: 'On Fire',           desc: 'Reach a 5-day streak',         condition: { type: 'streak',         threshold: 5    } },
  { key: 'ten_streak',    title: 'Unstoppable',       desc: 'Reach a 10-day streak',        condition: { type: 'streak',         threshold: 10   } },
  { key: 'perfect_3',     title: 'Perfectionist',     desc: '3 perfect scores in a row',    condition: { type: 'perfect_streak', threshold: 3    } },
  { key: 'night_owl',     title: 'Night Owl',         desc: 'Play 5 sessions after 8 PM',   condition: { type: 'night_sessions', threshold: 5    } },
  { key: 'early_bird',    title: 'Early Bird',        desc: 'Play 5 sessions before 9 AM',  condition: { type: 'early_sessions', threshold: 5    } },
];

function getProgress(condition, user, stats) {
  const { type, threshold } = condition;
  let current = 0;
  if (type === 'activity_count') current = parseInt(stats?.stats?.completed_count ?? 0, 10);
  else if (type === 'xp')        current = user?.xp    ?? 0;
  else if (type === 'level')     current = user?.level ?? 1;
  else if (type === 'streak')    current = user?.streak ?? 0;
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
      <div className="flex items-start gap-3">
        <AchIcon achKey={ach.key} earned={earned} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{ach.title}</p>
            {earned && <CheckCircle size={13} className="text-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ach.desc}</p>
          <div className="mt-2">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-400">
                {earned ? 'Completed' : `${prog.current} / ${prog.threshold}`}
              </span>
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

// ─────────────────────────────────────────────────────────────
// All Achievements Modal
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Avatar / Profile Edit Modal
// Uses emoji picker (emoji still OK here — user-chosen avatars)
// ─────────────────────────────────────────────────────────────
const EMOJI_AVATARS = [
  '⭐','🦁','🐸','🐶','🦊','🐱','🦄','🐢',
  '🦋','🚀','🌈','🎯','🐼','🦈','🌙','🔥',
];

function AvatarEditModal({ user, onClose, onSave }) {
  const current = user?.avatar || '';
  const [selectedEmoji, setSelectedEmoji] = useState(isImageAvatar(current) ? null : current);
  const [previewImage,  setPreviewImage]  = useState(isImageAvatar(current) ? current : null);
  const [username,      setUsername]      = useState(user?.username || '');
  const [saving,        setSaving]        = useState(false);
  const [compressing,   setCompressing]   = useState(false);
  const [uploadError,   setUploadError]   = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saved,         setSaved]         = useState(false);
  const fileRef = useRef(null);

  const displayAvatar = previewImage ?? selectedEmoji ?? '';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setUploadError('');
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file (JPG, PNG, GIF, WebP, HEIC, etc.)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File must be under 15 MB.');
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      if (!compressed?.startsWith('data:')) throw new Error('Compression produced invalid data.');
      setPreviewImage(compressed);
      setSelectedEmoji(null);
      setUploadError('');
    } catch (err) {
      setUploadError(err.message || 'Could not process image. Try a JPG or PNG.');
    } finally {
      setCompressing(false);
    }
  };

  const handleEmojiPick = (emoji) => {
    setSelectedEmoji(emoji);
    setPreviewImage(null);
    setUploadError('');
  };

  const handleSave = async () => {
    if (saving || compressing) return;
    const trimmed = username.trim();
    if (trimmed.length < 3)  { setUsernameError('Username must be at least 3 characters.'); return; }
    if (trimmed.length > 30) { setUsernameError('Username must be 30 characters or less.');  return; }
    setSaving(true);
    setUploadError('');
    setUsernameError('');
    try {
      const avatarToSave = previewImage ?? selectedEmoji;
      if (avatarToSave != null && avatarToSave !== user?.avatar) {
        const r = await api.put('/users/avatar', { avatar: avatarToSave });
        if (!r.data?.avatar) throw new Error('Avatar save did not confirm. Please try again.');
      }
      if (trimmed !== user?.username) {
        await api.put('/users/username', { username: trimmed });
      }
      await onSave();
      setSaved(true);
      setTimeout(() => onClose(), 600);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to save. Please try again.';
      if (msg.toLowerCase().includes('username')) setUsernameError(msg);
      else setUploadError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-display text-lg text-gray-800 dark:text-gray-100">Edit Profile</h3>
          <button onClick={() => !saving && onClose()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky/20 to-indigo-100
                            dark:from-sky/10 dark:to-indigo-900/30 flex items-center justify-center
                            overflow-hidden shadow-md ring-2 ring-sky/20 relative">
              <AvatarDisplay avatar={displayAvatar} size={96} />
              {compressing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button type="button" disabled={compressing || saving}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-sm font-semibold text-sky hover:text-sky/80
                         transition-colors disabled:opacity-40 mt-1">
              {compressing
                ? <><span className="w-3.5 h-3.5 border-2 border-sky border-t-transparent rounded-full animate-spin inline-block" /> Processing…</>
                : <><Upload size={14} /> Upload photo</>}
            </button>
            <p className="text-[10px] text-gray-400 text-center">JPG · PNG · GIF · WebP · HEIC &nbsp;·&nbsp; up to 15 MB</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input value={username} maxLength={30} placeholder="Enter username"
              onChange={e => { setUsername(e.target.value); setUsernameError(''); }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-800
                          text-gray-800 dark:text-gray-100 outline-none transition-colors
                          ${usernameError ? 'border-rose-400' : 'border-gray-200 dark:border-gray-600 focus:border-sky'}`} />
            {usernameError && <p className="text-xs text-rose-500 mt-1">{usernameError}</p>}
          </div>

          {/* Emoji picker */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Or choose an avatar emoji
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_AVATARS.map(emoji => (
                <button key={emoji} type="button" onClick={() => handleEmojiPick(emoji)}
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
            <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-2.5 rounded-xl
                            border border-rose-200 dark:border-rose-800">
              {uploadError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => !saving && onClose()} disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         text-sm font-semibold text-gray-600 dark:text-gray-300
                         hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving || compressing}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors
                          flex items-center justify-center gap-2 disabled:opacity-60
                          ${saved ? 'bg-emerald-500 text-white' : 'bg-sky text-white hover:bg-sky/90'}`}>
              {saved
                ? <><Check size={16} /> Saved!</>
                : saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check size={15} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser }     = useAuth();
  const [stats,           setStats]           = useState(null);
  const [statsLoading,    setStatsLoading]    = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAllAch,      setShowAllAch]      = useState(false);

  // All-time stats — refetch when user XP/streak changes
  const fetchStats = useCallback(() => {
    if (!user) return;
    setStatsLoading(true);
    api.get('/progress/stats')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, user?.xp, user?.streak]);

  const unlocked   = new Set(user?.achievements || []);
  const xpForLevel = 50;
  const currentXP  = (user?.xp || 0) % xpForLevel;
  const xpPct      = Math.min(100, Math.round((currentXP / xpForLevel) * 100));

  const sortedAch  = [...ALL_ACHIEVEMENTS].sort(
    (a, b) => (unlocked.has(a.key) ? 0 : 1) - (unlocked.has(b.key) ? 0 : 1)
  );
  const previewAch = sortedAch.slice(0, 6);

  // All-time stats with safe parsing
  const allPlayed    = parseInt(stats?.stats?.total_activities ?? 0, 10);
  const allCompleted = parseInt(stats?.stats?.completed_count  ?? 0, 10);
  const allAvg       = Math.round(parseFloat(stats?.stats?.avg_score ?? 0));

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">

      {/* ── Profile Card ─────────────────────────────── */}
      <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setShowAvatarModal(true)}
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
              <h2 className="font-display text-xl text-gray-800 dark:text-gray-100 truncate">{user?.username}</h2>
              <button type="button" onClick={() => setShowAvatarModal(true)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
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

      {/* ── All-Time Stats ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BookOpen    size={18} className="text-sky"          />, label: 'All Played',    value: allPlayed,    bg: 'bg-sky/10 dark:bg-sky/5'              },
          { icon: <CheckCircle size={18} className="text-emerald-500"  />, label: 'All Completed', value: allCompleted, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { icon: <TrendingUp  size={18} className="text-indigo-500"   />, label: 'Avg Score',     value: `${allAvg}%`, bg: 'bg-indigo-50 dark:bg-indigo-900/20'   },
          { icon: <Flame       size={18} className="text-orange-400"   />, label: 'Day Streak',    value: `${user?.streak || 0}d`, bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map(({ icon, label, value, bg }) => (
          <div key={label}
            className="rounded-2xl p-4 border border-gray-200 dark:border-gray-700 transition-opacity"
            style={{ background: 'var(--bg-card)', opacity: statsLoading ? 0.6 : 1 }}>
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>{icon}</div>
            <div className="font-display text-xl text-gray-800 dark:text-gray-100">{value}</div>
            <div className="text-xs text-gray-400 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Achievements ──────────────────────────────── */}
      <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700" style={{ background: 'var(--bg-card)' }}>
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
