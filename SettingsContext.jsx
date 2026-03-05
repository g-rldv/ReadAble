// ============================================================
// Settings Context — theme, text size, TTS
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const SettingsContext = createContext(null);

const DEFAULTS = {
  text_size: 'medium',
  theme: 'light',
  tts_enabled: true,
  tts_voice: '',
  tts_rate: 0.9,
  tts_pitch: 1.0,
};

export function SettingsProvider({ children }) {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem('readable_settings');
    return stored ? JSON.parse(stored) : DEFAULTS;
  });
  const [voices, setVoices] = useState([]);

  // Load settings from server when logged in
  useEffect(() => {
    if (!token) return;
    api.get('/settings').then(res => {
      applySettings(res.data.settings);
    }).catch(() => {});
  }, [token]);

  // Load browser TTS voices
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      setVoices(v);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Apply settings to DOM and state
  const applySettings = useCallback((s) => {
    setSettings(s);
    localStorage.setItem('readable_settings', JSON.stringify(s));

    // Apply theme
    const html = document.documentElement;
    html.classList.remove('dark', 'high-contrast');
    if (s.theme === 'dark') html.classList.add('dark');
    if (s.theme === 'high-contrast') { html.classList.add('dark'); html.classList.add('high-contrast'); }

    // Apply text size
    html.classList.remove('text-small', 'text-medium', 'text-large', 'text-xlarge');
    html.classList.add(`text-${s.text_size || 'medium'}`);
  }, []);

  const updateSettings = useCallback(async (updates) => {
    const newSettings = { ...settings, ...updates };
    applySettings(newSettings);
    if (token) {
      try { await api.put('/settings', newSettings); } catch (_) {}
    }
  }, [settings, token, applySettings]);

  // Text-to-speech speaker
  const speak = useCallback((text) => {
    if (!settings.tts_enabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (settings.tts_voice) {
      const voice = voices.find(v => v.name === settings.tts_voice);
      if (voice) utter.voice = voice;
    }
    utter.rate  = settings.tts_rate || 0.9;
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
