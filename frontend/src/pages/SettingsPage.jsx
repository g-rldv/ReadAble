// ============================================================
// SettingsPage — theme, text size, TTS + delete account
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Sun, Moon, Eye, Volume2, Type, Check, Trash2, AlertTriangle, X
} from 'lucide-react';

// ── Reusable section wrapper ──────────────────────────────────
function SettingSection({ title, icon, children, danger = false }) {
  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: 'var(--bg-card)',
        border: danger ? '2px solid #FCA5A5' : '2px solid transparent',
      }}
    >
      <h3 className={`font-display text-xl mb-5 flex items-center gap-2 ${danger ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SettingsPage() {
  const { settings, updateSettings, speak, voices } = useSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [saved, setSaved] = useState(false);

  // Delete modal state
  const [showModal, setShowModal]           = useState(false);
  const [confirmText, setConfirmText]       = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError]       = useState('');
  const [deleteLoading, setDeleteLoading]   = useState(false);

  // ── Save setting helper ───────────────────────────────────
  const save = async (updates) => {
    await updateSettings(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // ── Delete account ────────────────────────────────────────
  const openModal = () => {
    setConfirmText('');
    setDeletePassword('');
    setDeleteError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (deleteLoading) return; // prevent close mid-request
    setShowModal(false);
    setConfirmText('');
    setDeletePassword('');
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setDeleteError('Please type DELETE exactly to confirm.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Please enter your password.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete('/users/me', { data: { password: deletePassword } });
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(
        err.response?.data?.error ||
        (err.code === 'ECONNABORTED' ? 'Connection timed out. Try again.' : null) ||
        'Failed to delete account. Please try again.'
      );
      setDeleteLoading(false);
    }
  };

  // ── Options data ──────────────────────────────────────────
  const TEXT_SIZES = [
    { key: 'small',  label: 'Small',       size: 'text-sm'  },
    { key: 'medium', label: 'Medium',      size: 'text-base'},
    { key: 'large',  label: 'Large',       size: 'text-lg'  },
    { key: 'xlarge', label: 'Extra Large', size: 'text-2xl' },
  ];

  const THEMES = [
    { key: 'light',         label: 'Light',         icon: <Sun size={20} />,  desc: 'Bright and clear'    },
    { key: 'dark',          label: 'Dark',          icon: <Moon size={20} />, desc: 'Easy on the eyes'   },
    { key: 'high-contrast', label: 'High Contrast', icon: <Eye size={20} />,  desc: 'Maximum visibility' },
  ];

  const canDelete = confirmText === 'DELETE' && deletePassword.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gray-800 dark:text-gray-200">⚙️ Settings</h1>
        {saved && (
          <div className="flex items-center gap-2 bg-mint/20 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-bold animate-pop">
            <Check size={16} /> Saved!
          </div>
        )}
      </div>

      {/* ── Appearance ───────────────────────────────────── */}
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

      {/* ── Text Size ────────────────────────────────────── */}
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
              <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{s.label}</p>
              {settings.text_size === s.key && (
                <Check size={16} className="text-coral ml-auto" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </SettingSection>

      {/* ── Text-to-Speech ───────────────────────────────── */}
      <SettingSection title="Text-to-Speech" icon={<Volume2 size={22} />}>
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

      {/* ── Danger Zone ──────────────────────────────────── */}
      <SettingSection title="Danger Zone" icon={<AlertTriangle size={22} />} danger>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Permanently delete your account and all your progress, XP, and achievements.
          This action <strong>cannot be undone</strong>.
        </p>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-red-500 border-2 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 size={16} /> Delete My Account
        </button>
      </SettingSection>

      {/* ── Delete Confirmation Modal ─────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl animate-pop relative"
            style={{ background: 'var(--bg-card)' }}>

            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X size={18} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="font-display text-2xl text-gray-900 dark:text-white mb-2">
                Delete Account?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                This will permanently delete{' '}
                <strong className="text-gray-800 dark:text-gray-200">{user?.username}</strong>'s
                account, all progress, XP, and achievements.
                There is no way to recover this.
              </p>
            </div>

            {/* Step 1: type DELETE */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">
                Type <span className="text-red-500 font-black tracking-widest">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className="w-full px-4 py-3 rounded-2xl border-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm outline-none transition-all"
                style={{
                  borderColor: confirmText === 'DELETE' ? '#6BCB77' : '#E5E7EB',
                }}
              />
            </div>

            {/* Step 2: enter password */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">
                Enter your password
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="Your current password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm outline-none focus:border-red-400 transition-all"
              />
            </div>

            {/* Error message */}
            {deleteError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm font-semibold border border-red-200 dark:border-red-800">
                {deleteError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={closeModal}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleteLoading}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: canDelete && !deleteLoading ? '#EF4444' : '#FCA5A5' }}>
                {deleteLoading
                  ? <><span className="animate-spin">⏳</span> Deleting…</>
                  : <><Trash2 size={15} /> Delete Forever</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
