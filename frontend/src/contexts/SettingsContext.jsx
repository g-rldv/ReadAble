// ============================================================
// Settings Context — theme, text size, TTS, background music
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import { startMusic, stopMusic, changeMusicTheme, isMusicPlaying } from '../utils/bgMusic';

const SettingsContext = createContext(null);

// Themes that require Tailwind's dark: variants (dark palette)
const DARK_PALETTE_THEMES = new Set(['dark', 'gradient', 'ocean', 'sunset', 'midnight', 'forest']);

const DEFAULTS = {
  text_size:       'medium',
  theme:           'light',
  tts_enabled:     true,
  tts_voice:       '',
  tts_rate:        0.9,
  tts_pitch:       1.0,
  bg_music_enabled: false,
  bg_music_theme:  'calm',
  bg_music_volume: 0.7,
};

export function SettingsProvider({ children }) {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('readable_settings');
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch { return DEFAULTS; }
  });
  const [voices, setVoices] = useState([]);

  // Track whether we've already attached the one-time click-to-start handler
  const musicClickRef = useRef(false);

  // ── Load settings from server when logged in ──────────────
  useEffect(() => {
    if (!token) return;
    api.get('/settings').then(res => {
      if (res.data?.settings) applySettings({ ...DEFAULTS, ...res.data.settings });
    }).catch(() => {});
  }, [token]);

  // ── Browser TTS voices ────────────────────────────────────
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  // ── Apply settings to DOM + state ─────────────────────────
  const applySettings = useCallback((s) => {
    setSettings(s);
    try { localStorage.setItem('readable_settings', JSON.stringify(s)); } catch {}

    const html = document.documentElement;

    // 1. Set data-theme attribute (drives CSS variable blocks)
    html.setAttribute('data-theme', s.theme || 'light');

    // 2. .dark class enables Tailwind dark: variants for dark-palette themes
    html.classList.remove('dark', 'high-contrast');
    if (DARK_PALETTE_THEMES.has(s.theme)) html.classList.add('dark');
    if (s.theme === 'high-contrast')      html.classList.add('dark', 'high-contrast');

    // 3. Text size
    html.classList.remove('text-small', 'text-medium', 'text-large', 'text-xlarge');
    html.classList.add(`text-${s.text_size || 'medium'}`);
  }, []);

  const updateSettings = useCallback(async (updates) => {
    const next = { ...settings, ...updates };
    applySettings(next);
    if (token) {
      try { await api.put('/settings', next); } catch {}
    }
  }, [settings, token, applySettings]);

  // ── Background music lifecycle ────────────────────────────
  useEffect(() => {
    if (!settings.bg_music_enabled) {
      stopMusic();
      musicClickRef.current = false;
      return;
    }

    // Try to start immediately (works if AudioContext is already running)
    const started = startMusic(settings.bg_music_theme);

    if (!started && !musicClickRef.current) {
      // Browser autoplay policy blocked — wait for first user click
      musicClickRef.current = true;
      const handler = () => {
        if (settings.bg_music_enabled && !isMusicPlaying()) {
          startMusic(settings.bg_music_theme);
        }
        musicClickRef.current = false;
      };
      document.addEventListener('click', handler, { once: true });
    }

    return () => { /* music keeps playing across re-renders */ };
  }, [settings.bg_music_enabled, settings.bg_music_theme]);

  // ── Text-to-speech ────────────────────────────────────────
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
