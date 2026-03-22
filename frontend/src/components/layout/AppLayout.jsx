// ============================================================
// AppLayout
// Desktop: fixed left sidebar with full nav
// Mobile:  top bar (hamburger + logo + stat pill)
//          + bottom tab bar (Android-style, fixed px)
//          + slide-in drawer for sound/settings/logout only
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }     from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
  LayoutDashboard, BookOpen, Trophy, User, Settings,
  LogOut, Volume2, VolumeX, Star, Menu, X,
  Music, Music2, SlidersHorizontal, Sparkles, Maximize2, Minimize,
  ShoppingBag,
} from 'lucide-react';

const BOTTOM_NAV = [
  { to:'/dashboard',   icon:LayoutDashboard, label:'Home'       },
  { to:'/activities',  icon:BookOpen,        label:'Activities' },
  { to:'/leaderboard', icon:Trophy,          label:'Boards'     },
  { to:'/profile',     icon:User,            label:'Profile'    },
  { to:'/shop',        icon:ShoppingBag,     label:'Shop'       },
];

const SIDEBAR_NAV = [
  { to:'/dashboard',   icon:LayoutDashboard, label:'Home'        },
  { to:'/activities',  icon:BookOpen,        label:'Activities'  },
  { to:'/leaderboard', icon:Trophy,          label:'Leaderboard' },
  { to:'/profile',     icon:User,            label:'My Profile'  },
  { to:'/shop',        icon:ShoppingBag,     label:'Shop'        },
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
        style={{ background: 'var(--bg-card-grad)', border: '1px solid var(--border-color)' }}>
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

function DesktopSidebar({ user, settings, soundOn, xpPct, currentXP,
                          toggleSound, updateSettings, onLogoutClick,
                          isFullscreen, toggleFullscreen }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-white"/>
          </div>
          <span className="font-display text-2xl text-sky">ReadAble</span>
        </div>
      </div>

      <div className="px-4 py-4 mx-3 mt-3 rounded-2xl border border-sky/20 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,rgba(77,150,255,0.08),rgba(107,203,119,0.06))' }}>
        <div className="flex items-center gap-3">
          <SidebarAvatar avatar={user?.avatar} username={user?.username}/>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-gray-800 dark:text-gray-200">{user?.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Level {user?.level || 1}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 rounded-full px-2 py-0.5">
              <Star size={11} className="text-amber-500 fill-amber-500"/>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{user?.xp || 0}</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 rounded-full px-2 py-0.5">
              <span className="text-xs">🪙</span>
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

      <nav className="flex-1 px-3 mt-4 space-y-1">
        {SIDEBAR_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
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

      <div className="px-3 pb-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1 flex-shrink-0">
        <button onClick={toggleSound}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                     text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
          {soundOn ? <Volume2 size={20} className="text-emerald-500 flex-shrink-0"/> : <VolumeX size={20} className="flex-shrink-0"/>}
          <span className="text-gray-700 dark:text-gray-300">Sound: {soundOn ? 'On' : 'Off'}</span>
        </button>
        {soundOn && (
          <div className="px-1 pb-1">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 mb-1.5">
              <div className="flex items-center gap-2">
                <Music size={14} className={settings.bg_music_enabled ? 'text-purple-500' : 'text-gray-400'}/>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Music</span>
              </div>
              <button onClick={() => updateSettings({ bg_music_enabled: !settings.bg_music_enabled })}
                className={`relative w-10 h-5 rounded-full transition-colors duration-300 flex-shrink-0
                            ${settings.bg_music_enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300
                                 ${settings.bg_music_enabled ? 'translate-x-5' : 'translate-x-0.5'}`}/>
              </button>
            </div>
            {settings.bg_music_enabled && (
              <div className="grid grid-cols-4 gap-1">
                {[{key:'calm',Icon:Music,label:'Calm'},{key:'playful',Icon:Music2,label:'Playful'},{key:'focus',Icon:SlidersHorizontal,label:'Focus'},{key:'fantasy',Icon:Sparkles,label:'Fantasy'}].map(({key,Icon,label})=>{
                  const active=settings.bg_music_theme===key;
                  return(<button key={key} onClick={()=>updateSettings({bg_music_theme:key})} className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-bold transition-all ${active?'bg-purple-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}><Icon size={14}/>{label}</button>);
                })}
              </div>
            )}
          </div>
        )}
        <button onClick={toggleFullscreen}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                     text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
          {isFullscreen ? <Minimize size={20} className="text-indigo-500 flex-shrink-0"/> : <Maximize2 size={20} className="flex-shrink-0"/>}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
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

function MobileDrawer({ open, onClose, user, settings, soundOn, xpPct, currentXP,
                        toggleSound, updateSettings, onLogoutClick, isFullscreen, toggleFullscreen }) {
  return (
    <div className={`lg:hidden fixed inset-0 z-[9998] transition-all duration-300 ${open?'opacity-100 pointer-events-auto':'opacity-0 pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open?'opacity-100':'opacity-0'}`} onClick={onClose}/>
      <div className={`absolute top-0 left-0 bottom-0 w-4/5 max-w-xs flex flex-col transition-transform duration-300 ease-out shadow-2xl ${open?'translate-x-0':'-translate-x-full'}`}
        style={{ background:'var(--bg-sidebar)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky flex items-center justify-center flex-shrink-0"><BookOpen size={16} className="text-white"/></div>
            <span className="font-display text-2xl text-sky">ReadAble</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} className="text-gray-500 dark:text-gray-400"/>
          </button>
        </div>

        <div className="px-4 py-3 mx-3 mt-3 rounded-2xl border border-sky/20 flex-shrink-0"
          style={{ background:'linear-gradient(135deg,rgba(77,150,255,0.08),rgba(107,203,119,0.06))' }}>
          <div className="flex items-center gap-3">
            <SidebarAvatar avatar={user?.avatar} username={user?.username}/>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate text-gray-800 dark:text-gray-200">{user?.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Level {user?.level || 1}</p>
            </div>
            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 rounded-full px-2 py-0.5 flex-shrink-0">
              <Star size={11} className="text-amber-500 fill-amber-500"/>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{user?.xp || 0}</span>
            </div>
          </div>
          <div className="mt-2.5">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky to-emerald-400 rounded-full" style={{ width:`${xpPct}%` }}/>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{currentXP}/50 XP to Level {(user?.level || 1) + 1}</p>
          </div>
        </div>

        <div className="px-3 mt-4">
          <NavLink to="/settings" onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                isActive ? 'bg-sky text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}>
            <Settings size={20}/>Settings
          </NavLink>
        </div>

        <div className="flex-1"/>

        <div className="px-3 pb-6 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1 flex-shrink-0">
          <button onClick={toggleSound}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                       text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            {soundOn ? <Volume2 size={20} className="text-emerald-500 flex-shrink-0"/> : <VolumeX size={20} className="flex-shrink-0"/>}
            <span className="text-gray-700 dark:text-gray-300">Sound: {soundOn ? 'On' : 'Off'}</span>
          </button>
          {soundOn && (
            <div className="px-1 pb-1">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 mb-1.5">
                <div className="flex items-center gap-2">
                  <Music size={14} className={settings.bg_music_enabled ? 'text-purple-500' : 'text-gray-400'}/>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Music</span>
                </div>
                <button onClick={() => updateSettings({ bg_music_enabled: !settings.bg_music_enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ${settings.bg_music_enabled?'bg-purple-500':'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${settings.bg_music_enabled?'translate-x-5':'translate-x-0.5'}`}/>
                </button>
              </div>
              {settings.bg_music_enabled && (
                <div className="grid grid-cols-4 gap-1">
                  {[{key:'calm',Icon:Music,label:'Calm'},{key:'playful',Icon:Music2,label:'Playful'},{key:'focus',Icon:SlidersHorizontal,label:'Focus'},{key:'fantasy',Icon:Sparkles,label:'Fantasy'}].map(({key,Icon,label})=>{
                    const active=settings.bg_music_theme===key;
                    return(<button key={key} onClick={()=>updateSettings({bg_music_theme:key})} className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-bold transition-all ${active?'bg-purple-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}><Icon size={14}/>{label}</button>);
                  })}
                </div>
              )}
            </div>
          )}
          <button onClick={toggleFullscreen}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                       text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            {isFullscreen ? <Minimize size={20} className="text-indigo-500 flex-shrink-0"/> : <Maximize2 size={20} className="flex-shrink-0"/>}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
          <button onClick={onLogoutClick}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold
                       text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
            <LogOut size={20}/>Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  const location = useLocation();
  return (
    <nav className="lg:hidden flex-shrink-0" style={{
      display:'flex', alignItems:'stretch',
      height:62,
      paddingBottom:'env(safe-area-inset-bottom, 0px)',
      background:'var(--bg-sidebar)',
      borderTop:'1px solid var(--border-color)',
      boxShadow:'0 -2px 16px rgba(0,0,0,0.07)',
      fontSize:'16px',
    }}>
      {BOTTOM_NAV.map(({ to, icon: Icon, label }) => {
        const isActive = location.pathname === to ||
          (to !== '/dashboard' && location.pathname.startsWith(to));
        return (
          <NavLink key={to} to={to} style={{
            flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            gap:3, textDecoration:'none', padding:'6px 2px',
            position:'relative',
          }}>
            {isActive && (
              <div style={{
                position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                width:28, height:3, borderRadius:'0 0 3px 3px', background:'#60B8F5',
              }}/>
            )}
            <div style={{
              width:36, height:26, display:'flex', alignItems:'center', justifyContent:'center',
              borderRadius:9,
              background: isActive ? 'rgba(96,184,245,0.13)' : 'transparent',
              transition:'background 0.15s',
            }}>
              <Icon size={20} style={{ color: isActive ? '#60B8F5' : '#9ca3af', transition:'color 0.15s' }}/>
            </div>
            <span style={{
              fontSize:10, fontWeight: isActive ? 700 : 500, lineHeight:1,
              whiteSpace:'nowrap',
              color: isActive ? '#60B8F5' : '#9ca3af',
              transition:'color 0.15s',
            }}>
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AppLayout() {
  const { user, logout }             = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate                     = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [isFullscreen,    setIsFullscreen]    = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const soundOn = settings.tts_enabled || settings.bg_music_enabled;
  const toggleSound = () => updateSettings({ tts_enabled: !soundOn, bg_music_enabled: !soundOn && settings.bg_music_enabled });
  const currentXP = (user?.xp || 0) % 50;
  const xpPct = Math.min(100, Math.round((currentXP / 50) * 100));

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!(document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement));
    ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange'].forEach(e=>document.addEventListener(e,onChange));
    return () => ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange'].forEach(e=>document.removeEventListener(e,onChange));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      const isFs = !!(document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement);
      if (!isFs) { if(el.requestFullscreen) await el.requestFullscreen(); else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen(); }
      else { if(document.exitFullscreen) await document.exitFullscreen(); else if(document.webkitExitFullscreen) document.webkitExitFullscreen(); }
    } catch(_) {}
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'var(--bg-primary)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col shadow-card"
        style={{ background:'var(--bg-sidebar)', borderRight:'1px solid var(--border-color)' }}>
        <DesktopSidebar
          user={user} settings={settings} soundOn={soundOn} xpPct={xpPct} currentXP={currentXP}
          toggleSound={toggleSound} updateSettings={updateSettings}
          isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}
          onLogoutClick={() => setShowLogoutModal(true)}
        />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        user={user} settings={settings} soundOn={soundOn} xpPct={xpPct} currentXP={currentXP}
        toggleSound={toggleSound} updateSettings={updateSettings}
        isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}
        onLogoutClick={() => { setDrawerOpen(false); setShowLogoutModal(true); }}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar — all fixed px, never inherits html font-size */}
        <header className="lg:hidden flex-shrink-0" style={{
          display:'flex', alignItems:'center', height:52, padding:'0 10px',
          background:'var(--bg-sidebar)', borderBottom:'1px solid var(--border-color)',
          fontSize:'16px', fontFamily:'inherit', boxSizing:'border-box',
        }}>
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" style={{
            width:38, height:38, flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'none', background:'transparent', cursor:'pointer', borderRadius:10, padding:0,
          }}>
            <Menu size={20} style={{ color:'var(--text-primary)', opacity:0.7 }}/>
          </button>

          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, minWidth:0, overflow:'hidden' }}>
            <div style={{ width:24, height:24, borderRadius:7, flexShrink:0, background:'#60B8F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BookOpen size={13} color="white"/>
            </div>
            <span style={{ fontFamily:'"Fredoka One", cursive', fontSize:18, color:'#60B8F5', lineHeight:1, whiteSpace:'nowrap' }}>
              ReadAble
            </span>
          </div>

          <div style={{ flexShrink:0 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:10, background:'var(--border-color)', whiteSpace:'nowrap' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" style={{ flexShrink:0 }}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', lineHeight:1 }}>{user?.xp || 0} XP</span>
              <span style={{ fontSize:12, color:'#9ca3af', lineHeight:1 }}>·</span>
              <span style={{ fontSize:12, fontWeight:700, color:'#9ca3af', lineHeight:1 }}>Lv {user?.level || 1}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet/>
        </main>

        {/* Bottom nav bar */}
        <BottomNav/>
      </div>

      {showLogoutModal && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)}/>}
    </div>
  );
}
