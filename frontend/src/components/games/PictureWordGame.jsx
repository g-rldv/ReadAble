// ============================================================
// PictureWordGame — tap the right word for each emoji picture
// Fully responsive for mobile
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PictureWordGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak }   = useSettings();
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [answers,      setAnswers]      = useState(new Array(content.items.length).fill(''));
  const [justAnswered, setJustAnswered] = useState(false);

  const current  = content.items[currentIdx];
  const picked   = answers[currentIdx];
  const allDone  = answers.every(a => a !== '');

  const pickAnswer = (opt) => {
    if (justAnswered) return;
    const next = [...answers]; next[currentIdx] = opt;
    setAnswers(next);
    setJustAnswered(true);
    speak(opt);
    setTimeout(() => {
      setJustAnswered(false);
      if (currentIdx + 1 < content.items.length) setCurrentIdx(i => i + 1);
    }, 800);
  };

  const goTo = (idx) => { setCurrentIdx(idx); setJustAnswered(false); };

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{content.instruction}</p>
        <button onClick={() => speak(content.instruction)}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0">
          <Volume2 size={16}/>
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {content.items.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full
              ${i === currentIdx ? 'w-5 h-2.5 bg-sky'
                : answers[i]    ? 'w-2.5 h-2.5 bg-emerald-400'
                :                  'w-2.5 h-2.5 bg-gray-200 dark:bg-gray-600'}`}/>
        ))}
      </div>

      {/* Picture */}
      <div className="text-center mb-4 animate-pop" key={currentIdx}>
        <div className="text-7xl sm:text-8xl leading-none animate-float mb-1" role="img">
          {current.picture}
        </div>
        <p className="text-xs text-gray-400 font-semibold">
          {currentIdx + 1} / {content.items.length}
        </p>
      </div>

      {/* Answer grid — 2 cols, large touch targets */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
        {current.options.map(opt => {
          const isSelected = picked === opt;
          const isCorrect  = opt === current.answer;
          let cls = 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-sky hover:bg-sky/5';
          if (isSelected && justAnswered)
            cls = isCorrect
              ? 'border-emerald-400 bg-emerald-500 text-white scale-[1.03]'
              : 'border-rose-400 bg-rose-500 text-white shake';
          else if (isSelected && !justAnswered)
            cls = 'border-sky bg-sky/20 text-sky';
          return (
            <button key={opt} onClick={() => pickAnswer(opt)}
              className={`py-3 sm:py-4 rounded-xl font-bold border-2 transition-all duration-200
                          text-sm sm:text-base min-h-[52px] active:scale-95 ${cls}`}>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => goTo(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700
                     text-gray-600 dark:text-gray-400 font-bold text-xs sm:text-sm
                     disabled:opacity-30 hover:bg-sky/10 transition-colors">
          <ChevronLeft size={15}/> Prev
        </button>
        <span className="text-xs text-gray-400 font-semibold">
          {answers.filter(Boolean).length}/{content.items.length} answered
        </span>
        <button onClick={() => goTo(Math.min(content.items.length - 1, currentIdx + 1))}
          disabled={currentIdx === content.items.length - 1}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700
                     text-gray-600 dark:text-gray-400 font-bold text-xs sm:text-sm
                     disabled:opacity-30 hover:bg-sky/10 transition-colors">
          Next <ChevronRight size={15}/>
        </button>
      </div>

      {allDone && (
        <button onClick={() => onSubmit({ answers })} disabled={submitting}
          className="btn-game w-full bg-coral text-white text-sm sm:text-base animate-pop">
          {submitting ? 'Checking…' : 'Check Answers!'}
        </button>
      )}
    </div>
  );
}
