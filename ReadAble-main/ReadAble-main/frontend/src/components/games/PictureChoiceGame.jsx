// ============================================================
// PictureChoiceGame — read a text question, tap the correct picture
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

export default function PictureChoiceGame({ activity, onSubmit, submitting }) {
  const { content }   = activity;
  const { speak }     = useSettings();
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [answers,     setAnswers]     = useState(new Array(content.questions.length).fill(''));
  const [justPicked,  setJustPicked]  = useState(false);

  const current  = content.questions[currentIdx];
  const picked   = answers[currentIdx];
  const allDone  = answers.every(a => a !== '');

  const handlePick = (emoji) => {
    if (justPicked) return;
    const next = [...answers];
    next[currentIdx] = emoji;
    setAnswers(next);
    setJustPicked(true);
    speak(current.options.find(o => o.emoji === emoji)?.label || emoji);
    setTimeout(() => {
      setJustPicked(false);
      if (currentIdx + 1 < content.questions.length) setCurrentIdx(i => i + 1);
    }, 1000);
  };

  const goTo = (idx) => { setCurrentIdx(idx); setJustPicked(false); };

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content.instruction}
        </p>
        <button onClick={() => speak(content.instruction)}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0">
          <Volume2 size={16}/>
        </button>
      </div>

      {/* Dot progress bar */}
      <div className="flex justify-center gap-2 mb-5">
        {content.questions.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === currentIdx
                ? 'w-7 h-3 bg-sky'
                : answers[i]
                ? 'w-3 h-3 bg-emerald-400'
                : 'w-3 h-3 bg-gray-200 dark:bg-gray-600'
            }`}/>
        ))}
      </div>

      {/* Question card */}
      <div key={currentIdx}
        className="rounded-2xl p-5 mb-5 border-2 border-sky/20 animate-pop"
        style={{ background:'var(--bg-card)' }}>
        {/* Question number */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-gray-400 bg-sky/10 text-sky px-2.5 py-1 rounded-full">
            Question {currentIdx + 1} of {content.questions.length}
          </span>
          <button onClick={() => speak(current.text)}
            className="p-1.5 rounded-lg text-sky hover:bg-sky/10">
            <Volume2 size={14}/>
          </button>
        </div>

        {/* Question text — big and clear */}
        <p className="font-bold text-lg text-gray-800 dark:text-gray-100 leading-snug text-center px-2">
          {current.text}
        </p>
      </div>

      {/* Picture options — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {current.options.map(opt => {
          const isSel  = picked === opt.emoji;
          const isCorr = opt.emoji === current.answer;
          let cls = 'border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-sky/50 hover:bg-sky/5';
          if (justPicked && isSel)
            cls = isCorr
              ? 'border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 scale-105 shadow-lg'
              : 'border-2 border-rose-400 bg-rose-50 dark:bg-rose-900/20 shake';
          else if (!justPicked && isSel)
            cls = 'border-2 border-sky bg-sky/10';

          return (
            <button key={opt.emoji}
              onClick={() => handlePick(opt.emoji)}
              className={`flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-2xl
                          font-bold transition-all duration-200 ${cls}`}>
              {/* Big picture emoji */}
              <span className="text-5xl leading-none select-none">{opt.emoji}</span>
              {/* Label */}
              <span className="text-sm text-gray-700 dark:text-gray-200 leading-tight text-center">
                {opt.label}
              </span>
              {/* Feedback indicator */}
              {justPicked && isSel && isCorr && (
                <CheckCircle size={18} className="text-emerald-500"/>
              )}
              {justPicked && isSel && !isCorr && (
                <span className="text-rose-500 text-sm">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => goTo(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700
                     text-gray-600 dark:text-gray-300 font-bold text-sm disabled:opacity-30 transition-colors
                     hover:bg-sky/10 hover:text-sky">
          <ChevronLeft size={16}/> Prev
        </button>
        <span className="text-sm font-semibold text-gray-400">
          {answers.filter(Boolean).length}/{content.questions.length} answered
        </span>
        <button onClick={() => goTo(Math.min(content.questions.length - 1, currentIdx + 1))}
          disabled={currentIdx === content.questions.length - 1}
          className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700
                     text-gray-600 dark:text-gray-300 font-bold text-sm disabled:opacity-30 transition-colors
                     hover:bg-sky/10 hover:text-sky">
          Next <ChevronRight size={16}/>
        </button>
      </div>

      {/* Submit — only when all answered */}
      {allDone && (
        <button onClick={() => onSubmit({ answers })} disabled={submitting}
          className="btn-game w-full bg-coral text-white text-lg animate-pop">
          {submitting ? '⏳ Checking…' : '✅ Check My Answers!'}
        </button>
      )}
    </div>
  );
}
