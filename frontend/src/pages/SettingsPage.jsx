// ============================================================
// SettingsPage — theme, text size, TTS settings
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Sun, Moon, Eye, Volume2, VolumeX, Type, Check } from 'lucide-react';

function SettingSection({ title, icon, children }) {
  return (
    <div className="rounded-3xl p-6" style={{ background: 'var(--bg-card)' }}>
      <h3 className="font-display text-xl mb-5 flex items-center gap-2 text-gray-800 dark:text-gray-200">
        {icon} {title}
      </h3>
      {children}
    </div>
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

  const TEXT_SIZES = [
    { key: 'small', label: 'Small', size: 'text-sm' },
    { key: 'medium', label: 'Medium', size: 'text-base' },
    { key: 'large', label: 'Large', size: 'text-lg' },
    { key: 'xlarge', label: 'Extra Large', size: 'text-2xl' },
  ];

  const THEMES = [
    { key: 'light', label: 'Light', icon: <Sun size={20} />, desc: 'Bright and clear' },
    { key: 'dark',  label: 'Dark',  icon: <Moon size={20} />, desc: 'Easy on the eyes' },
    { key: 'high-contrast', label: 'High Contrast', icon: <Eye size={20} />, desc: 'Maximum visibility' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gray-800 dark:text-gray-200">⚙️ Settings</h1>
        {saved && (
          <div className="flex items-center gap-2 bg-mint/20 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-bold animate-pop">
            <Check size={16} /> Saved!
          </div>
        )}
      </div>

      {/* ── Theme ─────────────────────────────────────────── */}
      <SettingSection title="Appearance" icon={<Sun size={22} />}>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(t => (
            <button key={t.key} onClick={() => save({ theme: t.key })}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                ${settings.theme === t.key
                  ? 'border-sky bg-sky/10 shadow-md'
                  : 'border-gray-200 dark:border-gray-600 hover:border-sky/40'}`}>
              <span className={settings.theme === t.key ? 'text-sky' : 'text-gray-500'}>{t.icon}</span>
              <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{t.label}</span>
              <span className="text-xs text-gray-400 text-center">{t.desc}</span>
              {settings.theme === t.key && (
                <span className="w-5 h-5 bg-sky rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </SettingSection>

      {/* ── Text Size ─────────────────────────────────────── */}
      <SettingSection title="Text Size" icon={<Type size={22} />}>
        <div className="grid grid-cols-2 gap-3">
          {TEXT_SIZES.map(s => (
            <button key={s.key} onClick={() => save({ text_size: s.key })}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
                ${settings.text_size === s.key
                  ? 'border-coral bg-coral/10 shadow-md'
                  : 'border-gray-200 dark:border-gray-600 hover:border-coral/40'}`}>
              <span className={`font-bold ${s.size} ${settings.text_size === s.key ? 'text-coral' : 'text-gray-700 dark:text-gray-300'}`}>
                Aa
              </span>
              <div className="text-left">
                <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{s.label}</p>
              </div>
              {settings.text_size === s.key && (
                <Check size={16} className="text-coral ml-auto" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </SettingSection>

      {/* ── Text-to-Speech ────────────────────────────────── */}
      <SettingSection title="Text-to-Speech" icon={<Volume2 size={22} />}>
        {/* Toggle */}
        <div className="flex items-center justify-between mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-300">Read Aloud</p>
            <p className="text-xs text-gray-400 mt-0.5">Read game instructions and feedback out loud</p>
          </div>
          <button onClick={() => save({ tts_enabled: !settings.tts_enabled })}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${settings.tts_enabled ? 'bg-mint' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${settings.tts_enabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {settings.tts_enabled && (
          <>
            {/* Voice picker */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Voice</label>
              <select
                value={settings.tts_voice}
                onChange={e => save({ tts_voice: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm outline-none focus:border-sky">
                <option value="">Default voice</option>
                {voices.map(v => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>

            {/* Speed */}
            <div className="mb-4">
              <label className="flex justify-between text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                Speed <span className="text-sky font-normal">{settings.tts_rate}x</span>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.1"
                value={settings.tts_rate}
                onChange={e => save({ tts_rate: parseFloat(e.target.value) })}
                className="w-full accent-sky" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Slow</span><span>Normal</span><span>Fast</span>
              </div>
            </div>

            {/* Pitch */}
            <div className="mb-5">
              <label className="flex justify-between text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                Pitch <span className="text-sky font-normal">{settings.tts_pitch}</span>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.1"
                value={settings.tts_pitch}
                onChange={e => save({ tts_pitch: parseFloat(e.target.value) })}
                className="w-full accent-sky" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Low</span><span>Normal</span><span>High</span>
              </div>
            </div>

            <button onClick={() => speak('Hello! This is how your voice sounds. Ready to learn?')}
              className="btn-game bg-sky text-white flex items-center gap-2 w-full justify-center">
              <Volume2 size={18} /> Test Voice
            </button>
          </>
        )}
      </SettingSection>
    </div>
  );
}
