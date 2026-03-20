// ============================================================
// PictureWordGame — emoji picture → tap the correct word
// Fully rewritten: null guards, smooth transitions, grid layout
// ============================================================
import React, { useState, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, CheckCircle, XCircle } from 'lucide-react';

export default function PictureWordGame({ activity, onSubmit, submitting }) {
  // ── Safe content extraction ───────────────────────────────
  // Guard against content being a string (un-parsed JSONB edge case)
  const rawContent = activity?.content;
  const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
  const items = content?.items ?? [];

  const { speak } = useSettings();

  const [answers,     setAnswers]     = useState(() => new Array(items.length).fill(null));
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [feedback,    setFeedback]    = useState({}); // { [idx]: 'correct'|'wrong' }
  const [locked,      setLocked]      = useState({}); // prevent double-tap during flash

  // Edge case: no items in this activity
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-semibold">No questions found for this activity.</p>
      </div>
    );
  }

  const current       = items[activeIdx] ?? items[0];
  const answeredCount = answers.filter(a => a !== null).length;
  const allAnswered   = answeredCount === items.length;

  const pickAnswer = useCallback((opt, idx) => {
    // Prevent picking if already answered or in feedback flash
    if (locked[idx] || answers[idx] !== null) return;

    const isCorrect = opt === items[idx].answer;

    // Lock this slot during flash
    setLocked(prev => ({ ...prev, [idx]: true }));
    setFeedback(prev => ({ ...prev, [idx]: isCorrect ? 'correct' : 'wrong' }));
    setAnswers(prev => {
      const next = [...prev];
      next[idx] = opt;
      return next;
    });

    speak(isCorrect ? 'Correct!' : items[idx].answer);

    // After flash, unlock and advance to next unanswered
    setTimeout(() => {
      setLocked(prev => ({ ...prev, [idx]: false }));
      // Auto-advance to next unanswered question
      setActiveIdx(current => {
        const nextEmpty = items.findIndex((_, i) => i > current && answers[i] === null && i !== idx);
        if (nextEmpty !== -1) return nextEmpty;
        // wrap around from start
        const fromStart = items.findIndex((_, i) => answers[i] === null && i !== idx);
        return fromStart !== -1 ? fromStart : current;
      });
    }, 700);
  }, [items, answers, locked, speak]);

  // Allow re-picking (clear answer for a slot)
  const clearAnswer = useCallback((idx) => {
    if (locked[idx]) return;
    setAnswers(prev => { const n = [...prev]; n[idx] = null; return n; });
    setFeedback(prev => { const n = { ...prev }; delete n[idx]; return n; });
    setActiveIdx(idx);
  }, [locked]);

  const handleSubmit = () => {
    if (!allAnswered || submitting) return;
    onSubmit({ answers: answers.map(a => a ?? '') });
  };

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content.instruction || 'Look at each picture and choose the correct word!'}
        </p>
        <button
          onClick={() => speak(content.instruction || 'Look at each picture and choose the correct word!')}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0 transition-colors">
          <Volume2 size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span className="font-semibold">{answeredCount} of {items.length} answered</span>
          {allAnswered && (
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <CheckCircle size={12} /> All done!
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(answeredCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question nav dots */}
      <div className="flex justify-center gap-2 mb-5 flex-wrap">
        {items.map((_, i) => {
          const fb = feedback[i];
          const isActive = i === activeIdx;
          return (
            <button
              key={i}
              onClick={() => { if (!locked[i]) setActiveIdx(i); }}
              className={`transition-all duration-200 rounded-full flex-shrink-0
                ${isActive
                  ? 'w-7 h-3 bg-sky'
                  : fb === 'correct'
                  ? 'w-3 h-3 bg-emerald-400'
                  : fb === 'wrong'
                  ? 'w-3 h-3 bg-rose-400'
                  : answers[i] !== null
                  ? 'w-3 h-3 bg-sky/50'
                  : 'w-3 h-3 bg-gray-200 dark:bg-gray-600'
                }`}
            />
          );
        })}
      </div>

      {/* Active question card */}
      <div
        key={activeIdx}
        className="rounded-2xl border-2 border-sky/20 p-5 mb-4 animate-pop"
        style={{ background: 'var(--bg-card)' }}>

        {/* Question header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-sky bg-sky/10 px-2.5 py-1 rounded-full">
            {activeIdx + 1} / {items.length}
          </span>
          <button
            onClick={() => speak(current.picture + '... ' + (current.answer || ''))}
            className="p-1.5 rounded-lg text-sky hover:bg-sky/10 transition-colors">
            <Volume2 size={14} />
          </button>
        </div>

        {/* Big picture emoji */}
        <div className="text-center mb-5">
          <div
            className={`text-8xl leading-none select-none inline-block transition-transform duration-300
              ${feedback[activeIdx] === 'correct' ? 'scale-110' : ''}
              ${feedback[activeIdx] === 'wrong'   ? 'scale-95'  : ''}
            `}
            role="img"
            aria-label="picture">
            {current.picture}
          </div>
        </div>

        {/* Answer options — 2×2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {(current.options ?? []).map(opt => {
            const isSelected = answers[activeIdx] === opt;
            const isCorrect  = opt === current.answer;
            const fb         = feedback[activeIdx];
            const isFlashing = fb && isSelected;

            let cls = 'border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-sky hover:bg-sky/5 active:scale-95';

            if (isFlashing && isCorrect) {
              cls = 'border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 scale-105 shadow-md';
            } else if (isFlashing && !isCorrect) {
              cls = 'border-2 border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shake';
            } else if (!isFlashing && fb && isCorrect) {
              // Show which was correct after wrong answer
              cls = 'border-2 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 opacity-75';
            } else if (!isFlashing && isSelected) {
              cls = 'border-2 border-sky bg-sky/10 text-sky';
            }

            return (
              <button
                key={opt}
                onClick={() => {
                  if (answers[activeIdx] !== null) {
                    // Already answered — allow clearing to retry
                    if (isSelected) clearAnswer(activeIdx);
                    return;
                  }
                  pickAnswer(opt, activeIdx);
                }}
                className={`py-4 px-3 rounded-2xl font-bold text-sm transition-all duration-200 
                            flex flex-col items-center gap-1.5 min-h-[72px] justify-center ${cls}`}>
                <span className="text-base leading-tight text-center">{opt}</span>
                {isFlashing && isCorrect && <CheckCircle size={14} className="text-emerald-500"/>}
                {isFlashing && !isCorrect && <XCircle    size={14} className="text-rose-500"/>}
              </button>
            );
          })}
        </div>

        {/* Tap to change hint */}
        {answers[activeIdx] !== null && !locked[activeIdx] && (
          <p className="text-center text-xs text-gray-400 mt-3">
            Tap your answer again to change it
          </p>
        )}
      </div>

      {/* Scrollable answered summary (mini) */}
      {answeredCount > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
          {items.map((item, i) => {
            if (answers[i] === null) return null;
            const correct = answers[i] === item.answer;
            return (
              <button
                key={i}
                onClick={() => { if (!locked[i]) { setActiveIdx(i); clearAnswer(i); } }}
                title={`Q${i+1}: ${answers[i]} — tap to redo`}
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl
                            border-2 transition-all hover:scale-110
                            ${correct
                              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'border-rose-300 bg-rose-50 dark:bg-rose-900/20'}`}>
                {item.picture}
              </button>
            );
          })}
        </div>
      )}

      {/* Navigation row */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <button
          onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
          disabled={activeIdx === 0}
          className="flex-1 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                     font-bold text-sm disabled:opacity-30 hover:bg-sky/10 hover:text-sky transition-colors">
          ← Prev
        </button>
        <span className="text-xs text-gray-400 font-semibold flex-shrink-0">
          {activeIdx + 1} / {items.length}
        </span>
        <button
          onClick={() => setActiveIdx(i => Math.min(items.length - 1, i + 1))}
          disabled={activeIdx === items.length - 1}
          className="flex-1 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                     font-bold text-sm disabled:opacity-30 hover:bg-sky/10 hover:text-sky transition-colors">
          Next →
        </button>
      </div>

      {/* Submit button — shows when all answered */}
      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className={`btn-game w-full text-white text-base transition-all
          ${allAnswered
            ? 'bg-coral animate-pop'
            : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-60'
          }`}>
        {submitting
          ? '⏳ Checking…'
          : allAnswered
          ? '✅ Check My Answers!'
          : `Answer all ${items.length} pictures first`
        }
      </button>
    </div>
  );
}
