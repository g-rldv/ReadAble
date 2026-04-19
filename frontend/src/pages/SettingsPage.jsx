// ============================================================
// SettingsPage — Fixed:
// 1. Toggle slider thumb properly centered and sized
// 2. Text size preview is SEPARATE from live site — save button required
// 3. Theme-adaptive borders on ALL buttons/cards
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
  { key:'cotton',    label:'Light',        desc:'Clean warm white',      Icon:Sun,      preview:{bg:'#FFF8F2', card:'#FFFFFF', text:'#2C1810', accent:'#F07050'} },
  { key:'sky',       label:'Strawberry',   desc:'Rosy pink tones',       Icon:Heart,    preview:{bg:'#FFF0F4', card:'#FFF8FA', text:'#4A0E20', accent:'#E83060'} },
  { key:'mint',      label:'Meadow',       desc:'Fresh sage green',      Icon:Leaf,     preview:{bg:'#F2FAF2', card:'#F8FEF8', text:'#0E2E14', accent:'#22A845'} },
  { key:'sunshine',  label:'Sunrise',      desc:'Warm golden peach',     Icon:Sun,      preview:{bg:'#FFF8ED', card:'#FFFCF5', text:'#3A2000', accent:'#D08010'} },
  { key:'lavender',  label:'Lavender',     desc:'Soft lilac purple',     Icon:Sparkles, preview:{bg:'#F6F2FF', card:'#FAF8FF', text:'#220850', accent:'#8040D8'} },
  { key:'peach',     label:'Mango',        desc:'Warm coral orange',     Icon:Candy,    preview:{bg:'#FFF4EC', card:'#FFF9F5', text:'#3A1200', accent:'#E06818'} },
  { key:'bubblegum', label:'Bubblegum',    desc:'Sweet pink magenta',    Icon:Star,     preview:{bg:'#FFF0F8', card:'#FFF8FC', text:'#3A0828', accent:'#D82890'} },
  { key:'ocean',     label:'Aqua',         desc:'Bright sky aqua',       Icon:Droplets, preview:{bg:'#EEF9FD', card:'#F5FCFF', text:'#04222E', accent:'#0898C8'} },
  { key:'night',     label:'Midnight',     desc:'Deep navy soft glow',   Icon:Moon,     preview:{bg:'#0C0A20', card:'#181430', text:'#F0ECFF', accent:'#9060F0'} },
];

const MUSIC_THEMES = [
  { key:'calm',    label:'Calm',    desc:'Soft piano arpeggios',      Icon:Music             },
  { key:'playful', label:'Playful', desc:'Bouncy pentatonic melody',  Icon:Music2            },
  { key:'focus',   label:'Focus',   desc:'Gentle drone & fifths',     Icon:SlidersHorizontal },
  { key:'fantasy', label:'Fantasy', desc:'Mystical minor scales',     Icon:Sparkles          },
];

const TEXT_SIZES = [
  { key:'small',  label:'Small',       previewPx: 13, sampleText: 'The quick brown fox' },
  { key:'medium', label:'Medium',      previewPx: 16, sampleText: 'The quick brown fox' },
  { key:'large',  label:'Large',       previewPx: 20, sampleText: 'The quick fox'       },
  { key:'xlarge', label:'Extra Large', previewPx: 26, sampleText: 'Reading'             },
];

// ── Reusable components ───────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className="rounded-3xl p-4 md:p-6"
      style={{ background:'var(--bg-card-grad)', border:'2px solid var(--border-color)' }}>
      <h3 className="font-display text-lg md:text-xl mb-4 md:mb-5 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

// ── FIXED Toggle — thumb is perfectly centered, track is clearly styled ──
function Toggle({ on, onToggle, label, sub }) {
  return (
    <div
      className="flex items-center justify-between p-3 md:p-4 rounded-2xl"
      style={{ background: 'var(--bg-primary)', border: '2px solid var(--border-color)' }}
    >
      {/* Label side */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{label}</p>
        {sub && (
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{sub}</p>
        )}
      </div>

      {/* Toggle track + thumb */}
      <button
        type="button"
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        style={{
          position: 'relative',
          width: 52,
          height: 28,
          borderRadius: 999,
          flexShrink: 0,
          cursor: 'pointer',
          border: 'none',
          padding: 0,
          outline: 'none',
          background: on ? '#60B8F5' : '#CBD5E0',
          transition: 'background 0.25s ease',
          boxShadow: on
            ? '0 0 0 3px rgba(96,184,245,0.3), inset 0 1px 3px rgba(0,0,0,0.1)'
            : 'inset 0 1px 3px rgba(0,0,0,0.15)',
        }}
      >
        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: on ? 27 : 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            transition: 'left 0.25s ease',
          }}
        />
      </button>
    </div>
  );
}

function ThemeCard({ theme, active, onSelect }) {
  const { Icon, label, desc, preview } = theme;
  return (
    <button onClick={() => onSelect(theme.key)}
      style={{
        boxShadow: active ? '0 0 0 3px rgba(77,150,255,0.45)' : undefined,
        border: active ? '2px solid #4D96FF' : '2px solid var(--border-color)',
      }}
      className={`relative rounded-2xl overflow-hidden transition-all duration-200 text-left
                  ${active ? 'scale-[1.03]' : 'hover:border-sky/30'}`}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(96,184,245,0.4)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
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
      <div className="px-2.5 py-2" style={{ background:'var(--bg-card-grad)' }}>
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

function TextSizeTile({ size, isActive, isPreviewing, onClick }) {
  const accentColor   = '#F97B6B';
  const previewColor  = '#8040D8';
  const isActualActive  = isActive && !isPreviewing;
  const isPreviewActive = isPreviewing;

  const border = isPreviewActive
    ? `2px solid ${previewColor}`
    : isActualActive
    ? `2px solid ${accentColor}`
    : '2px solid var(--border-color)';

  const bg = isPreviewActive
    ? 'rgba(128,64,216,0.08)'
    : isActualActive
    ? 'rgba(249,123,107,0.08)'
    : 'var(--bg-card-grad)';

  const color = isPreviewActive ? previewColor : isActualActive ? accentColor : 'var(--text-primary)';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '16px 18px', boxSizing: 'border-box',
        border, borderRadius: 16, background: bg, cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        fontSize: '16px', fontFamily: 'inherit', textAlign: 'left',
      }}>
      <span style={{
        fontSize: size.previewPx, fontWeight: 700, lineHeight: 1, flexShrink: 0,
        color, fontFamily: 'inherit', display: 'block', minWidth: 36,
      }}>Aa</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.2, color, whiteSpace: 'nowrap' }}>
          {size.label}
          {isPreviewActive && <span style={{ fontSize: 10, fontWeight: 600, color: previewColor, marginLeft: 6 }}>(preview)</span>}
          {isActualActive  && <span style={{ fontSize: 10, fontWeight: 600, color: accentColor,  marginLeft: 6 }}>(current)</span>}
        </span>
        <span style={{
          display: 'block', fontSize: 11, fontWeight: 400, lineHeight: 1.3, marginTop: 2,
          color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{size.sampleText}</span>
      </span>
      {(isActualActive || isPreviewActive) && (
        <span style={{ flexShrink: 0, color, fontSize: 16, fontWeight: 900, lineHeight: 1 }}>✓</span>
      )}
    </button>
  );
}

// ── Delete Account Modal ──────────────────────────────────────
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
    setLoading(true); setError('');
    try {
      await api.delete('/users/me', { data: { password } });
      onDeleted();
    } catch (err) {
      setError(err.message || 'Failed to delete account. Check your password.');
    } finally { setLoading(false); }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ background:'var(--bg-card-grad)', border:'2px solid #f43f5e60' }}>
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
          <ul className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            {['All your progress and XP will be deleted','Your achievements will be permanently lost','Your account cannot be recovered'].map(t => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-rose-400 flex-shrink-0 mt-px">✕</span>{t}
              </li>
            ))}
          </ul>
          <div className="h-px" style={{ background:'var(--border-color)' }} />
          <div>
            <label className="block text-xs font-bold mb-1.5 text-gray-600 dark:text-gray-400">
              <AtSign size={11} className="inline mr-1"/>
              Type your username to confirm:{' '}
              <code className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                {username}
              </code>
            </label>
            <input value={typedName} onChange={e => { setTypedName(e.target.value); setError(''); }}
              placeholder={username} autoComplete="off"
              className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none
                         bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-colors"
              style={{ border: typedName.length > 0 ? `2px solid ${nameMatches ? '#34d399' : '#f43f5e'}` : '2px solid var(--border-color)' }}/>
            {typedName.length > 0 && !nameMatches && <p className="text-[11px] text-rose-500 mt-1">Username doesn't match</p>}
            {nameMatches && <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1"><Check size={10} strokeWidth={3}/> Username confirmed</p>}
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 text-gray-600 dark:text-gray-400">
              <Lock size={11} className="inline mr-1"/>Confirm your password
            </label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none pr-10
                           bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                style={{ border:'2px solid var(--border-color)' }}
                onKeyDown={e => e.key === 'Enter' && canSubmit && handleDelete()}/>
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20"
              style={{ border:'2px solid rgba(244,63,94,0.3)' }}>
              <AlertTriangle size={14} className="text-rose-500 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              style={{ border:'2px solid var(--border-color)' }}>
              Cancel
            </button>
            <button onClick={handleDelete} disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold
                         hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2"
              style={{ border:'2px solid #dc2626' }}>
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> :
              {loading ? 'Deleting…' : 'Delete'}
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
  const [saved,         setSaved]       = useState(false);
  const [showDelete,    setShowDelete]  = useState(false);
  const [previewSize,   setPreviewSize] = useState(null);

  const previewKey    = previewSize ?? settings.text_size;
  const previewConfig = TEXT_SIZES.find(s => s.key === previewKey) || TEXT_SIZES[1];
  const hasUnsavedSize = previewSize !== null && previewSize !== settings.text_size;

  const save = async (updates) => {
    await updateSettings(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const applyTextSize = async () => {
    if (!previewSize) return;
    await save({ text_size: previewSize });
    setPreviewSize(null);
  };

  const handleDeleted = () => { logout(); navigate('/'); };

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 animate-fade-in">

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl md:text-3xl text-gray-800 dark:text-gray-200">Settings</h1>
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400
                          px-4 py-2 rounded-full text-sm font-bold"
            style={{ border: '2px solid rgba(52,211,153,0.3)' }}>
            <Check size={16}/> Saved!
          </div>
        )}
      </div>

      {/* ── Appearance ─────────────────────────────────────── */}
      <Section title="Appearance" icon={<Sun size={22} className="text-amber-400"/>}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {THEMES.map(t => (
            <ThemeCard key={t.key} theme={t} active={settings.theme === t.key} onSelect={k => save({ theme:k })}/>
          ))}
        </div>
      </Section>

      {/* ── Text Size ───────────────────────────────────────── */}
      <Section title="Text Size" icon={<Type size={22} className="text-sky"/>}>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14, lineHeight: 1.5, fontFamily: 'inherit' }}>
          Click a size to preview it below. Press <strong>Apply</strong> to make it permanent across the site.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, fontSize: '16px' }}>
          {TEXT_SIZES.map(s => (
            <TextSizeTile
              key={s.key}
              size={s}
              isActive={settings.text_size === s.key}
              isPreviewing={previewSize === s.key}
              onClick={() => {
                if (previewSize === s.key || s.key === settings.text_size) setPreviewSize(null);
                else setPreviewSize(s.key);
              }}
            />
          ))}
        </div>
        <div style={{
          marginTop: 16, padding: '14px 16px', borderRadius: 12,
          background: 'var(--bg-primary)',
          border: hasUnsavedSize ? '2px solid #8040D8' : '2px solid var(--border-color)',
          transition: 'border-color 0.2s',
        }}>
          <p style={{
            margin: 0, lineHeight: 1.6,
            fontSize: previewConfig.previewPx,
            fontFamily: '"Nunito", sans-serif',
            color: 'var(--text-primary)',
            transition: 'font-size 0.2s ease',
          }}>
            The quick brown fox jumps over the lazy dog.
          </p>
        </div>
        {hasUnsavedSize && (
          <div className="flex gap-3 mt-3 animate-fade-in">
            <button onClick={() => setPreviewSize(null)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              style={{ border: '2px solid var(--border-color)' }}>
              Cancel
            </button>
            <button onClick={applyTextSize}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
              style={{ background: '#8040D8', border: '2px solid #6020B0' }}>
               Apply
            </button>
          </div>
        )}
      </Section>

      {/* ── Background Music ───────────────────────────────── */}
      <Section title="Background Music" icon={<Music size={22} className="text-purple-500"/>}>
        <Toggle
          on={settings.bg_music_enabled}
          onToggle={() => save({ bg_music_enabled: !settings.bg_music_enabled })}
          label="Background Music"
          sub="Ambient music while you study — starts on first interaction"
        />
        {settings.bg_music_enabled && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Music Style</p>
              <div className="grid grid-cols-2 gap-2">
                {MUSIC_THEMES.map(m => (
                  <button key={m.key} onClick={() => save({ bg_music_theme: m.key })}
                    className="flex items-center gap-2.5 p-3 rounded-2xl transition-all text-left"
                    style={{
                      border: settings.bg_music_theme === m.key ? '2px solid #a855f7' : '2px solid var(--border-color)',
                      background: settings.bg_music_theme === m.key ? 'rgba(168,85,247,0.1)' : 'var(--bg-card-grad)',
                    }}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                      ${settings.bg_music_theme === m.key ? 'bg-purple-500/20' : 'bg-gray-100 dark:bg-gray-800'}`}
                      style={{ border: '1px solid var(--border-color)' }}>
                      <m.Icon size={16} className={settings.bg_music_theme === m.key ? 'text-purple-500' : 'text-gray-400'}/>
                    </div>
                    <div>
                      <p className={`font-bold text-xs ${settings.bg_music_theme === m.key ? 'text-purple-500 dark:text-purple-400' : 'text-gray-700 dark:text-gray-200'}`}>{m.label}</p>
                      <p className="text-[10px] text-gray-400">{m.desc}</p>
                    </div>
                    {settings.bg_music_theme === m.key && <Check size={12} className="text-purple-500 ml-auto" strokeWidth={3}/>}
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
                className="w-full accent-purple-500"/>
            </div>
            <p className="text-[11px] text-gray-400 text-center italic">Music is generated in-browser — no downloads needed</p>
          </div>
        )}
      </Section>

      {/* ── Text-to-Speech ─────────────────────────────────── */}
      <Section title="Text-to-Speech" icon={<Volume2 size={22} className="text-emerald-500"/>}>
        <Toggle
          on={settings.tts_enabled}
          onToggle={() => save({ tts_enabled: !settings.tts_enabled })}
          label="Read Aloud"
          sub="Read game instructions and feedback out loud"
        />
        {settings.tts_enabled && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Voice</label>
              <select value={settings.tts_voice} onChange={e => save({ tts_voice: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none font-medium
                           bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-sky"
                style={{ border:'2px solid var(--border-color)' }}>
                <option value="">Default voice</option>
                {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
              </select>
            </div>
            <div>
              <label className="flex justify-between text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                Speed <span className="text-sky font-normal">{settings.tts_rate}x</span>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.1" value={settings.tts_rate}
                onChange={e => save({ tts_rate: parseFloat(e.target.value) })} className="w-full accent-sky"/>
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Slow</span><span>Normal</span><span>Fast</span></div>
            </div>
            <div>
              <label className="flex justify-between text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                Pitch <span className="text-sky font-normal">{settings.tts_pitch}</span>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.1" value={settings.tts_pitch}
                onChange={e => save({ tts_pitch: parseFloat(e.target.value) })} className="w-full accent-sky"/>
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Low</span><span>Normal</span><span>High</span></div>
            </div>
            <button onClick={() => speak('Hello! This is how the read-aloud voice sounds. Ready to learn?')}
              className="btn-game bg-sky text-white flex items-center gap-2 w-full justify-center"
              style={{ border: '2px solid rgba(96,184,245,0.6)' }}>
              <Volume2 size={18}/> Test Voice
            </button>
          </div>
        )}
      </Section>

      {/* ── Danger Zone ────────────────────────────────────── */}
      <div className="rounded-3xl p-6"
        style={{ background:'var(--bg-card-grad)', border:'2px solid rgba(244,63,94,0.4)' }}>
        <h3 className="font-display text-xl mb-1 text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle size={20}/> Danger Zone
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button onClick={() => setShowDelete(true)}
          className="w-full flex items-center gap-2 px-5 py-2.5 rounded-2xl
                     text-rose-600 dark:text-rose-400 font-bold text-sm
                     hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          style={{ border:'2px solid rgba(244,63,94,0.5)' }}>
          <Trash2 size={16}/> Delete My Account
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
