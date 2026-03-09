// ============================================================
// ProfilePage — profile, avatar editor, stats, achievements
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Star, Flame, CheckCircle, BookOpen, TrendingUp,
  Camera, X, Check, ChevronRight, Upload, Pencil,
} from 'lucide-react';

// ── Avatar helpers ────────────────────────────────────────────
const EMOJI_AVATARS = [
  '⭐','🦁','🐸','🐶','🦊','🐱','🦄','🐢',
  '🦋','🚀','🌈','🎯','🐼','🦈','🌙','🔥',
];

function AvatarDisplay({ avatar, size = 80, rounded = 'rounded-2xl' }) {
  const isImage = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  const className = `w-full h-full object-cover ${rounded}`;
  if (isImage) {
    return <img src={avatar} alt="Avatar" className={className} />;
  }
  const display = (!avatar || avatar === 'star') ? '⭐' : avatar;
  const textSize = size >= 80 ? 'text-5xl' : size >= 48 ? 'text-2xl' : 'text-lg';
  return <span className={textSize}>{display}</span>;
}

// ── Achievement definitions (16 total) ───────────────────────
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

function getAchievementProgress(condition, user, stats) {
  const { type, threshold } = condition;
  let current = 0;
  switch (type) {
    case 'activity_count': current = stats?.stats?.completed_count || 0; break;
    case 'xp':             current = user?.xp || 0; break;
    case 'level':          current = user?.level || 1; break;
    case 'streak':         current = user?.streak || 0; break;
    default:               current = 0;
  }
  const clamped = Math.min(current, threshold);
  return { current: clamped, threshold, pct: Math.round((clamped / threshold) * 100) };
}

// ── Achievement Card ──────────────────────────────────────────
function AchievementCard({ ach, earned, user, stats, compact = false }) {
  const prog = getAchievementProgress(ach.condition, user, stats);

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      earned
        ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
    } ${!earned && 'opacity-70'}`}>
      <div className="flex items-start gap-2.5">
        <span className={`text-2xl flex-shrink-0 ${!earned && 'grayscale opacity-60'}`}>
          {ach.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{ach.title}</p>
            {earned && <CheckCircle size={13} className="text-amber-500 flex-shrink-0" />}
          </div>
          {!compact && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ach.desc}</p>
          )}

          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">
                {earned ? 'Completed' : `${prog.current} / ${prog.threshold}`}
              </span>
              {!earned && (
                <span className="text-[10px] font-semibold text-gray-500">{prog.pct}%</span>
              )}
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  earned ? 'bg-amber-400' : 'bg-sky'
                }`}
                style={{ width: `${earned ? 100 : prog.pct}%` }}
              />
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
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: 'var(--bg-card)' }}>

        {/* Header */}
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

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {earned.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-500 mb-2">
                Earned ({earned.length})
              </p>
              <div className="grid grid-cols-1 gap-2">
                {earned.map(a => (
                  <AchievementCard key={a.key} ach={a} earned user={user} stats={stats} />
                ))}
              </div>
            </div>
          )}

          {locked.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                In Progress ({locked.length})
              </p>
              <div className="grid grid-cols-1 gap-2">
                {locked.map(a => (
                  <AchievementCard key={a.key} ach={a} earned={false} user={user} stats={stats} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Avatar Edit Modal ─────────────────────────────────────────
function AvatarEditModal({ user, onClose, onSave }) {
  const [username,      setUsername]      = useState(user?.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '⭐');
  const [previewImage,  setPreviewImage]  = useState(null); // base64 data URL from file upload
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [usernameError, setUsernameError] = useState('');
  const fileRef = useRef(null);

  // Current displayed avatar
  const displayAvatar = previewImage || selectedAvatar;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2 MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImage(ev.target.result);
      setSelectedAvatar(''); // clear emoji selection
    };
    reader.readAsDataURL(file);
  };

  const handleEmojiPick = (emoji) => {
    setSelectedAvatar(emoji);
    setPreviewImage(null);
    setError('');
  };

  const handleSave = async () => {
    if (saving) return;

    // Validate username
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return;
    }
    if (trimmed.length > 30) {
      setUsernameError('Username must be 30 characters or less.');
      return;
    }

    setSaving(true);
    setError('');
    setUsernameError('');

    try {
      const avatarToSave = previewImage || selectedAvatar;

      // Save avatar
      if (avatarToSave !== user?.avatar) {
        await api.put('/users/avatar', { avatar: avatarToSave });
      }

      // Save username
      if (trimmed !== user?.username) {
        await api.put('/users/username', { username: trimmed });
      }

      await onSave();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save. Please try again.';
      if (msg.toLowerCase().includes('username')) {
        setUsernameError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-display text-lg text-gray-800 dark:text-gray-100">Edit Profile</h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky/20 to-indigo-100 dark:from-sky/10 dark:to-indigo-900/30
                            flex items-center justify-center overflow-hidden shadow-md">
              <AvatarDisplay avatar={displayAvatar} size={80} />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold text-sky hover:text-sky/80 transition-colors">
              <Upload size={13} /> Upload photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Username field */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value); setUsernameError(''); }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-800
                          text-gray-800 dark:text-gray-100 outline-none transition-colors
                          ${usernameError
                            ? 'border-rose-400 focus:border-rose-400'
                            : 'border-gray-200 dark:border-gray-600 focus:border-sky'
                          }`}
              placeholder="Enter username"
              maxLength={30}
            />
            {usernameError && (
              <p className="text-xs text-rose-500 mt-1">{usernameError}</p>
            )}
          </div>

          {/* Emoji grid */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Choose an emoji avatar
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_AVATARS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiPick(emoji)}
                  className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                    !previewImage && selectedAvatar === emoji
                      ? 'bg-sky/15 ring-2 ring-sky scale-110'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         text-sm font-semibold text-gray-600 dark:text-gray-300
                         hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-sky text-white text-sm font-bold
                         hover:bg-sky/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Check size={15} /> Save Changes</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [stats,          setStats]          = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAllAch,      setShowAllAch]      = useState(false);

  useEffect(() => {
    api.get('/progress/stats').then(r => setStats(r.data)).catch(console.error);
  }, []);

  const unlocked     = new Set(user?.achievements || []);
  const xpForLevel   = 50;
  const currentXP    = (user?.xp || 0) % xpForLevel;
  const xpPct        = Math.min(100, Math.round((currentXP / xpForLevel) * 100));

  // Show first 6 achievements (earned ones first, then by order)
  const sortedAch = [...ALL_ACHIEVEMENTS].sort((a, b) => {
    const aEarned = unlocked.has(a.key) ? 0 : 1;
    const bEarned = unlocked.has(b.key) ? 0 : 1;
    return aEarned - bEarned;
  });
  const previewAch = sortedAch.slice(0, 6);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">

      {/* ── Profile Card ───────────────────────────────── */}
      <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-4">

          {/* Clickable avatar */}
          <button
            onClick={() => setShowAvatarModal(true)}
            className="relative flex-shrink-0 group"
            title="Edit profile">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky/20 to-indigo-100
                            dark:from-sky/10 dark:to-indigo-900/30
                            flex items-center justify-center overflow-hidden shadow-sm">
              <AvatarDisplay avatar={user?.avatar} size={64} />
            </div>
            {/* camera overlay on hover */}
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
              <button
                onClick={() => setShowAvatarModal(true)}
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

        {/* XP Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Progress to Level {(user?.level || 1) + 1}</span>
            <span>{currentXP} / {xpForLevel} XP</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky to-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BookOpen  size={18} className="text-sky"    />, label: 'Played',    value: stats?.stats?.total_activities || 0,           bg: 'bg-sky/10'     },
          { icon: <CheckCircle size={18} className="text-emerald-500" />, label: 'Completed', value: stats?.stats?.completed_count || 0, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { icon: <TrendingUp size={18} className="text-indigo-500" />, label: 'Avg Score', value: `${Math.round(stats?.stats?.avg_score || 0)}%`, bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { icon: <Flame     size={18} className="text-orange-400" />, label: 'Streak',    value: `${user?.streak || 0}d`,                      bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map(({ icon, label, value, bg }) => (
          <div key={label}
            className="rounded-2xl p-4 border border-gray-200 dark:border-gray-700"
            style={{ background: 'var(--bg-card)' }}>
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
              {icon}
            </div>
            <div className="font-display text-xl text-gray-800 dark:text-gray-100">{value}</div>
            <div className="text-xs text-gray-400 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Achievements ───────────────────────────────── */}
      <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-gray-800 dark:text-gray-100">Achievements</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {unlocked.size} of {ALL_ACHIEVEMENTS.length} earned
            </p>
          </div>
          <button
            onClick={() => setShowAllAch(true)}
            className="flex items-center gap-1 text-xs font-semibold text-sky hover:text-sky/80 transition-colors">
            See all <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {previewAch.map(ach => (
            <AchievementCard
              key={ach.key}
              ach={ach}
              earned={unlocked.has(ach.key)}
              user={user}
              stats={stats}
            />
          ))}
        </div>

        <button
          onClick={() => setShowAllAch(true)}
          className="w-full mt-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700
                     text-xs font-semibold text-gray-400 hover:border-sky hover:text-sky transition-colors">
          View all {ALL_ACHIEVEMENTS.length} achievements →
        </button>
      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      {showAvatarModal && (
        <AvatarEditModal
          user={user}
          onClose={() => setShowAvatarModal(false)}
          onSave={refreshUser}
        />
      )}

      {showAllAch && (
        <AchievementsModal
          onClose={() => setShowAllAch(false)}
          user={user}
          stats={stats}
        />
      )}
    </div>
  );
}
