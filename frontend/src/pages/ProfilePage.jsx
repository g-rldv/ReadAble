// ============================================================
// ProfilePage — with Character tab for 2D avatar customization
// ============================================================
import ReactDOM from 'react-dom';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Star, Flame, CheckCircle, BookOpen, TrendingUp, User,
  Camera, Edit2, Check, X, History, Trophy, Sparkles,
} from 'lucide-react';
import CharacterAvatar, {
  ALL_SHOP_ITEMS, SKIN_TONES, DEFAULT_EQUIPPED, ownedDefaults,
} from '../components/character/CharacterAvatar';

// ── Tab definitions ───────────────────────────────────────────
const TABS = [
  { id: 'profile',   label: 'Profile',   icon: User      },
  { id: 'character', label: 'My Buddy',  icon: Sparkles  },
  { id: 'achievements', label: 'Badges', icon: Trophy    },
];

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
const GROUP_ICONS    = {
  milestone: Star, xp: TrendingUp, level: Trophy,
  streak: Flame, progress: BookOpen, skill: CheckCircle,
};
const GROUP_LABELS = {
  milestone:'Milestones', xp:'XP', level:'Levels',
  streak:'Streaks', progress:'Progress', skill:'Skills',
};

// ── AvatarDisplay (photo/emoji) ───────────────────────────────
function AvatarDisplay({ avatar, username, size = 80 }) {
  const isImage = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  if (isImage) return (
    <img src={avatar} alt="avatar" className="rounded-2xl object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={e => { e.currentTarget.style.display = 'none'; }}/>
  );
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
        style={{ background:'var(--bg-card-grad)', border:'1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-gray-800 dark:text-gray-100">Profile Photo</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
        </div>
        <div className="flex justify-center mb-4">
          <AvatarDisplay avatar={selected} username="?" size={72}/>
        </div>
        <div className="grid grid-cols-8 gap-2 mb-4">
          {EMOJI_AVATARS.map(e => (
            <button key={e} onClick={() => setSelected(e)}
              className={`text-2xl rounded-xl p-1 transition-all hover:scale-110 ${selected === e ? 'ring-2 ring-sky bg-sky/10 scale-110' : ''}`}>
              {e}
            </button>
          ))}
        </div>
        <button onClick={() => fileRef.current.click()}
          className="w-full py-2.5 rounded-2xl border-2 border-dashed text-sm font-semibold
                     text-gray-500 hover:border-sky hover:text-sky transition-colors mb-4
                     flex items-center justify-center gap-2"
          style={{ borderColor:'var(--border-color)' }}>
          <Camera size={16}/> {uploading ? 'Processing…' : 'Upload a Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border text-sm font-semibold text-gray-600 dark:text-gray-300"
            style={{ borderColor:'var(--border-color)' }}>Cancel</button>
          <button onClick={() => onSave(selected)}
            className="flex-1 py-2.5 rounded-2xl bg-sky text-white text-sm font-bold hover:opacity-90">Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Character customization tab ───────────────────────────────
function CharacterTab({ user, onUpdate }) {
  const [wardrobe,  setWardrobe]  = useState([]);
  const [equipped,  setEquipped]  = useState({ ...DEFAULT_EQUIPPED });
  const [activeSlot,setActiveSlot]= useState('hat');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  const SLOTS = [
    { key:'hat',        label:'Hat'     },
    { key:'top',        label:'Shirt'   },
    { key:'accessory',  label:'Accessory'},
    { key:'background', label:'BG'      },
    { key:'skin',       label:'Skin'    },
  ];

  useEffect(() => {
    api.get('/users/wardrobe')
      .then(res => {
        setWardrobe([...ownedDefaults, ...(res.data.wardrobe || [])]);
        setEquipped({ ...DEFAULT_EQUIPPED, ...(res.data.equipped || {}) });
      })
      .catch(() => setWardrobe(ownedDefaults))
      .finally(() => setLoading(false));
  }, []);

  const handleEquip = async (itemId, category) => {
    const next = { ...equipped, [category]: itemId };
    setEquipped(next);
    setSaving(true);
    try {
      await api.post('/users/equip-item', { category, itemId });
    } catch (_) {}
    finally { setSaving(false); }
  };

  const slotItems = activeSlot === 'skin'
    ? SKIN_TONES.map(st => ({ id: st.id, name: st.name, preview: '●', fill: st.fill, isSkin: true }))
    : ALL_SHOP_ITEMS.filter(i =>
        i.category === activeSlot && (ownedDefaults.includes(i.id) || wardrobe.includes(i.id))
      );

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Character preview */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative">
          <CharacterAvatar equipped={equipped} size={180}/>
          {saving && (
            <div className="absolute inset-0 rounded-2xl bg-black/20 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            </div>
          )}
        </div>
        <Link to="/shop"
          className="text-xs font-bold text-sky hover:underline flex items-center gap-1">
          <Sparkles size={12}/> Get more items in the Shop
        </Link>
      </div>

      {/* Slot tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {SLOTS.map(slot => (
          <button key={slot.key} onClick={() => setActiveSlot(slot.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all
              ${activeSlot === slot.key ? 'bg-sky text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-sky/10 hover:text-sky'}`}>
            {slot.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {slotItems.map(item => {
          const isEq = activeSlot === 'skin'
            ? equipped.skin === item.id
            : equipped[activeSlot] === item.id;
          return (
            <button key={item.id}
              onClick={() => handleEquip(item.id, activeSlot)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                ${isEq ? 'border-sky bg-sky/10 scale-105' : 'border-gray-200 dark:border-gray-700 hover:border-sky/40'}`}>
              {item.isSkin ? (
                <div className="w-8 h-8 rounded-full border-2 border-white/40 shadow-sm"
                  style={{ backgroundColor: item.fill }}/>
              ) : (
                <span className="text-xl">{item.preview}</span>
              )}
              <span className="text-[9px] font-semibold text-center text-gray-600 dark:text-gray-400 leading-tight line-clamp-1">
                {item.name}
              </span>
              {isEq && <Check size={10} className="text-sky" strokeWidth={3}/>}
            </button>
          );
        })}

        {slotItems.length === 0 && (
          <div className="col-span-4 sm:col-span-6 text-center py-8 text-gray-400">
            <p className="text-sm font-semibold">No items yet</p>
            <Link to="/shop" className="text-xs text-sky hover:underline mt-1 block">
              Visit the Shop to get some! 🛍️
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ Icon, iconCls, bg, label, val, loading }) {
  return (
    <div className="rounded-2xl p-3 lg:p-4 border"
      style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)', opacity: loading ? 0.6 : 1 }}>
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        <Icon size={16} className={iconCls}/>
      </div>
      <div className="font-display text-xl lg:text-2xl text-gray-800 dark:text-gray-100">{val}</div>
      <div className="text-xs text-gray-400 font-medium mt-0.5">{label}</div>
    </div>
  );
}

// ── Achievement tile ──────────────────────────────────────────
function AchTile({ ach, earned }) {
  const AchIcon = GROUP_ICONS[ach.group] || Star;
  return (
    <div className={`rounded-xl md:rounded-2xl p-2 md:p-3 text-center border-2 transition-all
      ${earned
        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
        : 'border-gray-100 dark:border-gray-700 opacity-40 grayscale'}`}>
      <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl mx-auto mb-1.5 flex items-center justify-center
        ${earned ? 'bg-amber-100 dark:bg-amber-800/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
        <AchIcon size={15} className={earned ? 'text-amber-500' : 'text-gray-400'}/>
      </div>
      <p className="font-bold text-[10px] md:text-[11px] text-gray-700 dark:text-gray-200 leading-tight line-clamp-2">
        {ach.title}
      </p>
      {earned && (
        <span className="inline-block mt-1 text-[8px] md:text-[9px] bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 px-1 py-0.5 rounded-full font-bold">
          ✓ Earned
        </span>
      )}
    </div>
  );
}

// ── Achievements tab ──────────────────────────────────────────
function AchievementsTab({ unlocked, earnedCount }) {
  const groups = ['milestone','xp','level','streak','progress','skill'];
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="font-bold text-gray-600 dark:text-gray-300">{earnedCount} / {ACHIEVEMENTS.length} earned</span>
          <span className="text-amber-500 font-bold">{Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
            style={{ width:`${Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}%` }}/>
        </div>
      </div>

      {groups.map(g => {
        const items   = ACHIEVEMENTS.filter(a => a.group === g);
        const GrpIcon = GROUP_ICONS[g] || Star;
        return (
          <div key={g}>
            <div className="flex items-center gap-2 mb-3">
              <GrpIcon size={13} className="text-gray-400"/>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{GROUP_LABELS[g]}</span>
              <span className="text-xs text-gray-300 dark:text-gray-600">
                ({items.filter(a => unlocked.has(a.key)).length}/{items.length})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map(ach => {
                const earned  = unlocked.has(ach.key);
                const AchIcon = GROUP_ICONS[ach.group] || Star;
                return (
                  <div key={ach.key}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all
                      ${earned
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-100 dark:border-gray-700/50 opacity-45 grayscale'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      ${earned ? 'bg-amber-100 dark:bg-amber-800/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <AchIcon size={17} className={earned ? 'text-amber-500' : 'text-gray-400'}/>
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-xs leading-tight ${earned ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {ach.title}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{ach.desc}</p>
                      {earned && (
                        <span className="inline-block mt-1 text-[9px] bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                          Earned ✓
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
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [stats,           setStats]           = useState(null);
  const [statsLoading,    setStatsLoading]    = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [savingAvatar,    setSavingAvatar]    = useState(false);
  const [editUsername,    setEditUsername]    = useState(false);
  const [newUsername,     setNewUsername]     = useState(user?.username || '');
  const [usernameErr,     setUsernameErr]     = useState('');
  const [savingUsername,  setSavingUsername]  = useState(false);
  const [activeTab,       setActiveTab]       = useState('profile');

  useEffect(() => {
    if (!user?.id) { setStats(null); setStatsLoading(false); return; }
    setStatsLoading(true);
    api.get('/progress/stats')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [user?.id, user?.xp, user?.streak]);

  const handleSaveAvatar = async (avatar) => {
    setSavingAvatar(true); setShowAvatarModal(false);
    try { await api.put('/users/avatar', { avatar }); await refreshUser(); } catch (_) {}
    setSavingAvatar(false);
  };

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
  const allPlayed    = parseInt(stats?.stats?.total_activities ?? 0, 10);
  const allCompleted = parseInt(stats?.stats?.completed_count  ?? 0, 10);
  const allAvg       = Math.round(parseFloat(stats?.stats?.avg_score ?? 0));

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-5">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg"
        style={{ background:'linear-gradient(135deg,#4D96FF 0%,#6BCB77 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:'radial-gradient(circle at 20% 50%,#fff 1px,transparent 1px)', backgroundSize:'40px 40px' }}/>

        {/* Mobile */}
        <div className="md:hidden relative px-5 pt-6 pb-0">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl ring-4 ring-white/40 overflow-hidden">
                <AvatarDisplay avatar={user?.avatar} username={user?.username} size={64}/>
              </div>
              <button onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-sky flex items-center justify-center shadow-md">
                <Camera size={11}/>
              </button>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {editUsername ? (
                <div className="flex items-center gap-1.5 mb-1">
                  <input value={newUsername} onChange={e => { setNewUsername(e.target.value); setUsernameErr(''); }}
                    className="flex-1 px-2 py-1 rounded-lg border border-white/60 text-sm font-bold outline-none bg-white/20 text-white placeholder-white/60 min-w-0"
                    maxLength={30} autoFocus/>
                  <button onClick={handleSaveUsername} disabled={savingUsername}
                    className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center flex-shrink-0">
                    {savingUsername ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={13}/>}
                  </button>
                  <button onClick={() => { setEditUsername(false); setUsernameErr(''); setNewUsername(user?.username||''); }}
                    className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center flex-shrink-0">
                    <X size={13}/>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h1 className="font-display text-xl text-white leading-tight truncate">{user?.username}</h1>
                  <button onClick={() => { setEditUsername(true); setNewUsername(user?.username||''); }}
                    className="p-1 rounded-md bg-white/20 flex-shrink-0"><Edit2 size={11} className="text-white"/></button>
                </div>
              )}
              {usernameErr && <p className="text-[10px] text-rose-200 mb-0.5">{usernameErr}</p>}
              <div className="flex items-center gap-2">
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold text-white">Lv {user?.level || 1}</span>
                <span className="flex items-center gap-1 bg-amber-400/30 rounded-full px-2 py-0.5">
                  <Star size={9} className="text-amber-200 fill-amber-200"/>
                  <span className="text-[11px] font-bold text-white">{user?.xp || 0} XP</span>
                </span>
                <span className="flex items-center gap-1 bg-amber-400/30 rounded-full px-2 py-0.5">
                  <span className="text-[11px]">🪙</span>
                  <span className="text-[11px] font-bold text-white">{user?.coins ?? 0}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-white/70 mb-1">
              <span>To Level {(user?.level || 1) + 1}</span>
              <span>{currentXP}/{xpForLevel} XP</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width:`${xpPct}%` }}/>
            </div>
          </div>
          <div className="h-4"/>
        </div>

        {/* Desktop */}
        <div className="hidden md:block relative px-8 pt-8 pb-0">
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl ring-4 ring-white/40 overflow-hidden">
                <AvatarDisplay avatar={user?.avatar} username={user?.username} size={96}/>
              </div>
              <button onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-sky flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Camera size={15}/>
              </button>
            </div>
            <div className="flex-1 min-w-0">
              {editUsername ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={newUsername} onChange={e => { setNewUsername(e.target.value); setUsernameErr(''); }}
                    className="px-3 py-1.5 rounded-xl border-2 border-white/60 text-base font-bold outline-none bg-white/20 text-white placeholder-white/60 w-56 min-w-0"
                    maxLength={30} autoFocus/>
                  <button onClick={handleSaveUsername} disabled={savingUsername}
                    className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 flex-shrink-0">
                    {savingUsername ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={15}/>}
                  </button>
                  <button onClick={() => { setEditUsername(false); setUsernameErr(''); setNewUsername(user?.username||''); }}
                    className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 flex-shrink-0">
                    <X size={15}/>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-3xl text-white leading-tight truncate">{user?.username}</h1>
                  <button onClick={() => { setEditUsername(true); setNewUsername(user?.username||''); }}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0">
                    <Edit2 size={14} className="text-white"/>
                  </button>
                </div>
              )}
              {usernameErr && <p className="text-xs text-rose-200 mb-1">{usernameErr}</p>}
              <p className="text-sm text-white/75 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-white/60">
                  Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
                </span>
                <span className="flex items-center gap-1 bg-amber-400/30 rounded-full px-2.5 py-1">
                  <span className="text-sm">🪙</span>
                  <span className="text-xs font-bold text-white">{user?.coins ?? 0} coins</span>
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
              <div className="font-display text-5xl text-white leading-none">{user?.level || 1}</div>
              <div className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">Level</div>
              <div className="flex items-center justify-center gap-1 mt-2 bg-amber-400/30 rounded-full px-3 py-1">
                <Star size={11} className="text-amber-200 fill-amber-200"/>
                <span className="text-xs font-bold text-white">{user?.xp || 0} XP</span>
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

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl border"
        style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all
                ${activeTab === tab.id
                  ? 'bg-sky text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}>
              <Icon size={15}/>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <div className="rounded-3xl p-4 md:p-6 border"
        style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)' }}>

        {activeTab === 'profile' && (
          <div className="space-y-5">
            {/* Stats */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-display text-xl text-gray-800 dark:text-gray-100">Stats</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <History size={11}/> All Time
                </span>
                {statsLoading && <span className="w-3 h-3 border-2 border-sky/40 border-t-sky rounded-full animate-spin ml-1"/>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <StatCard Icon={BookOpen}    iconCls="text-sky"         bg="bg-sky/10"                             label="Played"     val={statsLoading ? '…' : allPlayed}     loading={statsLoading}/>
                <StatCard Icon={CheckCircle} iconCls="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-900/20" label="Completed"  val={statsLoading ? '…' : allCompleted}  loading={statsLoading}/>
                <StatCard Icon={TrendingUp}  iconCls="text-indigo-500"  bg="bg-indigo-50 dark:bg-indigo-900/20"   label="Avg Score"  val={statsLoading ? '…' : `${allAvg}%`} loading={statsLoading}/>
                <StatCard Icon={Flame}       iconCls="text-orange-400"  bg="bg-orange-50 dark:bg-orange-900/20"   label="Day Streak" val={`${user?.streak || 0}d`}            loading={false}/>
              </div>
            </div>

            {/* Achievement preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl text-gray-800 dark:text-gray-100">Achievements</h2>
                <button onClick={() => setActiveTab('achievements')}
                  className="text-xs font-bold text-sky hover:underline">See all →</button>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mb-3 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                  style={{ width:`${Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}%` }}/>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {ACHIEVEMENTS.slice(0, 6).map(ach => (
                  <AchTile key={ach.key} ach={ach} earned={unlocked.has(ach.key)}/>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'character' && (
          <CharacterTab user={user} onUpdate={refreshUser}/>
        )}

        {activeTab === 'achievements' && (
          <AchievementsTab unlocked={unlocked} earnedCount={earnedCount}/>
        )}
      </div>

      {showAvatarModal && (
        <AvatarModal current={user?.avatar || ''} onClose={() => setShowAvatarModal(false)} onSave={handleSaveAvatar}/>
      )}
    </div>
  );
}
