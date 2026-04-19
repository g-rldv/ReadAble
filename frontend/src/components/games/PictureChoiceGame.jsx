// ============================================================
// PictureChoiceGame — read a text question, tap the correct picture
// - TTS on each question and each option label
// - No redundant navigation clutter
// - Clean, focused UI
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

export default function PictureChoiceGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak } = useSettings();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(new Array(content.questions.length).fill(''));
  const [justPicked, setJustPicked] = useState(false);

  const current = content.questions[currentIdx];
  const picked = answers[currentIdx];
  const allDone = answers.every(a => a !== '');

  const handlePick = (emoji) => {
    if (justPicked) return;
    const next = [...answers];
    next[currentIdx] = emoji;
    setAnswers(next);
    setJustPicked(true);
    const label = current.options.find(o => o.emoji === emoji)?.label || emoji;
    speak(label);
    setTimeout(() => {
      setJustPicked(false);
      if (currentIdx + 1 < content.questions.length) setCurrentIdx(i => i + 1);
    }, 900);
  };

  const goTo = (idx) => { setCurrentIdx(idx); setJustPicked(false); };

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content.instruction}
        </p>
        <button
          onClick={() => speak(content.instruction)}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0 transition-colors">
          <Volume2 size={15} />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-4">
        {content.questions.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === currentIdx
                ? 'w-7 h-3 bg-sky'
                : answers[i]
                ? 'w-3 h-3 bg-emerald-400'
                : 'w-3 h-3 bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Question card */}
      <div
        key={currentIdx}
        className="rounded-2xl p-5 mb-4 border-2 animate-pop"
        style={{ borderColor: 'rgba(77,150,255,0.2)', background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-sky bg-sky/10 px-2.5 py-1 rounded-full">
            {currentIdx + 1} / {content.questions.length}
          </span>
          <button
            onClick={() => speak(current.text)}
            className="p-1.5 rounded-lg text-sky hover:bg-sky/10 transition-colors">
            <Volume2 size={14} />
          </button>
        </div>
        <p className="font-bold text-lg text-gray-800 dark:text-gray-100 leading-snug text-center px-2">
          {current.text}
        </p>
      </div>

      {/* Picture options */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {current.options.map(opt => {
          const isSel = picked === opt.emoji;
          const isCorr = opt.emoji === current.answer;
          const fb = justPicked && isSel;

          let borderColor = 'var(--border-color)';
          let bgColor = 'var(--bg-card)';
          let textColor = 'var(--text-primary)';

          if (fb && isCorr) { borderColor = '#34d399'; bgColor = 'rgba(52,211,153,0.1)'; }
          else if (fb && !isCorr) { borderColor = '#f87171'; bgColor = 'rgba(248,113,113,0.08)'; }
          else if (!justPicked && isSel) { borderColor = '#4D96FF'; bgColor = 'rgba(77,150,255,0.08)'; }

          return (
            <button
              key={opt.emoji}
              onClick={() => handlePick(opt.emoji)}
              className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 font-bold transition-all duration-200 active:scale-95"
              style={{ borderColor, background: bgColor, color: textColor }}>
              <span className="text-4xl leading-none select-none">{opt.emoji}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm leading-tight text-center">{opt.label}</span>
                <button
                  onClick={e => { e.stopPropagation(); speak(opt.label); }}
                  className="p-0.5 rounded hover:opacity-70 transition-opacity flex-shrink-0"
                  style={{ color: '#9ca3af' }}>
                  <Volume2 size={10} />
                </button>
              </div>
              {fb && isCorr && <CheckCircle size={14} className="text-emerald-500" />}
              {fb && !isCorr && <span className="text-rose-500 text-sm font-bold">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Minimal nav — prev/next only */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <button
          onClick={() => goTo(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-2xl font-bold text-sm disabled:opacity-30 transition-colors hover:bg-sky/10 hover:text-sky"
          style={{ background: 'var(--bg-primary)', border: '1.5px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <ChevronLeft size={15} /> Prev
        </button>
        <span className="text-xs font-semibold text-gray-400">
          {answers.filter(Boolean).length}/{content.questions.length} answered
        </span>
        <button
          onClick={() => goTo(Math.min(content.questions.length - 1, currentIdx + 1))}
          disabled={currentIdx === content.questions.length - 1}
          className="flex items-center gap-1 px-4 py-2 rounded-2xl font-bold text-sm disabled:opacity-30 transition-colors hover:bg-sky/10 hover:text-sky"
          style={{ background: 'var(--bg-primary)', border: '1.5px solid var(--border-color)', color: 'var(--text-muted)' }}>
          Next <ChevronRight size={15} />
        </button>
      </div>

      {/* Submit */}
      {allDone && (
        <button
          onClick={() => onSubmit({ answers })}
          disabled={submitting}
          className="btn-game w-full bg-coral text-white text-base animate-pop">
          {submitting ? 'Checking…' : 'Check Answers'}
        </button>
      )}
    </div>
  );
}
