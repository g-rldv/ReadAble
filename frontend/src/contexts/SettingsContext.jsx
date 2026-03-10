// ============================================================
// Settings Context — theme, text size, TTS, background music
// Cross-device: marks settings as dirty when changed locally.
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import { startMusic, stopMusic, setMusicVolume, isMusicPlaying } from '../utils/bgMusic';

const SettingsContext = createContext(null);

// Themes that need Tailwind's dark: variants
const DARK_THEMES = new Set(['dark','gradient','ocean','sunset','midnight','forest']);

const DEFAULTS = {
  text_size:        'medium',
  theme:            'light',
  tts_enabled:      true,
  tts_voice:        '',
  tts_rate:         0.9,
  tts_pitch:        1.0,
  bg_music_enabled: false,
  bg_music_theme:   'calm',
  bg_music_volume:  0.7,
};

function readLocal() {
  try {
    const s = localStorage.getItem('readable_settings');
    return s ? { ...DEFAULTS, ...JSON.parse(s) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

export function SettingsProvider({ children }) {
  const { token } = useAuth();
  const [settings, setSettings] = useState(readLocal);
  const [voices,   setVoices]   = useState([]);
  const musicClickRef = useRef(false);

  // ── Load from server when logged in ─────────────────────────
  useEffect(() => {
    if (!token) return;
    api.get('/settings').then(res => {
      if (res.data?.settings) {
        // Merge server into defaults (handles missing columns gracefully)
        applySettings({ ...DEFAULTS, ...res.data.settings });
      }
    }).catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Browser TTS voices ───────────────────────────────────────
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  // ── Apply settings → DOM + state ────────────────────────────
  const applySettings = useCallback((s) => {
    setSettings(s);
    try { localStorage.setItem('readable_settings', JSON.stringify(s)); } catch {}

    const html = document.documentElement;

    // data-theme drives CSS variable blocks
    html.setAttribute('data-theme', s.theme || 'light');

    // .dark activates Tailwind dark: variants for dark-palette themes
    html.classList.remove('dark', 'high-contrast');
    if (DARK_THEMES.has(s.theme))   html.classList.add('dark');
    if (s.theme === 'high-contrast') html.classList.add('dark', 'high-contrast');

    // Text size
    html.classList.remove('text-small','text-medium','text-large','text-xlarge');
    html.classList.add(`text-${s.text_size || 'medium'}`);
  }, []);

  // ── Update a setting (saves to server if logged in) ──────────
  const updateSettings = useCallback(async (updates) => {
    const next = { ...settings, ...updates };
    applySettings(next);
    // Mark as dirty so AuthContext can sync on next login
    try { localStorage.setItem('readable_settings_dirty', 'true'); } catch {}
    if (token) {
      try {
        await api.put('/settings', next);
        localStorage.removeItem('readable_settings_dirty');
      } catch {}
    }
  }, [settings, token, applySettings]);

  // ── Background music lifecycle ───────────────────────────────
  useEffect(() => {
    if (!settings.bg_music_enabled) {
      stopMusic();
      musicClickRef.current = false;
      return;
    }
    const started = startMusic(settings.bg_music_theme);
    if (!started && !musicClickRef.current) {
      // Browser autoplay blocked — start on first user interaction
      musicClickRef.current = true;
      const handler = () => {
        if (settings.bg_music_enabled && !isMusicPlaying()) {
          startMusic(settings.bg_music_theme);
        }
        musicClickRef.current = false;
      };
      document.addEventListener('click', handler, { once: true });
    }
  }, [settings.bg_music_enabled, settings.bg_music_theme]);

  // ── Volume control ───────────────────────────────────────────
  useEffect(() => {
    if (settings.bg_music_enabled) {
      setMusicVolume(settings.bg_music_volume ?? 0.7);
    }
  }, [settings.bg_music_volume, settings.bg_music_enabled]);

  // ── Text-to-speech ───────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!settings.tts_enabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (settings.tts_voice) {
      const v = voices.find(v => v.name === settings.tts_voice);
      if (v) utter.voice = v;
    }
    utter.rate  = settings.tts_rate  || 0.9;
    utter.pitch = settings.tts_pitch || 1.0;
    window.speechSynthesis.speak(utter);
  }, [settings, voices]);

  const stopSpeaking = () => window.speechSynthesis?.cancel();

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, speak, stopSpeaking, voices }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
