// ============================================================
// SettingsPage — themes, music, TTS, text size, delete account
// Delete confirmation is GitHub-style:
//   type your username → enter password → confirm
// ============================================================
import ReactDOM from 'react-dom';
import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth }     from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Sun, Heart, Star, Cloud, Leaf, Sparkles, Moon,
  Droplets, Volume2, Type, Check,
  Music, Music2, SlidersHorizontal,
  Candy, Trash2, AlertTriangle, Lock, AtSign,
} from 'lucide-react';

// ── Theme catalogue ───────────────────────────────────────────
const THEMES = [
  { key:'cotton',    label:'Cotton Candy', desc:'Soft pink & cream',     Icon:Heart,    preview:{bg:'#FFF0F5', card:'#FFFFFF', text:'#3D2645', accent:'#F472B6'} },
  { key:'sky',       label:'Blue Sky',     desc:'Baby blue & clouds',    Icon:Cloud,    preview:{bg:'#EFF8FF', card:'#FFFFFF', text:'#1E3A5F', accent:'#60B8F5'} },
  { key:'mint',      label:'Mint Fresh',   desc:'Cool mint & cream',     Icon:Leaf,     preview:{bg:'#F0FDF6', card:'#FFFFFF', text:'#1A3D2B', accent:'#34D399'} },
  { key:'sunshine',  label:'Sunshine',     desc:'Warm yellow & cream',   Icon:Sun,      preview:{bg:'#FFFBEB', card:'#FFFFFF', text:'#3D2E00', accent:'#FBBF24'} },
  { key:'lavender',  label:'Lavender',     desc:'Soft purple & lilac',   Icon:Sparkles, preview:{bg:'#F5F0FF', card:'#FFFFFF', text:'#2D1B5E', accent:'#A78BFA'} },
  { key:'peach',     label:'Peachy',       desc:'Warm peach & apricot',  Icon:Candy,    preview:{bg:'#FFF5EE', card:'#FFFFFF', text:'#3D1A00', accent:'#FB923C'} },
  { key:'bubblegum', label:'Bubblegum',    desc:'Bright & playful pink', Icon:Star,     preview:{bg:'#FFF0FA', card:'#FFF8FD', text:'#4A0A35', accent:'#EC4899'} },
  { key:'ocean',     label:'Ocean Breeze', desc:'Light aqua & seafoam',  Icon:Droplets, preview:{bg:'#ECFEFF', card:'#FFFFFF', text:'#0C3040', accent:'#22D3EE'} },
  { key:'night',     label:'Starry Night', desc:'Soft dark with pastels',Icon:Moon,     preview:{bg:'#1E1A2E', card:'#2A2540', text:'#F0EBFF', accent:'#C4B5FD'} },
];

const MUSIC_THEMES = [
  { key:'calm',    label:'Calm',    desc:'Soft piano arpeggios',      Icon:Music             },
  { key:'playful', label:'Playful', desc:'Bouncy pentatonic melody',  Icon:Music2            },
  { key:'focus',   label:'Focus',   desc:'Gentle drone & fifths',     Icon:SlidersHorizontal },
  { key:'fantasy', label:'Fantasy', desc:'Mystical minor scales',     Icon:Sparkles          },
];

const TEXT_SIZES = [
  { key:'small',  label:'Small',       sample:'text-sm'   },
  { key:'medium', label:'Medium',      sample:'text-base' },
  { key:'large',  label:'Large',       sample:'text-lg'   },
  { key:'xlarge', label:'Extra Large', sample:'text-2xl'  },
];

// ── Reusable components ───────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className="rounded-3xl p-4 md:p-6"
      style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)' }}>
      <h3 className="font-display text-lg md:text-xl mb-4 md:mb-5 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle, label, sub }) {
  return (
    <div className="flex items-center justify-between p-3 md:p-4 rounded-2xl"
      style={{ background:'var(--bg-primary)', border:'1px solid var(--border-color)' }}>
      <div>
        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <button onClick={onToggle}
        className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0
                    ${on ? 'bg-sky' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300
                         ${on ? 'translate-x-7' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ThemeCard({ theme, active, onSelect }) {
  const { Icon, label, desc, preview } = theme;
  return (
    <button onClick={() => onSelect(theme.key)}
      style={{ boxShadow: active ? '0 0 0 3px rgba(77,150,255,0.45)' : undefined }}
      className={`relative rounded-2xl overflow-hidden transition-all duration-200 text-left border-2
                  ${active ? 'border-sky scale-[1.03]' : 'border-transparent hover:border-sky/30'}`}>
      <div className="h-14 w-full" style={{ background:preview.bg }}>
        <div className="m-1.5 rounded-lg p-1.5"
          style={{ background:preview.card, border:'1px solid rgba(255,255,255,0.2)', backdropFilter:'blur(4px)' }}>
          <div className="flex items-center gap-1 mb-1">
            <div className="h-1.5 w-5 rounded-full" style={{ background:preview.accent }} />
            <div className="h-1.5 w-8 rounded-full" style={{ background:preview.text, opacity:0.25 }} />
          </div>
          <div className="flex gap-1">
            {[0.9,0.2,0.2].map((op,i) => (
              <div key={i} className="w-2 h-2 rounded" style={{ background:preview.accent, opacity:op }} />
            ))}
          </div>
        </div>
      </div>
      <div className="px-2.5 py-2" style={{ background:'var(--bg-card)' }}>
        <div className="flex items-center gap-1">
          <Icon size={12} className={active ? 'text-sky' : 'text-gray-400'} />
          <span className={`font-bold text-xs ${active ? 'text-sky' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
          {active && <Check size={10} className="text-sky ml-auto" strokeWidth={3} />}
        </div>
        <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{desc}</p>
      </div>
    </button>
  );
}

// ── Delete Account Modal — GitHub-style ───────────────────────
// User must type their exact username AND enter their password.
// No multi-step: everything on one clean screen.
function DeleteAccountModal({ username, onClose, onDeleted }) {
  const [typedName, setTypedName] = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const nameMatches = typedName === username;
  const canSubmit   = nameMatches && password.length > 0 && !loading;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await api.delete('/users/me', { data: { password } });
      onDeleted();
    } catch (err) {
      setError(err.message || 'Failed to delete account. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ background:'var(--bg-card)', border:'2px solid #f43f5e40' }}>

        {/* Red header bar */}
        <div className="bg-rose-500 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-display text-lg text-white leading-tight">Delete Account</h3>
            <p className="text-xs text-white/75 leading-tight">This action is permanent and irreversible</p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Warning bullets */}
          <ul className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            {[
              'All your progress and XP will be deleted',
              'Your achievements will be permanently lost',
              'Your account cannot be recovered',
            ].map(t => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-rose-400 flex-shrink-0 mt-px">✕</span>
                {t}
              </li>
            ))}
          </ul>

          <div className="h-px" style={{ background:'var(--border-color)' }} />

          {/* Type username */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <AtSign size={11} />
              Type your username to confirm:
              <code className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                {username}
              </code>
            </label>
            <input
              value={typedName}
              onChange={e => { setTypedName(e.target.value); setError(''); }}
              placeholder={username}
              autoComplete="off"
              className="w-full px-4 py-2.5 rounded-xl border-2 text-sm font-mono outline-none
                         bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-colors"
              style={{ borderColor: typedName.length > 0 ? (nameMatches ? '#34d399' : '#f43f5e') : 'var(--border-color)' }}
            />
            {typedName.length > 0 && !nameMatches && (
              <p className="text-[11px] text-rose-500 mt-1">Username doesn't match</p>
            )}
            {nameMatches && (
              <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1">
                <Check size={10} strokeWidth={3} /> Username confirmed
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Lock size={11} /> Confirm your password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none pr-10
                           bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                style={{ borderColor:'var(--border-color)' }}
                onKeyDown={e => e.key === 'Enter' && canSubmit && handleDelete()}
              />
              <button type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <AlertTriangle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl border text-sm font-semibold
                         text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              style={{ borderColor:'var(--border-color)' }}>
              Keep My Account
            </button>
            <button onClick={handleDelete} disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold
                         hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Trash2 size={15} />}
              {loading ? 'Deleting…' : 'Delete Forever'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const { settings, updateSettings, speak, voices } = useSettings();
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [saved,       setSaved]      = useState(false);
  const [showDelete,  setShowDelete] = useState(false);

  const save = async (updates) => {
    await updateSettings(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleDeleted = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 animate-fade-in">

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl md:text-3xl text-gray-800 dark:text-gray-200">Settings</h1>
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400
                          px-4 py-2 rounded-full text-sm font-bold">
            <Check size={16} /> Saved!
          </div>
        )}
      </div>

      {/* ── Appearance ─────────────────────────────────────── */}
      <Section title="Appearance" icon={<Sun size={22} className="text-amber-400" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {THEMES.map(t => (
            <ThemeCard key={t.key} theme={t} active={settings.theme === t.key} onSelect={k => save({ theme:k })} />
          ))}
        </div>
      </Section>

      {/* ── Text Size ──────────────────────────────────────── */}
      <Section title="Text Size" icon={<Type size={22} className="text-sky" />}>
        <div className="grid grid-cols-2 gap-3">
          {TEXT_SIZES.map(s => (
            <button key={s.key} onClick={() => save({ text_size:s.key })}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
                ${settings.text_size === s.key ? 'border-coral bg-coral/10' : 'hover:border-coral/40'}`}
              style={{ borderColor: settings.text_size === s.key ? undefined : 'var(--border-color)' }}>
              <span className={`font-bold ${s.sample} ${settings.text_size === s.key ? 'text-coral' : 'text-gray-700 dark:text-gray-300'}`}>Aa</span>
              <p className={`font-bold text-sm ${settings.text_size === s.key ? 'text-coral' : 'text-gray-700 dark:text-gray-300'}`}>{s.label}</p>
              {settings.text_size === s.key && <Check size={16} className="text-coral ml-auto" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Background Music ───────────────────────────────── */}
      <Section title="Background Music" icon={<Music size={22} className="text-purple-500" />}>
        <Toggle on={settings.bg_music_enabled}
          onToggle={() => save({ bg_music_enabled: !settings.bg_music_enabled })}
          label="Background Music"
          sub="Ambient music while you study — starts on first interaction" />

        {settings.bg_music_enabled && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Music Style</p>
              <div className="grid grid-cols-2 gap-2">
                {MUSIC_THEMES.map(m => (
                  <button key={m.key} onClick={() => save({ bg_music_theme:m.key })}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all text-left
                      ${settings.bg_music_theme === m.key ? 'border-purple-400 bg-purple-500/10' : 'hover:border-purple-400/40'}`}
                    style={{ borderColor: settings.bg_music_theme === m.key ? undefined : 'var(--border-color)' }}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                      ${settings.bg_music_theme === m.key ? 'bg-purple-500/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <m.Icon size={16} className={settings.bg_music_theme === m.key ? 'text-purple-500' : 'text-gray-400'} />
                    </div>
                    <div>
                      <p className={`font-bold text-xs ${settings.bg_music_theme === m.key ? 'text-purple-500 dark:text-purple-400' : 'text-gray-700 dark:text-gray-200'}`}>{m.label}</p>
                      <p className="text-[10px] text-gray-400">{m.desc}</p>
                    </div>
                    {settings.bg_music_theme === m.key && <Check size={12} className="text-purple-500 ml-auto" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="flex justify-between text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                Volume <span className="text-purple-500 font-normal">{Math.round((settings.bg_music_volume || 0.7) * 100)}%</span>
              </label>
              <input type="range" min="0.1" max="1" step="0.05"
                value={settings.bg_music_volume || 0.7}
                onChange={e => save({ bg_music_volume: parseFloat(e.target.value) })}
                className="w-full accent-purple-500" />
            </div>
            <p className="text-[11px] text-gray-400 text-center italic">Music is generated in-browser — no downloads needed</p>
          </div>
        )}
      </Section>

      {/* ── Text-to-Speech ─────────────────────────────────── */}
      <Section title="Text-to-Speech" icon={<Volume2 size={22} className="text-emerald-500" />}>
        <Toggle on={settings.tts_enabled}
          onToggle={() => save({ tts_enabled: !settings.tts_enabled })}
          label="Read Aloud"
          sub="Read game instructions and feedback out loud" />

        {settings.tts_enabled && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Voice</label>
              <select value={settings.tts_voice} onChange={e => save({ tts_voice:e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 text-sm outline-none font-medium
                           bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-sky"
                style={{ borderColor:'var(--border-color)' }}>
                <option value="">Default voice</option>
                {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
              </select>
            </div>
            <div>
              <label className="flex justify-between text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                Speed <span className="text-sky font-normal">{settings.tts_rate}x</span>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.1" value={settings.tts_rate}
                onChange={e => save({ tts_rate: parseFloat(e.target.value) })} className="w-full accent-sky" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Slow</span><span>Normal</span><span>Fast</span></div>
            </div>
            <div>
              <label className="flex justify-between text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                Pitch <span className="text-sky font-normal">{settings.tts_pitch}</span>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.1" value={settings.tts_pitch}
                onChange={e => save({ tts_pitch: parseFloat(e.target.value) })} className="w-full accent-sky" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Low</span><span>Normal</span><span>High</span></div>
            </div>
            <button onClick={() => speak('Hello! This is how the read-aloud voice sounds. Ready to learn?')}
              className="btn-game bg-sky text-white flex items-center gap-2 w-full justify-center">
              <Volume2 size={18} /> Test Voice
            </button>
          </div>
        )}
      </Section>

      {/* ── Danger Zone ────────────────────────────────────── */}
      <div className="rounded-3xl p-6 border-2 border-rose-200 dark:border-rose-900"
        style={{ background:'var(--bg-card)' }}>
        <h3 className="font-display text-xl mb-1 text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle size={20} /> Danger Zone
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button onClick={() => setShowDelete(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-rose-400
                     text-rose-600 dark:text-rose-400 font-bold text-sm
                     hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
          <Trash2 size={16} /> Delete My Account
        </button>
      </div>

      {showDelete && (
        <DeleteAccountModal
          username={user?.username || ''}
          onClose={() => setShowDelete(false)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
