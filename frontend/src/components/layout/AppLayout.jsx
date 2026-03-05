// ============================================================
// AppLayout — shared shell with sidebar navigation
// ============================================================
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
  LayoutDashboard, BookOpen, Trophy, User, Settings,
  LogOut, Menu, X, Volume2, VolumeX, Star
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/activities',  icon: BookOpen,         label: 'Activities' },
  { to: '/leaderboard', icon: Trophy,           label: 'Leaderboard' },
  { to: '/profile',     icon: User,             label: 'My Profile' },
  { to: '/settings',    icon: Settings,         label: 'Settings' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const toggleTTS = () => updateSettings({ tts_enabled: !settings.tts_enabled });

  // XP progress toward next level
  const xpForNextLevel = ((user?.level || 1)) * 50;
  const currentXP = (user?.xp || 0) % 50;
  const xpPct = Math.min(100, Math.round((currentXP / 50) * 100));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-3xl">📚</span>
          <span className="font-display text-2xl text-sky">ReadAble</span>
        </div>
      </div>

      {/* User mini-profile */}
      <div className="px-4 py-4 mx-3 mt-3 rounded-2xl bg-gradient-to-br from-sky/10 to-mint/10 border border-sky/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-coral to-sunny flex items-center justify-center text-white font-display text-lg">
            {user?.avatar === 'star' ? '⭐' : user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-gray-800 dark:text-gray-200">{user?.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Level {user?.level || 1}</p>
          </div>
          <div className="flex items-center gap-1 bg-sunny/20 rounded-full px-2 py-1">
            <Star size={12} className="text-sunny fill-sunny" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{user?.xp || 0}</span>
          </div>
        </div>
        {/* XP bar */}
        <div className="mt-3">
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{currentXP}/50 XP to Level {(user?.level || 1) + 1}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-200
               ${isActive
                 ? 'bg-sky text-white shadow-md shadow-sky/30'
                 : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
               }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-1 border-t border-gray-100 dark:border-gray-700 pt-3">
        <button onClick={toggleTTS}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
          {settings.tts_enabled ? <Volume2 size={20} className="text-mint" /> : <VolumeX size={20} />}
          {settings.tts_enabled ? 'Voice: On' : 'Voice: Off'}
        </button>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold text-coral hover:bg-coral/10 transition-colors">
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col shadow-card"
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 flex flex-col shadow-2xl"
            style={{ background: 'var(--bg-sidebar)' }}>
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
              <X size={22} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 shadow-sm"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <Menu size={22} />
          </button>
          <span className="font-display text-xl text-sky">📚 ReadAble</span>
          <div className="ml-auto flex items-center gap-1 bg-sunny/20 rounded-full px-3 py-1">
            <Star size={14} className="text-sunny fill-sunny" />
            <span className="text-sm font-bold">{user?.xp || 0}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
