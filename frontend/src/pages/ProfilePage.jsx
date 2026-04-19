// ============================================================
// ProfilePage — fixed avatar (uses equipped character PNG,
// falls back to gray default — never a letter), aligned layout,
// and live reflection of shop equipped changes.
// All-time stats use /progress/stats WITHOUT date params so they
// accumulate permanently and never reset daily.
// ============================================================
import ReactDOM from 'react-dom';
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { characterById, DEFAULT_CHARACTER_ID } from '../components/character/CHARACTER_CATALOG';
import {
  Star, Flame, CheckCircle, BookOpen, TrendingUp, User,
  Camera, Edit2, Check, X, History, Trophy,
} from 'lucide-react';

// ── Achievement definitions ───────────────────────────────────
const ACHIEVEMENTS = [
  { key:'first_star',   title:'First Star!',       desc:'Complete your first activity',   group:'milestone' },
  { key:'xp_100',       title:'Century Club',       desc:'Earn 100 XP',                   group:'xp'        },
  { key:'xp_500',       title:'XP Legend',          desc:'Earn 500 XP',                   group:'xp'        },
  { key:'xp_1000',      title:'XP Master',          desc:'Earn 1000 XP',                  group:'xp'        },
  { key:'level_3',      title:'Rising Reader',      desc:'Reach Level 3',                 group:'level'     },
  { key:'level_5',      title:'Word Wizard',        desc:'Reach Level 5',                 group:'level'     },
  { key:'level_10',     title:'Reading Champion',   desc:'Reach Level 10',                group:'level'     },
  { key:'level_20',     title:'Scholar',            desc:'Reach Level 20',                group:'level'     },
  { key:'streak_3',     title:'Consistent!',        desc:'3-day reading streak',          group:'streak'    },
  { key:'five_streak',  title:'On Fire!',           desc:'5-day reading streak',          group:'streak'    },
  { key:'streak_7',     title:'Weekly Warrior',     desc:'7-day reading streak',          group:'streak'    },
  { key:'ten_streak',   title:'Unstoppable',        desc:'10-day reading streak',         group:'streak'    },
  { key:'complete_5',   title:'Getting Started',    desc:'Complete 5 activities',         group:'progress'  },
  { key:'complete_10',  title:'On a Roll',          desc:'Complete 10 activities',        group:'progress'  },
  { key:'complete_25',  title:'Dedicated Learner',  desc:'Complete 25 activities',        group:'progress'  },
  { key:'completionist',title:'Completionist',      desc:'Complete all activities',       group:'progress'  },
  { key:'perfect_3',    title:'Perfectionist',      desc:'Score 100% on 3 activities',   group:'skill'     },
];
const ACH_KNOWN_KEYS = new Set(ACHIEVEMENTS.map(a => a.key));
const GROUP_ICONS = {
  milestone: Star, xp: TrendingUp, level: Trophy,
  streak: Flame, progress: BookOpen, skill: CheckCircle,
};
const GROUP_LABELS = {
  milestone:'Milestones', xp:'XP', level:'Levels',
  streak:'Streaks', progress:'Progress', skill:'Skills',
};

// ── Coin SVG icon ─────────────────────────────────────────────
function CoinIcon({ size = 14, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <circle cx="12" cy="12" r="10" fill="#F59E0B" />
      <circle cx="12" cy="12" r="8" fill="#FBBF24" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold"
        fill="#92400E" fontFamily="Arial, sans-serif">$</text>
    </svg>
  );
}

// ── Avatar display — always shows character PNG, never a letter ──
function AvatarDisplay({ equipped, avatar, username, size = 80 }) {
  const characterId = equipped?.character || null;

  if (characterId) {
    const char = characterById(characterId);
    const src  = char ? `/characters/${char.file}` : `/characters/char_common_gray.png`;
    return (
      <img
        src={src}
        alt={char?.name || username || 'Character'}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
        onError={e => { e.currentTarget.src = '/characters/char_common_gray.png'; }}
      />
    );
  }

  if (avatar && avatar.startsWith('data:')) {
    return (
      <img src={avatar} alt="avatar"
        style={{ width: size, height: size, objectFit: 'cover', display: 'block' }} />
    );
  }

  const defaultChar = characterById(DEFAULT_CHARACTER_ID);
  return (
    <img
      src={defaultChar ? `/characters/${defaultChar.file}` : '/characters/char_common_gray.png'}
      alt="Character"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      onError={e => { e.currentTarget.style.opacity = '0.3'; }}
    />
  );
}

// ── Avatar picker modal ───────────────────────────────────────
const EMOJI_AVATARS = ['⭐','🦁','🐸','🐶','🦊','🐱','🦄','🐢','🦋','🚀','🌈','🎯','🐧','🦕','🐬','🦉'];

function AvatarModal({ current, onClose, onSave }) {
  const [selected,  setSelected]  = useState(current);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const S = 512, canvas = document.createElement('canvas');
        canvas.width = canvas.height = S;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(S / img.width, S / img.height);
        ctx.drawImage(img, (S - img.width * scale) / 2, (S - img.height * scale) / 2, img.width * scale, img.height * scale);
        setSelected(canvas.toDataURL('image/jpeg', 0.82));
        setUploading(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        style={{ background:'var(--bg-card-grad)', border:'1px solid var(--border-color)', fontSize: 16 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display" style={{ fontSize: 20 }}>Choose Avatar</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
        </div>
        <div className="flex justify-center mb-4">
          <div style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden',
                        background: 'rgba(96,184,245,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AvatarDisplay avatar={selected} username="?" size={72}/>
          </div>
        </div>
        <div className="grid grid-cols-8 gap-2 mb-4">
          {EMOJI_AVATARS.map(e => (
            <button key={e} onClick={() => setSelected(e)}
              style={{ fontSize: 22 }}
              className={`rounded-xl p-1 transition-all hover:scale-110
                ${selected === e ? 'ring-2 ring-sky bg-sky/10 scale-110' : ''}`}>
              {e}
            </button>
          ))}
        </div>
        <button onClick={() => fileRef.current.click()}
          className="w-full py-2.5 rounded-2xl border-2 border-dashed
                     text-gray-500 hover:border-sky hover:text-sky transition-colors mb-4
                     flex items-center justify-center gap-2"
          style={{ fontSize: 13, borderColor:'var(--border-color)' }}>
          <Camera size={16}/> {uploading ? 'Processing…' : 'Upload a Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border text-gray-600 dark:text-gray-300"
            style={{ fontSize: 13, borderColor:'var(--border-color)' }}>
            Cancel
          </button>
          <button onClick={() => onSave(selected)}
            className="flex-1 py-2.5 rounded-2xl bg-sky text-white font-bold hover:opacity-90"
            style={{ fontSize: 13 }}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── All Achievements Modal ────────────────────────────────────
function AllAchievementsModal({ unlocked, onClose }) {
  const groups = ['milestone','xp','level','streak','progress','skill'];
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl rounded-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
        style={{ background:'var(--bg-card-grad)', border:'1px solid var(--border-color)', fontSize: 16 }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0"
          style={{ borderColor:'var(--border-color)' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: 20 }}>All Achievements</h3>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{unlocked.size} of {ACHIEVEMENTS.length} earned</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} className="text-gray-400"/>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
          {groups.map(g => {
            const items = ACHIEVEMENTS.filter(a => a.group === g);
            const GrpIcon = GROUP_ICONS[g] || Star;
            return (
              <div key={g}>
                <div className="flex items-center gap-2 mb-2">
                  <GrpIcon size={12} className="text-gray-400"/>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
                    {GROUP_LABELS[g]}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map(ach => {
                    const earned = unlocked.has(ach.key);
                    const AchIcon = GROUP_ICONS[ach.group] || Star;
                    return (
                      <div key={ach.key}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${
                          earned
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-100 dark:border-gray-700/50 opacity-50'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                          ${earned ? 'bg-amber-100 dark:bg-amber-800/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <AchIcon size={17} className={earned ? 'text-amber-500' : 'text-gray-400'}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}
                            className={earned ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
                            {ach.title}
                          </p>
                          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{ach.desc}</p>
                        </div>
                        {earned && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, flexShrink: 0, fontWeight: 700 }}
                            className="bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200">
                            ✓ Earned
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ Icon, iconCls, bg, label, val, loading }) {
  return (
    <div className="rounded-2xl p-3 border"
      style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)', opacity: loading ? 0.6 : 1 }}>
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        <Icon size={15} className={iconCls}/>
      </div>
      <div className="font-display text-gray-800 dark:text-gray-100 tabular-nums"
        style={{ fontSize: 'clamp(16px, 4vw, 24px)', lineHeight: 1.1 }}>
        {val}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ── Achievement Row (mobile list) ─────────────────────────────
function AchRow({ ach, earned }) {
  const AchIcon = GROUP_ICONS[ach.group] || Star;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 16,
      border: `2px solid ${earned ? '#fcd34d' : 'var(--border-color)'}`,
      background: earned ? 'rgba(251,191,36,0.07)' : 'var(--bg-card-grad)',
      opacity: earned ? 1 : 0.5,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: earned ? 'rgba(251,191,36,0.15)' : 'rgba(156,163,175,0.1)',
      }}>
        <AchIcon size={16} className={earned ? 'text-amber-500' : 'text-gray-400'}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          className="text-gray-800 dark:text-gray-100">
          {ach.title}
        </p>
        <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ach.desc}
        </p>
      </div>
      {earned && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          flexShrink: 0, whiteSpace: 'nowrap',
          background: 'rgba(251,191,36,0.2)', color: '#b45309',
        }}>
          ✓ Earned
        </span>
      )}
    </div>
  );
}

// ── Achievement Tile (desktop grid) ──────────────────────────
function AchTile({ ach, earned }) {
  const AchIcon = GROUP_ICONS[ach.group] || Star;
  return (
    <div className={`rounded-xl p-2.5 text-center border-2 transition-all
      ${earned
        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
        : 'border-gray-100 dark:border-gray-700 opacity-40 grayscale'}`}>
      <div className={`w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center
        ${earned ? 'bg-amber-100 dark:bg-amber-800/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
        <AchIcon size={15} className={earned ? 'text-amber-500' : 'text-gray-400'}/>
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}
        className="text-gray-700 dark:text-gray-200 line-clamp-2">
        {ach.title}
      </p>
      {earned && (
        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 999, fontWeight: 700, display: 'inline-block', marginTop: 3 }}
          className="bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200">
          ✓
        </span>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [stats,           setStats]           = useState(null);
  const [statsLoading,    setStatsLoading]    = useState(true);
  const [editUsername,    setEditUsername]    = useState(false);
  const [newUsername,     setNewUsername]     = useState(user?.username || '');
  const [usernameErr,     setUsernameErr]     = useState('');
  const [savingUsername,  setSavingUsername]  = useState(false);
  const [showAllAch,      setShowAllAch]      = useState(false);
  const [activeTab,       setActiveTab]       = useState('profile');

  // ── All-time stats: fetch WITHOUT date params so they never reset ──
  // The /progress/stats endpoint without from/to params returns cumulative
  // total_activities, completed_count, and avg_score from all user_progress rows.
  useEffect(() => {
    if (!user?.id) { setStats(null); setStatsLoading(false); return; }
    setStatsLoading(true);
    // No date params = all-time aggregates from the database
    api.get('/progress/stats')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [user?.id, user?.xp, user?.streak]);

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (trimmed.length < 3) { setUsernameErr('At least 3 characters'); return; }
    setSavingUsername(true); setUsernameErr('');
    try {
      await api.put('/users/username', { username: trimmed });
      await refreshUser(); setEditUsername(false);
    } catch (err) { setUsernameErr(err.message || 'Could not update username'); }
    setSavingUsername(false);
  };

  const rawUnlocked = new Set(user?.achievements || []);
  const unlocked    = new Set([...rawUnlocked].filter(k => ACH_KNOWN_KEYS.has(k)));
  const earnedCount = unlocked.size;
  const xpForLevel  = 50;
  const currentXP   = (user?.xp || 0) % xpForLevel;
  const xpPct       = Math.min(100, Math.round((currentXP / xpForLevel) * 100));

  // All-time stats from the stats endpoint (no daily filtering)
  const allPlayed    = parseInt(stats?.stats?.total_activities ?? 0, 10);
  const allCompleted = parseInt(stats?.stats?.completed_count  ?? 0, 10);
  const allAvg       = Math.round(parseFloat(stats?.stats?.avg_score ?? 0));

  const sortedAch    = [...ACHIEVEMENTS].sort((a, b) => (unlocked.has(b.key) ? 1 : 0) - (unlocked.has(a.key) ? 1 : 0));

  const equipped = user?.equipped || {};

  const TABS = [
    { key:'profile',      Icon:User,       label:'Profile'  },
    { key:'stats',        Icon:TrendingUp, label:'Stats'    },
    { key:'achievements', Icon:Trophy,     label:'Badges'   },
  ];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-4">

      {/* ══ HERO BANNER ════════════════════════════════════════ */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg"
        style={{ background:'linear-gradient(135deg,#4D96FF 0%,#6BCB77 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:'radial-gradient(circle at 20% 50%,#fff 1px,transparent 1px)', backgroundSize:'40px 40px' }}/>

        {/* ── Mobile hero ── */}
        <div className="md:hidden relative" style={{ padding: '16px 16px 16px', fontSize: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

            <div style={{
              width: 72, height: 72, borderRadius: 16, flexShrink: 0,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.15)',
              boxShadow: '0 0 0 3px rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AvatarDisplay equipped={equipped} avatar={user?.avatar} username={user?.username} size={64}/>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editUsername ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <input value={newUsername}
                    onChange={e => { setNewUsername(e.target.value); setUsernameErr(''); }}
                    style={{
                      flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700,
                      padding: '4px 8px', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.2)', color: 'white', outline: 'none',
                    }}
                    maxLength={30} autoFocus/>
                  <button onClick={handleSaveUsername} disabled={savingUsername} style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  }}>
                    {savingUsername
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      : <Check size={13}/>}
                  </button>
                  <button onClick={() => { setEditUsername(false); setUsernameErr(''); setNewUsername(user?.username || ''); }}
                    style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                             background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                             display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <X size={13}/>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <h1 style={{
                    fontFamily: '"Fredoka One", cursive',
                    fontSize: 20, color: 'white', lineHeight: 1.1,
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 'calc(100% - 34px)',
                  }}>
                    {user?.username}
                  </h1>
                  <button onClick={() => { setEditUsername(true); setNewUsername(user?.username || ''); }}
                    style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                             background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                             display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 size={11} color="white"/>
                  </button>
                </div>
              )}
              {usernameErr && <p style={{ fontSize: 10, color: '#fca5a5', margin: '0 0 4px' }}>{usernameErr}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'white',
                  background: 'rgba(255,255,255,0.2)', borderRadius: 999,
                  padding: '2px 8px', lineHeight: 1.5, whiteSpace: 'nowrap',
                }}>
                  Lv {user?.level || 1}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'white',
                  background: 'rgba(251,191,36,0.3)', borderRadius: 999,
                  padding: '2px 8px', lineHeight: 1.5, whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="#fde68a" stroke="none">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                  </svg>
                  {user?.xp || 0} XP
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'white',
                  background: 'rgba(251,191,36,0.3)', borderRadius: 999,
                  padding: '2px 8px', lineHeight: 1.5, whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  <CoinIcon size={10}/>
                  {user?.coins || 0}
                </span>
              </div>

              <p style={{
                fontSize: 10, color: 'rgba(255,255,255,0.6)',
                margin: '5px 0 0', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email}
              </p>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5,
                          fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
              <span>To Level {(user?.level || 1) + 1}</span>
              <span>{currentXP}/{xpForLevel} XP</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'white', borderRadius: 999,
                            width: `${xpPct}%`, transition: 'width 0.7s' }}/>
            </div>
          </div>
        </div>

        {/* ── Desktop hero ── */}
        <div className="hidden md:block relative px-8 pt-8 pb-0">
          <div className="flex items-center gap-6">
            <div style={{
              width: 96, height: 96, borderRadius: 20, flexShrink: 0,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.15)',
              boxShadow: '0 0 0 4px rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AvatarDisplay equipped={equipped} avatar={user?.avatar} username={user?.username} size={96}/>
            </div>

            <div className="flex-1 min-w-0">
              {editUsername ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={newUsername}
                    onChange={e => { setNewUsername(e.target.value); setUsernameErr(''); }}
                    className="px-3 py-1.5 rounded-xl border-2 border-white/60 font-bold
                               outline-none bg-white/20 text-white placeholder-white/60 w-56 min-w-0"
                    style={{ fontSize: 16 }} maxLength={30} autoFocus/>
                  <button onClick={handleSaveUsername} disabled={savingUsername}
                    className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 flex-shrink-0">
                    {savingUsername ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={15}/>}
                  </button>
                  <button onClick={() => { setEditUsername(false); setUsernameErr(''); setNewUsername(user?.username || ''); }}
                    className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 flex-shrink-0">
                    <X size={15}/>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-white leading-tight truncate" style={{ fontSize: 'clamp(20px, 3vw, 30px)' }}>
                    {user?.username}
                  </h1>
                  <button onClick={() => { setEditUsername(true); setNewUsername(user?.username || ''); }}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0">
                    <Edit2 size={14} className="text-white"/>
                  </button>
                </div>
              )}
              {usernameErr && <p className="text-xs text-rose-200 mb-1">{usernameErr}</p>}
              <p className="text-sm text-white/75 truncate">{user?.email}</p>
              <p className="text-xs text-white/60 mt-0.5">
                Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
              </p>
            </div>

            <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
              <div className="font-display text-5xl text-white leading-none">{user?.level || 1}</div>
              <div className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">Level</div>
              <div className="flex items-center justify-center gap-1 mt-2 bg-amber-400/30 rounded-full px-3 py-1">
                <Star size={11} className="text-amber-200 fill-amber-200"/>
                <span className="text-xs font-bold text-white">{user?.xp || 0} XP</span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-1.5 bg-amber-400/20 rounded-full px-3 py-1">
                <CoinIcon size={11}/>
                <span className="text-xs font-bold text-white">{user?.coins || 0} coins</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>Progress to Level {(user?.level || 1) + 1}</span>
              <span>{currentXP} / {xpForLevel} XP</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700 shadow-sm" style={{ width:`${xpPct}%` }}/>
            </div>
          </div>
          <div className="h-5"/>
        </div>
      </div>

      {/* ══ MOBILE TAB BAR ════════════════════════════════════ */}
      <div className="md:hidden flex rounded-2xl overflow-hidden"
        style={{ background:'var(--bg-card-grad)', border:'1px solid var(--border-color)' }}>
        {TABS.map(({ key, Icon, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 4px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              border: 'none', cursor: 'pointer', borderRadius: 0,
              background: activeTab === key ? '#60B8F5' : 'transparent',
              color: activeTab === key ? '#fff' : '#9ca3af',
              transition: 'background 0.15s, color 0.15s',
            }}>
            <Icon size={14} style={{ flexShrink: 0 }}/>{label}
          </button>
        ))}
      </div>

      {/* ══ MOBILE: Profile tab ════════════════════════════════ */}
      <div className={`md:hidden ${activeTab !== 'profile' ? 'hidden' : ''} space-y-4`}>
        <div className="grid grid-cols-2 gap-3">
          <StatCard Icon={BookOpen}    iconCls="text-sky"         bg="bg-sky/10"                             label="All-Time Played"    val={statsLoading ? '…' : allPlayed}    loading={statsLoading}/>
          <StatCard Icon={CheckCircle} iconCls="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-900/20" label="All-Time Completed" val={statsLoading ? '…' : allCompleted} loading={statsLoading}/>
        </div>
        <div className="rounded-3xl p-4 border" style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-gray-800 dark:text-gray-100" style={{ fontSize: 18 }}>Achievements</h2>
            <button onClick={() => setActiveTab('achievements')}
              className="text-sky font-bold hover:underline flex items-center gap-1" style={{ fontSize: 12 }}>
              <Trophy size={12}/> See All
            </button>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mb-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
              style={{ width:`${Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}%` }}/>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>{earnedCount} of {ACHIEVEMENTS.length} earned</p>
          <div className="space-y-2">
            {sortedAch.filter(a => unlocked.has(a.key)).slice(0, 4).map(ach => (
              <AchRow key={ach.key} ach={ach} earned={true}/>
            ))}
            {earnedCount === 0 && (
              <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
                Complete activities to earn your first badge!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ══ MOBILE: Stats tab ══════════════════════════════════ */}
      <div className={`md:hidden ${activeTab !== 'stats' ? 'hidden' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-gray-800 dark:text-gray-100" style={{ fontSize: 20 }}>All-Time Stats</h2>
          {statsLoading && <span className="w-3 h-3 border-2 border-sky/40 border-t-sky rounded-full animate-spin"/>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard Icon={BookOpen}    iconCls="text-sky"         bg="bg-sky/10"                             label="Total Played"   val={statsLoading ? '…' : allPlayed}    loading={statsLoading}/>
          <StatCard Icon={CheckCircle} iconCls="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-900/20" label="Total Completed" val={statsLoading ? '…' : allCompleted} loading={statsLoading}/>
          <StatCard Icon={TrendingUp}  iconCls="text-indigo-500"  bg="bg-indigo-50 dark:bg-indigo-900/20"   label="Avg Score"      val={statsLoading ? '…' : `${allAvg}%`} loading={statsLoading}/>
          <StatCard Icon={Flame}       iconCls="text-orange-400"  bg="bg-orange-50 dark:bg-orange-900/20"   label="Day Streak"     val={`${user?.streak || 0}d`}           loading={false}/>
        </div>
      </div>

      {/* ══ MOBILE: Achievements tab ════════════════════════════ */}
      <div className={`md:hidden ${activeTab !== 'achievements' ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-gray-800 dark:text-gray-100" style={{ fontSize: 20 }}>Achievements</h2>
          <button onClick={() => setShowAllAch(true)}
            className="text-sky font-bold hover:underline flex items-center gap-1" style={{ fontSize: 12 }}>
            <Trophy size={12}/> Full List
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mb-3 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
            style={{ width:`${Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}%` }}/>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
          {earnedCount} of {ACHIEVEMENTS.length} earned
          {earnedCount > 0 && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>
            · {Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}% complete
          </span>}
        </p>
        <div className="space-y-2">
          {sortedAch.map(ach => (
            <AchRow key={ach.key} ach={ach} earned={unlocked.has(ach.key)}/>
          ))}
        </div>
      </div>

      {/* ══ DESKTOP: Stats Row ═════════════════════════════════ */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-xl text-gray-800 dark:text-gray-100">Stats</h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                           bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <History size={11}/> All Time
          </span>
          {statsLoading && <span className="w-3 h-3 border-2 border-sky/40 border-t-sky rounded-full animate-spin ml-1"/>}
        </div>
        <div className="grid grid-cols-4 gap-4">
          <StatCard Icon={BookOpen}    iconCls="text-sky"         bg="bg-sky/10"                             label="Total Played"   val={statsLoading ? '…' : allPlayed}    loading={statsLoading}/>
          <StatCard Icon={CheckCircle} iconCls="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-900/20" label="Total Completed" val={statsLoading ? '…' : allCompleted} loading={statsLoading}/>
          <StatCard Icon={TrendingUp}  iconCls="text-indigo-500"  bg="bg-indigo-50 dark:bg-indigo-900/20"   label="Avg Score"      val={statsLoading ? '…' : `${allAvg}%`} loading={statsLoading}/>
          <StatCard Icon={Flame}       iconCls="text-orange-400"  bg="bg-orange-50 dark:bg-orange-900/20"   label="Day Streak"     val={`${user?.streak || 0}d`}           loading={false}/>
        </div>
      </div>

      {/* ══ DESKTOP: Achievements ══════════════════════════════ */}
      <div className="hidden md:block rounded-3xl p-6 border"
        style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl text-gray-800 dark:text-gray-100">Achievements</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {earnedCount} of {ACHIEVEMENTS.length} earned
              {earnedCount > 0 && <span className="ml-2 text-amber-500 font-bold">
                · {Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}% complete
              </span>}
            </p>
          </div>
          <button onClick={() => setShowAllAch(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
                       bg-sky/10 text-sky hover:bg-sky/20 transition-colors flex-shrink-0">
            <Trophy size={13}/> See All
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mb-4 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
            style={{ width:`${Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}%` }}/>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {sortedAch.slice(0, 12).map(ach => (
            <AchTile key={ach.key} ach={ach} earned={unlocked.has(ach.key)}/>
          ))}
        </div>
      </div>

      {showAllAch && (
        <AllAchievementsModal unlocked={unlocked} onClose={() => setShowAllAch(false)}/>
      )}
    </div>
  );
}
