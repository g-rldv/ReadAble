// ============================================================
// AppLayout.jsx — updated:
// 1. Logo: WHITE logo on dark themes, BLACK logo on light themes
// 2. "ReadAble" text shown beside logo everywhere
// 3. Improved borders throughout for visibility across themes
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }     from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { characterById, DEFAULT_CHARACTER_ID } from '../character/CHARACTER_CATALOG';
import CoinIcon from '../ui/CoinIcon';
import {
  LayoutDashboard, BookOpen, User, Settings,
  LogOut, Volume2, VolumeX, Star, X,
  Music, Music2, SlidersHorizontal, Sparkles, Maximize2, Minimize,
  ShoppingBag,
} from 'lucide-react';

const BOTTOM_NAV = [
  { to:'/dashboard',   Icon:LayoutDashboard, label:'Home'       },
  { to:'/activities',  Icon:BookOpen,        label:'Activities' },
  { to:'/profile',     Icon:User,            label:'Profile'    },
  { to:'/shop',        Icon:ShoppingBag,     label:'Shop'       },
];

const SIDEBAR_NAV = [
  { to:'/dashboard',   Icon:LayoutDashboard, label:'Home'        },
  { to:'/activities',  Icon:BookOpen,        label:'Activities'  },
  { to:'/profile',     Icon:User,            label:'My Profile'  },
  { to:'/shop',        Icon:ShoppingBag,     label:'Shop'        },
  { to:'/settings',    Icon:Settings,        label:'Settings'    },
];

// ── Theme darkness detection ──────────────────────────────────
// DARK themes use WHITE logo; LIGHT themes use BLACK logo
const DARK_THEMES = new Set(['night']);

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => {
      const html = document.documentElement;
      setIsDark(
        html.classList.contains('dark') ||
        html.getAttribute('data-theme') === 'night'
      );
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// ── Smart Logo — PNG + "ReadAble" text fallback ───────────────
// Dark theme  → white logo PNG  (readablelogowhite.png)
// Light theme → black logo PNG  (readablelogoblack.png)
function SmartLogo({ height = 28 }) {
  const isDark = useIsDark();
  const [failed, setFailed] = useState(false);
 
  // src: white logo for dark bg, black logo for light bg
  const src = isDark ? '/readablelogowhite.png' : '/readablelogoblack.png';
 
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {!failed ? (
        <img
          key={src}
          src={src}
          alt="ReadAble"
          style={{
            height,
            width: 'auto',
            display: 'block',
            objectFit: 'contain',
            // App-icon style: dark border, rounded corners
            border: '2px solid #1a1a2e',
            borderRadius: Math.round(height * 0.22),
            boxShadow: '0 2px 0 #1a1a2e',
            padding: 2,
            background: isDark ? '#1a1a2e' : '#ffffff',
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div style={{
          width: height,
          height: height,
          borderRadius: Math.round(height * 0.22),
          border: '2px solid #1a1a2e',
          boxShadow: '0 2px 0 #1a1a2e',
          background: '#60B8F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <BookOpen size={height * 0.6} color="white" />
        </div>
      )}
      <span style={{
        fontFamily: '"Fredoka One", cursive',
        fontSize: height * 1.1,
        lineHeight: 1,
        color: isDark ? '#F0ECFF' : '#2C1810',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}>
        ReadAble
      </span>
    </div>
  );
}

// ── Bottom nav constants ──────────────────────────────────────
const BAR_H = 62, POP_H = 16, CIRC = 54, CIRC_R = 27;
const NUM = BOTTOM_NAV.length, VB_W = NUM * 100, VB_H = BAR_H;
const NOTCH_R = 46, NOTCH_D = 30, NOTCH_BV = 26;

function buildPath(i) {
  const cx = i * 100 + 50;
  return [
    `M 0 0`,
    `H ${cx - NOTCH_R - NOTCH_BV}`,
    `C ${cx - NOTCH_R + 9} 0, ${cx - NOTCH_R} ${NOTCH_D}, ${cx} ${NOTCH_D}`,
    `C ${cx + NOTCH_R} ${NOTCH_D}, ${cx + NOTCH_R - 9} 0, ${cx + NOTCH_R + NOTCH_BV} 0`,
    `H ${VB_W} V ${VB_H} H 0 Z`,
  ].join(' ');
}

function BottomNavBar() {
  const location = useLocation();
  const isDark = useIsDark();
  const NAV_BG = isDark ? '#1E1840' : '#FFFFFF';

  const activeIdx = (() => {
    const i = BOTTOM_NAV.findIndex(({ to }) =>
      location.pathname === to ||
      (to !== '/dashboard' && location.pathname.startsWith(to)));
    return i < 0 ? 0 : i;
  })();

  const { Icon: ActiveIcon } = BOTTOM_NAV[activeIdx];

  return (
    <nav className="md:hidden" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: BAR_H + POP_H,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      fontSize: '16px', fontFamily: 'inherit',
      overflow: 'visible', zIndex: 50,
    }}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden="true"
        style={{
          position: 'absolute', bottom: 0, left: 0,
          width: '100%', height: BAR_H, display: 'block', overflow: 'visible',
          filter: 'drop-shadow(0 -3px 12px rgba(0,0,0,0.18))',
        }}>
        <path d={buildPath(activeIdx)} style={{
          fill: NAV_BG,
          transition: 'd 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
        }}/>
      </svg>

      <div style={{
        position: 'absolute',
        left: `${(activeIdx * 2 + 1) / (NUM * 2) * 100}%`,
        bottom: BAR_H - CIRC_R,
        transform: 'translateX(-50%)',
        width: CIRC, height: CIRC, borderRadius: '50%',
        background: 'linear-gradient(145deg, #7EC9F7 0%, #4D96FF 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 0 5px ${NAV_BG}, 0 8px 24px rgba(77,150,255,0.45)`,
        transition: 'left 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 10,
      }}>
        <ActiveIcon size={22} color="white" strokeWidth={2}/>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: BAR_H, display: 'flex' }}>
        {BOTTOM_NAV.map(({ to, Icon, label }, i) => {
          const isActive = i === activeIdx;
          return (
            <NavLink key={to} to={to} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'flex-end',
              paddingBottom: 10, textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}>
              {!isActive && <Icon size={20} strokeWidth={1.8} style={{ color: isDark ? '#6b7280' : '#9ca3af', marginBottom: 4 }}/>}
              {isActive  && <div style={{ height: 24 }}/>}
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                lineHeight: 1, whiteSpace: 'nowrap',
                color: isActive ? '#4D96FF' : (isDark ? '#6b7280' : '#9ca3af'),
              }}>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

// ── Character avatar for sidebar ──────────────────────────────
function SidebarCharacter({ equippedCharacterId, username, size = 40 }) {
  const charId = equippedCharacterId || DEFAULT_CHARACTER_ID;
  const char   = characterById(charId);
  const src    = char
    ? `/characters/${char.file}`
    : `/characters/char_common_gray.png`;

  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      overflow: 'hidden',
      background: 'linear-gradient(135deg, rgba(96,184,245,0.15), rgba(107,203,119,0.1))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img
        src={src}
        alt={char?.name || username?.[0] || '?'}
        style={{ width: '90%', height: '90%', objectFit: 'contain' }}
        onError={e => { e.currentTarget.style.opacity = '0.3'; }}
      />
    </div>
  );
}

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-pop"
        style={{ background: 'var(--bg-card-grad)', border: '2px solid var(--border-color)' }}>
        <h3 className="font-display text-xl text-gray-800 dark:text-gray-100 mb-1">Sign Out?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Your progress is saved. You can sign back in any time.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                       text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ border: '2px solid var(--border-color)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold
                       hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
            style={{ border: '2px solid #dc2626' }}>
             Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function MusicPicker({ settings, updateSettings }) {
  if (!settings.bg_music_enabled) return null;
  return (
    <div className="grid grid-cols-4 gap-1 mt-1.5">
      {[
        { key:'calm',    I:Music,             l:'Calm'    },
        { key:'playful', I:Music2,            l:'Playful' },
        { key:'focus',   I:SlidersHorizontal, l:'Focus'   },
        { key:'fantasy', I:Sparkles,          l:'Fantasy' },
      ].map(({ key, I, l }) => {
        const a = settings.bg_music_theme === key;
        return (
          <button key={key} onClick={() => updateSettings({ bg_music_theme: key })}
            style={{ border: a ? '2px solid #a855f7' : '2px solid var(--border-color)' }}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-bold transition-all
                        ${a ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
            <I size={14}/>{l}
          </button>
        );
      })}
    </div>
  );
}

function BottomControls({ soundOn, settings, toggleSound, updateSettings,
                          isFullscreen, toggleFullscreen, onLogoutClick }) {
  return (
    <div className="px-4 pb-6 pt-3 space-y-1 flex-shrink-0"
      style={{ borderTop: '2px solid var(--border-color)' }}>
      <button onClick={toggleSound}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                   text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        style={{ border: '2px solid var(--border-color)' }}>
        {soundOn ? <Volume2 size={20} className="text-emerald-500 flex-shrink-0"/> : <VolumeX size={20} className="flex-shrink-0"/>}
        <span className="text-gray-700 dark:text-gray-300">Sound: {soundOn ? 'On' : 'Off'}</span>
      </button>

      {soundOn && (
        <div className="px-1 pb-1">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-1.5"
            style={{ background: 'var(--bg-primary)', border: '2px solid var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <Music size={14} className={settings.bg_music_enabled ? 'text-purple-500' : 'text-gray-400'}/>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Music</span>
            </div>
            <button onClick={() => updateSettings({ bg_music_enabled: !settings.bg_music_enabled })}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0
                          ${settings.bg_music_enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                               ${settings.bg_music_enabled ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </button>
          </div>
          <MusicPicker settings={settings} updateSettings={updateSettings}/>
        </div>
      )}

      <button onClick={toggleFullscreen}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                   text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        style={{ border: '2px solid var(--border-color)' }}>
        {isFullscreen ? <Minimize size={20} className="text-indigo-500 flex-shrink-0"/> : <Maximize2 size={20} className="flex-shrink-0"/>}
        <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
      </button>

      <button onClick={onLogoutClick}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                   text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
        style={{ border: '2px solid rgba(239,68,68,0.4)' }}>
        <LogOut size={20}/>Sign Out
      </button>
    </div>
  );
}

function DesktopSidebar({ user, settings, soundOn, xpPct, currentXP,
                          toggleSound, updateSettings, onLogoutClick,
                          isFullscreen, toggleFullscreen }) {
  const equippedCharId = user?.equipped?.character || DEFAULT_CHARACTER_ID;

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '2px solid var(--border-color)' }}>
        <SmartLogo height={26} />
      </div>

      <div className="px-4 py-4 mx-3 mt-3 rounded-2xl flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg,rgba(77,150,255,0.08),rgba(107,203,119,0.06))',
          border: '2px solid var(--border-color)',
        }}>
        <div className="flex items-center gap-3">
          <SidebarCharacter equippedCharacterId={equippedCharId} username={user?.username} size={40}/>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-gray-800 dark:text-gray-200">{user?.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Level {user?.level || 1}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 rounded-full px-2 py-0.5"
              style={{ border: '1px solid rgba(251,191,36,0.4)' }}>
              <Star size={11} className="text-amber-500 fill-amber-500"/>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{user?.xp || 0}</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 rounded-full px-2 py-0.5"
              style={{ border: '1px solid rgba(251,191,36,0.3)' }}>
              <CoinIcon size={12} />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{user?.coins || 0}</span>
            </div>
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

      <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
        {SIDEBAR_NAV.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-sky text-white shadow-md shadow-sky/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            style={({ isActive }) => ({
              border: isActive ? '2px solid rgba(96,184,245,0.5)' : '2px solid transparent',
            })}>
            <Icon size={20}/>{label}
          </NavLink>
        ))}
      </nav>

      <BottomControls
        soundOn={soundOn} settings={settings}
        toggleSound={toggleSound} updateSettings={updateSettings}
        isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}
        onLogoutClick={onLogoutClick}
      />
    </div>
  );
}

export default function AppLayout() {
  const { user, logout }             = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate                     = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isFullscreen,    setIsFullscreen]    = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const soundOn = settings.tts_enabled || settings.bg_music_enabled;
  const toggleSound = () => updateSettings({
    tts_enabled: !soundOn,
    bg_music_enabled: !soundOn && settings.bg_music_enabled,
  });
  const currentXP = (user?.xp || 0) % 50;
  const xpPct     = Math.min(100, Math.round((currentXP / 50) * 100));

  useEffect(() => {
    const onChange = () => setIsFullscreen(
      !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
    );
    ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange']
      .forEach(e => document.addEventListener(e, onChange));
    return () => ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange']
      .forEach(e => document.removeEventListener(e, onChange));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
      if (!isFs) {
        if (el.requestFullscreen)            await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen)    el.mozRequestFullScreen();
      } else {
        if (document.exitFullscreen)            await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen)  document.mozCancelFullScreen();
      }
    } catch (_) {}
  }, []);

  const BOTTOM_NAV_HEIGHT = BAR_H + POP_H + 4;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col shadow-card"
        style={{ background: 'var(--bg-sidebar)', borderRight: '2px solid var(--border-color)' }}>
        <DesktopSidebar
          user={user} settings={settings} soundOn={soundOn} xpPct={xpPct} currentXP={currentXP}
          toggleSound={toggleSound} updateSettings={updateSettings}
          isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}
          onLogoutClick={() => setShowLogoutModal(true)}
        />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden flex-shrink-0"
          style={{
            height: 52, padding: '0 16px',
            background: 'var(--bg-sidebar)',
            borderBottom: '2px solid var(--border-color)',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', height: '100%', gap: 8,
          }}>
            <SmartLogo height={22} />

            <div style={{ flexShrink: 0 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 10,
                background: 'var(--border-color)',
                border: '1px solid var(--border-color)',
                whiteSpace: 'nowrap',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" style={{ flexShrink: 0 }}>
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {user?.xp || 0} XP
                </span>
                <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1 }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', lineHeight: 1 }}>
                  Lv {user?.level || 1}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:pb-8"
          style={{ paddingBottom: `calc(1rem + ${BOTTOM_NAV_HEIGHT}px)` }}>
          <Outlet/>
        </main>

        <BottomNavBar/>
      </div>

      {showLogoutModal && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)}/>
      )}
    </div>
  );
}
