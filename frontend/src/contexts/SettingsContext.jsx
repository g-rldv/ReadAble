// ============================================================
// SettingsContext — theme, text size, TTS, background music
// Settings are server-authoritative when logged in.
// On login: server settings are fetched and applied immediately.
// On change: saved to server + localStorage simultaneously.
// On logout / no token: localStorage only.
// bgMusic engine is inlined — no external file dependency.
// ============================================================
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const SettingsContext = createContext(null);

const DARK_THEMES = new Set(['dark','gradient','ocean','sunset','midnight','forest']);

export const DEFAULTS = {
  text_size:        'medium',
  theme:            'light',
  tts_enabled:      false,   // off by default — less jarring on first load
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

// ── Inline background music engine ──────────────────────────
const _music = (() => {
  let ctx = null, gain = null, timer = null, playing = false, theme = 'calm';
  const N = {
    C3:174,D3:196,E3:220,F3:233,G3:261,A3:293,B3:329,
    C4:349,D4:392,E4:440,F4:466,G4:523,A4:587,B4:659,
    C5:698,D5:784,E5:880,R:0,
  };
  const THEMES = {
    calm:    { bpm:72,  wave:'sine',     vol:0.13, atk:0.04, rel:0.75,
               notes:[N.C4,N.E4,N.G4,N.E4, N.G3,N.B3,N.D4,N.B3,
                      N.A3,N.C4,N.E4,N.C4, N.F3,N.A3,N.C4,N.A3] },
    playful: { bpm:108, wave:'triangle', vol:0.10, atk:0.01, rel:0.55,
               notes:[N.C4,N.E4,N.G4,N.A4,N.G4,N.E4,N.C4,N.R,
                      N.E4,N.G4,N.A4,N.C5,N.A4,N.G4,N.E4,N.R] },
    focus:   { bpm:48,  wave:'sine',     vol:0.08, atk:0.12, rel:0.90,
               notes:[N.C3,N.G3,N.R,N.R, N.C3,N.E3,N.G3,N.R,
                      N.A3,N.R,N.E3,N.R,  N.F3,N.C4,N.R,N.R] },
    fantasy: { bpm:84,  wave:'sine',     vol:0.11, atk:0.03, rel:0.70,
               notes:[N.A3,N.C4,N.E4,N.G4,N.E4,N.C4,
                      N.E4,N.G4,N.A4,N.C5,N.A4,N.G4] },
  };
  function initCtx() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.connect(ctx.destination);
    return ctx;
  }
  function scheduleLoop(startTime, t) {
    if (!playing || !ctx) return;
    const td = THEMES[t] || THEMES.calm;
    const len = 60 / td.bpm;
    let ts = startTime;
    for (const freq of td.notes) {
      if (freq > 0) {
        const osc = ctx.createOscillator(), env = ctx.createGain();
        osc.connect(env); env.connect(gain);
        osc.type = td.wave;
        osc.frequency.setValueAtTime(freq, ts);
        const end = ts + len * 0.97;
        env.gain.setValueAtTime(0, ts);
        env.gain.linearRampToValueAtTime(td.vol, ts + td.atk);
        env.gain.setValueAtTime(td.vol, ts + len * td.rel);
        env.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.start(ts); osc.stop(end + 0.05);
      }
      ts += len;
    }
    const loopLen = td.notes.length * len;
    timer = setTimeout(() => scheduleLoop(ctx.currentTime + 0.05, theme),
      Math.max(50, (startTime + loopLen - ctx.currentTime - 0.3) * 1000));
  }
  return {
    start(t = 'calm') {
      this.stop(); theme = t;
      const c = initCtx(); if (!c) return false;
      if (c.state === 'suspended') c.resume().catch(() => {});
      playing = true;
      gain.gain.cancelScheduledValues(c.currentTime);
      gain.gain.setValueAtTime(0.001, c.currentTime);
      gain.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
      scheduleLoop(c.currentTime + 0.1, theme);
      return c.state !== 'suspended';
    },
    stop() {
      playing = false; clearTimeout(timer);
      if (gain && ctx) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value || 0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      }
    },
    setVolume(v) {
      if (gain && ctx) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(Math.max(0.001, Math.min(1, v)), ctx.currentTime);
      }
    },
    isPlaying() { return playing; },
  };
})();

// ── Provider ──────────────────────────────────────────────────
export function SettingsProvider({ children }) {
  const { token } = useAuth();
  const [settings, setSettings] = useState(readLocal);
  const [voices,   setVoices]   = useState([]);
  const autoplayRef = useRef(false);
  const serverLoadedRef = useRef(false); // avoid double-apply on mount

  // ── Apply settings to DOM + state ─────────────────────────
  // Defined before any useEffect that calls it.
  const applySettings = useCallback((s) => {
    const merged = { ...DEFAULTS, ...s };
    setSettings(merged);
    try { localStorage.setItem('readable_settings', JSON.stringify(merged)); } catch (_) {}
    const html = document.documentElement;
    html.setAttribute('data-theme', merged.theme);
    html.classList.remove('dark', 'high-contrast');
    if (DARK_THEMES.has(merged.theme))      html.classList.add('dark');
    if (merged.theme === 'high-contrast')   html.classList.add('dark', 'high-contrast');
    html.classList.remove('text-small','text-medium','text-large','text-xlarge');
    html.classList.add(`text-${merged.text_size}`);
  }, []);

  // ── Apply saved settings on first paint (before server responds) ─
  useEffect(() => {
    applySettings(readLocal());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Server is authoritative when logged in ─────────────────
  // Fetch on every login (token change null→value).
  // This ensures settings are always consistent across devices.
  useEffect(() => {
    if (!token) {
      serverLoadedRef.current = false;
      return;
    }
    api.get('/settings')
      .then(res => {
        if (res.data?.settings) {
          applySettings(res.data.settings);
          // Clear dirty flag — server just confirmed the canonical state
          localStorage.removeItem('readable_settings_dirty');
          serverLoadedRef.current = true;
        }
      })
      .catch(() => {}); // keep local settings on network error
  }, [token, applySettings]);

  // ── Browser TTS voices ─────────────────────────────────────
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  // ── Music lifecycle ────────────────────────────────────────
  useEffect(() => {
    if (!settings.bg_music_enabled) {
      _music.stop();
      autoplayRef.current = false;
      return;
    }
    const started = _music.start(settings.bg_music_theme);
    if (!started && !autoplayRef.current) {
      autoplayRef.current = true;
      const handler = () => {
        if (settings.bg_music_enabled && !_music.isPlaying())
          _music.start(settings.bg_music_theme);
        autoplayRef.current = false;
      };
      document.addEventListener('click', handler, { once: true });
    }
  }, [settings.bg_music_enabled, settings.bg_music_theme]);

  // ── Volume ─────────────────────────────────────────────────
  useEffect(() => {
    if (settings.bg_music_enabled)
      _music.setVolume(settings.bg_music_volume ?? 0.7);
  }, [settings.bg_music_volume, settings.bg_music_enabled]);

  // ── Update a setting ───────────────────────────────────────
  const updateSettings = useCallback(async (updates) => {
    const next = { ...settings, ...updates };
    applySettings(next);
    // Mark dirty so if user logs into a new device the change is preserved
    try { localStorage.setItem('readable_settings_dirty', 'true'); } catch (_) {}
    if (token) {
      try {
        await api.put('/settings', next);
        localStorage.removeItem('readable_settings_dirty');
      } catch (_) {}
    }
  }, [settings, token, applySettings]);

  // ── TTS speak ──────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!settings.tts_enabled || !text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text));
    if (settings.tts_voice) {
      const v = voices.find(v => v.name === settings.tts_voice);
      if (v) utter.voice = v;
    }
    utter.rate  = settings.tts_rate  ?? 0.9;
    utter.pitch = settings.tts_pitch ?? 1.0;
    window.speechSynthesis.speak(utter);
  }, [settings, voices]);

  const stopSpeaking = useCallback(() => window.speechSynthesis?.cancel(), []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, speak, stopSpeaking, voices }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
