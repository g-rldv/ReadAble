// ============================================================
// SettingsPage — appearance themes, background music, TTS, text size
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import {
  Sun, Moon, Eye, Volume2, Type, Check,
  Music, Music2, Waves, Leaf, Flame, Sparkles, Zap,
  SlidersHorizontal, Candy,
} from 'lucide-react';

const THEMES = [
  { key: 'light',         label: 'Light',         desc: 'Warm & bright',        Icon: Sun,
    preview: { bg: '#FFF8F0', card: '#FFFFFF',  text: '#1A1A2E', accent: '#4D96FF' } },
  { key: 'dark',          label: 'Dark',          desc: 'Easy on the eyes',     Icon: Moon,
    preview: { bg: '#0F0F1A', card: '#1A1A2E',  text: '#F1F5F9', accent: '#4D96FF' } },
  { key: 'gradient',      label: 'Gradient',      desc: 'Purple dream glass',   Icon: Sparkles,
    preview: { bg: 'linear-gradient(135deg,#1a1a2e,#533483,#c25ba6)', card: 'rgba(255,255,255,0.15)', text: '#F8FAFC', accent: '#a78bfa' } },
  { key: 'ocean',         label: 'Ocean',         desc: 'Deep sea calm',        Icon: Waves,
    preview: { bg: '#031929', card: '#0a2a42',  text: '#e0f2fe', accent: '#38bdf8' } },
  { key: 'sunset',        label: 'Sunset',        desc: 'Golden hour glow',     Icon: Flame,
    preview: { bg: 'linear-gradient(160deg,#120824,#6b21a8,#f59e0b)', card: '#1e1040', text: '#fef3c7', accent: '#f59e0b' } },
  { key: 'midnight',      label: 'Midnight',      desc: 'Electric night',       Icon: Zap,
    preview: { bg: '#04040f', card: '#090920',  text: '#e2e8f0', accent: '#818cf8' } },
  { key: 'forest',        label: 'Forest',        desc: 'Natural greens',       Icon: Leaf,
    preview: { bg: '#0d1f0e', card: '#162618',  text: '#d1fae5', accent: '#34d399' } },
  { key: 'candy',         label: 'Candy',         desc: 'Sweet pastels',        Icon: Candy,
    preview: { bg: '#fff0fb', card: '#ffffff',  text: '#1a0a2e', accent: '#ec4899' } },
  { key: 'high-contrast', label: 'High Contrast', desc: 'Maximum clarity',      Icon: Eye,
    preview: { bg: '#000000', card: '#0A0A0A',  text: '#FFFFFF', accent: '#FFFF00' } },
];

const MUSIC_THEMES = [
  { key: 'calm',    label: 'Calm',    desc: 'Soft piano arpeggios',     Icon: Music  },
  { key: 'playful', label: 'Playful', desc: 'Bouncy pentatonic melody', Icon: Music2 },
  { key: 'focus',   label: 'Focus',   desc: 'Gentle drone & fifths',    Icon: SlidersHorizontal },
  { key: 'fantasy', label: 'Fantasy', desc: 'Mystical minor scales',    Icon: Sparkles },
];

const TEXT_SIZES = [
  { key: 'small',  label: 'Small',       sample: 'text-sm'  },
  { key: 'medium', label: 'Medium',      sample: 'text-base'},
  { key: 'large',  label: 'Large',       sample: 'text-lg'  },
  { key: 'xlarge', label: 'Extra Large', sample: 'text-2xl' },
];

function Section({ title, icon, children }) {
  return (
    <div className="rounded-3xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <h3 className="font-display text-xl mb-5 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle, label, sub }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
      <div>
        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <button onClick={onToggle}
        className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${on ? 'bg-sky' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${on ? 'translate-x-7' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ThemeCard({ theme, active, onSelect }) {
  const { Icon, label, desc, preview } = theme;
  return (
    <button onClick={() => onSelect(theme.key)}
      style={{ boxShadow: active ? '0 0 0 3px rgba(77,150,255,0.4)' : undefined }}
      className={`relative rounded-2xl overflow-hidden transition-all duration-200 text-left border-2
                  ${active ? 'border-sky scale-[1.03]' : 'border-transparent hover:border-sky/30'}`}>
      {/* Mini preview swatch */}
      <div className="h-14 w-full" style={{ background: preview.bg }}>
        <div className="m-1.5 rounded-lg p-1.5" style={{ background: preview.card, border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
          <div className="flex items-center gap-1 mb-1">
            <div className="h-1.5 w-5 rounded-full" style={{ background: preview.accent }} />
            <div className="h-1.5 w-8 rounded-full" style={{ background: preview.text, opacity: 0.25 }} />
          </div>
          <div className="flex gap-1">
            {[0.9,0.2,0.2].map((op, i) => (
              <div key={i} className="w-2 h-2 rounded" style={{ background: preview.accent, opacity: op }} />
            ))}
          </div>
        </div>
      </div>
      {/* Label */}
      <div className="px-2.5 py-2" style={{ background: 'var(--bg-card)' }}>
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

export default function SettingsPage() {
  const { settings, updateSettings, speak, voices } = useSettings();
  const [saved, setSaved] = useState(false);

  const save = async (updates) => {
    await updateSettings(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">

      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gray-800 dark:text-gray-200">Settings</h1>
        {saved && (
          <div className="flex items-center gap-2 bg-mint/20 text-emerald-700 dark:text-emerald-300
                          px-4 py-2 rounded-full text-sm font-bold animate-pop">
            <Check size={16} /> Saved!
          </div>
        )}
      </div>

      {/* ── Themes ─────────────────────────────────────── */}
      <Section title="Appearance" icon={<Sun size={22} className="text-amber-400 mr-1" />}>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(t => (
            <ThemeCard key={t.key} theme={t} active={settings.theme === t.key} onSelect={k => save({ theme: k })} />
          ))}
        </div>
      </Section>

      {/* ── Text Size ──────────────────────────────────── */}
      <Section title="Text Size" icon={<Type size={22} className="text-sky mr-1" />}>
        <div className="grid grid-cols-2 gap-3">
          {TEXT_SIZES.map(s => (
            <button key={s.key} onClick={() => save({ text_size: s.key })}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
                ${settings.text_size === s.key ? 'border-coral bg-coral/10 shadow-md' : 'hover:border-coral/40'}`}
              style={{ borderColor: settings.text_size === s.key ? undefined : 'var(--border-color)' }}>
              <span className={`font-bold ${s.sample} ${settings.text_size === s.key ? 'text-coral' : 'text-gray-700 dark:text-gray-300'}`}>Aa</span>
              <p className={`font-bold text-sm ${settings.text_size === s.key ? 'text-coral' : 'text-gray-700 dark:text-gray-300'}`}>{s.label}</p>
              {settings.text_size === s.key && <Check size={16} className="text-coral ml-auto" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Background Music ───────────────────────────── */}
      <Section title="Background Music" icon={<Music size={22} className="text-purple-500 mr-1" />}>
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
                  <button key={m.key} onClick={() => save({ bg_music_theme: m.key })}
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
            <p className="text-[11px] text-gray-400 text-center italic">
              Music is generated in-browser — no downloads needed
            </p>
          </div>
        )}
      </Section>

      {/* ── TTS ────────────────────────────────────────── */}
      <Section title="Text-to-Speech" icon={<Volume2 size={22} className="text-mint mr-1" />}>
        <Toggle on={settings.tts_enabled}
          onToggle={() => save({ tts_enabled: !settings.tts_enabled })}
          label="Read Aloud"
          sub="Read game instructions and feedback out loud" />

        {settings.tts_enabled && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Voice</label>
              <select value={settings.tts_voice} onChange={e => save({ tts_voice: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 text-sm outline-none font-medium
                           bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-sky"
                style={{ borderColor: 'var(--border-color)' }}>
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
    </div>
  );
}
