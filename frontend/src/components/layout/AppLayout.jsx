// ============================================================
// AppLayout — fixed left sidebar + scrollable main content
// Desktop-focused. SidebarContent lives outside AppLayout so
// React never remounts it when AppLayout re-renders.
// ============================================================
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth }     from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
  LayoutDashboard, BookOpen, Trophy, User, Settings,
  LogOut, Volume2, VolumeX, Star, Menu, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to:'/dashboard',   icon:LayoutDashboard, label:'Dashboard'   },
  { to:'/activities',  icon:BookOpen,        label:'Activities'  },
  { to:'/leaderboard', icon:Trophy,          label:'Leaderboard' },
  { to:'/profile',     icon:User,            label:'My Profile'  },
  { to:'/settings',    icon:Settings,        label:'Settings'    },
];

function SidebarAvatar({ avatar, username }) {
  const isImage = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  if (isImage) return (
    <img src={avatar} alt="avatar"
      className="w-10 h-10 rounded-2xl object-cover flex-shrink-0"
      onError={e => { e.currentTarget.style.display = 'none'; }} />
  );
  const isEmoji = avatar && /\p{Emoji_Presentation}/u.test(avatar);
  return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky to-indigo-500
                    flex items-center justify-center text-white font-bold flex-shrink-0">
      {isEmoji
        ? <span className="text-xl leading-none">{avatar}</span>
        : <span className="text-sm">{username?.[0]?.toUpperCase() || '?'}</span>}
    </div>
  );
}

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-pop"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-display text-xl text-gray-800 dark:text-gray-100 mb-1">Sign Out?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Your progress is saved. You can sign back in any time.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border text-sm font-semibold
                       text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ borderColor: 'var(--border-color)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold
                       hover:bg-rose-600 transition-colors flex items-center justify-center gap-2">
            <LogOut size={16}/> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ user, settings, soundOn, xpPct, currentXP,
                           toggleSound, onLogoutClick, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo + optional close button (mobile) */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} className="text-white"/>
            </div>
            <span className="font-display text-2xl text-sky">ReadAble</span>
          </div>
          {onClose && (
            <button onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X size={20} className="text-gray-500 dark:text-gray-400"/>
            </button>
          )}
        </div>
      </div>

      {/* User card */}
      <div className="px-4 py-4 mx-3 mt-3 rounded-2xl border border-sky/20 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,rgba(77,150,255,0.08),rgba(107,203,119,0.06))' }}>
        <div className="flex items-center gap-3">
          <SidebarAvatar avatar={user?.avatar} username={user?.username}/>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-gray-800 dark:text-gray-200">{user?.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Level {user?.level || 1}</p>
          </div>
          <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 rounded-full px-2 py-1 flex-shrink-0">
            <Star size={11} className="text-amber-500 fill-amber-500"/>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{user?.xp || 0}</span>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }}/>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{currentXP}/50 XP to Level {(user?.level || 1) + 1}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-sky text-white shadow-md shadow-sky/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}>
            <Icon size={20}/>{label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1 flex-shrink-0">
        <button onClick={toggleSound}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                     text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
          {soundOn
            ? <Volume2 size={20} className="text-emerald-500 flex-shrink-0"/>
            : <VolumeX size={20} className="flex-shrink-0"/>}
          <div className="text-left">
            <span>Sound: {soundOn ? 'On' : 'Off'}</span>
            {soundOn && (
              <span className="block text-[10px] text-gray-400 leading-none mt-0.5">
                {settings.tts_enabled && 'Voice'}
                {settings.tts_enabled && settings.bg_music_enabled && ' · '}
                {settings.bg_music_enabled && 'Music'}
              </span>
            )}
          </div>
        </button>
        <button onClick={onLogoutClick}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                     text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
          <LogOut size={20}/>Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout }             = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate                     = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const soundOn      = settings.tts_enabled || settings.bg_music_enabled;
  const toggleSound  = () => updateSettings({
    tts_enabled: !soundOn,
    bg_music_enabled: !soundOn && settings.bg_music_enabled,
  });
  const currentXP = (user?.xp || 0) % 50;
  const xpPct     = Math.min(100, Math.round((currentXP / 50) * 100));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Desktop sidebar (always visible ≥ lg) ─────────── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col shadow-card"
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)' }}>
        <SidebarContent
          user={user} settings={settings} soundOn={soundOn}
          xpPct={xpPct} currentXP={currentXP}
          toggleSound={toggleSound}
          onLogoutClick={() => setShowLogoutModal(true)}
        />
      </aside>

      {/* ── Mobile full-screen sidebar overlay ─────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[9998]" onClick={closeDrawer}>
          {/* Full-screen sidebar — not a partial drawer */}
          <div className="absolute inset-0 flex flex-col"
            style={{ background: 'var(--bg-sidebar)' }}
            onClick={e => e.stopPropagation()}>
            <SidebarContent
              user={user} settings={settings} soundOn={soundOn}
              xpPct={xpPct} currentXP={currentXP}
              toggleSound={toggleSound}
              onLogoutClick={() => { closeDrawer(); setShowLogoutModal(true); }}
              onClose={closeDrawer}
            />
          </div>
        </div>
      )}

      {/* ── Main column ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0 shadow-sm"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
            <Menu size={22} className="text-gray-700 dark:text-gray-300"/>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-sky flex items-center justify-center flex-shrink-0">
              <BookOpen size={13} className="text-white"/>
            </div>
            <span className="font-display text-xl text-sky">ReadAble</span>
          </div>
          <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 rounded-full px-2.5 py-1 flex-shrink-0">
            <Star size={12} className="text-amber-500 fill-amber-500"/>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{user?.xp || 0}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet/>
        </main>
      </div>

      {showLogoutModal && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)}/>
      )}
    </div>
  );
}
